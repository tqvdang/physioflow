"use client";

/**
 * React Query hooks for Re-evaluation assessment data management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Types matching the API response (snake_case)
interface ApiReevaluationAssessment {
  id: string;
  patient_id: string;
  visit_id?: string;
  clinic_id: string;
  baseline_assessment_id?: string;
  assessment_type: string;
  measure_label: string;
  current_value: number;
  baseline_value: number;
  change: number;
  change_percentage?: number;
  higher_is_better: boolean;
  mcid_threshold?: number;
  mcid_achieved: boolean;
  interpretation: string;
  therapist_id: string;
  notes?: string;
  assessed_at: string;
  created_at: string;
  updated_at: string;
}

interface ApiReevaluationSummary {
  patient_id: string;
  visit_id?: string;
  therapist_id: string;
  assessed_at: string;
  comparisons: ApiReevaluationAssessment[];
  total_items: number;
  improved: number;
  declined: number;
  stable: number;
  mcid_achieved: number;
}

// Frontend types (camelCase)
export type AssessmentType = "rom" | "mmt" | "outcome_measure";
export type InterpretationResult = "improved" | "declined" | "stable";

export interface ReevaluationAssessment {
  id: string;
  patientId: string;
  visitId?: string;
  clinicId: string;
  baselineAssessmentId?: string;
  assessmentType: AssessmentType;
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

export interface CreateReevaluationItemRequest {
  assessmentType: AssessmentType;
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

// Transform API response to frontend type
function transformAssessment(
  a: ApiReevaluationAssessment
): ReevaluationAssessment {
  return {
    id: a.id,
    patientId: a.patient_id,
    visitId: a.visit_id,
    clinicId: a.clinic_id,
    baselineAssessmentId: a.baseline_assessment_id,
    assessmentType: a.assessment_type as AssessmentType,
    measureLabel: a.measure_label,
    currentValue: a.current_value,
    baselineValue: a.baseline_value,
    change: a.change,
    changePercentage: a.change_percentage,
    higherIsBetter: a.higher_is_better,
    mcidThreshold: a.mcid_threshold,
    mcidAchieved: a.mcid_achieved,
    interpretation: a.interpretation as InterpretationResult,
    therapistId: a.therapist_id,
    notes: a.notes,
    assessedAt: a.assessed_at,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  };
}

function transformSummary(s: ApiReevaluationSummary): ReevaluationSummary {
  return {
    patientId: s.patient_id,
    visitId: s.visit_id,
    therapistId: s.therapist_id,
    assessedAt: s.assessed_at,
    comparisons: (s.comparisons || []).map(transformAssessment),
    totalItems: s.total_items,
    improved: s.improved,
    declined: s.declined,
    stable: s.stable,
    mcidAchieved: s.mcid_achieved,
  };
}

// Query keys
export const reevaluationKeys = {
  all: ["reevaluations"] as const,
  patient: (patientId: string) =>
    [...reevaluationKeys.all, "patient", patientId] as const,
  patientHistory: (patientId: string) =>
    [...reevaluationKeys.patient(patientId), "history"] as const,
  comparison: (id: string) =>
    [...reevaluationKeys.all, "comparison", id] as const,
};

/**
 * Hook to create a new re-evaluation with baseline comparison
 */
export function useCreateReevaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateReevaluationRequest) => {
      const response = await api.post<ApiReevaluationSummary>(
        `/v1/assessments/reevaluation`,
        {
          patient_id: data.patientId,
          visit_id: data.visitId,
          baseline_assessment_id: data.baselineAssessmentId,
          assessments: data.assessments.map((a) => ({
            assessment_type: a.assessmentType,
            measure_label: a.measureLabel,
            current_value: a.currentValue,
            baseline_value: a.baselineValue,
            higher_is_better: a.higherIsBetter,
            mcid_threshold: a.mcidThreshold,
          })),
          notes: data.notes,
          assessed_at: data.assessedAt,
        }
      );
      return transformSummary(response.data);
    },
    onSuccess: (summary) => {
      queryClient.invalidateQueries({
        queryKey: reevaluationKeys.patient(summary.patientId),
      });
    },
  });
}

/**
 * Hook to fetch re-evaluation history for a patient
 */
export function useReevaluationHistory(patientId: string, enabled = true) {
  return useQuery({
    queryKey: reevaluationKeys.patientHistory(patientId),
    queryFn: async () => {
      const response = await api.get<ApiReevaluationAssessment[]>(
        `/v1/assessments/reevaluation/patient/${patientId}`
      );
      const data = Array.isArray(response.data) ? response.data : [];
      return data.map(transformAssessment);
    },
    enabled: enabled && !!patientId,
  });
}

/**
 * Hook to fetch detailed comparison data for a specific re-evaluation
 */
export function useComparison(id: string, enabled = true) {
  return useQuery({
    queryKey: reevaluationKeys.comparison(id),
    queryFn: async () => {
      const response = await api.get<ApiReevaluationAssessment[]>(
        `/v1/assessments/reevaluation/${id}/comparison`
      );
      const data = Array.isArray(response.data) ? response.data : [];
      return data.map(transformAssessment);
    },
    enabled: enabled && !!id,
  });
}
