/**
 * Exercise-related type definitions for PhysioFlow
 */

import { BaseEntity } from "./index";

/**
 * Exercise category
 */
export type ExerciseCategory =
  | "stretching"
  | "strengthening"
  | "balance"
  | "cardiovascular"
  | "mobility"
  | "postural";

/**
 * Exercise difficulty
 */
export type ExerciseDifficulty = "beginner" | "intermediate" | "advanced";

/**
 * Muscle group
 */
export type MuscleGroup =
  | "neck"
  | "shoulder"
  | "upper_back"
  | "lower_back"
  | "chest"
  | "core"
  | "hip"
  | "glutes"
  | "quadriceps"
  | "hamstrings"
  | "calves"
  | "ankle"
  | "wrist_forearm"
  | "elbow"
  | "full_body";

/**
 * Prescription status
 */
export type PrescriptionStatus = "active" | "completed" | "paused" | "cancelled";

/**
 * Exercise entity
 */
export interface Exercise extends BaseEntity {
  clinicId?: string;
  name: string;
  nameVi: string;
  description: string;
  descriptionVi: string;
  instructions: string;
  instructionsVi: string;
  category: ExerciseCategory;
  difficulty: ExerciseDifficulty;
  equipment: string[];
  muscleGroups: MuscleGroup[];
  imageUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  defaultSets: number;
  defaultReps: number;
  defaultHoldSecs: number;
  precautions?: string;
  precautionsVi?: string;
  isGlobal: boolean;
  isActive: boolean;
}

/**
 * Exercise prescription
 */
export interface ExercisePrescription extends BaseEntity {
  patientId: string;
  exerciseId: string;
  programId?: string;
  sets: number;
  reps: number;
  holdSeconds: number;
  frequency: string;
  durationWeeks: number;
  customInstructions?: string;
  notes?: string;
  status: PrescriptionStatus;
  startDate: string;
  endDate?: string;
  exercise?: Exercise;
}

/**
 * Home exercise program
 */
export interface HomeExerciseProgram extends BaseEntity {
  patientId: string;
  name: string;
  nameVi?: string;
  description?: string;
  descriptionVi?: string;
  frequency: string;
  durationWeeks: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  exercises?: ExercisePrescription[];
}

/**
 * Exercise compliance log
 */
export interface ExerciseComplianceLog {
  id: string;
  prescriptionId: string;
  completedAt: string;
  setsCompleted: number;
  repsCompleted: number;
  painLevel?: number;
  difficulty?: "easy" | "moderate" | "hard";
  notes?: string;
}

/**
 * Patient compliance summary
 */
export interface PatientComplianceSummary {
  totalPrescriptions: number;
  activePrescriptions: number;
  completedPrescriptions: number;
  totalComplianceLogs: number;
  complianceRate: number;
  lastActivityDate?: string;
}

/**
 * Exercise search parameters
 */
export interface ExerciseSearchParams {
  page?: number;
  perPage?: number;
  search?: string;
  category?: ExerciseCategory;
  difficulty?: ExerciseDifficulty;
  muscleGroups?: MuscleGroup[];
  sortBy?: "name" | "name_vi" | "category" | "difficulty" | "created_at";
  sortOrder?: "asc" | "desc";
}

/**
 * Create exercise request
 */
export interface CreateExerciseRequest {
  name: string;
  nameVi: string;
  description?: string;
  descriptionVi?: string;
  instructions?: string;
  instructionsVi?: string;
  category: ExerciseCategory;
  difficulty: ExerciseDifficulty;
  equipment?: string[];
  muscleGroups: MuscleGroup[];
  imageUrl?: string;
  videoUrl?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultHoldSecs?: number;
  precautions?: string;
  precautionsVi?: string;
}

/**
 * Update exercise request
 */
export interface UpdateExerciseRequest extends Partial<CreateExerciseRequest> {
  isActive?: boolean;
}

/**
 * Prescribe exercise request
 */
export interface PrescribeExerciseRequest {
  exerciseId: string;
  programId?: string;
  sets?: number;
  reps?: number;
  holdSeconds?: number;
  frequency: string;
  durationWeeks: number;
  customInstructions?: string;
  notes?: string;
  startDate?: string;
}

/**
 * Update prescription request
 */
export interface UpdatePrescriptionRequest {
  sets?: number;
  reps?: number;
  holdSeconds?: number;
  frequency?: string;
  durationWeeks?: number;
  customInstructions?: string;
  notes?: string;
  status?: PrescriptionStatus;
}

/**
 * Log compliance request
 */
export interface LogComplianceRequest {
  setsCompleted: number;
  repsCompleted: number;
  painLevel?: number;
  difficulty?: "easy" | "moderate" | "hard";
  notes?: string;
}

/**
 * Category display info
 */
export const CATEGORY_INFO: Record<
  ExerciseCategory,
  { label: string; labelVi: string; color: string }
> = {
  stretching: {
    label: "Stretching",
    labelVi: "Keo gian",
    color: "bg-blue-100 text-blue-800",
  },
  strengthening: {
    label: "Strengthening",
    labelVi: "Tang cuong",
    color: "bg-green-100 text-green-800",
  },
  balance: {
    label: "Balance",
    labelVi: "Thang bang",
    color: "bg-purple-100 text-purple-800",
  },
  cardiovascular: {
    label: "Cardiovascular",
    labelVi: "Tim mach",
    color: "bg-red-100 text-red-800",
  },
  mobility: {
    label: "Mobility",
    labelVi: "Di dong",
    color: "bg-yellow-100 text-yellow-800",
  },
  postural: {
    label: "Postural",
    labelVi: "Tu the",
    color: "bg-orange-100 text-orange-800",
  },
};

/**
 * Difficulty display info
 */
export const DIFFICULTY_INFO: Record<
  ExerciseDifficulty,
  { label: string; labelVi: string; color: string }
> = {
  beginner: {
    label: "Beginner",
    labelVi: "Co ban",
    color: "bg-green-100 text-green-800",
  },
  intermediate: {
    label: "Intermediate",
    labelVi: "Trung binh",
    color: "bg-yellow-100 text-yellow-800",
  },
  advanced: {
    label: "Advanced",
    labelVi: "Nang cao",
    color: "bg-red-100 text-red-800",
  },
};

/**
 * Muscle group display info
 */
export const MUSCLE_GROUP_INFO: Record<
  MuscleGroup,
  { label: string; labelVi: string }
> = {
  neck: { label: "Neck", labelVi: "Co" },
  shoulder: { label: "Shoulder", labelVi: "Vai" },
  upper_back: { label: "Upper Back", labelVi: "Lung tren" },
  lower_back: { label: "Lower Back", labelVi: "Lung duoi" },
  chest: { label: "Chest", labelVi: "Nguc" },
  core: { label: "Core", labelVi: "Co bung" },
  hip: { label: "Hip", labelVi: "Hong" },
  glutes: { label: "Glutes", labelVi: "Mong" },
  quadriceps: { label: "Quadriceps", labelVi: "Co dui truoc" },
  hamstrings: { label: "Hamstrings", labelVi: "Co dui sau" },
  calves: { label: "Calves", labelVi: "Bap chan" },
  ankle: { label: "Ankle", labelVi: "Mat ca chan" },
  wrist_forearm: { label: "Wrist/Forearm", labelVi: "Co tay/Cang tay" },
  elbow: { label: "Elbow", labelVi: "Khuyu tay" },
  full_body: { label: "Full Body", labelVi: "Toan than" },
};
