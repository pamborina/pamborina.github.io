import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Smartphone,
  X,
  Sparkles,
  Loader2,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useToast } from '../ui/Toast';

export const PWAInstallBanner: React.FC = () => {
  const {
    isBannerOpen,
    closeInstallBanner,
    install,
    isInstalled,
  } = usePWAInstall();

  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Render only when banner is triggered to open and not installed yet
  if (!isBannerOpen || isInstalled || typeof document === 'undefined') {
    return null;
  }

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;
    setIsLoading(true);

    try {
      const outcome = await install();

      if (outcome === 'accepted') {
        setIsSuccess(true);
        showToast('🎉 تم تثبيت تطبيق بامبورينا بنجاح!', 'يمكنك الآن فتحه مباشرة من شاشتك الرئيسية كأي تطبيق رسمي', 'success');
        setTimeout(() => {
          closeInstallBanner();
          setIsSuccess(false);
        }, 1800);
      } else if (outcome === 'opened_new_window') {
        showToast('جاري فتح التطبيق والتثبيت...', 'تم إطلاق نافذة التثبيت الرسمية على جهازك', 'info');
        closeInstallBanner();
      } else {
        closeInstallBanner();
      }
    } catch (err) {
      console.warn('Install error:', err);
      closeInstallBanner();
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    closeInstallBanner();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="إشعار تثبيت تطبيق بامبورينا"
      onClick={handleClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md dir-rtl animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md sm:max-w-lg rounded-[28px] bg-gradient-to-br from-[#1C130C] via-[#140D08] to-[#0D0805] border border-[#D4AF37]/60 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] p-5 sm:p-6 relative overflow-hidden text-right ring-1 ring-[#D4AF37]/20 transition-all duration-300"
      >
        {/* Subtle Ambient Gold Glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button (X) Top-Left */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 left-4 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#261B12] hover:bg-[#342419] border border-[#3E2B1D] text-[#C8BFB0] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95 z-20"
          aria-label="إغلاق الإشعار"
          title="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>

        {/* MAIN / SUCCESS STATE */}
        {isSuccess ? (
          <div className="text-center py-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] mx-auto flex items-center justify-center text-[#D4AF37]">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-[#FFF1C5]">🎉 تم تثبيت التطبيق بنجاح!</h3>
              <p className="text-xs text-[#C8BFB0]">
                أصبح تطبيق بامبورينا متاحاً الآن على شاشتك الرئيسية لطلب أشهى الحلويات في أي وقت.
              </p>
            </div>
          </div>
        ) : (
          <div>
            {/* Content Section (RTL) */}
            <div className="flex items-start gap-3.5 sm:gap-4.5">
              {/* Circular Pamborina Emblem in Gold Box */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#0F0A06] border-2 border-[#D4AF37]/60 shadow-lg shrink-0 flex items-center justify-center p-1.5 overflow-hidden">
                <img
                  src="./pwa-192x192.png"
                  alt="شعار بامبورينا"
                  className="w-full h-full object-contain rounded-xl drop-shadow"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (!target.src.includes('apple-touch-icon')) {
                      target.src = './apple-touch-icon.png';
                    } else {
                      target.src = './favicon.svg';
                    }
                  }}
                />
              </div>

              {/* Title & Description */}
              <div className="flex-1 min-w-0 pt-0.5 space-y-1.5 pl-6 sm:pl-8">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm sm:text-base font-black text-[#FFF1C5] font-heading leading-tight flex items-center gap-1.5">
                    <span>📱 ثبّت تطبيق بامبورينا</span>
                    <Sparkles className="w-4 h-4 text-[#D4AF37] animate-pulse shrink-0 inline" />
                  </span>
                </div>

                <p className="text-xs sm:text-[13px] text-[#C8BFB0] leading-relaxed font-sans">
                  استمتع بتجربة أسرع وأسهل وافتح بامبورينا مباشرة من شاشة جهازك كأي تطبيق رسمي دون الحاجة للمتصفح.
                </p>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-3 pt-5 sm:pt-6">
              {/* Primary Gold Install Button */}
              <button
                type="button"
                id="pwa-main-modal-install-btn"
                onClick={handleInstallClick}
                disabled={isLoading}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#DCA82D] via-[#F3CE52] to-[#E5B636] hover:brightness-110 active:scale-[0.98] text-black font-black text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer select-none ring-2 ring-[#F3CE52]/40"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 text-black animate-spin" />
                    <span>جاري التثبيت...</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4 stroke-[2.5] text-black shrink-0" />
                    <span>📱 تحميل التطبيق فوراً</span>
                  </>
                )}
              </button>

              {/* Secondary Dark "Not Now" Button */}
              <button
                type="button"
                onClick={handleClose}
                className="py-3.5 px-5 sm:px-6 rounded-2xl bg-[#241910] hover:bg-[#322216] border border-[#3E2B1D] text-[#C8BFB0] hover:text-[#FFF1C5] font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95"
              >
                ليس الآن
              </button>
            </div>

            {/* In-Preview / Fast-Install Helper Note */}
            <div className="flex items-center justify-center gap-1.5 pt-3.5 text-[11px] text-[#9E8E7D]">
              <Zap className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>تثبيت فوري ومباشر على جهازك بنقرة واحدة</span>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};


