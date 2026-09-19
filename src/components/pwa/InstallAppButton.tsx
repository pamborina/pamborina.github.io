import React, { useState } from 'react';
import { Smartphone, Loader2, ArrowDownToLine } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useToast } from '../ui/Toast';

interface InstallAppButtonProps {
  className?: string;
}

export const InstallAppButton: React.FC<InstallAppButtonProps> = ({ className = '' }) => {
  const {
    isInstalled,
    install,
  } = usePWAInstall();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Hide completely if app is already running in standalone PWA mode
  if (isInstalled) {
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
    <button
      type="button"
      id="pwa-header-install-btn"
      onClick={handleInstallClick}
      disabled={isLoading}
      aria-label="تحميل تطبيق حلواني بامبورينا على هاتفك"
      title="تحميل وتثبيت تطبيق بامبورينا على هاتفك لطلب أسرع وتجربة سلسة"
      className={`w-full relative overflow-hidden flex items-center justify-between px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] text-black font-black text-xs sm:text-sm shadow-md hover:brightness-105 active:scale-[0.99] border border-[#F4E08B]/60 transition-all cursor-pointer select-none group ${className}`}
    >
      {/* Right side: Icon + Title */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-lg bg-black/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-black animate-spin" />
          ) : (
            <Smartphone className="w-4 h-4 stroke-[2.5] text-black" />
          )}
        </div>
        <span className="font-black tracking-tight text-black truncate text-xs sm:text-sm">
          {isLoading ? 'جاري التثبيت...' : 'تحميل تطبيق بامبورينا'}
        </span>
      </div>

      {/* Left side (RTL): Instant Install Action Badge */}
      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/85 text-[#F4E08B] text-[10px] sm:text-[11px] font-black border border-black/20 shadow-sm shrink-0 group-hover:bg-black transition-colors">
        <ArrowDownToLine className="w-3 h-3 text-[#F4E08B] animate-bounce" />
        <span>تثبيت فوري</span>
      </div>

      {/* Subtle Shimmer Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
    </button>
  );
};


