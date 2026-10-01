import React from 'react';

interface BrandGoldWhatsAppIconProps {
  className?: string;
  size?: number | string;
  variant?: 'solid-gold' | 'gold-gradient' | 'gold-contour' | 'luxury-glow';
}

/**
 * High-definition Vector WhatsApp Icon customized in Bamborina's signature luxury gold brand identity.
 * Faithfully reproduces the brand gold emblem with smooth metallic curves, anti-aliased geometry,
 * and high clarity on all screen densities (Retina, 4K, mobile OLED).
 */
export const BrandGoldWhatsAppIcon: React.FC<BrandGoldWhatsAppIconProps> = ({
  className = 'w-6 h-6',
  size,
  variant = 'gold-gradient',
}) => {
  const dimension = size ? (typeof size === 'number' ? `${size}px` : size) : undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={dimension}
      height={dimension}
      className={`inline-block select-none shrink-0 ${className}`}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        {/* Luxury Bamborina Gold Gradients */}
        <linearGradient id="pamborinaGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F9E29D" />
          <stop offset="35%" stopColor="#D4AF37" />
          <stop offset="70%" stopColor="#AA8010" />
          <stop offset="100%" stopColor="#DFB73D" />
        </linearGradient>

        <linearGradient id="pamborinaGoldDarkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#8C660A" />
        </linearGradient>

        <linearGradient id="pamborinaGoldStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF2B8" />
          <stop offset="50%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#8C660A" />
        </linearGradient>

        <filter id="pamborinaGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#D4AF37" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Outer Circular Background (Brand Gold Disk) */}
      <circle
        cx="256"
        cy="256"
        r="240"
        fill="url(#pamborinaGoldGrad)"
        filter={variant === 'luxury-glow' ? 'url(#pamborinaGlow)' : undefined}
      />

      {/* Inner Subtle Depth Ring */}
      <circle
        cx="256"
        cy="256"
        r="239"
        stroke="url(#pamborinaGoldStrokeGrad)"
        strokeWidth="3"
      />

      {/* WhatsApp Speech Bubble (Crisp White / Light Contour & Tail) */}
      <path
        d="M256 104C172.05 104 104 172.05 104 256c0 29.83 8.64 57.65 23.59 81.18L106.3 405.7a12 12 0 0014.54 14.54l71.2-19.42C214.39 414.07 234.64 420 256 420c83.95 0 152-68.05 152-152S339.95 104 256 104z"
        stroke="#FFFFFF"
        strokeWidth="22"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* WhatsApp Phone Handset Icon (Crisp White Fill) */}
      <path
        d="M336.5 304.5c-4.6-2.3-27.2-13.4-31.4-14.9-4.2-1.5-7.3-2.3-10.3 2.3-3.1 4.6-11.8 14.9-14.5 17.9-2.7 3.1-5.4 3.4-10 1.1-4.6-2.3-19.4-7.2-37-22.8-13.7-12.2-22.9-27.3-25.6-31.9-2.7-4.6-.3-7.1 2-9.4 2.1-2.1 4.6-5.4 6.9-8 2.3-2.7 3.1-4.6 4.6-7.7 1.5-3.1.8-5.7-.4-8-1.1-2.3-10.3-24.9-14.1-34.1-3.7-9-7.5-7.7-10.3-7.9-2.7-.1-5.7-.2-8.8-.2s-8 1.1-12.2 5.7c-4.2 4.6-16.1 15.7-16.1 38.3s16.5 44.4 18.8 47.5c2.3 3.1 32.5 49.6 78.7 69.6 11 4.8 19.6 7.6 26.3 9.7 11.1 3.5 21.2 3 29.2 1.8 8.9-1.3 27.2-11.1 31-21.8 3.8-10.7 3.8-19.9 2.7-21.8-1.2-1.9-4.2-3.1-8.8-5.4z"
        fill="#FFFFFF"
      />
    </svg>
  );
};
