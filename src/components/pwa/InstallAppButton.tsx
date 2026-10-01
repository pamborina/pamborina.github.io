import React, { useState } from 'react';
import { Smartphone, CheckCircle, Loader2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useToast } from '../ui/Toast';

interface InstallAppButtonProps {
  className?: string;
}

export const InstallAppButton: React.FC<InstallAppButtonProps> = ({ className = '' }) => {
  const { isInstalled, executeInstall } = usePWAInstall();
  const { showToast } = useToast();
  const [isTriggering, setIsTriggering] = useState<boolean>(false);

  // If already installed: display verified state
  if (isInstalled) {
    return (
      <div
        id="pwa-app-installed-badge"
        className={`w-full flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl sm:rounded-2xl bg-[#16100B] border border-[#D4AF37]/30 text-[#F4E08B] font-bold text-xs sm:text-sm select-none ${className}`}
      >
        <CheckCircle className="w-4 h-4 text-[#D4AF37]" />
        <span>التطبيق مثبت</span>
      </div>
    );
  }

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isTriggering || isInstalled) return;

    setIsTriggering(true);
    try {
      const result = await executeInstall();
      if (result.outcome === 'accepted') {
        showToast('🎉 تم تثبيت تطبيق بامبورينا بنجاح!', 'أصبح التطبيق متاحاً على شاشتك للطلب السريع', 'success');
      }
    } catch (err) {
      console.warn('[PWA] Install error:', err);
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <button
      type="button"
      id="pwa-main-install-btn"
      onClick={handleClick}
      disabled={isTriggering}
      aria-label="تحميل تطبيق بامبورينا"
      title="تحميل تطبيق بامبورينا"
      className={`w-full relative overflow-hidden flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] text-black font-black text-xs sm:text-sm shadow-md hover:brightness-105 active:scale-[0.99] border border-[#F4E08B]/60 transition-all cursor-pointer select-none group ${className}`}
    >
      <div className="w-6 h-6 rounded-lg bg-black/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
        {isTriggering ? (
          <Loader2 className="w-4 h-4 text-black animate-spin" />
        ) : (
          <Smartphone className="w-4 h-4 stroke-[2.5] text-black" />
        )}
      </div>
      <span className="font-black tracking-tight text-black truncate text-xs sm:text-sm">
        {isTriggering ? 'جاري الفتح...' : 'تحميل تطبيق بامبورينا'}
      </span>

      {/* Subtle Shimmer Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
    </button>
  );
};
