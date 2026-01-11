"use client";

/**
 * React Query hooks for exercise data management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type {
  Exercise,
  ExercisePrescription,
  ExerciseSearchParams,
  CreateExerciseRequest,
  UpdateExerciseRequest,
  PrescribeExerciseRequest,
  UpdatePrescriptionRequest,
  LogComplianceRequest,
  ExerciseComplianceLog,
  PatientComplianceSummary,
} from "@/types/exercise";
import type { PaginatedResponse } from "@/types";

// Query keys
export const exerciseKeys = {
  all: ["exercises"] as const,
  lists: () => [...exerciseKeys.all, "list"] as const,
  list: (params: ExerciseSearchParams) => [...exerciseKeys.lists(), params] as const,
  details: () => [...exerciseKeys.all, "detail"] as const,
  detail: (id: string) => [...exerciseKeys.details(), id] as const,
  search: (query: string) => [...exerciseKeys.all, "search", query] as const,
  patientPrescriptions: (patientId: string) =>
    [...exerciseKeys.all, "patient", patientId, "prescriptions"] as const,
  patientCompliance: (patientId: string) =>
    [...exerciseKeys.all, "patient", patientId, "compliance"] as const,
  prescriptionLogs: (prescriptionId: string) =>
    [...exerciseKeys.all, "prescription", prescriptionId, "logs"] as const,
};

/**
 * Hook to fetch paginated list of exercises
 */
export function useExercises(params: ExerciseSearchParams = {}) {
  return useQuery({
    queryKey: exerciseKeys.list(params),
    queryFn: async () => {
      const response = await api.get<Exercise[]>("/v1/exercises", {
        params: {
          page: params.page,
          per_page: params.perPage,
          search: params.search,
          category: params.category,
          difficulty: params.difficulty,
          muscle_groups: params.muscleGroups?.join(","),
          sort_by: params.sortBy,
          sort_order: params.sortOrder,
        },
      });
      return {
        data: response.data,
        meta: response.meta ?? {
          page: params.page ?? 1,
          pageSize: params.perPage ?? 20,
          total: 0,
          totalPages: 0,
        },
      } as PaginatedResponse<Exercise>;
    },
  });
}

/**
 * Hook to fetch a single exercise by ID
 */
export function useExercise(id: string, enabled = true) {
  return useQuery({
    queryKey: exerciseKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<Exercise>(`/v1/exercises/${id}`);
      return response.data;
    },
    enabled: enabled && !!id,
  });
}

/**
 * Hook to search exercises (for autocomplete)
 */
export function useExerciseSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: exerciseKeys.search(query),
    queryFn: async () => {
      const response = await api.get<Exercise[]>("/v1/exercises/search", {
        params: { q: query, limit: 10 },
      });
      return response.data;
    },
    enabled: enabled && query.length >= 2,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to create a new exercise
 */
export function useCreateExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExerciseRequest) => {
      const response = await api.post<Exercise>("/v1/exercises", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exerciseKeys.lists() });
    },
  });
}

/**
 * Hook to update an exercise
 */
export function useUpdateExercise(exerciseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateExerciseRequest) => {
      const response = await api.put<Exercise>(
        `/v1/exercises/${exerciseId}`,
        data
      );
      return response.data;
    },
    onSuccess: (updatedExercise) => {
      queryClient.setQueryData(exerciseKeys.detail(exerciseId), updatedExercise);
      queryClient.invalidateQueries({ queryKey: exerciseKeys.lists() });
    },
  });
}

/**
 * Hook to delete an exercise
 */
export function useDeleteExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exerciseId: string) => {
      await api.delete(`/v1/exercises/${exerciseId}`);
      return exerciseId;
    },
    onSuccess: (exerciseId) => {
      queryClient.removeQueries({ queryKey: exerciseKeys.detail(exerciseId) });
      queryClient.invalidateQueries({ queryKey: exerciseKeys.lists() });
    },
  });
}

/**
 * Hook to fetch patient prescriptions
 */
export function usePatientPrescriptions(
  patientId: string,
  activeOnly = false,
  enabled = true
) {
  return useQuery({
    queryKey: exerciseKeys.patientPrescriptions(patientId),
    queryFn: async () => {
      const response = await api.get<ExercisePrescription[]>(
        `/v1/patients/${patientId}/exercises`,
        {
          params: { active_only: activeOnly },
        }
      );
      return response.data;
    },
    enabled: enabled && !!patientId,
  });
}

/**
 * Hook to prescribe an exercise to a patient
 */
export function usePrescribeExercise(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PrescribeExerciseRequest) => {
      const response = await api.post<ExercisePrescription>(
        `/v1/patients/${patientId}/exercises`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: exerciseKeys.patientPrescriptions(patientId),
      });
    },
  });
}

/**
 * Hook to update a prescription
 */
export function useUpdatePrescription(patientId: string, prescriptionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdatePrescriptionRequest) => {
      const response = await api.put<ExercisePrescription>(
        `/v1/patients/${patientId}/exercises/${prescriptionId}`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: exerciseKeys.patientPrescriptions(patientId),
      });
    },
  });
}

/**
 * Hook to delete a prescription
 */
export function useDeletePrescription(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prescriptionId: string) => {
      await api.delete(`/v1/patients/${patientId}/exercises/${prescriptionId}`);
      return prescriptionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: exerciseKeys.patientPrescriptions(patientId),
      });
    },
  });
}

/**
 * Hook to fetch patient compliance summary
 */
export function usePatientComplianceSummary(patientId: string, enabled = true) {
  return useQuery({
    queryKey: exerciseKeys.patientCompliance(patientId),
    queryFn: async () => {
      const response = await api.get<PatientComplianceSummary>(
        `/v1/patients/${patientId}/exercises/compliance`
      );
      return response.data;
    },
    enabled: enabled && !!patientId,
  });
}

/**
 * Hook to log exercise compliance
 */
export function useLogCompliance(patientId: string, prescriptionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LogComplianceRequest) => {
      const response = await api.post<ExerciseComplianceLog>(
        `/v1/patients/${patientId}/exercises/${prescriptionId}/log`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: exerciseKeys.patientCompliance(patientId),
      });
      queryClient.invalidateQueries({
        queryKey: exerciseKeys.prescriptionLogs(prescriptionId),
      });
    },
  });
}

/**
 * Hook to fetch compliance logs for a prescription
 */
export function usePrescriptionLogs(
  prescriptionId: string,
  limit = 30,
  enabled = true
) {
  return useQuery({
    queryKey: exerciseKeys.prescriptionLogs(prescriptionId),
    queryFn: async () => {
      const response = await api.get<ExerciseComplianceLog[]>(
        `/v1/prescriptions/${prescriptionId}/logs`,
        {
          params: { limit },
        }
      );
      return response.data;
    },
    enabled: enabled && !!prescriptionId,
  });
}

/**
 * Hook to generate exercise handout
 */
export function useExerciseHandout(patientId: string) {
  return useMutation({
    mutationFn: async (language: "en" | "vi" = "vi") => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/patients/${patientId}/exercises/handout?lang=${language}`,
        {
          method: "GET",
          headers: {
            Accept: "text/plain",
          },
        }
      );

      if (!response.ok) {
        throw new ApiError("Failed to generate handout", response.status);
      }

      const blob = await response.blob();
      return blob;
    },
  });
}

/**
 * Type guard for API errors
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
