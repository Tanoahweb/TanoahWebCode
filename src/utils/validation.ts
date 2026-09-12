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
      error: 'Email address must include an "@" symbol.',
      normalized: trimmed.toLowerCase(),
    };
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return {
      isValid: false,
      error: 'Please enter a complete email address (e.g. name@example.com).',
      normalized: trimmed.toLowerCase(),
    };
  }

  const domain = parts[1];
  if (!domain.includes('.')) {
    return {
      isValid: false,
      error: 'Email domain must include a valid extension (e.g. .com, .in).',
      normalized: trimmed.toLowerCase(),
    };
  }

  const tld = domain.split('.').pop() || '';
  if (tld.length < 2) {
    return {
      isValid: false,
      error: 'Email domain extension must be at least 2 letters.',
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

  // Remove spaces, hyphens, brackets, and non-digit characters
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (digitsOnly.length < 10) {
    return {
      isValid: false,
      error: 'Please enter a valid 10-digit mobile number.',
      cleanDigits: digitsOnly,
      formatted: trimmed,
      normalized: digitsOnly,
    };
  }

  // If prefixed with 91 (12 digits) or 0 (11 digits), extract the canonical 10 digits
  let canonical10 = digitsOnly;
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    canonical10 = digitsOnly.slice(2);
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    canonical10 = digitsOnly.slice(1);
  } else if (digitsOnly.length > 10) {
    canonical10 = digitsOnly.slice(-10);
  }

  // Check Indian standard 10-digit mobile (starts with 6, 7, 8, or 9)
  if (canonical10.length === 10) {
    const firstDigit = canonical10[0];
    if (!['6', '7', '8', '9'].includes(firstDigit)) {
      // If it's a general international number (10-15 digits), allow it
      if (digitsOnly.length >= 10 && digitsOnly.length <= 15 && trimmed.startsWith('+')) {
        return {
          isValid: true,
          cleanDigits: digitsOnly,
          formatted: `+${digitsOnly}`,
          normalized: `+${digitsOnly}`,
        };
      }
      return {
        isValid: false,
        error: 'Please enter a valid mobile number starting with 6, 7, 8, or 9.',
        cleanDigits: canonical10,
        formatted: trimmed,
        normalized: canonical10,
      };
    }

    return {
      isValid: true,
      cleanDigits: canonical10,
      formatted: `+91 ${canonical10.slice(0, 5)} ${canonical10.slice(5)}`,
      normalized: canonical10,
    };
  }

  // General E.164 international format check (10 to 15 digits)
  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    return {
      isValid: true,
      cleanDigits: digitsOnly,
      formatted: trimmed.startsWith('+') ? trimmed : `+${digitsOnly}`,
      normalized: digitsOnly,
    };
  }

  return {
    isValid: false,
    error: 'Phone number must be between 10 and 15 digits.',
    cleanDigits: digitsOnly,
    formatted: trimmed,
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
