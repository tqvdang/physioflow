/**
 * Condition-Specific Assessment Template types for PhysioFlow EMR
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export type TemplateCategory = 'musculoskeletal' | 'neurological' | 'pediatric';

export type ChecklistItemType = 'select' | 'radio' | 'number' | 'text' | 'checkbox';

// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

export interface ChecklistItem {
  item: string;
  item_vi: string;
  type: ChecklistItemType;
  options?: string[];
  options_vi?: string[];
  unit?: string;
  range?: [number, number];
  required: boolean;
  order: number;
}

export interface AssessmentTemplate {
  id: string;
  name: string;
  name_vi: string;
  condition: string;
  category: TemplateCategory;
  description?: string;
  description_vi?: string;
  checklist_items: ChecklistItem[];
  item_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatientAssessmentResult {
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

// -----------------------------------------------------------------------------
// Request Types
// -----------------------------------------------------------------------------

export interface CreateAssessmentResultRequest {
  patient_id: string;
  template_id: string;
  results: Record<string, unknown>;
  notes?: string;
  assessed_at?: string;
}

// -----------------------------------------------------------------------------
// Category Labels
// -----------------------------------------------------------------------------

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, { en: string; vi: string }> = {
  musculoskeletal: { en: 'Musculoskeletal', vi: 'Co xuong khop' },
  neurological: { en: 'Neurological', vi: 'Than kinh' },
  pediatric: { en: 'Pediatric', vi: 'Nhi khoa' },
};

// -----------------------------------------------------------------------------
// Zod Schemas
// -----------------------------------------------------------------------------

export const TemplateCategorySchema = z.enum(['musculoskeletal', 'neurological', 'pediatric']);

export const ChecklistItemTypeSchema = z.enum(['select', 'radio', 'number', 'text', 'checkbox']);

export const ChecklistItemSchema = z.object({
  item: z.string(),
  item_vi: z.string(),
  type: ChecklistItemTypeSchema,
  options: z.array(z.string()).optional(),
  options_vi: z.array(z.string()).optional(),
  unit: z.string().optional(),
  range: z.tuple([z.number(), z.number()]).optional(),
  required: z.boolean(),
  order: z.number().int().min(1),
});

export const AssessmentTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  name_vi: z.string(),
  condition: z.string(),
  category: TemplateCategorySchema,
  description: z.string().optional(),
  description_vi: z.string().optional(),
  checklist_items: z.array(ChecklistItemSchema),
  item_count: z.number().int().min(0),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateAssessmentResultSchema = z.object({
  patient_id: z.string().uuid(),
  template_id: z.string().uuid(),
  results: z.record(z.unknown()),
  notes: z.string().max(5000).optional(),
  assessed_at: z.string().datetime().optional(),
});

export const PatientAssessmentResultSchema = z.object({
  id: z.string().uuid(),
  patient_id: z.string().uuid(),
  template_id: z.string().uuid(),
  clinic_id: z.string().uuid(),
  therapist_id: z.string().uuid(),
  results: z.record(z.unknown()),
  notes: z.string().optional(),
  assessed_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  template_name: z.string().optional(),
  template_name_vi: z.string().optional(),
  template_condition: z.string().optional(),
});
