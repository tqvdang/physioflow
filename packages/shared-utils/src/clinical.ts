/**
 * Normal ROM (Range of Motion) ranges for common joints
 * Values in degrees
 */
export interface ROMRange {
  min: number;
  max: number;
  joint: string;
  movement: string;
}

const ROM_NORMAL_RANGES: Record<string, ROMRange> = {
  // Shoulder
  'shoulder_flexion': { min: 0, max: 180, joint: 'Shoulder', movement: 'Flexion' },
  'shoulder_extension': { min: 0, max: 60, joint: 'Shoulder', movement: 'Extension' },
  'shoulder_abduction': { min: 0, max: 180, joint: 'Shoulder', movement: 'Abduction' },
  'shoulder_adduction': { min: 0, max: 50, joint: 'Shoulder', movement: 'Adduction' },
  'shoulder_internal_rotation': { min: 0, max: 90, joint: 'Shoulder', movement: 'Internal Rotation' },
  'shoulder_external_rotation': { min: 0, max: 90, joint: 'Shoulder', movement: 'External Rotation' },
  // Elbow
  'elbow_flexion': { min: 0, max: 150, joint: 'Elbow', movement: 'Flexion' },
  'elbow_extension': { min: 0, max: 0, joint: 'Elbow', movement: 'Extension' },
  // Wrist
  'wrist_flexion': { min: 0, max: 80, joint: 'Wrist', movement: 'Flexion' },
  'wrist_extension': { min: 0, max: 70, joint: 'Wrist', movement: 'Extension' },
  // Hip
  'hip_flexion': { min: 0, max: 120, joint: 'Hip', movement: 'Flexion' },
  'hip_extension': { min: 0, max: 30, joint: 'Hip', movement: 'Extension' },
  'hip_abduction': { min: 0, max: 45, joint: 'Hip', movement: 'Abduction' },
  'hip_adduction': { min: 0, max: 30, joint: 'Hip', movement: 'Adduction' },
  // Knee
  'knee_flexion': { min: 0, max: 135, joint: 'Knee', movement: 'Flexion' },
  'knee_extension': { min: 0, max: 0, joint: 'Knee', movement: 'Extension' },
  // Ankle
  'ankle_dorsiflexion': { min: 0, max: 20, joint: 'Ankle', movement: 'Dorsiflexion' },
  'ankle_plantarflexion': { min: 0, max: 50, joint: 'Ankle', movement: 'Plantarflexion' },
  // Cervical spine
  'cervical_flexion': { min: 0, max: 45, joint: 'Cervical Spine', movement: 'Flexion' },
  'cervical_extension': { min: 0, max: 45, joint: 'Cervical Spine', movement: 'Extension' },
  'cervical_rotation': { min: 0, max: 80, joint: 'Cervical Spine', movement: 'Rotation' },
  'cervical_lateral_flexion': { min: 0, max: 45, joint: 'Cervical Spine', movement: 'Lateral Flexion' },
  // Lumbar spine
  'lumbar_flexion': { min: 0, max: 60, joint: 'Lumbar Spine', movement: 'Flexion' },
  'lumbar_extension': { min: 0, max: 25, joint: 'Lumbar Spine', movement: 'Extension' },
  'lumbar_rotation': { min: 0, max: 30, joint: 'Lumbar Spine', movement: 'Rotation' },
  'lumbar_lateral_flexion': { min: 0, max: 25, joint: 'Lumbar Spine', movement: 'Lateral Flexion' },
};

/**
 * Calculate pain level change (delta)
 * Positive = pain increased, Negative = pain decreased (improvement)
 */
export function calculatePainDelta(previousPain: number, currentPain: number): number {
  return currentPain - previousPain;
}

/**
 * Calculate ROM as percentage of normal range
 */
export function calculateROMPercentage(
  measuredROM: number,
  movementKey: string
): number | null {
  const normalRange = ROM_NORMAL_RANGES[movementKey];

  if (!normalRange) {
    return null;
  }

  const { max } = normalRange;

  if (max === 0) {
    // For extension movements where 0 is normal
    return measuredROM === 0 ? 100 : Math.max(0, 100 - Math.abs(measuredROM) * 10);
  }

  const percentage = (measuredROM / max) * 100;
  return Math.min(100, Math.max(0, Math.round(percentage)));
}

/**
 * Format pain level with descriptive text and emoji
 * Pain scale: 0-10 (VAS - Visual Analog Scale)
 */
export function formatPainLevel(painLevel: number): string {
  const level = Math.max(0, Math.min(10, Math.round(painLevel)));

  const painDescriptions: Record<number, { emoji: string; text: string }> = {
    0: { emoji: '😊', text: 'Khong dau' },
    1: { emoji: '🙂', text: 'Dau rat nhe' },
    2: { emoji: '🙂', text: 'Dau nhe' },
    3: { emoji: '😐', text: 'Dau nhe - vua' },
    4: { emoji: '😐', text: 'Dau vua' },
    5: { emoji: '😕', text: 'Dau vua' },
    6: { emoji: '😟', text: 'Dau vua - nang' },
    7: { emoji: '😣', text: 'Dau nang' },
    8: { emoji: '😫', text: 'Dau rat nang' },
    9: { emoji: '😭', text: 'Dau cuc ky nang' },
    10: { emoji: '🆘', text: 'Dau khong chiu noi' },
  };

  const desc = painDescriptions[level] ?? { emoji: '❓', text: 'Khong xac dinh' };
  return `${desc.emoji} ${level}/10 - ${desc.text}`;
}

/**
 * Get normal ROM range for a movement
 */
export function getROMNormalRange(movementKey: string): ROMRange | null {
  return ROM_NORMAL_RANGES[movementKey] ?? null;
}

/**
 * Get all available ROM movement keys
 */
export function getAvailableROMMeasurements(): string[] {
  return Object.keys(ROM_NORMAL_RANGES);
}

/**
 * Calculate treatment compliance percentage
 * Based on completed sessions vs prescribed sessions
 */
export function calculateCompliancePercentage(
  completedSessions: number,
  prescribedSessions: number
): number {
  if (prescribedSessions <= 0) {
    return 0;
  }

  const percentage = (completedSessions / prescribedSessions) * 100;
  return Math.min(100, Math.max(0, Math.round(percentage)));
}

/**
 * Format duration in mm:ss format (for session timer)
 */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(remainingSeconds).padStart(2, '0');

  return `${mm}:${ss}`;
}

/**
 * Format duration in human readable format (Vietnamese)
 */
export function formatDurationVerbose(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));

  if (seconds < 60) {
    return `${seconds} giay`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    if (remainingSeconds === 0) {
      return `${minutes} phut`;
    }
    return `${minutes} phut ${remainingSeconds} giay`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} gio`;
  }
  return `${hours} gio ${remainingMinutes} phut`;
}
