/**
 * NotificationRouter
 * Executes route and action handlers when a notification or its action button is clicked.
 */

import { SmartNotificationAction } from '../types/notification.types';

export interface RouterCallbacks {
  onOpenCart?: () => void;
  onOpenProduct?: (productId: string) => void;
  onAddToCart?: (productId: string) => void;
  onProceedCheckout?: () => void;
  onNavigateToCategory?: (categoryId: string) => void;
}

class NotificationRouterService {
  private callbacks: RouterCallbacks = {};

  public registerCallbacks(callbacks: RouterCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public handleAction(action: SmartNotificationAction): void {
    if (!action) return;

    // Focus current window if background native notification was clicked
    if (typeof window !== 'undefined' && window.focus) {
      try {
        window.focus();
      } catch {
        // Ignore iframe restrictions
      }
    }

    switch (action.type) {
      case 'open_cart':
        if (this.callbacks.onOpenCart) {
          this.callbacks.onOpenCart();
        }
        break;

      case 'open_product':
        if (action.productId && this.callbacks.onOpenProduct) {
          this.callbacks.onOpenProduct(action.productId);
        }
        break;

      case 'add_to_cart':
        if (action.productId && this.callbacks.onAddToCart) {
          this.callbacks.onAddToCart(action.productId);
        }
        break;

      case 'proceed_checkout':
        if (this.callbacks.onProceedCheckout) {
          this.callbacks.onProceedCheckout();
        }
        break;

      case 'dismiss':
        break;

      case 'custom':
        if (action.targetRoute === '/cart' && this.callbacks.onOpenCart) {
          this.callbacks.onOpenCart();
        } else if (action.targetRoute?.startsWith('/product/') && this.callbacks.onOpenProduct) {
          const pId = action.targetRoute.replace('/product/', '');
          this.callbacks.onOpenProduct(pId);
        }
        break;

      default:
        if (this.callbacks.onOpenCart) {
          this.callbacks.onOpenCart();
        }
        break;
    }
  }
}

export const notificationRouter = new NotificationRouterService();
