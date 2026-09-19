import React, { useState } from 'react';
import { Smartphone, Loader2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useToast } from '../ui/Toast';

interface PWAInstallHeaderButtonProps {
  className?: string;
  variant?: 'gold' | 'outline' | 'compact';
}

export const PWAInstallHeaderButton: React.FC<PWAInstallHeaderButtonProps> = ({
  className = '',
  variant = 'gold',
}) => {
  const { isInstalled, install } = usePWAInstall();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Hide ONLY if app is already running in standalone mode (installed app)
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

  if (variant === 'compact') {
    return (
      <button
        onClick={handleInstallClick}
        disabled={isLoading}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] text-black font-extrabold text-[11px] shadow-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer ${className}`}
        title="📱 تحميل تطبيق بامبورينا على هاتفك"
        aria-label="📱 تحميل التطبيق"
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Smartphone className="w-3.5 h-3.5 stroke-[2.5]" />
        )}
        <span>تحميل التطبيق</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleInstallClick}
      disabled={isLoading}
      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F4E08B] to-[#D4AF37] text-black font-black text-xs shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer ${className}`}
      title="📱 تحميل تطبيق بامبورينا على هاتفك"
      aria-label="📱 تحميل التطبيق"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-black" />
      ) : (
        <Smartphone className="w-4 h-4 stroke-[2.5] text-black animate-pulse" />
      )}
      <span>📱 تحميل التطبيق</span>
    </button>
  );
};


