/**
 * NotificationStorageService
 * Handles persistence for smart notification state, history, cart snapshots,
 * user activity timestamps, and event logs in LocalStorage with fallback.
 */

import {
  SmartNotification,
  NotificationEventLog,
  NotificationStorageSchema,
} from '../types/notification.types';

export const NOTIFICATION_STORAGE_KEYS = {
  CART: 'pamborina_cart_items',
  LAST_NOTIFICATION: 'pamborina_last_notification',
  NOTIFICATION_HISTORY: 'pamborina_notification_history',
  LAST_CART_VISIT: 'pamborina_last_cart_visit',
  LAST_PRODUCT_VIEWED: 'pamborina_last_product_viewed',
  ABANDONED_CART: 'pamborina_abandoned_cart_state',
  SELECTED_BRANCH: 'pamborina_selected_branch',
  LAST_ACTIVITY: 'pamborina_last_user_activity',
  NOTIFICATION_EVENTS: 'pamborina_notification_events_log',
  PERMISSION_REQUESTED: 'pamborina_notif_permission_requested',
} as const;

class NotificationStorageService {
  private inMemoryFallback: Record<string, string> = {};

  private isLocalStorageAvailable(): boolean {
    try {
      const test = '__notif_storage_test__';
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  public getItem<T>(key: string, defaultValue: T): T {
    try {
      if (this.isLocalStorageAvailable()) {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      }
      const mem = this.inMemoryFallback[key];
      return mem ? JSON.parse(mem) : defaultValue;
    } catch (err) {
      console.warn(`[NotificationStorage] Error reading key "${key}":`, err);
      return defaultValue;
    }
  }

  public setItem<T>(key: string, value: T): boolean {
    try {
      const serialized = JSON.stringify(value);
      if (this.isLocalStorageAvailable()) {
        window.localStorage.setItem(key, serialized);
      }
      this.inMemoryFallback[key] = serialized;
      return true;
    } catch (err) {
      console.warn(`[NotificationStorage] Error setting key "${key}":`, err);
      return false;
    }
  }

  public removeItem(key: string): void {
    try {
      if (this.isLocalStorageAvailable()) {
        window.localStorage.removeItem(key);
      }
      delete this.inMemoryFallback[key];
    } catch (err) {
      console.warn(`[NotificationStorage] Error removing key "${key}":`, err);
    }
  }

  // 1. Cart Persistence
  public getCart<T>(defaultValue: T): T {
    return this.getItem(NOTIFICATION_STORAGE_KEYS.CART, defaultValue);
  }

  public setCart<T>(cart: T): void {
    this.setItem(NOTIFICATION_STORAGE_KEYS.CART, cart);
  }

  // 2. Last Notification
  public getLastNotification(): SmartNotification | null {
    return this.getItem<SmartNotification | null>(
      NOTIFICATION_STORAGE_KEYS.LAST_NOTIFICATION,
      null
    );
  }

  public setLastNotification(notif: SmartNotification): void {
    this.setItem(NOTIFICATION_STORAGE_KEYS.LAST_NOTIFICATION, notif);
  }

  // 3. Notification History
  public getNotificationHistory(): SmartNotification[] {
    return this.getItem<SmartNotification[]>(
      NOTIFICATION_STORAGE_KEYS.NOTIFICATION_HISTORY,
      []
    );
  }

  public saveNotification(notif: SmartNotification): void {
    const history = this.getNotificationHistory();
    // Filter out previous unread notifications of same type/cause to avoid duplicates
    const filtered = history.filter(
      (n) => !(n.type === notif.type && n.triggerCause === notif.triggerCause && !n.isRead)
    );
    const updated = [notif, ...filtered].slice(0, 50);
    this.setItem(NOTIFICATION_STORAGE_KEYS.NOTIFICATION_HISTORY, updated);
    this.setLastNotification(notif);
  }

  public markNotificationClicked(notifId: string): void {
    const history = this.getNotificationHistory();
    const updated = history.map((n) =>
      n.id === notifId ? { ...n, isRead: true, isClicked: true } : n
    );
    this.setItem(NOTIFICATION_STORAGE_KEYS.NOTIFICATION_HISTORY, updated);
  }

  public markAllNotificationsRead(): void {
    const history = this.getNotificationHistory();
    const updated = history.map((n) => ({ ...n, isRead: true }));
    this.setItem(NOTIFICATION_STORAGE_KEYS.NOTIFICATION_HISTORY, updated);
  }

  public clearAllNotifications(): void {
    this.setItem(NOTIFICATION_STORAGE_KEYS.NOTIFICATION_HISTORY, []);
    this.removeItem(NOTIFICATION_STORAGE_KEYS.LAST_NOTIFICATION);
  }

  public markNotificationIgnored(notifId: string): void {
    const history = this.getNotificationHistory();
    const updated = history.map((n) =>
      n.id === notifId ? { ...n, isIgnored: true } : n
    );
    this.setItem(NOTIFICATION_STORAGE_KEYS.NOTIFICATION_HISTORY, updated);
  }

  public markNotifsConvertedToPurchase(): void {
    const history = this.getNotificationHistory();
    const updated = history.map((n) =>
      n.type === 'abandoned_cart' || n.type === 'cart_add' || n.type === 'welcome_back'
        ? { ...n, convertedToPurchase: true, isRead: true }
        : n
    );
    this.setItem(NOTIFICATION_STORAGE_KEYS.NOTIFICATION_HISTORY, updated);
  }

  // 4. Last Cart Visit
  public getLastCartVisit(): number | null {
    return this.getItem<number | null>(NOTIFICATION_STORAGE_KEYS.LAST_CART_VISIT, null);
  }

  public setLastCartVisit(time: number = Date.now()): void {
    this.setItem(NOTIFICATION_STORAGE_KEYS.LAST_CART_VISIT, time);
  }

  // 5. Last Product Viewed
  public getLastProductViewed(): { productId: string; timestamp: number } | null {
    return this.getItem(NOTIFICATION_STORAGE_KEYS.LAST_PRODUCT_VIEWED, null);
  }

  public setLastProductViewed(productId: string): void {
    this.setItem(NOTIFICATION_STORAGE_KEYS.LAST_PRODUCT_VIEWED, {
      productId,
      timestamp: Date.now(),
    });
  }

  // 6. Abandoned Cart State
  public getAbandonedCartState(): {
    hasReminderScheduled: boolean;
    scheduledAt: number | null;
    itemsCount: number;
  } | null {
    return this.getItem(NOTIFICATION_STORAGE_KEYS.ABANDONED_CART, null);
  }

  public setAbandonedCartState(state: {
    hasReminderScheduled: boolean;
    scheduledAt: number | null;
    itemsCount: number;
  } | null): void {
    if (state === null) {
      this.removeItem(NOTIFICATION_STORAGE_KEYS.ABANDONED_CART);
    } else {
      this.setItem(NOTIFICATION_STORAGE_KEYS.ABANDONED_CART, state);
    }
  }

  // 7. Selected Branch
  public getSelectedBranch(): string | null {
    return this.getItem<string | null>(NOTIFICATION_STORAGE_KEYS.SELECTED_BRANCH, null);
  }

  public setSelectedBranch(branchId: string): void {
    this.setItem(NOTIFICATION_STORAGE_KEYS.SELECTED_BRANCH, branchId);
  }

  // 8. User Activity
  public getLastActivity(): number {
    return this.getItem<number>(NOTIFICATION_STORAGE_KEYS.LAST_ACTIVITY, Date.now());
  }

  public setLastActivity(time: number = Date.now()): void {
    this.setItem(NOTIFICATION_STORAGE_KEYS.LAST_ACTIVITY, time);
  }

  // 9. Notification Event Logs
  public getNotificationEvents(): NotificationEventLog[] {
    return this.getItem<NotificationEventLog[]>(
      NOTIFICATION_STORAGE_KEYS.NOTIFICATION_EVENTS,
      []
    );
  }

  public logNotificationEvent(log: Omit<NotificationEventLog, 'id' | 'timestamp'>): void {
    const events = this.getNotificationEvents();
    const entry: NotificationEventLog = {
      ...log,
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.setItem(NOTIFICATION_STORAGE_KEYS.NOTIFICATION_EVENTS, [entry, ...events].slice(0, 100));
  }

  // 10. Permission Request tracker
  public getPermissionRequested(): boolean {
    return this.getItem<boolean>(NOTIFICATION_STORAGE_KEYS.PERMISSION_REQUESTED, false);
  }

  public setPermissionRequested(requested: boolean = true): void {
    this.setItem(NOTIFICATION_STORAGE_KEYS.PERMISSION_REQUESTED, requested);
  }

  public clearCartNotificationsAndReminders(): void {
    this.setAbandonedCartState(null);
    const history = this.getNotificationHistory();
    // Mark pending cart reminders read/handled
    const updated = history.map((n) =>
      n.type === 'abandoned_cart' ? { ...n, isRead: true } : n
    );
    this.setItem(NOTIFICATION_STORAGE_KEYS.NOTIFICATION_HISTORY, updated);
  }
}

export const notificationStorage = new NotificationStorageService();
