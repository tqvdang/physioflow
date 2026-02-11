/**
 * Protocol-related type definitions for PhysioFlow
 * Matches the clinical_protocols and patient_protocols DB schema
 */

import { BaseEntity } from "./index";

/**
 * Protocol status enum matching DB protocol_status
 */
export type ProtocolStatus =
  | "draft"
  | "active"
  | "completed"
  | "on_hold"
  | "discontinued";

/**
 * Protocol phase
 */
export type ProtocolPhase = "initial" | "intermediate" | "advanced";

/**
 * Goal type
 */
export type GoalType = "short_term" | "long_term";

/**
 * Protocol goal
 */
export interface ProtocolGoal {
  type: GoalType;
  description: string;
  descriptionVi: string;
  measurableCriteria: string;
  targetTimeframeWeeks: number;
}

/**
 * Protocol exercise
 */
export interface ProtocolExercise {
  name: string;
  nameVi: string;
  description: string;
  descriptionVi: string;
  sets: number;
  reps: number;
  durationSeconds: number | null;
  frequencyPerDay: number;
  phase: ProtocolPhase;
  precautions: string[];
}

/**
 * Phase transition criteria
 */
export interface PhaseTransition {
  fromPhase: string;
  toPhase: string;
  criteria: string;
  criteriaVi: string;
  typicalWeek: number;
}

/**
 * Progression criteria
 */
export interface ProgressionCriteria {
  phaseTransitions: PhaseTransition[];
  dischargeCriteria: string;
  dischargeCriteriaVi: string;
}

/**
 * Clinical protocol template
 */
export interface ClinicalProtocol extends BaseEntity {
  clinicId?: string;
  protocolName: string;
  protocolNameVi: string;
  description: string;
  descriptionVi: string;
  goals: ProtocolGoal[];
  exercises: ProtocolExercise[];
  frequencyPerWeek: number;
  durationWeeks: number;
  sessionDurationMinutes: number;
  progressionCriteria: ProgressionCriteria;
  category: string;
  applicableDiagnoses: string[];
  bodyRegions: string[];
  isActive: boolean;
  version: number;
}

/**
 * Progress note for patient protocol
 */
export interface ProtocolProgressNote {
  date: string;
  note: string;
  noteVi?: string;
  phase: string;
  therapistId: string;
}

/**
 * Patient protocol assignment (instance)
 */
export interface PatientProtocol extends BaseEntity {
  patientId: string;
  protocolId: string;
  therapistId: string;
  clinicId: string;
  treatmentPlanId?: string;
  assignedDate: string;
  startDate?: string;
  targetEndDate?: string;
  actualEndDate?: string;
  progressStatus: ProtocolStatus;
  currentPhase: string;
  sessionsCompleted: number;
  customGoals?: ProtocolGoal[];
  customExercises?: ProtocolExercise[];
  customFrequencyPerWeek?: number;
  customDurationWeeks?: number;
  progressNotes: ProtocolProgressNote[];
  version: number;
  protocol?: ClinicalProtocol;
}

/**
 * API clinical protocol (snake_case from backend)
 */
export interface ApiClinicalProtocol {
  id: string;
  clinic_id?: string;
  protocol_name: string;
  protocol_name_vi: string;
  description: string;
  description_vi: string;
  goals: Array<{
    type: GoalType;
    description: string;
    description_vi: string;
    measurable_criteria: string;
    target_timeframe_weeks: number;
  }>;
  exercises: Array<{
    name: string;
    name_vi: string;
    description: string;
    description_vi: string;
    sets: number;
    reps: number;
    duration_seconds: number | null;
    frequency_per_day: number;
    phase: ProtocolPhase;
    precautions: string[];
  }>;
  frequency_per_week: number;
  duration_weeks: number;
  session_duration_minutes: number;
  progression_criteria: {
    phase_transitions: Array<{
      from_phase: string;
      to_phase: string;
      criteria: string;
      criteria_vi: string;
      typical_week: number;
    }>;
    discharge_criteria: string;
    discharge_criteria_vi: string;
  };
  category: string;
  applicable_diagnoses: string[];
  body_regions: string[];
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

/**
 * API patient protocol (snake_case from backend)
 */
export interface ApiPatientProtocol {
  id: string;
  patient_id: string;
  protocol_id: string;
  therapist_id: string;
  clinic_id: string;
  treatment_plan_id?: string;
  assigned_date: string;
  start_date?: string;
  target_end_date?: string;
  actual_end_date?: string;
  progress_status: ProtocolStatus;
  current_phase: string;
  sessions_completed: number;
  custom_goals?: ApiClinicalProtocol["goals"];
  custom_exercises?: ApiClinicalProtocol["exercises"];
  custom_frequency_per_week?: number;
  custom_duration_weeks?: number;
  progress_notes: Array<{
    date: string;
    note: string;
    note_vi?: string;
    phase: string;
    therapist_id: string;
  }>;
  version: number;
  created_at: string;
  updated_at: string;
  protocol?: ApiClinicalProtocol;
}

/**
 * Assign protocol request
 */
export interface AssignProtocolRequest {
  protocolId: string;
  startDate?: string;
  customFrequencyPerWeek?: number;
  customDurationWeeks?: number;
  notes?: string;
}

/**
 * Update progress request
 */
export interface UpdateProgressRequest {
  progressStatus?: ProtocolStatus;
  currentPhase?: string;
  sessionsCompleted?: number;
  note?: string;
  noteVi?: string;
}

/**
 * Protocol search/list parameters
 */
export interface ProtocolListParams {
  page?: number;
  perPage?: number;
  search?: string;
  category?: string;
  bodyRegion?: string;
  isActive?: boolean;
}

/**
 * Protocol category display info
 */
export const PROTOCOL_CATEGORY_INFO: Record<
  string,
  { label: string; labelVi: string; color: string }
> = {
  musculoskeletal: {
    label: "Musculoskeletal",
    labelVi: "C\u01a1 x\u01b0\u01a1ng kh\u1edbp",
    color: "bg-blue-100 text-blue-800",
  },
  neurological: {
    label: "Neurological",
    labelVi: "Th\u1ea7n kinh",
    color: "bg-purple-100 text-purple-800",
  },
  pediatric: {
    label: "Pediatric",
    labelVi: "Nhi khoa",
    color: "bg-green-100 text-green-800",
  },
  cardiopulmonary: {
    label: "Cardiopulmonary",
    labelVi: "Tim ph\u1ed5i",
    color: "bg-red-100 text-red-800",
  },
  geriatric: {
    label: "Geriatric",
    labelVi: "L\u00e3o khoa",
    color: "bg-orange-100 text-orange-800",
  },
};
