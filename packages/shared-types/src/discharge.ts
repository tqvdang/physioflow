/**
 * Discharge Planning types for PhysioFlow EMR
 */

import type { MeasureType } from './outcome-measures';

// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

export interface BaselineComparison {
  measure: MeasureType;
  baseline: number;
  discharge: number;
  change: number;
  percentImprovement: number;
}

export interface HEPExercise {
  name: string;
  nameVi?: string;
  instructions?: string;
  instructionsVi?: string;
  sets?: number;
  reps?: number;
  frequency: string;
  videoUrl?: string;
}

export interface DischargePlan {
  id: string;
  patientId: string;
  clinicId: string;
  therapistId: string;
  plannedDate: string;
  baselineComparison: BaselineComparison[];
  outcomeTrending: Record<string, unknown>;
  hepExercises: HEPExercise[];
  recommendations?: string;
  recommendationsVi?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface FinalScore {
  measure: MeasureType;
  score: number;
  interpretation?: string;
  interpretationVi?: string;
}

export interface DischargeSummary {
  id: string;
  patientId: string;
  clinicId: string;
  therapistId: string;
  dischargePlanId?: string;
  dischargeDate: string;
  summaryText: string;
  summaryTextVi?: string;
  finalScores: FinalScore[];
  improvementPercent: number;
  followUpRecommendations?: string;
  followUpRecommendationsVi?: string;
  totalSessionsCompleted: number;
  therapistSignatureAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// -----------------------------------------------------------------------------
// Request Types
// -----------------------------------------------------------------------------

export interface CreateDischargePlanRequest {
  patientId: string;
  clinicId: string;
  therapistId: string;
  plannedDate: string;
  baselineComparison?: BaselineComparison[];
  hepExercises?: HEPExercise[];
  recommendations?: string;
  recommendationsVi?: string;
}

export interface UpdateDischargePlanRequest {
  plannedDate?: string;
  baselineComparison?: BaselineComparison[];
  outcomeTrending?: Record<string, unknown>;
  hepExercises?: HEPExercise[];
  recommendations?: string;
  recommendationsVi?: string;
}

export interface CreateDischargeSummaryRequest {
  patientId: string;
  clinicId: string;
  therapistId: string;
  dischargePlanId?: string;
  dischargeDate: string;
  summaryText: string;
  summaryTextVi?: string;
  finalScores?: FinalScore[];
  improvementPercent?: number;
  followUpRecommendations?: string;
  followUpRecommendationsVi?: string;
  totalSessionsCompleted?: number;
}

export interface UpdateDischargeSummaryRequest {
  summaryText?: string;
  summaryTextVi?: string;
  finalScores?: FinalScore[];
  improvementPercent?: number;
  followUpRecommendations?: string;
  followUpRecommendationsVi?: string;
}
