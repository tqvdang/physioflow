"use client";

/**
 * React Query hooks for appointment data management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type {
  Appointment,
  AppointmentListParams,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  CancelAppointmentRequest,
  Therapist,
  AvailabilitySlot,
  DaySchedule,
} from "@/types/appointment";
import type { PaginatedResponse } from "@/types";

// Query keys
export const appointmentKeys = {
  all: ["appointments"] as const,
  lists: () => [...appointmentKeys.all, "list"] as const,
  list: (params: AppointmentListParams) => [...appointmentKeys.lists(), params] as const,
  details: () => [...appointmentKeys.all, "detail"] as const,
  detail: (id: string) => [...appointmentKeys.details(), id] as const,
  daySchedule: (date: string) => [...appointmentKeys.all, "day", date] as const,
  byPatient: (patientId: string) => [...appointmentKeys.all, "patient", patientId] as const,
  byTherapist: (therapistId: string, startDate: string, endDate: string) =>
    [...appointmentKeys.all, "therapist", therapistId, startDate, endDate] as const,
};

export const therapistKeys = {
  all: ["therapists"] as const,
  list: () => [...therapistKeys.all, "list"] as const,
  availability: (therapistId: string, date: string, duration: number) =>
    [...therapistKeys.all, "availability", therapistId, date, duration] as const,
};

/**
 * Hook to fetch paginated list of appointments
 */
export function useAppointments(params: AppointmentListParams = {}) {
  return useQuery({
    queryKey: appointmentKeys.list(params),
    queryFn: async () => {
      const response = await api.get<Appointment[]>("/v1/appointments", {
        params: {
          page: params.page,
          per_page: params.perPage,
          patient_id: params.patientId,
          therapist_id: params.therapistId,
          start_date: params.startDate,
          end_date: params.endDate,
          status: params.status,
          type: params.type,
          room: params.room,
          sort_by: params.sortBy,
          sort_order: params.sortOrder,
        },
      });
      return {
        data: response.data,
        meta: response.meta ?? {
          page: params.page ?? 1,
          pageSize: params.perPage ?? 50,
          total: 0,
          totalPages: 0,
        },
      } as PaginatedResponse<Appointment>;
    },
  });
}

/**
 * Hook to fetch a single appointment by ID
 */
export function useAppointment(id: string, enabled = true) {
  return useQuery({
    queryKey: appointmentKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<Appointment>(`/v1/appointments/${id}`);
      return response.data;
    },
    enabled: enabled && !!id,
  });
}

/**
 * Hook to fetch day schedule
 */
export function useDaySchedule(date: string, enabled = true) {
  return useQuery({
    queryKey: appointmentKeys.daySchedule(date),
    queryFn: async () => {
      const response = await api.get<DaySchedule>(`/v1/appointments/day/${date}`);
      return response.data;
    },
    enabled: enabled && !!date,
  });
}

/**
 * Hook to fetch appointments for a date range
 */
export function useAppointmentsByDateRange(
  startDate: string,
  endDate: string,
  therapistId?: string,
  enabled = true
) {
  return useQuery({
    queryKey: appointmentKeys.list({ startDate, endDate, therapistId }),
    queryFn: async () => {
      const response = await api.get<Appointment[]>("/v1/appointments", {
        params: {
          start_date: startDate,
          end_date: endDate,
          therapist_id: therapistId,
          per_page: 200, // Get all appointments for the date range
        },
      });
      return response.data;
    },
    enabled: enabled && !!startDate && !!endDate,
  });
}

/**
 * Hook to fetch appointments for a patient
 */
export function usePatientAppointments(patientId: string, limit = 20, enabled = true) {
  return useQuery({
    queryKey: appointmentKeys.byPatient(patientId),
    queryFn: async () => {
      const response = await api.get<Appointment[]>("/v1/appointments", {
        params: {
          patient_id: patientId,
          per_page: limit,
          sort_by: "start_time",
          sort_order: "desc",
        },
      });
      return response.data;
    },
    enabled: enabled && !!patientId,
  });
}

/**
 * Hook to fetch all therapists
 */
export function useTherapists(enabled = true) {
  return useQuery({
    queryKey: therapistKeys.list(),
    queryFn: async () => {
      const response = await api.get<Therapist[]>("/v1/therapists");
      return response.data;
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch therapist availability
 */
export function useTherapistAvailability(
  therapistId: string,
  date: string,
  duration: number = 30,
  enabled = true
) {
  return useQuery({
    queryKey: therapistKeys.availability(therapistId, date, duration),
    queryFn: async () => {
      const response = await api.get<AvailabilitySlot[]>(
        `/v1/therapists/${therapistId}/availability`,
        {
          params: { date, duration },
        }
      );
      return response.data;
    },
    enabled: enabled && !!therapistId && !!date,
  });
}

/**
 * Hook to create a new appointment
 */
export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAppointmentRequest) => {
      const response = await api.post<Appointment>("/v1/appointments", {
        patient_id: data.patientId,
        therapist_id: data.therapistId,
        start_time: data.startTime,
        duration: data.duration,
        type: data.type,
        room: data.room,
        notes: data.notes,
        recurrence_pattern: data.recurrencePattern,
        recurrence_end_date: data.recurrenceEndDate,
        recurrence_count: data.recurrenceCount,
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all appointment queries
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

/**
 * Hook to update an appointment
 */
export function useUpdateAppointment(appointmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateAppointmentRequest) => {
      const response = await api.put<Appointment>(
        `/v1/appointments/${appointmentId}`,
        {
          start_time: data.startTime,
          duration: data.duration,
          type: data.type,
          status: data.status,
          room: data.room,
          notes: data.notes,
          therapist_id: data.therapistId,
        }
      );
      return response.data;
    },
    onSuccess: (updatedAppointment) => {
      // Update the cache for this appointment
      queryClient.setQueryData(appointmentKeys.detail(appointmentId), updatedAppointment);
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
    },
  });
}

/**
 * Hook to cancel an appointment
 */
export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appointmentId,
      data
    }: {
      appointmentId: string;
      data?: CancelAppointmentRequest
    }) => {
      await api.post(`/v1/appointments/${appointmentId}/cancel`, data ?? {});
      return appointmentId;
    },
    onSuccess: (appointmentId) => {
      // Invalidate the specific appointment and lists
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(appointmentId) });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
    },
  });
}

/**
 * Hook to delete an appointment
 */
export function useDeleteAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      await api.delete(`/v1/appointments/${appointmentId}`);
      return appointmentId;
    },
    onSuccess: (appointmentId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: appointmentKeys.detail(appointmentId) });
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
    },
  });
}

/**
 * Type guard for API errors
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
