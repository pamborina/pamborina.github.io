/**
 * Pamborina Patisserie - Sacred Brand Identity System Tokens
 * Extracted directly from the official Pamborina circular emblem & calligraphy logo.
 */

export const BRAND_COLORS = {
  // Primary Cacao Espresso Shades (Logo Outer Ring & Background Base)
  cacao: {
    1000: '#080503', // Deepest Obsidian Cacao
    900: '#0B0806',  // Main Dark Canvas Background
    800: '#140E0A',  // Surface Card Base
    700: '#1C140E',  // Card Surface
    600: '#261B13',  // Hover Card State
    500: '#2E1A0D',  // Logo Ring Espresso Brown
    400: '#3A2213',  // Outer Border Chocolate
    300: '#5C3B24',  // Subtler Border Accent
    200: '#8A5D3B',  // Muted Warm Brown
    100: '#B88863',  // Soft Bronze Accent
  },

  // Imperial Patisserie Gold & Champagne (Stars, Ribbons, Highlights)
  gold: {
    light: '#FFF1C5',    // Soft Champagne Highlight
    cream: '#F4E08B',    // Light Gold
    primary: '#D4AF37',  // Sacred Imperial Gold
    medium: '#C8A038',   // Rich Medium Gold
    dark: '#9B7B1B',     // Deep Antique Gold
    shadow: '#634E10',   // Dark Gold Accent
    glow: 'rgba(212, 175, 55, 0.25)',
    glowSm: 'rgba(212, 175, 55, 0.12)',
  },

  // Parchment & Cream Accents (Inner Emblem Circle & Calligraphy Background)
  parchment: {
    pure: '#FFFDF7',     // Crisp Cream
    light: '#F8F3E6',    // Warm Parchment
    medium: '#EFE5D2',   // Aged Cream
    dark: '#C8BFB0',     // Muted Text Neutral
    muted: '#8E8373',    // Secondary Subtitle Neutral
  },

  // Olive Tree & Pistachio Leaf Accents (Official Brand Tree Symbol)
  pistachio: {
    light: '#95B981',    // Bright Leaf Top
    medium: '#6B8E59',   // Olive Pistachio Primary
    dark: '#527341',     // Shadow Leaf Green
    deep: '#283B1E',     // Deep Pistachio Background Accent
  },

  // Semantic Status Colors
  semantic: {
    success: '#10B981',  // Fresh / Order Confirmed
    warning: '#F59E0B',  // In Preparation
    danger: '#EF4444',   // Out of stock / Error
    info: '#3B82F6',     // Delivery en route
  },
} as const;

export const BRAND_TYPOGRAPHY = {
  fontSans: "'Cairo', 'Tajawal', system-ui, -apple-system, sans-serif",
  fontHeading: "'Tajawal', 'Cairo', sans-serif",
  fontDisplay: "'Readex Pro', 'Cairo', sans-serif",
  fontCursive: "'Brush Script MT', 'Playfair Display', 'Georgia', serif",
  scale: {
    xs: { fontSize: '0.75rem', lineHeight: '1rem' },
    sm: { fontSize: '0.875rem', lineHeight: '1.25rem' },
    base: { fontSize: '1rem', lineHeight: '1.5rem' },
    lg: { fontSize: '1.125rem', lineHeight: '1.75rem' },
    xl: { fontSize: '1.25rem', lineHeight: '1.75rem' },
    '2xl': { fontSize: '1.5rem', lineHeight: '2rem' },
    '3xl': { fontSize: '1.875rem', lineHeight: '2.25rem' },
    '4xl': { fontSize: '2.25rem', lineHeight: '2.5rem' },
  },
} as const;

export const BRAND_SPACING = {
  xs: '0.25rem',  // 4px
  sm: '0.5rem',   // 8px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  '2xl': '3rem',  // 48px
  '3xl': '4rem',  // 64px
} as const;

export const BRAND_RADIUS = {
  xs: '0.375rem', // 6px
  sm: '0.5rem',   // 8px
  md: '0.75rem',  // 12px
  lg: '1rem',     // 16px
  xl: '1.5rem',   // 24px
  '2xl': '2rem',  // 32px
  full: '9999px',
} as const;

export const BRAND_ELEVATION = {
  0: 'none',
  1: '0 2px 8px -1px rgba(0, 0, 0, 0.4)',
  2: '0 4px 16px -2px rgba(0, 0, 0, 0.6), 0 0 12px rgba(212, 175, 55, 0.08)',
  3: '0 8px 30px -4px rgba(0, 0, 0, 0.8), 0 0 20px rgba(212, 175, 55, 0.15)',
  4: '0 16px 40px -8px rgba(0, 0, 0, 0.9), 0 0 35px rgba(212, 175, 55, 0.25)',
  goldGlow: '0 0 30px rgba(212, 175, 55, 0.28)',
  goldGlowSm: '0 0 15px rgba(212, 175, 55, 0.15)',
} as const;

export const BRAND_GLASS = {
  card: {
    background: 'rgba(28, 20, 14, 0.85)',
    border: '1px solid rgba(212, 175, 55, 0.18)',
    backdropFilter: 'blur(16px)',
  },
  header: {
    background: 'rgba(11, 8, 6, 0.88)',
    borderBottom: '1px solid rgba(61, 44, 30, 0.8)',
    backdropFilter: 'blur(20px)',
  },
  pill: {
    background: 'rgba(42, 30, 21, 0.7)',
    border: '1px solid rgba(212, 175, 55, 0.2)',
    backdropFilter: 'blur(12px)',
  },
} as const;
