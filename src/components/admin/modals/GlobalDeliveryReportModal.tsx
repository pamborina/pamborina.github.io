import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Printer,
  FileSpreadsheet,
  Bike,
  CheckCircle2,
  Clock,
  DollarSign,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertCircle,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { DeliveryDriver, Order } from '../../../types';
import { exportAndPrintAllDriversReport, PrintLayoutSize } from '../../../services/pdfReportGenerator';
import { PrintSizeSelectorModal } from './PrintSizeSelectorModal';

interface GlobalDeliveryReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: DeliveryDriver[];
  orders: Order[];
  onOpenDriverStatement?: (driver: DeliveryDriver) => void;
}

type TimeRange = 'all' | 'today' | 'week' | 'month';

export const GlobalDeliveryReportModal: React.FC<GlobalDeliveryReportModalProps> = ({
  isOpen,
  onClose,
  drivers,
  orders,
  onOpenDriverStatement,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPrintSizeModal, setShowPrintSizeModal] = useState(false);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  const scrollTable = (direction: 'left' | 'right') => {
    if (tableScrollRef.current) {
      const scrollAmount = 280;
      tableScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // 1. Filter orders based on the selected time range
  const filteredOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    if (timeRange === 'all') return orders;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return orders.filter((order) => {
      const dateStr = order.statusUpdatedAt || order.updatedAt || order.createdAt;
      const orderTime = new Date(dateStr || 0).getTime();
      if (isNaN(orderTime)) return true;

      if (timeRange === 'today') {
        return orderTime >= startOfDay;
      }
      if (timeRange === 'week') {
        const weekAgo = startOfDay - 7 * 24 * 60 * 60 * 1000;
        return orderTime >= weekAgo;
      }
      if (timeRange === 'month') {
        const monthAgo = startOfDay - 30 * 24 * 60 * 60 * 1000;
        return orderTime >= monthAgo;
      }
      return true;
    });
  }, [orders, timeRange]);

  // 2. Re-compute stats per driver for the selected period
  const COMPLETED_STATUSES = new Set(['completed', 'delivered']);
  const ACTIVE_STATUSES = new Set(['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery']);

  const driversWithPeriodStats = useMemo(() => {
    return drivers.map((driver) => {
      let orderCount = 0;
      let deliveredRevenue = 0;
      let activeOrdersCount = 0;
      let latestDeliveredTime = 0;
      let lastDeliveredAt: string | undefined = undefined;

      filteredOrders.forEach((order) => {
        const isAssigned =
          order.driverId === driver.id ||
          (order.driverName && order.driverName.trim().toLowerCase() === driver.name.trim().toLowerCase());

        if (!isAssigned) return;

        const orderStatus = (order.status || '').toLowerCase();

        if (COMPLETED_STATUSES.has(orderStatus)) {
          orderCount += 1;
          // Strictly calculate delivery fee only
          const fee = Number(order.deliveryFee ?? order.pricing?.deliveryFee ?? 0);
          if (!isNaN(fee) && fee > 0) {
            deliveredRevenue += fee;
          }

          const completionDate = order.statusUpdatedAt || order.updatedAt || order.createdAt;
          const orderDate = new Date(completionDate || 0).getTime();
          if (!isNaN(orderDate) && orderDate > latestDeliveredTime) {
            latestDeliveredTime = orderDate;
            lastDeliveredAt = completionDate;
          }
        } else if (ACTIVE_STATUSES.has(orderStatus)) {
          activeOrdersCount += 1;
        }
      });

      return {
        ...driver,
        orderCount,
        deliveredRevenue,
        activeOrdersCount,
        lastDeliveredAt,
      };
    });
  }, [drivers, filteredOrders]);

  // 3. Global fleet metrics for the period
  const totalCompletedDeliveryOrders = useMemo(() => {
    return filteredOrders.filter((o) => {
      const st = (o.status || '').toLowerCase();
      return COMPLETED_STATUSES.has(st) && (o.orderType === 'delivery' || o.driverId || o.driverName);
    }).length;
  }, [filteredOrders]);

  const totalDeliveryFeesCollected = useMemo(() => {
    return filteredOrders
      .filter((o) => {
        const st = (o.status || '').toLowerCase();
        return COMPLETED_STATUSES.has(st) && (o.orderType === 'delivery' || o.driverId || o.driverName);
      })
      .reduce((sum, o) => {
        const fee = Number(o.deliveryFee ?? o.pricing?.deliveryFee ?? 0);
        return sum + (isNaN(fee) || fee < 0 ? 0 : fee);
      }, 0);
  }, [filteredOrders]);

  const activeDeliveriesNow = useMemo(() => {
    return filteredOrders.filter((o) => {
      const st = (o.status || '').toLowerCase();
      return ACTIVE_STATUSES.has(st) && (o.orderType === 'delivery' || o.driverId || o.driverName);
    }).length;
  }, [filteredOrders]);

  // 4. Filter drivers list for display
  const displayedDrivers = useMemo(() => {
    return driversWithPeriodStats.filter((driver) => {
      const matchesStatus = statusFilter === 'all' || driver.status === statusFilter;
      const matchesSearch =
        !searchQuery ||
        driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.phone.includes(searchQuery);
      return matchesStatus && matchesSearch;
    }).sort((a, b) => (b.deliveredRevenue || 0) - (a.deliveredRevenue || 0) || (b.orderCount || 0) - (a.orderCount || 0));
  }, [driversWithPeriodStats, statusFilter, searchQuery]);

  // Unassigned completed delivery orders
  const unassignedCompletedOrders = useMemo(() => {
    return filteredOrders.filter((o) => {
      const st = (o.status || '').toLowerCase();
      const isCompleted = COMPLETED_STATUSES.has(st);
      const isDelivery = o.orderType === 'delivery';
      const hasDriver = !!(o.driverId || o.driverName);
      return isCompleted && isDelivery && !hasDriver;
    });
  }, [filteredOrders]);

  const timeRangeLabels: Record<TimeRange, string> = {
    today: 'اليوم',
    week: 'آخر 7 أيام',
    month: 'آخر 30 يوماً',
    all: 'جميع الفترات',
  };

  const handlePrint = () => {
    setShowPrintSizeModal(true);
  };

  const handleConfirmPrint = (layout: PrintLayoutSize, mode: 'print' | 'pdf' = 'print') => {
    exportAndPrintAllDriversReport(driversWithPeriodStats, filteredOrders, {
      periodLabel: timeRangeLabels[timeRange],
      generatedBy: 'مدير العمليات والتشغيل',
      autoPrint: mode === 'print',
      initialLayout: layout,
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <PrintSizeSelectorModal
        isOpen={showPrintSizeModal}
        onClose={() => setShowPrintSizeModal(false)}
        onPrint={handleConfirmPrint}
        onConfirmPrint={handleConfirmPrint}
        reportTitle={`التقرير الشامل لعمليات أسطول كباتن الدليفري (${timeRangeLabels[timeRange]})`}
        recordCount={filteredOrders.length}
      />

      <div
        id="global-delivery-report-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn"
        dir="rtl"
      >
      <div className="bg-neutral-900 border border-neutral-700/90 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-neutral-800 via-neutral-850 to-neutral-900 border-b border-neutral-700/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
              <Bike className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight leading-tight">
                  التقرير الشامل لعمليات كباتن الدليفري والتوصيل
                </h3>
                <span className="px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                  سعر التوصيل فقط
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-neutral-400 mt-1 sm:mt-0.5 max-w-xl leading-relaxed">
                كشف إحصائي كامل لجميع مناديب التوصيل، الطلبات المنجزة، ورسوم التوصيل المحققة بدقة عالية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] sm:text-xs font-bold border border-neutral-600 transition-all cursor-pointer shadow-sm hover:border-amber-500/50"
              title="طباعة التقرير الشامل A4"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span>طباعة وتصدير PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-neutral-800/80 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-300 border border-neutral-700 flex items-center justify-center transition-all cursor-pointer shrink-0"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Filters and Time Period Selector */}
        <div className="px-4 sm:px-6 py-4 bg-neutral-850 border-b border-neutral-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-1 bg-neutral-900/90 p-1 rounded-xl border border-neutral-750 overflow-x-auto custom-scrollbar">
            {(['all', 'today', 'week', 'month'] as TimeRange[]).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-1 sm:flex-none text-center ${
                  timeRange === range
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                }`}
              >
                {timeRangeLabels[range]}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث باسم الكابتن أو الهاتف..."
                className="w-full bg-neutral-900 border border-neutral-750 rounded-xl py-2 sm:py-1.5 pr-8 sm:pr-9 pl-3 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all"
              />
            </div>

            <div className="flex items-center gap-1 bg-neutral-900/90 p-1 rounded-xl border border-neutral-750 shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 sm:px-2.5 py-1.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-bold cursor-pointer transition-colors flex-1 sm:flex-none text-center ${
                  statusFilter === 'all' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                }`}
              >
                الكل
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-3 sm:px-2.5 py-1.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-bold cursor-pointer transition-colors flex-1 sm:flex-none text-center ${
                  statusFilter === 'active' ? 'bg-emerald-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                }`}
              >
                نشط
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 sm:px-2.5 py-1.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-bold cursor-pointer transition-colors flex-1 sm:flex-none text-center ${
                  statusFilter === 'inactive' ? 'bg-rose-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                }`}
              >
                معطل
              </button>
            </div>
          </div>
        </div>

        {/* Content Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="bg-neutral-800/80 border border-neutral-700/60 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
                <span className="font-bold">طلبات التوصيل المسلمة</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">
                {totalCompletedDeliveryOrders} <span className="text-xs font-normal text-neutral-400">طلب</span>
              </div>
              <div className="text-[10px] text-emerald-400 mt-1">توصيل ناجح خلال الفترة</div>
            </div>

            <div className="bg-gradient-to-br from-emerald-950/30 to-neutral-800/90 border border-emerald-500/30 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-emerald-400 text-xs mb-1">
                <span className="font-bold flex-1 leading-tight">إجمالي رسوم التوصيل المحققة</span>
                <DollarSign className="w-4 h-4 text-emerald-400 shrink-0 mr-1" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono mt-1">
                {totalDeliveryFeesCollected.toLocaleString('en-US')} <span className="text-xs font-bold">ج.م</span>
              </div>
              <div className="text-[10px] text-emerald-300/80 mt-1 leading-tight">سعر التوصيل فقط (بدون أسعار المنتجات)</div>
            </div>

            <div className="bg-neutral-800/80 border border-neutral-700/60 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
                <span className="font-bold">طلبات جارية الآن</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                {activeDeliveriesNow} <span className="text-xs font-normal text-neutral-400">طلب</span>
              </div>
              <div className="text-[10px] text-amber-300/80 mt-1">قيد التوصيل مع الكباتن الآن</div>
            </div>

            <div className="bg-neutral-800/80 border border-neutral-700/60 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
                <span className="font-bold">كباتن بالخدمة</span>
                <UserCheck className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">
                {drivers.filter((d) => d.status === 'active').length} <span className="text-lg text-neutral-500 font-normal">/ {drivers.length}</span>
              </div>
              <div className="text-[10px] text-sky-300/80 mt-1">
                متوسط {totalCompletedDeliveryOrders > 0 ? (totalDeliveryFeesCollected / totalCompletedDeliveryOrders).toFixed(1) : 0} ج.م / طلب
              </div>
            </div>
          </div>

          {/* Note Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-xs text-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="font-bold block text-amber-300">
                الفصل المالي الدقيق بين إحصائيات الدليفري والتحليلات العامة:
              </strong>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                في هذا التقرير، تُحسب حصرياً <strong>رسوم التوصيل فقط</strong> الخاصة بكل كابتن دليفري. سعر وأصناف المنتجات مفصولة تماماً وتُحسب في خانة "التحليلات والتقارير العامة" لضمان أقصى دقة حسابية ومنع تداخل الحسابات.
              </p>
            </div>
          </div>

          {/* Unassigned Warning if any */}
          {unassignedCompletedOrders.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-xs text-rose-300">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>
                  يوجد <strong>{unassignedCompletedOrders.length}</strong> طلب توصيل مكتمل تم إنهاؤه بدون تحديد كابتن مسند.
                </span>
              </div>
              <span className="text-[11px] text-rose-400 font-mono">
                إجمالي رسوم التوصيل غير المسندة: {unassignedCompletedOrders.reduce((sum, o) => sum + Number(o.deliveryFee || 0), 0)} ج.م
              </span>
            </div>
          )}

          {/* Comparative Table of All Drivers */}
          <div className="bg-neutral-800/70 border border-neutral-700/80 rounded-2xl overflow-hidden shadow-lg">
            <div className="px-4 py-3 bg-neutral-800 border-b border-neutral-700/80 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span>ترتيب وأداء كباتن التوصيل ({displayedDrivers.length} كابتن):</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-neutral-400 hidden sm:inline">
                  مرتب بحسب إجمالي رسوم التوصيل المحققة
                </span>
                <div className="flex items-center gap-1 bg-neutral-900/90 p-1 rounded-xl border border-neutral-700">
                  <button
                    type="button"
                    onClick={() => scrollTable('right')}
                    className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-300 hover:text-amber-400 transition-all cursor-pointer flex items-center gap-1 text-[11px]"
                    title="تمرير لليمين"
                  >
                    <ChevronRight className="w-4 h-4" />
                    <span className="hidden sm:inline">يمين</span>
                  </button>
                  <div className="w-[1px] h-4 bg-neutral-700"></div>
                  <button
                    type="button"
                    onClick={() => scrollTable('left')}
                    className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-300 hover:text-amber-400 transition-all cursor-pointer flex items-center gap-1 text-[11px]"
                    title="تمرير لليسار"
                  >
                    <span className="hidden sm:inline">يسار</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div ref={tableScrollRef} className="overflow-x-auto scroll-smooth custom-scrollbar">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-neutral-850/80 text-neutral-400 border-b border-neutral-700 font-bold text-[11px]">
                    <th className="py-3 px-3 text-center w-10">#</th>
                    <th className="py-3 px-3">الكابتن</th>
                    <th className="py-3 px-3 text-left">الهاتف</th>
                    <th className="py-3 px-3 text-center">الحالة</th>
                    <th className="py-3 px-3 text-center">الطلبات المسلمة</th>
                    <th className="py-3 px-3 text-center">المساهمة</th>
                    <th className="py-3 px-3 text-center">رسوم التوصيل (فقط)</th>
                    <th className="py-3 px-3 text-center">طلبات جارية</th>
                    <th className="py-3 px-3 text-center">آخر تسليم</th>
                    <th className="py-3 px-3 text-center">كشف الحساب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-700/60">
                  {displayedDrivers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-neutral-400">
                        لا يوجد كباتن مطابقين لمعايير التصفية المحددة
                      </td>
                    </tr>
                  ) : (
                    displayedDrivers.map((driver, idx) => {
                      const completedCount = driver.orderCount || 0;
                      const fees = driver.deliveredRevenue || 0;
                      const active = driver.activeOrdersCount || 0;
                      const share = totalCompletedDeliveryOrders > 0
                        ? Math.round((completedCount / totalCompletedDeliveryOrders) * 100)
                        : 0;

                      return (
                        <tr
                          key={driver.id}
                          className="hover:bg-neutral-750/50 transition-colors group"
                        >
                          <td className="py-3 px-3 text-center font-bold text-neutral-500">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3 font-bold text-white">
                            <div className="flex items-center gap-2">
                              <span>{driver.name}</span>
                              {driver.vehicleType && (
                                <span className="text-[10px] text-neutral-400 font-normal">
                                  {driver.vehicleType === 'motorcycle' ? '🛵' : driver.vehicleType === 'bicycle' ? '🚲' : '🚗'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td dir="ltr" className="py-3 px-3 text-left font-mono text-neutral-300 text-[11px]">
                            {driver.phone}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {driver.status === 'active' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                نشط
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                معطل
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-sky-400 font-mono">
                            {completedCount}
                          </td>
                          <td className="py-3 px-3 text-center text-neutral-400 font-mono text-[11px]">
                            {share}%
                          </td>
                          <td className="py-3 px-3 text-center font-black text-emerald-400 font-mono text-sm">
                            {fees.toLocaleString('en-US')} ج.م
                          </td>
                          <td className="py-3 px-3 text-center">
                            {active > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                🟡 {active}
                              </span>
                            ) : (
                              <span className="text-neutral-500 text-[11px]">0</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center text-[11px] text-neutral-400">
                            {driver.lastDeliveredAt
                              ? new Date(driver.lastDeliveredAt).toLocaleDateString('ar-EG', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                if (onOpenDriverStatement) {
                                  onOpenDriverStatement(driver);
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-neutral-700 hover:bg-amber-500 hover:text-neutral-950 text-white text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                              title="عرض كشف حساب هذا الكابتن"
                            >
                              <span>تقرير الكابتن</span>
                              <ChevronLeft className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-neutral-850 border-t border-neutral-750 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-neutral-400">
            الفترة المحددة: <strong className="text-white">{timeRangeLabels[timeRange]}</strong> • عدد الكباتن: <strong className="text-white">{displayedDrivers.length}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition-all cursor-pointer flex items-center gap-2 shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف الدليفري الشامل</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold transition-all cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};
