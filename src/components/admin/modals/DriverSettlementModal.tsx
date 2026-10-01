import React, { useState, useEffect } from 'react';
import {
  X,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Building2,
  Wallet,
  FileText,
  Loader2,
  TrendingDown,
  ShieldCheck,
  Receipt,
  ArrowRight,
} from 'lucide-react';
import { DeliveryDriver, Order, DriverSettlement } from '../../../types';
import { driverSettlementService } from '../../../services/driverSettlementService';
import { formatPrice } from '../../../lib/utils';
import { useToast } from '../../ui/Toast';

interface DriverSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: DeliveryDriver | null;
  orders: Order[];
  settlements: DriverSettlement[];
  onSettlementSuccess?: () => void;
}

export const DriverSettlementModal: React.FC<DriverSettlementModalProps> = ({
  isOpen,
  onClose,
  driver,
  orders,
  settlements,
  onSettlementSuccess,
}) => {
  const { showToast } = useToast();

  const [amountInput, setAmountInput] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'e_wallet' | 'other'>('cash');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Compute live metrics for driver
  const financialSummary = driver
    ? driverSettlementService.computeFinancialSummary(driver, orders, settlements)
    : { grossRevenue: 0, totalSettled: 0, outstandingBalance: 0, deliveredOrdersCount: 0, activeOrdersCount: 0 };

  const outstanding = financialSummary.outstandingBalance;

  // Reset form when modal opens with driver
  useEffect(() => {
    if (isOpen && driver) {
      setAmountInput(outstanding > 0 ? outstanding.toString() : '');
      setPaymentMethod('cash');
      setNotes('');
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [isOpen, driver, outstanding]);

  if (!isOpen || !driver) return null;

  const handleAmountChange = (val: string) => {
    setErrorMsg(null);
    setAmountInput(val);
  };

  const setFullAmount = () => {
    setErrorMsg(null);
    setAmountInput(outstanding.toString());
  };

  const setPresetAmount = (preset: number) => {
    setErrorMsg(null);
    if (preset <= outstanding) {
      setAmountInput(preset.toString());
    } else {
      setAmountInput(outstanding.toString());
    }
  };

  const parsedAmount = parseFloat(amountInput) || 0;
  const isOverOutstanding = parsedAmount > outstanding;
  const isValidAmount = parsedAmount > 0 && !isOverOutstanding;

  const handleSubmitSettlement = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidAmount) {
      if (parsedAmount <= 0) {
        setErrorMsg('يرجى إدخال مبلغ تسوية أكبر من صفر');
      } else if (isOverOutstanding) {
        setErrorMsg(`المبلغ المدخل (${parsedAmount} ج.م) يتجاوز الرصيد المستحق الحالي (${outstanding} ج.م)`);
      }
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const result = await driverSettlementService.createSettlement({
        driver,
        amount: parsedAmount,
        paymentMethod,
        notes,
        orders,
        settlements,
      });

      if (result.success) {
        showToast(
          'تمت التسوية المالية بنجاح',
          `تم تسجيل تصفية بمبلغ ${parsedAmount} ج.م للكابتن ${driver.name}`,
          'success'
        );

        if (onSettlementSuccess) onSettlementSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error('❌ Error executing settlement:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء إجراء التسوية المالية');
      showToast('تعذر إجراء التسوية', err.message || 'يرجى التأكد من البيانات والصلاحيات', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-neutral-950 via-neutral-900 to-[#1c140a] border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Receipt className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">تسوية حساب المندوب</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/30">
                  سند مالي
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-medium">
                الكابتن: <span className="text-amber-400 font-bold">{driver.name}</span> ({driver.phone})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors disabled:opacity-50"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmitSettlement} className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          
          {/* Financial Breakdown Cards */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            
            {/* Gross Earnings */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-neutral-950/70 border border-neutral-800 flex flex-col justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-neutral-400">إجمالي الرسوم</span>
              <div className="mt-1">
                <span className="text-xs sm:text-base font-black text-white">{formatPrice(financialSummary.grossRevenue)}</span>
                <p className="text-[9px] sm:text-[10px] text-neutral-500 mt-0.5">{financialSummary.deliveredOrdersCount} طلب مسلم</p>
              </div>
            </div>

            {/* Total Settled */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-neutral-950/70 border border-neutral-800 flex flex-col justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-neutral-400">المبلغ المسوّى</span>
              <div className="mt-1">
                <span className="text-xs sm:text-base font-black text-teal-400">{formatPrice(financialSummary.totalSettled)}</span>
                <p className="text-[9px] sm:text-[10px] text-neutral-500 mt-0.5">سندات مسجلة</p>
              </div>
            </div>

            {/* Outstanding Balance */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/40 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
              <span className="text-[10px] sm:text-xs font-bold text-amber-300">الرصيد المستحق</span>
              <div className="mt-1">
                <span className="text-xs sm:text-base font-black text-amber-400">{formatPrice(outstanding)}</span>
                <p className="text-[9px] sm:text-[10px] text-amber-300/70 mt-0.5">جاهز للتصفية</p>
              </div>
            </div>

          </div>

          {/* Outstanding warning or zero balance alert */}
          {outstanding === 0 ? (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3 text-emerald-300 text-xs sm:text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-200">حساب المندوب مصفّى بالكامل!</p>
                <p className="text-emerald-300/80 text-xs mt-0.5">
                  لا يوجد رصيد متبقي مستحق للتصفية للكابتن {driver.name} حالياً.
                </p>
              </div>
            </div>
          ) : null}

          {/* Settlement Amount Input Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-neutral-200 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                مبلغ التسوية المراد دفعه (ج.م) <span className="text-rose-400">*</span>
              </label>

              {outstanding > 0 && (
                <button
                  type="button"
                  onClick={setFullAmount}
                  className="text-[11px] sm:text-xs font-bold text-amber-400 hover:text-amber-300 underline transition-colors"
                >
                  تصفية المبلغ الكامل ({outstanding} ج.م)
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="number"
                step="any"
                min="1"
                max={outstanding}
                value={amountInput}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="أدخل مبلغ التسوية بالجنيه..."
                disabled={isSubmitting || outstanding === 0}
                className={`w-full px-4 py-3 sm:py-3.5 bg-neutral-950 border ${
                  isOverOutstanding
                    ? 'border-rose-500 focus:ring-rose-500/30'
                    : 'border-neutral-700 focus:border-emerald-500 focus:ring-emerald-500/30'
                } rounded-2xl text-white placeholder-neutral-500 font-bold text-base sm:text-lg focus:outline-none focus:ring-2 transition-all text-left dir-ltr`}
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-xs sm:text-sm font-black pointer-events-none">
                ج.م
              </div>
            </div>

            {/* Quick Presets */}
            {outstanding > 0 && (
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[11px] text-neutral-400 font-bold">مبالغ سريعة:</span>
                {[50, 100, 200, 500].map((preset) => {
                  if (preset > outstanding) return null;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPresetAmount(preset)}
                      className="px-2.5 py-1 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
                    >
                      +{preset} ج.م
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Validation Errors */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-500/40 flex items-center gap-2.5 text-rose-300 text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-bold text-neutral-200 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-amber-400" />
              طريقة الدفع / التسليم
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'cash', label: 'نقداً (كاش)', icon: DollarSign },
                { id: 'bank_transfer', label: 'تحويل بنكي / إنستا باي', icon: Building2 },
                { id: 'e_wallet', label: 'محفظة إلكترونية', icon: Wallet },
                { id: 'other', label: 'طريقة أخرى', icon: CreditCard },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = paymentMethod === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPaymentMethod(item.id as any)}
                    className={`p-2.5 sm:p-3 rounded-2xl border text-right flex flex-col items-start gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                        : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-neutral-400'}`} />
                    <span className="text-xs font-bold leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes Input */}
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-bold text-neutral-200 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-neutral-400" />
              ملاحظات / رقم السند أو العملية (اختياري)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أدخل أي ملاحظات إضافية بخصوص التسوية أو رقم تحويل إلكتروني..."
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-2xl text-white placeholder-neutral-500 text-xs sm:text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
            />
          </div>

          {/* Remaining Balance Preview */}
          {isValidAmount && (
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs sm:text-sm">
              <span className="text-neutral-400 font-bold">الرصيد المتبقي بعد هذه التسوية:</span>
              <span className="font-black text-amber-400 text-sm sm:text-base">
                {formatPrice(Math.max(0, outstanding - parsedAmount))}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors disabled:opacity-50"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !isValidAmount || outstanding === 0}
              className="px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>جاري تسجيل التسوية...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-white" />
                  <span>تأكيد واعتماد التسوية ({formatPrice(parsedAmount)})</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
