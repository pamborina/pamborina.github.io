import React, { useState, forwardRef, useId } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  showLockIcon?: boolean;
  containerClassName?: string;
  variant?: 'admin' | 'luxury' | 'default';
}

/**
 * Standard Accessible Password Input Component for Pamborina Platform.
 *
 * Features:
 * - Independent show/hide state per instance
 * - Fully accessible eye toggle (type="button", aria-label, keyboard navigation)
 * - Direction-aware layout (RTL-friendly with LTR password entry to prevent text reversing)
 * - Zero layout shift or input resizing when toggling
 * - Dark & luxury theme compatibility with consistent border and focus rings
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      label,
      error,
      helperText,
      showLockIcon = false,
      containerClassName = '',
      className = '',
      variant = 'admin',
      id,
      disabled,
      required,
      placeholder = '••••••••',
      ...rest
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const [showPassword, setShowPassword] = useState(false);

    // Variants styling
    const variantStyles = {
      admin:
        'bg-neutral-900 border-neutral-700 text-white placeholder-neutral-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500',
      luxury:
        'bg-[#140E0A]/90 border-[#3D2C1E] text-[#F7F3E8] placeholder-[#8E8373] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 hover:border-[#5C3B24]',
      default:
        'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500',
    }[variant];

    return (
      <div className={`w-full space-y-1.5 text-right ${containerClassName}`} dir="rtl">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-neutral-300 leading-tight"
          >
            {label}
            {required && <span className="text-rose-400 mr-1">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {/* Optional Right Lock Icon (In RTL, right is the leading edge) */}
          {showLockIcon && (
            <div className="absolute right-3.5 inset-y-0 flex items-center pointer-events-none text-neutral-400">
              <Lock className="w-4 h-4" />
            </div>
          )}

          {/* Password Input field */}
          <input
            {...rest}
            ref={ref}
            id={inputId}
            type={showPassword ? 'text' : 'password'}
            disabled={disabled}
            required={required}
            placeholder={placeholder}
            dir="ltr"
            className={`w-full py-2.5 rounded-xl border text-sm transition-all outline-none font-mono ${
              showLockIcon ? 'pr-10' : 'pr-3.5'
            } pl-11 ${
              error
                ? 'border-rose-500/80 focus:ring-2 focus:ring-rose-500/30'
                : variantStyles
            } ${
              disabled
                ? 'opacity-50 cursor-not-allowed bg-neutral-950/60'
                : ''
            } ${className}`}
          />

          {/* Eye Toggle Button (In RTL, left is trailing action edge) */}
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={disabled}
            tabIndex={0}
            aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            aria-pressed={showPassword}
            title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            className="absolute left-1 inset-y-0 my-auto h-8 w-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-amber-400 focus:text-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4 shrink-0 transition-transform" />
            ) : (
              <Eye className="w-4 h-4 shrink-0 transition-transform" />
            )}
          </button>
        </div>

        {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
        {helperText && !error && (
          <p className="text-[11px] text-neutral-400">{helperText}</p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
