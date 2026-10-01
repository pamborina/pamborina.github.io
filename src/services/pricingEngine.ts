/**
 * Unified Pricing Engine for Pamborina Store
 * Single Source of Truth for calculating Subtotal, Coupon Validation, Discount Amount,
 * Subtotal After Discount, Delivery Fee, and Final Total across Cart, Checkout,
 * Order Creation, Server Revalidation, Order Tracking, and Invoices.
 */

import { CartItem, Coupon, OrderItemSnapshot } from '../types';

export interface OrderCouponSnapshot {
  id?: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number; // e.g. 10 for 10% or 50 for 50 EGP
  discountAmount: number;
  description?: string;
}

export interface CalculatePricingInput {
  items: Array<CartItem | OrderItemSnapshot>;
  couponCode?: string | null;
  appliedCoupon?: Coupon | OrderCouponSnapshot | null;
  activeCoupons?: Coupon[];
  couponsEnabled?: boolean;
  orderType?: 'delivery' | 'pickup' | 'dinein';
  deliveryFee?: number | null;
  isDeliveryFeeManuallySet?: boolean;
}

export interface CalculatePricingResult {
  subtotal: number;
  coupon: OrderCouponSnapshot | null;
  couponCode: string | null;
  discountAmount: number;
  subtotalAfterDiscount: number;
  deliveryFee: number;
  isDeliveryFeePending: boolean;
  finalTotal: number;
  isValidCoupon: boolean;
  couponErrorAr?: string;
}

/**
 * Calculates subtotal from cart or order item snapshots.
 */
export function calculateItemsSubtotal(items: Array<CartItem | OrderItemSnapshot>): number {
  if (!Array.isArray(items) || items.length === 0) return 0;

  return items.reduce((sum, item) => {
    let price = 0;
    if ('totalPrice' in item && typeof item.totalPrice === 'number' && item.totalPrice > 0) {
      price = item.totalPrice;
    } else if ('unitPrice' in item && typeof item.unitPrice === 'number') {
      price = item.unitPrice * (item.quantity || 1);
    } else if ('product' in item && item.product && typeof item.product.price === 'number') {
      price = item.product.price * (item.quantity || 1);
    } else if ('price' in item && typeof (item as any).price === 'number') {
      price = (item as any).price * (item.quantity || 1);
    }
    return sum + Math.max(0, price);
  }, 0);
}

/**
 * Validates a coupon and computes exact discount amount based on subtotal.
 */
export function validateAndCalculateCouponDiscount(
  subtotal: number,
  couponToTest: Coupon | OrderCouponSnapshot | null | undefined,
  couponsEnabled: boolean = true
): { couponSnapshot: OrderCouponSnapshot | null; discountAmount: number; isValid: boolean; errorAr?: string } {
  if (couponsEnabled === false || !couponToTest || subtotal <= 0) {
    return { couponSnapshot: null, discountAmount: 0, isValid: false, errorAr: 'خدمة الكوبونات معطلة أو لا ينطبق خصم' };
  }

  // Handle existing OrderCouponSnapshot
  if ('type' in couponToTest && 'value' in couponToTest && 'discountAmount' in couponToTest && typeof couponToTest.discountAmount === 'number') {
    const code = (couponToTest.code || '').trim().toUpperCase();
    const type: 'percentage' | 'fixed' = couponToTest.type === 'fixed' ? 'fixed' : 'percentage';
    const val = couponToTest.value || 0;

    let discount = 0;
    if (type === 'percentage') {
      discount = Math.round((subtotal * val) / 100);
    } else {
      discount = Math.min(subtotal, val);
    }

    return {
      couponSnapshot: {
        id: couponToTest.id,
        code,
        type,
        value: val,
        discountAmount: Math.max(0, discount),
        description: couponToTest.description,
      },
      discountAmount: Math.max(0, discount),
      isValid: true,
    };
  }

  // Handle master Coupon interface
  const masterCoupon = couponToTest as Coupon;
  const cleanCode = (masterCoupon.code || '').trim().toUpperCase();

  if (masterCoupon.enabled === false) {
    return { couponSnapshot: null, discountAmount: 0, isValid: false, errorAr: 'هذا الكوبون غير متاح أو متوقف حالياً' };
  }

  if (masterCoupon.minOrderAmount && subtotal < masterCoupon.minOrderAmount) {
    return {
      couponSnapshot: null,
      discountAmount: 0,
      isValid: false,
      errorAr: `الحد الأدنى لاستخدام هذا الكوبون هو ${masterCoupon.minOrderAmount} ج.م`,
    };
  }

  let type: 'percentage' | 'fixed' = 'percentage';
  let val = 0;

  if (masterCoupon.discountType === 'fixed' || (masterCoupon.discountValue && !masterCoupon.discountPercent)) {
    type = 'fixed';
    val = masterCoupon.discountValue || 0;
  } else {
    type = 'percentage';
    val = masterCoupon.discountPercent || masterCoupon.discountValue || 0;
  }

  let calculatedDiscount = 0;
  if (type === 'percentage') {
    calculatedDiscount = Math.round((subtotal * val) / 100);
  } else {
    calculatedDiscount = Math.min(subtotal, val);
  }

  if (masterCoupon.maxDiscountAmount && calculatedDiscount > masterCoupon.maxDiscountAmount) {
    calculatedDiscount = masterCoupon.maxDiscountAmount;
  }

  calculatedDiscount = Math.max(0, Math.min(subtotal, calculatedDiscount));

  return {
    couponSnapshot: {
      id: masterCoupon.id || cleanCode,
      code: cleanCode,
      type,
      value: val,
      discountAmount: calculatedDiscount,
      description: masterCoupon.description,
    },
    discountAmount: calculatedDiscount,
    isValid: true,
  };
}

/**
 * Unified calculation function for all order pricing.
 */
export function calculateOrderPricing(input: CalculatePricingInput): CalculatePricingResult {
  const {
    items,
    couponCode,
    appliedCoupon,
    activeCoupons = [],
    couponsEnabled = true,
    orderType = 'delivery',
    deliveryFee,
    isDeliveryFeeManuallySet = false,
  } = input;

  const subtotal = calculateItemsSubtotal(items);

  let targetCoupon: Coupon | OrderCouponSnapshot | null = null;
  let couponErrorAr: string | undefined;

  if (couponsEnabled !== false && subtotal > 0) {
    if (appliedCoupon) {
      targetCoupon = appliedCoupon;
    } else if (couponCode && couponCode.trim()) {
      const cleanCode = couponCode.trim().toUpperCase();
      const matched = activeCoupons.find((c) => c.code.toUpperCase() === cleanCode);
      if (matched) {
        targetCoupon = matched;
      } else {
        couponErrorAr = 'رمز الكوبون غير صحيح أو غير متاح';
      }
    }
  }

  const couponEvaluation = validateAndCalculateCouponDiscount(subtotal, targetCoupon, couponsEnabled);

  const discountAmount = couponEvaluation.isValid ? couponEvaluation.discountAmount : 0;
  const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);

  const isPickup = orderType === 'pickup';
  const isDeliveryFeePending = isPickup ? false : !isDeliveryFeeManuallySet;
  const finalDeliveryFee = isPickup ? 0 : (isDeliveryFeeManuallySet ? Math.max(0, Number(deliveryFee) || 0) : 0);

  const finalTotal = Number((subtotalAfterDiscount + finalDeliveryFee).toFixed(2));

  return {
    subtotal,
    coupon: couponEvaluation.couponSnapshot,
    couponCode: couponEvaluation.couponSnapshot ? couponEvaluation.couponSnapshot.code : null,
    discountAmount,
    subtotalAfterDiscount,
    deliveryFee: finalDeliveryFee,
    isDeliveryFeePending,
    finalTotal,
    isValidCoupon: couponEvaluation.isValid,
    couponErrorAr: couponErrorAr || couponEvaluation.errorAr,
  };
}
