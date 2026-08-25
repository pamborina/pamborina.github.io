import React, { useState } from 'react';
import { Search, ChevronDown, Plus, Minus, Check, Eye, EyeOff } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* Standard & Floating Label Text Input                                       */
/* -------------------------------------------------------------------------- */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  floatingLabel?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, floatingLabel = false, className = '', id, value, onChange, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = props.type === 'password';
    const inputId = id || React.useId();
    const hasValue = value !== undefined && value !== '';

    return (
      <div className="w-full space-y-1.5 dir-rtl text-right">
        {label && !floatingLabel && (
          <label htmlFor={inputId} className="block text-xs font-bold text-[#C8BFB0]">
            {label}
            {props.required && <span className="text-amber-400 mr-1">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {rightIcon && (
            <div className="absolute right-3.5 text-[#8E8373] pointer-events-none flex items-center">
              {rightIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            value={value}
            onChange={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            type={isPassword ? (showPassword ? 'text' : 'password') : props.type}
            className={`w-full bg-[#140E0A]/90 text-[#F7F3E8] placeholder-[#8E8373] text-sm rounded-xl border transition-all duration-200 outline-none
              ${rightIcon ? 'pr-10' : 'pr-4'} 
              ${leftIcon || isPassword ? 'pl-10' : 'pl-4'}
              ${floatingLabel ? 'pt-5 pb-2' : 'py-3'}
              ${
                error
                  ? 'border-rose-500/80 focus:ring-2 focus:ring-rose-500/30'
                  : focused
                  ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/20 bg-[#1C140E]'
                  : 'border-[#3D2C1E] hover:border-[#5C3B24]'
              } ${className}`}
            {...props}
          />

          {/* Floating Label Logic */}
          {floatingLabel && label && (
            <label
              htmlFor={inputId}
              className={`absolute right-4 transition-all duration-200 pointer-events-none text-xs font-semibold ${
                focused || hasValue
                  ? 'top-1.5 text-[10px] text-[#D4AF37]'
                  : 'top-3.5 text-xs text-[#8E8373]'
              }`}
            >
              {label}
            </label>
          )}

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3.5 text-[#8E8373] hover:text-[#D4AF37] transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}

          {leftIcon && !isPassword && (
            <div className="absolute left-3.5 text-[#8E8373] pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
        {helperText && !error && <p className="text-[11px] text-[#8E8373]">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

/* -------------------------------------------------------------------------- */
/* Luxury Search Box                                                          */
/* -------------------------------------------------------------------------- */
export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({ className = '', onClear, value, ...props }) => {
  return (
    <div className="relative w-full dir-rtl">
      <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4AF37]" />
      <input
        type="text"
        value={value}
        className={`w-full bg-[#18110B] text-[#F7F3E8] placeholder-[#8E8373] text-sm rounded-2xl pr-11 pl-12 py-3 border border-[#3D2C1E] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all ${className}`}
        {...props}
      />
      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {value ? (
          <button
            onClick={onClear}
            className="text-xs text-[#8E8373] hover:text-[#F4E08B] px-1.5 py-0.5 rounded bg-[#2A1E15]"
          >
            مسح
          </button>
        ) : (
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] text-[#8E8373] bg-[#221811] border border-[#3D2C1E] rounded">
            ⌘K
          </kbd>
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Select Dropdown                                                            */
/* -------------------------------------------------------------------------- */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Array<{ value: string; label: string }>;
  error?: string;
}

export const Select: React.FC<SelectProps> = ({ label, options, error, className = '', id, ...props }) => {
  const selectId = id || React.useId();
  return (
    <div className="w-full space-y-1.5 dir-rtl text-right">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-bold text-[#C8BFB0]">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={`w-full appearance-none bg-[#140E0A] text-[#F7F3E8] text-sm rounded-xl py-3 pr-4 pl-10 border border-[#3D2C1E] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none cursor-pointer transition-all ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#1C140E] text-[#F7F3E8]">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4AF37] pointer-events-none" />
      </div>
      {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Counter Stepper (e.g. Quantity selection in products & cart)               */
/* -------------------------------------------------------------------------- */
export interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
  size?: 'sm' | 'md' | 'lg';
}

export const Stepper: React.FC<StepperProps> = ({ value, min = 1, max = 99, onChange, size = 'md' }) => {
  const handleDecrement = () => {
    if (value > min) onChange(value - 1);
  };

  const handleIncrement = () => {
    if (value < max) onChange(value + 1);
  };

  const btnSizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  }[size];

  return (
    <div className="inline-flex items-center bg-[#1C140E] border border-[#3D2C1E] rounded-xl p-1 gap-2 select-none dir-ltr">
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min}
        className={`${btnSizes} flex items-center justify-center rounded-lg bg-[#2A1E15] text-[#F7F3E8] hover:bg-[#D4AF37] hover:text-black disabled:opacity-30 disabled:hover:bg-[#2A1E15] disabled:hover:text-[#F7F3E8] transition-all cursor-pointer`}
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      <span className="font-bold text-[#F4E08B] px-2 text-sm min-w-[24px] text-center">
        {value}
      </span>

      <button
        type="button"
        onClick={handleIncrement}
        disabled={value >= max}
        className={`${btnSizes} flex items-center justify-center rounded-lg bg-[#2A1E15] text-[#F7F3E8] hover:bg-[#D4AF37] hover:text-black disabled:opacity-30 disabled:hover:bg-[#2A1E15] disabled:hover:text-[#F7F3E8] transition-all cursor-pointer`}
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Radio Group Selector                                                       */
/* -------------------------------------------------------------------------- */
export interface RadioOption {
  value: string;
  titleAr: string;
  subtitleAr?: string;
  badgeAr?: string;
  priceExtraAr?: string;
}

export interface RadioGroupProps {
  options: RadioOption[];
  selectedValue: string;
  onChange: (val: string) => void;
  name: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({ options, selectedValue, onChange, name }) => {
  return (
    <div className="space-y-2.5 dir-rtl">
      {options.map((option) => {
        const isSelected = selectedValue === option.value;
        return (
          <label
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
              isSelected
                ? 'bg-[#221811] border-[#D4AF37] gold-glow-sm'
                : 'bg-[#140E0A] border-[#3D2C1E] hover:border-[#5C3B24]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                  isSelected ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-[#5C3B24] bg-transparent'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#F7F3E8]">{option.titleAr}</span>
                  {option.badgeAr && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#F4E08B]">
                      {option.badgeAr}
                    </span>
                  )}
                </div>
                {option.subtitleAr && (
                  <p className="text-xs text-[#8E8373] mt-0.5">{option.subtitleAr}</p>
                )}
              </div>
            </div>

            {option.priceExtraAr && (
              <span className="text-xs font-bold text-[#D4AF37] shrink-0">{option.priceExtraAr}</span>
            )}
          </label>
        );
      })}
    </div>
  );
};
