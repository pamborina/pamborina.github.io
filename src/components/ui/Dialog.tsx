import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 dir-rtl">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div
        className={`relative w-full ${widthClasses} bg-[#18110B] border border-[#D4AF37]/40 rounded-3xl shadow-2xl shadow-[#D4AF37]/10 z-10 overflow-hidden transform transition-all duration-300 scale-100 gold-glow-sm`}
      >
        {/* Top Gold Accent Line */}
        <div className="h-1 bg-gold-gradient animate-shimmer" />

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-[#2C1F16]">
          <div>
            {title && (
              <h3 className="text-xl font-black text-[#FFF1C5] font-heading">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs text-[#C8BFB0] mt-1">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#2A1E15] text-[#C8BFB0] hover:text-[#F4E08B] hover:bg-[#3D2C1E] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4 text-right">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-6 pt-4 bg-[#120D09] border-t border-[#2C1F16] flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
