import React from 'react';
import { motion } from 'motion/react';
import { Truck, Sparkles, CheckCircle2 } from 'lucide-react';

interface FreeDeliveryBarProps {
  currentSubtotal: number;
  freeDeliveryThreshold?: number;
  onOpenMenu?: () => void;
}

export const FreeDeliveryBar: React.FC<FreeDeliveryBarProps> = ({
  currentSubtotal,
  freeDeliveryThreshold = 250,
  onOpenMenu,
}) => {
  const percentage = Math.min(100, Math.round((currentSubtotal / freeDeliveryThreshold) * 100));
  const remaining = Math.max(0, freeDeliveryThreshold - currentSubtotal);
  const isUnlocked = currentSubtotal >= freeDeliveryThreshold;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 dir-rtl">
      <div className="w-full rounded-2xl sm:rounded-3xl border border-[#D4AF37]/35 bg-gradient-to-r from-[#1D140C] via-[#150E08] to-[#1D140C] p-4 sm:p-5 shadow-xl space-y-3">
        {/* Top Info Row */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          {/* Main Title & Subtitle */}
          <div className="text-right space-y-1">
            {isUnlocked ? (
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-extrabold text-emerald-300">
                  مبارك! حصلت على التوصيل المجاني الملكي 🚀
                </span>
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
            ) : (
              <h3 className="text-xs sm:text-sm font-black text-[#FFF1C5] leading-snug">
                أضف منتجات بقيمة{' '}
                <span className="text-[#F4E08B] text-sm sm:text-base underline font-black">{remaining} ج.م</span>{' '}
                أخرى للحصول على <span className="text-amber-400">توصيل مجاني 🚀</span>
              </h3>
            )}
            <p className="text-[11px] sm:text-xs text-[#8E8373] font-medium">
              {isUnlocked
                ? 'سيتم تطبيق التوصيل المجاني تلقائياً عند إتمام الطلب'
                : `الحد الأدنى للتوصيل المجاني من فرع فيصل هو ${freeDeliveryThreshold} ج.م`}
            </p>
          </div>

          {/* Icon Badge on the side */}
          <div
            className={`p-2.5 sm:p-3 rounded-2xl border shrink-0 ${
              isUnlocked
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
                : 'bg-[#2B1D12] border-[#D4AF37]/40 text-[#D4AF37]'
            }`}
          >
            {isUnlocked ? (
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 animate-bounce" />
            ) : (
              <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-[#D4AF37]" />
            )}
          </div>
        </div>

        {/* Progress Bar & Percentage Meter */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs font-bold text-[#C8BFB0]">
            <span>تقدم التوصيل المجاني</span>
            <span className={isUnlocked ? 'text-emerald-400 font-extrabold' : 'text-[#F4E08B] font-black'}>
              {percentage}%
            </span>
          </div>

          <div className="w-full h-2.5 bg-[#251A12] rounded-full overflow-hidden border border-[#3D2C1E] relative">
            <motion.div
              className={`h-full rounded-full ${
                isUnlocked
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-300 shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                  : 'bg-gradient-to-r from-[#9E2A2B] via-[#D4AF37] to-[#F4E08B] shadow-[0_0_10px_rgba(212,175,55,0.6)]'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
