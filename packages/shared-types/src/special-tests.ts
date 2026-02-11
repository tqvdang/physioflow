/**
 * Special Tests Library types for PhysioFlow EMR
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export type TestCategory = 'shoulder' | 'knee' | 'spine' | 'hip' | 'ankle' | 'elbow';

export type TestResult = 'positive' | 'negative' | 'inconclusive';

// -----------------------------------------------------------------------------
// Category labels (English and Vietnamese)
// -----------------------------------------------------------------------------

export const TEST_CATEGORY_LABELS: Record<TestCategory, { en: string; vi: string }> = {
  shoulder: { en: 'Shoulder', vi: 'Vai' },
  knee: { en: 'Knee', vi: 'Goi' },
  spine: { en: 'Spine', vi: 'Cot song' },
  hip: { en: 'Hip', vi: 'Hong' },
  ankle: { en: 'Ankle', vi: 'Co chan' },
  elbow: { en: 'Elbow', vi: 'Khuyu tay' },
};

export const TEST_RESULT_LABELS: Record<TestResult, { en: string; vi: string }> = {
  positive: { en: 'Positive', vi: 'Duong tinh' },
  negative: { en: 'Negative', vi: 'Am tinh' },
  inconclusive: { en: 'Inconclusive', vi: 'Khong ket luan' },
};

// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

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

export interface PatientSpecialTestResult {
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

// -----------------------------------------------------------------------------
// Request Types
// -----------------------------------------------------------------------------

export interface CreateSpecialTestResultRequest {
  patientId: string;
  visitId?: string;
  specialTestId: string;
  result: TestResult;
  notes?: string;
  assessedAt?: string;
}

// -----------------------------------------------------------------------------
// Zod Schemas
// -----------------------------------------------------------------------------

export const TestCategorySchema = z.enum(['shoulder', 'knee', 'spine', 'hip', 'ankle', 'elbow']);

export const TestResultSchema = z.enum(['positive', 'negative', 'inconclusive']);

export const CreateSpecialTestResultSchema = z.object({
  patientId: z.string().uuid(),
  visitId: z.string().uuid().optional(),
  specialTestId: z.string().uuid(),
  result: TestResultSchema,
  notes: z.string().max(2000).optional(),
  assessedAt: z.string().datetime().optional(),
});

export const SpecialTestSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  nameVi: z.string(),
  category: TestCategorySchema,
  description: z.string(),
  descriptionVi: z.string(),
  positiveFinding: z.string(),
  positiveFindingVi: z.string(),
  negativeFinding: z.string(),
  negativeFindingVi: z.string(),
  sensitivity: z.number().min(0).max(100).optional(),
  specificity: z.number().min(0).max(100).optional(),
  createdAt: z.string().datetime(),
});

export const PatientSpecialTestResultSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  visitId: z.string().uuid().optional(),
  specialTestId: z.string().uuid(),
  result: TestResultSchema,
  notes: z.string().optional(),
  therapistId: z.string().uuid(),
  assessedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  testName: z.string().optional(),
  testNameVi: z.string().optional(),
  testCategory: TestCategorySchema.optional(),
});
