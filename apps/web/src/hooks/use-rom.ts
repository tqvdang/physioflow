"use client";

/**
 * React Query hooks for ROM (Range of Motion) assessment data management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Types matching the API response (snake_case)
interface ApiROMAssessment {
  id: string;
  patient_id: string;
  visit_id?: string;
  clinic_id: string;
  therapist_id: string;
  joint: string;
  side: string;
  movement_type: string;
  degree: number;
  notes?: string;
  assessed_at: string;
  created_at: string;
  updated_at: string;
}

interface ApiROMTrending {
  patient_id: string;
  joint: string;
  side: string;
  movement_type: string;
  data_points: Array<{
    degree: number;
    assessed_at: string;
    notes?: string;
  }>;
  baseline?: number;
  current?: number;
  change?: number;
  trend: string;
}

// Frontend types (camelCase)
export type ROMJoint =
  | "shoulder"
  | "elbow"
  | "wrist"
  | "hip"
  | "knee"
  | "ankle"
  | "cervical_spine"
  | "thoracic_spine"
  | "lumbar_spine";

export type ROMSide = "left" | "right" | "bilateral";
export type ROMMovementType = "active" | "passive";

export interface ROMAssessment {
  id: string;
  patientId: string;
  visitId?: string;
  clinicId: string;
  therapistId: string;
  joint: ROMJoint;
  side: ROMSide;
  movementType: ROMMovementType;
  degree: number;
  notes?: string;
  assessedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ROMTrendingData {
  patientId: string;
  joint: ROMJoint;
  side: ROMSide;
  movementType: ROMMovementType;
  dataPoints: Array<{
    degree: number;
    assessedAt: string;
    notes?: string;
  }>;
  baseline?: number;
  current?: number;
  change?: number;
  trend: string;
}

export interface CreateROMRequest {
  patientId: string;
  visitId?: string;
  joint: ROMJoint;
  side: ROMSide;
  movementType: ROMMovementType;
  degree: number;
  notes?: string;
  assessedAt?: string;
}

// Transform API response to frontend type
function transformROM(api: ApiROMAssessment): ROMAssessment {
  return {
    id: api.id,
    patientId: api.patient_id,
    visitId: api.visit_id,
    clinicId: api.clinic_id,
    therapistId: api.therapist_id,
    joint: api.joint as ROMJoint,
    side: api.side as ROMSide,
    movementType: api.movement_type as ROMMovementType,
    degree: api.degree,
    notes: api.notes,
    assessedAt: api.assessed_at,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

function transformTrending(api: ApiROMTrending): ROMTrendingData {
  return {
    patientId: api.patient_id,
    joint: api.joint as ROMJoint,
    side: api.side as ROMSide,
    movementType: api.movement_type as ROMMovementType,
    dataPoints: (api.data_points || []).map((dp) => ({
      degree: dp.degree,
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
export const romKeys = {
  all: ["rom-assessments"] as const,
  patient: (patientId: string) => [...romKeys.all, "patient", patientId] as const,
  patientAssessments: (patientId: string) =>
    [...romKeys.patient(patientId), "list"] as const,
  trending: (patientId: string, joint: ROMJoint, side: ROMSide, movementType: ROMMovementType) =>
    [...romKeys.patient(patientId), "trending", joint, side, movementType] as const,
};

/**
 * Hook to fetch all ROM assessments for a patient
 */
export function usePatientROM(patientId: string, enabled = true) {
  return useQuery({
    queryKey: romKeys.patientAssessments(patientId),
    queryFn: async () => {
      const response = await api.get<ApiROMAssessment[]>(
        `/v1/patients/${patientId}/assessments/rom`
      );
      const data = Array.isArray(response.data) ? response.data : [];
      return data.map(transformROM);
    },
    enabled: enabled && !!patientId,
  });
}

/**
 * Hook to record a new ROM assessment
 */
export function useCreateROM() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateROMRequest) => {
      const response = await api.post<ApiROMAssessment>(
        `/v1/patients/${data.patientId}/assessments/rom`,
        {
          visit_id: data.visitId,
          joint: data.joint,
          side: data.side,
          movement_type: data.movementType,
          degree: data.degree,
          notes: data.notes,
          assessed_at: data.assessedAt,
        }
      );
      return transformROM(response.data);
    },
    onSuccess: (assessment) => {
      queryClient.invalidateQueries({
        queryKey: romKeys.patient(assessment.patientId),
      });
    },
  });
}

/**
 * Hook to fetch ROM trending data for a specific joint
 */
export function useROMTrending(
  patientId: string,
  joint: ROMJoint,
  side: ROMSide,
  movementType: ROMMovementType,
  enabled = true
) {
  return useQuery({
    queryKey: romKeys.trending(patientId, joint, side, movementType),
    queryFn: async () => {
      const response = await api.get<ApiROMTrending>(
        `/v1/patients/${patientId}/assessments/rom/trending`,
        {
          params: {
            joint,
            side,
            movementType,
          },
        }
      );
      return transformTrending(response.data);
    },
    enabled: enabled && !!patientId && !!joint && !!side && !!movementType,
  });
}
