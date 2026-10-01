import React, { useState, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  Calendar,
  DollarSign,
  User,
  Phone,
  Store,
  Truck,
  FileText,
  Search,
  Download,
  ExternalLink,
  ChevronDown,
  ShoppingBag,
  Trash2,
  Loader2,
  Printer,
  FileDown,
  Eye,
} from 'lucide-react';
import { Order } from '../../../types';
import { formatPrice } from '../../../lib/utils';
import { Button } from '../../ui/Button';
import { firebaseOrderService } from '../../../services/firebaseOrderService';
import {
  exportAndPrintSingleInvoice,
  exportAndPrintCompletedOrdersRegister,
} from '../../../services/pdfReportGenerator';
import {
  getOrderProductsTotal,
  getOrderDeliveryFee,
  getOrderTotal,
} from '../../../services/orderAnalyticsEngine';

interface CompletedOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  periodLabel: string;
  totalRevenue: number;
  onSelectOrder?: (order: Order) => void;
  onOrderDeleted?: (orderId: string) => void;
}

export const CompletedOrdersModal: React.FC<CompletedOrdersModalProps> = ({
  isOpen,
  onClose,
  orders,
  periodLabel,
  totalRevenue,
  onSelectOrder,
  onOrderDeleted,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter completed orders with strict deduplication
  const completedOrders = useMemo(() => {
    if (!isOpen) return [];
    const matched = orders.filter((o) => {
      const st = (o.status || '').toLowerCase();
      if (st !== 'completed' && st !== 'delivered') return false;
      
      // Branch filter
      if (selectedBranchFilter !== 'all') {
        const bId = o.branch?.id || o.branchId || '';
        if (bId !== selectedBranchFilter) return false;
      }

      // Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const numMatch = (o.orderNumber || '').toLowerCase().includes(q);
        const nameMatch = (o.customer?.name || o.customerName || '').toLowerCase().includes(q);
        const phoneMatch = (o.customer?.phone || o.customerPhone || '').includes(q);
        const idMatch = (o.id || '').toLowerCase().includes(q);
        return numMatch || nameMatch || phoneMatch || idMatch;
      }

      return true;
    });

    const seen = new Set<string>();
    return matched.filter((o) => {
      const key = (o.id || o.orderNumber || '').toString().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [isOpen, orders, selectedBranchFilter, searchTerm]);

  const handleDeleteConfirmed = async () => {
    if (!orderToDelete) return;
    try {
      setIsDeleting(true);
      await firebaseOrderService.deleteOrder(orderToDelete.id, orderToDelete.orderNumber);
      if (onOrderDeleted) {
        onOrderDeleted(orderToDelete.id);
      }
      setOrderToDelete(null);
    } catch (err) {
      console.error('Failed to delete completed order:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  // Calculate separated revenue metrics
  const currentProductsRevenue = completedOrders.reduce((sum, o) => sum + getOrderProductsTotal(o), 0);
  const currentDeliveryFees = completedOrders.reduce((sum, o) => sum + getOrderDeliveryFee(o), 0);
  const currentTotalRevenue = completedOrders.reduce((sum, o) => sum + getOrderTotal(o), 0);

  // Unique branches for filter dropdown
  const branches = Array.from(
    new Map(
      orders
        .filter((o) => o.branch?.id || o.branchId)
        .map((o) => [
          o.branch?.id || o.branchId || '',
          o.branch?.nameAr || o.branchNameAr || 'فرع',
        ])
    ).entries()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" dir="rtl">
      <div className="bg-neutral-900 border-0 sm:border border-neutral-800 rounded-none sm:rounded-3xl w-full max-w-5xl h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Sticky Header */}
        <div className="shrink-0 p-3.5 sm:p-5 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur z-10">
          <div className="flex items-start justify-between gap-3">
            {/* Title & Info */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-xl font-black text-white leading-tight truncate">سجل وفواتير الطلبات المكتملة</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] sm:text-xs font-mono font-bold whitespace-nowrap shrink-0">
                    {completedOrders.length} فاتورة مسجلة
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-neutral-400 mt-0.5 truncate">
                  الفترة: <strong className="text-amber-400 font-bold">{periodLabel}</strong> • الإيرادات المعتمدة
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="إغلاق"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-neutral-800">
            {/* Export Register as PDF */}
            <button
              type="button"
              onClick={() => exportAndPrintCompletedOrdersRegister(completedOrders, { periodLabel, totalRevenue: currentTotalRevenue, autoPrint: false })}
              className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5BF45] hover:to-[#C9A533] text-black text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer whitespace-nowrap"
              title="استخراج وتصدير سجل الفواتير المكتملة كملف PDF"
            >
              <FileDown className="w-4 h-4 shrink-0" />
              <span>تصدير السجل كـ PDF</span>
            </button>

            {/* Instant Print Register */}
            <button
              type="button"
              onClick={() => exportAndPrintCompletedOrdersRegister(completedOrders, { periodLabel, totalRevenue: currentTotalRevenue, autoPrint: true })}
              className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-[#E5D7B7] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm whitespace-nowrap"
              title="طباعة فورية لسجل الفواتير عبر الطابعة"
            >
              <Printer className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span>طباعة فورية</span>
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body: KPI Cards + Filters + Orders */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-6 space-y-4" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Revenue Summary KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {/* Card 1: Bamborina Products Revenue */}
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col justify-between shadow-sm">
              <div className="flex items-start justify-between gap-1 mb-1">
                <div className="min-w-0">
                  <span className="text-[11px] sm:text-xs text-emerald-400 font-black block truncate">مبيعات أصناف بامبورينا</span>
                  <span className="text-[9px] sm:text-[10px] text-emerald-400/80 block leading-tight">ثمن الأصناف فقط (بدون توصيل)</span>
                </div>
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-xl sm:text-2xl font-black text-emerald-300 font-mono leading-none">
                  {currentProductsRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] sm:text-xs text-emerald-400 font-bold">ج.م</span>
              </div>
            </div>

            {/* Card 2: Delivery Fees for Drivers */}
            <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col justify-between shadow-sm">
              <div className="flex items-start justify-between gap-1 mb-1">
                <div className="min-w-0">
                  <span className="text-[11px] sm:text-xs text-amber-400 font-black block truncate">رسوم خدمات التوصيل</span>
                  <span className="text-[9px] sm:text-[10px] text-amber-400/80 block leading-tight">تذهب لكباتن الدليفري فقط</span>
                </div>
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-xl sm:text-2xl font-black text-amber-300 font-mono leading-none">
                  {currentDeliveryFees.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] sm:text-xs text-amber-400 font-bold">ج.م</span>
              </div>
            </div>

            {/* Card 3: Combined Gross Revenue */}
            <div className="bg-sky-950/30 border border-sky-500/30 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col justify-between shadow-sm">
              <div className="flex items-start justify-between gap-1 mb-1">
                <div className="min-w-0">
                  <span className="text-[11px] sm:text-xs text-sky-400 font-black block truncate">إجمالي الفواتير الشاملة</span>
                  <span className="text-[9px] sm:text-[10px] text-sky-400/80 block leading-tight">الأصناف + رسوم التوصيل</span>
                </div>
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-xl sm:text-2xl font-black text-sky-300 font-mono leading-none">
                  {currentTotalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] sm:text-xs text-sky-400 font-bold">ج.م</span>
              </div>
            </div>

            {/* Card 4: Completed Orders Count */}
            <div className="bg-neutral-800/80 border border-neutral-700/60 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col justify-between shadow-sm">
              <div className="flex items-start justify-between gap-1 mb-1">
                <div className="min-w-0">
                  <span className="text-[11px] sm:text-xs text-neutral-300 font-black block truncate">الفواتير المنفذة</span>
                  <span className="text-[9px] sm:text-[10px] text-neutral-400 block leading-tight truncate">
                    متوسط: {completedOrders.length > 0 ? (currentTotalRevenue / completedOrders.length).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) : '0'} ج.م
                  </span>
                </div>
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-neutral-700 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-xl sm:text-2xl font-black text-white font-mono leading-none">{completedOrders.length}</span>
                <span className="text-[11px] sm:text-xs text-neutral-400 font-bold">طلب</span>
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث برقم الطلب (ORDER-01...) أو اسم العميل أو الهاتف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-neutral-800/90 border border-neutral-700 rounded-xl pr-9 pl-4 py-2 sm:py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {branches.length > 0 && (
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 sm:py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 w-full sm:w-auto"
              >
                <option value="all">جميع الفروع</option>
                {branches.map(([bId, bName]) => (
                  <option key={bId} value={bId}>
                    {bName}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Orders Table List */}
          <div className="space-y-3 pt-1">
          {completedOrders.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-neutral-800 rounded-2xl">
              <CheckCircle2 className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
              <p className="text-base font-bold text-neutral-300">لا توجد طلبات مكتملة تطابق هذا البحث</p>
              <p className="text-xs text-neutral-500 mt-1">تأكد من اختيار الفترة الزمنية أو معايير الفلترة المناسبة</p>
            </div>
          ) : (
            completedOrders.map((order, idx) => {
              const isExpanded = expandedOrderId === order.id;
              const total = Number(order.pricing?.total ?? order.grandTotal ?? 0);
              const dateFormatted = order.createdAt
                ? new Date(order.createdAt).toLocaleString('ar-EG', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : 'غير محدد';
              const modalOrderKey = order.id ? `${order.id}-${idx}` : `completed-order-${order.orderNumber || idx}-${idx}`;

              return (
                <div
                  key={modalOrderKey}
                  className="bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/60 rounded-2xl p-4 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Order Details */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-black text-amber-400 text-sm">
                          {order.orderNumber || order.id}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
                          مكتمل ومسدد ✓
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-neutral-700 text-neutral-300 text-[11px]">
                          {order.orderType === 'pickup' ? 'استلام من الفرع' : 'توصيل للمنزل'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-neutral-700/60 text-neutral-400 text-[11px]">
                          {order.paymentMethodAr || (order.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' : 'عند الاستلام')}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-300 pt-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-neutral-400" />
                          <strong className="text-white">{order.customer?.name || order.customerName || 'عميل'}</strong>
                        </span>
                        {order.customer?.phone || order.customerPhone ? (
                          <a
                            href={`tel:${order.customer?.phone || order.customerPhone}`}
                            className="flex items-center gap-1 font-mono text-neutral-300 hover:text-amber-400 underline decoration-amber-500/40"
                            dir="ltr"
                            title="اتصال بالعميل"
                          >
                            <Phone className="w-3.5 h-3.5 text-amber-500" />
                            <span>{order.customer?.phone || order.customerPhone}</span>
                          </a>
                        ) : (
                          <span className="flex items-center gap-1 font-mono text-neutral-500" dir="ltr">
                            <Phone className="w-3.5 h-3.5 text-neutral-600" />
                            <span>بدون هاتف</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-neutral-400">
                          <Store className="w-3.5 h-3.5 text-neutral-500" />
                          {order.branch?.nameAr || order.branchNameAr || 'الفرع الرئيسي'}
                        </span>
                        <span className="flex items-center gap-1 text-neutral-500 text-[11px]">
                          <Calendar className="w-3 h-3 text-neutral-500" />
                          {dateFormatted}
                        </span>
                      </div>
                    </div>

                    {/* Order Price & Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-neutral-700/40">
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                        <span className="sm:hidden text-xs text-neutral-400 font-bold">الحساب:</span>
                        <div className="text-left sm:text-right">
                          <div className="text-[10px] text-neutral-400 flex items-center gap-1.5 justify-end">
                            <span>أصناف: <strong className="text-white font-mono">{getOrderProductsTotal(order).toLocaleString('en-US')} ج.م</strong></span>
                            {getOrderDeliveryFee(order) > 0 && (
                              <>
                                <span>•</span>
                                <span>توصيل: <strong className="text-amber-400 font-mono">{getOrderDeliveryFee(order).toLocaleString('en-US')} ج.م</strong></span>
                              </>
                            )}
                          </div>
                          <div className="flex items-baseline gap-1 justify-end mt-0.5">
                            <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
                              {getOrderTotal(order).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-xs text-emerald-400 font-bold">ج.م</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                        {/* Instant Print */}
                        <button
                          type="button"
                          onClick={() => exportAndPrintSingleInvoice(order, 'print')}
                          className="flex-1 sm:flex-initial px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm hover:scale-[1.02] whitespace-nowrap"
                          title="طباعة فورية للطابعة"
                        >
                          <Printer className="w-3.5 h-3.5 shrink-0" />
                          <span>طباعة فورية</span>
                        </button>

                        {/* PDF Export */}
                        <button
                          type="button"
                          onClick={() => exportAndPrintSingleInvoice(order, 'pdf')}
                          className="flex-1 sm:flex-initial px-2.5 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm hover:scale-[1.02] whitespace-nowrap"
                          title="استخراج وتصدير كملف PDF"
                        >
                          <FileDown className="w-3.5 h-3.5 shrink-0" />
                          <span>PDF</span>
                        </button>

                        <button
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className="flex-1 sm:flex-initial px-2.5 py-1.5 rounded-xl bg-neutral-700/80 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <span>الأصناف ({order.items?.length || 0})</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <button
                          onClick={() => setOrderToDelete(order)}
                          className="p-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 transition-colors cursor-pointer shrink-0"
                          title="حذف هذا الطلب نهائياً"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Items Breakdown */}
                  {isExpanded && order.items && order.items.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-neutral-700/60 space-y-2 bg-neutral-900/60 rounded-xl p-3">
                      <div className="text-[11px] font-bold text-neutral-400 mb-2">محتويات الطلب:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {order.items.map((item: any, idx: number) => (
                          <div
                            key={idx}
                            className="bg-neutral-800 border border-neutral-700/50 rounded-lg p-2 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-white">{item.nameAr || item.name}</span>
                              {item.selectedVariant && (
                                <span className="text-[10px] text-amber-400 mr-1.5 font-normal">
                                  ({item.selectedVariant.nameAr})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 font-mono">
                              <span className="text-amber-400 font-bold">{item.quantity}×</span>
                              <span className="text-emerald-400">{Number(item.totalPrice || item.unitPrice * item.quantity).toLocaleString()} ج.م</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
          </div>
        </div>

        {/* Footer Modal */}
        <div className="shrink-0 p-3.5 sm:p-4 border-t border-neutral-800 bg-neutral-900/95 backdrop-blur flex items-center justify-between gap-2 z-10">
          <span className="text-[11px] sm:text-xs text-neutral-400">
            تم فحص <strong className="text-white font-mono">{completedOrders.length}</strong> فاتورة مكتملة ومطابقتها مع إجمالي الإيرادات
          </span>
          <Button onClick={onClose} variant="outline" className="text-xs px-4 sm:px-5 py-1.5 sm:py-2 shrink-0">
            إغلاق
          </Button>
        </div>
      </div>

      {/* Delete Single Order Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm dir-rtl">
          <div className="bg-neutral-900 border border-rose-900/80 rounded-3xl p-6 max-w-md w-full text-white space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h4 className="text-base font-black text-white">حذف الفاتورة نهائياً</h4>
                <p className="text-xs text-rose-300/80 font-mono">#{orderToDelete.orderNumber}</p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950/60 p-3.5 rounded-2xl border border-neutral-800">
              هل أنت متأكد من رغبتك في حذف هذا الطلب نهائياً من قاعدة البيانات؟ سيتم مسح الفاتورة نهائياً.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirmed}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-500 transition-all cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>نعم، حذف نهائي</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
