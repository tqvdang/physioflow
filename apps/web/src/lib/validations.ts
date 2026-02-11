/**
 * Centralized validation constants and utilities
 * These match the backend Go validation rules in apps/api/internal/service/
 * and apps/api/internal/errors/validation_errors.go
 */

// --- Vietnamese-specific patterns ---

/**
 * Vietnamese name regex - allows Vietnamese Unicode diacritics, spaces, hyphens
 * Matches: Nguyen, Tran Van A, Nguyen Thi Mai-Linh
 * Uses explicit Vietnamese character ranges instead of Unicode property escapes
 * to avoid requiring ES6+ target in tsconfig.
 */
export const VIETNAMESE_NAME_REGEX =
  /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂẾưăạảấầẩẫậắằẳẵặẹẻẽềếểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ\s\-']+$/;

/**
 * Vietnamese phone regex
 * Formats: 0912345678, +84912345678, 84912345678
 * Must start with 03, 05, 07, 08, or 09 (after country code)
 */
export const VIETNAMESE_PHONE_REGEX = /^(0|\+84|84)(3|5|7|8|9)[0-9]{8}$/;

// --- Outcome Measure ranges ---

export type MeasureTypeKey =
  | "VAS"
  | "NRS"
  | "NDI"
  | "ODI"
  | "LEFS"
  | "DASH"
  | "QuickDASH"
  | "BBS"
  | "TUG"
  | "FIM"
  | "PSFS";

export const SCORE_RANGES: Record<MeasureTypeKey, [number, number]> = {
  VAS: [0, 10],
  NRS: [0, 10],
  NDI: [0, 100],
  ODI: [0, 100],
  LEFS: [0, 80],
  DASH: [0, 100],
  QuickDASH: [0, 100],
  BBS: [0, 56],
  TUG: [0, 999],
  FIM: [18, 126],
  PSFS: [0, 10],
};

export const MCID_THRESHOLDS: Partial<Record<MeasureTypeKey, number>> = {
  VAS: 2.0,
  NRS: 2.0,
  NDI: 10.0,
  ODI: 10.0,
  LEFS: 9.0,
  DASH: 10.0,
  QuickDASH: 8.0,
  BBS: 4.0,
  FIM: 22.0,
};

// --- ROM joint-specific maximums ---

export type ROMJointKey =
  | "shoulder"
  | "elbow"
  | "wrist"
  | "hip"
  | "knee"
  | "ankle"
  | "cervical_spine"
  | "thoracic_spine"
  | "lumbar_spine";

/**
 * Maximum physiologically possible ROM per joint (in degrees).
 * These are strict maximums - values above these indicate measurement error.
 */
export const ROM_JOINT_MAX_DEGREES: Record<ROMJointKey, number> = {
  shoulder: 200,
  elbow: 160,
  wrist: 100,
  hip: 140,
  knee: 150,
  ankle: 70,
  cervical_spine: 100,
  thoracic_spine: 60,
  lumbar_spine: 80,
};

/**
 * Normal ROM ranges for reference display (typical healthy adult).
 */
export const ROM_NORMAL_RANGES: Record<ROMJointKey, number> = {
  shoulder: 180,
  elbow: 150,
  wrist: 80,
  hip: 120,
  knee: 135,
  ankle: 50,
  cervical_spine: 80,
  thoracic_spine: 40,
  lumbar_spine: 60,
};

// --- Protocol constants ---

export const PROTOCOL_MIN_DURATION_WEEKS = 4;
export const PROTOCOL_MAX_DURATION_WEEKS = 12;
export const PROTOCOL_MIN_FREQUENCY = 2;
export const PROTOCOL_MAX_FREQUENCY = 5;
export const HEP_MIN_EXERCISES = 3;
export const HEP_MAX_EXERCISES = 5;

// --- Billing constants ---

export const MIN_QUANTITY = 1;
export const MIN_UNIT_PRICE = 0;

// --- Discharge constants ---

export const MIN_TREATMENT_DURATION_WEEKS = 2;

// --- Insurance constants ---

// BHYT card format: XX#-####-#####-##### (matches OpenEMR Vietnamese PT module)
// Example: DN4-0123-45678-90123
export const BHYT_CARD_REGEX = /^[A-Z]{2}\d-\d{4}-\d{5}-\d{5}$/;
export const HOSPITAL_REG_CODE_LENGTH = 5;
export const FIVE_YEAR_BONUS_THRESHOLD = 5;

// --- Reassessment interval ---

export const MIN_REASSESSMENT_INTERVAL_DAYS = 14;

// --- Helper functions ---

/**
 * Get the maximum allowed degree for a given joint
 */
export function getJointMaxDegree(joint: ROMJointKey): number {
  return ROM_JOINT_MAX_DEGREES[joint] ?? 360;
}

/**
 * Get the score range for a given measure type
 */
export function getScoreRange(
  measureType: string
): [number, number] | undefined {
  return SCORE_RANGES[measureType as MeasureTypeKey];
}

/**
 * Get the MCID threshold for a given measure type
 */
export function getMcidThreshold(measureType: string): number | undefined {
  return MCID_THRESHOLDS[measureType as MeasureTypeKey];
}

/**
 * Validate a Vietnamese name string
 */
export function isValidVietnameseName(name: string): boolean {
  if (!name || name.trim().length === 0) return false;
  return VIETNAMESE_NAME_REGEX.test(name.trim());
}

/**
 * Validate a Vietnamese phone number
 */
export function isValidVietnamesePhone(phone: string): boolean {
  if (!phone) return false;
  return VIETNAMESE_PHONE_REGEX.test(phone.trim());
}
