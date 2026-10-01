/**
 * Pamborina Ordering Platform - Utility Functions
 */

export function formatPrice(amount: number, showCurrency = true): string {
  const formatted = new Intl.NumberFormat('ar-EG', {
    maximumFractionDigits: 0,
  }).format(amount);

  return showCurrency ? `${formatted} ج.م` : formatted;
}

export function formatNumberArabic(num: number): string {
  return new Intl.NumberFormat('ar-EG').format(num);
}

export function calculateDiscountPercentage(originalPrice: number, currentPrice: number): number {
  if (!originalPrice || originalPrice <= currentPrice) return 0;
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
}

export function generateOrderNumber(orderType: 'delivery' | 'pickup' = 'delivery'): string {
  const suffix = orderType === 'pickup' ? 'PICKUP' : 'ONLINE';
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedSeqStr = localStorage.getItem('pamborina_order_sequence');
      let storedSeq = storedSeqStr ? parseInt(storedSeqStr, 10) : 0;
      if (isNaN(storedSeq)) storedSeq = 0;
      const nextSeq = storedSeq + 1;
      localStorage.setItem('pamborina_order_sequence', String(nextSeq));
      const paddedSeq = String(nextSeq).padStart(2, '0');
      return `ORDER-${paddedSeq}-${suffix}`;
    }
  } catch {
    // fallback
  }
  const randomNum = Math.floor(1 + Math.random() * 99);
  const padded = String(randomNum).padStart(2, '0');
  return `ORDER-${padded}-${suffix}`;
}

/**
 * Normalizes order numbers and search terms for robust lookup:
 * - Converts Arabic numerals (٠١٢٣٤٥٦٧٨٩) to English digits
 * - Strips zero-width characters and leading/trailing whitespace
 * - Strips leading '#' symbol
 * - Handles both upper and lower case lookups
 */
export function normalizeOrderNumber(input: string): string {
  if (!input) return '';
  let str = input
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();

  // Convert Arabic-Indic digits to ASCII digits
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  for (let i = 0; i < 10; i++) {
    str = str.replace(new RegExp(arabicDigits[i], 'g'), String(i));
  }

  // Remove leading #
  if (str.startsWith('#')) {
    str = str.substring(1).trim();
  }

  return str.toUpperCase();
}

export function normalizeSearchTerm(input: string): string {
  return normalizeOrderNumber(input).toLowerCase();
}


export function cn(...classes: Array<string | undefined | null | false>): string {
  return classes.filter(Boolean).join(' ');
}
