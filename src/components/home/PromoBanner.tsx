import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowLeft, Gift, PhoneCall } from 'lucide-react';

interface PromoBannerProps {
  titleAr: string;
  subtitleAr: string;
  badgeAr: string;
  ctaTextAr: string;
  imageUrl: string;
  onCtaClick: () => void;
}

export const PromoBanner: React.FC<PromoBannerProps> = ({
  titleAr,
  subtitleAr,
  badgeAr,
  ctaTextAr,
  imageUrl,
  onCtaClick,
}) => {
  return (
    <div className="relative rounded-3xl overflow-hidden border border-[#D4AF37]/40 bg-gradient-to-r from-[#2B1D12] via-[#1A110A] to-[#2B1D12] p-6 sm:p-8 shadow-2xl dir-rtl my-6">
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 text-right max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3D2C1E] border border-[#D4AF37]/50 text-xs font-bold text-[#F4E08B]">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>{badgeAr}</span>
          </span>

          <h2 className="text-xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFF1C5] via-[#F4E08B] to-[#D4AF37] font-heading leading-tight">
            {titleAr}
          </h2>

          <p className="text-xs sm:text-sm text-[#C8BFB0] leading-relaxed">
            {subtitleAr}
          </p>

          <button
            onClick={onCtaClick}
            className="mt-2 px-6 py-3 rounded-2xl bg-gold-gradient text-black font-extrabold text-xs sm:text-sm shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>{ctaTextAr}</span>
            <ArrowLeft className="w-4 h-4 text-black stroke-[3]" />
          </button>
        </div>

        <div className="relative w-full md:w-64 h-40 sm:h-48 rounded-2xl overflow-hidden border border-[#D4AF37]/40 shadow-xl shrink-0">
          <img
            src={imageUrl}
            alt={titleAr}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};
