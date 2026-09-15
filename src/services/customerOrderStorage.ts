/**
 * Customer Order Storage Service
 * Manages client-side persistence of customer orders tied to the local browser / device (localStorage).
 * Provides seamless order history, quick switching, automatic remembering of orders,
 * and high-fidelity app-like user experience for returning customers.
 */

export interface CustomerSavedOrder {
  orderNumber: string;
  orderId?: string;
  customerName?: string;
  customerPhone?: string;
  total?: number;
  deliveryFee?: number;
  itemsCount?: number;
  itemsSummary?: string;
  orderType?: 'delivery' | 'pickup' | string;
  branchNameAr?: string;
  status?: string;
  createdAt: string;
  lastCheckedAt?: string;
}

const STORAGE_KEY_ORDERS_LIST = 'bamborina_browser_orders_history';
const STORAGE_KEY_LAST_ORDER = 'bamborina_last_order_number';
const EVENT_NAME = 'bamborina_customer_orders_changed';

class CustomerOrderStorageService {
  /**
   * Get all orders saved in this browser
   */
  getSavedOrders(): CustomerSavedOrder[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ORDERS_LIST);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('⚠️ [CustomerOrderStorage] Failed to read saved orders:', e);
      return [];
    }
  }

  /**
   * Save or update an order in the local browser history
   */
  saveOrder(order: Partial<CustomerSavedOrder> & { orderNumber: string }): void {
    if (typeof window === 'undefined' || !order.orderNumber) return;

    try {
      const list = this.getSavedOrders();
      const existingIdx = list.findIndex(
        (o) => o.orderNumber.trim().toUpperCase() === order.orderNumber.trim().toUpperCase()
      );

      const nowIso = new Date().toISOString();
      const newEntry: CustomerSavedOrder = {
        orderNumber: order.orderNumber.trim(),
        orderId: order.orderId || (existingIdx >= 0 ? list[existingIdx].orderId : undefined),
        customerName: order.customerName || (existingIdx >= 0 ? list[existingIdx].customerName : undefined),
        customerPhone: order.customerPhone || (existingIdx >= 0 ? list[existingIdx].customerPhone : undefined),
        total: order.total !== undefined ? order.total : (existingIdx >= 0 ? list[existingIdx].total : undefined),
        deliveryFee: order.deliveryFee !== undefined ? order.deliveryFee : (existingIdx >= 0 ? list[existingIdx].deliveryFee : undefined),
        itemsCount: order.itemsCount !== undefined ? order.itemsCount : (existingIdx >= 0 ? list[existingIdx].itemsCount : undefined),
        itemsSummary: order.itemsSummary || (existingIdx >= 0 ? list[existingIdx].itemsSummary : undefined),
        orderType: order.orderType || (existingIdx >= 0 ? list[existingIdx].orderType : 'delivery'),
        branchNameAr: order.branchNameAr || (existingIdx >= 0 ? list[existingIdx].branchNameAr : 'فرع الطالبية'),
        status: order.status || (existingIdx >= 0 ? list[existingIdx].status : 'pending'),
        createdAt: order.createdAt || (existingIdx >= 0 ? list[existingIdx].createdAt : nowIso),
        lastCheckedAt: nowIso,
      };

      if (existingIdx >= 0) {
        list[existingIdx] = { ...list[existingIdx], ...newEntry };
      } else {
        // Add new order to the top of the history list (max 20 orders per device)
        list.unshift(newEntry);
      }

      const trimmed = list.slice(0, 20);
      localStorage.setItem(STORAGE_KEY_ORDERS_LIST, JSON.stringify(trimmed));
      localStorage.setItem(STORAGE_KEY_LAST_ORDER, order.orderNumber.trim());

      // Notify window listeners
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { orderNumber: order.orderNumber } }));
    } catch (e) {
      console.warn('⚠️ [CustomerOrderStorage] Failed to save order to local storage:', e);
    }
  }

  /**
   * Get the most recent order number on this browser
   */
  getLatestOrderNumber(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const direct = localStorage.getItem(STORAGE_KEY_LAST_ORDER);
      if (direct) return direct;

      const list = this.getSavedOrders();
      if (list.length > 0) return list[0].orderNumber;
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Update status of an existing order in local browser
   */
  updateOrderStatus(orderNumber: string, status: string, total?: number): void {
    if (typeof window === 'undefined' || !orderNumber) return;
    try {
      const list = this.getSavedOrders();
      const idx = list.findIndex(
        (o) => o.orderNumber.trim().toUpperCase() === orderNumber.trim().toUpperCase()
      );
      if (idx >= 0) {
        list[idx].status = status;
        list[idx].lastCheckedAt = new Date().toISOString();
        if (total !== undefined) list[idx].total = total;
        localStorage.setItem(STORAGE_KEY_ORDERS_LIST, JSON.stringify(list));
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { orderNumber } }));
      }
    } catch (e) {
      console.warn('⚠️ [CustomerOrderStorage] Failed to update order status:', e);
    }
  }

  /**
   * Delete an order from this browser's list
   */
  removeOrder(orderNumber: string): void {
    if (typeof window === 'undefined' || !orderNumber) return;
    try {
      const list = this.getSavedOrders().filter(
        (o) => o.orderNumber.trim().toUpperCase() !== orderNumber.trim().toUpperCase()
      );
      localStorage.setItem(STORAGE_KEY_ORDERS_LIST, JSON.stringify(list));

      if (this.getLatestOrderNumber() === orderNumber) {
        if (list.length > 0) {
          localStorage.setItem(STORAGE_KEY_LAST_ORDER, list[0].orderNumber);
        } else {
          localStorage.removeItem(STORAGE_KEY_LAST_ORDER);
        }
      }

      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { orderNumber } }));
    } catch (e) {
      console.warn('⚠️ [CustomerOrderStorage] Failed to remove order:', e);
    }
  }

  /**
   * Clear all stored orders on this browser
   */
  clearAll(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEY_ORDERS_LIST);
      localStorage.removeItem(STORAGE_KEY_LAST_ORDER);
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: {} }));
    } catch (e) {
      console.warn('⚠️ [CustomerOrderStorage] Failed to clear all orders:', e);
    }
  }

  /**
   * Listen to order changes in local storage
   */
  subscribe(callback: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = () => callback();
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener('storage', handler);
    };
  }
}

export const customerOrderStorage = new CustomerOrderStorageService();
