/**
 * Scheduling types for PhysioFlow EMR
 */

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled';

export type AppointmentType =
  | 'initial_evaluation'
  | 'follow_up'
  | 'discharge'
  | 're_evaluation'
  | 'consultation'
  | 'group_session';

export type RecurrencePattern =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'custom';

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type ConfirmationStatus = 'pending' | 'confirmed' | 'declined';

export type BillingStatus = 'pending' | 'billed' | 'paid' | 'cancelled';

export type WaitlistStatus = 'waiting' | 'offered' | 'scheduled' | 'cancelled' | 'expired';

export type ReminderType = 'email' | 'sms' | 'push' | 'phone_call';

export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export type ReminderResponseType = 'confirmed' | 'declined' | 'rescheduled';

export type ExceptionType = 'vacation' | 'sick' | 'training' | 'special_hours' | 'holiday';

// -----------------------------------------------------------------------------
// Schedule Types
// -----------------------------------------------------------------------------

export interface TimeSlot {
  start: string;
  end: string;
}

export interface WeeklySchedule {
  monday?: TimeSlot[];
  tuesday?: TimeSlot[];
  wednesday?: TimeSlot[];
  thursday?: TimeSlot[];
  friday?: TimeSlot[];
  saturday?: TimeSlot[];
  sunday?: TimeSlot[];
}

export interface TherapistSchedule {
  id: string;
  therapistId: string;
  clinicId: string;
  effectiveFrom: string;
  effectiveTo?: string;
  weeklySchedule: WeeklySchedule;
  defaultSlotDurationMinutes: number;
  bufferBetweenSlotsMinutes: number;
  maxPatientsPerSlot: number;
  isAcceptingNewPatients: boolean;
  settings: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface ScheduleException {
  id: string;
  therapistId?: string;
  clinicId?: string;
  exceptionDate: string;
  startTime?: string;
  endTime?: string;
  exceptionType: ExceptionType;
  isAvailable: boolean;
  reason?: string;
  notes?: string;
  specialHours?: TimeSlot[];
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface ScheduleSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  appointmentId?: string;
}

export interface DaySchedule {
  date: string;
  slots: ScheduleSlot[];
  exceptions: ScheduleException[];
}

// -----------------------------------------------------------------------------
// Appointment Type Configuration
// -----------------------------------------------------------------------------

export interface AppointmentTypeConfig {
  id: string;
  clinicId: string;
  name: string;
  nameVi?: string;
  code?: string;
  description?: string;
  descriptionVi?: string;
  defaultDurationMinutes: number;
  color?: string;
  icon?: string;
  requiresEvaluation: boolean;
  allowsGroup: boolean;
  maxGroupSize: number;
  defaultBillingCodes?: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Recurrence Types
// -----------------------------------------------------------------------------

export interface RecurrenceConfig {
  daysOfWeek?: DayOfWeek[];
  interval?: number;
  endDate?: string;
  occurrences?: number;
  exceptions?: string[];
}

// -----------------------------------------------------------------------------
// Core Appointment Types
// -----------------------------------------------------------------------------

export interface Appointment {
  id: string;
  clinicId: string;
  patientId: string;
  therapistId: string;
  appointmentTypeId?: string;
  treatmentPlanId?: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  appointmentType: AppointmentType;
  status: AppointmentStatus;
  recurrenceId?: string;
  recurrencePattern?: RecurrencePattern;
  recurrenceConfig?: RecurrenceConfig;
  isRecurring: boolean;
  recurrenceIndex?: number;
  room?: string;
  equipmentNeeded?: string[];
  notes?: string;
  notesVi?: string;
  patientInstructions?: string;
  patientInstructionsVi?: string;
  reminderSent: boolean;
  reminderSentAt?: string;
  confirmationStatus?: ConfirmationStatus;
  confirmedAt?: string;
  checkedInAt?: string;
  checkedInBy?: string;
  checkedOutAt?: string;
  checkedOutBy?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  rescheduledFromId?: string;
  rescheduledToId?: string;
  billingStatus?: BillingStatus;
  billingCodes?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// -----------------------------------------------------------------------------
// Waitlist Types
// -----------------------------------------------------------------------------

export interface WaitlistEntry {
  id: string;
  clinicId: string;
  patientId: string;
  therapistId?: string;
  appointmentType: AppointmentType;
  preferredDays?: DayOfWeek[];
  preferredTimeStart?: string;
  preferredTimeEnd?: string;
  priority: number;
  reason?: string;
  earliestDate: string;
  latestDate?: string;
  status: WaitlistStatus;
  offeredAppointmentId?: string;
  offeredAt?: string;
  offerExpiresAt?: string;
  contactMethod?: string;
  contactNotes?: string;
  scheduledAppointmentId?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// -----------------------------------------------------------------------------
// Reminder Types
// -----------------------------------------------------------------------------

export interface AppointmentReminder {
  id: string;
  appointmentId: string;
  reminderType: ReminderType;
  scheduledFor: string;
  hoursBefore: number;
  status: ReminderStatus;
  sentAt?: string;
  deliveredAt?: string;
  messageTemplate?: string;
  messageContent?: string;
  messageContentVi?: string;
  responseReceived: boolean;
  responseType?: ReminderResponseType;
  responseAt?: string;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Request Types
// -----------------------------------------------------------------------------

export interface CreateTherapistScheduleRequest {
  therapistId: string;
  clinicId: string;
  effectiveFrom: string;
  effectiveTo?: string;
  weeklySchedule: WeeklySchedule;
  defaultSlotDurationMinutes?: number;
  bufferBetweenSlotsMinutes?: number;
  maxPatientsPerSlot?: number;
  isAcceptingNewPatients?: boolean;
}

export interface UpdateTherapistScheduleRequest {
  effectiveFrom?: string;
  effectiveTo?: string;
  weeklySchedule?: WeeklySchedule;
  defaultSlotDurationMinutes?: number;
  bufferBetweenSlotsMinutes?: number;
  maxPatientsPerSlot?: number;
  isAcceptingNewPatients?: boolean;
  isActive?: boolean;
}

export interface CreateScheduleExceptionRequest {
  therapistId?: string;
  clinicId?: string;
  exceptionDate: string;
  startTime?: string;
  endTime?: string;
  exceptionType: ExceptionType;
  isAvailable?: boolean;
  reason?: string;
  notes?: string;
  specialHours?: TimeSlot[];
}

export interface CreateAppointmentRequest {
  clinicId: string;
  patientId: string;
  therapistId: string;
  appointmentTypeId?: string;
  treatmentPlanId?: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  appointmentType: AppointmentType;
  room?: string;
  equipmentNeeded?: string[];
  notes?: string;
  notesVi?: string;
  patientInstructions?: string;
  patientInstructionsVi?: string;
  recurrencePattern?: RecurrencePattern;
  recurrenceConfig?: RecurrenceConfig;
}

export interface UpdateAppointmentRequest {
  appointmentDate?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  appointmentType?: AppointmentType;
  status?: AppointmentStatus;
  room?: string;
  equipmentNeeded?: string[];
  notes?: string;
  notesVi?: string;
  patientInstructions?: string;
  patientInstructionsVi?: string;
  billingStatus?: BillingStatus;
  billingCodes?: string[];
}

export interface RescheduleAppointmentRequest {
  newDate: string;
  newStartTime: string;
  newEndTime: string;
  reason?: string;
  notifyPatient?: boolean;
}

export interface CancelAppointmentRequest {
  reason: string;
  notifyPatient?: boolean;
  cancelSeries?: boolean;
}

export interface CheckInRequest {
  appointmentId: string;
}

export interface CheckOutRequest {
  appointmentId: string;
}

export interface CreateWaitlistEntryRequest {
  clinicId: string;
  patientId: string;
  therapistId?: string;
  appointmentType: AppointmentType;
  preferredDays?: DayOfWeek[];
  preferredTimeStart?: string;
  preferredTimeEnd?: string;
  priority?: number;
  reason?: string;
  earliestDate?: string;
  latestDate?: string;
  contactMethod?: string;
  contactNotes?: string;
}

export interface CreateAppointmentReminderRequest {
  appointmentId: string;
  reminderType: ReminderType;
  hoursBefore: number;
  messageTemplate?: string;
}

// -----------------------------------------------------------------------------
// Query Types
// -----------------------------------------------------------------------------

export interface AppointmentSearchParams {
  clinicId: string;
  patientId?: string;
  therapistId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: AppointmentStatus[];
  appointmentType?: AppointmentType[];
  page?: number;
  limit?: number;
}

export interface AvailableSlotsParams {
  clinicId: string;
  therapistId: string;
  date: string;
  durationMinutes?: number;
}

export interface CalendarViewParams {
  clinicId: string;
  therapistId?: string;
  startDate: string;
  endDate: string;
}

// -----------------------------------------------------------------------------
// Response Types
// -----------------------------------------------------------------------------

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  therapistId: string;
  therapistName: string;
}

export interface CalendarDay {
  date: string;
  appointments: Appointment[];
  availableSlots: AvailableSlot[];
}

export interface CalendarView {
  days: CalendarDay[];
}
