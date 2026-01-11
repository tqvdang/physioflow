/**
 * Patient-related type definitions for PhysioFlow
 */

import { BaseEntity } from "./index";

/**
 * Patient status
 */
export type PatientStatus = "active" | "inactive" | "discharged" | "pending";

/**
 * Gender
 */
export type Gender = "male" | "female" | "other";

/**
 * Insurance type
 */
export type InsuranceType = "bhyt" | "private" | "self_pay";

/**
 * Patient entity
 */
export interface Patient extends BaseEntity {
  mrn: string;
  nameVi: string;
  nameEn?: string;
  dateOfBirth: string;
  gender: Gender;
  phone: string;
  email?: string;
  address?: string;
  photoUrl?: string;
  status: PatientStatus;
  insuranceType?: InsuranceType;
  insuranceNumber?: string;
  insuranceExpiry?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  lastVisitDate?: string;
  primaryTherapistId?: string;
  primaryTherapistName?: string;
}

/**
 * Patient list query parameters
 */
export interface PatientListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: PatientStatus;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Create patient request
 */
export interface CreatePatientRequest {
  nameVi: string;
  nameEn?: string;
  dateOfBirth: string;
  gender: Gender;
  phone: string;
  email?: string;
  address?: string;
  insuranceType?: InsuranceType;
  insuranceNumber?: string;
  insuranceExpiry?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
}

/**
 * Update patient request
 */
export interface UpdatePatientRequest extends Partial<CreatePatientRequest> {
  status?: PatientStatus;
  photoUrl?: string;
}

/**
 * Patient quick stats
 */
export interface PatientQuickStats {
  painLevel: number; // 0-10
  romProgress: number; // 0-100 percentage
  goalProgress: number; // 0-100 percentage
  totalSessions: number;
  completedSessions: number;
}

/**
 * Patient session
 */
export interface PatientSession extends BaseEntity {
  patientId: string;
  therapistId: string;
  therapistName: string;
  sessionDate: string;
  duration: number; // minutes
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  notes?: string;
  painLevelBefore?: number;
  painLevelAfter?: number;
  exercises?: SessionExercise[];
}

/**
 * Session exercise
 */
export interface SessionExercise {
  exerciseId: string;
  exerciseName: string;
  sets?: number;
  reps?: number;
  duration?: number;
  notes?: string;
}

/**
 * Patient timeline entry
 */
export interface PatientTimelineEntry {
  id: string;
  type: "session" | "note" | "document" | "measurement";
  title: string;
  description?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
