import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 dir-rtl">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Sheet Content */}
      <div className="relative w-full max-w-xl mx-auto bg-[#18110B] border border-[#D4AF37]/40 rounded-3xl shadow-2xl z-10 overflow-hidden transform transition-transform duration-300 translate-y-0 max-h-[85vh] flex flex-col">
        {/* Drag Pill Handle */}
        <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 bg-[#3D2C1E] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#2C1F16]">
          <div>
            {title && <h3 className="text-lg font-bold text-[#FFF1C5] font-heading">{title}</h3>}
            {subtitle && <p className="text-xs text-[#C8BFB0] mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#2A1E15] text-[#C8BFB0] hover:text-[#F4E08B]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {children}
        </div>

        {/* Footer CTA */}
        {footer && (
          <div className="p-4 bg-[#120D09] border-t border-[#2C1F16] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
