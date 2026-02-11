"use client";

/**
 * React Query hooks for clinical protocol data management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  ClinicalProtocol,
  PatientProtocol,
  ApiClinicalProtocol,
  ApiPatientProtocol,
  ProtocolListParams,
  AssignProtocolRequest,
  UpdateProgressRequest,
  ProtocolGoal,
  ProtocolExercise,
  ProgressionCriteria,
  ProtocolProgressNote,
} from "@/types/protocol";
import type { PaginatedResponse } from "@/types";

/**
 * API list response for protocols
 */
interface ProtocolListApiResponse {
  data: ApiClinicalProtocol[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/**
 * Transform API goal to frontend format
 */
function transformGoal(apiGoal: ApiClinicalProtocol["goals"][number]): ProtocolGoal {
  return {
    type: apiGoal.type,
    description: apiGoal.description,
    descriptionVi: apiGoal.description_vi,
    measurableCriteria: apiGoal.measurable_criteria,
    targetTimeframeWeeks: apiGoal.target_timeframe_weeks,
  };
}

/**
 * Transform API exercise to frontend format
 */
function transformExercise(
  apiExercise: ApiClinicalProtocol["exercises"][number]
): ProtocolExercise {
  return {
    name: apiExercise.name,
    nameVi: apiExercise.name_vi,
    description: apiExercise.description,
    descriptionVi: apiExercise.description_vi,
    sets: apiExercise.sets,
    reps: apiExercise.reps,
    durationSeconds: apiExercise.duration_seconds,
    frequencyPerDay: apiExercise.frequency_per_day,
    phase: apiExercise.phase,
    precautions: apiExercise.precautions ?? [],
  };
}

/**
 * Transform API progression criteria to frontend format
 */
function transformProgressionCriteria(
  apiCriteria: ApiClinicalProtocol["progression_criteria"]
): ProgressionCriteria {
  return {
    phaseTransitions: (apiCriteria.phase_transitions ?? []).map((t) => ({
      fromPhase: t.from_phase,
      toPhase: t.to_phase,
      criteria: t.criteria,
      criteriaVi: t.criteria_vi,
      typicalWeek: t.typical_week,
    })),
    dischargeCriteria: apiCriteria.discharge_criteria ?? "",
    dischargeCriteriaVi: apiCriteria.discharge_criteria_vi ?? "",
  };
}

/**
 * Transform API clinical protocol to frontend type
 */
function transformProtocol(apiProtocol: ApiClinicalProtocol): ClinicalProtocol {
  return {
    id: apiProtocol.id,
    clinicId: apiProtocol.clinic_id,
    protocolName: apiProtocol.protocol_name,
    protocolNameVi: apiProtocol.protocol_name_vi ?? apiProtocol.protocol_name,
    description: apiProtocol.description,
    descriptionVi: apiProtocol.description_vi ?? apiProtocol.description,
    goals: (apiProtocol.goals ?? []).map(transformGoal),
    exercises: (apiProtocol.exercises ?? []).map(transformExercise),
    frequencyPerWeek: apiProtocol.frequency_per_week,
    durationWeeks: apiProtocol.duration_weeks,
    sessionDurationMinutes: apiProtocol.session_duration_minutes,
    progressionCriteria: transformProgressionCriteria(
      apiProtocol.progression_criteria ?? {
        phase_transitions: [],
        discharge_criteria: "",
        discharge_criteria_vi: "",
      }
    ),
    category: apiProtocol.category ?? "",
    applicableDiagnoses: apiProtocol.applicable_diagnoses ?? [],
    bodyRegions: apiProtocol.body_regions ?? [],
    isActive: apiProtocol.is_active,
    version: apiProtocol.version,
    createdAt: apiProtocol.created_at,
    updatedAt: apiProtocol.updated_at,
  };
}

/**
 * Transform API patient protocol to frontend type
 */
function transformPatientProtocol(
  apiPP: ApiPatientProtocol
): PatientProtocol {
  return {
    id: apiPP.id,
    patientId: apiPP.patient_id,
    protocolId: apiPP.protocol_id,
    therapistId: apiPP.therapist_id,
    clinicId: apiPP.clinic_id,
    treatmentPlanId: apiPP.treatment_plan_id,
    assignedDate: apiPP.assigned_date,
    startDate: apiPP.start_date,
    targetEndDate: apiPP.target_end_date,
    actualEndDate: apiPP.actual_end_date,
    progressStatus: apiPP.progress_status,
    currentPhase: apiPP.current_phase ?? "initial",
    sessionsCompleted: apiPP.sessions_completed,
    customGoals: apiPP.custom_goals?.map(transformGoal),
    customExercises: apiPP.custom_exercises?.map(transformExercise),
    customFrequencyPerWeek: apiPP.custom_frequency_per_week,
    customDurationWeeks: apiPP.custom_duration_weeks,
    progressNotes: (apiPP.progress_notes ?? []).map(
      (n): ProtocolProgressNote => ({
        date: n.date,
        note: n.note,
        noteVi: n.note_vi,
        phase: n.phase,
        therapistId: n.therapist_id,
      })
    ),
    version: apiPP.version,
    createdAt: apiPP.created_at,
    updatedAt: apiPP.updated_at,
    protocol: apiPP.protocol ? transformProtocol(apiPP.protocol) : undefined,
  };
}

// Query keys
export const protocolKeys = {
  all: ["protocols"] as const,
  lists: () => [...protocolKeys.all, "list"] as const,
  list: (params: ProtocolListParams) => [...protocolKeys.lists(), params] as const,
  details: () => [...protocolKeys.all, "detail"] as const,
  detail: (id: string) => [...protocolKeys.details(), id] as const,
  patientProtocols: (patientId: string) =>
    [...protocolKeys.all, "patient", patientId] as const,
};

/**
 * Hook to fetch paginated list of protocol templates
 */
export function useProtocols(params: ProtocolListParams = {}) {
  return useQuery({
    queryKey: protocolKeys.list(params),
    queryFn: async () => {
      const response = await api.get<ProtocolListApiResponse>(
        "/v1/protocols",
        {
          params: {
            page: params.page,
            per_page: params.perPage,
            search: params.search,
            category: params.category,
            body_region: params.bodyRegion,
            is_active: params.isActive,
          },
        }
      );

      // Handle both wrapped and unwrapped response formats
      const apiResponse = response.data as unknown as ProtocolListApiResponse;
      const protocols = Array.isArray(apiResponse)
        ? (apiResponse as unknown as ApiClinicalProtocol[])
        : apiResponse.data;

      const transformedProtocols = (protocols ?? []).map(transformProtocol);

      const meta = Array.isArray(apiResponse)
        ? {
            page: params.page ?? 1,
            pageSize: params.perPage ?? 20,
            total: transformedProtocols.length,
            totalPages: 1,
          }
        : {
            page: apiResponse.page ?? params.page ?? 1,
            pageSize: apiResponse.per_page ?? params.perPage ?? 20,
            total: apiResponse.total ?? 0,
            totalPages: apiResponse.total_pages ?? 0,
          };

      return {
        data: transformedProtocols,
        meta,
      } as PaginatedResponse<ClinicalProtocol>;
    },
  });
}

/**
 * Hook to fetch a single protocol template by ID
 */
export function useProtocol(id: string, enabled = true) {
  return useQuery({
    queryKey: protocolKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<ApiClinicalProtocol>(
        `/v1/protocols/${id}`
      );
      return transformProtocol(response.data);
    },
    enabled: enabled && !!id,
  });
}

/**
 * Hook to fetch protocols assigned to a patient
 */
export function usePatientProtocols(patientId: string, enabled = true) {
  return useQuery({
    queryKey: protocolKeys.patientProtocols(patientId),
    queryFn: async () => {
      const response = await api.get<ApiPatientProtocol[]>(
        `/v1/patients/${patientId}/protocols`
      );
      return (response.data ?? []).map(transformPatientProtocol);
    },
    enabled: enabled && !!patientId,
  });
}

/**
 * Hook to assign a protocol to a patient
 */
export function useAssignProtocol(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AssignProtocolRequest) => {
      const response = await api.post<ApiPatientProtocol>(
        `/v1/patients/${patientId}/protocols`,
        {
          protocol_id: data.protocolId,
          start_date: data.startDate,
          custom_frequency_per_week: data.customFrequencyPerWeek,
          custom_duration_weeks: data.customDurationWeeks,
          notes: data.notes,
        }
      );
      return transformPatientProtocol(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: protocolKeys.patientProtocols(patientId),
      });
    },
  });
}

/**
 * Hook to update protocol progress for a patient
 */
export function useUpdateProgress(
  patientId: string,
  patientProtocolId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProgressRequest) => {
      const response = await api.patch<ApiPatientProtocol>(
        `/v1/patients/${patientId}/protocols/${patientProtocolId}`,
        {
          progress_status: data.progressStatus,
          current_phase: data.currentPhase,
          sessions_completed: data.sessionsCompleted,
          note: data.note,
          note_vi: data.noteVi,
        }
      );
      return transformPatientProtocol(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: protocolKeys.patientProtocols(patientId),
      });
    },
  });
}
