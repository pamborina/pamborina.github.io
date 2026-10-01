import React from 'react';

export interface ChipProps {
  label: string;
  count?: number;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'gold' | 'dark' | 'outline';
}

export const Chip: React.FC<ChipProps> = ({
  label,
  count,
  icon,
  active = false,
  onClick,
  size = 'md',
  variant = 'gold',
}) => {
  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs gap-1.5 rounded-lg',
    md: 'px-3.5 py-1.5 text-xs sm:text-sm gap-2 rounded-xl',
    lg: 'px-4 py-2 text-sm gap-2.5 rounded-2xl',
  }[size];

  const activeStyles = active
    ? 'bg-gold-gradient text-black font-bold shadow-md shadow-[#D4AF37]/20 border border-[#F4E08B]/60 scale-105'
    : 'bg-[#18110B] text-[#C8BFB0] hover:text-[#F4E08B] border border-[#3D2C1E] hover:border-[#D4AF37]/40 hover:bg-[#221811]';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer select-none whitespace-nowrap dir-rtl ${sizeStyles} ${activeStyles}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`px-1.5 py-0.5 text-[10px] rounded-full ${
            active
              ? 'bg-black/20 text-black font-extrabold'
              : 'bg-[#2A1E15] text-[#D4AF37] border border-[#3D2C1E]'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
};
