/**
 * VND currency formatting utility for PhysioFlow billing
 */

/**
 * Format a number as Vietnamese Dong (VND)
 * Example: 250000 -> "250.000 d"
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Parse a VND formatted string back to a number
 * Example: "250.000 d" -> 250000
 */
export function parseVND(formatted: string): number {
  const cleaned = formatted.replace(/[^\d-]/g, "");
  return parseInt(cleaned, 10) || 0;
}
