import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CheckCircle2,
  Share2,
  PlusSquare,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Compass,
  Laptop,
  Smartphone,
  Info,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useToast } from '../ui/Toast';

export const PWAInstallBanner: React.FC = () => {
  const {
    isModalOpen,
    closeInstallModal,
    executeInstall,
    isInstalled,
    isAndroid,
    isIOS,
    isSafari,
    isIOSOtherBrowser,
    hasNativePrompt,
    browserName,
    osName,
    hasUpdate,
    applyUpdate,
  } = usePWAInstall();

  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [showIOSSteps, setShowIOSSteps] = useState<boolean>(false);
  const [showBrowserMenuSteps, setShowBrowserMenuSteps] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Reset internal states when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setIsSuccess(false);
      setShowIOSSteps(false);
      setShowBrowserMenuSteps(false);
      setCopiedLink(false);
    }
  }, [isModalOpen]);

  if (!isModalOpen || typeof document === 'undefined') {
    return null;
  }

  const handleClose = () => {
    setIsSuccess(false);
    setShowIOSSteps(false);
    setShowBrowserMenuSteps(false);
    closeInstallModal();
  };

  const handleCopyUrl = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
      } else {
        const input = document.createElement('input');
        input.value = window.location.href;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopiedLink(true);
      showToast('تم نسخ الرابط بنجاح', 'افتح الآن متصفح Safari والصق الرابط لتثبيت التطبيق', 'success');
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      showToast('يرجى نسخ الرابط من شريط العنوان', '', 'info');
    }
  };

  /**
   * Primary Action: "تثبيت التطبيق"
   * Triggers the appropriate native flow based on smart feature detection
   */
  const handlePrimaryInstallClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;
    setIsLoading(true);

    try {
      // 1. If already installed
      if (isInstalled) {
        setIsLoading(false);
        return;
      }

      // 2. If iOS Safari -> Show direct 3-step assistant immediately
      if (isIOS && isSafari) {
        setIsLoading(false);
        setShowIOSSteps(true);
        return;
      }

      // 3. If iOS non-Safari (Chrome, Firefox, etc.) -> Show Safari redirect guidance
      if (isIOS && isIOSOtherBrowser) {
        setIsLoading(false);
        setShowIOSSteps(true);
        return;
      }

      // 4. Android / Desktop with Native Prompt
      if (hasNativePrompt) {
        const result = await executeInstall();

        if (result.outcome === 'accepted') {
          setIsSuccess(true);
          showToast('🎉 تم تثبيت تطبيق بامبورينا بنجاح!', 'أصبح التطبيق متاحاً الآن على شاشتك الرئيسية', 'success');
          setTimeout(() => {
            handleClose();
          }, 2400);
        } else if (result.outcome === 'dismissed') {
          // User declined in browser dialog; do not show fake success
          handleClose();
        } else if (result.outcome === 'opened_top_window') {
          showToast('جاري فتح التطبيق...', 'تم إطلاق نافذة التثبيت الرسمية على جهازك', 'info');
          handleClose();
        } else {
          setShowBrowserMenuSteps(true);
        }
        return;
      }

      // 5. Native prompt not available (e.g. desktop Firefox, or already rejected earlier)
      const outcomeResult = await executeInstall();
      if (outcomeResult.outcome === 'accepted') {
        setIsSuccess(true);
        showToast('🎉 تم تثبيت تطبيق بامبورينا بنجاح!', '', 'success');
        setTimeout(() => handleClose(), 2000);
      } else if (outcomeResult.outcome === 'ios_safari_guide' || outcomeResult.outcome === 'ios_other_browser') {
        setShowIOSSteps(true);
      } else {
        setShowBrowserMenuSteps(true);
      }
    } catch (err) {
      console.warn('Install execution error:', err);
      setShowBrowserMenuSteps(true);
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="تثبيت تطبيق بامبورينا"
      onClick={handleClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm dir-rtl animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm sm:max-w-md rounded-3xl bg-gradient-to-b from-[#1C130C] via-[#140D08] to-[#0E0805] border border-[#D4AF37]/50 shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-5 sm:p-6 relative overflow-hidden text-right select-none"
      >
        {/* Subtle Ambient Light */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#9A7B2C]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button (X) */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 left-4 w-8 h-8 rounded-full bg-[#261B12] hover:bg-[#342419] border border-[#3E2B1D] text-[#C8BFB0] hover:text-[#FFF1C5] flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-90 z-20"
          aria-label="إغلاق"
          title="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 1. SUCCESS STATE (Android / Desktop after accepted prompt) */}
        {isSuccess ? (
          <div className="text-center py-4 space-y-3 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37] mx-auto flex items-center justify-center text-[#D4AF37] shadow-lg">
              <CheckCircle2 className="w-9 h-9 animate-bounce text-[#F4E08B]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-[#FFF1C5]">تم تثبيت تطبيق بامبورينا بنجاح</h3>
              <p className="text-xs text-[#C8BFB0] max-w-xs mx-auto leading-relaxed">
                أصبح تطبيق بامبورينا موجوداً الآن على شاشتك الرئيسية للوصول إلى طلباتك وقائمة الحلويات بسرعة وسهولة.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="mt-3 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F4E08B] text-black font-black text-xs shadow-md hover:brightness-110 active:scale-95 transition-all"
            >
              تم
            </button>
          </div>
        ) : isInstalled ? (
          /* 2. ALREADY INSTALLED STATE */
          <div className="text-center py-4 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/60 mx-auto flex items-center justify-center text-[#F4E08B]">
              <Check className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-[#FFF1C5]">تطبيق بامبورينا مثبت بالفعل</h3>
              <p className="text-xs text-[#C8BFB0]">
                أنت تستخدم التطبيق الرسمي لبامبورينا بالفعل على جهازك.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="mt-3 px-6 py-2.5 rounded-xl bg-[#261B12] border border-[#3E2B1D] text-[#FFF1C5] font-bold text-xs hover:bg-[#342419] transition-all"
            >
              إغلاق
            </button>
          </div>
        ) : showIOSSteps ? (
          /* 3. iOS SMART UX (iPhone / iPad) */
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#0F0A06] border border-[#D4AF37]/50 flex items-center justify-center p-1.5 shrink-0 shadow-md">
                <img
                  src="/icons/icon-192.png"
                  alt="شعار بامبورينا"
                  className="w-full h-full object-contain rounded-lg"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.src = '/apple-touch-icon.png';
                  }}
                />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#FFF1C5] font-heading">
                  لتثبيت تطبيق بامبورينا
                </h3>
                <p className="text-[11px] text-[#C8BFB0]">
                  {isIOSOtherBrowser ? 'خطوة سريعة لمتصفح Safari' : 'اتبع الخطوات البسيطة التالية لإضافة التطبيق'}
                </p>
              </div>
            </div>

            {/* If in Chrome/Edge/Firefox on iOS */}
            {isIOSOtherBrowser ? (
              <div className="space-y-3 bg-[#110B07] p-3.5 rounded-2xl border border-[#3E2B1D]">
                <p className="text-xs text-[#FFF1C5] font-bold leading-relaxed">
                  لإكمال تثبيت تطبيق بامبورينا، افتح الموقع في Safari.
                </p>
                <p className="text-[11px] text-[#C8BFB0] leading-relaxed">
                  متصفح Apple Safari هو الوحيد على نظام iOS الذي يتيح التثبيت المباشر على الشاشة الرئيسية.
                </p>
                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F4E08B] text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'تم نسخ الرابط!' : 'نسخ رابط الموقع'}</span>
                  </button>
                  <a
                    href="x-web-search://?https://pamborina.github.io"
                    onClick={() => {
                      showToast('انسخ الرابط وافتحه في تطبيق Safari بالهاتف', '', 'info');
                    }}
                    className="py-2.5 px-3 rounded-xl bg-[#261B12] hover:bg-[#342419] border border-[#3E2B1D] text-[#FFF1C5] font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Compass className="w-3.5 h-3.5 text-[#F4E08B]" />
                    <span>فتح Safari</span>
                  </a>
                </div>
              </div>
            ) : (
              /* Safari on iOS Steps */
              <div className="space-y-2.5 bg-[#110B07] p-3.5 rounded-2xl border border-[#3E2B1D]">
                <div className="flex items-start gap-2.5 text-xs text-[#FFF1C5]">
                  <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div className="flex-1">
                    <span className="font-bold">اضغط مشاركة</span>
                    <span className="text-[#C8BFB0] mr-1">
                      (أيقونة المشاركة <Share2 className="w-3.5 h-3.5 inline text-[#F4E08B] mx-0.5" /> في أسفل أو أعلى الشاشة).
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-[#FFF1C5]">
                  <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div className="flex-1">
                    <span className="font-bold">اختر إضافة إلى الشاشة الرئيسية</span>
                    <span className="text-[#C8BFB0] mr-1">
                      (<PlusSquare className="w-3.5 h-3.5 inline text-[#F4E08B] mx-0.5" /> Add to Home Screen).
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-[#FFF1C5]">
                  <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div className="flex-1">
                    <span className="font-bold">اضغط إضافة</span>
                    <span className="text-[#C8BFB0] mr-1">
                      في الزاوية العلوية ليظهر التطبيق على شاشتك فوراً.
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#2A1D13] text-[10px] text-[#C8BFB0] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                  <span>إذا كان خيار "فتح كتطبيق ويب" متاحاً في الإعدادات، يرجى تفعيله لتجربة كاملة.</span>
                </div>
              </div>
            )}

            {/* Close / Done Button */}
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F4E08B] text-black font-black text-xs shadow-md hover:brightness-110 active:scale-95 transition-all"
            >
              تم، فهمت الطريقة
            </button>
          </div>
        ) : showBrowserMenuSteps ? (
          /* 4. BROWSER MENU GUIDE (Desktop Firefox, fallback Android) */
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#0F0A06] border border-[#D4AF37]/50 flex items-center justify-center p-1.5 shrink-0 shadow-md">
                <img
                  src="/icons/icon-192.png"
                  alt="شعار بامبورينا"
                  className="w-full h-full object-contain rounded-lg"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.src = '/apple-touch-icon.png';
                  }}
                />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#FFF1C5] font-heading">
                  لتثبيت تطبيق بامبورينا
                </h3>
                <p className="text-[11px] text-[#C8BFB0]">من خلال قائمة المتصفح لديك</p>
              </div>
            </div>

            <div className="space-y-2.5 bg-[#110B07] p-3.5 rounded-2xl border border-[#3E2B1D] text-xs">
              <div className="flex items-start gap-2.5 text-[#FFF1C5]">
                <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p className="text-[#C8BFB0]">
                  اضغط على زر قائمة المتصفح <strong className="text-[#FFF1C5]">⋮</strong> أو <strong className="text-[#FFF1C5]">⋯</strong> أعلى أو أسفل الشاشة.
                </p>
              </div>

              <div className="flex items-start gap-2.5 text-[#FFF1C5]">
                <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p className="text-[#C8BFB0]">
                  اختر <strong className="text-[#F4E08B]">"تثبيت التطبيق"</strong> أو <strong className="text-[#F4E08B]">"إضافة إلى الشاشة الرئيسية"</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F4E08B] text-black font-black text-xs shadow-md hover:brightness-110 active:scale-95 transition-all"
            >
              حسناً
            </button>
          </div>
        ) : (
          /* 5. MAIN STANDARD MODAL VIEW (Exactly as requested) */
          <div className="space-y-4">
            {/* Header: Logo + Title + Description */}
            <div className="flex items-start gap-3.5 sm:gap-4">
              {/* Pamborina Logo */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#0F0A06] border border-[#D4AF37]/60 shadow-lg shrink-0 flex items-center justify-center p-1.5 overflow-hidden">
                <img
                  src="/icons/icon-192.png"
                  alt="شعار بامبورينا"
                  className="w-full h-full object-contain rounded-xl"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.src = '/apple-touch-icon.png';
                  }}
                />
              </div>

              {/* Title & Description */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base sm:text-lg font-black text-[#FFF1C5] font-heading leading-tight">
                    تطبيق بامبورينا
                  </h3>
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] shrink-0 animate-pulse" />
                </div>
                <p className="text-xs sm:text-[13px] text-[#C8BFB0] leading-relaxed font-sans">
                  ثبّت التطبيق على جهازك للوصول إلى بامبورينا بسرعة.
                </p>
              </div>
            </div>

            {/* Action Buttons: Primary ("تثبيت التطبيق") + Secondary ("ليس الآن") */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                id="pwa-execute-install-btn"
                onClick={handlePrimaryInstallClick}
                disabled={isLoading}
                className="flex-1 py-3 px-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] hover:brightness-110 active:scale-[0.98] text-black font-black text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer select-none"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 text-black animate-spin" />
                    <span>جاري التثبيت...</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4 stroke-[2.5] text-black shrink-0" />
                    <span>تثبيت التطبيق</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="py-3 px-4 sm:px-5 rounded-xl sm:rounded-2xl bg-[#241910] hover:bg-[#322216] border border-[#3E2B1D] text-[#C8BFB0] hover:text-[#FFF1C5] font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95 shrink-0"
              >
                ليس الآن
              </button>
            </div>
          </div>
        )}

        {/* Update Notification Ribbon if a new Service Worker update is ready */}
        {hasUpdate && (
          <div className="mt-3 pt-3 border-t border-[#2A1D13] flex items-center justify-between gap-2 text-[11px] text-[#F4E08B]">
            <span>يتوفر تحديث جديد للموقع</span>
            <button
              type="button"
              onClick={applyUpdate}
              className="px-2.5 py-1 rounded-lg bg-[#D4AF37] text-black font-black hover:brightness-110 active:scale-95 transition-all text-[10px]"
            >
              تحديث الآن
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
