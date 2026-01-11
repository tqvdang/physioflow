import {
  format,
  parse,
  isToday as dateFnsIsToday,
  isThisWeek as dateFnsIsThisWeek,
  isYesterday,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  startOfDay,
} from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * Format a date to display format (DD/MM/YYYY)
 */
export function formatDate(date: Date | string | number): string {
  const d = toDate(date);
  return format(d, 'dd/MM/yyyy');
}

/**
 * Format a time to display format (HH:mm)
 */
export function formatTime(date: Date | string | number): string {
  const d = toDate(date);
  return format(d, 'HH:mm');
}

/**
 * Format a date and time to display format (DD/MM/YYYY HH:mm)
 */
export function formatDateTime(date: Date | string | number): string {
  const d = toDate(date);
  return format(d, 'dd/MM/yyyy HH:mm');
}

/**
 * Parse a date string in DD/MM/YYYY format
 */
export function parseDate(dateString: string): Date | null {
  try {
    const parsed = parse(dateString, 'dd/MM/yyyy', new Date());
    if (isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Check if a date is today
 */
export function isToday(date: Date | string | number): boolean {
  return dateFnsIsToday(toDate(date));
}

/**
 * Check if a date is within this week
 */
export function isThisWeek(date: Date | string | number): boolean {
  return dateFnsIsThisWeek(toDate(date), { weekStartsOn: 1 });
}

/**
 * Get relative time in Vietnamese
 * Returns: "Hom nay", "Hom qua", "X ngay truoc", etc.
 */
export function getRelativeTime(date: Date | string | number): string {
  const d = toDate(date);
  const now = new Date();

  if (dateFnsIsToday(d)) {
    const hoursDiff = differenceInHours(now, d);
    if (hoursDiff < 1) {
      const minutesDiff = differenceInMinutes(now, d);
      if (minutesDiff < 1) {
        return 'Vua xong';
      }
      return `${minutesDiff} phut truoc`;
    }
    return `${hoursDiff} gio truoc`;
  }

  if (isYesterday(d)) {
    return 'Hom qua';
  }

  const daysDiff = differenceInDays(startOfDay(now), startOfDay(d));

  if (daysDiff < 7) {
    return `${daysDiff} ngay truoc`;
  }

  if (daysDiff < 30) {
    const weeks = Math.floor(daysDiff / 7);
    return `${weeks} tuan truoc`;
  }

  if (daysDiff < 365) {
    const months = Math.floor(daysDiff / 30);
    return `${months} thang truoc`;
  }

  const years = Math.floor(daysDiff / 365);
  return `${years} nam truoc`;
}

/**
 * Format date in Vietnamese locale
 * Example: "Thứ Hai, 15 tháng 1, 2024"
 */
export function formatVietnameseDate(
  date: Date | string | number,
  formatStr: string = "EEEE, d 'thang' M, yyyy"
): string {
  const d = toDate(date);
  return format(d, formatStr, { locale: vi });
}

/**
 * Convert various date inputs to Date object
 */
function toDate(date: Date | string | number): Date {
  if (date instanceof Date) {
    return date;
  }
  if (typeof date === 'number') {
    return new Date(date);
  }
  return new Date(date);
}
