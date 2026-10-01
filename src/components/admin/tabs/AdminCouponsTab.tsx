import React, { useState, useEffect, useMemo } from 'react';
import { Coupon, Category, Branch, Product, DiscountType } from '../../../types';
import { couponService, normalizeCouponCode } from '../../../services/couponService';
import { useRBAC } from '../../../context/RBACContext';
import { useToast } from '../../ui/Toast';
import {
  Tag,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Sparkles,
  Percent,
  DollarSign,
  Search,
  Filter,
  Layers,
  Store,
  Utensils,
  Copy,
  Check,
  Power,
  RotateCcw,
  Loader2,
  X,
  AlertTriangle,
  FileText,
  ShieldCheck,
  TrendingUp,
  Sliders,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatPrice } from '../../../lib/utils';
import { getAccurateNow } from '../../../utils/dateFormatter';

interface AdminCouponsTabProps {
  categories?: Category[];
  branches?: Branch[];
  products?: Product[];
}

export const AdminCouponsTab: React.FC<AdminCouponsTabProps> = ({
  categories = [],
  branches = [],
  products = [],
}) => {
  const { isAdmin, hasPermission } = useRBAC();
  const { showToast } = useToast();
  const canManage = isAdmin || hasPermission('offers.manage') || hasPermission('settings.manage');

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [filterType, setFilterType] = useState<'all' | 'percentage' | 'fixed'>('all');

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete Modal States
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Copy Feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form Fields
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDiscountType, setFormDiscountType] = useState<DiscountType>('percentage');
  const [formDiscountValue, setFormDiscountValue] = useState<number>(10);
  const [formMinOrder, setFormMinOrder] = useState<string>('');
  const [formMaxDiscount, setFormMaxDiscount] = useState<string>('');
  const [formStartDate, setFormStartDate] = useState<string>('');
  const [formEndDate, setFormEndDate] = useState<string>('');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formUsageLimit, setFormUsageLimit] = useState<string>('');
  const [formPerUserLimit, setFormPerUserLimit] = useState<string>('');
  const [formApplicableBranches, setFormApplicableBranches] = useState<string[]>([]);
  const [formApplicableCategories, setFormApplicableCategories] = useState<string[]>([]);
  const [formApplicableProducts, setFormApplicableProducts] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState('');

  // Subscribe to real-time coupons from Firestore
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = couponService.subscribeToCoupons(
      (liveCoupons) => {
        setCoupons(liveCoupons);
        setIsLoading(false);
      },
      (err) => {
        console.error('Coupons subscription notice:', err);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Stats
  const stats = useMemo(() => {
    const total = coupons.length;
    const active = coupons.filter((c) => c.isActive !== false).length;
    const totalUsages = coupons.reduce((sum, c) => sum + (c.usageCount || 0), 0);
    const totalPercentage = coupons.filter((c) => c.discountType === 'percentage').length;
    const totalFixed = coupons.filter((c) => c.discountType === 'fixed').length;

    return { total, active, totalUsages, totalPercentage, totalFixed };
  }, [coupons]);

  // Filtered list
  const filteredCoupons = useMemo(() => {
    const now = getAccurateNow();

    return coupons.filter((c) => {
      // Search filter
      const matchesSearch =
        !searchQuery ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Status filter
      if (filterStatus === 'active' && c.isActive === false) return false;
      if (filterStatus === 'inactive' && c.isActive !== false) return false;
      if (filterStatus === 'expired') {
        if (!c.endDate) return false;
        const end = new Date(c.endDate);
        if (c.endDate.length <= 10) end.setHours(23, 59, 59, 999);
        if (now <= end) return false;
      }

      // Type filter
      if (filterType !== 'all') {
        const type = c.discountType || 'percentage';
        if (type !== filterType) return false;
      }

      return true;
    });
  }, [coupons, searchQuery, filterStatus, filterType]);

  // Handle Copy code
  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      showToast('تم نسخ الكود ✓', code, 'success');
      setTimeout(() => setCopiedCode(null), 2500);
    });
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setFormCode('');
    setFormName('');
    setFormDescription('');
    setFormDiscountType('percentage');
    setFormDiscountValue(10);
    setFormMinOrder('');
    setFormMaxDiscount('');
    setFormStartDate('');
    setFormEndDate('');
    setFormIsActive(true);
    setFormUsageLimit('');
    setFormPerUserLimit('');
    setFormApplicableBranches([]);
    setFormApplicableCategories([]);
    setFormApplicableProducts([]);
    setFormNotes('');
    setModalError(null);
    setIsEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (c: Coupon) => {
    setEditingCoupon(c);
    setFormCode(c.code);
    setFormName(c.name || '');
    setFormDescription(c.description || '');
    setFormDiscountType(c.discountType || 'percentage');
    setFormDiscountValue(c.discountValue || c.discountPercent || 10);
    setFormMinOrder(c.minimumOrderAmount !== undefined ? String(c.minimumOrderAmount) : '');
    setFormMaxDiscount(c.maximumDiscountAmount !== undefined ? String(c.maximumDiscountAmount) : '');
    setFormStartDate(c.startDate ? c.startDate.substring(0, 10) : '');
    setFormEndDate(c.endDate ? c.endDate.substring(0, 10) : '');
    setFormIsActive(c.isActive !== false);
    setFormUsageLimit(c.usageLimit !== undefined ? String(c.usageLimit) : '');
    setFormPerUserLimit(c.perUserLimit !== undefined ? String(c.perUserLimit) : '');
    setFormApplicableBranches(c.applicableBranches || []);
    setFormApplicableCategories(c.applicableCategories || []);
    setFormApplicableProducts(c.applicableProducts || []);
    setFormNotes(c.notes || '');
    setModalError(null);
    setIsEditModalOpen(true);
  };

  // Handle Save (Create or Update)
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      showToast('غير مصرح', 'ليس لديك صلاحية لإدارة الكوبونات', 'error');
      return;
    }

    const code = normalizeCouponCode(formCode);
    if (!code || code.length < 2) {
      setModalError('يرجى إدخال رمز كود كوبون صحيح (حرفين على الأقل باللغة الإنجليزية أو الأرقام).');
      return;
    }

    if (isNaN(formDiscountValue) || formDiscountValue <= 0) {
      setModalError('يرجى إدخال قيمة خصم موجبة أكبر من صفر.');
      return;
    }

    if (formDiscountType === 'percentage' && formDiscountValue > 100) {
      setModalError('نسبة الخصم المئوية لا يمكن أن تتجاوز 100%.');
      return;
    }

    setIsSaving(true);
    setModalError(null);

    const couponPayload: Omit<Coupon, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'> = {
      code,
      name: formName.trim() || `كوبون ${code}`,
      description: formDescription.trim() || (formDiscountType === 'percentage' ? `خصم ${formDiscountValue}% على الطلب` : `خصم ${formDiscountValue} ج.م على الطلب`),
      discountType: formDiscountType,
      discountValue: Number(formDiscountValue),
      discountPercent: formDiscountType === 'percentage' ? Number(formDiscountValue) : undefined,
      minimumOrderAmount: formMinOrder.trim() ? Number(formMinOrder) : undefined,
      maximumDiscountAmount: formMaxDiscount.trim() ? Number(formMaxDiscount) : undefined,
      startDate: formStartDate.trim() ? formStartDate.trim() : undefined,
      endDate: formEndDate.trim() ? formEndDate.trim() : undefined,
      isActive: formIsActive,
      enabled: formIsActive,
      usageLimit: formUsageLimit.trim() ? Number(formUsageLimit) : undefined,
      perUserLimit: formPerUserLimit.trim() ? Number(formPerUserLimit) : undefined,
      applicableBranches: formApplicableBranches.length > 0 ? formApplicableBranches : undefined,
      applicableCategories: formApplicableCategories.length > 0 ? formApplicableCategories : undefined,
      applicableProducts: formApplicableProducts.length > 0 ? formApplicableProducts : undefined,
      notes: formNotes.trim() || undefined,
    };

    try {
      if (editingCoupon && editingCoupon.id) {
        await couponService.updateCoupon(editingCoupon.id, couponPayload);
        showToast('تم تحديث الكوبون بنجاح ✓', `تم حفظ التعديلات على الكوبون ${code} في Firestore فوراً`, 'success');
      } else {
        await couponService.createCoupon(couponPayload);
        showToast('تم إنشاء الكوبون بنجاح 🎉', `تمت إضافة الكوبون ${code} في Firestore وتفعيله على الموقع فوراً`, 'success');
      }
      setIsEditModalOpen(false);
    } catch (err: any) {
      console.error('Error saving coupon:', err);
      setModalError(err.message || 'حدث خطأ أثناء حفظ الكوبون في Firestore');
      showToast('فشل الحفظ', err.message || 'تعذر حفظ الكوبون', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Quick Toggle Active
  const handleToggleActive = async (c: Coupon) => {
    if (!canManage || !c.id) return;
    const newState = !(c.isActive !== false);

    try {
      await couponService.toggleCouponActive(c.id, newState);
      showToast(
        newState ? 'تم تفعيل الكوبون ✓' : 'تم تعطيل الكوبون',
        `الكوبون ${c.code} ${newState ? 'أصبح متاحاً للعملاء الآن' : 'تم إيقافه عن العمل'}`,
        newState ? 'success' : 'info'
      );
    } catch (err: any) {
      showToast('خطأ', err.message || 'فشل تغيير حالة الكوبون', 'error');
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!canManage || !couponToDelete || !couponToDelete.id) return;

    setIsDeleting(true);
    try {
      await couponService.deleteCoupon(couponToDelete.id, couponToDelete.code);
      showToast('تم حذف الكوبون بنجاح', `تم حذف الكوبون ${couponToDelete.code} نهائياً من Firestore`, 'success');
      setCouponToDelete(null);
    } catch (err: any) {
      showToast('خطأ في الحذف', err.message || 'تعذر حذف الكوبون', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helpers for Status indicator
  const getCouponTimeStatus = (c: Coupon) => {
    const now = getAccurateNow();
    if (c.isActive === false) {
      return { label: 'معطل', color: 'bg-neutral-800 text-neutral-400 border-neutral-700' };
    }
    if (c.startDate) {
      const start = new Date(c.startDate);
      if (now < start) {
        return { label: 'قادم قريباً', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
      }
    }
    if (c.endDate) {
      const end = new Date(c.endDate);
      if (c.endDate.length <= 10) end.setHours(23, 59, 59, 999);
      if (now > end) {
        return { label: 'منتهي الصلاحية', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
      }
    }
    if (c.usageLimit && (c.usageCount || 0) >= c.usageLimit) {
      return { label: 'استنفد الحد', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    }
    return { label: 'فعال ونشط 🟢', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12" dir="rtl">
      {/* 1. Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-[#1F1811] border border-amber-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                كوبونات الخصم والعروض الترويجية
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                Firestore Realtime
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              إدارة وتخصيص قسائم الخصومات المئوية والمبالغ الثابتة وتحديد شروط الاستخدام وانعكاسها اللحظي على سلة المشتريات وفواتير الطلبات.
            </p>
          </div>
        </div>

        {canManage && (
          <button
            onClick={handleOpenCreate}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-neutral-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-98 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة كوبون جديد</span>
          </button>
        )}
      </div>

      {/* 2. Stats Dashboard Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-neutral-400 font-medium block">إجمالي الكوبونات</span>
            <span className="text-xl font-bold text-white mt-1 block font-mono">{stats.total}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-neutral-400 font-medium block">الكوبونات الفعالة</span>
            <span className="text-xl font-bold text-emerald-400 mt-1 block font-mono">{stats.active}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-neutral-400 font-medium block">مرات الاستخدام</span>
            <span className="text-xl font-bold text-amber-400 mt-1 block font-mono">{stats.totalUsages}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-neutral-400 font-medium block">أنواع الخصومات</span>
            <span className="text-xs font-bold text-neutral-200 mt-1 block">
              {stats.totalPercentage} نسبة % | {stats.totalFixed} ثابت
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <Percent className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث برمز الكوبون (Code) أو الاسم أو الوصف..."
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/60 rounded-xl pr-10 pl-4 py-2 text-xs sm:text-sm text-white placeholder-neutral-500 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={filterStatus}
            onChange={(e: any) => setFilterStatus(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-300 outline-none focus:border-amber-500/50 cursor-pointer"
          >
            <option value="all">جميع الحالات</option>
            <option value="active">الفعالة فقط</option>
            <option value="inactive">المعطلة</option>
            <option value="expired">المنتهية</option>
          </select>

          <select
            value={filterType}
            onChange={(e: any) => setFilterType(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-300 outline-none focus:border-amber-500/50 cursor-pointer"
          >
            <option value="all">جميع الأنواع</option>
            <option value="percentage">نسبة مئوية (%)</option>
            <option value="fixed">مبلغ ثابت (ج.م)</option>
          </select>
        </div>
      </div>

      {/* 4. Coupons List */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <span className="text-xs">جاري تحميل الكوبونات من Firestore...</span>
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="py-16 px-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-neutral-800 text-neutral-500 mx-auto flex items-center justify-center">
            <Tag className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-white">لا توجد كوبونات مطابقة</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {searchQuery || filterStatus !== 'all' || filterType !== 'all'
              ? 'لم يتم العثور على أي كوبون يطابق معايير التصفية والبحث الحالية.'
              : 'لم يتم إضافة أي كوبونات خصم بعد في قاعدة البيانات.'}
          </p>
          {canManage && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 text-xs font-bold hover:bg-amber-400 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إنشاء أول كوبون الآن</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCoupons.map((c) => {
            const timeStatus = getCouponTimeStatus(c);
            const isPerc = c.discountType === 'percentage';
            const usageLimit = c.usageLimit || 0;
            const usageCount = c.usageCount || 0;
            const usageProgress = usageLimit > 0 ? Math.min(100, (usageCount / usageLimit) * 100) : 0;

            return (
              <div
                key={c.id || c.code}
                className={`p-4 sm:p-5 rounded-2xl bg-neutral-900 border transition-all duration-200 flex flex-col justify-between relative overflow-hidden group ${
                  c.isActive !== false ? 'border-neutral-800 hover:border-amber-500/40 shadow-md' : 'border-neutral-800/60 opacity-75'
                }`}
              >
                {/* Top Badge Row */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold ${timeStatus.color}`}>
                      {timeStatus.label}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700 font-mono">
                      {isPerc ? 'نسبة مئوية' : 'مبلغ ثابت'}
                    </span>
                  </div>

                  {/* Active Switch */}
                  {canManage && (
                    <button
                      onClick={() => handleToggleActive(c)}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        c.isActive !== false
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700'
                      }`}
                      title={c.isActive !== false ? 'تعطيل الكوبون' : 'تفعيل الكوبون'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Coupon Code Box */}
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                      {isPerc ? <Percent className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] text-neutral-400 block font-sans">رمز الكوبون</span>
                      <span className="text-sm sm:text-base font-mono font-black text-amber-400 tracking-wider truncate block" dir="ltr">
                        {c.code}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleCopy(c.code)}
                      className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors cursor-pointer"
                      title="نسخ الكود"
                    >
                      {copiedCode === c.code ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4 text-xs flex-1">
                  <div className="flex items-baseline justify-between border-b border-neutral-800/60 pb-1.5">
                    <span className="text-neutral-400">قيمة الخصم:</span>
                    <span className="font-bold text-white font-mono text-sm">
                      {isPerc ? `${c.discountValue}%` : formatPrice(c.discountValue || 0)}
                    </span>
                  </div>

                  {c.name && (
                    <div className="text-neutral-300 font-semibold truncate" title={c.name}>
                      {c.name}
                    </div>
                  )}

                  <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                    {c.description}
                  </p>

                  {/* Conditions Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {c.minimumOrderAmount && c.minimumOrderAmount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800/80 text-amber-300/90 border border-neutral-700">
                        الحد الأدنى: {formatPrice(c.minimumOrderAmount)}
                      </span>
                    )}
                    {isPerc && c.maximumDiscountAmount && c.maximumDiscountAmount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800/80 text-teal-300/90 border border-neutral-700">
                        أقصى خصم: {formatPrice(c.maximumDiscountAmount)}
                      </span>
                    )}
                    {c.endDate && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800/80 text-neutral-400 border border-neutral-700 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        ينتهي: {c.endDate.substring(0, 10)}
                      </span>
                    )}
                  </div>

                  {/* Usage Counter Bar */}
                  {usageLimit > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1 font-mono">
                        <span>الاستخدامات: {usageCount} / {usageLimit}</span>
                        <span>{Math.round(usageProgress)}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            usageProgress >= 100 ? 'bg-rose-500' : usageProgress > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${usageProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Target constraints */}
                  {(c.applicableBranches || c.applicableCategories || c.applicableProducts) && (
                    <div className="pt-1 flex flex-wrap gap-1 text-[10px] text-neutral-400">
                      {c.applicableBranches && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {c.applicableBranches.length} فروع مخصصة
                        </span>
                      )}
                      {c.applicableCategories && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {c.applicableCategories.length} أقسام محددة
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                {canManage && (
                  <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-colors cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5 text-amber-400" />
                      <span>تعديل</span>
                    </button>

                    <button
                      onClick={() => setCouponToDelete(c)}
                      className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                      title="حذف الكوبون"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Add / Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8 flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60 sticky top-0 z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      {editingCoupon ? 'تعديل بيانات كوبون الخصم' : 'إنشاء كوبون خصم جديد'}
                    </h3>
                    <span className="text-[11px] text-neutral-400">حفظ مباشر وفوري في Cloud Firestore</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body / Form */}
              <form onSubmit={handleSaveCoupon} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                {modalError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Code & Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      رمز الكوبون (Code) <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                      placeholder="مثال: PAMBORINA20"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-amber-400 font-mono font-bold tracking-wider uppercase outline-none"
                    />
                    <span className="text-[10px] text-neutral-500 mt-1 block">يتم تحويله تلقائياً لأحرف إنجليزية كبيرة</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      نوع الخصم <span className="text-amber-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormDiscountType('percentage')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          formDiscountType === 'percentage'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                            : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                        }`}
                      >
                        <Percent className="w-3.5 h-3.5" />
                        <span>نسبة مئوية (%)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormDiscountType('fixed')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          formDiscountType === 'fixed'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                            : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                        }`}
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>مبلغ ثابت (ج.م)</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Discount Value & Max Cap */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      قيمة الخصم ({formDiscountType === 'percentage' ? '%' : 'ج.م'}) <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={formDiscountType === 'percentage' ? 100 : 10000}
                      value={formDiscountValue}
                      onChange={(e) => setFormDiscountValue(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono font-bold outline-none"
                    />
                  </div>

                  {formDiscountType === 'percentage' && (
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                        الحد الأقصى للخصم (ج.م) <span className="text-neutral-500">(اختياري)</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formMaxDiscount}
                        onChange={(e) => setFormMaxDiscount(e.target.value)}
                        placeholder="مثال: 100 (سقف الخصم)"
                        className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      الحد الأدنى لقيمة الطلب (ج.م) <span className="text-neutral-500">(اختياري)</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formMinOrder}
                      onChange={(e) => setFormMinOrder(e.target.value)}
                      placeholder="مثال: 150"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none"
                    />
                  </div>
                </div>

                {/* Name & Description */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      اسم الكوبون (بالعربية)
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="مثال: خصم الأعياد الملكي"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      وصف وشروط العرض للعميل
                    </label>
                    <input
                      type="text"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="مثال: خصم 20% على جميع أصناف الحلويات الشرقية"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none"
                    />
                  </div>
                </div>

                {/* Date Ranges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      تاريخ بدء الكوبون <span className="text-neutral-500">(اختياري)</span>
                    </label>
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      تاريخ انتهاء الكوبون <span className="text-neutral-500">(اختياري)</span>
                    </label>
                    <input
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none"
                    />
                  </div>
                </div>

                {/* Usage Limits */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      الحد الأقصى للاستخدام إجمالاً <span className="text-neutral-500">(فارغ = غير محدود)</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formUsageLimit}
                      onChange={(e) => setFormUsageLimit(e.target.value)}
                      placeholder="مثال: 500"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      الحد الأقصى لكل عميل (لكل رقم هاتف)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formPerUserLimit}
                      onChange={(e) => setFormPerUserLimit(e.target.value)}
                      placeholder="مثال: 1"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none"
                    />
                  </div>
                </div>

                {/* Branch constraints selector */}
                {branches && branches.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      تخصيص الفروع المشمولة <span className="text-neutral-500">(إذا لم يُحدد أي فرع ينطبق على الكل)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {branches.map((b) => {
                        const isSelected = formApplicableBranches.includes(b.id);
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setFormApplicableBranches((prev) => prev.filter((id) => id !== b.id));
                              } else {
                                setFormApplicableBranches((prev) => [...prev, b.id]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                            }`}
                          >
                            <Store className="w-3.5 h-3.5" />
                            <span>{b.nameAr}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Categories constraints selector */}
                {categories && categories.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      تخصيص أقسام المنيو <span className="text-neutral-500">(فارغ = ينطبق على جميع الأصناف)</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-neutral-950 rounded-xl border border-neutral-800">
                      {categories.map((cat) => {
                        const isSelected = formApplicableCategories.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setFormApplicableCategories((prev) => prev.filter((id) => id !== cat.id));
                              } else {
                                setFormApplicableCategories((prev) => [...prev, cat.id]);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 font-bold'
                                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                            }`}
                          >
                            {cat.nameAr}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Active Toggle & Internal Notes */}
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">حالة تفعيل الكوبون</span>
                    <span className="text-[11px] text-neutral-400">عند التعطيل لن يتمكن العملاء من تطبيق هذا الكود</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    ملاحظات داخلية للإدارة <span className="text-neutral-500">(لن تظهر للعميل)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="ملاحظات حملة إعلانات تيك توك، إلخ..."
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={isSaving}
                    className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs sm:text-sm font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري الحفظ في Firestore...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{editingCoupon ? 'حفظ التعديلات' : 'إنشاء وتفعيل الكوبون'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Delete Confirmation Modal */}
      <AnimatePresence>
        {couponToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-rose-500/30 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-white">تأكيد حذف الكوبون</h3>
                <p className="text-xs text-neutral-400">
                  هل أنت متأكد من رغبتك في حذف الكوبون (<span className="font-mono font-bold text-amber-400">{couponToDelete.code}</span>) نهائياً من Firestore؟ لن يتمكن أي عميل من استخدامه بعد ذلك.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCouponToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الحذف...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>تأكيد الحذف</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
