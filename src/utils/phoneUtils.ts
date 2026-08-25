/**
 * Phone and WhatsApp Number Normalizer & Validator
 * Production utility supporting Egyptian, Gulf (+966, +971, +974, +965, etc.) and international formats.
 */

export interface PhoneValidationResult {
  isValid: boolean;
  cleanDigits: string;
  internationalWhatsAppDigits: string;
  formattedDisplay: string;
  countryCode: string;
  errorAr?: string;
}

export const phoneUtils = {
  /**
   * Cleans raw phone input into pure digits and extracts country context
   */
  normalizePhoneNumber(rawInput: string, defaultCountryCode: string = '20'): PhoneValidationResult {
    if (!rawInput || typeof rawInput !== 'string') {
      return {
        isValid: false,
        cleanDigits: '',
        internationalWhatsAppDigits: '',
        formattedDisplay: '',
        countryCode: defaultCountryCode,
        errorAr: 'يرجى إدخال رقم الهاتف.',
      };
    }

    // If rawInput has slashes, commas, or separators (multi-number), extract the first portion
    let rawStr = rawInput.trim();
    if (rawStr.includes('/') || rawStr.includes(',') || rawStr.includes('|') || rawStr.includes('\\') || rawStr.includes('-')) {
      const parts = rawStr.split(/[\/,|\\-]/);
      if (parts[0] && parts[0].trim()) {
        rawStr = parts[0].trim();
      }
    }

    // Remove all non-digits except a leading +
    const trimmed = rawStr;
    const hasPlus = trimmed.startsWith('+');
    let digits = trimmed.replace(/\D/g, '');

    if (!digits) {
      return {
        isValid: false,
        cleanDigits: '',
        internationalWhatsAppDigits: '',
        formattedDisplay: '',
        countryCode: defaultCountryCode,
        errorAr: 'الرقم المدخل لا يحتوي على أي أرقام صالحة.',
      };
    }

    let internationalDigits = digits;
    let countryCode = defaultCountryCode;

    // Egypt numbers (e.g. 010..., 011..., 012..., 015... or 201...)
    if (digits.startsWith('0020')) {
      internationalDigits = digits.substring(2);
      countryCode = '20';
    } else if (digits.startsWith('20')) {
      internationalDigits = digits;
      countryCode = '20';
    } else if (digits.startsWith('01') && digits.length === 11) {
      internationalDigits = '20' + digits.substring(1);
      countryCode = '20';
    } else if (digits.startsWith('1') && digits.length === 10) {
      internationalDigits = '20' + digits;
      countryCode = '20';
    }
    // Saudi Arabia numbers (e.g. 05..., 9665...)
    else if (digits.startsWith('00966')) {
      internationalDigits = digits.substring(2);
      countryCode = '966';
    } else if (digits.startsWith('966')) {
      internationalDigits = digits;
      countryCode = '966';
    } else if (digits.startsWith('05') && digits.length === 10) {
      internationalDigits = '966' + digits.substring(1);
      countryCode = '966';
    }
    // UAE numbers (e.g. 05..., 9715...)
    else if (digits.startsWith('00971')) {
      internationalDigits = digits.substring(2);
      countryCode = '971';
    } else if (digits.startsWith('971')) {
      internationalDigits = digits;
      countryCode = '971';
    }
    // Kuwait numbers (e.g. 965...)
    else if (digits.startsWith('00965')) {
      internationalDigits = digits.substring(2);
      countryCode = '965';
    } else if (digits.startsWith('965')) {
      internationalDigits = digits;
      countryCode = '965';
    }
    // Qatar numbers (e.g. 974...)
    else if (digits.startsWith('00974')) {
      internationalDigits = digits.substring(2);
      countryCode = '974';
    } else if (digits.startsWith('974')) {
      internationalDigits = digits;
      countryCode = '974';
    } else if (hasPlus) {
      internationalDigits = digits;
    } else if (digits.length >= 8 && digits.length <= 15) {
      // If starts with 0 and 11 digits, fallback to defaultCountryCode
      if (digits.startsWith('0')) {
        internationalDigits = defaultCountryCode + digits.substring(1);
      } else {
        internationalDigits = defaultCountryCode + digits;
      }
    }

    // Minimum international length check (standard E.164 is 8 to 15 digits)
    const isValid = internationalDigits.length >= 8 && internationalDigits.length <= 15;

    return {
      isValid,
      cleanDigits: digits,
      internationalWhatsAppDigits: internationalDigits,
      formattedDisplay: hasPlus ? `+${internationalDigits}` : digits,
      countryCode,
      errorAr: isValid ? undefined : 'رقم الهاتف غير صالح، تأكد من عدد الأرقام وكود الدولة.',
    };
  },

  /**
   * Generates wa.me link with optional encoded Arabic message
   */
  buildWhatsAppUrl(rawPhone: string, messageText?: string): string {
    const norm = this.normalizePhoneNumber(rawPhone);
    const targetDigits = norm.isValid ? norm.internationalWhatsAppDigits : rawPhone.replace(/\D/g, '');
    const baseUrl = `https://wa.me/${targetDigits}`;
    if (messageText && messageText.trim()) {
      return `${baseUrl}?text=${encodeURIComponent(messageText.trim())}`;
    }
    return baseUrl;
  },

  /**
   * Returns clean digits for WhatsApp API dispatch
   */
  cleanForWhatsApp(rawPhone: string, fallback: string = ''): string {
    if (!rawPhone || !rawPhone.trim()) return fallback;
    const norm = this.normalizePhoneNumber(rawPhone);
    return norm.isValid ? norm.internationalWhatsAppDigits : (fallback || rawPhone.replace(/\D/g, ''));
  }
};
