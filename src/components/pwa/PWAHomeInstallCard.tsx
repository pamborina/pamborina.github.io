import React from 'react';
import { Smartphone, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAHomeInstallCard: React.FC = () => {
  const { isInstalled, openInstallModal } = usePWAInstall();

  if (isInstalled) return null;

  return (
    <div className="w-full my-6 dir-rtl">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#20150D] via-[#160E0A] to-[#0D0906] border border-[#D4AF37]/50 p-5 sm:p-6 shadow-2xl">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#9A7B2C]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5 text-right">
          {/* Info */}
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#2D2017] to-[#1A110A] border border-[#D4AF37]/50 shadow-xl shrink-0">
              <img
                src="/icons/icon-192.png"
                alt="شعار بامبورينا"
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain rounded-xl"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.src = '/apple-touch-icon.png';
                }}
              />
            </div>

            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-[#FFF1C5] font-heading">
                  تطبيق بامبورينا
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#F4E08B] text-[10px] font-bold">
                  <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                  تطبيق رسمي
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#C8BFB0] leading-relaxed max-w-xl">
                ثبّت التطبيق على جهازك للوصول إلى بامبورينا بسرعة وطلب أشهى الحلويات بكل سهولة.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-[#D4AF37] font-medium">
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-[#F4E08B]" />
                  سرعة فائقة
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#F4E08B]" />
                  طلب مباشر وآمن
                </span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="w-full md:w-auto shrink-0 pt-2 md:pt-0">
            <button
              type="button"
              onClick={openInstallModal}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] text-black font-black text-sm shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
            >
              <Smartphone className="w-5 h-5 stroke-[2.5] text-black group-hover:scale-110 transition-transform" />
              <span>تحميل تطبيق بامبورينا</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
