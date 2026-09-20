import React from 'react';
import { Smartphone, CheckCircle } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface InstallAppButtonProps {
  className?: string;
}

export const InstallAppButton: React.FC<InstallAppButtonProps> = ({ className = '' }) => {
  const { isInstalled, openInstallModal } = usePWAInstall();

  // If already installed: display verified state
  if (isInstalled) {
    return (
      <div
        id="pwa-app-installed-badge"
        className={`w-full flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl sm:rounded-2xl bg-[#16100B] border border-[#D4AF37]/30 text-[#F4E08B] font-bold text-xs sm:text-sm select-none ${className}`}
      >
        <CheckCircle className="w-4 h-4 text-[#D4AF37]" />
        <span>تطبيق بامبورينا مثبت بالفعل</span>
      </div>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openInstallModal();
  };

  return (
    <button
      type="button"
      id="pwa-main-install-btn"
      onClick={handleClick}
      aria-label="تحميل تطبيق بامبورينا"
      title="تحميل تطبيق بامبورينا على هاتفك أو حاسوبك"
      className={`w-full relative overflow-hidden flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] text-black font-black text-xs sm:text-sm shadow-md hover:brightness-105 active:scale-[0.99] border border-[#F4E08B]/60 transition-all cursor-pointer select-none group ${className}`}
    >
      <div className="w-6 h-6 rounded-lg bg-black/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
        <Smartphone className="w-4 h-4 stroke-[2.5] text-black" />
      </div>
      <span className="font-black tracking-tight text-black truncate text-xs sm:text-sm">
        تحميل تطبيق بامبورينا
      </span>

      {/* Subtle Shimmer Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
    </button>
  );
};
