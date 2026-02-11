"use client";

/**
 * React Query hooks for MMT (Manual Muscle Testing) assessment data management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Types matching the API response (snake_case)
interface ApiMMTAssessment {
  id: string;
  patient_id: string;
  visit_id?: string;
  clinic_id: string;
  therapist_id: string;
  muscle_group: string;
  side: string;
  grade: number;
  notes?: string;
  assessed_at: string;
  created_at: string;
  updated_at: string;
}

interface ApiMMTTrending {
  patient_id: string;
  muscle_group: string;
  side: string;
  data_points: Array<{
    grade: number;
    assessed_at: string;
    notes?: string;
  }>;
  baseline?: number;
  current?: number;
  change?: number;
  trend: string;
}

// Frontend types (camelCase)
export type MMTSide = "left" | "right" | "bilateral";

export interface MMTAssessment {
  id: string;
  patientId: string;
  visitId?: string;
  clinicId: string;
  therapistId: string;
  muscleGroup: string;
  side: MMTSide;
  grade: number;
  notes?: string;
  assessedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MMTTrendingData {
  patientId: string;
  muscleGroup: string;
  side: MMTSide;
  dataPoints: Array<{
    grade: number;
    assessedAt: string;
    notes?: string;
  }>;
  baseline?: number;
  current?: number;
  change?: number;
  trend: string;
}

export interface CreateMMTRequest {
  patientId: string;
  visitId?: string;
  muscleGroup: string;
  side: MMTSide;
  grade: number;
  notes?: string;
  assessedAt?: string;
}

// Transform API response to frontend type
function transformMMT(api: ApiMMTAssessment): MMTAssessment {
  return {
    id: api.id,
    patientId: api.patient_id,
    visitId: api.visit_id,
    clinicId: api.clinic_id,
    therapistId: api.therapist_id,
    muscleGroup: api.muscle_group,
    side: api.side as MMTSide,
    grade: api.grade,
    notes: api.notes,
    assessedAt: api.assessed_at,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

function transformTrending(api: ApiMMTTrending): MMTTrendingData {
  return {
    patientId: api.patient_id,
    muscleGroup: api.muscle_group,
    side: api.side as MMTSide,
    dataPoints: (api.data_points || []).map((dp) => ({
      grade: dp.grade,
      assessedAt: dp.assessed_at,
      notes: dp.notes,
    })),
    baseline: api.baseline,
    current: api.current,
    change: api.change,
    trend: api.trend,
  };
}

// Query keys
export const mmtKeys = {
  all: ["mmt-assessments"] as const,
  patient: (patientId: string) => [...mmtKeys.all, "patient", patientId] as const,
  patientAssessments: (patientId: string) =>
    [...mmtKeys.patient(patientId), "list"] as const,
  trending: (patientId: string, muscleGroup: string, side: MMTSide) =>
    [...mmtKeys.patient(patientId), "trending", muscleGroup, side] as const,
};

/**
 * Hook to fetch all MMT assessments for a patient
 */
export function usePatientMMT(patientId: string, enabled = true) {
  return useQuery({
    queryKey: mmtKeys.patientAssessments(patientId),
    queryFn: async () => {
      const response = await api.get<ApiMMTAssessment[]>(
        `/v1/patients/${patientId}/assessments/mmt`
      );
      const data = Array.isArray(response.data) ? response.data : [];
      return data.map(transformMMT);
    },
    enabled: enabled && !!patientId,
  });
}

/**
 * Hook to record a new MMT assessment
 */
export function useCreateMMT() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMMTRequest) => {
      const response = await api.post<ApiMMTAssessment>(
        `/v1/patients/${data.patientId}/assessments/mmt`,
        {
          visit_id: data.visitId,
          muscle_group: data.muscleGroup,
          side: data.side,
          grade: data.grade,
          notes: data.notes,
          assessed_at: data.assessedAt,
        }
      );
      return transformMMT(response.data);
    },
    onSuccess: (assessment) => {
      queryClient.invalidateQueries({
        queryKey: mmtKeys.patient(assessment.patientId),
      });
    },
  });
}

/**
 * Hook to fetch MMT trending data for a specific muscle group
 */
export function useMMTTrending(
  patientId: string,
  muscleGroup: string,
  side: MMTSide,
  enabled = true
) {
  return useQuery({
    queryKey: mmtKeys.trending(patientId, muscleGroup, side),
    queryFn: async () => {
      const response = await api.get<ApiMMTTrending>(
        `/v1/patients/${patientId}/assessments/mmt/trending`,
        {
          params: {
            muscleGroup,
            side,
          },
        }
      );
      return transformTrending(response.data);
    },
    enabled: enabled && !!patientId && !!muscleGroup && !!side,
  });
}
