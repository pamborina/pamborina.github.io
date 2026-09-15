import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Store,
  Phone,
  Search,
  RefreshCw,
  Eye,
  X,
  User,
  MapPin,
  FileText,
  DollarSign,
  Send,
  Loader2,
  CookingPot,
  Sparkles,
  Package,
  Trash2,
  AlertTriangle,
  RotateCcw,
  CheckSquare,
  Square,
  Filter,
  ShieldCheck,
  MessageCircle,
  Printer,
  FileDown,
  Bike,
} from 'lucide-react';
import { Order, OrderStatus, DeliveryDriver } from '../../../types';
import { firebaseOrderService } from '../../../services/firebaseOrderService';
import { deliveryDriverService } from '../../../services/deliveryDriverService';
import { firebaseAuthService } from '../../../services/firebaseAuthService';
import { storageService } from '../../../services/storageService';
import { exportAndPrintSingleInvoice } from '../../../services/pdfReportGenerator';
import {
  getOrderStatusLabel,
  getOrderStatusStyle,
  getStatusActionLabel,
  canTransition,
} from '../../../lib/orderStatus';
import { formatPrice, normalizeSearchTerm, normalizeOrderNumber } from '../../../lib/utils';
import { useToast } from '../../ui/Toast';
import { useRBAC } from '../../../context/RBACContext';
import { SystemResetModal } from '../modals/SystemResetModal';
import { EditDeliveryFeeModal } from '../modals/EditDeliveryFeeModal';

const ORDER_WORKFLOW_STAGES = [
  {
    id: 'pending' as OrderStatus,
    stepNum: 1,
    label: 'قيد الانتظار',
    badge: 'انتظار ⏳',
    desc: 'تم استلام طلبك وجاري مراجعته وتأكيده من الفرع',
    bgClass: 'bg-amber-950/60 border-amber-500/40 text-amber-300',
    activeBtn: 'bg-amber-500 text-neutral-950 hover:bg-amber-400',
  },
  {
    id: 'confirmed' as OrderStatus,
    stepNum: 2,
    label: 'مؤكد',
    badge: 'مؤكد ✓',
    desc: 'تم تأكيد وقبول طلبك في الفرع بنجاح',
    bgClass: 'bg-blue-950/60 border-blue-500/40 text-blue-300',
    activeBtn: 'bg-blue-600 text-white hover:bg-blue-500',
  },
  {
    id: 'preparing' as OrderStatus,
    stepNum: 3,
    label: 'جاري التحضير',
    badge: 'تجهيز 👨‍🍳',
    desc: 'شيف بامبورينا يجهز طلبك الآن بأعلى معايير الجودة',
    bgClass: 'bg-purple-950/60 border-purple-500/40 text-purple-300',
    activeBtn: 'bg-purple-600 text-white hover:bg-purple-500',
  },
  {
    id: 'ready' as OrderStatus,
    stepNum: 4,
    label: 'جاهز',
    badge: 'جاهز 🛵',
    desc: 'الطلب جاهز تماماً للاستلام أو التوصيل',
    bgClass: 'bg-teal-950/60 border-teal-500/40 text-teal-300',
    activeBtn: 'bg-teal-600 text-white hover:bg-teal-500',
  },
  {
    id: 'completed' as OrderStatus,
    stepNum: 5,
    label: 'مكتمل',
    badge: 'مكتمل 💖',
    desc: 'تم تسليم الطلب بنجاح للعميل، بالهناء والشفاء!',
    bgClass: 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300',
    activeBtn: 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400',
  },
  {
    id: 'cancelled' as OrderStatus,
    stepNum: 6,
    label: 'ملغي',
    badge: 'ملغي ✕',
    desc: 'تم إلغاء هذا الطلب',
    bgClass: 'bg-rose-950/60 border-rose-500/40 text-rose-300',
    activeBtn: 'bg-rose-600 text-white hover:bg-rose-500',
  },
];
export const AdminOrdersTab: React.FC = () => {
  const { showToast } = useToast();
  const { hasPermission, isAdmin } = useRBAC();

  // Granular RBAC Permissions
  const canUpdateStatus = isAdmin || hasPermission('orders.update_status');
  const canDeleteOrder = isAdmin || hasPermission('orders.delete');
  const canBulkDelete = isAdmin || hasPermission('orders.bulk_delete');
  const canReset = isAdmin || hasPermission('orders.reset');
  const canPrint = isAdmin || hasPermission('orders.print');
  const canEditDeliveryFee = isAdmin || hasPermission('orders.edit');

  // Primary Realtime State
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingDeliveryFeeOrder, setEditingDeliveryFeeOrder] = useState<Order | null>(null);

  const handleDeliveryFeeSuccess = (updatedOrder: Order) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id || o.orderNumber === updatedOrder.orderNumber ? updatedOrder : o))
    );
    if (selectedOrder && (selectedOrder.id === updatedOrder.id || selectedOrder.orderNumber === updatedOrder.orderNumber)) {
      setSelectedOrder(updatedOrder);
    }
    showToast(
      'تم تحديد سعر التوصيل بنجاح ✓',
      `تم اعتماد ${(updatedOrder.pricing?.deliveryFee ?? updatedOrder.deliveryFee ?? 0)} ج.م وتحديث فاتورة العميل وإجمالي الطلب (${(updatedOrder.pricing?.total ?? updatedOrder.grandTotal ?? 0)} ج.م)`,
      'success'
    );
  };

  // Auto Print configurations to prevent infinite print loops
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(() => {
    try {
      return localStorage.getItem('pamborina_auto_print') === 'true';
    } catch {
      return false;
    }
  });

  const autoPrintEnabledRef = useRef(autoPrintEnabled);
  useEffect(() => {
    autoPrintEnabledRef.current = autoPrintEnabled;
    try {
      localStorage.setItem('pamborina_auto_print', autoPrintEnabled ? 'true' : 'false');
    } catch {}
  }, [autoPrintEnabled]);

  const autoPrintedOrderIdsRef = useRef<Set<string>>(new Set());

  // Manual Refresh Handler
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const freshOrders = await firebaseOrderService.getOrders(300);
      setOrders(freshOrders || []);
      setLastRefreshedAt(new Date());
      showToast(
        'تم تحديث الطلبات بنجاح ✓',
        `تم مزامنة ${freshOrders?.length || 0} طلب مباشرة من السيرفر وقاعدة البيانات`,
        'success'
      );
    } catch (err: any) {
      showToast('تعذر التحديث', err?.message || 'يرجى التأكد من اتصال الإنترنت', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Concurrency & Double Click Protection (Per-order set)
  const [updatingOrderIds, setUpdatingOrderIds] = useState<Set<string>>(new Set());

  // Multi-select & Bulk Deletion
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Single Delete Modal
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<Order | null>(null);
  const [isDeletingOrderId, setIsDeletingOrderId] = useState<string | null>(null);

  // Clean Old Orders Wizard Modal
  const [showCleanModal, setShowCleanModal] = useState(false);
  const [cleanMode, setCleanMode] = useState<'completed' | 'cancelled' | 'both'>('both');
  const [isCleaning, setIsCleaning] = useState(false);

  // System Reset Safety Wizard Modal
  const [showResetModal, setShowResetModal] = useState(false);

  // Cancel Order Modal
  const [cancelConfirm, setCancelConfirm] = useState<{ order: Order; newStatus: OrderStatus } | null>(null);

  // Delivery Drivers State for Assignment
  const [availableDrivers, setAvailableDrivers] = useState<DeliveryDriver[]>([]);
  const [assigningDriverOrder, setAssigningDriverOrder] = useState<Order | null>(null);
  const [isAssigningDriver, setIsAssigningDriver] = useState(false);

  // Activity logs
  const [activities, setActivities] = useState<any[]>([]);

  // Subscribe to Drivers
  useEffect(() => {
    const unsubDrivers = deliveryDriverService.subscribeToDrivers((drivers) => {
      setAvailableDrivers(drivers);
    });
    return () => unsubDrivers();
  }, []);

  // Handle Driver Assignment
  const handleAssignDriver = async (order: Order, driver: DeliveryDriver | null) => {
    setIsAssigningDriver(true);
    try {
      await firebaseOrderService.assignDriverToOrder(
        order.id,
        driver ? { id: driver.id, name: driver.name, phone: driver.phone } : null
      );
      showToast(
        'تم تحديث المندوب',
        driver
          ? `تم تعيين الكابتن "${driver.name}" للطلب #${order.orderNumber}`
          : `تم إلغاء تعيين المندوب من الطلب #${order.orderNumber}`,
        'success'
      );
      setAssigningDriverOrder(null);
    } catch (err: any) {
      showToast('خطأ في التعيين', err.message || 'فشل تعيين المندوب للطلب', 'error');
    } finally {
      setIsAssigningDriver(false);
    }
  };

  // Realtime Subscription to Firestore (Single Source of Truth)
  useEffect(() => {
    setIsLoading(true);

    const unsubscribe = firebaseOrderService.subscribeToOrders(
      (realtimeOrders) => {
        setOrders(realtimeOrders || []);

        // Sync open detail modal if order updated
        setSelectedOrder((prev) => {
          if (!prev) return null;
          const updated = (realtimeOrders || []).find((o) => o.id === prev.id);
          return updated || prev;
        });

        // Auto-print newly arrived orders if enabled
        if (autoPrintEnabledRef.current && realtimeOrders && realtimeOrders.length > 0) {
          const nowMs = Date.now();
          realtimeOrders.forEach((order) => {
            const isPending = order.status === 'pending';
            const orderTime = order.createdAt ? new Date(order.createdAt).getTime() : nowMs;
            const isRecent = nowMs - orderTime < 5 * 60 * 1000;
            
            if (isPending && isRecent && !autoPrintedOrderIdsRef.current.has(order.id)) {
              autoPrintedOrderIdsRef.current.add(order.id);
              console.log('[AdminOrdersTab] Auto-printing new order:', order.orderNumber || order.id);
              exportAndPrintSingleInvoice(order, 'print');
            }
          });
        }

        setIsLoading(false);
      },
      (error) => {
        console.log('[AdminOrdersTab] Realtime orders sync notice (using active polling fallback):', error?.message || error);
        setIsLoading(false);
      }
    );

    try {
      const logs = storageService.getActivityLog();
      setActivities(logs || []);
    } catch {
      setActivities([]);
    }

    return () => {
      unsubscribe();
    };
  }, []);

  // Filter & Search Logic with Normalization and Guaranteed Deduplication
  const filteredOrders = useMemo(() => {
    const normalizedQuery = normalizeSearchTerm(searchQuery);

    const matches = orders.filter((order) => {
      const matchesStatus =
        activeStatusFilter === 'all'
          ? true
          : order.status === activeStatusFilter;

      if (!matchesStatus) return false;
      if (!normalizedQuery) return true;

      const normOrderNum = normalizeSearchTerm(order.orderNumber || '');
      const normOrderId = normalizeSearchTerm(order.id || '');
      const normCustName = normalizeSearchTerm(order.customer?.name || order.customerName || '');
      const normCustPhone = normalizeSearchTerm(order.customer?.phone || order.customerPhone || '');
      const normBranch = normalizeSearchTerm(order.branch?.nameAr || order.branchNameAr || '');

      return (
        normOrderNum.includes(normalizedQuery) ||
        normOrderId.includes(normalizedQuery) ||
        normCustName.includes(normalizedQuery) ||
        normCustPhone.includes(normalizedQuery) ||
        normBranch.includes(normalizedQuery)
      );
    });

    // Deduplicate by resolved canonical key
    const seen = new Set<string>();
    return matches.filter((o) => {
      const key = (o.id || o.orderNumber || '').toString().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [orders, activeStatusFilter, searchQuery]);

  // Counts for status tabs (deduplicated)
  const statusCounts = useMemo(() => {
    const seen = new Set<string>();
    const uniqueOrders = orders.filter((o) => {
      const key = (o.id || o.orderNumber || '').toString().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      all: uniqueOrders.length,
      pending: uniqueOrders.filter((o) => o.status === 'pending').length,
      confirmed: uniqueOrders.filter((o) => o.status === 'confirmed').length,
      preparing: uniqueOrders.filter((o) => o.status === 'preparing').length,
      ready: uniqueOrders.filter((o) => o.status === 'ready').length,
      completed: uniqueOrders.filter((o) => o.status === 'completed').length,
      cancelled: uniqueOrders.filter((o) => o.status === 'cancelled').length,
    };
  }, [orders]);

  // Handle per-order status transition (Atomic Transaction & Double Click Protection)
  const handleUpdateStatus = async (order: Order, newStatus: OrderStatus, forceSkipConfirm = false) => {
    if (updatingOrderIds.has(order.id)) return; // Double click protection

    if (newStatus === 'cancelled' && !forceSkipConfirm) {
      setCancelConfirm({ order, newStatus });
      return;
    }

    if (!canTransition(order.status, newStatus)) {
      showToast(
        'انتقال غير مسموح',
        `لا يمكن تحويل حالة الطلب من "${getOrderStatusLabel(order.status)}" إلى "${getOrderStatusLabel(newStatus)}"`,
        'error'
      );
      return;
    }

    // Lock ONLY this order
    setUpdatingOrderIds((prev) => new Set(prev).add(order.id));

    try {
      const currentAdmin = firebaseAuthService.getCurrentAdminUser();
      const adminEmail = currentAdmin?.email || 'admin@pamborina.com';
      const adminUid = currentAdmin?.uid || 'admin';

      await firebaseOrderService.updateOrderStatus(order.id, newStatus, {
        noteAr: `تم تحديث الحالة بواسطة الإدارة إلى ${getOrderStatusLabel(newStatus)}`,
        adminEmail,
        adminUid,
      });

      showToast(
        'تم تحديث حالة الطلب بنجاح ✓',
        `تم تغيير حالة الطلب ${order.orderNumber} إلى "${getOrderStatusLabel(newStatus)}"`,
        'success'
      );
    } catch (err: any) {
      console.error('❌ [AdminOrdersTab] Status update error:', err);
      let errorMsg = 'تعذر تنفيذ تغيير حالة الطلب. يرجى المحاولة مرة أخرى.';

      if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
        errorMsg = 'ليس لديك صلاحية كافية لتحديث حالة هذا الطلب.';
      } else if (err?.message?.includes('لا يمكن')) {
        errorMsg = err.message;
      } else if (err?.message) {
        errorMsg = err.message;
      }

      showToast('تعذر التحديث', errorMsg, 'error');
    } finally {
      setUpdatingOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
      setCancelConfirm(null);
    }
  };

  // Selection Logic
  const handleToggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map((o) => o.id)));
    }
  };

  // Handle single order deletion
  const handleDeleteSingleOrder = async (order: Order) => {
    if (isDeletingOrderId) return;
    setIsDeletingOrderId(order.id);

    try {
      // Optimistically remove from state immediately
      setOrders((prev) => prev.filter((o) => o.id !== order.id && o.orderNumber !== order.orderNumber));
      if (selectedOrder?.id === order.id || selectedOrder?.orderNumber === order.orderNumber) {
        setSelectedOrder(null);
      }
      setSelectedOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });

      await firebaseOrderService.deleteOrder(order.id, order.orderNumber);
      showToast('تم حذف الطلب نهائياً ✓', `تم حذف الطلب رقم ${order.orderNumber} نهائياً من كافة السجلات وقاعدة البيانات.`, 'success');
    } catch (err: any) {
      showToast('خطأ في الحذف', err?.message || 'تعذر حذف الطلب من قاعدة البيانات', 'error');
    } finally {
      setIsDeletingOrderId(null);
      setDeleteConfirmOrder(null);
    }
  };

  // Handle bulk deletion of selected orders
  const handleBulkDeleteSelected = async () => {
    if (selectedOrderIds.size === 0) return;
    setIsBulkDeleting(true);

    try {
      const idsArray = Array.from(selectedOrderIds) as string[];
      // Optimistically update orders list
      setOrders((prev) => prev.filter((o) => !selectedOrderIds.has(o.id) && !selectedOrderIds.has(o.orderNumber)));
      setSelectedOrderIds(new Set());
      setShowBulkDeleteModal(false);

      const count = await firebaseOrderService.deleteMultipleOrders(idsArray);
      showToast('تم حذف الطلبات المحددة ✓', `تم حذف ${count} طلب بنجاح وبشكل نهائي من قاعدة البيانات.`, 'success');
    } catch (err: any) {
      showToast('فشل الحذف الجماعي', err?.message || 'حدث خطأ أثناء حذف الطلبات المحددة', 'error');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Handle Clean Old Orders Wizard
  const handleCleanOldOrdersSubmit = async () => {
    setIsCleaning(true);
    try {
      const targetStatuses =
        cleanMode === 'completed'
          ? ['completed' as const]
          : cleanMode === 'cancelled'
          ? ['cancelled' as const]
          : ['completed' as const, 'cancelled' as const];

      // Optimistically filter orders
      setOrders((prev) => prev.filter((o) => !targetStatuses.includes(o.status as any)));
      setShowCleanModal(false);

      const count = await firebaseOrderService.cleanOrdersByFilter(targetStatuses, 0);
      showToast(
        'تم تنظيف الطلبات القديمة ✓',
        count > 0 ? `تم حذف ${count} طلب ينطبق عليه الشرط المحدد بنجاح.` : 'لا توجد طلبات قديمة تنطبق عليها الشروط.',
        count > 0 ? 'success' : 'info'
      );
    } catch (err: any) {
      showToast('فشل التطهير', err?.message || 'تعذر تنظيف الطلبات القديمة', 'error');
    } finally {
      setIsCleaning(false);
    }
  };



  const statusTabs = [
    { id: 'all', label: 'جميع الطلبات', count: statusCounts.all },
    { id: 'pending', label: 'قيد الانتظار', count: statusCounts.pending },
    { id: 'confirmed', label: 'مؤكد', count: statusCounts.confirmed },
    { id: 'preparing', label: 'جاري التحضير', count: statusCounts.preparing },
    { id: 'ready', label: 'جاهز', count: statusCounts.ready },
    { id: 'completed', label: 'مكتمل', count: statusCounts.completed },
    { id: 'cancelled', label: 'ملغي', count: statusCounts.cancelled },
  ];

  return (
    <div className="space-y-6 text-neutral-100 font-sans" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="w-7 h-7 text-amber-400" />
            <span>إدارة ودورة حياة الطلبات (Order Lifecycle)</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            نظام موحد ومتزامن لحظياً مع قاعدة البيانات. مصدر الحقيقة الوحيد لكافة الأقسام.
          </p>
        </div>

        {/* Realtime Status Indicator & Global Actions */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Manual Refresh Button */}
          <button
            id="admin-manual-refresh-orders-btn"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black flex items-center gap-1.5 shadow-md hover:shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            title="تحديث قائمة الطلبات يدوياً وجلب أحدث التغييرات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'جاري التحديث...' : 'تحديث يدوي للطلبات 🔄'}</span>
          </button>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>متصل ومزامن لحظياً</span>
          </span>

          {canBulkDelete && (
            <button
              onClick={() => setShowCleanModal(true)}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="تنظيف الطلبات المكتملة أو الملغاة"
            >
              <Trash2 className="w-3.5 h-3.5 text-amber-400" />
              <span>تنظيف القديم</span>
            </button>
          )}

          {canReset && (
            <button
              onClick={() => setShowResetModal(true)}
              className="px-3 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-800/80 text-rose-300 hover:text-rose-100 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="إعادة ضبط قائمة الطلبات بالكامل لبدء دورة جديدة"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>بدء النظام من الصفر</span>
            </button>
          )}
        </div>
      </div>

      {/* Bulk Selection Bar if any selected */}
      {selectedOrderIds.size > 0 && (
        <div className="bg-amber-950/80 border border-amber-500/50 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2 text-xs text-amber-200 font-bold">
            <CheckSquare className="w-4 h-4 text-amber-400" />
            <span>تم تحديد {selectedOrderIds.size} طلب</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedOrderIds(new Set())}
              className="px-3 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-bold transition-all"
            >
              إلغاء التحديد
            </button>
            {canBulkDelete && (
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="px-3.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف المحدد ({selectedOrderIds.size})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-neutral-800/90 border border-neutral-700/70 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input with Normalization */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم الطلب (ORDER-01...) أو اسم العميل أو الهاتف..."
              className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Optional Auto-Print Toggle */}
          <button
            onClick={() => {
              const newVal = !autoPrintEnabled;
              setAutoPrintEnabled(newVal);
              showToast(
                newVal ? 'تفعيل الطباعة التلقائية 🖨️' : 'إيقاف الطباعة التلقائية ✕',
                newVal ? 'سيتم فتح نافذة الطباعة فوراً للطلبات الجديدة الواردة تلقائياً' : 'تم تعطيل الطباعة التلقائية للطلبات الجديدة',
                'info'
              );
            }}
            className={`px-3.5 py-2 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs font-bold ${
              autoPrintEnabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-neutral-900 border-neutral-700 hover:border-neutral-500 text-neutral-400 hover:text-neutral-200'
            }`}
            title="عند التفعيل، سيتم فتح نافذة الطباعة فوراً بمجرد ورود أي طلب جديد للنظام تلقائياً"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة تلقائية: {autoPrintEnabled ? 'نشط' : 'معطل'}</span>
          </button>

          {/* Select All Toggle Button */}
          {filteredOrders.length > 0 && (
            <button
              onClick={handleSelectAllFiltered}
              className="px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-neutral-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              {selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-amber-400" />
              ) : (
                <Square className="w-4 h-4 text-neutral-400" />
              )}
              <span>تحديد الكل ({filteredOrders.length})</span>
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {statusTabs.map((tab) => {
            const isActive = activeStatusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-neutral-950 shadow-md font-black'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-700/60 border border-neutral-700/60'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-neutral-950/20 text-neutral-950 font-black' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3 bg-neutral-800/40 rounded-2xl border border-neutral-700/50">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
          <p className="text-xs text-neutral-400">جاري الاتصال والتحميل المباشر من قاعدة البيانات...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-neutral-800/40 rounded-2xl border border-neutral-700/50">
          <ShoppingBag className="w-12 h-12 text-neutral-600 mx-auto stroke-1" />
          <h4 className="text-base font-bold text-white">لا توجد طلبات حالياً</h4>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {searchQuery
              ? 'لم نجد طلبات تطابق كلمة البحث الحالية.'
              : activeStatusFilter !== 'all'
              ? `لا توجد طلبات في حالة "${getOrderStatusLabel(activeStatusFilter as OrderStatus)}" حالياً.`
              : 'لم يتم تسجيل أي طلبات حتى الآن. ستظهر الطلبات الجديدة هنا فور إنشائها مباشرة.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredOrders.map((order, idx) => {
            const style = getOrderStatusStyle(order.status);
            const isUpdating = updatingOrderIds.has(order.id);
            const isSelected = selectedOrderIds.has(order.id);
            const currentStageInfo = ORDER_WORKFLOW_STAGES.find((s) => s.id === order.status);

            // Clean customer phone for WhatsApp
            const rawPhone = order.customer?.phone || order.customerPhone || '';
            const cleanedPhone = rawPhone.replace(/\D/g, '');
            const whatsappNumber = cleanedPhone.startsWith('0')
              ? `20${cleanedPhone.substring(1)}`
              : cleanedPhone.startsWith('20')
              ? cleanedPhone
              : `20${cleanedPhone}`;

            const whatsappMessage = encodeURIComponent(
              `مرحباً بك من بامبورينا 🥐✨\nبخصوص طلبك رقم #${order.orderNumber} (${getOrderStatusLabel(order.status)}).\nشكراً لتواصلك معنا!`
            );

            const cardKey = order.id ? `${order.id}-${idx}` : `order-${order.orderNumber || idx}-${idx}`;

            return (
              <div
                key={cardKey}
                id={`admin-order-card-${order.orderNumber}`}
                className={`bg-neutral-800/95 border rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl transition-all relative flex flex-col justify-between hover:border-neutral-600 min-w-0 overflow-hidden ${
                  isSelected ? 'border-amber-500/80 bg-neutral-800 ring-2 ring-amber-500/40' : 'border-neutral-700/80'
                }`}
              >
                <div>
                  {/* Top Header: Order Number, Time & Status Badge */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-neutral-700/70">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectOrder(order.id)}
                        className="text-neutral-400 hover:text-amber-400 transition-colors cursor-pointer shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Square className="w-4 h-4 text-neutral-500" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm sm:text-base font-black text-amber-400 font-mono tracking-wide truncate">
                            #{order.orderNumber}
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                          {new Date(order.createdAt || Date.now()).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {' • '}
                          {new Date(order.createdAt || Date.now()).toLocaleDateString('ar-EG')}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-black border whitespace-nowrap ${style.bg} ${style.text} ${style.border} shadow-sm`}
                      >
                        {getOrderStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>

                  {/* Order Stage Banner Description */}
                  {currentStageInfo && (
                    <div className="mt-3 p-2.5 rounded-2xl bg-neutral-900/90 border border-neutral-700/60 flex items-start gap-2 text-xs">
                      <span className="text-amber-400 font-black shrink-0 mt-0.5">{currentStageInfo.badge}</span>
                      <span className="text-neutral-300 text-[11px] leading-relaxed line-clamp-2">{currentStageInfo.desc}</span>
                    </div>
                  )}

                  {/* Customer Info */}
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2 text-white font-bold">
                      <div className="flex items-center gap-2 min-w-0">
                        <User className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">{order.customer?.name || order.customerName || 'عميل بدون اسم'}</span>
                      </div>

                      {/* WhatsApp Direct Chat Button */}
                      {rawPhone && (
                        <a
                          href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                          title="مراسلة العميل على واتساب"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-400" />
                          <span>واتساب</span>
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-neutral-300">
                      <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <a
                        href={`tel:${rawPhone}`}
                        className="font-mono hover:text-amber-400 dir-ltr text-right truncate"
                      >
                        {rawPhone || '-'}
                      </a>
                    </div>

                    <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
                      {order.orderType === 'pickup' ? (
                        <>
                          <Store className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="truncate">استلام من الفرع: {order.branch?.nameAr || order.branchNameAr || 'فرع الطالبية'}</span>
                        </>
                      ) : (
                        <>
                          <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="truncate">توصيل: {order.customer?.address || '-'}</span>
                        </>
                      )}
                    </div>

                    {/* Delivery Driver Assignment Badge */}
                    {order.orderType === 'delivery' && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-900/90 border border-neutral-700/60 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Bike className={`w-3.5 h-3.5 shrink-0 ${order.driverId ? 'text-amber-400' : 'text-neutral-500'}`} />
                          <span className="text-neutral-400 text-[11px]">الكابتن:</span>
                          <span className="font-bold text-white truncate text-[11px]">
                            {order.driverName || 'لم يعين مندوب بعد'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAssigningDriverOrder(order)}
                          className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold transition-all cursor-pointer shrink-0"
                        >
                          {order.driverId ? 'تغيير' : '+ تعيين'}
                        </button>
                      </div>
                    )}

                    {/* Delivery Fee Status & Management Badge */}
                    {order.orderType === 'delivery' && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-[#170E08] border border-amber-500/30 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="text-neutral-400 text-[11px]">رسوم التوصيل:</span>
                          {order.deliveryFeeManuallySet || (order.pricing?.deliveryFee !== undefined && order.pricing.deliveryFee !== null) ? (
                            <span className="font-mono font-black text-amber-300 text-[11px]">
                              {(order.pricing?.deliveryFee ?? order.deliveryFee ?? 0) === 0
                                ? 'مجاني 🎁'
                                : `${order.pricing?.deliveryFee ?? order.deliveryFee} ج.م`}
                            </span>
                          ) : (
                            <span className="text-amber-400/90 text-[10px] font-bold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                              قيد التحديد
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingDeliveryFeeOrder(order)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-[10px] font-black transition-all cursor-pointer shrink-0 shadow-sm flex items-center gap-1"
                          title="تحديد أو تعديل سعر التوصيل لهذا الطلب لتنعكس فوراً على فاتورة العميل"
                        >
                          <span>{order.deliveryFeeManuallySet ? 'تعديل التوصيل' : '+ تحديد السعر'}</span>
                        </button>
                      </div>
                    )}

                    {/* Items Summary */}
                    <div className="bg-neutral-900/80 rounded-2xl p-3 border border-neutral-700/60 my-2 space-y-1.5">
                      <div className="text-[11px] font-bold text-neutral-400 flex items-center justify-between">
                        <span>العناصر ({order.items?.length || 0}):</span>
                        <span className="text-amber-400 font-mono font-bold">
                          {formatPrice(order.pricing?.total ?? order.grandTotal ?? 0)}
                        </span>
                      </div>
                      <div className="max-h-24 overflow-y-auto space-y-1 scrollbar-thin pr-1">
                        {(order.items || []).map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-neutral-200 text-xs">
                            <span className="truncate">
                              {item.quantity}× {item.nameAr || item.name || 'صنف'}
                            </span>
                            <span className="font-mono text-neutral-400 font-bold shrink-0">
                              {formatPrice(item.totalPrice || (item.unitPrice || 0) * (item.quantity || 1))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lifecycle Stage Switcher & Quick Buttons */}
                <div className="pt-3 border-t border-neutral-700/60 space-y-3">
                  {/* Direct Stage Selector Pill Bar */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-neutral-400 flex items-center justify-between">
                      <span>مراحل تجهيز وتوصيل الطلب:</span>
                      {isUpdating && <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />}
                    </div>

                    <div className="grid grid-cols-6 gap-1 bg-neutral-900/90 p-1 rounded-xl border border-neutral-700/60">
                      {ORDER_WORKFLOW_STAGES.map((st) => {
                        const isCurrent = order.status === st.id;
                        return (
                          <button
                            key={st.id}
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(order, st.id)}
                            className={`py-1 rounded-lg text-[10px] font-bold text-center transition-all cursor-pointer ${
                              isCurrent
                                ? `${st.activeBtn} shadow-sm font-black ring-1 ring-white/20`
                                : 'bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-700/80'
                            }`}
                            title={`تحويل الحالة إلى "${st.label}"`}
                          >
                            {st.stepNum}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Contextual Action Buttons */}
                  <div className="pt-2 border-t border-neutral-700/40 space-y-2.5">
                    {/* Primary Workflow Actions (Row 1) */}
                    <div className="flex items-center gap-2">
                      {order.status === 'pending' && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(order, 'confirmed')}
                          className="flex-1 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                        >
                          {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          <span>تأكيد الطلب</span>
                        </button>
                      )}

                      {order.status === 'confirmed' && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(order, 'preparing')}
                          className="flex-1 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                        >
                          {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CookingPot className="w-4 h-4" />}
                          <span>بدء التحضير</span>
                        </button>
                      )}

                      {order.status === 'preparing' && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(order, 'ready')}
                          className="flex-1 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                        >
                          {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-4 h-4" />}
                          <span>جاهز للاستلام</span>
                        </button>
                      )}

                      {order.status === 'ready' && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(order, 'completed')}
                          className="flex-1 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                        >
                          {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          <span>تم التسليم</span>
                        </button>
                      )}

                      {order.status !== 'cancelled' && order.status !== 'completed' && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(order, 'cancelled')}
                          className="px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
                          title="إلغاء الطلب"
                        >
                          إلغاء
                        </button>
                      )}

                      {(order.status === 'completed' || order.status === 'cancelled') && (
                        <span className="flex-1 py-2 text-center rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-500 text-[11px] font-bold italic whitespace-nowrap">
                          حالة نهائية
                        </span>
                      )}
                    </div>

                    {/* Secondary Utilities (Row 2) */}
                    <div className="grid grid-cols-4 gap-2">
                      {/* Instant Print Button */}
                      <button
                        type="button"
                        onClick={() => exportAndPrintSingleInvoice(order, 'print')}
                        className="py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all cursor-pointer flex items-center justify-center shrink-0"
                        title="طباعة فورية للطابعة (Instant Print)"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {/* PDF Export Button */}
                      <button
                        type="button"
                        onClick={() => exportAndPrintSingleInvoice(order, 'pdf')}
                        className="py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 transition-all cursor-pointer flex items-center justify-center shrink-0"
                        title="استخراج وتصدير كملف PDF"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>

                      {/* Details Modal Trigger */}
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="py-2 rounded-xl bg-neutral-900 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-all cursor-pointer flex items-center justify-center shrink-0"
                        title="عرض تفاصيل الطلب وسجل الحركات"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Single Delete Button */}
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmOrder(order)}
                        className="py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 transition-all cursor-pointer flex items-center justify-center shrink-0"
                        title="حذف هذا الطلب نهائياً"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md dir-rtl">
          <div className="bg-neutral-900 border border-neutral-700/80 rounded-3xl p-6 max-w-2xl w-full text-white space-y-5 shadow-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-amber-400" />
                <div>
                  <h3 className="text-lg font-black text-white">تفاصيل الطلب #{selectedOrder.orderNumber}</h3>
                  <p className="text-xs text-neutral-400 font-mono">معرف الطلب: {selectedOrder.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 scrollbar-thin flex-1 text-xs">
              {/* Customer Info Box */}
              <div className="bg-neutral-950/70 p-4 rounded-2xl border border-neutral-800 space-y-2">
                <h4 className="font-bold text-amber-400 flex items-center gap-2 text-xs">
                  <User className="w-4 h-4" />
                  <span>بيانات العميل والتوصيل</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-neutral-300">
                  <div>اسم العميل: <strong className="text-white">{selectedOrder.customer?.name || selectedOrder.customerName}</strong></div>
                  <div>رقم الهاتف: <strong className="text-white font-mono dir-ltr">{selectedOrder.customer?.phone || selectedOrder.customerPhone}</strong></div>
                  <div>نوع الطلب: <strong className="text-white">{selectedOrder.orderType === 'pickup' ? 'استلام من الفرع' : 'توصيل للمنزل'}</strong></div>
                  <div>الفرع: <strong className="text-white">{selectedOrder.branch?.nameAr || selectedOrder.branchNameAr || 'الطالبية'}</strong></div>
                  {selectedOrder.customer?.address && (
                    <div className="col-span-2">العنوان: <strong className="text-white">{selectedOrder.customer.address}</strong></div>
                  )}
                </div>
              </div>

              {/* Delivery Driver Info Section */}
              {selectedOrder.orderType === 'delivery' && (
                <div className="bg-neutral-950/70 p-4 rounded-2xl border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-amber-400 flex items-center gap-2 text-xs">
                      <Bike className="w-4 h-4" />
                      <span>مندوب وكابتن التوصيل</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setAssigningDriverOrder(selectedOrder)}
                      className="px-2.5 py-1 rounded-xl bg-amber-500 text-neutral-950 text-[10px] font-bold hover:bg-amber-400 transition-all cursor-pointer"
                    >
                      {selectedOrder.driverId ? 'تغيير المندوب' : '+ تعيين مندوب'}
                    </button>
                  </div>
                  {selectedOrder.driverId ? (
                    <div className="flex items-center justify-between text-neutral-300 text-xs pt-1">
                      <div>
                        <span className="text-white font-bold">{selectedOrder.driverName}</span>
                        <span className="text-neutral-400 font-mono text-[11px] block dir-ltr text-right">{selectedOrder.driverPhone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedOrder.driverPhone && (
                          <a
                            href={`tel:${selectedOrder.driverPhone}`}
                            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300"
                            title="اتصال بالمندوب"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-neutral-500 text-[11px]">لم يتم إسناد هذا الطلب لأي مندوب توصيل حتى الآن.</p>
                  )}
                </div>
              )}

              {/* Delivery Fee Management Section */}
              {selectedOrder.orderType === 'delivery' && (
                <div className="bg-gradient-to-r from-[#21140B] to-[#170D06] p-4 rounded-2xl border border-amber-500/40 space-y-2.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-amber-400 flex items-center gap-2 text-xs">
                      <Truck className="w-4 h-4 text-amber-400" />
                      <span>رسوم وتكلفة التوصيل لهذا الطلب</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setEditingDeliveryFeeOrder(selectedOrder)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer hover:scale-[1.02]"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>{selectedOrder.deliveryFeeManuallySet ? 'تعديل سعر التوصيل' : 'تحديد سعر التوصيل للطلب'}</span>
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-neutral-800 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-400">سعر التوصيل المعتمد:</span>
                        <span className="text-base font-black font-mono text-amber-300">
                          {selectedOrder.deliveryFeeManuallySet || (selectedOrder.pricing?.deliveryFee !== undefined && selectedOrder.pricing.deliveryFee !== null)
                            ? (Number(selectedOrder.pricing?.deliveryFee ?? selectedOrder.deliveryFee ?? 0) === 0
                                ? 'مجاناً 🎁'
                                : `${selectedOrder.pricing?.deliveryFee ?? selectedOrder.deliveryFee} ج.م`)
                            : 'لم يُحدد بعد (يحدده الفرع أو الإدارة)'}
                        </span>
                      </div>
                      {selectedOrder.deliveryFeeNotes && (
                        <p className="text-[11px] text-neutral-400">
                          ملاحظة: <span className="text-white">{selectedOrder.deliveryFeeNotes}</span>
                        </p>
                      )}
                      {selectedOrder.deliveryFeeUpdatedAt && (
                        <p className="text-[10px] text-neutral-500 font-mono">
                          آخر تحديث: {new Date(selectedOrder.deliveryFeeUpdatedAt).toLocaleString('ar-EG')}
                        </p>
                      )}
                    </div>

                    <div className="text-left">
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30 block">
                        ينعكس فوراً على فاتورة العميل ✓
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="bg-neutral-950/70 p-4 rounded-2xl border border-neutral-800 space-y-2">
                <h4 className="font-bold text-amber-400 flex items-center gap-2 text-xs">
                  <Package className="w-4 h-4" />
                  <span>الأصناف والكميات</span>
                </h4>
                <div className="divide-y divide-neutral-800">
                  {(selectedOrder.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white">{item.quantity}× {item.nameAr || item.name}</span>
                        {item.selectedVariant && (
                          <span className="text-neutral-400 text-[11px] block">الحجم: {item.selectedVariant.nameAr}</span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-amber-400">
                        {formatPrice(item.totalPrice || item.unitPrice * item.quantity || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status History */}
              <div className="bg-neutral-950/70 p-4 rounded-2xl border border-neutral-800 space-y-2">
                <h4 className="font-bold text-amber-400 flex items-center gap-2 text-xs">
                  <Clock className="w-4 h-4" />
                  <span>تاريخ وسجل حركات الحالات (Status History)</span>
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {(selectedOrder.statusHistory || []).map((history: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] space-y-0.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-amber-300">
                          {getOrderStatusLabel(history.newStatus || history.status)}
                        </span>
                        <span className="text-neutral-500 font-mono text-[10px]">
                          {new Date(history.timestamp || history.changedAt || Date.now()).toLocaleString('ar-EG')}
                        </span>
                      </div>
                      <p className="text-neutral-400">{history.noteAr || 'تحديث الحالة'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Total Footer & Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-800 shrink-0 flex-wrap gap-2">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <span className="text-[11px] text-neutral-400 block">المجموع الفرعي:</span>
                  <span className="text-xs font-mono font-bold text-neutral-300">
                    {formatPrice(selectedOrder.pricing?.subtotal || selectedOrder.subtotal || 0)}
                  </span>
                </div>
                {selectedOrder.orderType === 'delivery' && (
                  <div>
                    <span className="text-[11px] text-neutral-400 block">التوصيل:</span>
                    <span className="text-xs font-mono font-black text-amber-400">
                      {formatPrice(selectedOrder.pricing?.deliveryFee ?? selectedOrder.deliveryFee ?? 0)}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-xs text-neutral-400 font-bold block">إجمالي الفاتورة:</span>
                  <span className="text-base font-black text-amber-400 font-mono">
                    {formatPrice(selectedOrder.pricing?.total ?? selectedOrder.grandTotal ?? 0)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Instant Print */}
                <button
                  type="button"
                  onClick={() => exportAndPrintSingleInvoice(selectedOrder, 'print')}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer hover:scale-[1.02]"
                  title="إرسال أمر طباعة فورية للطابعة"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة فورية</span>
                </button>

                {/* Export PDF */}
                <button
                  type="button"
                  onClick={() => exportAndPrintSingleInvoice(selectedOrder, 'pdf')}
                  className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer hover:scale-[1.02]"
                  title="استخراج وتصدير الفاتورة كملف PDF"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>استخراج كـ PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const ord = selectedOrder;
                    setSelectedOrder(null);
                    setDeleteConfirmOrder(ord);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-300 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                  title="حذف هذا الطلب نهائياً من قاعدة البيانات"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف الطلب نهائياً</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition-all cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Confirmation Modal */}
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
              هل أنت متأكد من إلغاء هذا الطلب؟ سيتم تعديل الحالة إلى <strong className="text-rose-400">"ملغي"</strong> وتسجيل التاريخ نهائياً.
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
                disabled={updatingOrderIds.has(cancelConfirm.order.id)}
                onClick={() => handleUpdateStatus(cancelConfirm.order, 'cancelled', true)}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-500 transition-all cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                {updatingOrderIds.has(cancelConfirm.order.id) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>نعم، تأكيد الإلغاء</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Order Confirmation Modal */}
      {deleteConfirmOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm dir-rtl">
          <div className="bg-neutral-900 border border-rose-900/80 rounded-3xl p-6 max-w-md w-full text-white space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h4 className="text-base font-black text-white">حذف الطلب نهائياً</h4>
                <p className="text-xs text-rose-300/80 font-mono">#{deleteConfirmOrder.orderNumber}</p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950/60 p-3.5 rounded-2xl border border-neutral-800">
              هل أنت متأكد من رغبتك في حذف هذا الطلب نهائياً من قاعدة البيانات؟ لا يمكن استرجاع بيانات هذا الطلب بعد الحذف.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isDeletingOrderId === deleteConfirmOrder.id}
                onClick={() => handleDeleteSingleOrder(deleteConfirmOrder)}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-500 transition-all cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                {isDeletingOrderId === deleteConfirmOrder.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>نعم، حذف الطلب</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm dir-rtl">
          <div className="bg-neutral-900 border border-rose-900/80 rounded-3xl p-6 max-w-md w-full text-white space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h4 className="text-base font-black text-white">حذف الطلبات المحددة</h4>
                <p className="text-xs text-rose-300/80">العدد المحدد: {selectedOrderIds.size} طلب</p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950/60 p-3.5 rounded-2xl border border-neutral-800">
              هل أنت متأكد من رغبتك في حذف <strong className="text-rose-400">{selectedOrderIds.size} طلب محدد</strong> نهائياً من قاعدة البيانات؟
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={handleBulkDeleteSelected}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-500 transition-all cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                {isBulkDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>تأكيد حذف المحدد ({selectedOrderIds.size})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Old Orders Wizard Modal */}
      {showCleanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm dir-rtl">
          <div className="bg-neutral-900 border border-neutral-700/80 rounded-3xl p-6 max-w-md w-full text-white space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5 text-amber-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-base font-black text-white">تنظيف الطلبات القديمة</h3>
              </div>
              <button
                onClick={() => setShowCleanModal(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-300">
              اختر نوع الطلبات غير النشطة التي ترغب في حذفها من قاعدة البيانات:
            </p>

            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-950 border border-neutral-800 cursor-pointer hover:border-amber-500/50">
                <input
                  type="radio"
                  name="cleanMode"
                  checked={cleanMode === 'completed'}
                  onChange={() => setCleanMode('completed')}
                  className="accent-amber-500"
                />
                <div>
                  <span className="font-bold text-white block">حذف الطلبات المكتملة فقط</span>
                  <span className="text-neutral-400 text-[11px]">يتم مسح الطلبات المستلمة (العدد: {statusCounts.completed})</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-950 border border-neutral-800 cursor-pointer hover:border-amber-500/50">
                <input
                  type="radio"
                  name="cleanMode"
                  checked={cleanMode === 'cancelled'}
                  onChange={() => setCleanMode('cancelled')}
                  className="accent-amber-500"
                />
                <div>
                  <span className="font-bold text-white block">حذف الطلبات الملغاة فقط</span>
                  <span className="text-neutral-400 text-[11px]">يتم مسح الطلبات المرفوضة (العدد: {statusCounts.cancelled})</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-950 border border-neutral-800 cursor-pointer hover:border-amber-500/50">
                <input
                  type="radio"
                  name="cleanMode"
                  checked={cleanMode === 'both'}
                  onChange={() => setCleanMode('both')}
                  className="accent-amber-500"
                />
                <div>
                  <span className="font-bold text-white block">حذف المكتملة والملغاة معاً</span>
                  <span className="text-neutral-400 text-[11px]">يتم مسح كافة الطلبات غير النشطة (إجمالي: {statusCounts.completed + statusCounts.cancelled})</span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setShowCleanModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-all"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isCleaning}
                onClick={handleCleanOldOrdersSubmit}
                className="px-5 py-2 rounded-xl text-xs font-black text-neutral-950 bg-amber-500 hover:bg-amber-400 transition-all cursor-pointer flex items-center gap-2 shadow-md disabled:opacity-50"
              >
                {isCleaning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>تنظيف الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Driver Assignment Modal */}
      {assigningDriverOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md dir-rtl">
          <div className="bg-neutral-900 border border-neutral-700/80 rounded-3xl p-6 max-w-md w-full text-white space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2 text-amber-400">
                <Bike className="w-5 h-5" />
                <h3 className="text-base font-black text-white">
                  تعيين مندوب للطلب #{assigningDriverOrder.orderNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAssigningDriverOrder(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              اختر كابتن التوصيل المسؤول عن تسليم هذا الطلب للعميل ({assigningDriverOrder.customer?.name || 'العميل'}):
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {availableDrivers.length === 0 ? (
                <div className="py-6 text-center text-xs text-neutral-500">
                  لا يوجد مناديب مسجلين في النظام حالياً. يرجى إضافة مناديب من تبويب "المناديب".
                </div>
              ) : (
                availableDrivers.map((driver) => {
                  const isCurrent = assigningDriverOrder.driverId === driver.id;
                  return (
                    <button
                      key={driver.id}
                      type="button"
                      disabled={isAssigningDriver}
                      onClick={() => handleAssignDriver(assigningDriverOrder, driver)}
                      className={`w-full p-3 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                        isCurrent
                          ? 'bg-amber-500/10 border-amber-500 text-white'
                          : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">{driver.name}</span>
                          {driver.status === 'active' ? (
                            <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-950 text-emerald-400 font-bold">نشط</span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.2 rounded-full bg-neutral-800 text-neutral-500">معطل</span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-neutral-400 dir-ltr text-right block">{driver.phone}</span>
                      </div>
                      {isCurrent && (
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {assigningDriverOrder.driverId && (
              <div className="pt-2 border-t border-neutral-800 flex justify-between items-center">
                <button
                  type="button"
                  disabled={isAssigningDriver}
                  onClick={() => handleAssignDriver(assigningDriverOrder, null)}
                  className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء تعيين المندوب
                </button>
                <button
                  type="button"
                  onClick={() => setAssigningDriverOrder(null)}
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-bold hover:text-white"
                >
                  إغلاق
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* System Reset Safety Wizard Modal */}
      <SystemResetModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onSuccess={() => {
          setSelectedOrder(null);
          setSelectedOrderIds(new Set());
        }}
        showToast={showToast}
      />

      {/* Edit Delivery Fee Modal */}
      <EditDeliveryFeeModal
        isOpen={!!editingDeliveryFeeOrder}
        order={editingDeliveryFeeOrder}
        onClose={() => setEditingDeliveryFeeOrder(null)}
        onSuccess={handleDeliveryFeeSuccess}
      />








      {/* Activity Log */}
      <div className="bg-neutral-800/80 border border-neutral-700/70 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>سجل نشاط المتجر والطلبات</span>
          </h3>
          <span className="text-xs text-neutral-400">
            {activities.length} سجلات مسجلة
          </span>
        </div>

        {activities.length === 0 ? (
          <div className="py-8 text-center text-neutral-500 text-xs">
            لا توجد سجلات نشاط محلية حديثة.
          </div>
        ) : (
          <div className="divide-y divide-neutral-700/50 max-h-72 overflow-y-auto">
            {activities.slice(0, 20).map((act, index) => (
              <div key={index} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <div>
                    <span className="font-bold text-white">{act.actionAr || act.action || act.type || 'إجراء'}</span>
                    <span className="text-neutral-400 mr-2">{act.detailsAr || act.details || act.description || ''}</span>
                  </div>
                </div>
                <span className="text-neutral-500 font-mono text-[11px]" dir="ltr">
                  {act.timestamp || ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
