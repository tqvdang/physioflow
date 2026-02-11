"use client";

/**
 * React Query hooks for assessment template data management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// API response types (snake_case from Go API)
interface ApiChecklistItem {
  item: string;
  item_vi: string;
  type: string;
  options?: string[];
  options_vi?: string[];
  unit?: string;
  range?: [number, number];
  required: boolean;
  order: number;
}

interface ApiAssessmentTemplate {
  id: string;
  name: string;
  name_vi: string;
  condition: string;
  category: string;
  description?: string;
  description_vi?: string;
  checklist_items: ApiChecklistItem[];
  item_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ApiAssessmentResult {
  id: string;
  patient_id: string;
  template_id: string;
  clinic_id: string;
  therapist_id: string;
  results: Record<string, unknown>;
  notes?: string;
  assessed_at: string;
  created_at: string;
  updated_at: string;
  template_name?: string;
  template_name_vi?: string;
  template_condition?: string;
}

// Frontend types (camelCase)
export type TemplateCategory = "musculoskeletal" | "neurological" | "pediatric";
export type ChecklistItemType = "select" | "radio" | "number" | "text" | "checkbox";

export interface ChecklistItem {
  item: string;
  itemVi: string;
  type: ChecklistItemType;
  options?: string[];
  optionsVi?: string[];
  unit?: string;
  range?: [number, number];
  required: boolean;
  order: number;
}

export interface AssessmentTemplate {
  id: string;
  name: string;
  nameVi: string;
  condition: string;
  category: TemplateCategory;
  description?: string;
  descriptionVi?: string;
  checklistItems: ChecklistItem[];
  itemCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentResult {
  id: string;
  patientId: string;
  templateId: string;
  clinicId: string;
  therapistId: string;
  results: Record<string, unknown>;
  notes?: string;
  assessedAt: string;
  createdAt: string;
  updatedAt: string;
  templateName?: string;
  templateNameVi?: string;
  templateCondition?: string;
}

export interface CreateAssessmentResultRequest {
  patientId: string;
  templateId: string;
  results: Record<string, unknown>;
  notes?: string;
  assessedAt?: string;
}

// Transform API response to frontend type
function transformChecklistItem(api: ApiChecklistItem): ChecklistItem {
  return {
    item: api.item,
    itemVi: api.item_vi,
    type: api.type as ChecklistItemType,
    options: api.options,
    optionsVi: api.options_vi,
    unit: api.unit,
    range: api.range,
    required: api.required,
    order: api.order,
  };
}

function transformTemplate(api: ApiAssessmentTemplate): AssessmentTemplate {
  return {
    id: api.id,
    name: api.name,
    nameVi: api.name_vi,
    condition: api.condition,
    category: api.category as TemplateCategory,
    description: api.description,
    descriptionVi: api.description_vi,
    checklistItems: (api.checklist_items || []).map(transformChecklistItem),
    itemCount: api.item_count,
    isActive: api.is_active,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

function transformResult(api: ApiAssessmentResult): AssessmentResult {
  return {
    id: api.id,
    patientId: api.patient_id,
    templateId: api.template_id,
    clinicId: api.clinic_id,
    therapistId: api.therapist_id,
    results: api.results,
    notes: api.notes,
    assessedAt: api.assessed_at,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
    templateName: api.template_name,
    templateNameVi: api.template_name_vi,
    templateCondition: api.template_condition,
  };
}

// Query keys
export const assessmentTemplateKeys = {
  all: ["assessment-templates"] as const,
  list: (category?: string) =>
    category
      ? ([...assessmentTemplateKeys.all, "list", category] as const)
      : ([...assessmentTemplateKeys.all, "list"] as const),
  detail: (id: string) => [...assessmentTemplateKeys.all, "detail", id] as const,
  results: (patientId: string) =>
    [...assessmentTemplateKeys.all, "results", patientId] as const,
};

/**
 * Hook to fetch all assessment templates, optionally filtered by category
 */
export function useTemplates(category?: TemplateCategory, enabled = true) {
  return useQuery({
    queryKey: assessmentTemplateKeys.list(category),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (category) {
        params.category = category;
      }
      const response = await api.get<ApiAssessmentTemplate[]>(
        `/v1/assessment-templates`,
        { params }
      );
      const data = Array.isArray(response.data) ? response.data : [];
      return data.map(transformTemplate);
    },
    enabled,
  });
}

/**
 * Hook to fetch a single assessment template by ID
 */
export function useTemplate(id: string, enabled = true) {
  return useQuery({
    queryKey: assessmentTemplateKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<ApiAssessmentTemplate>(
        `/v1/assessment-templates/${id}`
      );
      return transformTemplate(response.data);
    },
    enabled: enabled && !!id,
  });
}

/**
 * Hook to save a new assessment result
 */
export function useSaveResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAssessmentResultRequest) => {
      const response = await api.post<ApiAssessmentResult>(
        `/v1/assessment-templates/results`,
        {
          patient_id: data.patientId,
          template_id: data.templateId,
          results: data.results,
          notes: data.notes,
          assessed_at: data.assessedAt,
        }
      );
      return transformResult(response.data);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: assessmentTemplateKeys.results(result.patientId),
      });
    },
  });
}

/**
 * Hook to fetch assessment results for a patient
 */
export function usePatientAssessmentResults(patientId: string, enabled = true) {
  return useQuery({
    queryKey: assessmentTemplateKeys.results(patientId),
    queryFn: async () => {
      const response = await api.get<ApiAssessmentResult[]>(
        `/v1/assessment-templates/results/patient/${patientId}`
      );
      const data = Array.isArray(response.data) ? response.data : [];
      return data.map(transformResult);
    },
    enabled: enabled && !!patientId,
  });
}
