/**
 * WhatsAppService
 * Formats professional Arabic WhatsApp order messages and dispatches to
 * WhatsApp using dynamic numbers from Firestore (Branch WhatsApp or Site Main WhatsApp).
 */

import { STORE_CONFIG } from '../config/storeConfig';
import { phoneUtils } from '../utils/phoneUtils';
import { siteSettingsService } from './siteSettingsService';

export interface GuestOrderItemPayload {
  nameAr: string;
  variantNameAr?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  addons?: string[];
  notes?: string;
}

export interface GuestOrderPayload {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  orderType: 'delivery' | 'pickup';
  orderTypeAr?: string;
  address: string;
  landmark?: string;
  locationUrl?: string;
  branchNameAr: string;
  branchPhone: string;
  branchWhatsApp?: string;
  items: GuestOrderItemPayload[];
  notes?: string;
  paymentMethodAr?: string;
  subtotal: number;
  deliveryFee: number;
  discountAmount?: number;
  grandTotal: number;
  createdAt: string;
}

class WhatsAppService {
  /**
   * Converts numbers to Arabic digits if needed, or keeps clean format
   */
  private toArabicDigits(str: string | number): string {
    return String(str).replace(/[0-9]/g, (w) => '٠١٢٣٤٥٦٧٨٩'[parseInt(w)]);
  }

  /**
   * Cleans raw phone numbers into international WhatsApp standard
   */
  public cleanPhoneForWhatsApp(phone: string): string {
    const liveSettings = siteSettingsService.getSettingsSync();
    const dynamicFallback = liveSettings.customerServiceWhatsApp || liveSettings.whatsapp || liveSettings.phone || '';
    return phoneUtils.cleanForWhatsApp(phone, dynamicFallback);
  }

  /**
   * Formats a clean, structured Arabic WhatsApp order message matching exact specification
   */
  public formatOrderMessage(payload: GuestOrderPayload): string {
    const formattedTime = new Date(payload.createdAt).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const formattedDate = new Date(payload.createdAt).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const orderTypeLabel = payload.orderType === 'pickup' 
      ? '🏪 استلام من الفرع (تيك أواي)'
      : '🛵 توصيل للمنزل (دليفري)';

    // Products list formatted with Eastern Arabic numbering (١-، ٢-، ...)
    const itemsText = payload.items
      .map((item, index) => {
        const arabicNum = this.toArabicDigits(index + 1);
        const variantSuffix = item.variantNameAr ? ` (${item.variantNameAr})` : '';

        let block = `${arabicNum}- ${item.nameAr}${variantSuffix} ×${item.quantity}`;

        if (item.addons && item.addons.length > 0) {
          block += `\nإضافات:\n${item.addons.map((a) => `• ${a}`).join('\n')}`;
        }

        if (item.notes && item.notes.trim()) {
          block += `\nملاحظات:\n${item.notes.trim()}`;
        }

        block += `\nالسعر:\n${item.totalPrice} جنيه`;

        return block;
      })
      .join('\n\n------------------\n\n');

    let addressSection = '';
    if (payload.orderType === 'pickup') {
      addressSection = `مكان الاستلام:\nاستلام مباشر من ${payload.branchNameAr}`;
    } else {
      const fullAddress = payload.landmark && payload.landmark.trim()
        ? `${payload.address.trim()} (أقرب علامة: ${payload.landmark.trim()})`
        : payload.address.trim();

      const locationSection = payload.locationUrl && payload.locationUrl.trim()
        ? `\nالموقع على الخريطة:\n${payload.locationUrl.trim()}`
        : '';

      addressSection = `العنوان:\n${fullAddress}${locationSection}`;
    }

    const deliveryFeeLabel = payload.orderType === 'pickup'
      ? 'استلام من الفرع (مجاناً)'
      : 'يتم تحديده بواسطة الفرع عبر الواتساب (حسب المسافة والمنطقة)';

    const totalLabel = payload.orderType === 'pickup'
      ? `${payload.grandTotal} جنيه`
      : `${payload.grandTotal} جنيه (+ رسوم التوصيل يحددها الفرع عبر الواتساب)`;

    const message = `طلب جديد

رقم الطلب:
${payload.orderNumber}

نوع الطلب:
${orderTypeLabel}

الفرع:
${payload.branchNameAr}

الوقت:
${formattedDate} ${formattedTime}

الاسم:
${payload.customerName.trim()}

الهاتف:
${payload.customerPhone.trim()}

${addressSection}

المنتجات

${itemsText}

------------------

طريقة الدفع:
${payload.paymentMethodAr || 'الدفع عند الاستلام'}

رسوم التوصيل:
${deliveryFeeLabel}

إجمالي الأصناف:
${totalLabel}`;

    return message;
  }

  /**
   * Generates direct wa.me link for the order using dynamic branch or site WhatsApp
   */
  public generateWhatsAppUrl(targetPhone: string, message: string): string {
    const cleanNumber = this.cleanPhoneForWhatsApp(targetPhone);
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
  }

  /**
   * Resolves the target WhatsApp number dynamically based on branch and global site settings
   */
  public resolveTargetWhatsApp(payload: GuestOrderPayload): string {
    if (payload.branchWhatsApp && payload.branchWhatsApp.trim()) {
      return payload.branchWhatsApp.trim();
    }
    if (payload.branchPhone && payload.branchPhone.trim()) {
      return payload.branchPhone.trim();
    }
    const currentSettings = siteSettingsService.getSettingsSync();
    if (currentSettings.customerServiceWhatsApp && currentSettings.customerServiceWhatsApp.trim()) {
      return currentSettings.customerServiceWhatsApp.trim();
    }
    if (currentSettings.whatsapp && currentSettings.whatsapp.trim()) {
      return currentSettings.whatsapp.trim();
    }
    if (currentSettings.phone && currentSettings.phone.trim()) {
      return currentSettings.phone.trim();
    }
    return '';
  }

  /**
   * Opens WhatsApp link directly in new tab / mobile app
   */
  public sendOrderViaWhatsApp(payload: GuestOrderPayload): string {
    const message = this.formatOrderMessage(payload);
    const targetPhone = this.resolveTargetWhatsApp(payload);
    const whatsappUrl = this.generateWhatsAppUrl(targetPhone, message);

    if (typeof window !== 'undefined') {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }

    return whatsappUrl;
  }
}

export const whatsAppService = new WhatsAppService();
