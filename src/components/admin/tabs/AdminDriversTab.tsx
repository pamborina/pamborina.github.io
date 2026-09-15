import React, { useState, useEffect, useMemo } from 'react';
import {
  Bike,
  Plus,
  Search,
  Phone,
  MessageCircle,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Package,
  AlertCircle,
  RefreshCw,
  User,
  ShieldCheck,
  MapPin,
  TrendingUp,
  X,
  Loader2,
  FileText,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';
import { DeliveryDriver, Order } from '../../../types';
import { deliveryDriverService } from '../../../services/deliveryDriverService';
import { firebaseOrderService } from '../../../services/firebaseOrderService';
import { formatPrice } from '../../../lib/utils';
import { useToast } from '../../ui/Toast';
import { DriverStatementModal } from '../modals/DriverStatementModal';
import { GlobalDeliveryReportModal } from '../modals/GlobalDeliveryReportModal';
import { PrintSizeSelectorModal } from '../modals/PrintSizeSelectorModal';
import { exportAndPrintAllDriversReport, PrintLayoutSize } from '../../../services/pdfReportGenerator';
import { formatCairoDateTime } from '../../../utils/dateFormatter';

export const AdminDriversTab: React.FC = () => {
  const { showToast } = useToast();

  const [rawDrivers, setRawDrivers] = useState<DeliveryDriver[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DeliveryDriver | null>(null);
  const [deleteConfirmDriver, setDeleteConfirmDriver] = useState<DeliveryDriver | null>(null);
  const [selectedDriverDetails, setSelectedDriverDetails] = useState<DeliveryDriver | null>(null);
  const [statementDriver, setStatementDriver] = useState<DeliveryDriver | null>(null);
  const [isGlobalReportModalOpen, setIsGlobalReportModalOpen] = useState(false);
  const [showPrintSizeModal, setShowPrintSizeModal] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formVehicle, setFormVehicle] = useState<'motorcycle' | 'bicycle' | 'car' | 'other'>('motorcycle');
  const [formNotes, setFormNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string }>({});

  // 1. Subscribe to real-time drivers & orders
  useEffect(() => {
    setIsLoading(true);

    const unsubDrivers = deliveryDriverService.subscribeToDrivers(
      (driversList) => {
        setRawDrivers(driversList);
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      }
    );

    const unsubOrders = firebaseOrderService.subscribeToOrders((ordersList) => {
      setOrders(ordersList);
    });

    return () => {
      unsubDrivers();
      unsubOrders();
    };
  }, []);

  // 2. CRITICAL: Derive Real-time Statistics from actual completed orders
  const driversWithStats = useMemo(() => {
    return deliveryDriverService.computeDriverStats(rawDrivers, orders);
  }, [rawDrivers, orders]);

  // Overall Global Driver Stats
  const globalStats = useMemo(() => {
    const total = driversWithStats.length;
    const active = driversWithStats.filter((d) => d.status === 'active').length;
    const driverDeliveredOrders = driversWithStats.reduce((sum, d) => sum + (d.orderCount || 0), 0);
    const driverDeliveredRevenue = driversWithStats.reduce((sum, d) => sum + (d.deliveredRevenue || 0), 0);
    const activeInProgress = driversWithStats.reduce((sum, d) => sum + (d.activeOrdersCount || 0), 0);

    // Also verify all completed delivery orders across the system
    const COMPLETED_STATUSES = new Set(['completed', 'delivered']);
    const systemCompletedDeliveryOrders = orders.filter((o) => {
      const st = (o.status || '').toLowerCase();
      return COMPLETED_STATUSES.has(st) && (o.orderType === 'delivery' || o.driverId || o.driverName);
    });

    const systemDeliveryFees = systemCompletedDeliveryOrders.reduce((sum, o) => {
      const fee = Number(o.deliveryFee ?? o.pricing?.deliveryFee ?? 0);
      return sum + (isNaN(fee) || fee < 0 ? 0 : fee);
    }, 0);

    return {
      total,
      active,
      totalDeliveredOrders: Math.max(driverDeliveredOrders, systemCompletedDeliveryOrders.length),
      totalRevenue: Math.max(driverDeliveredRevenue, systemDeliveryFees),
      activeInProgress,
    };
  }, [driversWithStats, orders]);

  // Filtered drivers list
  const filteredDrivers = useMemo(() => {
    return driversWithStats.filter((d) => {
      const matchesSearch =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.phone.includes(searchQuery) ||
        (d.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ? true : d.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [driversWithStats, searchQuery, statusFilter]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormName('');
    setFormPhone('');
    setFormStatus('active');
    setFormVehicle('motorcycle');
    setFormNotes('');
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (driver: DeliveryDriver) => {
    setEditingDriver(driver);
    setFormName(driver.name);
    setFormPhone(driver.phone);
    setFormStatus(driver.status);
    setFormVehicle(driver.vehicleType || 'motorcycle');
    setFormNotes(driver.notes || '');
    setFormErrors({});
  };

  // Save (Add or Edit) Handler
  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = formName.trim();
    const trimmedPhone = formPhone.trim();

    const errors: { name?: string; phone?: string } = {};
    if (!trimmedName || trimmedName.length < 2) {
      errors.name = 'يرجى إدخال اسم المندوب بالكامل';
    }
    if (!trimmedPhone || trimmedPhone.length < 9) {
      errors.phone = 'يرجى إدخال رقم هاتف صحيح';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingDriver) {
        // Edit
        await deliveryDriverService.updateDriver(editingDriver.id, {
          name: trimmedName,
          phone: trimmedPhone,
          status: formStatus,
          vehicleType: formVehicle,
          notes: formNotes.trim(),
        });
        showToast('تم تحديث بيانات المندوب', `تم حفظ بيانات ${trimmedName} بنجاح`, 'success');
        setEditingDriver(null);
      } else {
        // Add
        await deliveryDriverService.addDriver({
          name: trimmedName,
          phone: trimmedPhone,
          status: formStatus,
          vehicleType: formVehicle,
          notes: formNotes.trim(),
        });
        showToast('تم إضافة المندوب بنجاح', `تم تسجيل ${trimmedName} في قائمة المناديب`, 'success');
        setIsAddModalOpen(false);
      }
    } catch (err: any) {
      showToast('خطأ في الحفظ', err.message || 'تعذر حفظ بيانات المندوب', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1-Click Status Toggle
  const handleToggleStatus = async (driver: DeliveryDriver) => {
    const nextStatus = driver.status === 'active' ? 'inactive' : 'active';
    try {
      await deliveryDriverService.toggleDriverStatus(driver.id, nextStatus);
      showToast(
        'تم تغيير الحالة',
        `أصبح المندوب "${driver.name}" ${nextStatus === 'active' ? 'نشطاً ومتاحاً' : 'غير متاح حالياً'}`,
        'info'
      );
    } catch (err: any) {
      showToast('خطأ', 'فشل تعديل حالة المندوب', 'error');
    }
  };

  // Delete Driver Handler
  const handleDeleteDriver = async () => {
    if (!deleteConfirmDriver) return;
    setIsSubmitting(true);

    try {
      await deliveryDriverService.deleteDriver(deleteConfirmDriver.id, deleteConfirmDriver.name);
      showToast('تم حذف المندوب', `تم حذف المندوب "${deleteConfirmDriver.name}" بنجاح`, 'info');
      setDeleteConfirmDriver(null);
    } catch (err: any) {
      showToast('خطأ', 'فشل حذف المندوب من قاعدة البيانات', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVehicleLabel = (type?: string) => {
    switch (type) {
      case 'motorcycle':
        return '🛵 موتوسيكل';
      case 'bicycle':
        return '🚲 دراجة / عجلة';
      case 'car':
        return '🚗 سيارة';
      default:
        return '🛵 دليفري';
    }
  };

  return (
    <div className="space-y-6 dir-rtl text-white">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 border border-amber-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
            <Bike className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white font-heading flex items-center gap-2">
              <span>إدارة كباتن ومناديب الدليفري</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-sans font-bold">
                إحصائيات حية حقيقية
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              إضافة وتعديل بيانات المناديب، تعيين الطلبات، ومتابعة دقيقة لعدد الطلبات المسلمة فعلياً والإيراد المحقق.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
          <button
            type="button"
            onClick={() => setShowPrintSizeModal(true)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-amber-400 font-bold text-xs border border-amber-500/40 hover:border-amber-500 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            title="استخراج وطباعة تقرير الكباتن بمقاسات الطابعات المختلفة (Reset / A4 / A5)"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>طباعة تقرير الكباتن (Reset / A4)</span>
          </button>
          <button
            type="button"
            onClick={() => setIsGlobalReportModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs border border-neutral-600 hover:border-amber-500/60 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <span>التقرير الشامل للدليفري</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مندوب جديد</span>
          </button>
        </div>
      </div>

      {/* Global Analytics Cards Bar (Derived from Real Orders) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-neutral-800/90 border border-neutral-700/80 shadow-md space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>إجمالي المناديب:</span>
            <User className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{globalStats.total}</span>
            <span className="text-[11px] text-emerald-400 font-bold">
              ({globalStats.active} نشط)
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-800/90 border border-neutral-700/80 shadow-md space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>الطلبات المسلمة بالكامل:</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {globalStats.totalDeliveredOrders}
            </span>
            <span className="text-[11px] text-neutral-400">طلب ناجح</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-800/90 border border-neutral-700/80 shadow-md space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>إيراد رسوم التوصيل المحققة:</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-amber-400 font-mono">
              {formatPrice(globalStats.totalRevenue)}
            </span>
          </div>
          <div className="text-[10px] text-neutral-400">
            مجموع رسوم التوصيل فقط للطلبات المسلمة
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-800/90 border border-neutral-700/80 shadow-md space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>طلبات في الطريق الآن:</span>
            <Bike className="w-4 h-4 text-teal-400 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-teal-400 font-mono">
              {globalStats.activeInProgress}
            </span>
            <span className="text-[11px] text-neutral-400">طلب قيد التوصيل</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-neutral-800/80 border border-neutral-700/70 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم أو رقم الهاتف..."
            className="w-full pr-9 pl-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            الكل ({driversWithStats.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            نشط ({globalStats.active})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'inactive'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            معطل ({globalStats.total - globalStats.active})
          </button>
        </div>
      </div>

      {/* Drivers Cards Grid */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3 bg-neutral-800/40 rounded-2xl border border-neutral-700/50">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
          <p className="text-xs text-neutral-400">جاري تحميل بيانات المناديب والإحصائيات من السيرفر...</p>
        </div>
      ) : filteredDrivers.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-neutral-800/40 rounded-2xl border border-neutral-700/50">
          <Bike className="w-12 h-12 text-neutral-600 mx-auto stroke-1" />
          <h4 className="text-base font-bold text-white">لا يوجد مناديب مسجلين</h4>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {searchQuery
              ? 'لم نجد أي مندوب يطابق كلمة البحث.'
              : 'ابدأ بإضافة كباتن التوصيل ليتمكن فريق العمل من تعيين الطلبات وتتبعها.'}
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 text-xs font-bold hover:bg-amber-400 transition-all cursor-pointer"
          >
            + إضافة أول مندوب
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredDrivers.map((driver) => {
            const rawPhone = driver.phone || '';
            const cleanedPhone = rawPhone.replace(/\D/g, '');
            const whatsappNumber = cleanedPhone.startsWith('0')
              ? `20${cleanedPhone.substring(1)}`
              : cleanedPhone.startsWith('20')
              ? cleanedPhone
              : `20${cleanedPhone}`;

            return (
              <div
                key={driver.id}
                className="bg-neutral-800/90 border border-neutral-700/80 rounded-3xl p-5 shadow-xl space-y-4 hover:border-neutral-600 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Row: Name, Vehicle Badge & Status */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-neutral-700/70">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-white truncate">
                          {driver.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                        <span>{getVehicleLabel(driver.vehicleType)}</span>
                        <span>•</span>
                        <span className="font-mono dir-ltr">{driver.phone}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(driver)}
                      title="انقر لتغيير حالة التوفر"
                      className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer shrink-0 ${
                        driver.status === 'active'
                          ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900'
                          : 'bg-rose-950/80 border-rose-500/50 text-rose-300 hover:bg-rose-900'
                      }`}
                    >
                      {driver.status === 'active' ? 'نشط ومتاح ✓' : 'غير متاح ✕'}
                    </button>
                  </div>

                  {/* Notes & Vehicle Info */}
                  {driver.notes && (
                    <p className="mt-3 text-xs text-neutral-300 bg-neutral-900/70 p-2.5 rounded-2xl border border-neutral-700/50 line-clamp-2">
                      {driver.notes}
                    </p>
                  )}

                  {/* Real-time Order Stats Derived from Firebase Orders */}
                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div className="p-2.5 rounded-2xl bg-neutral-900 border border-neutral-700/60">
                      <span className="text-[10px] text-neutral-400 block mb-0.5">مسلم بنجاح</span>
                      <span className="text-base font-black text-emerald-400 font-mono">
                        {driver.orderCount || 0}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-neutral-900 border border-neutral-700/60">
                      <span className="text-[10px] text-neutral-400 block mb-0.5">رسوم التوصيل</span>
                      <span className="text-xs font-black text-amber-400 font-mono">
                        {formatPrice(driver.deliveredRevenue || 0)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-neutral-900 border border-neutral-700/60">
                      <span className="text-[10px] text-neutral-400 block mb-0.5">قيد التوصيل</span>
                      <span className="text-base font-black text-teal-400 font-mono">
                        {driver.activeOrdersCount || 0}
                      </span>
                    </div>
                  </div>

                  {driver.lastDeliveredAt && (
                    <div className="text-[11px] text-neutral-400 mt-2 text-center bg-neutral-900/80 py-1.5 px-2.5 rounded-xl border border-neutral-800">
                      آخر تسليم: <span className="text-amber-400 font-bold font-mono">{formatCairoDateTime(driver.lastDeliveredAt)}</span>
                    </div>
                  )}
                </div>

                {/* Driver Statement & Action Buttons Footer */}
                <div className="pt-3 border-t border-neutral-700/70 space-y-2">
                  <button
                    type="button"
                    onClick={() => setStatementDriver(driver)}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/25 to-amber-500/15 hover:from-amber-500/30 hover:to-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-amber-500/10"
                    title="استخراج كشف حساب مفصل وسجل كافة الطلبات"
                  >
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>كشف حساب وسجل الطلبات</span>
                  </button>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${driver.phone}`}
                        className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-all cursor-pointer"
                        title="اتصال هاتفي بالمندوب"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                      <a
                        href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`مرحباً كابتن ${driver.name}، تواصل من إدارة بامبورينا.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/40 transition-all cursor-pointer"
                        title="مراسلة واتساب"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(driver)}
                        className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-700 text-neutral-300 hover:text-amber-400 transition-all cursor-pointer"
                        title="تعديل بيانات المندوب"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmDriver(driver)}
                        className="p-2 rounded-xl bg-neutral-900 hover:bg-rose-950 text-neutral-400 hover:text-rose-400 transition-all cursor-pointer"
                        title="حذف المندوب"
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

      {/* Add / Edit Driver Modal */}
      {(isAddModalOpen || editingDriver) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm dir-rtl">
          <div className="bg-neutral-900 border border-neutral-700 rounded-3xl p-6 max-w-md w-full text-white space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5 text-amber-400">
                <Bike className="w-5 h-5" />
                <h3 className="text-base font-black text-white">
                  {editingDriver ? 'تعديل بيانات المندوب' : 'إضافة مندوب توصيل جديد'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingDriver(null);
                }}
                className="p-1 rounded-full text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDriver} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-300 block">
                  اسم المندوب بالكامل *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    setFormErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholder="مثال: أحمد محمود العسكري"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
                {formErrors.name && (
                  <p className="text-xs text-rose-400 font-bold">{formErrors.name}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-300 block">
                  رقم الهاتف للتواصل والواتساب *
                </label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => {
                    setFormPhone(e.target.value);
                    setFormErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                  placeholder="01012345678"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                />
                {formErrors.phone && (
                  <p className="text-xs text-rose-400 font-bold">{formErrors.phone}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-300 block">
                    وسيلة النقل
                  </label>
                  <select
                    value={formVehicle}
                    onChange={(e: any) => setFormVehicle(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-xs text-white focus:border-amber-400 focus:outline-none cursor-pointer"
                  >
                    <option value="motorcycle">🛵 موتوسيكل</option>
                    <option value="bicycle">🚲 دراجة</option>
                    <option value="car">🚗 سيارة</option>
                    <option value="other">سير / أخرى</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-300 block">
                    الحالة الحالية
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e: any) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-xs text-white focus:border-amber-400 focus:outline-none cursor-pointer"
                  >
                    <option value="active">نشط ومتاح للطلبات</option>
                    <option value="inactive">غير متاح مؤقتاً</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-300 block">
                  ملاحظات أو مناطق التغطية الأساسية
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="مثال: تغطية فرع الطالبية وفيصل، رقم لوحة الموتوسيكل أ ب ج 123"
                  className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingDriver(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-black text-neutral-950 bg-amber-500 hover:bg-amber-400 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingDriver ? 'حفظ التعديلات' : 'تسجيل المندوب'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm dir-rtl">
          <div className="bg-neutral-900 border border-rose-900/80 rounded-3xl p-6 max-w-md w-full text-white space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h4 className="text-base font-black text-white">تأكيد حذف المندوب</h4>
                <p className="text-xs text-rose-300/80">{deleteConfirmDriver.name}</p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950/60 p-3.5 rounded-2xl border border-neutral-800">
              هل أنت متأكد من رغبتك في حذف هذا المندوب نهائياً؟ لن يؤثر الحذف على سجلات الطلبات القديمة التي تم تسليمها بواسطته.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmDriver(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-all cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteDriver}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-500 transition-all cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>نعم، حذف المندوب</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Driver Statement & Orders History Modal */}
      <DriverStatementModal
        isOpen={Boolean(statementDriver)}
        onClose={() => setStatementDriver(null)}
        driver={statementDriver}
        orders={orders}
      />

      {/* Comprehensive Global Delivery Operations & Fleet Report Modal */}
      <GlobalDeliveryReportModal
        isOpen={isGlobalReportModalOpen}
        onClose={() => setIsGlobalReportModalOpen(false)}
        drivers={driversWithStats}
        orders={orders}
        onOpenDriverStatement={(driver) => setStatementDriver(driver)}
      />

      {/* Printer Size & Layout Selector Modal (Reset 80mm / 58mm / A4 / A5) */}
      <PrintSizeSelectorModal
        isOpen={showPrintSizeModal}
        onClose={() => setShowPrintSizeModal(false)}
        onPrint={(layout, mode = 'print') => {
          exportAndPrintAllDriversReport(driversWithStats, orders, {
            periodLabel: 'جميع الفترات',
            generatedBy: 'إدارة أسطول التوصيل - بامبورينا',
            autoPrint: mode === 'print',
            initialLayout: layout,
          });
        }}
        onConfirmPrint={(layout, mode = 'print') => {
          exportAndPrintAllDriversReport(driversWithStats, orders, {
            periodLabel: 'جميع الفترات',
            generatedBy: 'إدارة أسطول التوصيل - بامبورينا',
            autoPrint: mode === 'print',
            initialLayout: layout,
          });
        }}
        reportTitle="التقرير الشامل لأداء وعمليات كباتن التوصيل (Reset / A4)"
        recordCount={driversWithStats.length}
      />
    </div>
  );
};
