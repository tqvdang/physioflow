/**
 * Pain Location types for anatomy visualization
 *
 * Used by the interactive body diagram to mark pain locations
 * with severity ratings and descriptions.
 */

// -----------------------------------------------------------------------------
// Anatomy Region IDs
// -----------------------------------------------------------------------------

/**
 * All clickable anatomy regions available on the body diagrams.
 * Front view regions include anterior body parts.
 * Back view regions include posterior body parts.
 */
export type AnatomyRegionId =
  // Head & Neck
  | 'head'
  | 'neck_front'
  | 'neck_back'
  // Shoulders
  | 'shoulder_left'
  | 'shoulder_right'
  // Upper Arms
  | 'upper_arm_left_front'
  | 'upper_arm_right_front'
  | 'upper_arm_left_back'
  | 'upper_arm_right_back'
  // Elbows
  | 'elbow_left'
  | 'elbow_right'
  // Forearms
  | 'forearm_left'
  | 'forearm_right'
  // Wrists & Hands
  | 'wrist_hand_left'
  | 'wrist_hand_right'
  // Chest & Trunk
  | 'chest_left'
  | 'chest_right'
  | 'abdomen_upper'
  | 'abdomen_lower'
  // Spine
  | 'cervical_spine'
  | 'thoracic_spine_upper'
  | 'thoracic_spine_lower'
  | 'lumbar_spine'
  | 'sacrum'
  // Hips & Pelvis
  | 'hip_left'
  | 'hip_right'
  | 'groin_left'
  | 'groin_right'
  | 'gluteal_left'
  | 'gluteal_right'
  // Thighs
  | 'thigh_left_front'
  | 'thigh_right_front'
  | 'thigh_left_back'
  | 'thigh_right_back'
  // Knees
  | 'knee_left'
  | 'knee_right'
  | 'knee_left_back'
  | 'knee_right_back'
  // Lower Legs
  | 'lower_leg_left_front'
  | 'lower_leg_right_front'
  | 'calf_left'
  | 'calf_right'
  // Ankles & Feet
  | 'ankle_left'
  | 'ankle_right'
  | 'foot_left'
  | 'foot_right';

// -----------------------------------------------------------------------------
// Pain Location Types
// -----------------------------------------------------------------------------

/**
 * A single pain location marked on the anatomy diagram.
 * Named AnatomyPainLocation to avoid conflict with the clinical PainLocation
 * in clinical.ts which has a different, more detailed structure.
 */
export interface AnatomyPainLocation {
  /** Anatomy region identifier */
  id: AnatomyRegionId;
  /** Pain severity 0-10 (VAS scale) */
  severity: number;
  /** Optional description of the pain */
  description?: string;
}

/**
 * Collection of pain locations for a visit.
 * Stored as JSONB in the database.
 */
export interface PainLocationData {
  regions: AnatomyPainLocation[];
}

// -----------------------------------------------------------------------------
// Diagram View Types
// -----------------------------------------------------------------------------

/** Which side of the body diagram to display */
export type AnatomyView = 'front' | 'back';

/**
 * Metadata for an anatomy region used for rendering.
 */
export interface AnatomyRegionMeta {
  id: AnatomyRegionId;
  /** English label */
  label: string;
  /** Vietnamese label */
  labelVi: string;
  /** Which diagram view this region appears on */
  view: AnatomyView;
}

/**
 * Complete registry of all anatomy regions with metadata.
 */
export const ANATOMY_REGIONS: AnatomyRegionMeta[] = [
  // Front view regions
  { id: 'head', label: 'Head', labelVi: 'Dau', view: 'front' },
  { id: 'neck_front', label: 'Neck (Front)', labelVi: 'Co (truoc)', view: 'front' },
  { id: 'shoulder_left', label: 'Left Shoulder', labelVi: 'Vai trai', view: 'front' },
  { id: 'shoulder_right', label: 'Right Shoulder', labelVi: 'Vai phai', view: 'front' },
  { id: 'upper_arm_left_front', label: 'Left Upper Arm', labelVi: 'Canh tay trai', view: 'front' },
  { id: 'upper_arm_right_front', label: 'Right Upper Arm', labelVi: 'Canh tay phai', view: 'front' },
  { id: 'elbow_left', label: 'Left Elbow', labelVi: 'Khuyu tay trai', view: 'front' },
  { id: 'elbow_right', label: 'Right Elbow', labelVi: 'Khuyu tay phai', view: 'front' },
  { id: 'forearm_left', label: 'Left Forearm', labelVi: 'Cang tay trai', view: 'front' },
  { id: 'forearm_right', label: 'Right Forearm', labelVi: 'Cang tay phai', view: 'front' },
  { id: 'wrist_hand_left', label: 'Left Wrist/Hand', labelVi: 'Co tay/Ban tay trai', view: 'front' },
  { id: 'wrist_hand_right', label: 'Right Wrist/Hand', labelVi: 'Co tay/Ban tay phai', view: 'front' },
  { id: 'chest_left', label: 'Left Chest', labelVi: 'Nguc trai', view: 'front' },
  { id: 'chest_right', label: 'Right Chest', labelVi: 'Nguc phai', view: 'front' },
  { id: 'abdomen_upper', label: 'Upper Abdomen', labelVi: 'Bung tren', view: 'front' },
  { id: 'abdomen_lower', label: 'Lower Abdomen', labelVi: 'Bung duoi', view: 'front' },
  { id: 'hip_left', label: 'Left Hip', labelVi: 'Hong trai', view: 'front' },
  { id: 'hip_right', label: 'Right Hip', labelVi: 'Hong phai', view: 'front' },
  { id: 'groin_left', label: 'Left Groin', labelVi: 'Ben trai', view: 'front' },
  { id: 'groin_right', label: 'Right Groin', labelVi: 'Ben phai', view: 'front' },
  { id: 'thigh_left_front', label: 'Left Thigh (Front)', labelVi: 'Dui trai (truoc)', view: 'front' },
  { id: 'thigh_right_front', label: 'Right Thigh (Front)', labelVi: 'Dui phai (truoc)', view: 'front' },
  { id: 'knee_left', label: 'Left Knee', labelVi: 'Goi trai', view: 'front' },
  { id: 'knee_right', label: 'Right Knee', labelVi: 'Goi phai', view: 'front' },
  { id: 'lower_leg_left_front', label: 'Left Shin', labelVi: 'Cang chan trai', view: 'front' },
  { id: 'lower_leg_right_front', label: 'Right Shin', labelVi: 'Cang chan phai', view: 'front' },
  { id: 'ankle_left', label: 'Left Ankle', labelVi: 'Co chan trai', view: 'front' },
  { id: 'ankle_right', label: 'Right Ankle', labelVi: 'Co chan phai', view: 'front' },
  { id: 'foot_left', label: 'Left Foot', labelVi: 'Ban chan trai', view: 'front' },
  { id: 'foot_right', label: 'Right Foot', labelVi: 'Ban chan phai', view: 'front' },
  // Back view regions
  { id: 'neck_back', label: 'Neck (Back)', labelVi: 'Co (sau)', view: 'back' },
  { id: 'cervical_spine', label: 'Cervical Spine', labelVi: 'Cot song co', view: 'back' },
  { id: 'thoracic_spine_upper', label: 'Upper Back', labelVi: 'Lung tren', view: 'back' },
  { id: 'thoracic_spine_lower', label: 'Mid Back', labelVi: 'Lung giua', view: 'back' },
  { id: 'lumbar_spine', label: 'Lower Back', labelVi: 'That lung', view: 'back' },
  { id: 'sacrum', label: 'Sacrum', labelVi: 'Xuong cung', view: 'back' },
  { id: 'upper_arm_left_back', label: 'Left Tricep', labelVi: 'Co tam dau trai', view: 'back' },
  { id: 'upper_arm_right_back', label: 'Right Tricep', labelVi: 'Co tam dau phai', view: 'back' },
  { id: 'gluteal_left', label: 'Left Gluteal', labelVi: 'Mong trai', view: 'back' },
  { id: 'gluteal_right', label: 'Right Gluteal', labelVi: 'Mong phai', view: 'back' },
  { id: 'thigh_left_back', label: 'Left Hamstring', labelVi: 'Dui trai (sau)', view: 'back' },
  { id: 'thigh_right_back', label: 'Right Hamstring', labelVi: 'Dui phai (sau)', view: 'back' },
  { id: 'knee_left_back', label: 'Left Knee (Back)', labelVi: 'Goi trai (sau)', view: 'back' },
  { id: 'knee_right_back', label: 'Right Knee (Back)', labelVi: 'Goi phai (sau)', view: 'back' },
  { id: 'calf_left', label: 'Left Calf', labelVi: 'Bap chan trai', view: 'back' },
  { id: 'calf_right', label: 'Right Calf', labelVi: 'Bap chan phai', view: 'back' },
];

/**
 * Get severity color for rendering on the diagram.
 * Returns a CSS color string based on severity level.
 */
export function getSeverityColor(severity: number): string {
  if (severity <= 0) return 'transparent';
  if (severity <= 2) return 'rgba(255, 235, 59, 0.6)';  // Yellow - mild
  if (severity <= 4) return 'rgba(255, 152, 0, 0.6)';   // Orange - moderate
  if (severity <= 6) return 'rgba(255, 87, 34, 0.6)';   // Deep orange
  if (severity <= 8) return 'rgba(244, 67, 54, 0.6)';   // Red - severe
  return 'rgba(183, 28, 28, 0.7)';                       // Dark red - extreme
}

/**
 * Get severity label for display.
 */
export function getSeverityLabel(severity: number): string {
  if (severity <= 0) return 'None';
  if (severity <= 2) return 'Mild';
  if (severity <= 4) return 'Moderate';
  if (severity <= 6) return 'Moderate-Severe';
  if (severity <= 8) return 'Severe';
  return 'Extreme';
}

/**
 * Get Vietnamese severity label for display.
 */
export function getSeverityLabelVi(severity: number): string {
  if (severity <= 0) return 'Khong dau';
  if (severity <= 2) return 'Nhe';
  if (severity <= 4) return 'Trung binh';
  if (severity <= 6) return 'Trung binh - Nang';
  if (severity <= 8) return 'Nang';
  return 'Rat nang';
}
