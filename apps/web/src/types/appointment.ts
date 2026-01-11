/**
 * Appointment-related type definitions for PhysioFlow
 */

import { BaseEntity } from "./index";

/**
 * Appointment status
 */
export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

/**
 * Appointment type
 */
export type AppointmentType =
  | "assessment"
  | "treatment"
  | "followup"
  | "consultation"
  | "other";

/**
 * Recurrence pattern for recurring appointments
 */
export type RecurrencePattern =
  | "none"
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly";

/**
 * Appointment entity
 */
export interface Appointment extends BaseEntity {
  clinicId: string;
  patientId: string;
  therapistId: string;
  startTime: string;
  endTime: string;
  duration: number;
  type: AppointmentType;
  status: AppointmentStatus;
  room?: string;
  notes?: string;
  cancellationReason?: string;
  recurrenceId?: string;
  patientName?: string;
  patientMrn?: string;
  patientPhone?: string;
  therapistName?: string;
}

/**
 * Therapist entity for selection
 */
export interface Therapist {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  specialty?: string;
  avatarUrl?: string;
  isActive: boolean;
}

/**
 * Available time slot
 */
export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  therapistId: string;
  therapistName?: string;
  duration: number;
}

/**
 * Day schedule
 */
export interface DaySchedule {
  date: string;
  appointments: Appointment[];
  totalCount: number;
}

/**
 * Appointment list query parameters
 */
export interface AppointmentListParams {
  page?: number;
  perPage?: number;
  patientId?: string;
  therapistId?: string;
  startDate?: string;
  endDate?: string;
  status?: AppointmentStatus;
  type?: AppointmentType;
  room?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Create appointment request
 */
export interface CreateAppointmentRequest {
  patientId: string;
  therapistId: string;
  startTime: string;
  duration: number;
  type: AppointmentType;
  room?: string;
  notes?: string;
  recurrencePattern?: RecurrencePattern;
  recurrenceEndDate?: string;
  recurrenceCount?: number;
}

/**
 * Update appointment request
 */
export interface UpdateAppointmentRequest {
  startTime?: string;
  duration?: number;
  type?: AppointmentType;
  status?: AppointmentStatus;
  room?: string;
  notes?: string;
  therapistId?: string;
}

/**
 * Cancel appointment request
 */
export interface CancelAppointmentRequest {
  reason?: string;
  cancelSeries?: boolean;
}

/**
 * Calendar view type
 */
export type CalendarView = "day" | "week" | "month";

/**
 * Appointment color mapping by type
 */
export const appointmentTypeColors: Record<AppointmentType, string> = {
  assessment: "bg-purple-500",
  treatment: "bg-blue-500",
  followup: "bg-green-500",
  consultation: "bg-orange-500",
  other: "bg-gray-500",
};

/**
 * Appointment status colors
 */
export const appointmentStatusColors: Record<AppointmentStatus, string> = {
  scheduled: "bg-gray-100 text-gray-700",
  confirmed: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-orange-100 text-orange-700",
};

/**
 * Helper to get appointment border color class
 */
export function getAppointmentBorderColor(type: AppointmentType): string {
  const colors: Record<AppointmentType, string> = {
    assessment: "border-l-purple-500",
    treatment: "border-l-blue-500",
    followup: "border-l-green-500",
    consultation: "border-l-orange-500",
    other: "border-l-gray-500",
  };
  return colors[type] ?? "border-l-gray-500";
}

/**
 * Helper to get appointment background color class
 */
export function getAppointmentBgColor(type: AppointmentType): string {
  const colors: Record<AppointmentType, string> = {
    assessment: "bg-purple-50 hover:bg-purple-100",
    treatment: "bg-blue-50 hover:bg-blue-100",
    followup: "bg-green-50 hover:bg-green-100",
    consultation: "bg-orange-50 hover:bg-orange-100",
    other: "bg-gray-50 hover:bg-gray-100",
  };
  return colors[type] ?? "bg-gray-50 hover:bg-gray-100";
}

/**
 * Duration options for appointments (in minutes)
 */
export const durationOptions = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
];

/**
 * Appointment type options
 */
export const appointmentTypeOptions: { value: AppointmentType; label: string }[] = [
  { value: "assessment", label: "Assessment" },
  { value: "treatment", label: "Treatment" },
  { value: "followup", label: "Follow-up" },
  { value: "consultation", label: "Consultation" },
  { value: "other", label: "Other" },
];

/**
 * Recurrence pattern options
 */
export const recurrenceOptions: { value: RecurrencePattern; label: string }[] = [
  { value: "none", label: "No repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
];
