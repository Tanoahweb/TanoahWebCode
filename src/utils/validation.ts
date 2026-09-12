/**
 * Validation utility functions for Tanoah storefront & backend services.
 * Enforces standardized, secure validation for email addresses and phone numbers.
 */

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  normalized: string;
}

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  cleanDigits: string;
  formatted: string;
  normalized: string;
}

// RFC 5322 compliant regex ensuring proper username, '@', domain, and 2+ char TLD
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Validates an email address.
 * Ensures the email is non-empty, properly structured, and contains a valid domain.
 * Provides specific, actionable error messages for each failure mode.
 */
export function validateEmail(email?: string | null): EmailValidationResult {
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      error: 'Email address is required.',
      normalized: '',
    };
  }

  const trimmed = email.trim();

  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: 'Email address is required.',
      normalized: '',
    };
  }

  if (trimmed.length > 254) {
    return {
      isValid: false,
      error: 'Email address cannot exceed 254 characters.',
      normalized: trimmed.toLowerCase(),
    };
  }

  if (!trimmed.includes('@')) {
    return {
      isValid: false,
      error: 'Please include an "@" in your email address.',
      normalized: trimmed.toLowerCase(),
    };
  }

  const atParts = trimmed.split('@');
  if (atParts.length > 2) {
    return {
      isValid: false,
      error: 'Email address cannot contain multiple "@" symbols.',
      normalized: trimmed.toLowerCase(),
    };
  }

  const [username, domain] = atParts;

  if (!username) {
    return {
      isValid: false,
      error: 'Please enter a username before the "@" sign.',
      normalized: trimmed.toLowerCase(),
    };
  }

  if (!domain) {
    return {
      isValid: false,
      error: 'Please enter a domain after the "@" sign (e.g. gmail.com).',
      normalized: trimmed.toLowerCase(),
    };
  }

  if (!domain.includes('.')) {
    return {
      isValid: false,
      error: 'Domain must include an extension (e.g. .com or .in).',
      normalized: trimmed.toLowerCase(),
    };
  }

  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1] || '';

  if (tld.length < 2) {
    return {
      isValid: false,
      error: 'Domain extension must be at least 2 characters (e.g. .com).',
      normalized: trimmed.toLowerCase(),
    };
  }

  if (domain.startsWith('.') || domain.endsWith('.')) {
    return {
      isValid: false,
      error: 'Please enter a valid email domain (e.g. gmail.com).',
      normalized: trimmed.toLowerCase(),
    };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address (e.g. name@example.com).',
      normalized: trimmed.toLowerCase(),
    };
  }

  return {
    isValid: true,
    normalized: trimmed.toLowerCase(),
  };
}

/**
 * Helper: Boolean check for email validity.
 */
export function isValidEmail(email?: string | null): boolean {
  return validateEmail(email).isValid;
}

/**
 * Validates a mobile phone number.
 * Supports:
 * - 10-digit Indian mobile numbers (e.g., 9876543210 starting with 6, 7, 8, or 9)
 * - Country code prefix: +91, 91, or leading 0 (e.g., +91 98765 43210, 09876543210)
 * - International numbers: 10 to 15 digits according to E.164 standard
 * 
 * Provides distinct, accurate error messages matching the user's specific input mistake.
 */
export function validatePhone(phone?: string | null): PhoneValidationResult {
  if (!phone || typeof phone !== 'string') {
    return {
      isValid: false,
      error: 'Mobile phone number is required.',
      cleanDigits: '',
      formatted: '',
      normalized: '',
    };
  }

  const trimmed = phone.trim();

  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: 'Mobile phone number is required.',
      cleanDigits: '',
      formatted: '',
      normalized: '',
    };
  }

  // Check if input contains letters
  if (/[a-zA-Z]/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Mobile number cannot contain letters.',
      cleanDigits: trimmed.replace(/\D/g, ''),
      formatted: trimmed,
      normalized: trimmed.replace(/\D/g, ''),
    };
  }

  // Check if input contains invalid symbols (only digits, +, spaces, hyphens, parentheses allowed)
  if (/[^0-9+\s\-()]/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Mobile number contains invalid characters.',
      cleanDigits: trimmed.replace(/\D/g, ''),
      formatted: trimmed,
      normalized: trimmed.replace(/\D/g, ''),
    };
  }

  const digitsOnly = trimmed.replace(/\D/g, '');

  if (digitsOnly.length === 0) {
    return {
      isValid: false,
      error: 'Mobile phone number is required.',
      cleanDigits: '',
      formatted: '',
      normalized: '',
    };
  }

  // 1. User explicitly entered '+' (International or Indian with country code)
  if (trimmed.startsWith('+')) {
    // If it's India (+91)
    if (digitsOnly.startsWith('91')) {
      const core = digitsOnly.slice(2);
      if (core.length === 0) {
        return {
          isValid: false,
          error: 'Please enter your 10-digit mobile number after +91.',
          cleanDigits: digitsOnly,
          formatted: trimmed,
          normalized: digitsOnly,
        };
      }
      if (core.length < 10) {
        return {
          isValid: false,
          error: `Mobile number must be 10 digits (currently ${core.length} digits after +91).`,
          cleanDigits: core,
          formatted: trimmed,
          normalized: core,
        };
      }
      if (core.length > 10) {
        return {
          isValid: false,
          error: `Mobile number cannot exceed 10 digits (currently ${core.length} digits after +91).`,
          cleanDigits: core,
          formatted: trimmed,
          normalized: core,
        };
      }
      // Exactly 10 digits after +91
      const firstDigit = core[0];
      if (!['6', '7', '8', '9'].includes(firstDigit)) {
        return {
          isValid: false,
          error: 'Mobile number must start with 6, 7, 8, or 9.',
          cleanDigits: core,
          formatted: trimmed,
          normalized: core,
        };
      }
      return {
        isValid: true,
        cleanDigits: core,
        formatted: `+91 ${core.slice(0, 5)} ${core.slice(5)}`,
        normalized: core,
      };
    }

    // Other International numbers (+1, +44, +971, etc.)
    if (digitsOnly.length < 10) {
      return {
        isValid: false,
        error: `International number must be at least 10 digits (currently ${digitsOnly.length} digits).`,
        cleanDigits: digitsOnly,
        formatted: trimmed,
        normalized: digitsOnly,
      };
    }
    if (digitsOnly.length > 15) {
      return {
        isValid: false,
        error: `International number cannot exceed 15 digits (currently ${digitsOnly.length} digits).`,
        cleanDigits: digitsOnly,
        formatted: trimmed,
        normalized: digitsOnly,
      };
    }
    return {
      isValid: true,
      cleanDigits: digitsOnly,
      formatted: `+${digitsOnly}`,
      normalized: digitsOnly,
    };
  }

  // 2. Trunk prefix '0' (e.g. 09745334644 -> 11 digits)
  if (digitsOnly.startsWith('0')) {
    const core = digitsOnly.slice(1);
    if (core.length < 10) {
      return {
        isValid: false,
        error: `Mobile number must be 10 digits (currently ${core.length} digits).`,
        cleanDigits: core,
        formatted: trimmed,
        normalized: core,
      };
    }
    if (core.length > 10) {
      return {
        isValid: false,
        error: `Mobile number cannot exceed 10 digits (currently ${core.length} digits).`,
        cleanDigits: core,
        formatted: trimmed,
        normalized: core,
      };
    }
    const firstDigit = core[0];
    if (!['6', '7', '8', '9'].includes(firstDigit)) {
      return {
        isValid: false,
        error: 'Mobile number must start with 6, 7, 8, or 9.',
        cleanDigits: core,
        formatted: trimmed,
        normalized: core,
      };
    }
    return {
      isValid: true,
      cleanDigits: core,
      formatted: `+91 ${core.slice(0, 5)} ${core.slice(5)}`,
      normalized: core,
    };
  }

  // 3. Indian number with '91' prefix without '+' (e.g. 919876543210 -> 12 digits starting with 91, next digit 6-9)
  if (digitsOnly.startsWith('91') && digitsOnly.length >= 12) {
    const core = digitsOnly.slice(2);
    if (core.length === 10 && ['6', '7', '8', '9'].includes(core[0])) {
      return {
        isValid: true,
        cleanDigits: core,
        formatted: `+91 ${core.slice(0, 5)} ${core.slice(5)}`,
        normalized: core,
      };
    }
    if (core.length > 10) {
      return {
        isValid: false,
        error: `Mobile number cannot exceed 10 digits (currently ${core.length} digits).`,
        cleanDigits: core,
        formatted: trimmed,
        normalized: core,
      };
    }
  }

  // 4. Standard Indian mobile numbers (10 digits expected)
  if (digitsOnly.length > 10) {
    return {
      isValid: false,
      error: `Mobile number cannot exceed 10 digits (currently ${digitsOnly.length} digits).`,
      cleanDigits: digitsOnly,
      formatted: trimmed,
      normalized: digitsOnly,
    };
  }

  if (digitsOnly.length < 10) {
    const first = digitsOnly[0];
    if (['6', '7', '8', '9'].includes(first)) {
      return {
        isValid: false,
        error: `Mobile number must be 10 digits (currently ${digitsOnly.length} digits).`,
        cleanDigits: digitsOnly,
        formatted: trimmed,
        normalized: digitsOnly,
      };
    }
    return {
      isValid: false,
      error: 'Mobile number must be 10 digits and start with 6, 7, 8, or 9.',
      cleanDigits: digitsOnly,
      formatted: trimmed,
      normalized: digitsOnly,
    };
  }

  // Exactly 10 digits
  const firstDigit = digitsOnly[0];
  if (!['6', '7', '8', '9'].includes(firstDigit)) {
    return {
      isValid: false,
      error: 'Mobile number must start with 6, 7, 8, or 9.',
      cleanDigits: digitsOnly,
      formatted: trimmed,
      normalized: digitsOnly,
    };
  }

  return {
    isValid: true,
    cleanDigits: digitsOnly,
    formatted: `+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`,
    normalized: digitsOnly,
  };
}

/**
 * Helper: Boolean check for phone validity.
 */
export function isValidPhone(phone?: string | null): boolean {
  return validatePhone(phone).isValid;
}

/**
 * Helper: Standardize phone number for database storage and comparisons.
 * Returns the canonical 10-digit number for Indian numbers, or clean digits for international numbers.
 */
export function normalizePhone(phone?: string | null): string {
  const result = validatePhone(phone);
  return result.cleanDigits;
}
