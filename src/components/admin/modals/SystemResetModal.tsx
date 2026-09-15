import React, { useState } from 'react';
import { AlertTriangle, X, Loader2, RotateCcw, CheckCircle2, ShieldAlert } from 'lucide-react';
import { systemResetService, SystemResetProgress } from '../../../services/systemResetService';

interface SystemResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  showToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

/**
 * Normalize Arabic text for robust comparison
 */
function normalizeArabicConfirmation(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[\u064B-\u065F]/g, '') // remove diacritics
    .replace(/\s+/g, ' ');
}

export const SystemResetModal: React.FC<SystemResetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  showToast,
}) => {
  const [confirmation, setConfirmation] = useState('');
  const [isSecondConfirmOpen, setIsSecondConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetProgress, setResetProgress] = useState<SystemResetProgress | null>(null);

  if (!isOpen) return null;

  const handleFirstStepSubmit = () => {
    const raw = confirmation.trim();
    const normalized = normalizeArabicConfirmation(raw);

    const isMatch =
      raw.toUpperCase() === 'RESET' ||
      normalized === 'اعاده ضبط' ||
      normalized === 'اعادة ضبط' ||
      normalized === 'اعاده الضبط' ||
      normalized === 'اعادة الضبط' ||
      normalized === 'تصفير' ||
      normalized === 'reset';

    if (!isMatch) {
      showToast(
        'كلمة التأكيد غير متطابقة',
        'يرجى كتابة الكلمة المطلوبة بالضبط: RESET أو إعادة ضبط للمتابعة.',
        'error'
      );
      return;
    }

    // Move to 2nd Step Confirmation
    setIsSecondConfirmOpen(true);
  };

  const handleExecuteReset = async () => {
    setIsSecondConfirmOpen(false);
    setIsResetting(true);
    setResetProgress({
      stage: 'securing',
      stageMessageAr: 'جاري تأمين نظام الطلبات...',
      percent: 10,
      deletedOrdersCount: 0,
      deletedArchivedCount: 0,
    });

    try {
      const result = await systemResetService.resetSystem((p) => {
        setResetProgress(p);
      });

      showToast(
        'تم بدء النظام من الصفر بنجاح ✓',
        `تم مسح كافة الطلبات القديمة (${result.deletedOrdersCount} طلب نشط، ${result.deletedArchivedCount} مؤرشف) وتصفير العدادات لتبدأ من #ORDER-01.`,
        'success'
      );

      if (onSuccess) {
        onSuccess();
      }

      // Close modal after brief delay so user sees 100% completion
      setTimeout(() => {
        setIsResetting(false);
        setConfirmation('');
        setResetProgress(null);
        onClose();
      }, 900);
    } catch (err: any) {
      console.error('❌ [SystemResetModal] Reset error:', err);
      setIsResetting(false);
      setResetProgress(null);
      showToast(
        'تعذر إكمال إعادة ضبط النظام',
        err?.message || 'لم يتم اعتماد إعادة التهيئة. تحقق من اتصال Firebase وحاول مرة أخرى.',
        'error'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-md rounded-3xl bg-neutral-900 border border-neutral-700/80 p-6 shadow-2xl space-y-5 text-neutral-100 font-sans relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">بدء النظام من الصفر</h3>
              <span className="text-[11px] text-rose-400 font-bold">إجراء تشغيلي حساس ومحمي</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isResetting}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Content */}
        <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-800/40 text-xs text-rose-200/90 leading-relaxed space-y-2">
          <p className="font-medium">
            سيؤدي هذا الإجراء إلى <strong className="text-rose-400">حذف جميع طلبات العملاء وسجلات النشاط التشغيلية</strong> من قاعدة بيانات Firebase وإعادة نظام الطلبات إلى نقطة الصفر.
          </p>
          <div className="p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 text-[11px] text-emerald-400 space-y-1">
            <p className="font-bold text-neutral-300">بيانات المتجر الأساسية محمية بالكامل:</p>
            <p className="text-neutral-400">✓ لن يتم مسح أي بيانات أساسية مثل (المنتجات، الأقسام، الأسعار، الفروع، أو الحسابات).</p>
          </div>
          <div className="text-[11px] text-amber-300/90 font-medium">
            💡 أول طلب Online جديد سيحصل على <span className="font-mono font-bold bg-neutral-900 px-1 py-0.5 rounded text-amber-400">ORDER-01-ONLINE</span> وأول طلب Pickup سيحصل على <span className="font-mono font-bold bg-neutral-900 px-1 py-0.5 rounded text-amber-400">ORDER-01-PICKUP</span>.
          </div>
        </div>

        {/* Instructions & Input */}
        {!isResetting && (
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-300">
              لتأكيد التنفيذ، اكتب <span className="font-mono text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-500/30">RESET</span> أو <span className="font-mono text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-500/30">إعادة ضبط</span>:
            </label>
            <div className="relative">
              <input
                type="text"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && confirmation.trim() && !isResetting) {
                    e.preventDefault();
                    handleFirstStepSubmit();
                  }
                }}
                placeholder="اكتب RESET هنا للتأكيد..."
                disabled={isResetting}
                autoFocus
                className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-700 text-center font-bold text-sm text-white placeholder-neutral-600 focus:border-rose-500 focus:outline-none transition-all shadow-inner"
              />
            </div>
          </div>
        )}

        {/* Progress Stages UI */}
        {isResetting && resetProgress && (
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between font-bold text-amber-400">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                <span>{resetProgress.stageMessageAr}</span>
              </div>
              <span className="font-mono text-neutral-400">{resetProgress.percent}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-300 rounded-full"
                style={{ width: `${resetProgress.percent}%` }}
              />
            </div>

            <div className="text-[11px] text-neutral-500 flex justify-between">
              <span>الطلبات النشطة المحذوفة: {resetProgress.deletedOrdersCount}</span>
              <span>الأرشيف المحذوف: {resetProgress.deletedArchivedCount}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!isResetting && (
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isResetting}
              className="flex-1 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleFirstStepSubmit}
              disabled={isResetting || !confirmation.trim()}
              className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-rose-900/30 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              <span>بدء النظام من الصفر</span>
            </button>
          </div>
        )}

        {/* Step 2 Confirmation Dialog Overlay */}
        {isSecondConfirmOpen && (
          <div className="absolute inset-0 z-20 bg-neutral-950/95 backdrop-blur-md rounded-3xl p-6 flex flex-col justify-between animate-in zoom-in-95 duration-150">
            <div className="space-y-4 text-center my-auto">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h4 className="text-base font-black text-white">هل أنت متأكد تمامًا؟</h4>
              <p className="text-xs text-neutral-300 leading-relaxed max-w-xs mx-auto">
                سيتم حذف <strong className="text-rose-400">جميع الطلبات القديمة والأرشيف نهائياً</strong> من قاعدة البيانات. لا يمكن التراجع عن هذا الإجراء بعد تنفيذه.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsSecondConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-all"
              >
                تراجع وإلغاء
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all shadow-lg shadow-rose-900/40 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تأكيد الحذف وبدء الصفر</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
