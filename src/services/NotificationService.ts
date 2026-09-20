/**
 * NotificationService
 * Main Smart Notification Controller. Orchestrates storage, scheduling, routing,
 * browser native push notifications, and event analytics logging.
 */

import {
  SmartNotification,
  NotificationType,
  SmartNotificationAction,
  NotificationEventLog,
} from '../types/notification.types';
import { notificationStorage } from './notification.storage';
import { notificationRouter, RouterCallbacks } from './notification.router';
import { notificationScheduler } from './notification.scheduler';
import {
  requestBrowserNotificationPermission,
  sendNativeBrowserNotification,
  getBrowserNotificationPermission,
  playNotificationSound,
  isNotificationSupported,
} from './notification.utils';

class SmartNotificationService {
  private isInitialized: boolean = false;
  private notificationListeners: Array<(notif: SmartNotification | null) => void> = [];

  public async initialize(callbacks: RouterCallbacks): Promise<void> {
    if (this.isInitialized) {
      notificationRouter.registerCallbacks(callbacks);
      return;
    }

    notificationRouter.registerCallbacks(callbacks);

    // Initialize scheduler
    notificationScheduler.initialize({
      onTriggerAbandonedCart: (itemsCount, firstName) =>
        this.triggerAbandonedCartReminder(itemsCount, firstName),
      onTriggerProductDwell: (productId) => this.triggerProductDwellHelp(productId),
    });

    this.isInitialized = true;

    // Auto-check Welcome Back on init
    setTimeout(() => {
      this.checkWelcomeBack();
    }, 1500);
  }

  public subscribe(listener: (notif: SmartNotification | null) => void): () => void {
    this.notificationListeners.push(listener);
    return () => {
      this.notificationListeners = this.notificationListeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(notif: SmartNotification | null): void {
    this.notificationListeners.forEach((listener) => {
      try {
        listener(notif);
      } catch (err) {
        console.error('[NotificationService] Listener error:', err);
      }
    });
  }

  // Permission Request Handler (Graceful, called once)
  public async requestPermission(): Promise<NotificationPermission | 'unsupported'> {
    notificationStorage.setPermissionRequested(true);
    const permission = await requestBrowserNotificationPermission();
    return permission;
  }

  public getPermissionStatus(): NotificationPermission | 'unsupported' {
    return getBrowserNotificationPermission();
  }

  // 1. Trigger Abandoned Cart Reminder (inactivity / exit intent)
  public triggerAbandonedCartReminder(itemsCount: number, firstItemNameAr?: string): void {
    const title = firstItemNameAr
      ? `🛒 لا تنسَ طلب "${firstItemNameAr}"`
      : '🛒 منتجاتك الفاخرة تنتظرك في السلة!';
    const description = firstItemNameAr
      ? `ما زال "${firstItemNameAr}" وأصناف طازجة بالسمن البلدي محفوظة في سلتك. اضغط هنا لإكمال الطلب الآن!`
      : `لديك ${itemsCount} أصناف طازجة بالسمن البلدي في السلة. أكمل طلبك وحجز توصيلك فوراً!`;

    this.createAndDispatchNotification({
      type: 'abandoned_cart',
      titleAr: title,
      descriptionAr: description,
      icon: '🛍️',
      triggerCause: 'inactive_cart_reminder',
      action: {
        type: 'open_cart',
        labelAr: 'استكمال الطلب فوراً',
        targetRoute: '/cart',
      },
    });
  }

  // 2. Trigger Product Addition Toast with Action Button
  public handleProductAddedToCart(productNameAr: string, productId: string): void {
    // Schedule abandoned cart timer for future inactivity
    notificationScheduler.scheduleAbandonedCartCheck();

    this.createAndDispatchNotification({
      type: 'cart_add',
      titleAr: 'تمت إضافة المنتج إلى السلة 🛍️',
      descriptionAr: `تم إضافة "${productNameAr}" بنجاح إلى سلة مشترياتك.`,
      icon: '✨',
      triggerCause: 'user_added_product',
      action: {
        type: 'open_cart',
        labelAr: 'عرض السلة',
        targetRoute: '/cart',
        productId,
      },
    });
  }

  // 3. Trigger Cart Emptied / Item Removed
  public handleCartItemRemoved(remainingCount: number, removedProductNameAr?: string): void {
    if (remainingCount === 0) {
      notificationScheduler.cancelAbandonedCartCheck();
      this.createAndDispatchNotification({
        type: 'cart_emptied',
        titleAr: 'تم إفراغ السلة 🗑️',
        descriptionAr: 'أصبحت سلتك فارغة الآن. يمكنك تصفح القائمة وإضافة منتجات جديدة.',
        icon: '🛒',
        triggerCause: 'user_emptied_cart',
        action: {
          type: 'dismiss',
          labelAr: 'تصفح القائمة',
        },
      });
    } else {
      this.createAndDispatchNotification({
        type: 'cart_remove',
        titleAr: 'تم إزالة المنتج',
        descriptionAr: removedProductNameAr ? `تم إزالة "${removedProductNameAr}" من السلة.` : 'تم تحديث الكميات في السلة.',
        icon: '🗑️',
        triggerCause: 'user_removed_item',
      });
    }
  }

  // 4. Trigger Product Dwell Assistance Prompt (> 1 min without adding)
  public handleProductModalOpened(productId: string): void {
    notificationStorage.setLastProductViewed(productId);
    notificationScheduler.startProductDwellTimer(productId);
  }

  public handleProductModalClosed(): void {
    notificationScheduler.cancelProductDwellTimer();
  }

  private triggerProductDwellHelp(productId: string): void {
    this.createAndDispatchNotification({
      type: 'product_dwell',
      titleAr: 'هل تحتاج مساعدة؟ 💡',
      descriptionAr: 'يمكنك إضافة المنتج الآن لمتابعة الطلب واستكشاف الخصومات.',
      icon: '💡',
      triggerCause: 'product_dwell_60s',
      action: {
        type: 'add_to_cart',
        labelAr: 'إضافة للسلة',
        productId,
      },
    });
  }

  // 5. Trigger Cart Page Exit Dialog State
  public shouldShowCartExitDialog(cartItemsCount: number): boolean {
    return cartItemsCount > 0;
  }

  // 6. Trigger Welcome Back Notification (Return within 24h)
  public checkWelcomeBack(): void {
    if (notificationScheduler.checkShouldTriggerWelcomeBack()) {
      this.createAndDispatchNotification({
        type: 'welcome_back',
        titleAr: 'مرحباً بعودتك! 👋',
        descriptionAr: 'ما زالت طلباتك محفوظة داخل السلة. يمكنك إكمال الطلب الآن.',
        icon: '👑',
        triggerCause: 'returned_within_24h',
        action: {
          type: 'open_cart',
          labelAr: 'استكمال الطلب',
          targetRoute: '/cart',
        },
      });
    }
  }

  // 7. Branch Persistence Logging
  public handleBranchSelected(branchId: string, branchNameAr: string): void {
    notificationStorage.setSelectedBranch(branchId);
    notificationStorage.logNotificationEvent({
      notificationId: `branch_${branchId}`,
      type: 'branch_remembered',
      cause: 'user_selected_branch',
      userAction: 'shown',
      metadata: { branchId, branchNameAr },
    });
  }

  // 8. Order Completed -> Clear Reminders & Mark Conversions
  public handleOrderCompleted(orderNumber: string): void {
    notificationScheduler.cancelAbandonedCartCheck();
    notificationStorage.clearCartNotificationsAndReminders();
    notificationStorage.markNotifsConvertedToPurchase();

    this.createAndDispatchNotification({
      type: 'order_completed',
      titleAr: 'تم تأكيد طلبك بنجاح! 🎉',
      descriptionAr: `رقم الطلب #${orderNumber}. جاري تجهيز الأصناف وإرسالها فوراً.`,
      icon: '✨',
      triggerCause: 'order_placed',
      action: {
        type: 'dismiss',
        labelAr: 'حسناً',
      },
    });
  }

  // Core Notification Dispatcher
  public createAndDispatchNotification(params: {
    type: NotificationType;
    titleAr: string;
    descriptionAr: string;
    icon?: string;
    triggerCause: string;
    action?: SmartNotificationAction;
  }): SmartNotification {
    const notif: SmartNotification = {
      id: `smart_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: params.type,
      titleAr: params.titleAr,
      descriptionAr: params.descriptionAr,
      icon: params.icon || '🔔',
      action: params.action,
      triggerCause: params.triggerCause,
      createdAt: Date.now(),
      isRead: false,
      isClicked: false,
      isIgnored: false,
    };

    // Save in storage history
    notificationStorage.saveNotification(notif);

    // Log event in analytics timeline
    notificationStorage.logNotificationEvent({
      notificationId: notif.id,
      type: notif.type,
      cause: notif.triggerCause,
      userAction: 'shown',
    });

    // Play pleasant UI sound feedback
    playNotificationSound();

    // Send native browser notification if tab is hidden or backgrounded
    if (typeof document !== 'undefined' && document.hidden) {
      sendNativeBrowserNotification(notif.titleAr, {
        body: notif.descriptionAr,
        icon: '/icon.png',
        tag: `notif_${notif.type}`,
        onClick: () => {
          this.handleNotificationClick(notif);
        },
      });
    }

    // Broadcast to UI subscribers
    this.notifyListeners(notif);

    return notif;
  }

  // Action Click Handler
  public handleNotificationClick(notif: SmartNotification): void {
    notificationStorage.markNotificationClicked(notif.id);
    notificationStorage.logNotificationEvent({
      notificationId: notif.id,
      type: notif.type,
      cause: notif.triggerCause,
      userAction: 'clicked',
    });

    if (notif.action) {
      notificationRouter.handleAction(notif.action);
    } else {
      if (
        notif.type === 'abandoned_cart' ||
        notif.type === 'cart_add' ||
        notif.type === 'welcome_back'
      ) {
        notificationRouter.handleAction({
          type: 'open_cart',
          labelAr: 'فتح السلة',
          targetRoute: '/cart',
        });
      }
    }
  }

  // Ignore Handler
  public handleNotificationIgnored(notifId: string): void {
    notificationStorage.markNotificationIgnored(notifId);
    const notif = notificationStorage
      .getNotificationHistory()
      .find((n) => n.id === notifId);
    if (notif) {
      notificationStorage.logNotificationEvent({
        notificationId: notifId,
        type: notif.type,
        cause: notif.triggerCause,
        userAction: 'ignored',
      });
    }
  }

  // Getter & Bulk Operation Methods
  public markAllRead(): void {
    notificationStorage.markAllNotificationsRead();
    this.notifyListeners(null);
  }

  public clearAllHistory(): void {
    notificationStorage.clearAllNotifications();
    this.notifyListeners(null);
  }

  public getHistory(): SmartNotification[] {
    return notificationStorage.getNotificationHistory();
  }

  public getEventLogs(): NotificationEventLog[] {
    return notificationStorage.getNotificationEvents();
  }

  public registerRouterCallbacks(callbacks: RouterCallbacks): void {
    notificationRouter.registerCallbacks(callbacks);
  }
}

export const notificationService = new SmartNotificationService();
