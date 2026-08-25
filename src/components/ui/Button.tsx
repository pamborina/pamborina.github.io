import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'gold-outline' | 'dark-glass' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'gold',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'relative inline-flex items-center justify-center font-bold transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none dir-rtl';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3.5 text-base gap-2.5',
    xl: 'px-8 py-4 text-lg gap-3 rounded-2xl',
  }[size];

  const variantStyles = {
    gold: 'bg-gold-gradient text-black shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/40 hover:brightness-105 border border-[#F4E08B]/40',
    'gold-outline':
      'bg-transparent text-[#F4E08B] border border-[#D4AF37]/60 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]',
    outline:
      'bg-transparent text-[#F4E08B] border border-[#D4AF37]/60 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]',
    'dark-glass':
      'bg-[#1C140E]/90 text-[#F7F3E8] border border-[#3D2C1E] hover:border-[#D4AF37]/50 hover:bg-[#261B13]',
    ghost: 'bg-transparent text-[#C8BFB0] hover:text-[#F4E08B] hover:bg-[#1C140E]/60',
    danger: 'bg-rose-900/80 text-rose-100 border border-rose-700/50 hover:bg-rose-800',
  }[variant];

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        <>
          {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          <span>{children}</span>
          {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        </>
      )}
    </button>
  );
};
