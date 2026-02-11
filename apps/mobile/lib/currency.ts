/**
 * Format a number as Vietnamese Dong (VND) currency.
 * Example: 250000 -> "250.000 d"
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Parse a VND-formatted string back to a number.
 * Strips all non-digit characters.
 */
export function parseVND(formatted: string): number {
  const digits = formatted.replace(/[^\d]/g, '');
  return parseInt(digits, 10) || 0;
}
