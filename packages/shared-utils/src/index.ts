// Date utilities
export {
  formatDate,
  formatTime,
  formatDateTime,
  parseDate,
  isToday,
  isThisWeek,
  getRelativeTime,
  formatVietnameseDate,
} from './date';

// Name utilities
export {
  formatVietnameseName,
  parseVietnameseName,
  getInitials,
  normalizeVietnameseName,
} from './name';
export type { ParsedVietnameseName } from './name';

// Phone utilities
export {
  formatPhone,
  parsePhone,
  validateVietnamesePhone,
  getCarrier,
} from './phone';
export type { VietnameseCarrier } from './phone';

// Validation utilities
export {
  isValidMRN,
  isValidBHYTCard,
  isValidEmail,
  isValidDate,
} from './validation';

// Clinical utilities
export {
  calculatePainDelta,
  calculateROMPercentage,
  formatPainLevel,
  getROMNormalRange,
  getAvailableROMMeasurements,
  calculateCompliancePercentage,
  formatDuration,
  formatDurationVerbose,
} from './clinical';
export type { ROMRange } from './clinical';

// i18n utilities
export {
  setLanguage,
  getLanguage,
  addTranslations,
  translate,
  t,
  formatBilingual,
  getBilingual,
  hasTranslation,
  getAllTranslationKeys,
} from './i18n';
export type { BilingualText, TranslationDictionary, Language } from './i18n';

// API utilities
export {
  buildQueryString,
  handleApiError,
  retryWithBackoff,
  buildUrl,
  API_ERROR_CODES,
} from './api';
export type { ApiError, ApiResponse, QueryParams, RetryOptions } from './api';
