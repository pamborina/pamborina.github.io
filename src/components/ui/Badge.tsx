import React from 'react';

export type BadgeVariant =
  | 'gold'
  | 'bestseller'
  | 'signature'
  | 'chef'
  | 'discount'
  | 'new'
  | 'dark';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'gold', children, className = '' }) => {
  const styles = {
    gold: 'bg-[#D4AF37]/15 text-[#F4E08B] border border-[#D4AF37]/30',
    bestseller: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    signature: 'bg-yellow-500/20 text-yellow-200 border border-yellow-400/50',
    chef: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
    discount: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
    new: 'bg-sky-500/20 text-sky-300 border border-sky-500/40',
    dark: 'bg-[#2A1E15] text-[#C8BFB0] border border-[#3D2C1E]',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap tracking-wide select-none ${styles} ${className}`}
    >
      {children}
    </span>
  );
};
