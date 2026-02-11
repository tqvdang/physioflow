/**
 * Re-evaluation Assessment types for PhysioFlow EMR
 *
 * Re-evaluations compare current assessment values to baseline (initial assessment)
 * values, tracking improvements and declines for ROM, MMT, and outcome measures.
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export type ReevaluationMeasureType = 'rom' | 'mmt' | 'outcome_measure';

export type InterpretationResult = 'improved' | 'declined' | 'stable';

// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

export interface ReevaluationAssessment {
  id: string;
  patientId: string;
  visitId?: string;
  clinicId: string;
  baselineAssessmentId?: string;
  assessmentType: ReevaluationMeasureType;
  measureLabel: string;
  currentValue: number;
  baselineValue: number;
  change: number;
  changePercentage?: number;
  higherIsBetter: boolean;
  mcidThreshold?: number;
  mcidAchieved: boolean;
  interpretation: InterpretationResult;
  therapistId: string;
  notes?: string;
  assessedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComparisonResult {
  measureLabel: string;
  assessmentType: ReevaluationMeasureType;
  baselineValue: number;
  currentValue: number;
  change: number;
  changePercentage?: number;
  higherIsBetter: boolean;
  mcidThreshold?: number;
  mcidAchieved: boolean;
  interpretation: InterpretationResult;
}

export interface ReevaluationSummary {
  patientId: string;
  visitId?: string;
  therapistId: string;
  assessedAt: string;
  comparisons: ReevaluationAssessment[];
  totalItems: number;
  improved: number;
  declined: number;
  stable: number;
  mcidAchieved: number;
}

// -----------------------------------------------------------------------------
// Request Types
// -----------------------------------------------------------------------------

export interface CreateReevaluationItemRequest {
  assessmentType: ReevaluationMeasureType;
  measureLabel: string;
  currentValue: number;
  baselineValue: number;
  higherIsBetter: boolean;
  mcidThreshold?: number;
}

export interface CreateReevaluationRequest {
  patientId: string;
  visitId?: string;
  baselineAssessmentId?: string;
  assessments: CreateReevaluationItemRequest[];
  notes?: string;
  assessedAt?: string;
}

// -----------------------------------------------------------------------------
// Zod Schemas
// -----------------------------------------------------------------------------

export const ReevaluationMeasureTypeSchema = z.enum(['rom', 'mmt', 'outcome_measure']);

export const InterpretationResultSchema = z.enum(['improved', 'declined', 'stable']);

export const CreateReevaluationItemSchema = z.object({
  assessmentType: ReevaluationMeasureTypeSchema,
  measureLabel: z.string().min(1).max(120),
  currentValue: z.number(),
  baselineValue: z.number(),
  higherIsBetter: z.boolean(),
  mcidThreshold: z.number().positive().optional(),
});

export const CreateReevaluationSchema = z.object({
  patientId: z.string().uuid(),
  visitId: z.string().uuid().optional(),
  baselineAssessmentId: z.string().uuid().optional(),
  assessments: z.array(CreateReevaluationItemSchema).min(1),
  notes: z.string().max(2000).optional(),
  assessedAt: z.string().datetime().optional(),
});

export const ReevaluationAssessmentSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  visitId: z.string().uuid().optional(),
  clinicId: z.string().uuid(),
  baselineAssessmentId: z.string().uuid().optional(),
  assessmentType: ReevaluationMeasureTypeSchema,
  measureLabel: z.string(),
  currentValue: z.number(),
  baselineValue: z.number(),
  change: z.number(),
  changePercentage: z.number().optional(),
  higherIsBetter: z.boolean(),
  mcidThreshold: z.number().optional(),
  mcidAchieved: z.boolean(),
  interpretation: InterpretationResultSchema,
  therapistId: z.string().uuid(),
  notes: z.string().optional(),
  assessedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// -----------------------------------------------------------------------------
// Utility: Interpretation logic (mirrors Go implementation)
// -----------------------------------------------------------------------------

/**
 * Calculate the change and percentage between baseline and current values.
 */
export function calculateChange(
  baseline: number,
  current: number
): { change: number; changePercentage?: number } {
  const change = current - baseline;
  let changePercentage: number | undefined;
  if (Math.abs(baseline) > 0.0001) {
    changePercentage = (change / Math.abs(baseline)) * 100;
  }
  return { change, changePercentage };
}

/**
 * Determine clinical interpretation of change relative to MCID.
 */
export function determineInterpretation(
  change: number,
  mcidThreshold: number | undefined,
  higherIsBetter: boolean
): { interpretation: InterpretationResult; mcidAchieved: boolean } {
  const threshold = mcidThreshold && mcidThreshold > 0 ? mcidThreshold : 0;
  const absChange = Math.abs(change);

  // If there is a meaningful MCID and the change does not exceed it, consider stable
  if (threshold > 0 && absChange < threshold) {
    return { interpretation: 'stable', mcidAchieved: false };
  }

  // If there is no MCID but the change is essentially zero, consider stable
  if (threshold === 0 && absChange < 0.0001) {
    return { interpretation: 'stable', mcidAchieved: false };
  }

  const mcidAchieved = threshold > 0 && absChange >= threshold;

  if (higherIsBetter) {
    return {
      interpretation: change > 0 ? 'improved' : 'declined',
      mcidAchieved,
    };
  }

  // For pain scales where lower is better
  return {
    interpretation: change < 0 ? 'improved' : 'declined',
    mcidAchieved,
  };
}
