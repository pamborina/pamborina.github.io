/**
 * Notification System Types for Pamborina E-Commerce Platform.
 * Fully extensible for Firebase, OneSignal, or Web Push APIs.
 */

export type NotificationType =
  | 'cart_add'           // Toast after adding item (with "عرض السلة" button)
  | 'cart_remove'        // Toast after item removed
  | 'cart_emptied'       // Toast when last item removed
  | 'abandoned_cart'     // Reminder after 5m inactivity / page leave with items in cart
  | 'product_dwell'      // Prompt after 1m on product page without adding
  | 'cart_exit_prompt'   // Dialog before leaving cart page with non-empty cart
  | 'welcome_back'       // Return within 24h with saved cart
  | 'branch_remembered'  // Persistent branch selection confirmation
  | 'order_completed';   // Order placed (clears reminders)

export type ActionType =
  | 'open_cart'
  | 'open_product'
  | 'add_to_cart'
  | 'proceed_checkout'
  | 'dismiss'
  | 'custom';

export interface SmartNotificationAction {
  type: ActionType;
  labelAr: string;
  targetRoute?: string;
  productId?: string;
  data?: any;
}

export interface SmartNotification {
  id: string;
  type: NotificationType;
  titleAr: string;
  descriptionAr: string;
  icon?: string;
  action?: SmartNotificationAction;
  triggerCause: string;
  createdAt: number;
  isRead: boolean;
  isClicked: boolean;
  isIgnored: boolean;
  convertedToPurchase?: boolean;
}

export interface NotificationEventLog {
  id: string;
  notificationId: string;
  type: NotificationType;
  cause: string;
  timestamp: string;
  userAction: 'shown' | 'clicked' | 'ignored' | 'converted';
  metadata?: any;
}

export interface NotificationStorageSchema {
  cart: any[];
  lastNotification: SmartNotification | null;
  notificationHistory: SmartNotification[];
  lastCartVisit: number | null;
  lastProductViewed: { productId: string; timestamp: number } | null;
  abandonedCart: {
    hasReminderScheduled: boolean;
    scheduledAt: number | null;
    itemsCount: number;
  } | null;
  selectedBranch: string | null;
  lastActivity: number;
  notificationEvents: NotificationEventLog[];
  permissionRequested: boolean;
}
