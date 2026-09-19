import React, { useState } from 'react';
import { Smartphone, Sparkles, ShieldCheck, Zap, Loader2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useToast } from '../ui/Toast';

export const PWAHomeInstallCard: React.FC = () => {
  const { isInstalled, install } = usePWAInstall();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Hide if already running in standalone mode (installed app)
  if (isInstalled) return null;

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;
    setIsLoading(true);

    try {
      const outcome = await install();
      if (outcome === 'accepted') {
        showToast('🎉 تم تثبيت تطبيق بامبورينا بنجاح!', 'يمكنك الآن فتحه مباشرة من شاشتك الرئيسية كأي تطبيق رسمي', 'success');
      } else if (outcome === 'opened_new_window') {
        showToast('جاري فتح التطبيق والتثبيت...', 'تم إطلاق نافذة التثبيت الرسمية على جهازك', 'info');
      }
    } catch (err) {
      console.warn('Install error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full my-6 dir-rtl">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#20150D] via-[#160E0A] to-[#0D0906] border border-[#D4AF37]/50 p-5 sm:p-6 shadow-2xl">
        {/* Decorative Golden Ambient Glows */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#9A7B2C]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5 text-right">
          {/* Left Column: Icon & Text Info */}
          <div className="flex items-center gap-4 w-full md:w-auto">
            {/* Logo Badge */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#2D2017] to-[#1A110A] border border-[#D4AF37]/50 shadow-xl shrink-0">
              <img
                src="./favicon.svg"
                alt="شعار حلواني بامبورينا الرسمي"
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow"
              />
            </div>

            {/* Text Content */}
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-[#FFF1C5] font-heading">
                  📱 ثبّت تطبيق بامبورينا على هاتفك
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#F4E08B] text-[10px] font-bold">
                  <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                  تطبيق رسمي
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#C8BFB0] leading-relaxed max-w-xl">
                افتح بامبورينا بنقرة واحدة من شاشتك الرئيسية، وتصفح المنيو واطلب أشهى الحلويات والمعجنات بسرعة فائقة وسلاسة دون الحاجة لفتح المتصفح.
              </p>

              {/* Feature Tags */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-[#D4AF37] font-medium">
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-[#F4E08B]" />
                  تصفح فائق السرعة
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#F4E08B]" />
                  طلب مباشر وآمن
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: CTA Install Button */}
          <div className="w-full md:w-auto shrink-0 pt-2 md:pt-0">
            <button
              onClick={handleInstallClick}
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] text-black font-black text-sm shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-black animate-spin" />
              ) : (
                <Smartphone className="w-5 h-5 stroke-[2.5] text-black group-hover:scale-110 transition-transform" />
              )}
              <span>{isLoading ? 'جاري التثبيت...' : '📱 تحميل التطبيق الآن'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


