import React, { useState, useEffect } from 'react';
import {
  Truck,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Save,
  Gift,
  HelpCircle,
  Eye,
  Info,
} from 'lucide-react';
import { DeliveryFeeConfig } from '../../../types';
import { deliveryFeeService, DEFAULT_DELIVERY_CONFIG } from '../../../services/deliveryFeeService';
import { formatPrice } from '../../../lib/utils';
import { useToast } from '../../ui/Toast';

export const AdminDeliveryFeeTab: React.FC = () => {
  const { showToast } = useToast();

  const [config, setConfig] = useState<DeliveryFeeConfig>(() =>
    deliveryFeeService.getDeliveryFeeConfigSync()
  );
  const [feeInput, setFeeInput] = useState<string>(String(config.fee));
  const [thresholdInput, setThresholdInput] = useState<string>(
    String(config.freeDeliveryThreshold ?? 200)
  );
  const [isEnabled, setIsEnabled] = useState<boolean>(config.enabled);
  const [notesAr, setNotesAr] = useState<string>(config.notesAr || '');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<{ fee?: string; threshold?: string }>({});

  // Real-time synchronization with Firestore
  useEffect(() => {
    const unsub = deliveryFeeService.subscribeToDeliveryFee((newConfig) => {
      setConfig(newConfig);
      setFeeInput(String(newConfig.fee));
      setThresholdInput(String(newConfig.freeDeliveryThreshold ?? 200));
      setIsEnabled(newConfig.enabled);
      setNotesAr(newConfig.notesAr || '');
      setHasChanges(false);
    });

    return () => unsub();
  }, []);

  // Track changes against currently loaded config
  const handleFeeChange = (val: string) => {
    setFeeInput(val);
    setHasChanges(true);

    const num = Number(val);
    if (val.trim() === '' || isNaN(num)) {
      setErrors((prev) => ({ ...prev, fee: 'يرجى إدخال رقم صحيح' }));
    } else if (num < 0) {
      setErrors((prev) => ({ ...prev, fee: 'لا يمكن أن يكون سعر التوصيل سالباً' }));
    } else {
      setErrors((prev) => ({ ...prev, fee: undefined }));
    }
  };

  const handleThresholdChange = (val: string) => {
    setThresholdInput(val);
    setHasChanges(true);

    const num = Number(val);
    if (val.trim() === '' || isNaN(num)) {
      setErrors((prev) => ({ ...prev, threshold: 'يرجى إدخال رقم صحيح' }));
    } else if (num < 0) {
      setErrors((prev) => ({ ...prev, threshold: 'لا يمكن أن يكون الحد سالباً' }));
    } else {
      setErrors((prev) => ({ ...prev, threshold: undefined }));
    }
  };

  const handleToggleEnabled = (checked: boolean) => {
    setIsEnabled(checked);
    setHasChanges(true);
  };

  const handleNotesChange = (val: string) => {
    setNotesAr(val);
    setHasChanges(true);
  };

  const handleApplyPresetFee = (presetFee: number) => {
    setFeeInput(String(presetFee));
    setHasChanges(true);
    setErrors((prev) => ({ ...prev, fee: undefined }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const parsedFee = Number(feeInput);
    const parsedThreshold = Number(thresholdInput);

    if (isNaN(parsedFee) || parsedFee < 0) {
      showToast('خطأ في البيانات', 'يرجى إدخال سعر توصيل صحيح (رقم لا يقل عن 0)', 'error');
      return;
    }

    if (isNaN(parsedThreshold) || parsedThreshold < 0) {
      showToast('خطأ في البيانات', 'يرجى إدخال حد أدنى صالح للتوصيل المجاني', 'error');
      return;
    }

    setIsSaving(true);

    try {
      await deliveryFeeService.updateDeliveryFeeConfig({
        fee: parsedFee,
        currency: 'EGP',
        enabled: isEnabled,
        freeDeliveryThreshold: parsedThreshold,
        notesAr: notesAr.trim(),
      });

      setHasChanges(false);
      showToast(
        'تم حفظ إعدادات التوصيل بنجاح',
        `سعر التوصيل الحالي: ${formatPrice(parsedFee)} | الحالة: ${isEnabled ? 'مفعل' : 'معطل'}`,
        'success'
      );
    } catch (err: any) {
      showToast('فشل الحفظ', err.message || 'حدث خطأ أثناء حفظ الإعدادات', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    setFeeInput(String(DEFAULT_DELIVERY_CONFIG.fee));
    setThresholdInput(String(DEFAULT_DELIVERY_CONFIG.freeDeliveryThreshold ?? 200));
    setIsEnabled(DEFAULT_DELIVERY_CONFIG.enabled);
    setNotesAr(DEFAULT_DELIVERY_CONFIG.notesAr || '');
    setHasChanges(true);
    setErrors({});
  };

  return (
    <div className="space-y-6 dir-rtl text-white">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 border border-amber-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white font-heading flex items-center gap-2">
              <span>إدارة سعر التوصيل والخدمات اللوجستية</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-sans font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>مباشر على الموقع</span>
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              يتم حفظ السعر في قاعدة البيانات (Firestore settings/delivery) وينعكس لحظياً في السلة وصفحة إتمام الطلب لكافة العملاء.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-all cursor-pointer"
          >
            استعادة الافتراضي (30 ج.م)
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving || !hasChanges || !!errors.fee || !!errors.threshold}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>حفظ التعديلات الآن</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Settings Form & Customer Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Main Column (7 cols): Form Controls */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card 1: Toggle Service Status */}
          <div className="p-5 rounded-3xl bg-neutral-800/90 border border-neutral-700/80 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">حالة خدمة التوصيل للمنازل (دليفري)</h3>
                  <p className="text-[11px] text-neutral-400">
                    {isEnabled ? 'الخدمة مفعلة ويستطيع العميل طلب التوصيل للمنزل' : 'الخدمة معطلة مؤقتاً (استلام من الفرع فقط)'}
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => handleToggleEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>

            {!isEnabled && (
              <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>تنبيه: عند إيقاف التوصيل، سيتم توجيه العملاء إلى خيار "الاستلام من الفرع" فقط في السلة.</span>
              </div>
            )}
          </div>

          {/* Card 2: Delivery Fee Amount */}
          <div className="p-5 rounded-3xl bg-neutral-800/90 border border-neutral-700/80 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-700/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">سعر التوصيل الأساسي (ج.م)</h3>
                  <p className="text-[11px] text-neutral-400">المبلغ المالي الثابت المحسوب لطلبات التوصيل للمنازل</p>
                </div>
              </div>
              <span className="text-base font-black text-amber-400 font-mono">
                {formatPrice(Number(feeInput) || 0)}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-300 block">
                أدخل قيمة السعر (بالجنيه المصري):
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={feeInput}
                  onChange={(e) => handleFeeChange(e.target.value)}
                  placeholder="30"
                  className={`w-full px-4 py-3 rounded-2xl bg-neutral-900 border text-white font-mono text-base font-bold focus:outline-none transition-all ${
                    errors.fee ? 'border-rose-500 focus:border-rose-500' : 'border-neutral-700 focus:border-amber-400'
                  }`}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                  جنيه مصري (EGP)
                </span>
              </div>
              {errors.fee && (
                <p className="text-xs text-rose-400 flex items-center gap-1 font-bold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.fee}</span>
                </p>
              )}
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] font-bold text-neutral-400">خيارات سريعة شائعة:</span>
              <div className="flex flex-wrap gap-2">
                {[15, 20, 25, 30, 35, 40, 50].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleApplyPresetFee(preset)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      Number(feeInput) === preset
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-sm'
                        : 'bg-neutral-900/80 text-neutral-300 border-neutral-700 hover:border-amber-500/50 hover:text-white'
                    }`}
                  >
                    {preset} ج.م
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card 3: Free Delivery Motivation Bar & Threshold Settings */}
          <div className="p-5 rounded-3xl bg-[#18120B] border-2 border-amber-500/40 shadow-xl space-y-4 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <span>شريط وإعدادات التوصيل المجاني للموقع 🚀</span>
                  </h3>
                  <p className="text-[11px] text-amber-200/80">
                    التحكم في تفعيل أو إخفاء الشريط تحديد قيمة الفاتورة المطلوبة للتوصيل المجاني
                  </p>
                </div>
              </div>

              {/* Instant Toggle Button for Free Delivery Bar */}
              <button
                type="button"
                onClick={() => handleToggleEnabled(!isEnabled)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black border flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                  isEnabled
                    ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/80 shadow-md shadow-emerald-950/40'
                    : 'bg-rose-950/80 border-rose-500/60 text-rose-300 hover:bg-rose-900/80 shadow-md shadow-rose-950/40'
                }`}
              >
                {isEnabled ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>ظاهر على الموقع 🟢</span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span>مخفي من الموقع 🔴</span>
                  </>
                )}
              </button>
            </div>

            {/* Threshold Input & Presets */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-300 block">
                  مبلغ الفاتورة المستهدفة للتوصيل المجاني (EGP):
                </label>
                <span className="text-[10px] text-amber-400 font-mono font-bold">
                  الحالي: {thresholdInput} ج.م
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={thresholdInput}
                  onChange={(e) => handleThresholdChange(e.target.value)}
                  placeholder="200"
                  className={`w-full px-4 py-3 rounded-2xl bg-neutral-900 border text-white font-mono text-base font-bold focus:outline-none transition-all ${
                    errors.threshold ? 'border-rose-500 focus:border-rose-500' : 'border-neutral-700 focus:border-amber-400'
                  }`}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400">
                  ج.م
                </span>
              </div>

              {/* Quick Preset Buttons for Threshold */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-[11px] text-neutral-400 font-bold">خيارات سريعة:</span>
                {[150, 200, 250, 300, 500].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleThresholdChange(String(preset))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      Number(thresholdInput) === preset
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-sm font-black'
                        : 'bg-neutral-900/80 text-neutral-300 border-neutral-700 hover:border-amber-500/50 hover:text-white'
                    }`}
                  >
                    {preset} ج.م
                  </button>
                ))}
              </div>

              {errors.threshold && (
                <p className="text-xs text-rose-400 flex items-center gap-1 font-bold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.threshold}</span>
                </p>
              )}
            </div>

            {/* Visual Live Text Example Breakdown */}
            <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-2 text-xs">
              <span className="text-[11px] font-bold text-amber-300 block">
                معاينة النص التلقائي الذي يظهر للعميل في شريط الصفحة الرئيسية:
              </span>
              <div className="space-y-1 text-neutral-300 bg-black/40 p-2.5 rounded-xl border border-neutral-800/80 text-[11px] font-medium leading-relaxed">
                <p className="text-amber-200 font-bold">
                  1. عنوان التحفيز: "أضف منتجات بقيمة {thresholdInput || 200} ج.م أخرى للحصول على توصيل مجاني 🚀"
                </p>
                <p className="text-neutral-400">
                  2. الوصف التفصيلي: "الحد الأدنى للتوصيل المجاني من فرع الطالبية هرم هو {thresholdInput || 200} ج.م"
                </p>
                <p className="text-teal-300">
                  3. مؤشر التقدم: "تقدم التوصيل المجاني"
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: Arabic Customer Delivery Notes */}
          <div className="p-5 rounded-3xl bg-neutral-800/90 border border-neutral-700/80 shadow-lg space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Info className="w-4 h-4 text-amber-400" />
              <span>ملاحظات وإرشادات التوصيل المعروضة للعميل:</span>
            </div>
            <textarea
              rows={3}
              value={notesAr}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="مثال: التوصيل متاح لمناطق فيصل، الهرم، والعشرين، وتصل الطلبات طازجة خلال 30-45 دقيقة..."
              className="w-full p-3 rounded-2xl bg-neutral-900 border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Right Column (5 cols): Live Interactive Customer Preview & Metadata */}
        <div className="lg:col-span-5 space-y-5">
          {/* Customer View Simulation Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-b from-[#1F150D] to-[#140D08] border border-amber-500/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#3D2C1E]">
              <span className="text-xs font-extrabold text-[#F4E08B] flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-amber-400" />
                <span>معاينة حية لشاشة العميل في السلة</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                مباشر
              </span>
            </div>

            {/* Simulated Checkout Breakdown */}
            <div className="space-y-3 text-xs bg-[#100905] p-4 rounded-2xl border border-[#2C1F16]">
              <div className="flex justify-between items-center text-neutral-400">
                <span>سعر المنتجات (مثال):</span>
                <span className="text-white font-bold font-mono">150 ج.م</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-neutral-300 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-amber-400" />
                  <span>رسوم التوصيل للمنزل:</span>
                </span>
                {isEnabled ? (
                  <span className="text-amber-400 font-bold font-mono text-sm">
                    {formatPrice(Number(feeInput) || 0)}
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold text-[11px]">
                    التوصيل غير متاح مؤقتاً
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center text-neutral-400 text-[11px] pt-1">
                <span>استلام من الفرع (Pickup):</span>
                <span className="text-emerald-400 font-bold">مجاناً (0 ج.م)</span>
              </div>

              <div className="pt-2 border-t border-[#2C1F16] flex justify-between items-center">
                <span className="text-sm font-black text-white">الإجمالي النهائي للعميل:</span>
                <span className="text-lg font-black text-[#F4E08B] font-mono">
                  {formatPrice(150 + (isEnabled ? Number(feeInput) || 0 : 0))}
                </span>
              </div>
            </div>

            {/* Motivational Free Delivery Simulation */}
            {Number(thresholdInput) > 0 && (
              <div className="p-3 rounded-2xl bg-teal-950/40 border border-teal-500/30 text-teal-300 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    <span>حافز التوصيل المجاني:</span>
                  </span>
                  <span>أكثر من {thresholdInput} ج.م</span>
                </div>
                <p className="text-[11px] text-teal-200/80 leading-relaxed">
                  يظهر شريط تحفيزي في أعلى الصفحة يشجع العميل على زيادة الأصناف للحصول على توصيل مجاني.
                </p>
              </div>
            )}
          </div>

          {/* Metadata & Audit Information Card */}
          <div className="p-5 rounded-3xl bg-neutral-800/90 border border-neutral-700/80 shadow-lg space-y-3 text-xs">
            <h4 className="font-bold text-white flex items-center gap-2 pb-2 border-b border-neutral-700/60">
              <Clock className="w-4 h-4 text-neutral-400" />
              <span>معلومات التوثيق الأمني وقاعدة البيانات</span>
            </h4>

            <div className="space-y-2 text-neutral-300 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">مسار الحفظ في Firestore:</span>
                <code className="px-2 py-0.5 rounded bg-neutral-900 text-amber-400 font-mono text-[10px]">
                  settings/delivery
                </code>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-neutral-400">آخر تحديث تم في:</span>
                <span className="font-mono text-neutral-200">
                  {config.updatedAt
                    ? new Date(config.updatedAt).toLocaleString('ar-EG', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : 'القيم الافتراضية'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-neutral-400">بواسطة المشرف:</span>
                <span className="text-neutral-200 font-mono">
                  {config.updatedBy || 'admin@pamborina.com'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
