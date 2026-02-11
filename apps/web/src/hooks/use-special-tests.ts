"use client";

/**
 * React Query hooks for Special Tests library data management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Types matching the API response (snake_case)
interface ApiSpecialTest {
  id: string;
  name: string;
  name_vi: string;
  category: string;
  description: string;
  description_vi: string;
  positive_finding: string;
  positive_finding_vi: string;
  negative_finding: string;
  negative_finding_vi: string;
  sensitivity?: number;
  specificity?: number;
  created_at: string;
}

interface ApiSpecialTestResult {
  id: string;
  patient_id: string;
  visit_id?: string;
  special_test_id: string;
  result: string;
  notes?: string;
  therapist_id: string;
  assessed_at: string;
  created_at: string;
  test_name?: string;
  test_name_vi?: string;
  test_category?: string;
}

// Frontend types (camelCase)
export type TestCategory = "shoulder" | "knee" | "spine" | "hip" | "ankle" | "elbow";
export type TestResult = "positive" | "negative" | "inconclusive";

export interface SpecialTest {
  id: string;
  name: string;
  nameVi: string;
  category: TestCategory;
  description: string;
  descriptionVi: string;
  positiveFinding: string;
  positiveFindingVi: string;
  negativeFinding: string;
  negativeFindingVi: string;
  sensitivity?: number;
  specificity?: number;
  createdAt: string;
}

export interface SpecialTestResult {
  id: string;
  patientId: string;
  visitId?: string;
  specialTestId: string;
  result: TestResult;
  notes?: string;
  therapistId: string;
  assessedAt: string;
  createdAt: string;
  testName?: string;
  testNameVi?: string;
  testCategory?: TestCategory;
}

export interface CreateSpecialTestResultRequest {
  patientId: string;
  visitId?: string;
  specialTestId: string;
  result: TestResult;
  notes?: string;
  assessedAt?: string;
}

// Transform API response to frontend type
function transformTest(api: ApiSpecialTest): SpecialTest {
  return {
    id: api.id,
    name: api.name,
    nameVi: api.name_vi,
    category: api.category as TestCategory,
    description: api.description,
    descriptionVi: api.description_vi,
    positiveFinding: api.positive_finding,
    positiveFindingVi: api.positive_finding_vi,
    negativeFinding: api.negative_finding,
    negativeFindingVi: api.negative_finding_vi,
    sensitivity: api.sensitivity,
    specificity: api.specificity,
    createdAt: api.created_at,
  };
}

function transformResult(api: ApiSpecialTestResult): SpecialTestResult {
  return {
    id: api.id,
    patientId: api.patient_id,
    visitId: api.visit_id,
    specialTestId: api.special_test_id,
    result: api.result as TestResult,
    notes: api.notes,
    therapistId: api.therapist_id,
    assessedAt: api.assessed_at,
    createdAt: api.created_at,
    testName: api.test_name,
    testNameVi: api.test_name_vi,
    testCategory: api.test_category as TestCategory | undefined,
  };
}

// Query keys
export const specialTestKeys = {
  all: ["special-tests"] as const,
  list: () => [...specialTestKeys.all, "list"] as const,
  category: (category: TestCategory) => [...specialTestKeys.all, "category", category] as const,
  search: (query: string) => [...specialTestKeys.all, "search", query] as const,
  results: () => [...specialTestKeys.all, "results"] as const,
  patientResults: (patientId: string) =>
    [...specialTestKeys.results(), "patient", patientId] as const,
};

/**
 * Hook to fetch all special tests, optionally filtered by category
 */
export function useSpecialTests(category?: TestCategory, enabled = true) {
  return useQuery({
    queryKey: category ? specialTestKeys.category(category) : specialTestKeys.list(),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (category) {
        params.category = category;
      }
      const response = await api.get<ApiSpecialTest[]>("/v1/special-tests", { params });
      const data = Array.isArray(response.data) ? response.data : [];
      return data.map(transformTest);
    },
    enabled,
  });
}

/**
 * Hook to search special tests by name
 */
export function useSearchTests(query: string, enabled = true) {
  return useQuery({
    queryKey: specialTestKeys.search(query),
    queryFn: async () => {
      const response = await api.get<ApiSpecialTest[]>("/v1/special-tests/search", {
        params: { q: query },
      });
      const data = Array.isArray(response.data) ? response.data : [];
      return data.map(transformTest);
    },
    enabled: enabled && query.length >= 2,
  });
}

/**
 * Hook to record a special test result
 */
export function useRecordTestResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSpecialTestResultRequest) => {
      const response = await api.post<ApiSpecialTestResult>("/v1/special-tests/results", {
        patient_id: data.patientId,
        visit_id: data.visitId,
        special_test_id: data.specialTestId,
        result: data.result,
        notes: data.notes,
        assessed_at: data.assessedAt,
      });
      return transformResult(response.data);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: specialTestKeys.patientResults(result.patientId),
      });
    },
  });
}

/**
 * Hook to fetch special test results for a patient
 */
export function usePatientTestResults(patientId: string, enabled = true) {
  return useQuery({
    queryKey: specialTestKeys.patientResults(patientId),
    queryFn: async () => {
      const response = await api.get<ApiSpecialTestResult[]>(
        `/v1/special-tests/results/patient/${patientId}`
      );
      const data = Array.isArray(response.data) ? response.data : [];
      return data.map(transformResult);
    },
    enabled: enabled && !!patientId,
  });
}
