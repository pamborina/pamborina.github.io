import React, { useState, useEffect, useMemo } from 'react';
import { Product, Category, Branch, Order, OrderStatus } from '../../../types';
import { firebaseOrderService } from '../../../services/firebaseOrderService';
import { storageService } from '../../../services/storageService';
import {
  generateComprehensiveOrderAnalytics,
  toCairoDateString,
  getOrderTotal,
} from '../../../services/orderAnalyticsEngine';
import {
  getOrderStatusLabel,
  getOrderStatusStyle,
  getAllowedTransitions,
  canTransition,
} from '../../../lib/orderStatus';
import { formatPrice } from '../../../lib/utils';
import { useToast } from '../../ui/Toast';
import {
  Utensils,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Store,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Plus,
  ShoppingBag,
  DollarSign,
  Truck,
  Phone,
  Search,
  Eye,
  X,
  User,
  MapPin,
  Calendar,
  AlertTriangle,
  AlertCircle,
  Loader2,
  MessageSquare,
  FileText,
  BarChart3,
  Printer,
  FileDown,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { exportAndPrintSingleInvoice } from '../../../services/pdfReportGenerator';

interface AdminOverviewTabProps {
  products: Product[];
  categories: Category[];
  branches: Branch[];
  onNavigateTab: (
    tab: string,
    availabilityFilter?: 'all' | 'available' | 'unavailable' | 'featured'
  ) => void;
  onOpenAddProduct: () => void;
  onRefreshData: () => void;
  isRefreshing?: boolean;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  products,
  categories,
  branches,
  onNavigateTab,
  onOpenAddProduct,
  onRefreshData,
  isRefreshing = false,
}) => {
  const { showToast } = useToast();

  // Orders Real-time State
  const [orders, setOrders] = useState<Order[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  // Filter & Search for recent orders
  const [recentSearchQuery, setRecentSearchQuery] = useState('');
  const [recentStatusFilter, setRecentStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  // Subscribe to real-time orders from Firestore
  useEffect(() => {
    let isMounted = true;
    setIsOrdersLoading(true);
    setOrdersError(null);

    const unsubscribe = firebaseOrderService.subscribeToOrders(
      (realtimeOrders) => {
        if (!isMounted) return;
        setOrders(realtimeOrders || []);
        setIsOrdersLoading(false);
      },
      (error) => {
        if (!isMounted) return;
        console.log('[AdminOverviewTab] Realtime subscription notice (using active polling fallback):', error?.message || error);
        setIsOrdersLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Compute Pure Real-Time Analytics from Real Orders Data
  const analytics = useMemo(() => {
    return generateComprehensiveOrderAnalytics(orders, 'all');
  }, [orders]);

  const { kpis, dailyRevenue, topProducts, branchPerformance } = analytics;

  // Active Pipeline Orders (pending, confirmed, preparing, ready)
  const activeOrders = useMemo(() => {
    return orders.filter((o) =>
      ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
    );
  }, [orders]);

  // Today's Cairo Orders Calculation
  const todayCairoDay = useMemo(() => toCairoDateString(new Date()), []);
  const todayOrders = useMemo(() => {
    return orders.filter(
      (o) => o.createdAt && toCairoDateString(o.createdAt) === todayCairoDay
    );
  }, [orders, todayCairoDay]);

  const todayRevenue = useMemo(() => {
    return todayOrders
      .filter((o) => o.status === 'completed')
      .reduce((sum, o) => sum + getOrderTotal(o), 0);
  }, [todayOrders]);

  // Menu Stock stats
  const totalProducts = products.length;
  const availableProducts = products.filter(
    (p) => (p.isAvailable !== undefined ? p.isAvailable : p.available)
  ).length;
  const unavailableProducts = totalProducts - availableProducts;

  // Handle Order Status State Machine Transition
  const [cancelConfirm, setCancelConfirm] = useState<{ order: Order; newStatus: OrderStatus } | null>(null);

  const handleUpdateStatus = async (order: Order, newStatus: OrderStatus, forceSkipConfirm = false) => {
    if (isUpdatingStatus) return; // Prevent concurrent requests

    if (newStatus === 'cancelled' && !forceSkipConfirm) {
      setCancelConfirm({ order, newStatus });
      return;
    }

    if (!canTransition(order.status, newStatus)) {
      showToast(
        'تحويل غير مسموح',
        `لا يمكن تحويل الطلب من حالة "${getOrderStatusLabel(order.status)}" إلى "${getOrderStatusLabel(newStatus)}"`,
        'error'
      );
      return;
    }

    setIsUpdatingStatus(order.id);
    try {
      await firebaseOrderService.updateOrderStatus(order.id, newStatus, {
        noteAr: `تحديث الحالة عبر لوحة المتابعة السريعة إلى ${getOrderStatusLabel(newStatus)}`,
      });

      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, status: newStatus } : null
        );
      }

      showToast(
        'تم تحديث حالة الطلب بنجاح ✓',
        `تم تغيير الحالة إلى "${getOrderStatusLabel(newStatus)}" بنجاح`,
        'success'
      );
    } catch (err: any) {
      console.error('❌ [AdminOverviewTab] Status update error:', err);
      let errorMsg = 'حدث خطأ أثناء تحديث حالة الطلب.';
      if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
        errorMsg = 'ليس لديك صلاحية لتحديث حالة هذا الطلب.';
      } else if (err?.message) {
        errorMsg = err.message;
      }
      showToast('فشل التحديث', errorMsg, 'error');
    } finally {
      setIsUpdatingStatus(null);
      setCancelConfirm(null);
    }
  };

  // Filter Recent Orders
  const filteredRecentOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        recentStatusFilter === 'all' ? true : order.status === recentStatusFilter;

      const query = recentSearchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        order.orderNumber?.toLowerCase().includes(query) ||
        (order.customer?.name || order.customerName || '')
          .toLowerCase()
          .includes(query) ||
        (order.customer?.phone || order.customerPhone || '').includes(query) ||
        (order.branch?.nameAr || order.branchNameAr || '')
          .toLowerCase()
          .includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [orders, recentStatusFilter, recentSearchQuery]);

  return (
    <div className="space-y-8 pb-12" dir="rtl">
      {/* 1. Top Executive Banner */}
      <div className="bg-gradient-to-l from-amber-500/10 via-neutral-900 to-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>نظام الإدارة الحية السحابي</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            لوحة الإدارة والمتابعة التنفيذية
          </h2>
          <p className="mt-1 text-sm text-neutral-400 max-w-xl leading-relaxed">
            بيانات تشغيلية ومالية فورية، متابعة خط تجهيز الوجبات، ومراقبة المخزون الفعلي بدون أي بيانات وهمية.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Button
            onClick={onOpenAddProduct}
            className="flex-1 sm:flex-initial bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة صنف جديد</span>
          </Button>

          <Button
            variant="outline"
            onClick={onRefreshData}
            disabled={isRefreshing || isOrdersLoading}
            className="flex-1 sm:flex-initial border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                isRefreshing || isOrdersLoading ? 'animate-spin text-amber-400' : ''
              }`}
            />
            <span>تحديث شامل</span>
          </Button>
        </div>
      </div>

      {/* 2. Core Real-Time KPI Cards Grid (8 Critical Operational Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Gross Revenue (Completed Only) */}
        <div className="bg-neutral-800/80 border border-neutral-700/60 rounded-2xl p-5 hover:border-neutral-600 transition-all shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-400">
              إجمالي الإيرادات المحققة (المكتملة)
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          {isOrdersLoading ? (
            <div className="h-9 w-28 bg-neutral-700 animate-pulse rounded-lg" />
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-emerald-400 tracking-tight">
                {kpis.grossRevenue.toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-xs font-bold text-emerald-400/80">ج.م</span>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-neutral-700/50 flex items-center justify-between text-xs">
            <span className="text-neutral-400">من {kpis.completedOrders} طلب مكتمل</span>
            <button
              onClick={() => onNavigateTab('analytics')}
              className="text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              <span>التقارير</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* KPI 2: Active Kitchen Pipeline */}
        <div className="bg-neutral-800/80 border border-neutral-700/60 rounded-2xl p-5 hover:border-neutral-600 transition-all shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-400">
              الطلبات النشطة (بالمطبخ والتحضير)
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          {isOrdersLoading ? (
            <div className="h-9 w-20 bg-neutral-700 animate-pulse rounded-lg" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-blue-400">
                {kpis.activeOrders}
              </span>
              <span className="text-xs text-neutral-400">طلب قيد التنفيذ</span>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-neutral-700/50 flex items-center justify-between text-xs">
            <span className="text-neutral-400">تتطلب متابعة وتأكيد</span>
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-blue-400 hover:underline flex items-center gap-0.5"
            >
              <span>إدارة الطلبات</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* KPI 3: Total Orders & Today's Volume */}
        <div className="bg-neutral-800/80 border border-neutral-700/60 rounded-2xl p-5 hover:border-neutral-600 transition-all shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-400">
              إجمالي الطلبات المسجلة
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          {isOrdersLoading ? (
            <div className="h-9 w-20 bg-neutral-700 animate-pulse rounded-lg" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{kpis.totalOrders}</span>
              <span className="text-xs text-neutral-400">
                (اليوم: {todayOrders.length} طلب)
              </span>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-neutral-700/50 flex items-center justify-between text-xs text-neutral-400">
            <span>مبيعات اليوم:</span>
            <span className="font-mono text-amber-400 font-bold">
              {todayRevenue.toLocaleString()} ج.م
            </span>
          </div>
        </div>

        {/* KPI 4: Average Order Value (AOV) */}
        <div className="bg-neutral-800/80 border border-neutral-700/60 rounded-2xl p-5 hover:border-neutral-600 transition-all shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-400">
              متوسط قيمة الطلب (AOV)
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          {isOrdersLoading ? (
            <div className="h-9 w-24 bg-neutral-700 animate-pulse rounded-lg" />
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-white">
                {kpis.averageOrderValue.toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-xs font-bold text-neutral-400">ج.م</span>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-neutral-700/50 flex items-center justify-between text-xs text-neutral-400">
            <span>معدل الإنفاق للطلب</span>
            <span className="font-mono text-purple-400 font-bold">
              {kpis.totalOrders > 0
                ? Math.round((kpis.completedOrders / kpis.totalOrders) * 100)
                : 0}
              % إنجاز
            </span>
          </div>
        </div>
      </div>

      {/* 3. Live Orders Pipeline (Active Queue) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
            <h3 className="text-lg font-bold text-white">
              خط التشغيل المباشر للطلبات النشطة (Live Kitchen Pipeline)
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono font-bold">
              {activeOrders.length} طلب نشط
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('orders')}
            className="text-xs text-amber-400 hover:underline flex items-center gap-1"
          >
            <span>فتح شاشة الطلبات الكاملة</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {isOrdersLoading ? (
          <div className="h-32 flex items-center justify-center">
            <div className="h-20 w-full bg-neutral-800/60 animate-pulse rounded-xl" />
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="py-8 px-4 text-center border border-dashed border-neutral-800 rounded-xl bg-neutral-900/50">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mx-auto mb-2" />
            <p className="text-sm font-bold text-neutral-300">
              لا توجد طلبات نشطة حالياً في خط التحضير
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              يتم إدراج الطلبات الجديدة هنا فور استلامها من العملاء لتحديث حالتها بسرعة.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeOrders.map((order) => {
              const style = getOrderStatusStyle(order.status);
              const allowedNext = getAllowedTransitions(order.status);
              const orderTotal = getOrderTotal(order);

              return (
                <div
                  key={order.id}
                  className="bg-neutral-800/80 border border-neutral-700/80 rounded-xl p-4.5 space-y-3.5 hover:border-neutral-600 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Order Number + Status Badge */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400 text-sm">
                          #{order.orderNumber || order.id.slice(0, 6)}
                        </span>
                        <span
                          className={`text-[11px] px-2.5 py-0.5 rounded-full border font-bold ${style.bg} ${style.text} ${style.border}`}
                        >
                          {getOrderStatusLabel(order.status)}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-neutral-400">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleTimeString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>

                    {/* Customer & Branch Details */}
                    <div className="text-xs space-y-1 text-neutral-300">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">
                          {order.customer?.name || order.customerName || 'عميل'}
                        </span>
                        <span className="text-neutral-400 font-mono" dir="ltr">
                          {order.customer?.phone || order.customerPhone || ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <span className="flex items-center gap-1">
                          {order.orderType === 'delivery' ? (
                            <Truck className="w-3 h-3 text-amber-400 inline" />
                          ) : (
                            <Store className="w-3 h-3 text-emerald-400 inline" />
                          )}
                          <span>
                            {order.orderType === 'delivery'
                              ? 'توصيل للمنزل'
                              : 'استلام من الفرع'}
                          </span>
                        </span>
                        <span className="text-neutral-400">
                          {order.branch?.nameAr || order.branchNameAr || 'فرع الطالبية'}
                        </span>
                      </div>
                    </div>

                    {/* Items Preview */}
                    <div className="mt-2 pt-2 border-t border-neutral-700/50 text-[11px] text-neutral-400 space-y-0.5 max-h-16 overflow-y-auto">
                      {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between">
                          <span className="truncate max-w-[180px]">
                            {item.quantity}x {item.nameAr || item.name || 'صنف'}
                          </span>
                          <span className="font-mono text-neutral-300 shrink-0">
                            {item.totalPrice || item.unitPrice
                              ? `${item.totalPrice || item.unitPrice * item.quantity} ج.م`
                              : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions & State Transitions */}
                  <div className="pt-2 border-t border-neutral-700/60 flex items-center justify-between gap-2">
                    <div className="font-mono font-bold text-emerald-400 text-sm">
                      {orderTotal.toLocaleString()} ج.م
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-1.5 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-neutral-300 transition-colors"
                        title="تفاصيل الطلب"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {allowedNext.map((nextStatus) => {
                        const isCancelling = nextStatus === 'cancelled';
                        return (
                          <button
                            key={nextStatus}
                            disabled={isUpdatingStatus === order.id}
                            onClick={() => handleUpdateStatus(order, nextStatus)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              isCancelling
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500 hover:bg-amber-600 text-neutral-950'
                            }`}
                          >
                            {nextStatus === 'confirmed' && 'تأكيد'}
                            {nextStatus === 'preparing' && 'بدء التحضير'}
                            {nextStatus === 'ready' && 'جاهز للتسليم'}
                            {nextStatus === 'completed' && 'إتمام'}
                            {nextStatus === 'cancelled' && 'إلغاء'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Sales Overview & Top Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Revenue Summary (2 Columns) */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span>حركة المبيعات اليومية الفعلية</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                مبنية حصرياً على الطلبات المكتملة المسجلة في النظام
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('analytics')}
              className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>تفاصيل أكثر</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {dailyRevenue.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-neutral-800 rounded-xl text-neutral-400 text-sm">
              لا توجد مبيعات مكتملة مسجلة بعد. تظهر المخططات فور تسليم أول طلب.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 font-bold">
                      <th className="py-2.5 px-3">التاريخ (بتوقيت القاهرة)</th>
                      <th className="py-2.5 px-3 text-center">الطلبات المكتملة</th>
                      <th className="py-2.5 px-3 text-left">متوسط الطلب (AOV)</th>
                      <th className="py-2.5 px-3 text-left text-emerald-400">الإيراد المحقق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50">
                    {dailyRevenue.slice(-5).reverse().map((day) => {
                      const dayAov =
                        day.orders > 0 ? Math.round(day.revenue / day.orders) : 0;
                      return (
                        <tr key={day.date} className="hover:bg-neutral-800/30">
                          <td className="py-2.5 px-3 font-mono text-white" dir="ltr">
                            {day.date}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-cyan-400 font-bold">
                            {day.orders} طلب
                          </td>
                          <td className="py-2.5 px-3 text-left font-mono text-neutral-300">
                            {dayAov.toLocaleString()} ج.م
                          </td>
                          <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-400">
                            {day.revenue.toLocaleString()} ج.م
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Top Selling Products Preview (1 Column) */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Utensils className="w-4 h-4 text-amber-400" />
                <span>الأكثر طلباً ومبيعاً</span>
              </h3>
              <span className="text-[11px] font-mono text-neutral-400">
                {topProducts.length} صنف مباع
              </span>
            </div>

            {topProducts.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-neutral-800 rounded-xl text-neutral-400 text-xs">
                لا توجد بيانات كافية عن مبيعات الأصناف حتى الآن
              </div>
            ) : (
              <div className="space-y-3">
                {topProducts.slice(0, 5).map((prod, idx) => (
                  <div
                    key={prod.productId}
                    className="flex items-center justify-between text-xs bg-neutral-800/50 p-2.5 rounded-xl border border-neutral-800"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[10px] w-4 text-neutral-500">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-white truncate max-w-[120px]">
                        {prod.nameAr}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-amber-400 font-bold">
                        {prod.quantitySold} قطعة
                      </span>
                      <span className="font-mono text-emerald-400 font-bold text-[11px]">
                        {prod.revenue.toLocaleString()} ج.م
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs">
            <span className="text-neutral-400">محسوب من عناصر الطلبات</span>
            <button
              onClick={() => onNavigateTab('products')}
              className="text-amber-400 hover:underline flex items-center gap-1"
            >
              <span>قائمة الأصناف</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Branch Performance & Menu Health Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Branch 1: Talbia */}
        {branches.map((branch) => {
          const metric = branchPerformance.find((b) => b.branchId === branch.id);
          const totalBranchOrders = metric?.totalOrders || 0;
          const branchRev = metric?.revenue || 0;

          return (
            <div
              key={branch.id}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-amber-400" />
                    <span>{branch.nameAr}</span>
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono" dir="ltr">
                    {branch.phone || ''}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-black text-white">
                    {totalBranchOrders}
                  </span>
                  <span className="text-xs text-neutral-400">طلب مسجل</span>
                </div>
                <div className="text-xs font-mono text-emerald-400 font-bold mt-1">
                  إيراد: {branchRev.toLocaleString()} ج.م
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs">
                <span className="text-neutral-400">{branch.addressAr || 'الجيزة'}</span>
                <button
                  onClick={() => onNavigateTab('branches')}
                  className="text-amber-400 hover:underline text-[11px]"
                >
                  تفاصيل الفرع
                </button>
              </div>
            </div>
          );
        })}

        {/* Menu Available Products Count */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>جاهزية المنيو للطلب</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold font-mono">
                {totalProducts > 0
                  ? Math.round((availableProducts / totalProducts) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-emerald-400">
                {availableProducts}
              </span>
              <span className="text-xs text-neutral-400">
                من أصل {totalProducts} صنف
              </span>
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              متاح للعملاء في تطبيق الطلب
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs">
            <span className="text-neutral-400">{categories.length} قسم غذائي</span>
            <button
              onClick={() => onNavigateTab('products', 'available')}
              className="text-emerald-400 hover:underline text-[11px] font-bold cursor-pointer"
            >
              إدارة الأسعار
            </button>
          </div>
        </div>

        {/* Unavailable Products Alert */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>أصناف موقوفة / نفدت</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-bold font-mono">
                {unavailableProducts}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-rose-400">
                {unavailableProducts}
              </span>
              <span className="text-xs text-neutral-400">صنف غير متوفر</span>
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              مخفي مؤقتاً لحين تجديد المكونات
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs">
            <span className="text-neutral-400">التحكم الفوري</span>
            <button
              onClick={() => onNavigateTab('products', 'unavailable')}
              className="text-rose-400 hover:underline text-[11px] font-bold cursor-pointer"
            >
              تفعيل الأصناف
            </button>
          </div>
        </div>

        {/* Paper Menu Images Management Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-md flex flex-col justify-between hover:border-amber-500/40 transition-all">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>صور المنيو المطبوع</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold font-mono">
                مباشر
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-amber-400">
                📜 المنيو
              </span>
              <span className="text-xs text-neutral-400">الورقي المطبوع</span>
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              إضافة وتعديل صور صفحات المنيو فورياً
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs">
            <span className="text-neutral-400">تحديث فوري</span>
            <button
              onClick={() => onNavigateTab('paper_menu')}
              className="text-amber-400 hover:underline text-[11px] font-bold cursor-pointer"
            >
              إدارة صفحات المنيو
            </button>
          </div>
        </div>

        {/* Hero Offers & Promo Banners Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-md flex flex-col justify-between hover:border-amber-500/40 transition-all">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>خانة العروض والبانرات</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold font-mono">
                تحكم حي
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-amber-400">
                🏷️ العروض
              </span>
              <span className="text-xs text-neutral-400">والعداد التنازلي</span>
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              تعديل النصوص، الصور، والعداد التنازلي وتفعيل العروض
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs">
            <span className="text-neutral-400">انعكاس لحظي</span>
            <button
              onClick={() => onNavigateTab('offers')}
              className="text-amber-400 hover:underline text-[11px] font-bold cursor-pointer"
            >
              إدارة خانة العروض
            </button>
          </div>
        </div>
      </div>

      {/* 6. Recent Orders Table & Quick Management */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              <span>جدول أحدث الطلبات المسجلة</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              مراجعة سريعة للحالات، تفاصيل العميل، وقيمة الطلب
            </p>
          </div>

          {/* Search Bar */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث برقم الطلب، الاسم، أو الهاتف..."
                value={recentSearchQuery}
                onChange={(e) => setRecentSearchQuery(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <select
              value={recentStatusFilter}
              onChange={(e) => setRecentStatusFilter(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="all">جميع الحالات</option>
              <option value="pending">قيد الانتظار</option>
              <option value="confirmed">مؤكد</option>
              <option value="preparing">جاري التحضير</option>
              <option value="ready">جاهز</option>
              <option value="completed">مكتمل</option>
              <option value="cancelled">ملغي</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        {isOrdersLoading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="h-28 w-full bg-neutral-800/60 animate-pulse rounded-xl" />
          </div>
        ) : filteredRecentOrders.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-neutral-800 rounded-xl">
            <p className="text-sm font-bold text-neutral-400">
              لا توجد طلبات تطابق معايير البحث
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              جرب تغيير كلمات البحث أو تصفية الحالات
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 font-bold">
                  <th className="py-3 px-3">رقم الطلب</th>
                  <th className="py-3 px-4">العميل</th>
                  <th className="py-3 px-4">الفرع والنوع</th>
                  <th className="py-3 px-4 text-center">الأصناف</th>
                  <th className="py-3 px-4 text-center">الحالة</th>
                  <th className="py-3 px-4 text-left text-emerald-400">الإجمالي</th>
                  <th className="py-3 px-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filteredRecentOrders.slice(0, 10).map((order) => {
                  const style = getOrderStatusStyle(order.status);
                  const allowedNext = getAllowedTransitions(order.status);
                  const orderTotal = getOrderTotal(order);

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-neutral-800/40 transition-colors"
                    >
                      {/* Order Number */}
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-amber-400">
                          #{order.orderNumber || order.id.slice(0, 6)}
                        </span>
                        <span className="block text-[10px] text-neutral-500 font-mono">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleTimeString('ar-EG', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">
                          {order.customer?.name || order.customerName || 'عميل'}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono" dir="ltr">
                          {order.customer?.phone || order.customerPhone || ''}
                        </span>
                      </td>

                      {/* Branch & Type */}
                      <td className="py-3 px-4">
                        <span className="text-neutral-300 block">
                          {order.branch?.nameAr || order.branchNameAr || 'فرع الطالبية'}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {order.orderType === 'delivery'
                            ? '🛵 توصيل'
                            : '🏪 استلام'}
                        </span>
                      </td>

                      {/* Items Count */}
                      <td className="py-3 px-4 text-center font-mono text-neutral-300">
                        {order.items?.length || 0} صنف
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[11px] px-2.5 py-1 rounded-full border font-bold inline-block ${style.bg} ${style.text} ${style.border}`}
                        >
                          {getOrderStatusLabel(order.status)}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-3 px-4 text-left font-mono font-bold text-emerald-400">
                        {orderTotal.toLocaleString()} ج.م
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {allowedNext.length > 0 && (
                            <button
                              disabled={isUpdatingStatus === order.id}
                              onClick={() =>
                                handleUpdateStatus(order, allowedNext[0])
                              }
                              className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-neutral-950 border border-amber-500/30 text-[10px] font-bold transition-all"
                              title={`تحويل إلى ${getOrderStatusLabel(allowedNext[0])}`}
                            >
                              {allowedNext[0] === 'confirmed' && 'تأكيد'}
                              {allowedNext[0] === 'preparing' && 'تحضير'}
                              {allowedNext[0] === 'ready' && 'جاهز'}
                              {allowedNext[0] === 'completed' && 'إتمام'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
          <span>يتم عرض أحدث 10 طلبات في الصفحة الرئيسية</span>
          <button
            onClick={() => onNavigateTab('orders')}
            className="text-amber-400 hover:underline flex items-center gap-1"
          >
            <span>استعراض جميع الطلبات بالكامل</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 7. Order Details Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 text-right shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    طلب #{selectedOrder.orderNumber || selectedOrder.id.slice(0, 6)}
                  </h3>
                  <span className="text-xs text-neutral-400 font-mono">
                    {selectedOrder.createdAt
                      ? new Date(selectedOrder.createdAt).toLocaleString('ar-EG')
                      : ''}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Status & Transitions */}
            <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs text-neutral-400 block mb-1">
                  الحالة الحالية للطلب:
                </span>
                <span
                  className={`text-xs px-3 py-1 rounded-full border font-bold inline-block ${
                    getOrderStatusStyle(selectedOrder.status).bg
                  } ${getOrderStatusStyle(selectedOrder.status).text} ${
                    getOrderStatusStyle(selectedOrder.status).border
                  }`}
                >
                  {getOrderStatusLabel(selectedOrder.status)}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {getAllowedTransitions(selectedOrder.status).map((nextStatus) => {
                  const isCancelling = nextStatus === 'cancelled';
                  return (
                    <button
                      key={nextStatus}
                      disabled={isUpdatingStatus === selectedOrder.id}
                      onClick={() => handleUpdateStatus(selectedOrder, nextStatus)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isCancelling
                          ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold'
                      }`}
                    >
                      {nextStatus === 'confirmed' && 'تأكيد الطلب'}
                      {nextStatus === 'preparing' && 'بدء التحضير'}
                      {nextStatus === 'ready' && 'جاهز للتسليم'}
                      {nextStatus === 'completed' && 'إتمام الطلب'}
                      {nextStatus === 'cancelled' && 'إلغاء الطلب'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Customer & Branch Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-neutral-800/40 border border-neutral-700/40 rounded-xl p-4 space-y-2">
                <span className="font-bold text-neutral-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span>بيانات العميل</span>
                </span>
                <div className="text-white font-bold text-sm">
                  {selectedOrder.customer?.name ||
                    selectedOrder.customerName ||
                    'عميل'}
                </div>
                <div className="text-neutral-300 font-mono" dir="ltr">
                  {selectedOrder.customer?.phone ||
                    selectedOrder.customerPhone ||
                    ''}
                </div>
                {selectedOrder.customer?.phone && (
                  <a
                    href={`https://wa.me/20${selectedOrder.customer.phone.replace(
                      /^0/,
                      ''
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-400 hover:underline pt-1 text-[11px]"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>مراسلة واتساب</span>
                  </a>
                )}
              </div>

              <div className="bg-neutral-800/40 border border-neutral-700/40 rounded-xl p-4 space-y-2">
                <span className="font-bold text-neutral-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>الفرع والتوصيل</span>
                </span>
                <div className="text-white font-bold">
                  {selectedOrder.branch?.nameAr ||
                    selectedOrder.branchNameAr ||
                    'فرع الطالبية'}
                </div>
                <div className="text-neutral-400">
                  {selectedOrder.orderType === 'delivery'
                    ? `توصيل: ${
                        selectedOrder.address ||
                        selectedOrder.customer?.address ||
                        'العنوان محدد في الطلب'
                      }`
                    : 'استلام ذاتي من الفرع'}
                </div>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-neutral-300 block">
                الأصناف المطلوبة:
              </span>
              <div className="divide-y divide-neutral-800 border border-neutral-800 rounded-xl overflow-hidden bg-neutral-800/30">
                {selectedOrder.items?.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-400 font-mono font-bold flex items-center justify-center">
                        {item.quantity}x
                      </span>
                      <div>
                        <span className="font-bold text-white block">
                          {item.nameAr || item.name || 'صنف'}
                        </span>
                        {item.selectedOptions && (
                          <span className="text-[10px] text-neutral-400">
                            {Object.values(item.selectedOptions).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold">
                      {item.totalPrice ||
                        (item.unitPrice ? item.unitPrice * item.quantity : 0)}{' '}
                      ج.م
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Price & Actions */}
            <div className="pt-4 border-t border-neutral-800 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">إجمالي الحساب:</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  {getOrderTotal(selectedOrder).toLocaleString()} ج.م
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Instant Print */}
                <button
                  type="button"
                  onClick={() => exportAndPrintSingleInvoice(selectedOrder, 'print')}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer hover:scale-[1.02]"
                  title="طباعة فورية للطابعة (Instant Print)"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة فورية</span>
                </button>

                {/* PDF Export */}
                <button
                  type="button"
                  onClick={() => exportAndPrintSingleInvoice(selectedOrder, 'pdf')}
                  className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer hover:scale-[1.02]"
                  title="استخراج وتصدير كملف PDF"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>استخراج كـ PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Confirmation Dialog */}
      {cancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm dir-rtl">
          <div className="bg-neutral-900 border border-rose-900/60 rounded-3xl p-6 max-w-md w-full text-white space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h4 className="text-base font-black text-white">تأكيد إلغاء الطلب</h4>
                <p className="text-xs text-rose-300/80">رقم الطلب: {cancelConfirm.order.orderNumber}</p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950/60 p-3.5 rounded-2xl border border-neutral-800">
              هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟ هذا الإجراء سيقوم بتحويل حالة الطلب إلى <strong className="text-rose-400">"ملغي"</strong> وتسجيل هذا الإجراء بشكل دائم في سجل الحركات.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCancelConfirm(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-all cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus === cancelConfirm.order.id}
                onClick={() => handleUpdateStatus(cancelConfirm.order, 'cancelled', true)}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-500 transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-rose-950/50 disabled:opacity-50"
              >
                {isUpdatingStatus === cancelConfirm.order.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>نعم، تأكيد الإلغاء</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

