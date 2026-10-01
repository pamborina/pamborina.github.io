import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  setDoc,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { DriverSettlement, DriverFinancialSummary, DeliveryDriver, Order } from '../types';
import { adminAuthorizationService } from './adminAuthorizationService';

const SETTLEMENTS_COLLECTION = 'driverSettlements';

class DriverSettlementService {
  private settlementsCache: DriverSettlement[] = [];

  /**
   * Real-time subscription to driverSettlements collection
   */
  public subscribeToSettlements(
    onData: (settlements: DriverSettlement[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!db) {
      if (onError) onError(new Error('Firestore instance is not ready'));
      return () => {};
    }

    try {
      const q = query(
        collection(db, SETTLEMENTS_COLLECTION),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const settlements: DriverSettlement[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              driverId: data.driverId || '',
              driverNameSnapshot: data.driverNameSnapshot || '',
              amount: Number(data.amount || 0),
              amountCents: data.amountCents || Math.round(Number(data.amount || 0) * 100),
              paymentMethod: data.paymentMethod || 'cash',
              notes: data.notes || '',
              createdAt: data.createdAt || new Date().toISOString(),
              createdBy: data.createdBy || '',
              createdByEmail: data.createdByEmail || '',
              grossRevenueAtSettlement: data.grossRevenueAtSettlement,
              previousSettledAtSettlement: data.previousSettledAtSettlement,
              outstandingAtSettlement: data.outstandingAtSettlement,
            };
          });

          this.settlementsCache = settlements;
          onData(settlements);
        },
        (err) => {
          console.warn('⚠️ [driverSettlementService] Subscription warning:', err.message);
          // Return cached or empty gracefully
          onData(this.settlementsCache);
          if (onError) onError(err);
        }
      );

      return unsubscribe;
    } catch (err: any) {
      console.warn('⚠️ [driverSettlementService] Failed to establish listener:', err.message);
      if (onError) onError(err);
      return () => {};
    }
  }

  /**
   * Computes precise financial summary for a single driver from orders and settlements
   */
  public computeFinancialSummary(
    driver: DeliveryDriver,
    orders: Order[],
    settlements: DriverSettlement[]
  ): DriverFinancialSummary {
    const COMPLETED_STATUSES = new Set(['completed', 'delivered']);

    // 1. Calculate Gross Delivery Revenue (Delivery Fees) using integer cents
    let grossCents = 0;
    let deliveredOrdersCount = 0;
    let activeOrdersCount = 0;

    const ACTIVE_STATUSES = new Set(['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery']);

    orders.forEach((order) => {
      const isAssigned =
        (order.driverId && order.driverId === driver.id) ||
        (order.driverName && order.driverName.trim().toLowerCase() === driver.name.trim().toLowerCase());

      if (!isAssigned) return;

      const st = (order.status || '').toLowerCase();

      if (COMPLETED_STATUSES.has(st)) {
        deliveredOrdersCount += 1;
        const fee = Number(order.deliveryFee ?? order.pricing?.deliveryFee ?? 0);
        if (!isNaN(fee) && fee > 0) {
          grossCents += Math.round(fee * 100);
        }
      } else if (ACTIVE_STATUSES.has(st)) {
        activeOrdersCount += 1;
      }
    });

    // 2. Calculate Total Settled for this driver using integer cents
    let settledCents = 0;
    let lastSettlementDate: string | undefined = undefined;
    let lastSettlementAmount: number | undefined = undefined;

    const driverSettlements = settlements
      .filter((s) => s.driverId === driver.id)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    driverSettlements.forEach((s) => {
      const amtCents = s.amountCents || Math.round((s.amount || 0) * 100);
      if (!isNaN(amtCents) && amtCents > 0) {
        settledCents += amtCents;
      }
    });

    if (driverSettlements.length > 0) {
      lastSettlementDate = driverSettlements[0].createdAt;
      lastSettlementAmount = driverSettlements[0].amount;
    }

    // 3. Outstanding Balance = Gross Revenue - Total Settled
    const outstandingCents = Math.max(0, grossCents - settledCents);

    return {
      driverId: driver.id,
      driverName: driver.name,
      grossRevenue: Math.round(grossCents / 100),
      totalSettled: Math.round(settledCents / 100),
      outstandingBalance: Math.round(outstandingCents / 100),
      deliveredOrdersCount,
      activeOrdersCount,
      lastSettlementDate,
      lastSettlementAmount,
    };
  }

  /**
   * Adds financial details to all drivers in real-time
   */
  public attachFinancialStats(
    drivers: DeliveryDriver[],
    orders: Order[],
    settlements: DriverSettlement[]
  ): DeliveryDriver[] {
    return drivers.map((driver) => {
      const summary = this.computeFinancialSummary(driver, orders, settlements);
      return {
        ...driver,
        orderCount: summary.deliveredOrdersCount,
        deliveredRevenue: summary.grossRevenue,
        totalSettled: summary.totalSettled,
        outstandingBalance: summary.outstandingBalance,
        activeOrdersCount: summary.activeOrdersCount,
        lastSettlementAt: summary.lastSettlementDate,
      };
    });
  }

  /**
   * Executes a new financial settlement
   */
  public async createSettlement(params: {
    driver: DeliveryDriver;
    amount: number;
    paymentMethod: 'cash' | 'bank_transfer' | 'e_wallet' | 'other';
    notes?: string;
    orders: Order[];
    settlements: DriverSettlement[];
  }): Promise<{ success: boolean; message: string; settlementId?: string }> {
    const { driver, amount, paymentMethod, notes, orders, settlements } = params;

    // 1. Input Validation
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error('يرجى إدخال مبلغ تسوية صحيحة أكبر من صفر (مثال: 50 ج.م)');
    }

    // 2. Financial validation: verify requested <= current outstanding
    const currentSummary = this.computeFinancialSummary(driver, orders, settlements);
    const requestedCents = Math.round(numericAmount * 100);
    const currentOutstandingCents = Math.round(currentSummary.outstandingBalance * 100);

    if (requestedCents > currentOutstandingCents) {
      throw new Error(
        `مبلغ التسوية (${numericAmount} ج.م) أكبر من الرصيد المستحق الحالي للمندوب (${currentSummary.outstandingBalance} ج.م)`
      );
    }

    // 3. Try Server API execution first for security & authorization check
    const authContext = await adminAuthorizationService.getCurrentAdminAuthorization(false);
    const token = authContext.token;
    if (token) {
      try {
        const response = await fetch('/api/admin/drivers/settle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            driverId: driver.id,
            driverName: driver.name,
            amount: numericAmount,
            paymentMethod,
            notes,
          }),
        });

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (response.ok && data.success) {
            return {
              success: true,
              message: `تم تسجيل تسوية مالية بمبلغ ${numericAmount} ج.م للكابتن ${driver.name} بنجاح`,
              settlementId: data.settlement?.id,
            };
          } else if (data.message) {
            throw new Error(data.message);
          }
        } else {
          console.warn('⚠️ [driverSettlementService] Non-JSON API response, falling back to direct Firestore');
        }
      } catch (apiError: any) {
        if (apiError.message && !apiError.message.includes('fetch') && !apiError.message.includes('Unexpected token')) {
          throw apiError; // Throw server permission/validation error
        }
      }
    }

    // 4. Direct Firestore fallback (if client session has permissions)
    if (!db) throw new Error('تعذر الاتصال بقاعدة البيانات Firestore');

    const authUser = await adminAuthorizationService.getCurrentAdminAuthorization(true);
    const settlementId = `settlement_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const settlementPayload: Record<string, any> = {
      id: settlementId,
      driverId: driver.id,
      driverNameSnapshot: driver.name,
      amount: numericAmount,
      amountCents: requestedCents,
      paymentMethod: paymentMethod || 'cash',
      notes: (notes || '').trim(),
      createdAt: nowIso,
      createdAtServer: serverTimestamp(),
      createdBy: authUser?.uid || 'admin',
      createdByEmail: authUser?.email || 'admin@pamborina.com',
      grossRevenueAtSettlement: currentSummary.grossRevenue,
      previousSettledAtSettlement: currentSummary.totalSettled,
      outstandingAtSettlement: currentSummary.outstandingBalance - numericAmount,
    };

    const docRef = doc(db, SETTLEMENTS_COLLECTION, settlementId);
    await setDoc(docRef, settlementPayload);

    return {
      success: true,
      message: `تم تسوية ${numericAmount} ج.م للكابتن ${driver.name} بنجاح`,
      settlementId,
    };
  }
}

export const driverSettlementService = new DriverSettlementService();
