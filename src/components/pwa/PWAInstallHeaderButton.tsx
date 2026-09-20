import React from 'react';
import { Smartphone, CheckCircle } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallHeaderButtonProps {
  className?: string;
  variant?: 'gold' | 'outline' | 'compact';
}

export const PWAInstallHeaderButton: React.FC<PWAInstallHeaderButtonProps> = ({
  className = '',
}) => {
  const { isInstalled, openInstallModal } = usePWAInstall();

  if (isInstalled) {
    return (
      <span className="text-[10px] text-[#D4AF37] flex items-center gap-1 font-bold">
        <CheckCircle className="w-3 h-3" />
        <span>مثبت</span>
      </span>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openInstallModal();
      }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] text-black font-black text-xs shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer ${className}`}
      title="تحميل تطبيق بامبورينا"
      aria-label="تحميل تطبيق بامبورينا"
    >
      <Smartphone className="w-4 h-4 stroke-[2.5] text-black" />
      <span>تحميل تطبيق بامبورينا</span>
    </button>
  );
};
