import { Coupon, SiteSettings } from '../types';
import {
  calculateOrderPricing,
  validateCoupon,
  PricingCalculationParams,
  PricingCalculationResult,
} from '../utils/pricingEngine';
import { siteSettingsService, DEFAULT_PRESET_COUPONS } from './siteSettingsService';
import { auditLogService } from './auditLogService';

const APPLIED_COUPON_STORAGE_KEY = 'pamborina_applied_coupon_code_v1';
const COUPON_STATE_CHANGE_EVENT = 'pamborina_coupon_state_changed';

/**
 * Normalizes a coupon code for safe storage, comparison, and lookup.
 */
export function normalizeCouponCode(code?: string | null): string {
  if (!code) return '';
  return code
    .toString()
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

class CouponService {
  private appliedCode: string | null = null;
  private listeners: Set<(code: string | null) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(APPLIED_COUPON_STORAGE_KEY);
        this.appliedCode = stored ? normalizeCouponCode(stored) : null;
      } catch {
        this.appliedCode = null;
      }

      window.addEventListener('storage', (e) => {
        if (e.key === APPLIED_COUPON_STORAGE_KEY) {
          this.appliedCode = e.newValue ? normalizeCouponCode(e.newValue) : null;
          this.notifyListeners();
        }
      });
    }
  }

  public getAppliedCouponCode(): string | null {
    return this.appliedCode;
  }

  public setAppliedCouponCode(code: string | null): void {
    const cleanCode = code ? normalizeCouponCode(code) : null;
    this.appliedCode = cleanCode;
    try {
      if (typeof window !== 'undefined') {
        if (cleanCode) {
          localStorage.setItem(APPLIED_COUPON_STORAGE_KEY, cleanCode);
        } else {
          localStorage.removeItem(APPLIED_COUPON_STORAGE_KEY);
        }
        window.dispatchEvent(
          new CustomEvent(COUPON_STATE_CHANGE_EVENT, { detail: cleanCode })
        );
      }
    } catch {
      // ignore local storage restrictions
    }
    this.notifyListeners();
  }

  public clearAppliedCoupon(): void {
    this.setAppliedCouponCode(null);
  }

  public subscribe(callback: (code: string | null) => void): () => void {
    this.listeners.add(callback);
    callback(this.appliedCode);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.appliedCode);
      } catch (err) {
        console.error('Coupon listener error:', err);
      }
    }
  }

  /**
   * Evaluates the currently applied coupon code against given site settings and subtotal.
   */
  public evaluateAppliedCoupon(
    settings: SiteSettings,
    subtotal: number
  ) {
    const availableCoupons = settings.coupons && settings.coupons.length > 0
      ? settings.coupons
      : DEFAULT_PRESET_COUPONS;
    const couponsEnabled = settings.couponsEnabled !== false;
    return validateCoupon(
      this.appliedCode,
      availableCoupons,
      couponsEnabled,
      subtotal
    );
  }

  /**
   * Single source of truth calculation for pricing and order totals.
   */
  public calculateOrderPricing(params: PricingCalculationParams): PricingCalculationResult {
    return calculateOrderPricing(params);
  }

  /**
   * Unified helper to calculate order totals with flexible signature overloads.
   */
  public calculateOrderTotals(
    paramsOrSubtotal: any,
    maybeCode?: any,
    maybeDelivery?: any,
    maybeSettings?: any
  ): PricingCalculationResult {
    // 1. If called with full PricingCalculationParams object:
    if (
      typeof paramsOrSubtotal === 'object' &&
      paramsOrSubtotal !== null &&
      !Array.isArray(paramsOrSubtotal)
    ) {
      return calculateOrderPricing(paramsOrSubtotal);
    }

    // 2. If called with items array:
    if (Array.isArray(paramsOrSubtotal)) {
      const settings = maybeSettings || siteSettingsService.getSettingsSync();
      return calculateOrderPricing({
        items: paramsOrSubtotal,
        appliedCouponCode: maybeCode !== undefined ? maybeCode : this.appliedCode,
        availableCoupons: settings.coupons && settings.coupons.length > 0 ? settings.coupons : DEFAULT_PRESET_COUPONS,
        couponsEnabled: settings.couponsEnabled !== false,
        deliveryFee: typeof maybeDelivery === 'number' ? maybeDelivery : 0,
        minOrderAmount: settings.minOrderAmount || 0,
      });
    }

    // 3. If called with numeric subtotal:
    if (typeof paramsOrSubtotal === 'number') {
      const subtotal = paramsOrSubtotal;
      const code = maybeCode !== undefined ? maybeCode : this.appliedCode;
      const deliveryFee = typeof maybeDelivery === 'number' ? maybeDelivery : 0;
      const settings = maybeSettings || siteSettingsService.getSettingsSync();
      const availableCoupons = settings.coupons && settings.coupons.length > 0 ? settings.coupons : DEFAULT_PRESET_COUPONS;
      const couponsEnabled = settings.couponsEnabled !== false;

      const couponResult = validateCoupon(code, availableCoupons, couponsEnabled, subtotal);
      const effectiveDeliveryFee = couponResult.isFreeShipping ? 0 : Math.max(0, deliveryFee);
      const grandTotal = Math.max(0, subtotal - couponResult.discountAmount + effectiveDeliveryFee);
      const minOrder = settings.minOrderAmount || 0;

      return {
        subtotal,
        discountAmount: couponResult.discountAmount,
        deliveryFee: effectiveDeliveryFee,
        grandTotal,
        appliedCoupon: couponResult.coupon,
        appliedPromoCode: couponResult.coupon ? normalizeCouponCode(couponResult.coupon.code) : null,
        isCouponValid: couponResult.isValid,
        couponValidationMessage: couponResult.message,
        isFreeShipping: couponResult.isFreeShipping,
        isBelowMinOrder: minOrder > 0 && subtotal < minOrder,
        minOrderAmount: minOrder,
      };
    }

    // Fallback default
    return calculateOrderPricing({
      items: [],
      appliedCouponCode: this.appliedCode,
    });
  }

  /**
   * Real-time subscription to active list of coupons from SiteSettings.
   */
  public subscribeToCoupons(
    callback: (coupons: Coupon[]) => void,
    onError?: (err: any) => void
  ): () => void {
    return siteSettingsService.subscribeToSiteSettings(
      (settings) => {
        const coupons = settings.coupons && settings.coupons.length > 0
          ? settings.coupons
          : DEFAULT_PRESET_COUPONS;
        callback(coupons);
      },
      onError
    );
  }

  /**
   * Retrieves coupons synchronously.
   */
  public getCouponsSync(): Coupon[] {
    const settings = siteSettingsService.getSettingsSync();
    return settings.coupons && settings.coupons.length > 0
      ? settings.coupons
      : DEFAULT_PRESET_COUPONS;
  }

  /**
   * Retrieves coupons asynchronously.
   */
  public async getCoupons(): Promise<Coupon[]> {
    const settings = await siteSettingsService.getSiteSettings();
    return settings.coupons && settings.coupons.length > 0
      ? settings.coupons
      : DEFAULT_PRESET_COUPONS;
  }

  /**
   * Creates a new coupon and updates settings in Firestore.
   */
  public async createCoupon(
    couponData: Omit<Coupon, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>
  ): Promise<Coupon> {
    const settings = await siteSettingsService.getSiteSettings();
    const currentCoupons: Coupon[] = settings.coupons ? [...settings.coupons] : [...DEFAULT_PRESET_COUPONS];

    const cleanCode = normalizeCouponCode(couponData.code);
    if (!cleanCode) {
      throw new Error('رمز الكوبون مطلوب.');
    }

    const existingIndex = currentCoupons.findIndex(
      (c) => normalizeCouponCode(c.code) === cleanCode
    );
    if (existingIndex >= 0) {
      throw new Error(`كود الكوبون (${cleanCode}) موجود بالفعل. يرجى اختيار كود آخر.`);
    }

    const newCouponId = `coupon_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newCoupon: Coupon = {
      ...couponData,
      id: newCouponId,
      code: cleanCode,
      usageCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const updatedCoupons = [newCoupon, ...currentCoupons];
    await siteSettingsService.updateSiteSettings({ coupons: updatedCoupons });

    try {
      await auditLogService.logAdminAction({
        action: 'create_coupon',
        targetType: 'coupon',
        targetId: newCouponId,
        summaryAr: `تم إنشاء كوبون الخصم (${cleanCode})`,
        metadata: { code: cleanCode, discountType: couponData.discountType, discountValue: couponData.discountValue },
      });
    } catch {}

    return newCoupon;
  }

  /**
   * Updates an existing coupon by id or code.
   */
  public async updateCoupon(id: string, updates: Partial<Coupon>): Promise<void> {
    const settings = await siteSettingsService.getSiteSettings();
    const currentCoupons: Coupon[] = settings.coupons ? [...settings.coupons] : [...DEFAULT_PRESET_COUPONS];

    const targetIndex = currentCoupons.findIndex(
      (c) => c.id === id || (c.code && normalizeCouponCode(c.code) === normalizeCouponCode(id))
    );

    if (targetIndex === -1) {
      throw new Error('لم يتم العثور على الكوبون المطلوب لتعديله.');
    }

    const existing = currentCoupons[targetIndex];
    const updatedCode = updates.code ? normalizeCouponCode(updates.code) : existing.code;

    // Ensure uniqueness if code is changed
    if (updatedCode !== existing.code) {
      const duplicate = currentCoupons.find(
        (c, idx) => idx !== targetIndex && normalizeCouponCode(c.code) === updatedCode
      );
      if (duplicate) {
        throw new Error(`رمز الكوبون (${updatedCode}) مستخدم بالفعل في كوبون آخر.`);
      }
    }

    const updatedCoupon: Coupon = {
      ...existing,
      ...updates,
      code: updatedCode,
      updatedAt: new Date().toISOString(),
    };

    currentCoupons[targetIndex] = updatedCoupon;
    await siteSettingsService.updateSiteSettings({ coupons: currentCoupons });

    try {
      await auditLogService.logAdminAction({
        action: 'update_coupon',
        targetType: 'coupon',
        targetId: id,
        summaryAr: `تم تعديل كوبون الخصم (${updatedCoupon.code})`,
        metadata: { id, updates },
      });
    } catch {}
  }

  /**
   * Toggles active state of a coupon.
   */
  public async toggleCouponActive(id: string, isActive: boolean): Promise<void> {
    await this.updateCoupon(id, { isActive, enabled: isActive });
  }

  /**
   * Deletes a coupon by ID or code.
   */
  public async deleteCoupon(id: string, code?: string): Promise<void> {
    const settings = await siteSettingsService.getSiteSettings();
    const currentCoupons: Coupon[] = settings.coupons ? [...settings.coupons] : [...DEFAULT_PRESET_COUPONS];

    const filtered = currentCoupons.filter(
      (c) => c.id !== id && (!code || normalizeCouponCode(c.code) !== normalizeCouponCode(code))
    );

    await siteSettingsService.updateSiteSettings({ coupons: filtered });

    // If active coupon matches deleted coupon, clear it
    if (
      this.appliedCode &&
      (this.appliedCode === normalizeCouponCode(id) || (code && this.appliedCode === normalizeCouponCode(code)))
    ) {
      this.clearAppliedCoupon();
    }

    try {
      await auditLogService.logAdminAction({
        action: 'delete_coupon',
        targetType: 'coupon',
        targetId: id,
        summaryAr: `تم حذف كوبون الخصم (${code || id})`,
        metadata: { id, code },
      });
    } catch {}
  }

  /**
   * Increments the usage count of a coupon when an order is placed.
   */
  public async recordCouponUsage(code: string): Promise<void> {
    const cleanCode = normalizeCouponCode(code);
    if (!cleanCode) return;

    try {
      const settings = await siteSettingsService.getSiteSettings();
      const currentCoupons: Coupon[] = settings.coupons ? [...settings.coupons] : [...DEFAULT_PRESET_COUPONS];

      const targetIndex = currentCoupons.findIndex(
        (c) => normalizeCouponCode(c.code) === cleanCode
      );

      if (targetIndex >= 0) {
        const c = currentCoupons[targetIndex];
        currentCoupons[targetIndex] = {
          ...c,
          usageCount: (c.usageCount || 0) + 1,
          updatedAt: new Date().toISOString(),
        };
        await siteSettingsService.updateSiteSettings({ coupons: currentCoupons });
      }
    } catch (err) {
      console.warn('⚠️ [CouponService] Could not record coupon usage:', err);
    }
  }

  public validateCoupon = validateCoupon;
}

export const couponService = new CouponService();
