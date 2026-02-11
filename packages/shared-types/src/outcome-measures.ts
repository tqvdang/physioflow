/**
 * Outcome Measures types for PhysioFlow EMR
 *
 * Note: The simple OutcomeMeasure interface (score + date) lives in clinical.ts.
 * This module provides the full outcome measurement tracking system.
 */

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export type MeasureType =
  | 'VAS'        // Visual Analog Scale
  | 'NDI'        // Neck Disability Index
  | 'ODI'        // Oswestry Disability Index
  | 'LEFS'       // Lower Extremity Functional Scale
  | 'DASH'       // Disabilities of the Arm, Shoulder and Hand
  | 'QuickDASH'  // Quick DASH
  | 'PSFS'       // Patient-Specific Functional Scale
  | 'FIM';       // Functional Independence Measure

export type MeasurementPhase =
  | 'baseline'
  | 'interim'
  | 'discharge';

// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

export interface OutcomeMeasureRecord {
  id: string;
  patientId: string;
  measureType: MeasureType;
  baselineScore: number;
  currentScore: number;
  targetScore: number;
  measurementDate: string;
  mcidThreshold: number;
  phase: MeasurementPhase;
  notes?: string;
  notesVi?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface ProgressCalculation {
  progressPercent: number;
  changeFromBaseline: number;
  metMCID: boolean;
}

export interface OutcomeMeasureLibrary {
  measureType: MeasureType;
  measureTypeVi: string;
  description: string;
  descriptionVi: string;
  scoreRange: ScoreRange;
  mcidValue: number;
}

export interface ScoreRange {
  min: number;
  max: number;
  higherIsBetter: boolean;
}

export interface TrendingData {
  dates: string[];
  scores: number[];
  phases: MeasurementPhase[];
}

// -----------------------------------------------------------------------------
// Request Types
// -----------------------------------------------------------------------------

export interface CreateOutcomeMeasureRequest {
  patientId: string;
  measureType: MeasureType;
  baselineScore: number;
  currentScore: number;
  targetScore: number;
  measurementDate: string;
  mcidThreshold: number;
  phase?: MeasurementPhase;
  notes?: string;
  notesVi?: string;
}

export interface UpdateOutcomeMeasureRequest {
  currentScore?: number;
  targetScore?: number;
  measurementDate?: string;
  mcidThreshold?: number;
  phase?: MeasurementPhase;
  notes?: string;
  notesVi?: string;
}

// -----------------------------------------------------------------------------
// Query Types
// -----------------------------------------------------------------------------

export interface OutcomeMeasureSearchParams {
  patientId: string;
  measureType?: MeasureType;
  phase?: MeasurementPhase;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}
