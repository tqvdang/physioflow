"use client";

/**
 * React Query hooks for outcome measures data management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

/**
 * Measure type identifier
 */
export type MeasureType =
  | "VAS"
  | "NDI"
  | "ODI"
  | "LEFS"
  | "DASH"
  | "QuickDASH"
  | "PSFS"
  | "FIM";

/**
 * Phase within a treatment episode
 */
export type MeasurePhase = "baseline" | "interim" | "discharge";

/**
 * Standardized measure definition from the library
 */
export interface MeasureDefinition {
  type: MeasureType;
  name: string;
  description: string;
  minScore: number;
  maxScore: number;
  mcid: number;
  /** true = higher score is better (e.g. LEFS, FIM); false = lower is better (e.g. VAS, NDI) */
  higherIsBetter: boolean;
  unit: string;
}

/**
 * A single recorded measurement
 */
export interface OutcomeMeasurement {
  id: string;
  patientId: string;
  measureType: MeasureType;
  score: number;
  date: string;
  phase: MeasurePhase;
  notes?: string;
  recordedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * API measurement type (snake_case from backend)
 */
interface ApiOutcomeMeasurement {
  id: string;
  patient_id: string;
  measure_type: string;
  score: number;
  date: string;
  phase: string;
  notes?: string;
  recorded_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Request to record a new measurement
 */
export interface RecordMeasureRequest {
  patientId: string;
  measureType: MeasureType;
  score: number;
  date: string;
  phase: MeasurePhase;
  notes?: string;
}

/**
 * Progress data point for charting
 */
export interface ProgressDataPoint {
  date: string;
  score: number;
  phase: MeasurePhase;
}

/**
 * Progress summary for a measure type
 */
export interface ProgressSummary {
  measureType: MeasureType;
  baseline: number | null;
  current: number | null;
  target: number | null;
  changeFromBaseline: number | null;
  mcidAchieved: boolean;
  dataPoints: ProgressDataPoint[];
}

/**
 * Trending data row
 */
export interface TrendingRow {
  id: string;
  date: string;
  score: number;
  phase: MeasurePhase;
  changeFromBaseline: number | null;
}

/**
 * Standardized measures library
 */
export const MEASURE_LIBRARY: MeasureDefinition[] = [
  {
    type: "VAS",
    name: "Visual Analog Scale",
    description: "Pain intensity from 0 (no pain) to 10 (worst pain imaginable)",
    minScore: 0,
    maxScore: 10,
    mcid: 2,
    higherIsBetter: false,
    unit: "points",
  },
  {
    type: "NDI",
    name: "Neck Disability Index",
    description: "Neck pain disability from 0% (no disability) to 100% (complete disability)",
    minScore: 0,
    maxScore: 100,
    mcid: 7.5,
    higherIsBetter: false,
    unit: "%",
  },
  {
    type: "ODI",
    name: "Oswestry Disability Index",
    description: "Low back disability from 0% (no disability) to 100% (bed-bound)",
    minScore: 0,
    maxScore: 100,
    mcid: 12.8,
    higherIsBetter: false,
    unit: "%",
  },
  {
    type: "LEFS",
    name: "Lower Extremity Functional Scale",
    description: "Lower extremity function from 0 (extreme difficulty) to 80 (no difficulty)",
    minScore: 0,
    maxScore: 80,
    mcid: 9,
    higherIsBetter: true,
    unit: "points",
  },
  {
    type: "DASH",
    name: "Disabilities of the Arm, Shoulder and Hand",
    description: "Upper extremity disability from 0 (no disability) to 100 (most severe disability)",
    minScore: 0,
    maxScore: 100,
    mcid: 10.8,
    higherIsBetter: false,
    unit: "points",
  },
  {
    type: "QuickDASH",
    name: "Quick DASH",
    description: "Shortened DASH from 0 (no disability) to 100 (most severe disability)",
    minScore: 0,
    maxScore: 100,
    mcid: 8,
    higherIsBetter: false,
    unit: "points",
  },
  {
    type: "PSFS",
    name: "Patient-Specific Functional Scale",
    description: "Patient-identified activity limitation from 0 (unable to perform) to 10 (able to perform at prior level)",
    minScore: 0,
    maxScore: 10,
    mcid: 2,
    higherIsBetter: true,
    unit: "points",
  },
  {
    type: "FIM",
    name: "Functional Independence Measure",
    description: "Functional independence from 18 (total assistance) to 126 (complete independence)",
    minScore: 18,
    maxScore: 126,
    mcid: 22,
    higherIsBetter: true,
    unit: "points",
  },
];

/**
 * Transform API measurement to frontend type
 */
function transformMeasurement(apiMeasurement: ApiOutcomeMeasurement): OutcomeMeasurement {
  return {
    id: apiMeasurement.id,
    patientId: apiMeasurement.patient_id,
    measureType: apiMeasurement.measure_type as MeasureType,
    score: apiMeasurement.score,
    date: apiMeasurement.date,
    phase: apiMeasurement.phase as MeasurePhase,
    notes: apiMeasurement.notes,
    recordedBy: apiMeasurement.recorded_by,
    createdAt: apiMeasurement.created_at,
    updatedAt: apiMeasurement.updated_at,
  };
}

// Query keys
export const outcomeMeasureKeys = {
  all: ["outcome-measures"] as const,
  patient: (patientId: string) => [...outcomeMeasureKeys.all, "patient", patientId] as const,
  patientMeasures: (patientId: string) =>
    [...outcomeMeasureKeys.patient(patientId), "measures"] as const,
  progress: (patientId: string, measureType: MeasureType) =>
    [...outcomeMeasureKeys.patient(patientId), "progress", measureType] as const,
  trending: (patientId: string, measureType: MeasureType) =>
    [...outcomeMeasureKeys.patient(patientId), "trending", measureType] as const,
  library: () => [...outcomeMeasureKeys.all, "library"] as const,
};

/**
 * Get a measure definition by type
 */
export function getMeasureDefinition(type: MeasureType): MeasureDefinition | undefined {
  return MEASURE_LIBRARY.find((m) => m.type === type);
}

/**
 * Hook to fetch the standardized measures library
 */
export function useMeasureLibrary() {
  return useQuery({
    queryKey: outcomeMeasureKeys.library(),
    queryFn: async () => {
      // Library is static data; return it directly.
      // When the backend provides a /v1/outcome-measures/library endpoint,
      // swap this for an API call.
      return MEASURE_LIBRARY;
    },
    staleTime: Infinity,
  });
}

/**
 * Hook to fetch all outcome measures for a patient
 */
export function usePatientMeasures(patientId: string, enabled = true) {
  return useQuery({
    queryKey: outcomeMeasureKeys.patientMeasures(patientId),
    queryFn: async () => {
      const response = await api.get<ApiOutcomeMeasurement[]>(
        `/v1/patients/${patientId}/outcome-measures`
      );
      const measurements = Array.isArray(response.data)
        ? response.data
        : [];
      return measurements.map(transformMeasurement);
    },
    enabled: enabled && !!patientId,
  });
}

/**
 * Hook to record a new outcome measurement
 */
export function useRecordMeasure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RecordMeasureRequest) => {
      const response = await api.post<ApiOutcomeMeasurement>(
        `/v1/patients/${data.patientId}/outcome-measures`,
        {
          measure_type: data.measureType,
          score: data.score,
          date: data.date,
          phase: data.phase,
          notes: data.notes,
        }
      );
      return transformMeasurement(response.data);
    },
    onSuccess: (measurement) => {
      // Invalidate patient measures
      queryClient.invalidateQueries({
        queryKey: outcomeMeasureKeys.patient(measurement.patientId),
      });
    },
  });
}

/**
 * Hook to calculate progress for a specific measure type
 */
export function useProgress(patientId: string, measureType: MeasureType, enabled = true) {
  return useQuery({
    queryKey: outcomeMeasureKeys.progress(patientId, measureType),
    queryFn: async () => {
      const response = await api.get<ApiOutcomeMeasurement[]>(
        `/v1/patients/${patientId}/outcome-measures`,
        { params: { measure_type: measureType } }
      );

      const measurements = (Array.isArray(response.data) ? response.data : [])
        .map(transformMeasurement)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const definition = getMeasureDefinition(measureType);
      const baseline = measurements.find((m) => m.phase === "baseline")?.score ?? null;
      const lastMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : undefined;
      const current = lastMeasurement?.score ?? null;

      // Calculate target based on MCID
      let target: number | null = null;
      if (baseline !== null && definition) {
        target = definition.higherIsBetter
          ? baseline + definition.mcid
          : baseline - definition.mcid;
        // Clamp target to valid range
        target = Math.max(definition.minScore, Math.min(definition.maxScore, target));
      }

      const changeFromBaseline =
        baseline !== null && current !== null ? current - baseline : null;

      const mcidAchieved =
        changeFromBaseline !== null && definition
          ? definition.higherIsBetter
            ? changeFromBaseline >= definition.mcid
            : changeFromBaseline <= -definition.mcid
          : false;

      const dataPoints: ProgressDataPoint[] = measurements.map((m) => ({
        date: m.date,
        score: m.score,
        phase: m.phase,
      }));

      return {
        measureType,
        baseline,
        current,
        target,
        changeFromBaseline,
        mcidAchieved,
        dataPoints,
      } as ProgressSummary;
    },
    enabled: enabled && !!patientId && !!measureType,
  });
}

/**
 * Hook to get trending data for a specific measure type
 */
export function useTrending(patientId: string, measureType: MeasureType, enabled = true) {
  return useQuery({
    queryKey: outcomeMeasureKeys.trending(patientId, measureType),
    queryFn: async () => {
      const response = await api.get<ApiOutcomeMeasurement[]>(
        `/v1/patients/${patientId}/outcome-measures`,
        { params: { measure_type: measureType } }
      );

      const measurements = (Array.isArray(response.data) ? response.data : [])
        .map(transformMeasurement)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const baselineMeasurement = measurements.find((m) => m.phase === "baseline");
      const baselineScore = baselineMeasurement?.score ?? null;

      const rows: TrendingRow[] = measurements.map((m) => ({
        id: m.id,
        date: m.date,
        score: m.score,
        phase: m.phase,
        changeFromBaseline: baselineScore !== null ? m.score - baselineScore : null,
      }));

      return rows;
    },
    enabled: enabled && !!patientId && !!measureType,
  });
}
