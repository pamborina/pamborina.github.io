import React from 'react';
import { ArrowRight, ChevronLeft, Share2, Home } from 'lucide-react';

interface BackHeaderProps {
  title: string;
  breadcrumbs?: string[];
  onBack: () => void;
  onHome?: () => void;
  rightAction?: React.ReactNode;
}

export const BackHeader: React.FC<BackHeaderProps> = ({
  title,
  breadcrumbs = [],
  onBack,
  onHome,
  rightAction,
}) => {
  return (
    <div className="sticky top-0 z-30 w-full bg-[#140E0A]/95 backdrop-blur-xl border-b border-[#D4AF37]/30 py-3 px-4 sm:px-6 shadow-md dir-rtl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Right Side: Back Button & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-[#221710] border border-[#3D2C1E] text-[#FFF1C5] hover:text-[#F4E08B] hover:border-[#D4AF37] transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
            title="العودة"
          >
            <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
          </button>

          <div>
            {/* Breadcrumb row */}
            {breadcrumbs.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-[#8E8373]">
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={idx}>
                    <span>{crumb}</span>
                    {idx < breadcrumbs.length - 1 && (
                      <ChevronLeft className="w-2.5 h-2.5 text-[#59493B]" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            <h2 className="text-sm sm:text-base font-extrabold text-[#FFF1C5] font-heading">
              {title}
            </h2>
          </div>
        </div>

        {/* Left Side: Optional Action or Home Button */}
        <div className="flex items-center gap-2">
          {rightAction}

          {onHome && (
            <button
              onClick={onHome}
              className="p-2.5 rounded-2xl bg-[#221710] border border-[#3D2C1E] text-[#C8BFB0] hover:text-[#F4E08B] hover:border-[#D4AF37] transition-all cursor-pointer"
              title="الرئيسية"
            >
              <Home className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
