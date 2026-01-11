"use client";

/**
 * React Query hooks for patient data management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type {
  Patient,
  PatientListParams,
  CreatePatientRequest,
  UpdatePatientRequest,
  PatientQuickStats,
  PatientSession,
  PatientTimelineEntry,
} from "@/types/patient";
import type { PaginatedResponse } from "@/types";

// Query keys
export const patientKeys = {
  all: ["patients"] as const,
  lists: () => [...patientKeys.all, "list"] as const,
  list: (params: PatientListParams) => [...patientKeys.lists(), params] as const,
  details: () => [...patientKeys.all, "detail"] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
  stats: (id: string) => [...patientKeys.detail(id), "stats"] as const,
  sessions: (id: string) => [...patientKeys.detail(id), "sessions"] as const,
  timeline: (id: string) => [...patientKeys.detail(id), "timeline"] as const,
  search: (query: string) => [...patientKeys.all, "search", query] as const,
};

/**
 * Hook to fetch paginated list of patients
 */
export function usePatients(params: PatientListParams = {}) {
  return useQuery({
    queryKey: patientKeys.list(params),
    queryFn: async () => {
      const response = await api.get<Patient[]>("/v1/patients", {
        params: {
          page: params.page,
          page_size: params.pageSize,
          search: params.search,
          status: params.status,
          sort_by: params.sortBy,
          sort_order: params.sortOrder,
        },
      });
      return {
        data: response.data,
        meta: response.meta ?? {
          page: params.page ?? 1,
          pageSize: params.pageSize ?? 10,
          total: 0,
          totalPages: 0,
        },
      } as PaginatedResponse<Patient>;
    },
  });
}

/**
 * Hook to fetch a single patient by ID
 */
export function usePatient(id: string, enabled = true) {
  return useQuery({
    queryKey: patientKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<Patient>(`/v1/patients/${id}`);
      return response.data;
    },
    enabled: enabled && !!id,
  });
}

/**
 * Hook to fetch patient quick stats
 */
export function usePatientStats(patientId: string, enabled = true) {
  return useQuery({
    queryKey: patientKeys.stats(patientId),
    queryFn: async () => {
      const response = await api.get<PatientQuickStats>(
        `/v1/patients/${patientId}/stats`
      );
      return response.data;
    },
    enabled: enabled && !!patientId,
  });
}

/**
 * Hook to fetch patient sessions
 */
export function usePatientSessions(
  patientId: string,
  params: { page?: number; pageSize?: number } = {},
  enabled = true
) {
  return useQuery({
    queryKey: patientKeys.sessions(patientId),
    queryFn: async () => {
      const response = await api.get<PatientSession[]>(
        `/v1/patients/${patientId}/sessions`,
        {
          params: {
            page: params.page,
            page_size: params.pageSize,
          },
        }
      );
      return {
        data: response.data,
        meta: response.meta ?? {
          page: params.page ?? 1,
          pageSize: params.pageSize ?? 10,
          total: 0,
          totalPages: 0,
        },
      } as PaginatedResponse<PatientSession>;
    },
    enabled: enabled && !!patientId,
  });
}

/**
 * Hook to fetch patient timeline
 */
export function usePatientTimeline(patientId: string, enabled = true) {
  return useQuery({
    queryKey: patientKeys.timeline(patientId),
    queryFn: async () => {
      const response = await api.get<PatientTimelineEntry[]>(
        `/v1/patients/${patientId}/timeline`
      );
      return response.data;
    },
    enabled: enabled && !!patientId,
  });
}

/**
 * Hook to search patients (for autocomplete)
 */
export function usePatientSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: patientKeys.search(query),
    queryFn: async () => {
      const response = await api.get<Patient[]>("/v1/patients/search", {
        params: { q: query, limit: 10 },
      });
      return response.data;
    },
    enabled: enabled && query.length >= 2,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to create a new patient
 */
export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePatientRequest) => {
      const response = await api.post<Patient>("/v1/patients", data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate patient list queries
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}

/**
 * Hook to update a patient
 */
export function useUpdatePatient(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdatePatientRequest) => {
      const response = await api.patch<Patient>(
        `/v1/patients/${patientId}`,
        data
      );
      return response.data;
    },
    onSuccess: (updatedPatient) => {
      // Update the cache for this patient
      queryClient.setQueryData(patientKeys.detail(patientId), updatedPatient);
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}

/**
 * Hook to delete a patient
 */
export function useDeletePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patientId: string) => {
      await api.delete(`/v1/patients/${patientId}`);
      return patientId;
    },
    onSuccess: (patientId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: patientKeys.detail(patientId) });
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}

/**
 * Type guard for API errors
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
