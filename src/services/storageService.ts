/**
 * StorageService
 * Modular, safe LocalStorage manager with memory fallback for Pamborina Platform.
 * Manages cart, selected branch, order sequence counter, customer activity timeline,
 * real notifications, and user preferences.
 */

const STORAGE_KEYS = {
  CART: 'pamborina_cart_items',
  BRANCH: 'pamborina_selected_branch',
  ORDER_SEQ: 'pamborina_last_order_seq',
  ACTIVITY_LOG: 'pamborina_customer_activity_log',
  NOTIFICATIONS: 'pamborina_real_notifications',
  ANALYTICS: 'pamborina_analytics_data',
  ORDERS: 'pamborina_guest_orders',
  ARCHIVED_ORDERS: 'pamborina_historical_orders_archive',
  ORDER_SEQUENCE: 'pamborina_order_sequence',
  DELETED_ORDERS_TOMBSTONES: 'pamborina_deleted_orders_tombstones',
  FAVORITES: 'pamborina_favorites',
  RECENT_SEARCHES: 'pamborina_searches',
  ACTIVE_SESSION: 'pamborina_session_info',
  PRODUCTS: 'pamborina_dynamic_products',
} as const;

export interface ActivityLogEntry {
  id: string;
  actionAr: string;
  detailsAr?: string;
  timestamp: string;
}

export interface RealNotificationItem {
  id: string;
  type: 'cart_add' | 'cart_remove' | 'cart_qty' | 'branch_select' | 'order_sent' | 'cart_abandoned' | 'system';
  titleAr: string;
  messageAr: string;
  timeAr: string;
  isUnread: boolean;
  createdAt: string;
}

class StorageService {
  private inMemoryStore: Record<string, string> = {};

  private isAvailable(): boolean {
    try {
      const testKey = '__pamborina_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  public getItem<T>(key: string, defaultValue: T): T {
    try {
      if (this.isAvailable()) {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      }
      const memItem = this.inMemoryStore[key];
      return memItem ? JSON.parse(memItem) : defaultValue;
    } catch (e) {
      console.warn(`[StorageService] Failed to parse key "${key}":`, e);
      return defaultValue;
    }
  }

  public setItem<T>(key: string, value: T): boolean {
    try {
      const serialized = JSON.stringify(value);
      if (this.isAvailable()) {
        window.localStorage.setItem(key, serialized);
      }
      this.inMemoryStore[key] = serialized;
      return true;
    } catch (e) {
      console.warn(`[StorageService] Failed to save key "${key}":`, e);
      return false;
    }
  }

  public removeItem(key: string): void {
    try {
      if (this.isAvailable()) {
        window.localStorage.removeItem(key);
      }
      delete this.inMemoryStore[key];
    } catch (e) {
      console.warn(`[StorageService] Failed to remove key "${key}":`, e);
    }
  }

  // 1. Cart Management
  public getCart<T>(defaultValue: T): T {
    return this.getItem(STORAGE_KEYS.CART, defaultValue);
  }

  public setCart<T>(cart: T): void {
    this.setItem(STORAGE_KEYS.CART, cart);
  }

  // 2. Branch Selection
  public getSelectedBranchId(defaultValue: string = ''): string {
    return this.getItem(STORAGE_KEYS.BRANCH, defaultValue);
  }

  public setSelectedBranchId(branchId: string): void {
    this.setItem(STORAGE_KEYS.BRANCH, branchId);
  }

  // 3. Auto-Incrementing Sequential Order Number (ORD-000001 ...)
  public getNextOrderNumber(): string {
    const currentSeq = this.getItem<number>(STORAGE_KEYS.ORDER_SEQ, 0);
    const nextSeq = currentSeq + 1;
    this.setItem<number>(STORAGE_KEYS.ORDER_SEQ, nextSeq);
    const padded = String(nextSeq).padStart(6, '0');
    return `ORD-${padded}`;
  }

  public getLastOrderSequence(): number {
    return this.getItem<number>(STORAGE_KEYS.ORDER_SEQ, 0);
  }

  // 4. Customer Activity Timeline Logging
  public getActivityLog(): ActivityLogEntry[] {
    return this.getItem<ActivityLogEntry[]>(STORAGE_KEYS.ACTIVITY_LOG, []);
  }

  public logActivity(actionAr: string, detailsAr?: string): void {
    const logs = this.getActivityLog();
    const newEntry: ActivityLogEntry = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      actionAr,
      detailsAr,
      timestamp: new Date().toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };
    // Keep up to 100 recent entries
    this.setItem(STORAGE_KEYS.ACTIVITY_LOG, [newEntry, ...logs].slice(0, 100));
  }

  // 5. Real User Notifications (NO FAKE / DUMMY DATA)
  public getNotifications(): RealNotificationItem[] {
    return this.getItem<RealNotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  }

  public addNotification(item: Omit<RealNotificationItem, 'id' | 'createdAt' | 'isUnread' | 'timeAr'>): void {
    const existing = this.getNotifications();
    const newNotif: RealNotificationItem = {
      ...item,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      isUnread: true,
      createdAt: new Date().toISOString(),
      timeAr: 'الآن',
    };
    this.setItem(STORAGE_KEYS.NOTIFICATIONS, [newNotif, ...existing].slice(0, 50));
  }

  public setNotifications(items: RealNotificationItem[]): void {
    this.setItem(STORAGE_KEYS.NOTIFICATIONS, items);
  }

  public markAllNotificationsRead(): void {
    const items = this.getNotifications().map((n) => ({ ...n, isUnread: false }));
    this.setNotifications(items);
  }

  // 6. Analytics & Orders
  public getAnalyticsData<T>(defaultValue: T): T {
    return this.getItem(STORAGE_KEYS.ANALYTICS, defaultValue);
  }

  public setAnalyticsData<T>(data: T): void {
    this.setItem(STORAGE_KEYS.ANALYTICS, data);
  }

  public setLastSystemResetTimestamp(timestampIso: string): void {
    this.setItem('pamborina_system_reset_at', timestampIso);
  }

  public getLastSystemResetTimestamp(): string | null {
    return this.getItem<string | null>('pamborina_system_reset_at', null);
  }

  public getGuestOrders<T = any[]>(defaultValue: T = [] as unknown as T): T {
    let orders = this.getItem<any[]>(STORAGE_KEYS.ORDERS, defaultValue as any);
    const resetAt = this.getLastSystemResetTimestamp();
    if (resetAt && Array.isArray(orders) && orders.length > 0) {
      const resetTime = new Date(resetAt).getTime();
      orders = orders.filter((o) => {
        if (!o) return false;
        if (!o.createdAt) return false;
        const createdTime = new Date(o.createdAt).getTime();
        return !isNaN(createdTime) && createdTime > resetTime;
      });
    }
    return orders as unknown as T;
  }

  public setGuestOrders<T = any[]>(orders: T[]): void {
    this.setItem(STORAGE_KEYS.ORDERS, orders);
  }

  public saveGuestOrder<T extends { id?: string; orderNumber?: string }>(order: T): void {
    const existing = this.getGuestOrders<T[]>([]);
    // Filter out if duplicate already exists
    const filtered = existing.filter((o) => {
      if (!o) return false;
      if (order.id && o.id === order.id) return false;
      if (order.orderNumber && o.orderNumber === order.orderNumber) return false;
      return true;
    });
    this.setItem(STORAGE_KEYS.ORDERS, [order, ...filtered]);
  }

  public removeGuestOrder(orderIdOrNumber: string): void {
    if (!orderIdOrNumber) return;
    const clean = orderIdOrNumber.trim().toUpperCase();
    const existing = this.getGuestOrders<any[]>([]);
    const filtered = existing.filter((o) => {
      if (!o) return false;
      const oId = (o.id || '').toString().trim().toUpperCase();
      const oNum = (o.orderNumber || '').toString().trim().toUpperCase();
      return oId !== clean && oNum !== clean;
    });
    this.setItem(STORAGE_KEYS.ORDERS, filtered);
    this.recordDeletedOrderTombstone(orderIdOrNumber);
  }

  public removeGuestOrders(orderIdsOrNumbers: string[]): void {
    if (!orderIdsOrNumbers || orderIdsOrNumbers.length === 0) return;
    const cleanTargets = new Set(orderIdsOrNumbers.map((s) => (s || '').trim().toUpperCase()));
    const existing = this.getGuestOrders<any[]>([]);
    const filtered = existing.filter((o) => {
      if (!o) return false;
      const oId = (o.id || '').toString().trim().toUpperCase();
      const oNum = (o.orderNumber || '').toString().trim().toUpperCase();
      return !cleanTargets.has(oId) && !cleanTargets.has(oNum);
    });
    this.setItem(STORAGE_KEYS.ORDERS, filtered);
    orderIdsOrNumbers.forEach((id) => this.recordDeletedOrderTombstone(id));
  }

  public clearGuestOrders(): void {
    this.setItem(STORAGE_KEYS.ORDERS, []);
  }

  // 1b. Historical Archiving for Reports & Audit Logs
  public archiveOrders<T extends { id?: string; orderNumber?: string }>(ordersToArchive: T[]): void {
    if (!ordersToArchive || ordersToArchive.length === 0) return;
    const existing = this.getItem<T[]>(STORAGE_KEYS.ARCHIVED_ORDERS, []);
    const existingIds = new Set(existing.map((o) => (o.id || o.orderNumber || '').toString().trim()));

    const newToAppend: T[] = [];
    ordersToArchive.forEach((ord) => {
      const key = (ord.id || ord.orderNumber || '').toString().trim();
      if (key && !existingIds.has(key)) {
        existingIds.add(key);
        newToAppend.push(ord);
      }
    });

    if (newToAppend.length > 0) {
      this.setItem(STORAGE_KEYS.ARCHIVED_ORDERS, [...existing, ...newToAppend]);
    }
  }

  public getArchivedOrders<T = any[]>(): T[] {
    return this.getItem<T[]>(STORAGE_KEYS.ARCHIVED_ORDERS, []);
  }

  // Resets the order sequence counter so next order is #ORDER-01-...
  public resetOrderSequence(): void {
    this.removeItem(STORAGE_KEYS.ORDER_SEQUENCE);
    this.removeItem(STORAGE_KEYS.ORDER_SEQ);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem('pamborina_order_sequence');
        localStorage.removeItem('pamborina_last_order_seq');
      } catch {
        // ignore
      }
    }
  }

  public clearTombstones(): void {
    this.removeItem(STORAGE_KEYS.DELETED_ORDERS_TOMBSTONES);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem('pamborina_deleted_orders_tombstones');
      } catch {
        // ignore
      }
    }
  }

  // Tombstone mechanism to prevent deleted orders from being resurrected by stale caches
  public getDeletedOrderTombstones(): string[] {
    return this.getItem<string[]>(STORAGE_KEYS.DELETED_ORDERS_TOMBSTONES, []);
  }

  public recordDeletedOrderTombstone(idOrNumber: string): void {
    if (!idOrNumber) return;
    const clean = idOrNumber.trim().toUpperCase();
    const current = this.getDeletedOrderTombstones();
    if (!current.includes(clean)) {
      this.setItem(STORAGE_KEYS.DELETED_ORDERS_TOMBSTONES, [clean, ...current].slice(0, 500));
    }
  }

  public isOrderTombstoned(idOrNumber?: string): boolean {
    if (!idOrNumber) return false;
    const clean = idOrNumber.trim().toUpperCase();
    const tombstones = this.getDeletedOrderTombstones();
    return tombstones.includes(clean);
  }

  public getFavorites(defaultValue: string[] = []): string[] {
    return this.getItem(STORAGE_KEYS.FAVORITES, defaultValue);
  }

  public setFavorites(favoriteIds: string[]): void {
    this.setItem(STORAGE_KEYS.FAVORITES, favoriteIds);
  }

  public getProducts<T>(defaultValue: T): T {
    return this.getItem(STORAGE_KEYS.PRODUCTS, defaultValue);
  }

  public setProducts<T>(products: T): void {
    this.setItem(STORAGE_KEYS.PRODUCTS, products);
  }
}

export const storageService = new StorageService();
export { STORAGE_KEYS };
