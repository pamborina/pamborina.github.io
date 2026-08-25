import { OrderStatus } from '../types';

export interface OrderStatusConfig {
  status: OrderStatus;
  labelAr: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  descriptionAr: string;
}

export const ORDER_STATUS_CONFIGS: Record<OrderStatus, OrderStatusConfig> = {
  pending: {
    status: 'pending',
    labelAr: 'قيد الانتظار',
    badgeBg: 'bg-amber-950/70',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-500/40',
    descriptionAr: 'تم استلام الطلب وبانتظار التأكيد',
  },
  confirmed: {
    status: 'confirmed',
    labelAr: 'مؤكد',
    badgeBg: 'bg-blue-950/70',
    badgeText: 'text-blue-300',
    badgeBorder: 'border-blue-500/40',
    descriptionAr: 'تم تأكيد الطلب من قبل الفرع',
  },
  preparing: {
    status: 'preparing',
    labelAr: 'جاري التحضير',
    badgeBg: 'bg-purple-950/70',
    badgeText: 'text-purple-300',
    badgeBorder: 'border-purple-500/40',
    descriptionAr: 'جاري تجهيز الأصناف في المطبخ',
  },
  ready: {
    status: 'ready',
    labelAr: 'جاهز',
    badgeBg: 'bg-teal-950/70',
    badgeText: 'text-teal-300',
    badgeBorder: 'border-teal-500/40',
    descriptionAr: 'جاهز للاستلام أو التوصيل',
  },
  completed: {
    status: 'completed',
    labelAr: 'مكتمل',
    badgeBg: 'bg-emerald-950/70',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/40',
    descriptionAr: 'تم تسليم الطلب بنجاح',
  },
  cancelled: {
    status: 'cancelled',
    labelAr: 'ملغي',
    badgeBg: 'bg-rose-950/70',
    badgeText: 'text-rose-300',
    badgeBorder: 'border-rose-500/40',
    descriptionAr: 'تم إلغاء الطلب',
  },
  // Legacy mappings
  out_for_delivery: {
    status: 'out_for_delivery',
    labelAr: 'خرج للتوصيل',
    badgeBg: 'bg-indigo-950/70',
    badgeText: 'text-indigo-300',
    badgeBorder: 'border-indigo-500/40',
    descriptionAr: 'المندوب في الطريق إلى العميل',
  },
  ready_for_pickup: {
    status: 'ready_for_pickup',
    labelAr: 'جاهز للاستلام',
    badgeBg: 'bg-teal-950/70',
    badgeText: 'text-teal-300',
    badgeBorder: 'border-teal-500/40',
    descriptionAr: 'جاهز للاستلام من الفرع',
  },
  delivered: {
    status: 'delivered',
    labelAr: 'تم التسليم',
    badgeBg: 'bg-emerald-950/70',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/40',
    descriptionAr: 'تم التسليم للعميل',
  },
};

/**
 * Strict Order Lifecycle Transition Matrix:
 * pending -> confirmed, cancelled
 * confirmed -> preparing, cancelled
 * preparing -> ready, cancelled
 * ready -> completed
 * completed -> [] (terminal)
 * cancelled -> [] (terminal)
 */
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  // Legacy fallback
  out_for_delivery: ['completed', 'cancelled'],
  ready_for_pickup: ['completed', 'cancelled'],
  delivered: [],
};

/**
 * Returns customized Arabic button label for a specific state transition
 */
export function getStatusActionLabel(currentStatus: OrderStatus, nextStatus: OrderStatus): string {
  if (nextStatus === 'cancelled') {
    return 'إلغاء الطلب';
  }
  if (currentStatus === 'pending' && nextStatus === 'confirmed') {
    return 'تأكيد الطلب';
  }
  if (currentStatus === 'confirmed' && nextStatus === 'preparing') {
    return 'بدء التحضير';
  }
  if (currentStatus === 'preparing' && nextStatus === 'ready') {
    return 'جاهز';
  }
  if (currentStatus === 'ready' && nextStatus === 'completed') {
    return 'تم التسليم / مكتمل';
  }
  return `تحويل إلى ${getOrderStatusLabel(nextStatus)}`;
}

/**
 * Returns localized WhatsApp / SMS notification text for customer updates
 */
export function getStatusNotificationMessage(orderNumber: string, status: OrderStatus): string {
  switch (status) {
    case 'confirmed':
      return `تم تأكيد طلبك رقم #${orderNumber} بنجاح، وسيبدأ تجهيزه قريباً 🥐✨`;
    case 'preparing':
      return `شيف بامبورينا يقوم بتحضير طلبك #${orderNumber} الآن بأعلى معايير الجودة 👨‍🍳🔥`;
    case 'ready':
      return `طلبك رقم #${orderNumber} جاهز الآن للاستلام / مع مندوب التوصيل 🛵📦`;
    case 'completed':
      return `تم تسليم طلبك رقم #${orderNumber} بنجاح. شكراً لاختيارك بامبورينا وبالهناء والشفاء! 💖`;
    case 'cancelled':
      return `نأسف، تم إلغاء طلبك رقم #${orderNumber}. يمكنك التواصل مع خدمة العملاء لأي استفسار.`;
    default:
      return `تم تحديث حالة طلبك #${orderNumber} إلى ${getOrderStatusLabel(status)}.`;
  }
}

/**
 * Validates if transitioning from currentStatus to nextStatus is permissible.
 * Returns true ONLY when the transition is explicitly permitted in the transition matrix.
 * Self-transitions (from === to) return false.
 * Terminal states (completed, cancelled) always return false.
 */
export function canTransitionOrderStatus(currentStatus: OrderStatus, nextStatus: OrderStatus): boolean {
  if (!currentStatus || !nextStatus) return false;
  if (currentStatus === nextStatus) return false; // self transitions not permitted

  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed || !Array.isArray(allowed)) return false;

  return allowed.includes(nextStatus);
}

/**
 * Alias for canTransitionOrderStatus for backward compatibility
 */
export const canTransition = canTransitionOrderStatus;

/**
 * Returns the list of next permitted statuses for the given order status.
 * Terminal states return an empty array [].
 */
export function getAllowedTransitions(currentStatus: OrderStatus): OrderStatus[] {
  if (!currentStatus || !VALID_TRANSITIONS[currentStatus]) return [];
  return [...VALID_TRANSITIONS[currentStatus]];
}

/**
 * Returns localized Arabic label for the order status
 */
export function getOrderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_CONFIGS[status]?.labelAr || status;
}

/**
 * Returns badge styling classes for order status
 */
export function getOrderStatusStyle(status: OrderStatus): { bg: string; text: string; border: string } {
  const cfg = ORDER_STATUS_CONFIGS[status] || ORDER_STATUS_CONFIGS.pending;
  return {
    bg: cfg.badgeBg,
    text: cfg.badgeText,
    border: cfg.badgeBorder,
  };
}
