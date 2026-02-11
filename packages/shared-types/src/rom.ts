/**
 * Range of Motion (ROM) Assessment types for PhysioFlow EMR
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export type ROMJoint =
  | 'shoulder'
  | 'elbow'
  | 'wrist'
  | 'hip'
  | 'knee'
  | 'ankle'
  | 'cervical_spine'
  | 'thoracic_spine'
  | 'lumbar_spine';

export type ROMSide = 'left' | 'right' | 'bilateral';

export type ROMMovementType = 'active' | 'passive';

export type TrendDirection = 'improved' | 'declined' | 'stable' | 'insufficient_data';

// -----------------------------------------------------------------------------
// Normal ROM Ranges (degrees) - clinical reference values
// -----------------------------------------------------------------------------

export const NORMAL_ROM_RANGES: Record<ROMJoint, number> = {
  shoulder: 180,
  elbow: 150,
  wrist: 80,
  hip: 120,
  knee: 135,
  ankle: 50,
  cervical_spine: 80,
  thoracic_spine: 40,
  lumbar_spine: 60,
};

// -----------------------------------------------------------------------------
// Joint labels (English and Vietnamese)
// -----------------------------------------------------------------------------

export const ROM_JOINT_LABELS: Record<ROMJoint, { en: string; vi: string }> = {
  shoulder: { en: 'Shoulder', vi: 'Vai' },
  elbow: { en: 'Elbow', vi: 'Khuyu tay' },
  wrist: { en: 'Wrist', vi: 'Co tay' },
  hip: { en: 'Hip', vi: 'Hong' },
  knee: { en: 'Knee', vi: 'Goi' },
  ankle: { en: 'Ankle', vi: 'Co chan' },
  cervical_spine: { en: 'Cervical Spine', vi: 'Cot song co' },
  thoracic_spine: { en: 'Thoracic Spine', vi: 'Cot song nguc' },
  lumbar_spine: { en: 'Lumbar Spine', vi: 'Cot song that lung' },
};

// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

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
  dataPoints: ROMTrendDataPoint[];
  baseline?: number;
  current?: number;
  change?: number;
  trend: TrendDirection;
}

export interface ROMTrendDataPoint {
  degree: number;
  assessedAt: string;
  notes?: string;
}

// -----------------------------------------------------------------------------
// Request Types
// -----------------------------------------------------------------------------

export interface CreateROMAssessmentRequest {
  patientId: string;
  visitId?: string;
  joint: ROMJoint;
  side: ROMSide;
  movementType: ROMMovementType;
  degree: number;
  notes?: string;
  assessedAt?: string;
}

// -----------------------------------------------------------------------------
// Zod Schemas
// -----------------------------------------------------------------------------

export const ROMJointSchema = z.enum([
  'shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle',
  'cervical_spine', 'thoracic_spine', 'lumbar_spine',
]);

export const ROMSideSchema = z.enum(['left', 'right', 'bilateral']);

export const ROMMovementTypeSchema = z.enum(['active', 'passive']);

export const CreateROMAssessmentSchema = z.object({
  patientId: z.string().uuid(),
  visitId: z.string().uuid().optional(),
  joint: ROMJointSchema,
  side: ROMSideSchema,
  movementType: ROMMovementTypeSchema,
  degree: z.number().min(0).max(360),
  notes: z.string().max(2000).optional(),
  assessedAt: z.string().datetime().optional(),
});

export const ROMAssessmentSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  visitId: z.string().uuid().optional(),
  clinicId: z.string().uuid(),
  therapistId: z.string().uuid(),
  joint: ROMJointSchema,
  side: ROMSideSchema,
  movementType: ROMMovementTypeSchema,
  degree: z.number().min(0).max(360),
  notes: z.string().optional(),
  assessedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
