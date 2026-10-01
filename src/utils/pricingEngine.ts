import { CartItem, Coupon } from '../types';

export interface PricingItem {
  productId?: string;
  unitPrice: number;
  quantity: number;
  totalPrice?: number;
}

export interface PricingCalculationParams {
  items: (CartItem | PricingItem)[];
  appliedCouponCode?: string | null;
  availableCoupons?: Coupon[];
  couponsEnabled?: boolean;
  orderType?: 'delivery' | 'pickup' | string;
  deliveryFee?: number;
  minOrderAmount?: number;
}

export interface PricingCalculationResult {
  subtotal: number;
  discountAmount: number;
  subtotalAfterDiscount: number;
  deliveryFee: number;
  grandTotal: number;
  finalTotal: number;
  appliedCoupon: Coupon | null;
  appliedPromoCode: string | null;
  isCouponValid: boolean;
  couponValidationMessage: string | null;
  isFreeShipping: boolean;
  isBelowMinOrder: boolean;
  minOrderAmount: number;
}

/**
 * Validates a coupon code against system settings and calculates the exact discount.
 */
export function validateCoupon(
  code: string | null | undefined,
  availableCoupons: Coupon[] = [],
  couponsEnabled: boolean = true,
  subtotal: number = 0
): {
  isValid: boolean;
  coupon: Coupon | null;
  discountAmount: number;
  isFreeShipping: boolean;
  message: string | null;
} {
  const cleanCode = (code || '').trim().toUpperCase();

  if (!cleanCode) {
    return {
      isValid: false,
      coupon: null,
      discountAmount: 0,
      isFreeShipping: false,
      message: null,
    };
  }

  if (couponsEnabled === false) {
    return {
      isValid: false,
      coupon: null,
      discountAmount: 0,
      isFreeShipping: false,
      message: 'كوبونات الخصم غير متاحة حالياً.',
    };
  }

  const found = availableCoupons.find(
    (c) => (c.code || '').trim().toUpperCase() === cleanCode
  );

  if (!found) {
    return {
      isValid: false,
      coupon: null,
      discountAmount: 0,
      isFreeShipping: false,
      message: 'هذا الكوبون غير صالح.',
    };
  }

  if (found.enabled === false) {
    return {
      isValid: false,
      coupon: null,
      discountAmount: 0,
      isFreeShipping: false,
      message: 'هذا الكوبون غير متاح حالياً.',
    };
  }

  if (found.minSpend && subtotal < found.minSpend) {
    return {
      isValid: false,
      coupon: null,
      discountAmount: 0,
      isFreeShipping: false,
      message: `الحد الأدنى لتطبيق هذا الكوبون هو ${found.minSpend} ج.م`,
    };
  }

  let discountAmount = 0;
  let isFreeShipping = false;

  if (found.freeShipping || found.type === 'free_shipping') {
    isFreeShipping = true;
    discountAmount = 0;
  } else if (found.discountPercent !== undefined || found.type === 'percentage') {
    const percent = found.discountPercent ?? found.value ?? 0;
    discountAmount = Math.max(0, Math.round((subtotal * percent) / 100));
  } else if (found.discountAmount !== undefined || found.type === 'fixed') {
    const fixedAmount = found.discountAmount ?? found.value ?? 0;
    discountAmount = Math.max(0, Math.min(subtotal, Math.round(fixedAmount)));
  }

  // Safety cap discount at subtotal
  discountAmount = Math.min(subtotal, Math.max(0, discountAmount));

  return {
    isValid: true,
    coupon: found,
    discountAmount,
    isFreeShipping,
    message: null,
  };
}

/**
 * Unified Pricing Engine - The Single Source of Truth for all price, discount,
 * shipping, and total calculations across Cart, Checkout, and Backend.
 */
export function calculateOrderPricing({
  items,
  appliedCouponCode,
  availableCoupons = [],
  couponsEnabled = true,
  orderType = 'delivery',
  deliveryFee = 0,
  minOrderAmount = 0,
}: PricingCalculationParams): PricingCalculationResult {
  // 1. Calculate raw Subtotal
  const subtotal = (items || []).reduce((sum, item) => {
    const itemTotal =
      typeof item.totalPrice === 'number'
        ? item.totalPrice
        : (item.unitPrice || 0) * (item.quantity || 1);
    return sum + itemTotal;
  }, 0);

  // 2. Validate Coupon and Calculate Discount
  const couponResult = validateCoupon(
    appliedCouponCode,
    availableCoupons,
    couponsEnabled,
    subtotal
  );

  // 3. Calculate Delivery Fee
  const isPickup = orderType === 'pickup';
  let effectiveDeliveryFee = isPickup ? 0 : Math.max(0, deliveryFee || 0);

  if (couponResult.isFreeShipping) {
    effectiveDeliveryFee = 0;
  }

  // 4. Calculate Final Total
  const subtotalAfterDiscount = Math.max(0, subtotal - couponResult.discountAmount);
  const grandTotal = Math.max(0, subtotalAfterDiscount + effectiveDeliveryFee);

  // 5. Min Order Check
  const isBelowMinOrder = minOrderAmount > 0 && subtotal < minOrderAmount;

  return {
    subtotal,
    discountAmount: couponResult.discountAmount,
    subtotalAfterDiscount,
    deliveryFee: effectiveDeliveryFee,
    grandTotal,
    finalTotal: grandTotal,
    appliedCoupon: couponResult.coupon,
    appliedPromoCode: couponResult.coupon ? couponResult.coupon.code.toUpperCase() : null,
    isCouponValid: couponResult.isValid,
    couponValidationMessage: couponResult.message,
    isFreeShipping: couponResult.isFreeShipping,
    isBelowMinOrder,
    minOrderAmount,
  };
}
