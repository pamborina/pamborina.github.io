/**
 * Test Suite for Order Analytics Engine (Pure Functions)
 * Covers all 25 test cases requested in Phase 7.1.
 */

import {
  calculateOrderKPIs,
  calculateDailyRevenue,
  calculateStatusDistribution,
  calculateBranchPerformance,
  calculateProductPerformance,
  calculatePaymentMethodPerformance,
  calculateOrderTypePerformance,
  calculateOperationalVelocity,
  generateDataQualityReport,
  generateComprehensiveOrderAnalytics,
  filterOrdersByDateRange,
} from './orderAnalyticsEngine';
import { Order } from '../types';

export function runAnalyticsTests() {
  console.log('====================================================');
  console.log('ORDER ANALYTICS ENGINE TEST SUITE (25 CASES)');
  console.log('====================================================');

  let passedCount = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] Test ${totalTests}: ${testName}`);
      passedCount++;
    } else {
      console.error(`[FAIL] Test ${totalTests}: ${testName}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // 1. Empty dataset
  const emptyKpis = calculateOrderKPIs([]);
  assert(
    emptyKpis.totalOrders === 0 &&
    emptyKpis.grossRevenue === 0 &&
    emptyKpis.averageOrderValue === 0 &&
    emptyKpis.deliveryPercentage === 0 &&
    emptyKpis.pickupPercentage === 0,
    'Empty dataset returns zeroed metrics and no NaN/Infinity'
  );

  // Helper builder for test orders
  const createTestOrder = (overrides: Partial<Order>): Order => ({
    id: `test_${Math.random()}`,
    orderNumber: 'PB-20260814-TEST',
    createdAt: '2026-08-14T12:00:00.000Z',
    updatedAt: '2026-08-14T12:00:00.000Z',
    status: 'completed',
    customer: { name: 'عميل تجريبي', phone: '01000000000' },
    branch: { id: 'branch_1', nameAr: 'فرع السيدة زينب' },
    orderType: 'delivery',
    pricing: { subtotal: 100, deliveryFee: 20, discountAmount: 0, total: 120 },
    subtotal: 100,
    deliveryFee: 20,
    discountAmount: 0,
    grandTotal: 120,
    paymentMethod: 'cash_on_delivery',
    items: [
      {
        productId: 'prod_1',
        name: 'شاورما فراخ',
        nameAr: 'شاورما فراخ',
        quantity: 2,
        unitPrice: 50,
        totalPrice: 100,
      },
    ],
    ...overrides,
  });

  // 2. One completed order
  const order1 = createTestOrder({ pricing: { subtotal: 80, deliveryFee: 20, discountAmount: 0, total: 100 } });
  const kpiSingle = calculateOrderKPIs([order1]);
  assert(
    kpiSingle.totalOrders === 1 &&
    kpiSingle.completedOrders === 1 &&
    kpiSingle.grossRevenue === 100 &&
    kpiSingle.averageOrderValue === 100 &&
    kpiSingle.deliveryOrders === 1,
    'One completed order calculates 100 EGP gross revenue and 100 AOV'
  );

  // 3. Multiple completed orders
  const order2 = createTestOrder({ pricing: { subtotal: 160, deliveryFee: 40, discountAmount: 0, total: 200 } });
  const kpiMulti = calculateOrderKPIs([order1, order2]);
  assert(
    kpiMulti.totalOrders === 2 &&
    kpiMulti.completedOrders === 2 &&
    kpiMulti.grossRevenue === 300 &&
    kpiMulti.averageOrderValue === 150,
    'Multiple completed orders aggregate total revenue and calculate correct AOV (300 / 2 = 150)'
  );

  // 4. Cancelled order excluded from revenue
  const orderCancelled = createTestOrder({
    status: 'cancelled',
    pricing: { subtotal: 500, deliveryFee: 50, discountAmount: 0, total: 550 },
  });
  const kpiWithCancel = calculateOrderKPIs([order1, orderCancelled]);
  assert(
    kpiWithCancel.totalOrders === 2 &&
    kpiWithCancel.cancelledOrders === 1 &&
    kpiWithCancel.completedOrders === 1 &&
    kpiWithCancel.grossRevenue === 100,
    'Cancelled orders are counted in total & cancelled count but strictly excluded from gross revenue'
  );

  // 5. Active orders counted operationally
  const orderPending = createTestOrder({ status: 'pending', pricing: { subtotal: 100, deliveryFee: 0, discountAmount: 0, total: 100 } });
  const orderPreparing = createTestOrder({ status: 'preparing', pricing: { subtotal: 200, deliveryFee: 0, discountAmount: 0, total: 200 } });
  const kpiActive = calculateOrderKPIs([orderPending, orderPreparing, order1]);
  assert(
    kpiActive.totalOrders === 3 &&
    kpiActive.activeOrders === 2 &&
    kpiActive.completedOrders === 1 &&
    kpiActive.grossRevenue === 100,
    'Active orders (pending, preparing) are counted operationally without polluting realized revenue'
  );

  // 6. Delivery vs Pickup
  const orderPickup = createTestOrder({ orderType: 'pickup' });
  const kpiTypes = calculateOrderKPIs([order1, orderPickup]);
  assert(
    kpiTypes.deliveryOrders === 1 &&
    kpiTypes.pickupOrders === 1 &&
    kpiTypes.deliveryPercentage === 50 &&
    kpiTypes.pickupPercentage === 50,
    'Delivery and pickup percentages evaluate cleanly to 50% / 50%'
  );

  // 7. Multiple branches
  const orderBranch2 = createTestOrder({
    branch: { id: 'branch_2', nameAr: 'فرع التجمع' },
    pricing: { subtotal: 200, deliveryFee: 30, discountAmount: 0, total: 230 },
  });
  const branchMetrics = calculateBranchPerformance([order1, orderBranch2]);
  assert(
    branchMetrics.length === 2 &&
    branchMetrics.find((b) => b.branchId === 'branch_1')?.revenue === 100 &&
    branchMetrics.find((b) => b.branchId === 'branch_2')?.revenue === 230,
    'Multiple branches grouped strictly by branch.id and aggregate distinct revenue'
  );

  // 8. Multiple products
  const multiProductOrder = createTestOrder({
    items: [
      { productId: 'prod_1', nameAr: 'شاورما فراخ', name: 'شاورما فراخ', quantity: 2, unitPrice: 50, totalPrice: 100 },
      { productId: 'prod_2', nameAr: 'برجر كلاسيك', name: 'برجر كلاسيك', quantity: 1, unitPrice: 80, totalPrice: 80 },
    ],
  });
  const productMetrics = calculateProductPerformance([multiProductOrder]);
  assert(
    productMetrics.length === 2 &&
    productMetrics.find((p) => p.productId === 'prod_1')?.quantitySold === 2 &&
    productMetrics.find((p) => p.productId === 'prod_2')?.quantitySold === 1,
    'Multiple products aggregated accurately by quantity and item revenue'
  );

  // 9. Same product across multiple orders
  const orderProductDup = createTestOrder({
    items: [{ productId: 'prod_1', nameAr: 'شاورما فراخ', name: 'شاورما فراخ', quantity: 3, unitPrice: 50, totalPrice: 150 }],
  });
  const productAgg = calculateProductPerformance([multiProductOrder, orderProductDup]);
  const p1Agg = productAgg.find((p) => p.productId === 'prod_1');
  assert(
    p1Agg?.quantitySold === 5 && p1Agg?.revenue === 250,
    'Same product across multiple orders aggregates correctly (2 + 3 = 5 qty, 100 + 150 = 250 EGP)'
  );

  // 10. Product with addons
  const orderWithAddons = createTestOrder({
    items: [
      {
        productId: 'prod_50',
        nameAr: 'مكس بامبورينا برجر',
        name: 'مكس بامبورينا برجر',
        quantity: 1,
        unitPrice: 120,
        totalPrice: 145,
        selectedAddons: [{ groupId: 'g1', groupTitleAr: 'إضافات', addonId: 'a1', addonNameAr: 'جبنة شيدر', price: 25 }],
      },
    ],
  });
  const addonProductPerf = calculateProductPerformance([orderWithAddons]);
  assert(
    addonProductPerf[0].revenue === 145,
    'Product item snapshot totalPrice including addons (145 EGP) is correctly recognized'
  );

  // 11. Product whose current catalog entry no longer exists
  const historicalDeletedProductOrder = createTestOrder({
    items: [
      {
        productId: 'prod_archived_999',
        nameAr: 'وجبة تاريخية محذوفة',
        name: 'وجبة تاريخية محذوفة',
        quantity: 4,
        unitPrice: 70,
        totalPrice: 280,
      },
    ],
  });
  const archivedPerf = calculateProductPerformance([historicalDeletedProductOrder]);
  assert(
    archivedPerf.length === 1 && archivedPerf[0].productId === 'prod_archived_999' && archivedPerf[0].quantitySold === 4,
    'Archived/deleted catalog items persist in historical analytics seamlessly'
  );

  // 12. Zero completed orders
  const zeroCompletedKpis = calculateOrderKPIs([orderPending, orderCancelled]);
  assert(
    zeroCompletedKpis.completedOrders === 0 &&
    zeroCompletedKpis.grossRevenue === 0 &&
    zeroCompletedKpis.averageOrderValue === 0,
    'Zero completed orders results in 0 AOV without division by zero errors'
  );

  // 13. Invalid/malformed order in data quality
  const malformedOrder: any = {
    id: '',
    orderNumber: '',
    status: 'unknown_status',
    orderType: 'invalid_type',
    pricing: { total: -50 },
  };
  const qualityReport = generateDataQualityReport([order1, malformedOrder]);
  assert(
    qualityReport.totalOrders === 2 &&
    qualityReport.validOrders === 1 &&
    qualityReport.invalidOrders === 1 &&
    qualityReport.issues.length >= 4,
    'Data quality engine detects missing IDs, invalid status, invalid orderType, and negative total'
  );

  // 14. Missing statusHistory transition
  const partialHistoryOrder = createTestOrder({
    status: 'completed',
    statusHistory: [
      { status: 'pending', timestamp: '2026-08-14T10:00:00.000Z' },
      { status: 'completed', timestamp: '2026-08-14T10:30:00.000Z' },
    ],
  });
  const velocity = calculateOperationalVelocity([partialHistoryOrder]);
  assert(
    velocity.avgPendingToConfirmedMinutes === null &&
    velocity.avgTotalLifecycleMinutes === 30 &&
    velocity.sampleSize.totalLifecycle === 1,
    'Missing intermediate transition leaves metric null rather than 0, while total lifecycle is 30 mins'
  );

  // 15. Date range boundaries (Egypt Cairo Time)
  const todayOrder = createTestOrder({ createdAt: '2026-08-14T08:00:00.000Z' });
  const yesterdayOrder = createTestOrder({ createdAt: '2026-08-13T08:00:00.000Z' });
  const fixedNow = new Date('2026-08-14T12:00:00.000Z');
  const todayFiltered = filterOrdersByDateRange([todayOrder, yesterdayOrder], 'today', fixedNow);
  const yesterdayFiltered = filterOrdersByDateRange([todayOrder, yesterdayOrder], 'yesterday', fixedNow);
  assert(
    todayFiltered.length === 1 &&
    todayFiltered[0].createdAt === todayOrder.createdAt &&
    yesterdayFiltered.length === 1 &&
    yesterdayFiltered[0].createdAt === yesterdayOrder.createdAt,
    'Date range filtering strictly segments today vs yesterday according to Cairo business day'
  );

  // 16. AOV calculation
  const orderAOV1 = createTestOrder({ pricing: { subtotal: 100, deliveryFee: 0, discountAmount: 0, total: 100 } });
  const orderAOV2 = createTestOrder({ pricing: { subtotal: 300, deliveryFee: 0, discountAmount: 0, total: 300 } });
  const kpiAOV = calculateOrderKPIs([orderAOV1, orderAOV2]);
  assert(kpiAOV.averageOrderValue === 200, 'AOV is calculated accurately as (100 + 300) / 2 = 200');

  // 17. Revenue aggregation
  const daily = calculateDailyRevenue([todayOrder, order1]);
  assert(
    daily.length === 1 && daily[0].revenue === (getOrderTotal(todayOrder) + getOrderTotal(order1)),
    'Daily revenue aggregates orders on the same day into single point'
  );

  // 18. Product quantity aggregation
  const productQuantityCheck = calculateProductPerformance([order1, order1]);
  assert(
    productQuantityCheck[0].quantitySold === 4,
    'Product quantities accumulate across matching item snapshots (2 + 2 = 4)'
  );

  // 19. Product revenue aggregation and percentage
  const p1 = createTestOrder({
    items: [{ productId: 'p1', nameAr: 'وجبة 1', name: 'وجبة 1', quantity: 1, unitPrice: 75, totalPrice: 75 }],
  });
  const p2 = createTestOrder({
    items: [{ productId: 'p2', nameAr: 'وجبة 2', name: 'وجبة 2', quantity: 1, unitPrice: 25, totalPrice: 25 }],
  });
  const pPerf = calculateProductPerformance([p1, p2]);
  const p1Metric = pPerf.find((p) => p.productId === 'p1');
  const p2Metric = pPerf.find((p) => p.productId === 'p2');
  assert(
    p1Metric?.percentageOfRevenue === 75 && p2Metric?.percentageOfRevenue === 25,
    'Product revenue percentages compute accurately (75% and 25%)'
  );

  // 20. Status percentages
  const dist = calculateStatusDistribution([order1, orderCancelled, orderPending, orderPreparing]);
  const completedDist = dist.find((d) => d.status === 'completed');
  const cancelledDist = dist.find((d) => d.status === 'cancelled');
  assert(
    completedDist?.percentage === 25 && cancelledDist?.percentage === 25,
    'Status distribution percentages compute safely across all canonical statuses'
  );

  // 21. Branch AOV
  const branchOrders = [
    createTestOrder({ branch: { id: 'b1', nameAr: 'فرع 1' }, pricing: { subtotal: 100, deliveryFee: 0, discountAmount: 0, total: 100 } }),
    createTestOrder({ branch: { id: 'b1', nameAr: 'فرع 1' }, pricing: { subtotal: 300, deliveryFee: 0, discountAmount: 0, total: 300 } }),
  ];
  const bPerf = calculateBranchPerformance(branchOrders);
  assert(bPerf[0].averageOrderValue === 200, 'Branch AOV evaluates correctly to (100 + 300) / 2 = 200 EGP');

  // 22. Payment method aggregation
  const vodafoneOrder = createTestOrder({
    paymentMethod: 'vodafone_cash',
    paymentMethodAr: 'تحويل فودافون كاش',
    pricing: { subtotal: 150, deliveryFee: 0, discountAmount: 0, total: 150 },
  });
  const payPerf = calculatePaymentMethodPerformance([order1, vodafoneOrder]);
  assert(
    payPerf.length === 2 &&
    payPerf.find((p) => p.paymentMethod === 'vodafone_cash')?.revenue === 150 &&
    payPerf.find((p) => p.paymentMethod === 'cash_on_delivery')?.revenue === 100,
    'Payment methods (cash vs vodafone) aggregate revenue separately'
  );

  // 23. Unknown orderType handling
  const weirdOrderType = createTestOrder({ orderType: 'drive_thru' as any });
  const weirdTypePerf = calculateOrderTypePerformance([weirdOrderType, order1]);
  assert(
    weirdTypePerf.some((t) => t.orderType === 'unknown'),
    'Unrecognized orderType is categorized safely as unknown without crashing'
  );

  // 24. Unknown payment method handling
  const customPayOrder = createTestOrder({ paymentMethod: 'crypto_wallet' as any, paymentMethodAr: 'محفظة عملات' });
  const customPayPerf = calculatePaymentMethodPerformance([customPayOrder]);
  assert(
    customPayPerf[0].paymentMethod === 'crypto_wallet' && customPayPerf[0].paymentMethodAr === 'محفظة عملات',
    'Custom or unknown payment methods are preserved with localized labels'
  );

  // 25. Duplicate order numbers do not distort aggregation
  const dupOrderNumber1 = createTestOrder({ id: 'ord_1', orderNumber: 'PB-DUP-01', pricing: { subtotal: 50, deliveryFee: 0, discountAmount: 0, total: 50 } });
  const dupOrderNumber2 = createTestOrder({ id: 'ord_2', orderNumber: 'PB-DUP-01', pricing: { subtotal: 50, deliveryFee: 0, discountAmount: 0, total: 50 } });
  const dupKpis = calculateOrderKPIs([dupOrderNumber1, dupOrderNumber2]);
  assert(
    dupKpis.totalOrders === 2 && dupKpis.grossRevenue === 100,
    'Orders with identical human order numbers but distinct IDs aggregate correctly'
  );

  console.log('====================================================');
  console.log(`ALL ${passedCount} / ${totalTests} TEST CASES PASSED SUCCESSFULLY!`);
  console.log('====================================================');
}

function getOrderTotal(order: Order): number {
  return order.pricing?.total ?? order.grandTotal ?? 0;
}

runAnalyticsTests();
