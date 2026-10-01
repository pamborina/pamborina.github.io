import React from 'react';
import { motion } from 'motion/react';
import { Images } from '../../data/images';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  showSubtitle?: boolean;
  showArabicText?: boolean;
  className?: string;
  variant?: 'full' | 'emblem' | 'wordmark';
  useImage?: boolean;
  onClick?: () => void;
  interactive?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showSubtitle = true,
  showArabicText = true,
  className = '',
  variant = 'full',
  useImage = true,
  onClick,
  interactive = true,
}) => {
  const sizeDimensions = {
    sm: { width: 68, height: 68, textClass: 'text-xs' },
    md: { width: 104, height: 104, textClass: 'text-sm font-bold' },
    lg: { width: 148, height: 148, textClass: 'text-base font-extrabold' },
    xl: { width: 210, height: 210, textClass: 'text-xl font-black' },
    hero: { width: 290, height: 290, textClass: 'text-3xl font-black' },
  }[size];

  const dim = sizeDimensions.width;

  const logoGraphic = (
    <div className={`inline-flex flex-col items-center justify-center select-none ${className}`}>
      {/* Official Pamborina Emblem */}
      {(variant === 'full' || variant === 'emblem') && (
        <div className="relative group flex items-center justify-center">
          {/* Soft Golden Ambient Glow */}
          <div
            className="absolute inset-0 rounded-full bg-[#D4AF37] opacity-30 blur-md group-hover:opacity-70 group-hover:blur-lg transition-all duration-300 pointer-events-none"
            style={{ width: dim + 10, height: dim + 10 }}
          />

          {useImage ? (
            <div
              className="relative z-10 rounded-full p-1 bg-gradient-to-b from-[#D4AF37] via-[#2E1A0D] to-[#3A2213] shadow-2xl overflow-hidden group-hover:shadow-[0_0_25px_rgba(212,175,55,0.7)] transition-all duration-300"
              style={{ width: dim, height: dim }}
            >
              <img
                src={Images.logo}
                alt="شعار حلواني بامبورينا الرسمي"
                referrerPolicy="no-referrer"
                className="w-full h-full rounded-full object-cover bg-white"
              />
            </div>
          ) : (
            <svg
              width={dim}
              height={dim}
              viewBox="0 0 500 500"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="relative z-10 drop-shadow-xl transform group-hover:scale-[1.02] transition-transform duration-300"
              aria-label="Pamborina Patisserie Official Logo"
            >
              <defs>
                <radialGradient id="innerBg" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FFFDF7" />
                  <stop offset="75%" stopColor="#F8F3E6" />
                  <stop offset="100%" stopColor="#EFE5D2" />
                </radialGradient>
                <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F4E08B" />
                  <stop offset="50%" stopColor="#D4AF37" />
                  <stop offset="100%" stopColor="#9B7B1B" />
                </linearGradient>
                <path
                  id="textRingPath"
                  d="M 250, 250 m -208, 0 a 208,208 0 1,1 416,0 a 208,208 0 1,1 -416,0"
                />
              </defs>

              <circle cx="250" cy="250" r="240" fill="#3A2213" stroke="#D4AF37" strokeWidth="4" />
              <circle cx="250" cy="250" r="222" fill="#2E1A0D" stroke="#5C3B24" strokeWidth="2" />

              <text fill="#F5E8C7" fontSize="22" fontWeight="600" letterSpacing="2px">
                <textPath href="#textRingPath" startOffset="0%">
                  Pammborina sweet *** Pammborina sweet *** Pammborina sweet *** Pammborina sweet ***
                </textPath>
              </text>

              <circle cx="250" cy="250" r="172" fill="url(#innerBg)" stroke="#C8A038" strokeWidth="5" />
              <circle cx="250" cy="250" r="165" fill="none" stroke="#D4AF37" strokeWidth="1.5" strokeDasharray="4 3" />

              <g transform="translate(180, 110) scale(0.7)">
                <path
                  d="M100 130 C95 100 90 90 82 80 C88 75 92 65 92 50 C92 25 70 5 45 5 C20 5 0 25 0 50 C0 65 6 75 12 80 C4 90 0 100 -5 130 C15 125 35 120 45 120 C55 120 75 125 100 130 Z"
                  fill="#3A281A"
                />
                <circle cx="45" cy="35" r="42" fill="#6B8E59" opacity="0.9" />
              </g>

              <text
                x="250"
                y="262"
                textAnchor="middle"
                fontFamily="'Playfair Display', serif"
                fontSize="68"
                fontWeight="bold"
                fontStyle="italic"
                fill="#2E1A0D"
              >
                Pamborina
              </text>

              <text
                x="250"
                y="298"
                textAnchor="middle"
                fontFamily="'Readex Pro', sans-serif"
                fontSize="24"
                fontWeight="700"
                letterSpacing="8px"
                fill="#9A7B2C"
              >
                PATISSERIE
              </text>

              <rect x="160" y="310" width="180" height="3" fill="url(#goldGradient)" rx="1.5" />

              <g transform="translate(195, 322)">
                <polygon points="15,0 19,10 30,11 22,18 24,29 15,23 6,29 8,18 0,11 11,10" fill="#9A7B2C" />
              </g>
              <g transform="translate(235, 320) scale(1.2)">
                <polygon points="15,0 19,10 30,11 22,18 24,29 15,23 6,29 8,18 0,11 11,10" fill="url(#goldGradient)" />
              </g>
              <g transform="translate(275, 322)">
                <polygon points="15,0 19,10 30,11 22,18 24,29 15,23 6,29 8,18 0,11 11,10" fill="#9A7B2C" />
              </g>
            </svg>
          )}
        </div>
      )}

      {/* Calligraphic Arabic Brand Name "حلواني بامبورينا" below logo */}
      {showArabicText && (variant === 'full' || variant === 'wordmark') && (
        <div className={`mt-2 text-center dir-rtl ${sizeDimensions.textClass}`}>
          <div className="font-heading font-black tracking-tight leading-none text-[#F4E08B] drop-shadow-md">
            <span className="text-[#C8A038] text-[0.8em] font-bold ml-1.5 inline-block">حلواني</span>
            <span className="text-gold-gradient font-black text-[1.2em] tracking-tight">بامبورينا</span>
          </div>

          {showSubtitle && (
            <div className="text-[0.68em] text-[#C8BFB0] tracking-widest font-medium mt-1 opacity-90">
              حلواني ومعجنات فاخرة • مصر
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (!interactive && !onClick) {
    return logoGraphic;
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.05, rotate: 2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="focus:outline-none cursor-pointer group rounded-full relative inline-block border-none bg-transparent p-0 select-none"
      aria-label="حلواني بامبورينا - الصفحة الرئيسية"
    >
      {logoGraphic}
    </motion.button>
  );
};
