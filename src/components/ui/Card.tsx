import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
  activeBorder?: boolean;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverEffect = true,
  activeBorder = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`relative bg-[#18110B]/90 rounded-2xl border ${
        activeBorder ? 'border-[#D4AF37]' : 'border-[#2C1F16]'
      } ${
        hoverEffect
          ? 'hover:border-[#D4AF37]/50 hover:bg-[#201710] hover:shadow-xl hover:shadow-[#D4AF37]/5 transition-all duration-300'
          : ''
      } backdrop-blur-md overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
