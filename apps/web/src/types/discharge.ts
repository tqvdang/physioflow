/**
 * Discharge planning type definitions for PhysioFlow
 */

import { BaseEntity } from "./index";

/**
 * Discharge plan status
 */
export type DischargePlanStatus = "draft" | "pending" | "completed" | "cancelled";

/**
 * Outcome measure comparison between baseline and discharge
 */
export interface OutcomeComparison {
  measure: string;
  measureVi: string;
  baseline: number;
  discharge: number;
  change: number;
  percentImprovement: number;
  mcidThreshold: number;
  metMCID: boolean;
  higherIsBetter: boolean;
}

/**
 * Home exercise program exercise entry
 */
export interface HEPExercise {
  id: string;
  exerciseId: string;
  nameEn: string;
  nameVi: string;
  sets: number;
  reps: number;
  duration?: string;
  frequency: string;
  instructions?: string;
  instructionsVi?: string;
}

/**
 * Follow-up recommendation
 */
export interface FollowUpRecommendation {
  id: string;
  type: "appointment" | "referral" | "test" | "other";
  description: string;
  descriptionVi: string;
  timeframe?: string;
}

/**
 * Discharge plan entity
 */
export interface DischargePlan extends BaseEntity {
  patientId: string;
  therapistId: string;
  therapistName: string;
  status: DischargePlanStatus;
  plannedDate: string;
  actualDate?: string;
  diagnosis: string;
  diagnosisVi: string;
  treatmentSummary: string;
  treatmentSummaryVi: string;
  totalSessions: number;
  outcomeComparisons: OutcomeComparison[];
  functionalStatus: string;
  functionalStatusVi: string;
  hepExercises: HEPExercise[];
  recommendations: string;
  recommendationsVi: string;
  followUpPlan: FollowUpRecommendation[];
}

/**
 * Create discharge plan request
 */
export interface CreateDischargePlanRequest {
  patientId: string;
  plannedDate: string;
  diagnosis?: string;
  diagnosisVi?: string;
  treatmentSummary?: string;
  treatmentSummaryVi?: string;
  recommendations?: string;
  recommendationsVi?: string;
  functionalStatus?: string;
  functionalStatusVi?: string;
  followUpPlan?: Omit<FollowUpRecommendation, "id">[];
}

/**
 * Discharge summary entity (generated document)
 */
export interface DischargeSummary extends BaseEntity {
  dischargePlanId: string;
  patientId: string;
  patientName: string;
  patientNameVi: string;
  patientDob: string;
  patientMrn: string;
  therapistName: string;
  diagnosis: string;
  diagnosisVi: string;
  treatmentSummary: string;
  treatmentSummaryVi: string;
  totalSessions: number;
  dateRange: string;
  outcomeComparisons: OutcomeComparison[];
  functionalStatus: string;
  functionalStatusVi: string;
  hepExercises: HEPExercise[];
  recommendations: string;
  recommendationsVi: string;
  followUpPlan: FollowUpRecommendation[];
  generatedAt: string;
}

/**
 * API types (snake_case from backend)
 */
export interface ApiDischargePlan {
  id: string;
  patient_id: string;
  therapist_id: string;
  therapist_name: string;
  status: DischargePlanStatus;
  planned_date: string;
  actual_date?: string;
  diagnosis: string;
  diagnosis_vi: string;
  treatment_summary: string;
  treatment_summary_vi: string;
  total_sessions: number;
  outcome_comparisons: Array<{
    measure: string;
    measure_vi: string;
    baseline: number;
    discharge: number;
    change: number;
    percent_improvement: number;
    mcid_threshold: number;
    met_mcid: boolean;
    higher_is_better: boolean;
  }>;
  functional_status: string;
  functional_status_vi: string;
  hep_exercises: Array<{
    id: string;
    exercise_id: string;
    name_en: string;
    name_vi: string;
    sets: number;
    reps: number;
    duration?: string;
    frequency: string;
    instructions?: string;
    instructions_vi?: string;
  }>;
  recommendations: string;
  recommendations_vi: string;
  follow_up_plan: Array<{
    id: string;
    type: "appointment" | "referral" | "test" | "other";
    description: string;
    description_vi: string;
    timeframe?: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface ApiDischargeSummary {
  id: string;
  discharge_plan_id: string;
  patient_id: string;
  patient_name: string;
  patient_name_vi: string;
  patient_dob: string;
  patient_mrn: string;
  therapist_name: string;
  diagnosis: string;
  diagnosis_vi: string;
  treatment_summary: string;
  treatment_summary_vi: string;
  total_sessions: number;
  date_range: string;
  outcome_comparisons: ApiDischargePlan["outcome_comparisons"];
  functional_status: string;
  functional_status_vi: string;
  hep_exercises: ApiDischargePlan["hep_exercises"];
  recommendations: string;
  recommendations_vi: string;
  follow_up_plan: ApiDischargePlan["follow_up_plan"];
  generated_at: string;
  created_at: string;
  updated_at: string;
}
