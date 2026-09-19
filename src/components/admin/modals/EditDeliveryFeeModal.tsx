import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Receipt,
  FileText,
  MapPin,
  User,
  Phone,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Order } from '../../../types';
import { formatPrice } from '../../../lib/utils';
import { firebaseOrderService } from '../../../services/firebaseOrderService';

interface EditDeliveryFeeModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onSuccess: (updatedOrder: Order) => void;
}

const COMMON_PRESETS = [
  { label: 'مجاني 🎁', value: 0 },
  { label: '15 ج.م', value: 15 },
  { label: '20 ج.م', value: 20 },
  { label: '25 ج.م', value: 25 },
  { label: '30 ج.م', value: 30 },
  { label: '35 ج.م', value: 35 },
  { label: '40 ج.م', value: 40 },
  { label: '50 ج.م', value: 50 },
];

export const EditDeliveryFeeModal: React.FC<EditDeliveryFeeModalProps> = ({
  isOpen,
  order,
  onClose,
  onSuccess,
}) => {
  const [feeInput, setFeeInput] = useState<string>('0');
  const [notesInput, setNotesInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      const currentFee = order.pricing?.deliveryFee ?? order.deliveryFee ?? 0;
      setFeeInput(String(currentFee));
      setNotesInput(order.deliveryFeeNotes || '');
      setErrorMsg(null);
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const currentFeeNumber = Math.max(0, parseFloat(feeInput) || 0);
  const subtotal = Number(order.pricing?.subtotal || order.subtotal || 0);
  const discount = Number(order.pricing?.discountAmount || order.discountAmount || 0);
  const newCalculatedTotal = Number(Math.max(0, subtotal + currentFeeNumber - discount).toFixed(2));

  const customerName = order.customer?.name || order.customerName || 'عميل المتجر';
  const customerPhone = order.customer?.phone || order.customerPhone || '-';
  const customerAddress = order.customer?.address || order.address || 'العنوان غير مدخل';

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (currentFeeNumber < 0) {
      setErrorMsg('سعر التوصيل لا يمكن أن يكون سالباً');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const result = await firebaseOrderService.updateOrderDeliveryFee(
        order.id,
        currentFeeNumber,
        notesInput.trim()
      );

      const updatedOrder: Order = {
        ...order,
        pricing: {
          ...order.pricing,
          subtotal,
          discountAmount: discount,
          deliveryFee: result.deliveryFee,
          total: result.total,
        },
        deliveryFee: result.deliveryFee,
        grandTotal: result.total,
        totalPrice: result.total,
        deliveryFeeManuallySet: true,
        deliveryFeeNotes: notesInput.trim(),
        deliveryFeeUpdatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onSuccess(updatedOrder);
      onClose();
    } catch (err: any) {
      console.error('Failed to update delivery fee:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ سعر التوصيل، يرجى المحاولة ثانية');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-2xl dir-rtl animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        className="bg-[#18110B] border border-[#D4AF37]/40 rounded-3xl p-5 sm:p-6 max-w-lg w-full text-[#FFF1C5] space-y-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] max-h-[92vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#3D2C1E] animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#2C1F16]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 text-black flex items-center justify-center shadow-lg">
              <Truck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#F4E08B] font-heading flex items-center gap-2">
                <span>تحديد سعر التوصيل للطلب</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-[#261A11] border border-[#422E1F] text-[#D4AF37] dir-ltr">
                  #{order.orderNumber || order.id}
                </span>
              </h3>
              <p className="text-[11px] text-[#A89C8C] mt-0.5">
                تحديث تكلفة التوصيل لهذا الطلب لتنعكس فوراً على فاتورة العميل
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#261A11] border border-[#3D2C1E] flex items-center justify-center text-[#A89C8C] hover:text-white hover:border-[#D4AF37] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Order & Customer Summary Card */}
        <div className="p-3.5 rounded-2xl bg-[#120B07] border border-[#2D2017] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[#C8BFB0]">
              <User className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="font-bold text-white">{customerName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#A89C8C] font-mono dir-ltr">
              <Phone className="w-3 h-3 text-[#D4AF37]" />
              <span>{customerPhone}</span>
            </div>
          </div>

          <div className="flex items-start gap-1.5 text-[#C8BFB0] pt-1.5 border-t border-[#22160F]">
            <MapPin className="w-3.5 h-3.5 text-[#D4AF37] shrink-0 mt-0.5" />
            <span className="text-[11px] leading-relaxed line-clamp-2">
              العنوان: <strong className="text-[#FFF1C5] font-normal">{customerAddress}</strong>
            </span>
          </div>
        </div>

        {/* Form Controls */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Presets */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#C8BFB0] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>اختيار سريع لقيمة التوصيل:</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {COMMON_PRESETS.map((preset) => {
                const isSelected = currentFeeNumber === preset.value;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setFeeInput(String(preset.value))}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4E08B] text-black border-[#F4E08B] font-black shadow-md scale-[1.02]'
                        : 'bg-[#22170F] text-[#C8BFB0] border-[#382618] hover:bg-[#2C1F15] hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Numeric Custom Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#C8BFB0] flex items-center justify-between">
              <span>سعر التوصيل المحدد (ج.م):</span>
              <span className="text-[11px] text-[#A89C8C]">أدخل القيمة يدوياً</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                value={feeInput}
                onChange={(e) => setFeeInput(e.target.value)}
                placeholder="0"
                className="w-full pl-14 pr-4 py-3 rounded-2xl bg-[#120B07] border border-[#3D2C1E] text-base font-mono font-black text-[#F4E08B] focus:border-[#D4AF37] focus:outline-none transition-all"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#A89C8C] pointer-events-none">
                جنيه مصري
              </span>
            </div>
          </div>

          {/* Optional Delivery Fee Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#C8BFB0] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>ملاحظات التوصيل (اختياري - تظهر للعميل بالفاتورة):</span>
            </label>
            <input
              type="text"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="مثال: توصيل منطقة فيصل / المريوطية، أو شامل مصاريف الشحن"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#120B07] border border-[#3D2C1E] text-xs text-[#FFF1C5] focus:border-[#D4AF37] focus:outline-none placeholder:text-[#6E6458]"
            />
          </div>

          {/* Live Preview of Customer's Bill */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-[#24170D] to-[#180E07] border border-[#D4AF37]/50 shadow-lg space-y-2.5">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-[#3D291B]">
              <span className="font-bold text-[#F4E08B] flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>معاينة فاتورة العميل بعد الإضافة:</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                مباشر ولحظي ⚡
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[#C8BFB0]">
                <span>المجموع الفرعي للأصناف:</span>
                <span className="font-mono font-bold text-white">{formatPrice(subtotal)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>الخصم المطبق:</span>
                  <span className="font-mono font-bold">-{formatPrice(discount)}</span>
                </div>
              )}

              <div className="flex justify-between text-[#C8BFB0]">
                <span className="flex items-center gap-1">
                  <Truck className="w-3 h-3 text-[#D4AF37]" />
                  <span>سعر التوصيل:</span>
                </span>
                <span className="font-mono font-bold text-[#F4E08B]">
                  {currentFeeNumber === 0 ? 'مجاناً 🎁' : `+ ${formatPrice(currentFeeNumber)}`}
                </span>
              </div>

              <div className="pt-2 border-t border-[#3D291B] flex justify-between items-center">
                <div>
                  <span className="text-xs font-black text-white block">إجمالي الفاتورة الجديد:</span>
                  <span className="text-[10px] text-emerald-400">المبلغ النهائي المطلوب من العميل</span>
                </div>
                <span className="text-xl font-black text-[#F4E08B] font-mono">
                  {formatPrice(newCalculatedTotal)}
                </span>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-2xl bg-[#261A11] hover:bg-[#322317] border border-[#3D2C1E] text-[#C8BFB0] font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-[2] py-3 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] hover:brightness-110 text-black font-black text-xs flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(212,175,55,0.3)] transition-all cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري التحديث والحفظ...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>حفظ وتحديث فاتورة العميل 🚀</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
