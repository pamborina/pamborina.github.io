import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, ArrowLeft, Sparkles } from 'lucide-react';

interface FloatingCartBarProps {
  itemCount: number;
  totalAmount: number;
  onOpenCart: () => void;
}

export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({
  itemCount,
  totalAmount,
  onOpenCart,
}) => {
  if (itemCount <= 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-35 dir-rtl pointer-events-auto"
      >
        <button
          onClick={onOpenCart}
          className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#261A11] via-[#1C120A] to-[#261A11] border-2 border-[#D4AF37] shadow-[0_10px_30px_rgba(212,175,55,0.35)] hover:border-amber-300 transition-all cursor-pointer group active:scale-[0.98]"
        >
          {/* Right Side: Badge & Total Price */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2.5 rounded-xl bg-gold-gradient text-black shadow-md group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
              </div>

              <span className="absolute -top-2 -right-2 bg-amber-500 text-black text-xs font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-black shadow-lg">
                {itemCount}
              </span>
            </div>

            <div className="flex flex-col text-right">
              <span className="text-[11px] text-[#C8BFB0] font-medium flex items-center gap-1">
                <span>سلة الشراء</span>
                <Sparkles className="w-3 h-3 text-[#D4AF37]" />
              </span>
              <span className="text-sm sm:text-base font-extrabold text-[#FFF1C5]">
                {totalAmount} ج.م
              </span>
            </div>
          </div>

          {/* Left Side: Action CTA Button */}
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold-gradient text-black font-black text-xs sm:text-sm shadow-md group-hover:brightness-110 transition-all">
            <span>عرض السلة والدفع</span>
            <ArrowLeft className="w-4 h-4 stroke-[3] group-hover:-translate-x-1 transition-transform" />
          </div>
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
