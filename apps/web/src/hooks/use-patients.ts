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
  PatientStatus,
  PatientDashboard,
} from "@/types/patient";
import type { PaginatedResponse } from "@/types";

/**
 * API Patient type (snake_case from backend)
 */
interface ApiPatient {
  id: string;
  clinic_id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  first_name_vi?: string;
  last_name_vi?: string;
  full_name: string;
  full_name_vi?: string;
  date_of_birth: string;
  age: number;
  gender: string;
  phone?: string;
  email?: string;
  address?: string;
  address_vi?: string;
  language_preference: string;
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  medical_alerts?: string[];
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * API List Response (snake_case from backend)
 */
interface ApiPatientListResponse {
  data: ApiPatient[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/**
 * Transform API patient to frontend Patient type
 */
function transformPatient(apiPatient: ApiPatient): Patient {
  // Build Vietnamese full name if available, otherwise use English
  const nameVi = apiPatient.full_name_vi
    || (apiPatient.last_name_vi && apiPatient.first_name_vi
      ? `${apiPatient.last_name_vi} ${apiPatient.first_name_vi}`
      : apiPatient.full_name);

  // Determine status based on is_active
  const status: PatientStatus = apiPatient.is_active ? "active" : "inactive";

  return {
    id: apiPatient.id,
    mrn: apiPatient.mrn,
    nameVi: nameVi,
    nameEn: apiPatient.full_name,
    dateOfBirth: apiPatient.date_of_birth,
    gender: apiPatient.gender as Patient["gender"],
    phone: apiPatient.phone ?? "",
    email: apiPatient.email,
    address: apiPatient.address,
    status: status,
    emergencyContactName: apiPatient.emergency_contact?.name,
    emergencyContactPhone: apiPatient.emergency_contact?.phone,
    notes: apiPatient.notes,
    createdAt: apiPatient.created_at,
    updatedAt: apiPatient.updated_at,
  };
}

// Query keys
export const patientKeys = {
  all: ["patients"] as const,
  lists: () => [...patientKeys.all, "list"] as const,
  list: (params: PatientListParams) => [...patientKeys.lists(), params] as const,
  details: () => [...patientKeys.all, "detail"] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
  dashboard: (id: string) => [...patientKeys.detail(id), "dashboard"] as const,
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
      // Map status to is_active for API
      let isActive: boolean | undefined = undefined;
      if (params.status === "active") {
        isActive = true;
      } else if (params.status === "inactive") {
        isActive = false;
      }

      // Map sortBy to snake_case for API
      const sortByMap: Record<string, string> = {
        createdAt: "created_at",
        updatedAt: "updated_at",
        nameVi: "first_name",
        mrn: "mrn",
        lastVisitDate: "updated_at",
      };

      const response = await api.get<ApiPatientListResponse>("/v1/patients", {
        params: {
          page: params.page,
          per_page: params.pageSize,
          search: params.search,
          is_active: isActive,
          sort_by: params.sortBy ? sortByMap[params.sortBy] ?? params.sortBy : undefined,
          sort_order: params.sortOrder,
        },
      });

      // Handle both wrapped and unwrapped response formats
      const apiResponse = response.data as unknown as ApiPatientListResponse;
      const patients = Array.isArray(apiResponse)
        ? apiResponse as unknown as ApiPatient[]
        : apiResponse.data;

      // Transform API patients to frontend format
      const transformedPatients = (patients ?? []).map(transformPatient);

      // Extract pagination from response
      const meta = Array.isArray(apiResponse)
        ? {
            page: params.page ?? 1,
            pageSize: params.pageSize ?? 10,
            total: transformedPatients.length,
            totalPages: 1,
          }
        : {
            page: apiResponse.page ?? params.page ?? 1,
            pageSize: apiResponse.per_page ?? params.pageSize ?? 10,
            total: apiResponse.total ?? 0,
            totalPages: apiResponse.total_pages ?? 0,
          };

      return {
        data: transformedPatients,
        meta,
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
 * API Patient Dashboard type (snake_case from backend)
 */
interface ApiPatientDashboard {
  patient: ApiPatient;
  total_appointments: number;
  upcoming_appointments: number;
  completed_sessions: number;
  active_treatment_plans: number;
  last_visit?: string;
  next_appointment?: string;
  insurance_info?: Array<{
    id: string;
    patient_id: string;
    provider: string;
    provider_type: string;
    policy_number: string;
    group_number?: string;
    coverage_percentage: number;
    copay_amount?: number;
    valid_from: string;
    valid_to?: string;
    is_primary: boolean;
    is_active: boolean;
    verification_status: string;
  }>;
}

/**
 * Hook to fetch patient dashboard data (aggregated view)
 */
export function usePatientDashboard(patientId: string, enabled = true) {
  return useQuery({
    queryKey: patientKeys.dashboard(patientId),
    queryFn: async () => {
      const response = await api.get<ApiPatientDashboard>(
        `/v1/patients/${patientId}/dashboard`
      );
      const apiData = response.data;

      // Transform to frontend format
      const dashboard: PatientDashboard = {
        patient: transformPatient(apiData.patient),
        totalAppointments: apiData.total_appointments,
        upcomingAppointments: apiData.upcoming_appointments,
        completedSessions: apiData.completed_sessions,
        activeTreatmentPlans: apiData.active_treatment_plans,
        lastVisit: apiData.last_visit,
        nextAppointment: apiData.next_appointment,
        insuranceInfo: apiData.insurance_info?.map((ins) => ({
          id: ins.id,
          patientId: ins.patient_id,
          provider: ins.provider,
          providerType: ins.provider_type as "bhyt" | "private" | "corporate",
          policyNumber: ins.policy_number,
          groupNumber: ins.group_number,
          coveragePercentage: ins.coverage_percentage,
          copayAmount: ins.copay_amount,
          validFrom: ins.valid_from,
          validTo: ins.valid_to,
          isPrimary: ins.is_primary,
          isActive: ins.is_active,
          verificationStatus: ins.verification_status as "pending" | "verified" | "failed",
        })),
      };

      return dashboard;
    },
    enabled: enabled && !!patientId,
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
