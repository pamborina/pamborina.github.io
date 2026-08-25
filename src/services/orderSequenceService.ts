import { doc, runTransaction, getDoc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { storageService } from './storageService';

export interface OrderSequenceState {
  online: number;
  pickup: number;
  resetting: boolean;
  lastResetAt?: string;
  updatedAt?: string;
}

const SETTINGS_COLLECTION = 'settings';
const ORDER_SEQUENCES_DOC = 'orderSequences';

export class OrderSequenceService {
  private static instance: OrderSequenceService;

  public static getInstance(): OrderSequenceService {
    if (!OrderSequenceService.instance) {
      OrderSequenceService.instance = new OrderSequenceService();
    }
    return OrderSequenceService.instance;
  }

  /**
   * Retrieves the current sequence state from Firestore
   */
  async getSequenceState(): Promise<OrderSequenceState> {
    if (!isFirebaseConfigured() || !db) {
      return {
        online: 0,
        pickup: 0,
        resetting: false,
      };
    }

    try {
      const seqDocRef = doc(db, SETTINGS_COLLECTION, ORDER_SEQUENCES_DOC);
      const snap = await getDoc(seqDocRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          online: Number(data.online) || 0,
          pickup: Number(data.pickup) || 0,
          resetting: Boolean(data.resetting),
          lastResetAt: data.lastResetAt || undefined,
          updatedAt: data.updatedAt || undefined,
        };
      }
    } catch (err) {
      console.warn('⚠️ [OrderSequenceService] Failed to read sequence state:', err);
    }

    return {
      online: 0,
      pickup: 0,
      resetting: false,
    };
  }

  /**
   * Atomically increments and allocates the next sequential order number using Firestore Transaction.
   * Eliminates Race Conditions when multiple clients place orders simultaneously.
   * Format:
   * - Online orders:  ORDER-01-ONLINE, ORDER-02-ONLINE, ...
   * - Pickup orders:  ORDER-01-PICKUP, ORDER-02-PICKUP, ...
   */
  async allocateNextOrderNumber(orderType: 'delivery' | 'pickup' = 'delivery'): Promise<{
    orderNumber: string;
    sequence: number;
    orderType: 'delivery' | 'pickup';
  }> {
    const isPickup = orderType === 'pickup';
    const suffix = isPickup ? 'PICKUP' : 'ONLINE';
    const nowIso = new Date().toISOString();

    // 1. Primary: Direct Atomic Firestore Transaction
    if (isFirebaseConfigured() && db) {
      try {
        const seqDocRef = doc(db, SETTINGS_COLLECTION, ORDER_SEQUENCES_DOC);

        const result = await runTransaction(db, async (transaction) => {
          const seqSnap = await transaction.get(seqDocRef);
          let currentOnline = 0;
          let currentPickup = 0;
          let isResetting = false;

          if (seqSnap.exists()) {
            const data = seqSnap.data();
            currentOnline = Number(data.online) || 0;
            currentPickup = Number(data.pickup) || 0;
            isResetting = Boolean(data.resetting);
          }

          if (isResetting) {
            throw new Error('SYSTEM_RESET_IN_PROGRESS: نظام الطلبات قيد التحديث المؤقت حالياً. يرجى الانتظار ثوانٍ وإعادة المحاولة.');
          }

          let nextSeq = 1;
          if (isPickup) {
            nextSeq = currentPickup + 1;
            transaction.set(
              seqDocRef,
              {
                online: currentOnline,
                pickup: nextSeq,
                resetting: false,
                updatedAt: nowIso,
              },
              { merge: true }
            );
          } else {
            nextSeq = currentOnline + 1;
            transaction.set(
              seqDocRef,
              {
                online: nextSeq,
                pickup: currentPickup,
                resetting: false,
                updatedAt: nowIso,
              },
              { merge: true }
            );
          }

          return nextSeq;
        });

        const paddedSeq = String(result).padStart(2, '0');
        const orderNumber = `ORDER-${paddedSeq}-${suffix}`;

        // Save local snapshot for offline/sync consistency
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(isPickup ? 'pamborina_pickup_seq' : 'pamborina_online_seq', String(result));
          }
        } catch {
          // ignore
        }

        return {
          orderNumber,
          sequence: result,
          orderType,
        };
      } catch (err: any) {
        if (err.message && err.message.includes('SYSTEM_RESET_IN_PROGRESS')) {
          throw err;
        }
        console.warn('⚠️ [OrderSequenceService] Firestore transaction error, trying server API fallback:', err?.message);
      }
    }

    // 2. Secondary: Server API Fallback (talks to Firebase Admin SDK)
    try {
      const res = await fetch('/api/orders/allocate-sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderType }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.orderNumber) {
          return {
            orderNumber: data.orderNumber,
            sequence: data.sequence || 1,
            orderType,
          };
        }
      }
    } catch (serverErr) {
      console.warn('⚠️ [OrderSequenceService] Server allocation fallback error:', serverErr);
    }

    // 3. Tertiary: Local Fallback (for offline situations)
    let localSeq = 1;
    try {
      const storageKey = isPickup ? 'pamborina_pickup_seq' : 'pamborina_online_seq';
      const stored = localStorage.getItem(storageKey);
      localSeq = (stored ? parseInt(stored, 10) : 0) + 1;
      localStorage.setItem(storageKey, String(localSeq));
    } catch {
      localSeq = 1;
    }

    const paddedSeq = String(localSeq).padStart(2, '0');
    return {
      orderNumber: `ORDER-${paddedSeq}-${suffix}`,
      sequence: localSeq,
      orderType,
    };
  }

  /**
   * Sets the reset lock to prevent concurrent order creation during system reset
   */
  async setResetLock(locked: boolean): Promise<void> {
    if (!isFirebaseConfigured() || !db) return;
    const seqDocRef = doc(db, SETTINGS_COLLECTION, ORDER_SEQUENCES_DOC);
    await setDoc(
      seqDocRef,
      {
        resetting: locked,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }

  /**
   * Resets sequences to 0 and unlocks the system
   */
  async resetSequencesToZero(): Promise<void> {
    const nowIso = new Date().toISOString();

    if (isFirebaseConfigured() && db) {
      const seqDocRef = doc(db, SETTINGS_COLLECTION, ORDER_SEQUENCES_DOC);
      await setDoc(seqDocRef, {
        online: 0,
        pickup: 0,
        resetting: false,
        lastResetAt: nowIso,
        updatedAt: nowIso,
      });
    }

    // Clear local storage sequence caches
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('pamborina_order_sequence');
        localStorage.removeItem('pamborina_online_seq');
        localStorage.removeItem('pamborina_pickup_seq');
        localStorage.removeItem('pamborina_last_order_seq');
      }
    } catch {
      // ignore
    }
  }
}

export const orderSequenceService = OrderSequenceService.getInstance();
