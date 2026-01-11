/**
 * Bilingual text structure
 */
export interface BilingualText {
  en: string;
  vi: string;
}

/**
 * Translation dictionary type
 */
export type TranslationDictionary = Record<string, BilingualText>;

/**
 * Supported languages
 */
export type Language = 'en' | 'vi';

/**
 * Default translations for common medical/clinical terms
 */
const DEFAULT_TRANSLATIONS: TranslationDictionary = {
  // General
  'app.name': { en: 'PhysioFlow', vi: 'PhysioFlow' },
  'app.welcome': { en: 'Welcome', vi: 'Xin chao' },

  // Patient
  'patient': { en: 'Patient', vi: 'Benh nhan' },
  'patient.mrn': { en: 'Medical Record Number', vi: 'Ma ho so' },
  'patient.name': { en: 'Full Name', vi: 'Ho va ten' },
  'patient.dob': { en: 'Date of Birth', vi: 'Ngay sinh' },
  'patient.phone': { en: 'Phone Number', vi: 'So dien thoai' },
  'patient.email': { en: 'Email', vi: 'Email' },
  'patient.address': { en: 'Address', vi: 'Dia chi' },
  'patient.insurance': { en: 'Insurance', vi: 'Bao hiem' },

  // Clinical
  'pain.level': { en: 'Pain Level', vi: 'Muc do dau' },
  'rom': { en: 'Range of Motion', vi: 'Tam van dong' },
  'session': { en: 'Session', vi: 'Buoi tap' },
  'treatment': { en: 'Treatment', vi: 'Dieu tri' },
  'diagnosis': { en: 'Diagnosis', vi: 'Chan doan' },
  'prescription': { en: 'Prescription', vi: 'Don thuoc' },
  'exercise': { en: 'Exercise', vi: 'Bai tap' },

  // Actions
  'save': { en: 'Save', vi: 'Luu' },
  'cancel': { en: 'Cancel', vi: 'Huy' },
  'submit': { en: 'Submit', vi: 'Gui' },
  'edit': { en: 'Edit', vi: 'Sua' },
  'delete': { en: 'Delete', vi: 'Xoa' },
  'search': { en: 'Search', vi: 'Tim kiem' },
  'filter': { en: 'Filter', vi: 'Loc' },

  // Status
  'status.active': { en: 'Active', vi: 'Dang hoat dong' },
  'status.inactive': { en: 'Inactive', vi: 'Khong hoat dong' },
  'status.completed': { en: 'Completed', vi: 'Hoan thanh' },
  'status.pending': { en: 'Pending', vi: 'Dang cho' },
  'status.cancelled': { en: 'Cancelled', vi: 'Da huy' },

  // Time
  'today': { en: 'Today', vi: 'Hom nay' },
  'yesterday': { en: 'Yesterday', vi: 'Hom qua' },
  'tomorrow': { en: 'Tomorrow', vi: 'Ngay mai' },
  'thisWeek': { en: 'This Week', vi: 'Tuan nay' },
  'thisMonth': { en: 'This Month', vi: 'Thang nay' },
};

/**
 * Custom translations storage
 */
let customTranslations: TranslationDictionary = {};

/**
 * Current language setting
 */
let currentLanguage: Language = 'vi';

/**
 * Set the current language
 */
export function setLanguage(language: Language): void {
  currentLanguage = language;
}

/**
 * Get the current language
 */
export function getLanguage(): Language {
  return currentLanguage;
}

/**
 * Add custom translations
 */
export function addTranslations(translations: TranslationDictionary): void {
  customTranslations = { ...customTranslations, ...translations };
}

/**
 * Translate a key to the current language
 */
export function translate(
  key: string,
  language?: Language,
  fallback?: string
): string {
  const lang = language ?? currentLanguage;

  // Check custom translations first
  const customEntry = customTranslations[key];
  if (customEntry) {
    return customEntry[lang];
  }

  // Check default translations
  const defaultEntry = DEFAULT_TRANSLATIONS[key];
  if (defaultEntry) {
    return defaultEntry[lang];
  }

  // Return fallback or key itself
  return fallback ?? key;
}

/**
 * Shorthand for translate function
 */
export const t = translate;

/**
 * Format text as bilingual object
 */
export function formatBilingual(en: string, vi: string): BilingualText {
  return { en, vi };
}

/**
 * Get bilingual text for a key
 */
export function getBilingual(key: string): BilingualText | null {
  const custom = customTranslations[key];
  if (custom) {
    return custom;
  }

  const defaultEntry = DEFAULT_TRANSLATIONS[key];
  if (defaultEntry) {
    return defaultEntry;
  }

  return null;
}

/**
 * Check if a translation key exists
 */
export function hasTranslation(key: string): boolean {
  return key in customTranslations || key in DEFAULT_TRANSLATIONS;
}

/**
 * Get all translation keys
 */
export function getAllTranslationKeys(): string[] {
  const customKeys = Object.keys(customTranslations);
  const defaultKeys = Object.keys(DEFAULT_TRANSLATIONS);
  return [...new Set([...defaultKeys, ...customKeys])];
}
