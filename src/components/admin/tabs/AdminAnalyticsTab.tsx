import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  CheckCircle2,
  Clock,
  XCircle,
  DollarSign,
  Truck,
  Store,
  Calendar,
  Layers,
  CreditCard,
  Utensils,
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  HelpCircle,
  Percent,
  Timer,
  Zap,
  FileDown,
  Printer,
  ChevronLeft,
  Eye,
} from 'lucide-react';
import { Order } from '../../../types';
import { firebaseOrderService } from '../../../services/firebaseOrderService';
import { storageService } from '../../../services/storageService';
import {
  generateComprehensiveOrderAnalytics,
  TimeRangePreset,
  CustomDateRange,
  toCairoDateString,
  filterOrdersByDateRange,
} from '../../../services/orderAnalyticsEngine';
import { exportAndPrintReport } from '../../../services/pdfReportGenerator';
import { CompletedOrdersModal } from '../modals/CompletedOrdersModal';
import { getOrderStatusLabel } from '../../../lib/orderStatus';
import { formatPrice } from '../../../lib/utils';
import { Button } from '../../ui/Button';

export const AdminAnalyticsTab: React.FC = () => {
  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompletedModal, setShowCompletedModal] = useState<boolean>(false);

  // Time Range Filter State (Default: 'this_month')
  const [timeRangePreset, setTimeRangePreset] = useState<TimeRangePreset>('this_month');
  const [isCustomRange, setIsCustomRange] = useState<boolean>(false);
  const [customRange, setCustomRange] = useState<CustomDateRange>(() => {
    const today = toCairoDateString(new Date());
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    return {
      startDate: toCairoDateString(sevenDaysAgo),
      endDate: today,
    };
  });

  // Active chart hover tooltip state
  const [activeHoverPoint, setActiveHoverPoint] = useState<{
    date: string;
    orders: number;
    revenue: number;
  } | null>(null);

  // Subscribe to real-time orders with auto-sync (zero disruptive error popups)
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const unsubscribe = firebaseOrderService.subscribeToOrders(
      (realtimeOrders) => {
        if (!isMounted) return;
        setOrders(realtimeOrders || []);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        if (!isMounted) return;
        console.warn('⚠️ [AdminAnalyticsTab] Realtime orders sync note:', err);
        // Do not block the UI if local/server cache exists
        firebaseOrderService.getOrders(300).then((cached) => {
          if (isMounted) {
            if (cached && cached.length > 0) {
              setOrders(cached);
              setError(null);
            }
            setIsLoading(false);
          }
        }).catch(() => {
          if (isMounted) setIsLoading(false);
        });
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Compute Comprehensive Analytics via Pure Memoized Engine
  const analytics = useMemo(() => {
    const rangeParam = isCustomRange ? customRange : timeRangePreset;
    return generateComprehensiveOrderAnalytics(orders, rangeParam);
  }, [orders, timeRangePreset, isCustomRange, customRange]);

  // Compute current filtered orders list
  const currentFilteredOrders = useMemo(() => {
    const rangeParam = isCustomRange ? customRange : timeRangePreset;
    return filterOrdersByDateRange(orders, rangeParam);
  }, [orders, timeRangePreset, isCustomRange, customRange]);

  const {
    kpis,
    dailyRevenue,
    statusDistribution,
    branchPerformance,
    topProducts,
    paymentPerformance,
    orderTypePerformance,
    operationalVelocity,
    dataQuality,
  } = analytics;

  // Max daily revenue for chart scaling
  const maxDailyRevenue = useMemo(() => {
    if (dailyRevenue.length === 0) return 1;
    const max = Math.max(...dailyRevenue.map((d) => d.revenue));
    return max > 0 ? max : 1;
  }, [dailyRevenue]);

  // Handler for manual refresh
  const handleRetry = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fresh = await firebaseOrderService.getOrders(300);
      if (fresh) {
        setOrders(fresh);
      }
    } catch (e: any) {
      console.warn('Refresh error:', e?.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Human-readable period label
  const currentPeriodLabel = useMemo(() => {
    if (isCustomRange) {
      return `مخصص (من ${customRange.startDate} إلى ${customRange.endDate})`;
    }
    const map: Record<TimeRangePreset, string> = {
      today: 'اليوم',
      yesterday: 'أمس',
      this_week: 'هذا الأسبوع',
      last_7_days: 'آخر 7 أيام',
      this_month: 'هذا الشهر',
      last_month: 'الشهر السابق',
      last_30_days: 'آخر 30 يوم',
      this_year: 'هذا العام (السنوي)',
      all: 'جميع الفترات (السجل الكامل)',
    };
    return map[timeRangePreset] || 'الفترة المحددة';
  }, [isCustomRange, customRange, timeRangePreset]);

  // Export PDF Report handler
  const handleExportPDF = () => {
    const rangeParam = isCustomRange ? customRange : timeRangePreset;
    exportAndPrintReport(analytics, currentFilteredOrders, {
      periodLabel: currentPeriodLabel,
      timeRange: rangeParam,
      generatedBy: 'لوحة إدارة بامبورينا المعتمدة',
    });
  };

  const timeRangeButtons: { id: TimeRangePreset; label: string }[] = [
    { id: 'today', label: 'اليوم' },
    { id: 'yesterday', label: 'أمس' },
    { id: 'this_week', label: 'هذا الأسبوع' },
    { id: 'last_7_days', label: 'آخر 7 أيام' },
    { id: 'this_month', label: 'هذا الشهر' },
    { id: 'last_month', label: 'الشهر السابق' },
    { id: 'last_30_days', label: 'آخر 30 يوم' },
    { id: 'this_year', label: 'هذا العام (سنوي)' },
    { id: 'all', label: 'جميع الفترات' },
  ];

  return (
    <div className="space-y-8 pb-12" dir="rtl">
      {/* Completed Orders Register Modal */}
      <CompletedOrdersModal
        isOpen={showCompletedModal}
        onClose={() => setShowCompletedModal(false)}
        orders={currentFilteredOrders}
        periodLabel={currentPeriodLabel}
        totalRevenue={kpis.grossRevenue}
      />

      {/* Top Header & Context Banner */}
      <div className="bg-gradient-to-l from-amber-500/10 via-neutral-800 to-neutral-800 border border-neutral-700/80 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-3">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>محرك التحليلات والتقارير المالية المعتمدة</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            لوحة الإحصائيات واستخراج التقارير
          </h2>
          <p className="mt-1 text-sm text-neutral-400 max-w-2xl leading-relaxed">
            حسابات فورية ودقيقة للإيرادات، فواتير الطلبات، أداء الفروع، والأصناف الأكثر مبيعاً مع إمكانية استخراج تقارير PDF رسمية.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Direct Print Analytics Report Button */}
          <button
            onClick={handleExportPDF}
            className="px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800 text-amber-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer w-full sm:w-auto"
            title="طباعة تقرير التحليلات والبيانات المالية للفترة المحددة فوراً"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة تقرير التحليلات ({currentPeriodLabel})</span>
          </button>

          {/* PDF Export Button */}
          <button
            onClick={handleExportPDF}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer w-full sm:w-auto"
          >
            <FileDown className="w-4 h-4" />
            <span>استخراج تقرير PDF ({currentPeriodLabel})</span>
          </button>

          {/* Refresh Button */}
          <Button
            variant="outline"
            onClick={handleRetry}
            disabled={isLoading}
            className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {/* Global Time Range Filter Bar */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-2 text-neutral-300 font-bold text-sm shrink-0">
          <Calendar className="w-4 h-4 text-amber-400" />
          <span>الفترة الزمنية للتقرير:</span>
        </div>

        {/* Presets and Custom Toggle */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {timeRangeButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => {
                setIsCustomRange(false);
                setTimeRangePreset(btn.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                !isCustomRange && timeRangePreset === btn.id
                  ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20 font-black'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700/60'
              }`}
            >
              {btn.label}
            </button>
          ))}

          <button
            onClick={() => setIsCustomRange(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isCustomRange
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20 font-black'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700/60'
            }`}
          >
            مخصص...
          </button>
        </div>

        {/* Custom Date Pickers */}
        {isCustomRange && (
          <div className="flex flex-wrap items-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-neutral-800 w-full lg:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">من:</span>
              <input
                type="date"
                value={customRange.startDate}
                onChange={(e) => setCustomRange((prev) => ({ ...prev, startDate: e.target.value }))}
                className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">إلى:</span>
              <input
                type="date"
                value={customRange.endDate}
                onChange={(e) => setCustomRange((prev) => ({ ...prev, endDate: e.target.value }))}
                className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* 8 Core KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Gross Revenue (Clickable to open detailed Completed Orders Register) */}
        <div
          onClick={() => setShowCompletedModal(true)}
          className="bg-neutral-800/90 hover:bg-neutral-800 border border-neutral-700/70 hover:border-emerald-500/50 rounded-2xl p-5 relative overflow-hidden shadow-lg cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-400 group-hover:text-emerald-300 transition-colors">
              إجمالي الإيرادات (المكتملة)
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          {isLoading ? (
            <div className="h-9 w-28 bg-neutral-700 animate-pulse rounded-lg" />
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-emerald-400 tracking-tight">
                {kpis.grossRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold text-emerald-400/80">ج.م</span>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-neutral-700/50 flex items-center justify-between text-xs text-neutral-400">
            <span>الطلبات المكتملة فقط (اضغط للتفاصيل)</span>
            <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
              <span>{kpis.completedOrders} طلب</span>
              <ChevronLeft className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* 2. Total Orders */}
        <div className="bg-neutral-800/90 border border-neutral-700/70 rounded-2xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-400">إجمالي الطلبات المستلمة</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          {isLoading ? (
            <div className="h-9 w-20 bg-neutral-700 animate-pulse rounded-lg" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{kpis.totalOrders}</span>
              <span className="text-xs text-neutral-400">طلب بالفترة</span>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-neutral-700/50 flex items-center justify-between text-xs text-neutral-400">
            <span>نسبة الإكمال</span>
            <span className="font-mono text-amber-400 font-bold">
              {kpis.totalOrders > 0 ? Math.round((kpis.completedOrders / kpis.totalOrders) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* 3. Completed Orders (Clickable to open detailed Completed Orders Register) */}
        <div
          onClick={() => setShowCompletedModal(true)}
          className="bg-neutral-800/90 hover:bg-neutral-800 border border-neutral-700/70 hover:border-cyan-500/50 rounded-2xl p-5 relative overflow-hidden shadow-lg cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-400 group-hover:text-cyan-300 transition-colors">
              الطلبات المكتملة والناجحة
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          {isLoading ? (
            <div className="h-9 w-20 bg-neutral-700 animate-pulse rounded-lg" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-cyan-400">{kpis.completedOrders}</span>
              <span className="text-xs text-cyan-400 font-bold">طلب منفذ ومسدد</span>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-neutral-700/50 flex items-center justify-between text-xs text-neutral-400">
            <span>تم تسليمها (عرض السجل)</span>
            <span className="font-mono text-cyan-400 font-bold bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
              <span>{kpis.completedOrders} طلب</span>
              <ChevronLeft className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* 4. Average Order Value (AOV) */}
        <div className="bg-neutral-800/90 border border-neutral-700/70 rounded-2xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-400">متوسط قيمة الطلب (AOV)</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          {isLoading ? (
            <div className="h-9 w-24 bg-neutral-700 animate-pulse rounded-lg" />
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-white">
                {kpis.averageOrderValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold text-neutral-400">ج.م</span>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-neutral-700/50 flex items-center justify-between text-xs text-neutral-400">
            <span>معدل الإنفاق لكل طلب</span>
            <span className="font-mono text-purple-400 font-bold">متوسط</span>
          </div>
        </div>

        {/* 5. Active Pipeline Orders */}
        <div className="bg-neutral-800/90 border border-neutral-700/70 rounded-2xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-400">الطلبات النشطة بالمطبخ</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          {isLoading ? (
            <div className="h-9 w-20 bg-neutral-700 animate-pulse rounded-lg" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-blue-400">{kpis.activeOrders}</span>
              <span className="text-xs text-neutral-400">قيد التحضير/الانتظار</span>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-neutral-700/50 flex items-center justify-between text-xs text-neutral-400">
            <span>في خط الإنتاج الحالي</span>
            <span className="font-mono text-blue-400 font-bold">مباشر</span>
          </div>
        </div>

        {/* 6. Cancelled Orders */}
        <div className="bg-neutral-800/90 border border-neutral-700/70 rounded-2xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-400">الطلبات الملغاة</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          {isLoading ? (
            <div className="h-9 w-20 bg-neutral-700 animate-pulse rounded-lg" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-rose-400">{kpis.cancelledOrders}</span>
              <span className="text-xs text-neutral-400">طلب ملغي</span>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-neutral-700/50 flex items-center justify-between text-xs text-neutral-400">
            <span>نسبة الإلغاء</span>
            <span className="font-mono text-rose-400 font-bold">
              {kpis.totalOrders > 0 ? Math.round((kpis.cancelledOrders / kpis.totalOrders) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* 7. Delivery Orders */}
        <div className="bg-neutral-800/90 border border-neutral-700/70 rounded-2xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-400">طلبات التوصيل (دليفري)</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          {isLoading ? (
            <div className="h-9 w-20 bg-neutral-700 animate-pulse rounded-lg" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{kpis.deliveryOrders}</span>
              <span className="text-xs text-amber-400 font-bold">({kpis.deliveryPercentage}%)</span>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-neutral-700/50 flex items-center justify-between text-xs text-neutral-400">
            <span>توصيل للمنازل</span>
            <span className="font-mono text-amber-400 font-bold">{kpis.deliveryPercentage}%</span>
          </div>
        </div>

        {/* 8. Pickup Orders */}
        <div className="bg-neutral-800/90 border border-neutral-700/70 rounded-2xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-400">طلبات الاستلام من الفرع</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Store className="w-4 h-4" />
            </div>
          </div>
          {isLoading ? (
            <div className="h-9 w-20 bg-neutral-700 animate-pulse rounded-lg" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{kpis.pickupOrders}</span>
              <span className="text-xs text-emerald-400 font-bold">({kpis.pickupPercentage}%)</span>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-neutral-700/50 flex items-center justify-between text-xs text-neutral-400">
            <span>تيك أواي / استلام</span>
            <span className="font-mono text-emerald-400 font-bold">{kpis.pickupPercentage}%</span>
          </div>
        </div>
      </div>

      {/* Main Analytical Visualizations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Revenue Trend Visualization (2 Columns on Large Screens) */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span>حركة الإيرادات اليومية والطلبات المكتملة</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">تطور المبيعات اليومية المحققة حسب توقيت القاهرة</p>
            </div>
            {activeHoverPoint && (
              <div className="bg-neutral-800 border border-neutral-700 px-3 py-1.5 rounded-xl text-xs flex items-center gap-3">
                <span className="text-neutral-300 font-mono" dir="ltr">{activeHoverPoint.date}</span>
                <span className="text-emerald-400 font-bold font-mono">{activeHoverPoint.revenue.toLocaleString()} ج.م</span>
                <span className="text-neutral-400 font-mono">({activeHoverPoint.orders} طلب)</span>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="h-56 flex items-center justify-center">
              <div className="h-44 w-full bg-neutral-800/60 animate-pulse rounded-xl" />
            </div>
          ) : dailyRevenue.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center p-6 border border-dashed border-neutral-800 rounded-xl">
              <Calendar className="w-10 h-10 text-neutral-600 mb-2" />
              <p className="text-sm font-bold text-neutral-400">لا توجد مبيعات مكتملة في الفترة المحددة</p>
              <p className="text-xs text-neutral-500 mt-1">تظهر البيانات تلقائياً بمجرد إتمام الطلبات وتأكيدها</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Daily Bar Chart Visualization */}
              <div className="h-52 flex items-end gap-2 pt-6 px-2 overflow-x-auto pb-2 border-b border-neutral-800">
                {dailyRevenue.map((point) => {
                  const heightPercent = Math.max(8, Math.round((point.revenue / maxDailyRevenue) * 100));
                  return (
                    <div
                      key={point.date}
                      onMouseEnter={() => setActiveHoverPoint(point)}
                      onMouseLeave={() => setActiveHoverPoint(null)}
                      className="flex-1 min-w-[36px] max-w-[64px] flex flex-col items-center gap-2 group cursor-pointer"
                    >
                      {/* Bar with Tooltip */}
                      <div className="w-full flex items-end justify-center h-40">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:from-amber-500 group-hover:to-amber-400 transition-all shadow-md group-hover:shadow-emerald-500/20 relative"
                        >
                          <span className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-neutral-800 text-[10px] text-emerald-300 font-mono font-bold px-1.5 py-0.5 rounded border border-neutral-700 whitespace-nowrap z-10 transition-opacity">
                            {point.revenue}
                          </span>
                        </div>
                      </div>
                      {/* Date Label */}
                      <span className="text-[10px] font-mono text-neutral-400 group-hover:text-white transition-colors rotate-45 sm:rotate-0 mt-1 whitespace-nowrap">
                        {point.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-400 px-2 pt-1">
                <span>إجمالي أيام المبيعات: <strong className="text-white font-mono">{dailyRevenue.length} يوم</strong></span>
                <span>أعلى إيراد يومي: <strong className="text-emerald-400 font-mono">{maxDailyRevenue.toLocaleString()} ج.م</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Order Status Distribution */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>توزيع حالات الطلبات</span>
            </h3>
            <p className="text-xs text-neutral-400 mb-6">الحالات التشغيلية ومعدلات الانتهاء</p>

            <div className="space-y-4">
              {statusDistribution.map((item) => {
                const isCompleted = item.status === 'completed';
                const isCancelled = item.status === 'cancelled';
                const barColor = isCompleted
                  ? 'bg-emerald-500'
                  : isCancelled
                  ? 'bg-rose-500'
                  : 'bg-amber-500';

                return (
                  <div key={item.status} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-neutral-200">
                        {getOrderStatusLabel(item.status)}
                      </span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-neutral-400">{item.count} طلب</span>
                        <span className="font-bold text-white">({item.percentage}%)</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${item.percentage}%` }}
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
            <span>مجموع الطلبات المفحوصة</span>
            <span className="font-mono text-white font-bold">{kpis.totalOrders} طلب</span>
          </div>
        </div>
      </div>

      {/* Operational Velocity Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Timer className="w-4 h-4 text-blue-400" />
              <span>سرعة العمليات وزمن التنفيذ (Operational Velocity)</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              متوسط الوقت المستغرق بين مراحل إعداد وتجهيز الطلب (محسوب بالدقائق من سجل الحالة)
            </p>
          </div>
          <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono">
            {operationalVelocity.sampleSize.totalLifecycle} طلب مكتمل مفحوص
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Pending -> Confirmed */}
          <div className="bg-neutral-800/70 border border-neutral-700/60 rounded-xl p-4 text-center">
            <span className="text-[11px] font-bold text-neutral-400 block mb-2">انتظار ← تأكيد</span>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl font-black text-white font-mono">
                {operationalVelocity.avgPendingToConfirmedMinutes !== null
                  ? operationalVelocity.avgPendingToConfirmedMinutes
                  : 'غير متاح'}
              </span>
              {operationalVelocity.avgPendingToConfirmedMinutes !== null && (
                <span className="text-[10px] text-neutral-400">دقيقة</span>
              )}
            </div>
            <span className="text-[10px] text-neutral-500 mt-2 block font-mono">
              العينات: {operationalVelocity.sampleSize.pendingToConfirmed}
            </span>
          </div>

          {/* 2. Confirmed -> Preparing */}
          <div className="bg-neutral-800/70 border border-neutral-700/60 rounded-xl p-4 text-center">
            <span className="text-[11px] font-bold text-neutral-400 block mb-2">تأكيد ← قيد التحضير</span>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl font-black text-white font-mono">
                {operationalVelocity.avgConfirmedToPreparingMinutes !== null
                  ? operationalVelocity.avgConfirmedToPreparingMinutes
                  : 'غير متاح'}
              </span>
              {operationalVelocity.avgConfirmedToPreparingMinutes !== null && (
                <span className="text-[10px] text-neutral-400">دقيقة</span>
              )}
            </div>
            <span className="text-[10px] text-neutral-500 mt-2 block font-mono">
              العينات: {operationalVelocity.sampleSize.confirmedToPreparing}
            </span>
          </div>

          {/* 3. Preparing -> Ready */}
          <div className="bg-neutral-800/70 border border-neutral-700/60 rounded-xl p-4 text-center">
            <span className="text-[11px] font-bold text-neutral-400 block mb-2">تحضير ← جاهز للتسليم</span>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl font-black text-white font-mono">
                {operationalVelocity.avgPreparingToReadyMinutes !== null
                  ? operationalVelocity.avgPreparingToReadyMinutes
                  : 'غير متاح'}
              </span>
              {operationalVelocity.avgPreparingToReadyMinutes !== null && (
                <span className="text-[10px] text-neutral-400">دقيقة</span>
              )}
            </div>
            <span className="text-[10px] text-neutral-500 mt-2 block font-mono">
              العينات: {operationalVelocity.sampleSize.preparingToReady}
            </span>
          </div>

          {/* 4. Ready -> Completed */}
          <div className="bg-neutral-800/70 border border-neutral-700/60 rounded-xl p-4 text-center">
            <span className="text-[11px] font-bold text-neutral-400 block mb-2">جاهز ← تسليم نهائي</span>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl font-black text-white font-mono">
                {operationalVelocity.avgReadyToCompletedMinutes !== null
                  ? operationalVelocity.avgReadyToCompletedMinutes
                  : 'غير متاح'}
              </span>
              {operationalVelocity.avgReadyToCompletedMinutes !== null && (
                <span className="text-[10px] text-neutral-400">دقيقة</span>
              )}
            </div>
            <span className="text-[10px] text-neutral-500 mt-2 block font-mono">
              العينات: {operationalVelocity.sampleSize.readyToCompleted}
            </span>
          </div>

          {/* 5. Total Lifecycle */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
            <span className="text-[11px] font-bold text-emerald-400 block mb-2">إجمالي دورة الطلب بالكامل</span>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {operationalVelocity.avgTotalLifecycleMinutes !== null
                  ? operationalVelocity.avgTotalLifecycleMinutes
                  : 'غير متاح'}
              </span>
              {operationalVelocity.avgTotalLifecycleMinutes !== null && (
                <span className="text-[10px] text-emerald-400/80">دقيقة</span>
              )}
            </div>
            <span className="text-[10px] text-emerald-400/70 mt-2 block font-mono">
              من الإنشاء حتى الاكتمال
            </span>
          </div>
        </div>
      </div>

      {/* Branch Performance Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Store className="w-4 h-4 text-amber-400" />
              <span>أداء الفروع الرسمية (Branch Performance)</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              مبني حصرياً على اللقطة غير القابلة للتغيير (Immutable Branch Snapshot) لكل طلب
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            {branchPerformance.length} فروع مسجلة بالطلبات
          </span>
        </div>

        {branchPerformance.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-neutral-800 rounded-xl text-neutral-400 text-sm">
            لا توجد طلبات مرتبطة بفروع في الفترة المحددة
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 font-bold">
                  <th className="py-3 px-4">الفرع</th>
                  <th className="py-3 px-4 text-center">إجمالي الطلبات</th>
                  <th className="py-3 px-4 text-center text-cyan-400">المكتملة</th>
                  <th className="py-3 px-4 text-center text-blue-400">النشطة</th>
                  <th className="py-3 px-4 text-center text-rose-400">الملغاة</th>
                  <th className="py-3 px-4 text-center">توصيل / استلام</th>
                  <th className="py-3 px-4 text-left">متوسط الطلب (AOV)</th>
                  <th className="py-3 px-4 text-left text-emerald-400">الإيرادات المحققة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {branchPerformance.map((b) => (
                  <tr key={b.branchId} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <span>{b.branchNameAr}</span>
                      </div>
                      <span className="text-[10px] text-neutral-500 font-mono mr-4" dir="ltr">{b.branchId}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-neutral-300">{b.totalOrders}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-cyan-400 font-bold">{b.completedOrders}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-blue-400">{b.activeOrders}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-rose-400">{b.cancelledOrders}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-neutral-400">
                      <span className="text-amber-400 font-bold">{b.deliveryOrders}</span> توصيل /{' '}
                      <span className="text-emerald-400 font-bold">{b.pickupOrders}</span> استلام
                    </td>
                    <td className="py-3.5 px-4 text-left font-mono text-neutral-300">
                      {b.averageOrderValue.toLocaleString()} ج.م
                    </td>
                    <td className="py-3.5 px-4 text-left font-mono font-black text-emerald-400 text-sm">
                      {b.revenue.toLocaleString()} ج.م
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Products & Payment Methods Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Selling Products (2 Columns on Large Screens) */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Utensils className="w-4 h-4 text-amber-400" />
                <span>الأصناف الأكثر مبيعاً (Top Selling Products)</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                محسوبة مباشرة من لقطات الأصناف (OrderItemSnapshot) للطلبات المكتملة
              </p>
            </div>
            <span className="text-xs font-mono text-neutral-400">
              {topProducts.length} صنف تم بيعه
            </span>
          </div>

          {topProducts.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-neutral-800 rounded-xl text-neutral-400 text-sm">
              لا توجد مبيعات أصناف في الفترة المحددة
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 font-bold">
                    <th className="py-3 px-3">#</th>
                    <th className="py-3 px-4">اسم الصنف</th>
                    <th className="py-3 px-4 text-center">الكمية المباعة</th>
                    <th className="py-3 px-4 text-left">مساهمة الإيراد</th>
                    <th className="py-3 px-4 text-left text-emerald-400">إجمالي الإيرادات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {topProducts.slice(0, 10).map((prod, index) => (
                    <tr key={prod.productId} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3.5 px-3 font-mono text-neutral-500 text-xs">{index + 1}</td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        <span>{prod.nameAr}</span>
                        <span className="block text-[10px] text-neutral-500 font-mono" dir="ltr">{prod.productId}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-400">
                        {prod.quantitySold} قطعة
                      </td>
                      <td className="py-3.5 px-4 text-left font-mono text-neutral-300">
                        <div className="flex items-center justify-end gap-2">
                          <span>{prod.percentageOfRevenue}%</span>
                          <div className="w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden hidden sm:block">
                            <div
                              style={{ width: `${prod.percentageOfRevenue}%` }}
                              className="h-full bg-emerald-500 rounded-full"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-left font-mono font-bold text-emerald-400">
                        {prod.revenue.toLocaleString()} ج.م
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payment Methods Breakdown */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-purple-400" />
              <span>طرق الدفع والتسوية</span>
            </h3>
            <p className="text-xs text-neutral-400 mb-6">توزيع الإيرادات حسب وسيلة الدفع المستخدمة</p>

            <div className="space-y-4">
              {paymentPerformance.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-neutral-800 rounded-xl text-neutral-400 text-xs">
                  لا توجد حركات دفع مسجلة
                </div>
              ) : (
                paymentPerformance.map((pay) => (
                  <div key={pay.paymentMethod} className="bg-neutral-800/60 border border-neutral-700/60 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{pay.paymentMethodAr}</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {pay.revenue.toLocaleString()} ج.م
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-400">
                      <span className="font-mono">{pay.completedOrders} طلب مكتمل / {pay.totalOrders} إجمالي</span>
                      <span className="font-mono text-purple-400 font-bold">{pay.percentageOfRevenue}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pay.percentageOfRevenue}%` }}
                        className="h-full bg-purple-500 rounded-full"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
            <span>نوع التسوية</span>
            <span className="font-mono text-emerald-400 font-bold">نقدي / إلكتروني</span>
          </div>
        </div>
      </div>

      {/* Data Quality & System Audit Panel (Admin-Only Non-Destructive) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-white">فحص جودة وسلامة بيانات الطلبات (Data Quality Audit)</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                فحص آلي للقاعدة للتأكد من خلو وثائق الطلبات من أي قيم تالفة أو مفقودة دون تعديلها
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
              {dataQuality.validOrders} طلب سليم 100%
            </span>
            {dataQuality.invalidOrders > 0 && (
              <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
                {dataQuality.invalidOrders} يحتوي ملاحظات
              </span>
            )}
          </div>
        </div>

        {dataQuality.issues.length === 0 ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>جميع وثائق الطلبات المفحوصة ({dataQuality.totalOrders}) مطابقة للمعايير القياسية وخالية من أي أخطاء بنية.</span>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-amber-400 font-bold mb-2">تم رصد الملاحظات التالية:</p>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {dataQuality.issues.map((issue, idx) => (
                <div key={idx} className="bg-neutral-800/80 border border-neutral-700/60 rounded-lg p-2.5 flex items-center justify-between text-xs text-neutral-300">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{issue.issue}</span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500" dir="ltr">
                    {issue.orderNumber || issue.orderId}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
