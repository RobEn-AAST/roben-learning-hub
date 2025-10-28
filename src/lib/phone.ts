/**
 * Phone utilities
 */

export function normalizeEgyptianPhone(raw?: string | null): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');
  // Remove common country-code prefixes for Egypt: +20, 0020, or leading 20
  digits = digits.replace(/^(?:\+|00)?20/, '');
  // If the number was given in international form (20XXXXXXXXXX) it may be missing the
  // leading zero for national format. If after stripping country code we have 10 digits
  // starting with 1, add the leading 0 to form 11-digit national mobile numbers.
  if (digits.length === 10 && /^[1-9]/.test(digits)) {
    digits = '0' + digits;
  }
  // Egyptian mobile numbers start with 010,011,012,015 and have 11 digits total
  const match = digits.match(/^(010|011|012|015)\d{8}$/);
  return match ? digits : null;
}

export function isValidEgyptianPhone(raw?: string | null): boolean {
  return normalizeEgyptianPhone(raw) !== null;
}

export default normalizeEgyptianPhone;
