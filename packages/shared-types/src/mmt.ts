/**
 * Manual Muscle Testing (MMT) Assessment types for PhysioFlow EMR
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export type MMTSide = 'left' | 'right' | 'bilateral';

export type MMTTrendDirection = 'improved' | 'declined' | 'stable' | 'insufficient_data';

// Valid MMT grades: 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5
export type MMTGradeValue = 0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5;

// -----------------------------------------------------------------------------
// Grade descriptions
// -----------------------------------------------------------------------------

export interface MMTGradeDescription {
  grade: number;
  name: string;
  nameVi: string;
  description: string;
  descriptionVi: string;
}

export const MMT_GRADE_DESCRIPTIONS: MMTGradeDescription[] = [
  { grade: 0, name: 'Zero', nameVi: 'Khong', description: 'No contraction', descriptionVi: 'Khong co co' },
  { grade: 1, name: 'Trace', nameVi: 'Vet', description: 'Palpable contraction, no movement', descriptionVi: 'Co co nhe, khong cu dong' },
  { grade: 2, name: 'Poor', nameVi: 'Kem', description: 'Full ROM, gravity eliminated', descriptionVi: 'Tam van dong day du, loai bo trong luc' },
  { grade: 3, name: 'Fair', nameVi: 'Trung binh', description: 'Full ROM against gravity', descriptionVi: 'Tam van dong day du chong trong luc' },
  { grade: 4, name: 'Good', nameVi: 'Tot', description: 'Full ROM against moderate resistance', descriptionVi: 'Tam van dong day du chong luc trung binh' },
  { grade: 5, name: 'Normal', nameVi: 'Binh thuong', description: 'Full ROM against maximum resistance', descriptionVi: 'Tam van dong day du chong luc toi da' },
];

// -----------------------------------------------------------------------------
// Common muscle groups
// -----------------------------------------------------------------------------

export interface MuscleGroupDefinition {
  name: string;
  nameVi: string;
  region: string;
}

export const COMMON_MUSCLE_GROUPS: MuscleGroupDefinition[] = [
  // Upper extremity
  { name: 'Deltoid', nameVi: 'Co delta', region: 'shoulder' },
  { name: 'Biceps', nameVi: 'Co nhi dau canh tay', region: 'arm' },
  { name: 'Triceps', nameVi: 'Co tam dau canh tay', region: 'arm' },
  { name: 'Wrist Extensors', nameVi: 'Co duoi co tay', region: 'forearm' },
  { name: 'Wrist Flexors', nameVi: 'Co gap co tay', region: 'forearm' },
  { name: 'Grip', nameVi: 'Luc nam', region: 'hand' },
  { name: 'Rotator Cuff', nameVi: 'Chung quay vai', region: 'shoulder' },
  { name: 'Pectoralis Major', nameVi: 'Co nguc lon', region: 'chest' },
  { name: 'Latissimus Dorsi', nameVi: 'Co lung rong', region: 'back' },
  { name: 'Rhomboids', nameVi: 'Co hinh thoi', region: 'back' },
  { name: 'Trapezius', nameVi: 'Co thang', region: 'neck' },
  // Lower extremity
  { name: 'Hip Flexors', nameVi: 'Co gap hong', region: 'hip' },
  { name: 'Hip Extensors', nameVi: 'Co duoi hong', region: 'hip' },
  { name: 'Hip Abductors', nameVi: 'Co dang hong', region: 'hip' },
  { name: 'Hip Adductors', nameVi: 'Co khep hong', region: 'hip' },
  { name: 'Quadriceps', nameVi: 'Co tu dau dui', region: 'thigh' },
  { name: 'Hamstrings', nameVi: 'Co gap goi', region: 'thigh' },
  { name: 'Gastrocnemius', nameVi: 'Co bap chan', region: 'calf' },
  { name: 'Tibialis Anterior', nameVi: 'Co chay truoc', region: 'shin' },
  { name: 'Gluteus Maximus', nameVi: 'Co mong lon', region: 'hip' },
  { name: 'Gluteus Medius', nameVi: 'Co mong giua', region: 'hip' },
  // Core
  { name: 'Abdominals', nameVi: 'Co bung', region: 'core' },
  { name: 'Erector Spinae', nameVi: 'Co dung song', region: 'back' },
];

// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

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
  dataPoints: MMTTrendDataPoint[];
  baseline?: number;
  current?: number;
  change?: number;
  trend: MMTTrendDirection;
}

export interface MMTTrendDataPoint {
  grade: number;
  assessedAt: string;
  notes?: string;
}

// -----------------------------------------------------------------------------
// Request Types
// -----------------------------------------------------------------------------

export interface CreateMMTAssessmentRequest {
  patientId: string;
  visitId?: string;
  muscleGroup: string;
  side: MMTSide;
  grade: number;
  notes?: string;
  assessedAt?: string;
}

// -----------------------------------------------------------------------------
// Zod Schemas
// -----------------------------------------------------------------------------

export const MMTSideSchema = z.enum(['left', 'right', 'bilateral']);

const validMMTGrades = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const;

export const MMTGradeSchema = z.number()
  .min(0)
  .max(5)
  .refine(
    (val) => (validMMTGrades as readonly number[]).includes(val),
    { message: 'Grade must be 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, or 5' }
  );

export const CreateMMTAssessmentSchema = z.object({
  patientId: z.string().uuid(),
  visitId: z.string().uuid().optional(),
  muscleGroup: z.string().min(1).max(80),
  side: MMTSideSchema,
  grade: MMTGradeSchema,
  notes: z.string().max(2000).optional(),
  assessedAt: z.string().datetime().optional(),
});

export const MMTAssessmentSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  visitId: z.string().uuid().optional(),
  clinicId: z.string().uuid(),
  therapistId: z.string().uuid(),
  muscleGroup: z.string(),
  side: MMTSideSchema,
  grade: z.number().min(0).max(5),
  notes: z.string().optional(),
  assessedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
