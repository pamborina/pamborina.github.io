/**
 * AnalyticsService
 * Dedicated modular analytics tracking system for Pamborina Platform.
 * Stores all metrics locally in localStorage and prepares architecture
 * for seamless future backend API synchronization without modifying UI code.
 */

import { storageService } from './storageService';

export interface AnalyticsEvent {
  id: string;
  type: 
    | 'PAGE_VIEW'
    | 'CATEGORY_VIEW'
    | 'PRODUCT_VIEW'
    | 'ADD_TO_CART'
    | 'REMOVE_FROM_CART'
    | 'CHECKOUT_STARTED'
    | 'ORDER_SUBMITTED'
    | 'SEARCH_KEYWORD'
    | 'FAVORITE_TOGGLE'
    | 'TIME_SPENT';
  payload: Record<string, any>;
  timestamp: string;
}

export interface ProductOrderCount {
  productId: string;
  productNameAr: string;
  count: number;
}

export interface AnalyticsDataStore {
  pageViews: Record<string, number>;
  categoryViews: Record<string, number>;
  productViews: Record<string, number>;
  cartAdditions: Record<string, number>;
  cartRemovals: Record<string, number>;
  checkoutStartsCount: number;
  ordersSubmittedCount: number;
  totalTimeSpentSeconds: number;
  searchKeywords: Record<string, number>;
  favoriteToggles: Record<string, number>;
  orderedProducts: Record<string, { nameAr: string; quantity: number }>;
  eventsLog: AnalyticsEvent[];
}

const INITIAL_ANALYTICS: AnalyticsDataStore = {
  pageViews: {},
  categoryViews: {},
  productViews: {},
  cartAdditions: {},
  cartRemovals: {},
  checkoutStartsCount: 0,
  ordersSubmittedCount: 0,
  totalTimeSpentSeconds: 0,
  searchKeywords: {},
  favoriteToggles: {},
  orderedProducts: {},
  eventsLog: [],
};

class AnalyticsService {
  private sessionStartTime: number = Date.now();

  constructor() {
    this.initTimeTracker();
  }

  private getData(): AnalyticsDataStore {
    return storageService.getAnalyticsData<AnalyticsDataStore>(INITIAL_ANALYTICS);
  }

  private saveData(data: AnalyticsDataStore): void {
    storageService.setAnalyticsData(data);
  }

  private logEvent(type: AnalyticsEvent['type'], payload: Record<string, any>): void {
    const data = this.getData();
    const newEvent: AnalyticsEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      timestamp: new Date().toISOString(),
    };

    // Keep up to 200 recent events locally to avoid memory bloating
    const updatedLogs = [newEvent, ...(data.eventsLog || [])].slice(0, 200);
    data.eventsLog = updatedLogs;

    this.saveData(data);
  }

  private initTimeTracker(): void {
    if (typeof window === 'undefined') return;

    // Periodically accumulate active time spent (every 10 seconds)
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        const data = this.getData();
        data.totalTimeSpentSeconds = (data.totalTimeSpentSeconds || 0) + 10;
        this.saveData(data);
      }
    }, 10000);
  }

  // 1. Visited Pages
  public trackPageView(pageName: string): void {
    const data = this.getData();
    data.pageViews[pageName] = (data.pageViews[pageName] || 0) + 1;
    this.saveData(data);
    this.logEvent('PAGE_VIEW', { pageName });
  }

  // 2. Viewed Categories
  public trackCategoryView(categoryId: string, categoryNameAr: string): void {
    const data = this.getData();
    data.categoryViews[categoryNameAr] = (data.categoryViews[categoryNameAr] || 0) + 1;
    this.saveData(data);
    this.logEvent('CATEGORY_VIEW', { categoryId, categoryNameAr });
  }

  // 3. Viewed Products
  public trackProductView(productId: string, productNameAr: string): void {
    const data = this.getData();
    data.productViews[productNameAr] = (data.productViews[productNameAr] || 0) + 1;
    this.saveData(data);
    this.logEvent('PRODUCT_VIEW', { productId, productNameAr });
  }

  // 4. Added To Cart
  public trackAddToCart(productId: string, productNameAr: string, price: number, quantity: number = 1): void {
    const data = this.getData();
    data.cartAdditions[productNameAr] = (data.cartAdditions[productNameAr] || 0) + quantity;
    this.saveData(data);
    this.logEvent('ADD_TO_CART', { productId, productNameAr, price, quantity });
  }

  // 5. Removed From Cart
  public trackRemoveFromCart(productId: string, productNameAr: string): void {
    const data = this.getData();
    data.cartRemovals[productNameAr] = (data.cartRemovals[productNameAr] || 0) + 1;
    this.saveData(data);
    this.logEvent('REMOVE_FROM_CART', { productId, productNameAr });
  }

  // 6. Checkout Started
  public trackCheckoutStarted(cartItemCount: number, subtotal: number): void {
    const data = this.getData();
    data.checkoutStartsCount = (data.checkoutStartsCount || 0) + 1;
    this.saveData(data);
    this.logEvent('CHECKOUT_STARTED', { cartItemCount, subtotal });
  }

  // 7. Order Submitted
  public trackOrderSubmitted(orderData: {
    orderNumber: string;
    branchNameAr: string;
    grandTotal: number;
    items: Array<{ productId: string; nameAr: string; quantity: number }>;
  }): void {
    const data = this.getData();
    data.ordersSubmittedCount = (data.ordersSubmittedCount || 0) + 1;

    // Track most ordered products count
    orderData.items.forEach((item) => {
      const existing = data.orderedProducts[item.productId] || { nameAr: item.nameAr, quantity: 0 };
      data.orderedProducts[item.productId] = {
        nameAr: item.nameAr,
        quantity: existing.quantity + item.quantity,
      };
    });

    this.saveData(data);
    this.logEvent('ORDER_SUBMITTED', orderData);
  }

  // 8. Time Spent
  public trackTimeSpent(): number {
    const data = this.getData();
    return data.totalTimeSpentSeconds || 0;
  }

  // 9. Search Keywords
  public trackSearch(keyword: string): void {
    if (!keyword || keyword.trim().length < 2) return;
    const cleanKw = keyword.trim().toLowerCase();
    const data = this.getData();
    data.searchKeywords[cleanKw] = (data.searchKeywords[cleanKw] || 0) + 1;
    this.saveData(data);
    this.logEvent('SEARCH_KEYWORD', { keyword: cleanKw });
  }

  // 10. Favorite Products
  public trackFavoriteToggle(productId: string, productNameAr: string, isFavorited: boolean): void {
    const data = this.getData();
    data.favoriteToggles[productNameAr] = (data.favoriteToggles[productNameAr] || 0) + (isFavorited ? 1 : -1);
    this.saveData(data);
    this.logEvent('FAVORITE_TOGGLE', { productId, productNameAr, isFavorited });
  }

  // 11. Most Ordered Products summary helper
  public getMostOrderedProducts(): ProductOrderCount[] {
    const data = this.getData();
    const ordered = data.orderedProducts || {};
    return Object.entries(ordered)
      .map(([productId, val]) => ({
        productId,
        productNameAr: val.nameAr,
        count: val.quantity,
      }))
      .sort((a, b) => b.count - a.count);
  }

  // Summary getter for debugging / internal metrics UI
  public getMetricsSummary() {
    return this.getData();
  }

  /**
   * Future Backend Synchronization Hook
   * Prepared so analytics can be dispatched to an external API endpoint without changing UI code.
   */
  public async syncWithBackend(apiEndpoint: string = '/api/analytics/batch'): Promise<boolean> {
    try {
      const data = this.getData();
      if (!data.eventsLog || data.eventsLog.length === 0) return true;

      // Simulated backend payload ready for production fetch()
      console.log(`[AnalyticsService] Prepared sync to ${apiEndpoint}:`, data.eventsLog);
      // Future API call:
      // await fetch(apiEndpoint, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
      return true;
    } catch (e) {
      console.error('[AnalyticsService] Sync failed:', e);
      return false;
    }
  }
}

export const analyticsService = new AnalyticsService();

// Re-export pure order analytics engine for modular consumption
export * from './orderAnalyticsEngine';
