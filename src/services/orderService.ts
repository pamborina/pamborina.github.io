/**
 * OrderService
 * Handles guest order creation, validation, local tracking,
 * customer activity logging, collision-resistant order numbers,
 * Firestore order creation, and dispatching to WhatsApp.
 */

import { CartItem, Order, Branch, OrderItemSnapshot } from '../types';
import { storageService } from './storageService';
import { whatsAppService, GuestOrderPayload } from './whatsAppService';
import { analyticsService } from './analyticsService';
import { firebaseOrderService } from './firebaseOrderService';
import { orderSequenceService } from './orderSequenceService';
import { siteSettingsService } from './siteSettingsService';
import { getAccurateNow } from '../utils/dateFormatter';

export interface GuestCheckoutDetails {
  customerName: string;
  customerPhone: string;
  orderType: 'delivery' | 'pickup';
  address?: string;
  landmark?: string;
  locationUrl?: string;
  selectedBranch: Branch | null;
  paymentMethodAr?: string;
  notes?: string;
}

export interface OrderValidationResult {
  isValid: boolean;
  errors: {
    customerName?: string;
    customerPhone?: string;
    address?: string;
    landmark?: string;
    selectedBranch?: string;
    items?: string;
    orderType?: string;
  };
}

/**
 * Resets the order sequence back to 0 so the next order starts at #ORDER-01-...
 */
export async function resetOrderSequence(): Promise<void> {
  await orderSequenceService.resetSequencesToZero();
}

/**
 * Synchronous local fallback for order number generation (e.g. preview or offline).
 * Production orders use orderSequenceService.allocateNextOrderNumber().
 */
export function generateOrderNumber(orderType: 'delivery' | 'pickup' = 'delivery'): string {
  let nextSeq = 1;
  const suffix = orderType === 'pickup' ? 'PICKUP' : 'ONLINE';
  const storageKey = orderType === 'pickup' ? 'pamborina_pickup_seq' : 'pamborina_online_seq';

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(storageKey);
      nextSeq = (stored ? parseInt(stored, 10) : 0) + 1;
      localStorage.setItem(storageKey, String(nextSeq));
    }
  } catch {
    nextSeq = 1;
  }

  const paddedSeq = String(nextSeq).padStart(2, '0');
  return `ORDER-${paddedSeq}-${suffix}`;
}

class OrderService {
  /**
   * Validates guest customer input prior to submission
   */
  public validateGuestCheckout(
    details: Partial<GuestCheckoutDetails>,
    cartItems: CartItem[]
  ): OrderValidationResult {
    const errors: OrderValidationResult['errors'] = {};

    if (!cartItems || cartItems.length === 0) {
      errors.items = 'سلة التسوق فارغة، يرجى إضافة منتجات أولاً.';
    } else {
      const unavailableItem = cartItems.find(
        (ci) => ci.product.isAvailable === false || ci.product.available === false
      );
      if (unavailableItem) {
        errors.items = `الصنف (${unavailableItem.product.nameAr}) غير متوفر حالياً. يرجى حذفه من السلة لإتمام الطلب.`;
      }
    }

    if (!details.selectedBranch || !details.selectedBranch.id) {
      errors.selectedBranch = 'يرجى اختيار الفرع (فرع بامبورينا - الطالبية هرم) لإكمال الطلب.';
    }

    if (!details.customerName || details.customerName.trim().length < 2) {
      errors.customerName = 'يرجى إدخال اسمك الكريم (ثنائي على الأقل)';
    }

    const cleanPhone = details.customerPhone
      ? details.customerPhone.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()).trim()
      : '';
    const phoneRegex = /^01[0125][0-9]{8}$/;
    if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
      errors.customerPhone = 'يرجى إدخال رقم هاتف مصري صحيح مكون من 11 رقم (مثال: 01112624108)';
    }

    // Strict enforcement: if orderType is delivery, verify that delivery is currently enabled
    if (details.orderType === 'delivery') {
      const settings = siteSettingsService.getSettingsSync();
      const isGlobalDeliveryAvailable = settings?.isDeliveryAvailable !== false;
      const isBranchDeliveryAvailable = details.selectedBranch?.isDeliveryAvailable !== false;

      if (!isGlobalDeliveryAvailable || !isBranchDeliveryAvailable) {
        errors.orderType =
          details.selectedBranch?.deliveryDisabledReasonAr ||
          settings?.deliveryDisabledReasonAr ||
          'خدمة التوصيل المنزلي معطلة مؤقتاً حالياً من قبل الإدارة. يرجى اختيار الاستلام من الفرع لإكمال طلبك.';
      }
    }

    // Address is strictly required ONLY for delivery orders
    if (details.orderType !== 'pickup') {
      if (!details.address || details.address.trim().length < 5) {
        errors.address = 'يرجى إدخال عنوان التوصيل بالتفصيل (الشارع - المبنى - الشقة)';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Converts active cart items into an immutable purchase-time snapshot
   */
  public createItemSnapshots(cartItems: CartItem[]): OrderItemSnapshot[] {
    return cartItems.map((ci) => ({
      productId: ci.product.id,
      name: ci.product.nameAr,
      nameAr: ci.product.nameAr,
      quantity: ci.quantity,
      unitPrice: ci.selectedVariant?.price ?? ci.unitPrice ?? ci.product.price,
      totalPrice: ci.totalPrice,
      selectedVariant: ci.selectedVariant
        ? {
            id: ci.selectedVariant.id,
            nameAr: ci.selectedVariant.nameAr,
            nameEn: ci.selectedVariant.nameEn,
            price: ci.selectedVariant.price,
          }
        : undefined,
      selectedAddons: ci.selectedAddons && ci.selectedAddons.length > 0
        ? ci.selectedAddons.map((a) => ({
            groupId: a.groupId,
            groupTitleAr: a.groupTitleAr,
            addonId: a.addonId,
            addonNameAr: a.addonNameAr,
            price: a.price,
          }))
        : undefined,
      specialInstructions: ci.specialInstructions || undefined,
    }));
  }

  /**
   * Submits a guest order:
   * 1. Validates checkout input
   * 2. Builds immutable order snapshot (items, pricing, customer, branch)
   * 3. Creates order in Firestore collection 'orders'
   * 4. Saves locally for offline fallback
   * 5. Formats and opens WhatsApp with exact order details
   */
  public async submitGuestOrder(
    details: GuestCheckoutDetails,
    cartItems: CartItem[],
    subtotal: number,
    deliveryFee: number,
    discountAmount: number = 0
  ): Promise<{ success: boolean; order?: Order; whatsappUrl?: string; errorMsgAr?: string }> {
    const validation = this.validateGuestCheckout(details, cartItems);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      return { success: false, errorMsgAr: firstError };
    }

    if (!details.selectedBranch) {
      return { success: false, errorMsgAr: 'يرجى اختيار الفرع أولاً.' };
    }

    const isPickup = details.orderType === 'pickup';
    const isDeliveryFeeManuallySet = isPickup ? true : false;
    const finalDeliveryFee = isPickup ? 0 : 0; // Strictly 0/pending until administration sets it based on distance & kilometers

    // Allocate collision-resistant sequential order number atomically via Firestore Transaction
    let orderNumber: string;
    try {
      const allocation = await orderSequenceService.allocateNextOrderNumber(details.orderType || 'delivery');
      orderNumber = allocation.orderNumber;
    } catch (allocErr: any) {
      if (allocErr.message && allocErr.message.includes('SYSTEM_RESET_IN_PROGRESS')) {
        return {
          success: false,
          errorMsgAr: 'نظام الطلبات قيد التحديث الشامل حالياً من قبل الإدارة. يرجى الانتظار دقيقة وإعادة إرسال طلبك.',
        };
      }
      // Fallback
      orderNumber = generateOrderNumber(details.orderType || 'delivery');
    }

    const orderId = `ord_${getAccurateNow().getTime()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = getAccurateNow().toISOString();
    const grandTotal = Math.max(0, subtotal - discountAmount);

    const itemSnapshots = this.createItemSnapshots(cartItems);

    // Build unified immutable domain order record
    const orderRecord: Order = {
      id: orderId,
      orderNumber,
      createdAt: nowIso,
      updatedAt: nowIso,
      statusUpdatedAt: nowIso,
      createdTime: nowIso,
      status: 'pending',
      version: 1,
      statusHistory: [
        {
          previousStatus: null,
          newStatus: 'pending',
          status: 'pending',
          timestamp: nowIso,
          changedAt: nowIso,
          changedBy: 'customer',
          noteAr: isPickup
            ? 'تم إنشاء طلب استلام من الفرع'
            : 'تم إنشاء طلب توصيل - بانتظار تحديد سعر التوصيل بناءً على المسافة وعدد الكيلومترات من الإدارة',
        },
      ],

      customer: {
        name: details.customerName.trim(),
        phone: details.customerPhone.trim(),
        address: isPickup ? `استلام من الفرع (${details.selectedBranch.nameAr})` : (details.address?.trim() || ''),
        landmark: details.landmark?.trim() || '',
        locationUrl: details.locationUrl?.trim() || '',
      },
      customerId: 'guest',
      customerName: details.customerName.trim(),
      customerPhone: details.customerPhone.trim(),

      branch: {
        id: details.selectedBranch.id,
        name: details.selectedBranch.nameAr,
        nameAr: details.selectedBranch.nameAr,
        phone: details.selectedBranch.phone,
        whatsapp: details.selectedBranch.whatsapp,
        addressAr: details.selectedBranch.addressAr,
      },
      branchId: details.selectedBranch.id,
      branchNameAr: details.selectedBranch.nameAr,

      items: itemSnapshots,
      orderType: details.orderType,

      pricing: {
        subtotal,
        deliveryFee: isPickup ? 0 : null,
        discountAmount,
        total: grandTotal,
      },
      subtotal,
      deliveryFee: isPickup ? 0 : 0,
      deliveryFeeManuallySet: isDeliveryFeeManuallySet,
      discountAmount,
      taxAmount: 0,
      grandTotal,

      paymentMethod: details.paymentMethodAr?.includes('فودافون') ? 'vodafone_cash' : 'cash_on_delivery',
      paymentMethodAr: details.paymentMethodAr || 'الدفع عند الاستلام',
      paymentStatus: 'unpaid',

      deliveryAddress: {
        id: `addr_${Date.now()}`,
        labelAr: isPickup ? 'استلام من الفرع' : 'عنوان التوصيل',
        cityAr: details.selectedBranch.cityAr || 'الطالبية هرم',
        areaAr: details.selectedBranch.areaAr || '',
        streetAr: isPickup ? details.selectedBranch.addressAr : (details.address || ''),
        landmark: details.landmark || '',
      },
      notes: details.notes?.trim() || '',

      estimatedDeliveryTime: isPickup
        ? 'جاهز خلال 15 - 20 دقيقة'
        : `${details.selectedBranch.deliveryEstimateMinutes || 25} دقيقة`,
    };

    // 1. Create order in Firestore
    try {
      await firebaseOrderService.createOrder(orderRecord);
    } catch (firebaseErr: any) {
      console.warn('⚠️ [OrderService] Firestore write failed or running offline:', firebaseErr?.message);
      // We still proceed so customer order is not blocked
    }

    // 2. Save locally for customer offline reference
    storageService.saveGuestOrder(orderRecord);

    // 3. Log activity timeline & add in-app notification
    storageService.logActivity('إرسال طلب جديد', `رقم الطلب ${orderNumber} - الإجمالي ${grandTotal} جنيه`);
    storageService.addNotification({
      type: 'order_sent',
      titleAr: 'تم تسجيل الطلب 🛵',
      messageAr: `تم إعداد طلبك ${orderNumber} وجاري فتح الواتساب للتأكيد.`,
    });

    // 4. Track analytics
    analyticsService.trackOrderSubmitted({
      orderNumber,
      grandTotal,
      branchNameAr: details.selectedBranch.nameAr,
      items: cartItems.map((ci) => ({
        productId: ci.product.id,
        nameAr: ci.product.nameAr,
        quantity: ci.quantity,
      })),
    });

    // 5. Generate WhatsApp message payload from saved Order
    const payload: GuestOrderPayload = {
      orderNumber,
      customerName: orderRecord.customer.name,
      customerPhone: orderRecord.customer.phone,
      orderType: orderRecord.orderType as 'delivery' | 'pickup',
      address: orderRecord.customer.address || '',
      landmark: orderRecord.customer.landmark,
      locationUrl: orderRecord.customer.locationUrl,
      branchNameAr: orderRecord.branch.nameAr,
      branchPhone: orderRecord.branch.phone || '',
      branchWhatsApp: orderRecord.branch.whatsapp || orderRecord.branch.phone || '',
      items: itemSnapshots.map((item) => ({
        nameAr: item.nameAr,
        variantNameAr: item.selectedVariant?.nameAr,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        addons: item.selectedAddons ? item.selectedAddons.map((a) => a.addonNameAr) : undefined,
        notes: item.specialInstructions,
      })),
      notes: orderRecord.notes,
      paymentMethodAr: orderRecord.paymentMethodAr,
      subtotal,
      deliveryFee: finalDeliveryFee,
      discountAmount,
      grandTotal,
      createdAt: nowIso,
    };

    const whatsappUrl = whatsAppService.generateOrderWhatsAppUrl(payload);

    return {
      success: true,
      order: orderRecord,
      whatsappUrl,
    };
  }
}

export const orderService = new OrderService();
