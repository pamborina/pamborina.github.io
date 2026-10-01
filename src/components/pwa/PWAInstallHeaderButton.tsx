import React, { useState } from 'react';
import { Smartphone, CheckCircle, Loader2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useToast } from '../ui/Toast';

interface PWAInstallHeaderButtonProps {
  className?: string;
  variant?: 'gold' | 'outline' | 'compact';
}

export const PWAInstallHeaderButton: React.FC<PWAInstallHeaderButtonProps> = ({
  className = '',
}) => {
  const { isInstalled, executeInstall } = usePWAInstall();
  const { showToast } = useToast();
  const [isTriggering, setIsTriggering] = useState<boolean>(false);

  if (isInstalled) {
    return (
      <span className="text-[10px] text-[#D4AF37] flex items-center gap-1 font-bold">
        <CheckCircle className="w-3 h-3" />
        <span>مثبت</span>
      </span>
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
      onClick={handleClick}
      disabled={isTriggering}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] text-black font-black text-xs shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer ${className}`}
      title="تحميل تطبيق بامبورينا"
      aria-label="تحميل تطبيق بامبورينا"
    >
      {isTriggering ? (
        <Loader2 className="w-4 h-4 text-black animate-spin" />
      ) : (
        <Smartphone className="w-4 h-4 stroke-[2.5] text-black" />
      )}
      <span>تحميل تطبيق بامبورينا</span>
    </button>
  );
};
