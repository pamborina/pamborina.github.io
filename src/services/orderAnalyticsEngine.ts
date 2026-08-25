/**
 * Order Analytics Engine (Pure Functions & Calculation Service)
 * 
 * Provides deterministic, read-only analytics calculated directly from Order documents.
 * Adheres strictly to Pamborina's canonical accounting and order state machine rules:
 * - Revenue is recognized exclusively on 'completed' orders.
 * - Active orders ('pending', 'confirmed', 'preparing', 'ready') represent operational pipeline.
 * - 'cancelled' orders are excluded from revenue.
 * - Pure functions have zero external side effects and zero Firestore/API calls.
 */

import { Order, OrderStatus } from '../types';

export type TimeRangePreset = 
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_7_days'
  | 'this_month'
  | 'last_month'
  | 'last_30_days'
  | 'this_year'
  | 'all';

export interface CustomDateRange {
  startDate: string; // ISO string or YYYY-MM-DD
  endDate: string;   // ISO string or YYYY-MM-DD
}

export interface CoreKPIs {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  activeOrders: number;
  grossRevenue: number;
  averageOrderValue: number;
  deliveryOrders: number;
  pickupOrders: number;
  unknownTypeOrders: number;
  deliveryPercentage: number;
  pickupPercentage: number;
}

export interface DailyRevenuePoint {
  date: string; // YYYY-MM-DD
  orders: number; // completed orders on this day
  revenue: number; // completed revenue on this day
}

export interface StatusDistributionItem {
  status: OrderStatus;
  count: number;
  percentage: number;
}

export interface BranchPerformanceMetric {
  branchId: string;
  branchNameAr: string;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  activeOrders: number;
  revenue: number;
  averageOrderValue: number;
  deliveryOrders: number;
  pickupOrders: number;
}

export interface ProductPerformanceMetric {
  productId: string;
  nameAr: string;
  quantitySold: number;
  revenue: number;
  percentageOfRevenue: number;
}

export interface PaymentMethodMetric {
  paymentMethod: string;
  paymentMethodAr: string;
  totalOrders: number;
  completedOrders: number;
  revenue: number;
  percentageOfRevenue: number;
}

export interface OrderTypeMetric {
  orderType: 'delivery' | 'pickup' | 'unknown';
  orderTypeAr: string;
  totalOrders: number;
  completedOrders: number;
  revenue: number;
  percentageOfRevenue: number;
}

export interface OperationalVelocity {
  avgPendingToConfirmedMinutes: number | null;
  avgConfirmedToPreparingMinutes: number | null;
  avgPreparingToReadyMinutes: number | null;
  avgReadyToCompletedMinutes: number | null;
  avgTotalLifecycleMinutes: number | null;
  sampleSize: {
    pendingToConfirmed: number;
    confirmedToPreparing: number;
    preparingToReady: number;
    readyToCompleted: number;
    totalLifecycle: number;
  };
}

export interface DataQualityIssue {
  orderId: string;
  orderNumber?: string;
  issue: string;
}

export interface DataQualityReport {
  totalOrders: number;
  validOrders: number;
  invalidOrders: number;
  issues: DataQualityIssue[];
}

export interface ComprehensiveAnalyticsReport {
  kpis: CoreKPIs;
  dailyRevenue: DailyRevenuePoint[];
  statusDistribution: StatusDistributionItem[];
  branchPerformance: BranchPerformanceMetric[];
  topProducts: ProductPerformanceMetric[];
  paymentPerformance: PaymentMethodMetric[];
  orderTypePerformance: OrderTypeMetric[];
  operationalVelocity: OperationalVelocity;
  dataQuality: DataQualityReport;
}

// -----------------------------------------------------------------------------
// HELPER UTILITIES FOR NUMBERS & DATES
// -----------------------------------------------------------------------------

/**
 * Extracts normalized order total safely, avoiding floating point anomalies and missing values.
 */
export function getOrderTotal(order: Order): number {
  if (!order) return 0;
  const rawTotal = order.pricing?.total ?? order.grandTotal ?? (order as any).total ?? 0;
  const num = Number(rawTotal);
  if (isNaN(num) || !isFinite(num) || num < 0) return 0;
  return Math.round(num * 100) / 100;
}

/**
 * Normalizes an ISO string or Date into Cairo local YYYY-MM-DD string
 * Egypt is UTC+2 (Standard) / UTC+3 (Daylight Saving).
 */
export function toCairoDateString(isoStringOrDate: string | Date): string {
  try {
    const d = typeof isoStringOrDate === 'string' ? new Date(isoStringOrDate) : isoStringOrDate;
    if (isNaN(d.getTime())) return '';
    
    // Format using Egypt timezone explicitly
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d); // Returns YYYY-MM-DD
  } catch {
    const d = typeof isoStringOrDate === 'string' ? new Date(isoStringOrDate) : isoStringOrDate;
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  }
}

/**
 * Evaluates whether an order's createdAt falls within the selected date range.
 */
export function isOrderInDateRange(
  order: Order,
  range: TimeRangePreset | CustomDateRange,
  nowDate: Date = new Date()
): boolean {
  if (!order || !order.createdAt) return false;
  const orderDate = new Date(order.createdAt);
  if (isNaN(orderDate.getTime())) return false;

  const orderCairoDay = toCairoDateString(orderDate);
  const nowCairoDay = toCairoDateString(nowDate);

  if (typeof range === 'string') {
    if (range === 'all') return true;

    if (range === 'today') {
      return orderCairoDay === nowCairoDay;
    }

    if (range === 'yesterday') {
      const yesterday = new Date(nowDate);
      yesterday.setDate(yesterday.getDate() - 1);
      return orderCairoDay === toCairoDateString(yesterday);
    }

    if (range === 'this_week') {
      // In Egypt/Arab world, week typically starts on Saturday (day index 6) or Sunday (0)
      const d = new Date(nowDate);
      const day = d.getDay(); // 0 is Sunday, 6 is Saturday
      const diff = (day + 1) % 7; // days since Saturday
      const startOfWeek = new Date(nowDate);
      startOfWeek.setDate(startOfWeek.getDate() - diff);
      const startDay = toCairoDateString(startOfWeek);
      return orderCairoDay >= startDay && orderCairoDay <= nowCairoDay;
    }

    if (range === 'last_7_days') {
      const sevenDaysAgo = new Date(nowDate);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const startDay = toCairoDateString(sevenDaysAgo);
      return orderCairoDay >= startDay && orderCairoDay <= nowCairoDay;
    }

    if (range === 'this_month') {
      const currentYearMonth = nowCairoDay.substring(0, 7); // YYYY-MM
      return orderCairoDay.startsWith(currentYearMonth);
    }

    if (range === 'last_month') {
      const d = new Date(nowDate);
      d.setDate(1);
      d.setMonth(d.getMonth() - 1);
      const prevYearMonth = toCairoDateString(d).substring(0, 7);
      return orderCairoDay.startsWith(prevYearMonth);
    }

    if (range === 'last_30_days') {
      const thirtyDaysAgo = new Date(nowDate);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
      const startDay = toCairoDateString(thirtyDaysAgo);
      return orderCairoDay >= startDay && orderCairoDay <= nowCairoDay;
    }

    if (range === 'this_year') {
      const currentYear = nowCairoDay.substring(0, 4); // YYYY
      return orderCairoDay.startsWith(currentYear);
    }

    return true;
  }

  // Custom date range
  if (range.startDate && range.endDate) {
    const startDay = toCairoDateString(range.startDate);
    const endDay = toCairoDateString(range.endDate);
    return orderCairoDay >= startDay && orderCairoDay <= endDay;
  }

  return true;
}

/**
 * Filter orders by date range
 */
export function filterOrdersByDateRange(
  orders: Order[],
  range: TimeRangePreset | CustomDateRange,
  nowDate: Date = new Date()
): Order[] {
  if (!Array.isArray(orders)) return [];
  return orders.filter((o) => isOrderInDateRange(o, range, nowDate));
}

// -----------------------------------------------------------------------------
// PURE CALCULATION ENGINES
// -----------------------------------------------------------------------------

/**
 * 1. Calculates Core KPIs (Totals, Active, Revenue, AOV, Delivery/Pickup Splits)
 */
export function calculateOrderKPIs(orders: Order[]): CoreKPIs {
  if (!Array.isArray(orders) || orders.length === 0) {
    return {
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      activeOrders: 0,
      grossRevenue: 0,
      averageOrderValue: 0,
      deliveryOrders: 0,
      pickupOrders: 0,
      unknownTypeOrders: 0,
      deliveryPercentage: 0,
      pickupPercentage: 0,
    };
  }

  let totalOrders = 0;
  let completedOrders = 0;
  let cancelledOrders = 0;
  let activeOrders = 0;
  let grossRevenue = 0;
  let deliveryOrders = 0;
  let pickupOrders = 0;
  let unknownTypeOrders = 0;

  for (const order of orders) {
    if (!order) continue;
    totalOrders++;

    const status = order.status;
    if (status === 'completed') {
      completedOrders++;
      grossRevenue += getOrderTotal(order);
    } else if (status === 'cancelled') {
      cancelledOrders++;
    } else if (['pending', 'confirmed', 'preparing', 'ready'].includes(status)) {
      activeOrders++;
    }

    const type = order.orderType;
    if (type === 'delivery') {
      deliveryOrders++;
    } else if (type === 'pickup') {
      pickupOrders++;
    } else {
      unknownTypeOrders++;
    }
  }

  grossRevenue = Math.round(grossRevenue * 100) / 100;

  const averageOrderValue = completedOrders > 0 
    ? Math.round((grossRevenue / completedOrders) * 100) / 100 
    : 0;

  const deliveryPercentage = totalOrders > 0 
    ? Math.round((deliveryOrders / totalOrders) * 10000) / 100 
    : 0;

  const pickupPercentage = totalOrders > 0 
    ? Math.round((pickupOrders / totalOrders) * 10000) / 100 
    : 0;

  return {
    totalOrders,
    completedOrders,
    cancelledOrders,
    activeOrders,
    grossRevenue,
    averageOrderValue,
    deliveryOrders,
    pickupOrders,
    unknownTypeOrders,
    deliveryPercentage,
    pickupPercentage,
  };
}

/**
 * 2. Calculates Daily Revenue & Completed Order Volume
 */
export function calculateDailyRevenue(orders: Order[]): DailyRevenuePoint[] {
  if (!Array.isArray(orders) || orders.length === 0) return [];

  const dayMap: Record<string, { orders: number; revenue: number }> = {};

  for (const order of orders) {
    if (!order || order.status !== 'completed' || !order.createdAt) continue;
    const day = toCairoDateString(order.createdAt);
    if (!day) continue;

    if (!dayMap[day]) {
      dayMap[day] = { orders: 0, revenue: 0 };
    }

    dayMap[day].orders += 1;
    dayMap[day].revenue += getOrderTotal(order);
  }

  const sortedDays = Object.keys(dayMap).sort();
  return sortedDays.map((day) => ({
    date: day,
    orders: dayMap[day].orders,
    revenue: Math.round(dayMap[day].revenue * 100) / 100,
  }));
}

/**
 * 3. Calculates Order Status Distribution & Percentages
 */
export function calculateStatusDistribution(orders: Order[]): StatusDistributionItem[] {
  const canonicalStatuses: OrderStatus[] = [
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'completed',
    'cancelled',
  ];

  if (!Array.isArray(orders) || orders.length === 0) {
    return canonicalStatuses.map((st) => ({
      status: st,
      count: 0,
      percentage: 0,
    }));
  }

  const counts: Record<string, number> = {};
  canonicalStatuses.forEach((st) => (counts[st] = 0));

  let totalValid = 0;
  for (const order of orders) {
    if (!order || !order.status) continue;
    const st = order.status;
    counts[st] = (counts[st] || 0) + 1;
    totalValid++;
  }

  return canonicalStatuses.map((st) => {
    const count = counts[st] || 0;
    const percentage = totalValid > 0 ? Math.round((count / totalValid) * 10000) / 100 : 0;
    return {
      status: st,
      count,
      percentage,
    };
  });
}

/**
 * 4. Calculates Branch Performance from Immutable Branch Snapshots
 */
export function calculateBranchPerformance(orders: Order[]): BranchPerformanceMetric[] {
  if (!Array.isArray(orders) || orders.length === 0) return [];

  const branchMap: Record<string, {
    branchId: string;
    branchNameAr: string;
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    activeOrders: number;
    revenue: number;
    deliveryOrders: number;
    pickupOrders: number;
  }> = {};

  for (const order of orders) {
    if (!order) continue;
    
    // Extract stable branch ID from immutable branch snapshot
    const branchId = order.branch?.id || order.branchId || 'unassigned_branch';
    const branchNameAr = order.branch?.nameAr || order.branchNameAr || 'فرع غير محدد';

    if (!branchMap[branchId]) {
      branchMap[branchId] = {
        branchId,
        branchNameAr,
        totalOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        activeOrders: 0,
        revenue: 0,
        deliveryOrders: 0,
        pickupOrders: 0,
      };
    }

    const b = branchMap[branchId];
    b.totalOrders += 1;

    if (order.status === 'completed') {
      b.completedOrders += 1;
      b.revenue += getOrderTotal(order);
    } else if (order.status === 'cancelled') {
      b.cancelledOrders += 1;
    } else if (['pending', 'confirmed', 'preparing', 'ready'].includes(order.status)) {
      b.activeOrders += 1;
    }

    if (order.orderType === 'delivery') {
      b.deliveryOrders += 1;
    } else if (order.orderType === 'pickup') {
      b.pickupOrders += 1;
    }
  }

  return Object.values(branchMap)
    .map((b) => {
      const rev = Math.round(b.revenue * 100) / 100;
      const aov = b.completedOrders > 0 ? Math.round((rev / b.completedOrders) * 100) / 100 : 0;
      return {
        branchId: b.branchId,
        branchNameAr: b.branchNameAr,
        totalOrders: b.totalOrders,
        completedOrders: b.completedOrders,
        cancelledOrders: b.cancelledOrders,
        activeOrders: b.activeOrders,
        revenue: rev,
        averageOrderValue: aov,
        deliveryOrders: b.deliveryOrders,
        pickupOrders: b.pickupOrders,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.totalOrders - a.totalOrders);
}

/**
 * 5. Calculates Top Selling Products & Product Revenue (From Item Snapshots on Completed Orders)
 */
export function calculateProductPerformance(orders: Order[]): ProductPerformanceMetric[] {
  if (!Array.isArray(orders) || orders.length === 0) return [];

  const productMap: Record<string, {
    productId: string;
    nameAr: string;
    quantitySold: number;
    revenue: number;
  }> = {};

  let totalCompletedRevenue = 0;

  for (const order of orders) {
    if (!order || order.status !== 'completed' || !Array.isArray(order.items)) continue;

    for (const rawItem of order.items) {
      if (!rawItem) continue;
      const item = rawItem as any;
      const pId = item.productId || item.product?.id || 'custom_item';
      const name = item.nameAr || item.name || item.product?.nameAr || 'صنف';
      const qty = Number(item.quantity) || 1;
      const itemTotal = Number(item.totalPrice) || (Number(item.unitPrice) || Number(item.product?.price) || 0) * qty;

      if (!productMap[pId]) {
        productMap[pId] = {
          productId: pId,
          nameAr: name,
          quantitySold: 0,
          revenue: 0,
        };
      }

      productMap[pId].quantitySold += qty;
      productMap[pId].revenue += itemTotal;
      totalCompletedRevenue += itemTotal;
    }
  }

  totalCompletedRevenue = Math.round(totalCompletedRevenue * 100) / 100;

  return Object.values(productMap)
    .map((p) => {
      const rev = Math.round(p.revenue * 100) / 100;
      const pct = totalCompletedRevenue > 0 ? Math.round((rev / totalCompletedRevenue) * 10000) / 100 : 0;
      return {
        productId: p.productId,
        nameAr: p.nameAr,
        quantitySold: p.quantitySold,
        revenue: rev,
        percentageOfRevenue: pct,
      };
    })
    .sort((a, b) => b.quantitySold - a.quantitySold || b.revenue - a.revenue);
}

/**
 * 6. Calculates Payment Method Distribution & Revenue Contribution
 */
export function calculatePaymentMethodPerformance(orders: Order[]): PaymentMethodMetric[] {
  if (!Array.isArray(orders) || orders.length === 0) return [];

  const payMap: Record<string, {
    paymentMethod: string;
    paymentMethodAr: string;
    totalOrders: number;
    completedOrders: number;
    revenue: number;
  }> = {};

  let totalCompletedRevenue = 0;

  for (const order of orders) {
    if (!order) continue;
    const method = String(order.paymentMethod || 'unknown');
    const methodAr = String(order.paymentMethodAr || (method === 'cash_on_delivery' ? 'كاش عند الاستلام' : method));

    if (!payMap[method]) {
      payMap[method] = {
        paymentMethod: method,
        paymentMethodAr: methodAr,
        totalOrders: 0,
        completedOrders: 0,
        revenue: 0,
      };
    }

    const p = payMap[method];
    p.totalOrders += 1;

    if (order.status === 'completed') {
      p.completedOrders += 1;
      const rev = getOrderTotal(order);
      p.revenue += rev;
      totalCompletedRevenue += rev;
    }
  }

  totalCompletedRevenue = Math.round(totalCompletedRevenue * 100) / 100;

  return Object.values(payMap)
    .map((p) => {
      const rev = Math.round(p.revenue * 100) / 100;
      const pct = totalCompletedRevenue > 0 ? Math.round((rev / totalCompletedRevenue) * 10000) / 100 : 0;
      return {
        paymentMethod: p.paymentMethod,
        paymentMethodAr: p.paymentMethodAr,
        totalOrders: p.totalOrders,
        completedOrders: p.completedOrders,
        revenue: rev,
        percentageOfRevenue: pct,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.totalOrders - a.totalOrders);
}

/**
 * 7. Calculates Order Type Analytics (Delivery vs Pickup)
 */
export function calculateOrderTypePerformance(orders: Order[]): OrderTypeMetric[] {
  if (!Array.isArray(orders) || orders.length === 0) return [];

  const typeMap: Record<string, {
    orderType: 'delivery' | 'pickup' | 'unknown';
    orderTypeAr: string;
    totalOrders: number;
    completedOrders: number;
    revenue: number;
  }> = {
    delivery: { orderType: 'delivery', orderTypeAr: 'توصيل للمنزل 🛵', totalOrders: 0, completedOrders: 0, revenue: 0 },
    pickup: { orderType: 'pickup', orderTypeAr: 'استلام من الفرع 🏪', totalOrders: 0, completedOrders: 0, revenue: 0 },
    unknown: { orderType: 'unknown', orderTypeAr: 'غير محدد ❓', totalOrders: 0, completedOrders: 0, revenue: 0 },
  };

  let totalCompletedRevenue = 0;

  for (const order of orders) {
    if (!order) continue;
    const typeKey = (order.orderType === 'delivery' || order.orderType === 'pickup') 
      ? order.orderType 
      : 'unknown';

    const t = typeMap[typeKey];
    t.totalOrders += 1;

    if (order.status === 'completed') {
      t.completedOrders += 1;
      const rev = getOrderTotal(order);
      t.revenue += rev;
      totalCompletedRevenue += rev;
    }
  }

  totalCompletedRevenue = Math.round(totalCompletedRevenue * 100) / 100;

  return Object.values(typeMap)
    .filter((t) => t.totalOrders > 0)
    .map((t) => {
      const rev = Math.round(t.revenue * 100) / 100;
      const pct = totalCompletedRevenue > 0 ? Math.round((rev / totalCompletedRevenue) * 10000) / 100 : 0;
      return {
        orderType: t.orderType,
        orderTypeAr: t.orderTypeAr,
        totalOrders: t.totalOrders,
        completedOrders: t.completedOrders,
        revenue: rev,
        percentageOfRevenue: pct,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

/**
 * 8. Calculates Operational Velocity & Transition Latencies from statusHistory
 */
export function calculateOperationalVelocity(orders: Order[]): OperationalVelocity {
  if (!Array.isArray(orders) || orders.length === 0) {
    return {
      avgPendingToConfirmedMinutes: null,
      avgConfirmedToPreparingMinutes: null,
      avgPreparingToReadyMinutes: null,
      avgReadyToCompletedMinutes: null,
      avgTotalLifecycleMinutes: null,
      sampleSize: {
        pendingToConfirmed: 0,
        confirmedToPreparing: 0,
        preparingToReady: 0,
        readyToCompleted: 0,
        totalLifecycle: 0,
      },
    };
  }

  let sumPendingToConfirmed = 0;
  let countPendingToConfirmed = 0;

  let sumConfirmedToPreparing = 0;
  let countConfirmedToPreparing = 0;

  let sumPreparingToReady = 0;
  let countPreparingToReady = 0;

  let sumReadyToCompleted = 0;
  let countReadyToCompleted = 0;

  let sumTotalLifecycle = 0;
  let countTotalLifecycle = 0;

  for (const order of orders) {
    if (!order || !Array.isArray(order.statusHistory) || order.statusHistory.length < 2) continue;
    if (order.status === 'cancelled') continue; // Exclude cancelled orders from duration averages

    // Map timestamps by status
    const statusTimes: Partial<Record<OrderStatus, number>> = {};
    for (const h of order.statusHistory) {
      if (h.status && h.timestamp) {
        const time = new Date(h.timestamp).getTime();
        if (!isNaN(time) && !statusTimes[h.status]) {
          statusTimes[h.status] = time;
        }
      }
    }

    // Pending -> Confirmed
    if (statusTimes.pending && statusTimes.confirmed && statusTimes.confirmed >= statusTimes.pending) {
      sumPendingToConfirmed += (statusTimes.confirmed - statusTimes.pending) / (1000 * 60);
      countPendingToConfirmed++;
    }

    // Confirmed -> Preparing
    if (statusTimes.confirmed && statusTimes.preparing && statusTimes.preparing >= statusTimes.confirmed) {
      sumConfirmedToPreparing += (statusTimes.preparing - statusTimes.confirmed) / (1000 * 60);
      countConfirmedToPreparing++;
    }

    // Preparing -> Ready
    if (statusTimes.preparing && statusTimes.ready && statusTimes.ready >= statusTimes.preparing) {
      sumPreparingToReady += (statusTimes.ready - statusTimes.preparing) / (1000 * 60);
      countPreparingToReady++;
    }

    // Ready -> Completed
    if (statusTimes.ready && statusTimes.completed && statusTimes.completed >= statusTimes.ready) {
      sumReadyToCompleted += (statusTimes.completed - statusTimes.ready) / (1000 * 60);
      countReadyToCompleted++;
    }

    // Total Lifecycle: Pending -> Completed
    if (statusTimes.pending && statusTimes.completed && statusTimes.completed >= statusTimes.pending) {
      sumTotalLifecycle += (statusTimes.completed - statusTimes.pending) / (1000 * 60);
      countTotalLifecycle++;
    }
  }

  return {
    avgPendingToConfirmedMinutes: countPendingToConfirmed > 0 ? Math.round((sumPendingToConfirmed / countPendingToConfirmed) * 10) / 10 : null,
    avgConfirmedToPreparingMinutes: countConfirmedToPreparing > 0 ? Math.round((sumConfirmedToPreparing / countConfirmedToPreparing) * 10) / 10 : null,
    avgPreparingToReadyMinutes: countPreparingToReady > 0 ? Math.round((sumPreparingToReady / countPreparingToReady) * 10) / 10 : null,
    avgReadyToCompletedMinutes: countReadyToCompleted > 0 ? Math.round((sumReadyToCompleted / countReadyToCompleted) * 10) / 10 : null,
    avgTotalLifecycleMinutes: countTotalLifecycle > 0 ? Math.round((sumTotalLifecycle / countTotalLifecycle) * 10) / 10 : null,
    sampleSize: {
      pendingToConfirmed: countPendingToConfirmed,
      confirmedToPreparing: countConfirmedToPreparing,
      preparingToReady: countPreparingToReady,
      readyToCompleted: countReadyToCompleted,
      totalLifecycle: countTotalLifecycle,
    },
  };
}

/**
 * 9. Detects Data Quality Issues & Malformed Orders
 */
export function generateDataQualityReport(orders: Order[]): DataQualityReport {
  if (!Array.isArray(orders)) {
    return {
      totalOrders: 0,
      validOrders: 0,
      invalidOrders: 0,
      issues: [{ orderId: 'none', issue: 'Orders dataset is not an array' }],
    };
  }

  const issues: DataQualityIssue[] = [];
  let validOrders = 0;
  let invalidOrders = 0;

  const validStatuses = new Set(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'out_for_delivery', 'ready_for_pickup', 'delivered']);

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    let orderHasIssue = false;

    if (!order) {
      invalidOrders++;
      issues.push({ orderId: `index_${i}`, issue: 'Null or undefined order entry' });
      continue;
    }

    const orderId = order.id || `index_${i}`;
    const orderNumber = order.orderNumber;

    if (!order.id) {
      issues.push({ orderId, orderNumber, issue: 'Missing order ID (id)' });
      orderHasIssue = true;
    }

    if (!order.orderNumber) {
      issues.push({ orderId, orderNumber, issue: 'Missing orderNumber' });
      orderHasIssue = true;
    }

    if (!order.createdAt || isNaN(new Date(order.createdAt).getTime())) {
      issues.push({ orderId, orderNumber, issue: 'Invalid or missing createdAt ISO timestamp' });
      orderHasIssue = true;
    }

    if (!order.status || !validStatuses.has(order.status)) {
      issues.push({ orderId, orderNumber, issue: `Invalid order status: ${order.status}` });
      orderHasIssue = true;
    }

    if (order.orderType !== 'delivery' && order.orderType !== 'pickup') {
      issues.push({ orderId, orderNumber, issue: `Unknown or missing orderType: ${order.orderType}` });
      orderHasIssue = true;
    }

    const total = order.pricing?.total ?? order.grandTotal ?? (order as any).total;
    if (typeof total !== 'number' || isNaN(total) || !isFinite(total) || total < 0) {
      issues.push({ orderId, orderNumber, issue: `Invalid or negative order total: ${total}` });
      orderHasIssue = true;
    }

    if (!order.branch?.id && !order.branchId) {
      issues.push({ orderId, orderNumber, issue: 'Missing branch identification' });
      orderHasIssue = true;
    }

    if (!Array.isArray(order.items) || order.items.length === 0) {
      issues.push({ orderId, orderNumber, issue: 'Order contains no items or items is not an array' });
      orderHasIssue = true;
    }

    if (orderHasIssue) {
      invalidOrders++;
    } else {
      validOrders++;
    }
  }

  return {
    totalOrders: orders.length,
    validOrders,
    invalidOrders,
    issues,
  };
}

/**
 * 10. Aggregated Master Analytics Pipeline
 */
export function generateComprehensiveOrderAnalytics(
  orders: Order[],
  timeRange: TimeRangePreset | CustomDateRange = 'all',
  nowDate: Date = new Date()
): ComprehensiveAnalyticsReport {
  const filteredOrders = filterOrdersByDateRange(orders, timeRange, nowDate);

  return {
    kpis: calculateOrderKPIs(filteredOrders),
    dailyRevenue: calculateDailyRevenue(filteredOrders),
    statusDistribution: calculateStatusDistribution(filteredOrders),
    branchPerformance: calculateBranchPerformance(filteredOrders),
    topProducts: calculateProductPerformance(filteredOrders),
    paymentPerformance: calculatePaymentMethodPerformance(filteredOrders),
    orderTypePerformance: calculateOrderTypePerformance(filteredOrders),
    operationalVelocity: calculateOperationalVelocity(filteredOrders),
    dataQuality: generateDataQualityReport(orders), // Quality report always inspects raw dataset
  };
}
