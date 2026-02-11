"use client";

/**
 * React Query hooks for discharge planning management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  DischargePlan,
  DischargeSummary,
  CreateDischargePlanRequest,
  ApiDischargePlan,
  ApiDischargeSummary,
  OutcomeComparison,
  HEPExercise,
  FollowUpRecommendation,
} from "@/types/discharge";

/**
 * Transform API outcome comparisons to frontend format
 */
function transformOutcomeComparisons(
  items: ApiDischargePlan["outcome_comparisons"]
): OutcomeComparison[] {
  return (items ?? []).map((item) => ({
    measure: item.measure,
    measureVi: item.measure_vi,
    baseline: item.baseline,
    discharge: item.discharge,
    change: item.change,
    percentImprovement: item.percent_improvement,
    mcidThreshold: item.mcid_threshold,
    metMCID: item.met_mcid,
    higherIsBetter: item.higher_is_better,
  }));
}

/**
 * Transform API HEP exercises to frontend format
 */
function transformHEPExercises(
  items: ApiDischargePlan["hep_exercises"]
): HEPExercise[] {
  return (items ?? []).map((item) => ({
    id: item.id,
    exerciseId: item.exercise_id,
    nameEn: item.name_en,
    nameVi: item.name_vi,
    sets: item.sets,
    reps: item.reps,
    duration: item.duration,
    frequency: item.frequency,
    instructions: item.instructions,
    instructionsVi: item.instructions_vi,
  }));
}

/**
 * Transform API follow-up plan to frontend format
 */
function transformFollowUpPlan(
  items: ApiDischargePlan["follow_up_plan"]
): FollowUpRecommendation[] {
  return (items ?? []).map((item) => ({
    id: item.id,
    type: item.type,
    description: item.description,
    descriptionVi: item.description_vi,
    timeframe: item.timeframe,
  }));
}

/**
 * Transform API discharge plan to frontend type
 */
function transformDischargePlan(data: ApiDischargePlan): DischargePlan {
  return {
    id: data.id,
    patientId: data.patient_id,
    therapistId: data.therapist_id,
    therapistName: data.therapist_name,
    status: data.status,
    plannedDate: data.planned_date,
    actualDate: data.actual_date,
    diagnosis: data.diagnosis,
    diagnosisVi: data.diagnosis_vi,
    treatmentSummary: data.treatment_summary,
    treatmentSummaryVi: data.treatment_summary_vi,
    totalSessions: data.total_sessions,
    outcomeComparisons: transformOutcomeComparisons(data.outcome_comparisons),
    functionalStatus: data.functional_status,
    functionalStatusVi: data.functional_status_vi,
    hepExercises: transformHEPExercises(data.hep_exercises),
    recommendations: data.recommendations,
    recommendationsVi: data.recommendations_vi,
    followUpPlan: transformFollowUpPlan(data.follow_up_plan),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Transform API discharge summary to frontend type
 */
function transformDischargeSummary(data: ApiDischargeSummary): DischargeSummary {
  return {
    id: data.id,
    dischargePlanId: data.discharge_plan_id,
    patientId: data.patient_id,
    patientName: data.patient_name,
    patientNameVi: data.patient_name_vi,
    patientDob: data.patient_dob,
    patientMrn: data.patient_mrn,
    therapistName: data.therapist_name,
    diagnosis: data.diagnosis,
    diagnosisVi: data.diagnosis_vi,
    treatmentSummary: data.treatment_summary,
    treatmentSummaryVi: data.treatment_summary_vi,
    totalSessions: data.total_sessions,
    dateRange: data.date_range,
    outcomeComparisons: transformOutcomeComparisons(data.outcome_comparisons),
    functionalStatus: data.functional_status,
    functionalStatusVi: data.functional_status_vi,
    hepExercises: transformHEPExercises(data.hep_exercises),
    recommendations: data.recommendations,
    recommendationsVi: data.recommendations_vi,
    followUpPlan: transformFollowUpPlan(data.follow_up_plan),
    generatedAt: data.generated_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// Query keys
export const dischargeKeys = {
  all: ["discharge"] as const,
  plans: () => [...dischargeKeys.all, "plan"] as const,
  plan: (patientId: string) => [...dischargeKeys.plans(), patientId] as const,
  summaries: () => [...dischargeKeys.all, "summary"] as const,
  summary: (id: string) => [...dischargeKeys.summaries(), id] as const,
  patientSummary: (patientId: string) =>
    [...dischargeKeys.all, "patientSummary", patientId] as const,
};

/**
 * Hook to fetch discharge plan for a patient
 */
export function useDischargePlan(patientId: string, enabled = true) {
  return useQuery({
    queryKey: dischargeKeys.plan(patientId),
    queryFn: async () => {
      const response = await api.get<ApiDischargePlan>(
        `/v1/patients/${patientId}/discharge-plan`
      );
      return transformDischargePlan(response.data);
    },
    enabled: enabled && !!patientId,
  });
}

/**
 * Hook to create a discharge plan
 */
export function useCreateDischargePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDischargePlanRequest) => {
      const response = await api.post<ApiDischargePlan>(
        `/v1/patients/${data.patientId}/discharge-plan`,
        {
          planned_date: data.plannedDate,
          diagnosis: data.diagnosis,
          diagnosis_vi: data.diagnosisVi,
          treatment_summary: data.treatmentSummary,
          treatment_summary_vi: data.treatmentSummaryVi,
          recommendations: data.recommendations,
          recommendations_vi: data.recommendationsVi,
          functional_status: data.functionalStatus,
          functional_status_vi: data.functionalStatusVi,
          follow_up_plan: data.followUpPlan?.map((item) => ({
            type: item.type,
            description: item.description,
            description_vi: item.descriptionVi,
            timeframe: item.timeframe,
          })),
        }
      );
      return transformDischargePlan(response.data);
    },
    onSuccess: (result) => {
      queryClient.setQueryData(dischargeKeys.plan(result.patientId), result);
      queryClient.invalidateQueries({ queryKey: dischargeKeys.plans() });
    },
  });
}

/**
 * Hook to generate discharge summary for a patient
 */
export function useGenerateSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patientId: string) => {
      const response = await api.post<ApiDischargeSummary>(
        `/v1/patients/${patientId}/discharge-summary`
      );
      return transformDischargeSummary(response.data);
    },
    onSuccess: (result) => {
      queryClient.setQueryData(
        dischargeKeys.patientSummary(result.patientId),
        result
      );
      queryClient.setQueryData(dischargeKeys.summary(result.id), result);
    },
  });
}

/**
 * Hook to fetch a discharge summary by ID
 */
export function useDischargeSummary(id: string, enabled = true) {
  return useQuery({
    queryKey: dischargeKeys.summary(id),
    queryFn: async () => {
      const response = await api.get<ApiDischargeSummary>(
        `/v1/discharge-summaries/${id}`
      );
      return transformDischargeSummary(response.data);
    },
    enabled: enabled && !!id,
  });
}

/**
 * Hook to fetch discharge summary for a patient
 */
export function usePatientDischargeSummary(patientId: string, enabled = true) {
  return useQuery({
    queryKey: dischargeKeys.patientSummary(patientId),
    queryFn: async () => {
      const response = await api.get<ApiDischargeSummary>(
        `/v1/patients/${patientId}/discharge-summary`
      );
      return transformDischargeSummary(response.data);
    },
    enabled: enabled && !!patientId,
  });
}

/**
 * Hook to complete discharge (finalize and mark patient as discharged)
 */
export function useCompleteDischarge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patientId: string) => {
      const response = await api.post<ApiDischargePlan>(
        `/v1/patients/${patientId}/discharge-plan/complete`
      );
      return transformDischargePlan(response.data);
    },
    onSuccess: (result) => {
      queryClient.setQueryData(dischargeKeys.plan(result.patientId), result);
      // Invalidate patient data since status changes to discharged
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}
