/**
 * Clinical Protocols types for PhysioFlow EMR
 *
 * Note: The comprehensive Exercise interface lives in clinical.ts.
 * ProtocolExercise here is a lightweight representation for protocol definitions.
 */

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export type ProgressStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'discontinued';

// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

export interface ProtocolGoal {
  description: string;
  descriptionVi?: string;
  targetMetric?: string;
  targetValue?: number;
}

export interface ProtocolExercise {
  name: string;
  nameVi?: string;
  description?: string;
  descriptionVi?: string;
  sets?: number;
  reps?: number;
  duration?: string;
  videoUrl?: string;
}

export interface ProgressionCriterion {
  description: string;
  descriptionVi?: string;
  metric?: string;
  threshold?: number;
}

export interface ClinicalProtocol {
  id: string;
  clinicId?: string;
  protocolName: string;
  protocolNameVi: string;
  description?: string;
  descriptionVi?: string;
  condition: string;
  conditionVi?: string;
  goals: ProtocolGoal[];
  exercises: ProtocolExercise[];
  frequency: string;
  duration: string;
  progressionCriteria: ProgressionCriterion[];
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface PatientProtocol {
  id: string;
  patientId: string;
  protocolId: string;
  assignedDate: string;
  progressStatus: ProgressStatus;
  currentWeek: number;
  completedExercises: string[];
  notes?: string;
  notesVi?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  protocol?: ClinicalProtocol;
}

// -----------------------------------------------------------------------------
// Request Types
// -----------------------------------------------------------------------------

export interface CreateClinicalProtocolRequest {
  clinicId?: string;
  protocolName: string;
  protocolNameVi: string;
  description?: string;
  descriptionVi?: string;
  condition: string;
  conditionVi?: string;
  goals?: ProtocolGoal[];
  exercises?: ProtocolExercise[];
  frequency: string;
  duration: string;
  progressionCriteria?: ProgressionCriterion[];
}

export interface UpdateClinicalProtocolRequest {
  protocolName?: string;
  protocolNameVi?: string;
  description?: string;
  descriptionVi?: string;
  condition?: string;
  conditionVi?: string;
  goals?: ProtocolGoal[];
  exercises?: ProtocolExercise[];
  frequency?: string;
  duration?: string;
  progressionCriteria?: ProgressionCriterion[];
  isActive?: boolean;
}

export interface AssignPatientProtocolRequest {
  patientId: string;
  protocolId: string;
  assignedDate?: string;
  notes?: string;
  notesVi?: string;
}

export interface UpdatePatientProtocolRequest {
  progressStatus?: ProgressStatus;
  currentWeek?: number;
  completedExercises?: string[];
  notes?: string;
  notesVi?: string;
}

// -----------------------------------------------------------------------------
// Query Types
// -----------------------------------------------------------------------------

export interface ProtocolSearchParams {
  clinicId?: string;
  condition?: string;
  isActive?: boolean;
  query?: string;
  page?: number;
  limit?: number;
}

export interface PatientProtocolSearchParams {
  patientId: string;
  protocolId?: string;
  progressStatus?: ProgressStatus;
  page?: number;
  limit?: number;
}
