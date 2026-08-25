/**
 * NotificationScheduler
 * Manages background timers, activity listeners, product dwell detection,
 * and smart abandoned cart triggers with item details.
 */

import { notificationStorage } from './notification.storage';

const INACTIVITY_ABANDON_TIMEOUT_MS = 45 * 1000; // 45 seconds inactivity with items in cart
const PRODUCT_DWELL_TIMEOUT_MS = 40 * 1000;      // 40 seconds on product detail
const WELCOME_BACK_MAX_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface SchedulerCallbacks {
  onTriggerAbandonedCart: (itemsCount: number, firstItemNameAr?: string) => void;
  onTriggerProductDwell: (productId: string) => void;
}

class NotificationSchedulerService {
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private productDwellTimer: ReturnType<typeof setTimeout> | null = null;
  private currentActiveProductId: string | null = null;
  private callbacks: SchedulerCallbacks | null = null;
  private isListeningToEvents: boolean = false;

  public initialize(callbacks: SchedulerCallbacks): void {
    this.callbacks = callbacks;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (this.isListeningToEvents || typeof window === 'undefined') return;

    const activityHandler = () => this.recordUserActivity();

    window.addEventListener('mousemove', activityHandler, { passive: true });
    window.addEventListener('keydown', activityHandler, { passive: true });
    window.addEventListener('touchstart', activityHandler, { passive: true });
    window.addEventListener('scroll', activityHandler, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Tab hidden -> schedule fast abandoned cart check if cart is non-empty
        this.triggerFastAbandonedCheck();
      } else {
        // Tab visible again -> record activity
        this.recordUserActivity();
      }
    });

    // Detect exit intent (mouse moving towards top of window)
    document.addEventListener('mouseleave', (e) => {
      if (e.clientY <= 10) {
        this.triggerFastAbandonedCheck();
      }
    });

    window.addEventListener('beforeunload', () => {
      // Record timestamp before exit
      notificationStorage.setLastActivity(Date.now());
    });

    this.isListeningToEvents = true;
  }

  public recordUserActivity(): void {
    const now = Date.now();
    notificationStorage.setLastActivity(now);
    // Restart inactivity timer if cart is non-empty
    this.scheduleAbandonedCartCheck();
  }

  public scheduleAbandonedCartCheck(): void {
    const cart = notificationStorage.getCart<any[]>([]);
    if (!cart || cart.length === 0) {
      this.cancelAbandonedCartCheck();
      return;
    }

    const state = notificationStorage.getAbandonedCartState();
    // Allow reminder if it hasn't fired in the last 2 minutes
    if (state?.hasReminderScheduled && state.scheduledAt && Date.now() - state.scheduledAt < 2 * 60 * 1000) {
      return;
    }

    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    this.inactivityTimer = setTimeout(() => {
      const currentCart = notificationStorage.getCart<any[]>([]);
      if (currentCart && currentCart.length > 0 && this.callbacks) {
        const firstItem = currentCart[0];
        const firstName = firstItem?.product?.nameAr || firstItem?.nameAr || '';
        this.callbacks.onTriggerAbandonedCart(currentCart.length, firstName);
        notificationStorage.setAbandonedCartState({
          hasReminderScheduled: true,
          scheduledAt: Date.now(),
          itemsCount: currentCart.length,
        });
      }
    }, INACTIVITY_ABANDON_TIMEOUT_MS);
  }

  public triggerFastAbandonedCheck(): void {
    const currentCart = notificationStorage.getCart<any[]>([]);
    if (!currentCart || currentCart.length === 0 || !this.callbacks) return;

    const state = notificationStorage.getAbandonedCartState();
    if (state?.hasReminderScheduled && state.scheduledAt && Date.now() - state.scheduledAt < 2 * 60 * 1000) {
      return;
    }

    const firstItem = currentCart[0];
    const firstName = firstItem?.product?.nameAr || firstItem?.nameAr || '';
    this.callbacks.onTriggerAbandonedCart(currentCart.length, firstName);
    notificationStorage.setAbandonedCartState({
      hasReminderScheduled: true,
      scheduledAt: Date.now(),
      itemsCount: currentCart.length,
    });
  }

  public cancelAbandonedCartCheck(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    notificationStorage.setAbandonedCartState(null);
  }

  // Product Dwell (40 Seconds without adding to cart)
  public startProductDwellTimer(productId: string): void {
    this.cancelProductDwellTimer();
    this.currentActiveProductId = productId;

    this.productDwellTimer = setTimeout(() => {
      if (this.currentActiveProductId === productId && this.callbacks) {
        this.callbacks.onTriggerProductDwell(productId);
      }
    }, PRODUCT_DWELL_TIMEOUT_MS);
  }

  public cancelProductDwellTimer(): void {
    if (this.productDwellTimer) {
      clearTimeout(this.productDwellTimer);
      this.productDwellTimer = null;
    }
    this.currentActiveProductId = null;
  }

  // Welcome back check within 24 hours
  public checkShouldTriggerWelcomeBack(): boolean {
    const cart = notificationStorage.getCart<any[]>([]);
    if (!cart || cart.length === 0) return false;

    const lastVisit = notificationStorage.getLastCartVisit();
    const lastActivity = notificationStorage.getLastActivity();
    const now = Date.now();

    const referenceTime = lastVisit || lastActivity;
    if (!referenceTime) return false;

    const timeDiff = now - referenceTime;
    // If returned within 24 hours and at least 5 minutes passed since last activity
    if (timeDiff > 5 * 60 * 1000 && timeDiff <= WELCOME_BACK_MAX_WINDOW_MS) {
      return true;
    }

    return false;
  }

  public destroy(): void {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    if (this.productDwellTimer) clearTimeout(this.productDwellTimer);
  }
}

export const notificationScheduler = new NotificationSchedulerService();
