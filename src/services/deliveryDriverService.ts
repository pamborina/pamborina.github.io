/**
 * Delivery Driver Management Service
 * Manages delivery drivers in Firestore collection `drivers`, calculates real-time
 * derived statistics from completed orders, and supports active driver assignment.
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from '../lib/firebase';
import { DeliveryDriver, Order } from '../types';
import { storageService } from './storageService';
import { adminAuthorizationService } from './adminAuthorizationService';

const DRIVERS_COLLECTION = 'drivers';
const DRIVERS_CACHE_KEY = 'pamborina_delivery_drivers_cache_v2';
const DELETED_DRIVERS_KEY = 'pamborina_deleted_drivers_ids_v2';
const DRIVERS_EVENT_NAME = 'pamborina_drivers_changed';

// Default initial drivers fallback (for offline or initial seed)
export const DEFAULT_INITIAL_DRIVERS: Omit<DeliveryDriver, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'driver_talbiya_01',
    name: 'أحمد محمود العسكري',
    phone: '01112624108',
    status: 'active',
    vehicleType: 'motorcycle',
    notes: 'موتوسيكل هوجن دايو - كابتن فرع الطالبية الرئيسي',
  },
  {
    id: 'driver_faisal_02',
    name: 'محمد فتحي عبد الرحمن',
    phone: '01123456789',
    status: 'active',
    vehicleType: 'motorcycle',
    notes: 'موتوسيكل بوكسر هندي - تغطية فيصل والعشرين',
  },
  {
    id: 'driver_haram_03',
    name: 'محمود سيد الشامي',
    phone: '01234567890',
    status: 'active',
    vehicleType: 'motorcycle',
    notes: 'موتوسيكل بينيلي - تغطية العريش والتعاون',
  },
];

class DeliveryDriverService {
  private inMemoryDrivers: DeliveryDriver[] = [];
  private hasInitializedCache = false;

  constructor() {
    this.initCache();
  }

  private initCache(): void {
    if (this.hasInitializedCache) return;
    try {
      const cached = localStorage.getItem(DRIVERS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const deletedSet = this.getDeletedDriverIds();
          this.inMemoryDrivers = parsed.filter((d) => !deletedSet.has(d.id));
        }
      }
    } catch {
      // quiet fallback
    }

    if (this.inMemoryDrivers.length === 0) {
      this.inMemoryDrivers = this.getFallbackDrivers();
      this.saveLocalCache(this.inMemoryDrivers);
    }
    this.hasInitializedCache = true;
  }

  private getDeletedDriverIds(): Set<string> {
    try {
      const raw = localStorage.getItem(DELETED_DRIVERS_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch {}
    return new Set<string>();
  }

  private markDriverDeleted(id: string): void {
    try {
      const deletedSet = this.getDeletedDriverIds();
      deletedSet.add(id);
      localStorage.setItem(DELETED_DRIVERS_KEY, JSON.stringify(Array.from(deletedSet)));
    } catch {}
  }

  private saveLocalCache(drivers: DeliveryDriver[]): void {
    const deletedSet = this.getDeletedDriverIds();
    const cleanDrivers = drivers.filter((d) => d && d.id && !deletedSet.has(d.id));
    this.inMemoryDrivers = cleanDrivers;
    try {
      localStorage.setItem(DRIVERS_CACHE_KEY, JSON.stringify(cleanDrivers));
    } catch {}
    this.broadcastChange(cleanDrivers);
  }

  private broadcastChange(drivers: DeliveryDriver[]): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(DRIVERS_EVENT_NAME, { detail: { drivers } })
      );
    }
  }

  /**
   * Fetch all drivers with multi-source fallback (Server API + Firestore + Local Cache)
   */
  public async getDrivers(): Promise<DeliveryDriver[]> {
    this.initCache();
    const deletedSet = this.getDeletedDriverIds();

    // 1. Try Firestore Client SDK if available
    if (isFirebaseConfigured() && db) {
      try {
        const snap = await getDocs(collection(db, DRIVERS_COLLECTION));
        if (!snap.empty) {
          const drivers = snap.docs
            .map((d) => this.mapDocToDriver(d.id, d.data()))
            .filter((d) => !deletedSet.has(d.id))
            .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

          this.saveLocalCache(drivers);
          return drivers;
        } else {
          // Auto-seed initial default drivers so real docs exist
          await this.autoSeedDefaultDrivers();
        }
      } catch (err) {
        console.warn('[DeliveryDriverService] getDocs failed, trying server API:', err);
      }
    }

    // 2. Try Server Admin API endpoint
    try {
      const headers: Record<string, string> = {};
      if (auth && auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch {
          // quiet
        }
      }

      if (headers['Authorization']) {
        const res = await fetch('/api/admin/drivers', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.drivers) && data.drivers.length > 0) {
            const drivers = data.drivers
              .map((d: any) => this.mapDocToDriver(d.id, d))
              .filter((d: DeliveryDriver) => !deletedSet.has(d.id));

            this.saveLocalCache(drivers);
            return drivers;
          }
        }
      }
    } catch {
      // quiet fallback
    }

    // 3. Fallback to Local Cache / Default drivers
    return this.inMemoryDrivers.filter((d) => !deletedSet.has(d.id));
  }

  /**
   * Subscribe to real-time driver updates from Firestore and Local Events
   */
  public subscribeToDrivers(
    callback: (drivers: DeliveryDriver[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    this.initCache();
    const deletedSet = this.getDeletedDriverIds();

    // Immediate callback with in-memory / cache
    const initialList = this.inMemoryDrivers.filter((d) => !deletedSet.has(d.id));
    callback(initialList);

    // Listen to local broadcast events for 0ms reactivity
    const handleLocalEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ drivers: DeliveryDriver[] }>;
      if (customEvent.detail && Array.isArray(customEvent.detail.drivers)) {
        const fresh = customEvent.detail.drivers.filter((d) => !this.getDeletedDriverIds().has(d.id));
        callback(fresh);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(DRIVERS_EVENT_NAME, handleLocalEvent);
    }

    // Subscribe to Firestore onSnapshot
    let firestoreUnsub: (() => void) | null = null;

    if (isFirebaseConfigured() && db) {
      try {
        const q = query(collection(db, DRIVERS_COLLECTION));
        firestoreUnsub = onSnapshot(
          q,
          (snapshot) => {
            const currentDeleted = this.getDeletedDriverIds();
            if (snapshot.empty) {
              const fallback = this.getFallbackDrivers().filter((d) => !currentDeleted.has(d.id));
              this.saveLocalCache(fallback);
              callback(fallback);
              this.autoSeedDefaultDrivers();
              return;
            }

            const drivers = snapshot.docs
              .map((d) => this.mapDocToDriver(d.id, d.data()))
              .filter((d) => !currentDeleted.has(d.id))
              .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

            this.saveLocalCache(drivers);
            callback(drivers);
          },
          (error) => {
            console.warn('[DeliveryDriverService] onSnapshot error:', error);
            if (onError) onError(error);
            const fallback = this.inMemoryDrivers.filter((d) => !this.getDeletedDriverIds().has(d.id));
            callback(fallback);
          }
        );
      } catch (err: any) {
        console.warn('[DeliveryDriverService] subscribe failed:', err);
        const fallback = this.inMemoryDrivers.filter((d) => !this.getDeletedDriverIds().has(d.id));
        callback(fallback);
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(DRIVERS_EVENT_NAME, handleLocalEvent);
      }
      if (firestoreUnsub) {
        firestoreUnsub();
      }
    };
  }

  /**
   * Add a new delivery driver with validation and dual-guarantee save
   */
  public async addDriver(data: {
    name: string;
    phone: string;
    status?: 'active' | 'inactive';
    vehicleType?: 'motorcycle' | 'bicycle' | 'car' | 'other';
    notes?: string;
  }): Promise<string> {
    const trimmedName = data.name?.trim();
    const trimmedPhone = data.phone?.trim();

    if (!trimmedName || trimmedName.length < 2) {
      throw new Error('يرجى إدخال اسم المندوب بالكامل (حرفين على الأقل)');
    }

    if (!trimmedPhone || trimmedPhone.length < 9) {
      throw new Error('يرجى إدخال رقم هاتف صحيح للمندوب (مثال: 01112624108)');
    }

    const id = `driver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const newDriver: DeliveryDriver = {
      id,
      name: trimmedName,
      phone: trimmedPhone,
      status: data.status || 'active',
      vehicleType: data.vehicleType || 'motorcycle',
      notes: data.notes?.trim() || '',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 1. Update local cache immediately
    const updatedList = [newDriver, ...this.inMemoryDrivers.filter((d) => d.id !== id)];
    this.saveLocalCache(updatedList);

    // 2. Direct Firestore save with setDoc
    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, DRIVERS_COLLECTION, id);
        await setDoc(docRef, {
          ...newDriver,
          createdAt: nowIso,
          updatedAt: nowIso,
          serverTimestamp: serverTimestamp(),
        });
      } catch (firestoreErr) {
        console.warn('⚠️ [DeliveryDriverService] Direct Firestore save warning:', firestoreErr);
      }
    }

    // 3. Server Admin API save for dual persistence
    try {
      const authContext = await adminAuthorizationService.getCurrentAdminAuthorization(false);
      const token = authContext.token || '';
      await fetch('/api/admin/drivers/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(newDriver),
      });
    } catch {
      // quiet fallback
    }

    await storageService.logActivity(
      'إضافة مندوب توصيل',
      `الاسم: ${newDriver.name} | الهاتف: ${newDriver.phone}`
    );

    return id;
  }

  /**
   * Update existing driver details (uses setDoc with merge to avoid 'No document to update' error)
   */
  public async updateDriver(id: string, updates: Partial<DeliveryDriver>): Promise<void> {
    if (!id) throw new Error('معرف المندوب مطلوب');

    if (updates.name !== undefined && updates.name.trim().length < 2) {
      throw new Error('يرجى إدخال اسم المندوب بشكل صحيح');
    }

    if (updates.phone !== undefined && updates.phone.trim().length < 9) {
      throw new Error('يرجى إدخال رقم هاتف صحيح');
    }

    const nowIso = new Date().toISOString();

    // 1. Update in-memory and local cache immediately
    const existingIndex = this.inMemoryDrivers.findIndex((d) => d.id === id);
    const existingDriver = existingIndex !== -1 ? this.inMemoryDrivers[existingIndex] : null;

    const mergedDriver: DeliveryDriver = {
      id,
      name: updates.name ? updates.name.trim() : (existingDriver?.name || 'مندوب'),
      phone: updates.phone ? updates.phone.trim() : (existingDriver?.phone || ''),
      status: updates.status || existingDriver?.status || 'active',
      vehicleType: updates.vehicleType || existingDriver?.vehicleType || 'motorcycle',
      notes: updates.notes !== undefined ? updates.notes.trim() : (existingDriver?.notes || ''),
      createdAt: existingDriver?.createdAt || nowIso,
      updatedAt: nowIso,
      orderCount: existingDriver?.orderCount,
      deliveredRevenue: existingDriver?.deliveredRevenue,
      activeOrdersCount: existingDriver?.activeOrdersCount,
      lastDeliveredAt: existingDriver?.lastDeliveredAt,
    };

    let updatedList: DeliveryDriver[];
    if (existingIndex !== -1) {
      updatedList = [...this.inMemoryDrivers];
      updatedList[existingIndex] = mergedDriver;
    } else {
      updatedList = [mergedDriver, ...this.inMemoryDrivers];
    }
    this.saveLocalCache(updatedList);

    // 2. Direct Firestore save with setDoc(..., { merge: true })
    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, DRIVERS_COLLECTION, id);
        const payload: Record<string, any> = {
          id,
          name: mergedDriver.name,
          phone: mergedDriver.phone,
          status: mergedDriver.status,
          vehicleType: mergedDriver.vehicleType,
          notes: mergedDriver.notes,
          updatedAt: nowIso,
          updatedAtServer: serverTimestamp(),
        };
        if (!existingDriver?.createdAt) {
          payload.createdAt = nowIso;
        }

        await setDoc(docRef, payload, { merge: true });
      } catch (firestoreErr: any) {
        console.warn('⚠️ [DeliveryDriverService] Direct updateDoc warning, calling server API:', firestoreErr?.message);
      }
    }

    // 3. Server Admin API update
    try {
      const authContext = await adminAuthorizationService.getCurrentAdminAuthorization(false);
      const token = authContext.token || '';
      await fetch('/api/admin/drivers/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(mergedDriver),
      });
    } catch {
      // quiet fallback
    }

    await storageService.logActivity(
      'تحديث بيانات مندوب',
      `كود المندوب: ${id} | الاسم: ${mergedDriver.name}`
    );
  }

  /**
   * Toggle driver active/inactive status
   */
  public async toggleDriverStatus(id: string, newStatus: 'active' | 'inactive'): Promise<void> {
    await this.updateDriver(id, { status: newStatus });
  }

  /**
   * Delete driver permanently
   */
  public async deleteDriver(id: string, driverName?: string): Promise<void> {
    if (!id) return;

    // 1. Mark as tombstoned in localStorage so fallback drivers don't revive
    this.markDriverDeleted(id);

    // 2. Remove from in-memory cache and broadcast
    const remaining = this.inMemoryDrivers.filter((d) => d.id !== id);
    this.saveLocalCache(remaining);

    // 3. Direct Firestore delete
    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, DRIVERS_COLLECTION, id);
        await deleteDoc(docRef);
      } catch (firestoreErr) {
        console.warn('⚠️ [DeliveryDriverService] Direct Firestore delete warning:', firestoreErr);
      }
    }

    // 4. Server Admin API delete
    try {
      const authContext = await adminAuthorizationService.getCurrentAdminAuthorization(false);
      const token = authContext.token || '';
      await fetch('/api/admin/drivers/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ id, name: driverName }),
      });
    } catch {
      // quiet fallback
    }

    await storageService.logActivity(
      'حذف مندوب توصيل',
      `تم حذف المندوب: ${driverName || id}`
    );
  }

  /**
   * Auto-seed default initial drivers into Firestore if collection is empty
   */
  private async autoSeedDefaultDrivers(): Promise<void> {
    if (!isFirebaseConfigured() || !db) return;
    const deletedSet = this.getDeletedDriverIds();

    try {
      const initial = this.getFallbackDrivers().filter((d) => !deletedSet.has(d.id));
      for (const driver of initial) {
        const docRef = doc(db, DRIVERS_COLLECTION, driver.id);
        await setDoc(docRef, {
          ...driver,
          serverTimestamp: serverTimestamp(),
        }, { merge: true });
      }
    } catch (err) {
      console.warn('[DeliveryDriverService] autoSeedDefaultDrivers failed:', err);
    }
  }

  /**
   * Get cached drivers synchronously
   */
  public getDriversSync(): DeliveryDriver[] {
    const deletedSet = this.getDeletedDriverIds();
    return this.inMemoryDrivers.filter((d) => !deletedSet.has(d.id));
  }

  /**
   * Find driver by ID synchronously
   */
  public getDriverByIdSync(id: string): DeliveryDriver | undefined {
    return this.getDriversSync().find((d) => d.id === id);
  }

  /**
   * Check if a driver is currently active and allowed to be assigned
   */
  public isDriverActive(id: string): boolean {
    const driver = this.getDriverByIdSync(id);
    return !!driver && driver.status === 'active';
  }

  /**
   * CRITICAL FUNCTION: Compute real-time driver statistics from actual orders
   * Never uses mock numbers. Aggregates live Firestore orders:
   * - Total completed/delivered deliveries
   * - Total delivered revenue (ج.م)
   * - Currently active/pending orders assigned to this driver
   * - Date of last delivered order
   */
  public computeDriverStats(drivers: DeliveryDriver[], orders: Order[]): DeliveryDriver[] {
    if (!drivers || drivers.length === 0) return [];
    const deletedSet = this.getDeletedDriverIds();
    const cleanDrivers = drivers.filter((d) => !deletedSet.has(d.id));

    if (!orders || orders.length === 0) {
      return cleanDrivers.map((d) => ({
        ...d,
        orderCount: 0,
        deliveredRevenue: 0,
        activeOrdersCount: 0,
        lastDeliveredAt: undefined,
      }));
    }

    const COMPLETED_STATUSES = new Set(['completed', 'delivered']);
    const ACTIVE_STATUSES = new Set(['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery']);

    return cleanDrivers.map((driver) => {
      let orderCount = 0;
      let deliveredRevenue = 0;
      let activeOrdersCount = 0;
      let latestDeliveredTime = 0;
      let lastDeliveredAt: string | undefined = undefined;

      orders.forEach((order) => {
        // Match by driverId or fallback to driverName
        const isAssigned =
          (order.driverId && order.driverId === driver.id) ||
          (order.driverName && order.driverName.trim() === driver.name.trim());

        if (!isAssigned) return;

        const orderStatus = (order.status || '').toLowerCase();

        if (COMPLETED_STATUSES.has(orderStatus)) {
          orderCount += 1;
          // Calculate strictly delivery fee for driver earnings/delivery statistics
          const fee = Number(order.deliveryFee ?? order.pricing?.deliveryFee ?? 0);
          if (!isNaN(fee) && fee > 0) {
            deliveredRevenue += fee;
          }

          let completionDateIso = order.statusUpdatedAt || order.updatedAt || order.createdAt;
          if (Array.isArray(order.statusHistory)) {
            const completedEntry = [...order.statusHistory].reverse().find((h) => 
              ['completed', 'delivered'].includes(((h.status || h.newStatus || h.to) as string || '').toLowerCase())
            );
            if (completedEntry && (completedEntry.timestamp || completedEntry.changedAt)) {
              completionDateIso = completedEntry.timestamp || completedEntry.changedAt;
            }
          }

          const orderDate = new Date(completionDateIso || 0).getTime();
          if (!isNaN(orderDate) && orderDate > latestDeliveredTime) {
            latestDeliveredTime = orderDate;
            lastDeliveredAt = completionDateIso;
          }
        } else if (ACTIVE_STATUSES.has(orderStatus)) {
          activeOrdersCount += 1;
        }
      });

      return {
        ...driver,
        orderCount,
        deliveredRevenue: Math.round(deliveredRevenue),
        activeOrdersCount,
        lastDeliveredAt,
      };
    });
  }

  // ================= PRIVATE HELPERS =================

  private mapDocToDriver(id: string, data: any): DeliveryDriver {
    return {
      id,
      name: data.name || 'مندوب بدون اسم',
      phone: data.phone || '',
      status: data.status === 'inactive' ? 'inactive' : 'active',
      vehicleType: data.vehicleType || 'motorcycle',
      notes: data.notes || '',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
  }

  private getFallbackDrivers(): DeliveryDriver[] {
    const now = new Date().toISOString();
    return DEFAULT_INITIAL_DRIVERS.map((d) => ({
      ...d,
      createdAt: now,
      updatedAt: now,
    }));
  }
}

export const deliveryDriverService = new DeliveryDriverService();
