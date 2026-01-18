/**
 * API Response Types for PhysioFlow
 *
 * These types match the OpenAPI spec at /apps/api/api/openapi.yaml
 * They represent the raw API response format (snake_case) from the Go backend.
 */

// ============================================================================
// Common Types
// ============================================================================

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: Record<string, string>;
}

/**
 * Pagination metadata from API
 */
export interface ApiPaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

/**
 * Generic paginated response wrapper
 */
export interface ApiPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ============================================================================
// Patient Types (from API)
// ============================================================================

/**
 * Emergency contact information
 */
export interface ApiEmergencyContact {
  name?: string;
  phone?: string;
  relationship?: string;
}

/**
 * Patient entity from API (snake_case)
 */
export interface ApiPatient {
  id: string;
  clinic_id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  first_name_vi?: string;
  last_name_vi?: string;
  full_name: string;
  full_name_vi?: string;
  date_of_birth: string;
  age: number;
  gender: "male" | "female" | "other" | "prefer_not_to_say";
  phone?: string;
  email?: string;
  address?: string;
  address_vi?: string;
  language_preference: "vi" | "en";
  emergency_contact?: ApiEmergencyContact;
  medical_alerts?: string[];
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Request to create a patient
 */
export interface ApiCreatePatientRequest {
  first_name: string;
  last_name: string;
  first_name_vi?: string;
  last_name_vi?: string;
  date_of_birth: string;
  gender: "male" | "female" | "other" | "prefer_not_to_say";
  phone?: string;
  email?: string;
  address?: string;
  address_vi?: string;
  language_preference?: "vi" | "en";
  emergency_contact?: ApiEmergencyContact;
  medical_alerts?: string[];
  notes?: string;
}

/**
 * Request to update a patient
 */
export interface ApiUpdatePatientRequest {
  first_name?: string;
  last_name?: string;
  first_name_vi?: string;
  last_name_vi?: string;
  date_of_birth?: string;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  phone?: string;
  email?: string;
  address?: string;
  address_vi?: string;
  language_preference?: "vi" | "en";
  emergency_contact?: ApiEmergencyContact;
  medical_alerts?: string[];
  notes?: string;
  is_active?: boolean;
}

/**
 * Patient list response from API
 */
export type ApiPatientListResponse = ApiPaginatedResponse<ApiPatient>;

/**
 * Patient insurance information from API
 */
export interface ApiPatientInsurance {
  id: string;
  patient_id: string;
  provider: string;
  provider_type: "bhyt" | "private" | "corporate";
  policy_number: string;
  group_number?: string;
  coverage_percentage: number;
  copay_amount?: number;
  valid_from: string;
  valid_to?: string;
  is_primary: boolean;
  is_active: boolean;
  verification_status: "pending" | "verified" | "failed";
}

/**
 * Patient dashboard data from API
 */
export interface ApiPatientDashboard {
  patient: ApiPatient;
  total_appointments: number;
  upcoming_appointments: number;
  completed_sessions: number;
  active_treatment_plans: number;
  last_visit?: string;
  next_appointment?: string;
  insurance_info?: ApiPatientInsurance[];
}

/**
 * Duplicate match result from API
 */
export interface ApiDuplicateMatch {
  patient: ApiPatient;
  match_score: number;
  match_type: "phone" | "name";
}

/**
 * Duplicate check response from API
 */
export interface ApiDuplicateCheckResponse {
  duplicates: ApiDuplicateMatch[];
  count: number;
}

// ============================================================================
// Appointment Types (from API)
// ============================================================================

/**
 * Appointment status
 */
export type ApiAppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

/**
 * Appointment type
 */
export type ApiAppointmentType =
  | "assessment"
  | "treatment"
  | "followup"
  | "consultation"
  | "other";

/**
 * Recurrence pattern
 */
export type ApiRecurrencePattern =
  | "none"
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly";

/**
 * Appointment entity from API
 */
export interface ApiAppointment {
  id: string;
  clinic_id: string;
  patient_id: string;
  therapist_id: string;
  start_time: string;
  end_time: string;
  duration: number;
  type: ApiAppointmentType;
  status: ApiAppointmentStatus;
  room?: string;
  notes?: string;
  cancellation_reason?: string;
  recurrence_id?: string;
  patient_name?: string;
  patient_mrn?: string;
  patient_phone?: string;
  therapist_name?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Request to create an appointment
 */
export interface ApiCreateAppointmentRequest {
  patient_id: string;
  therapist_id: string;
  start_time: string;
  duration: number;
  type: ApiAppointmentType;
  room?: string;
  notes?: string;
  recurrence_pattern?: ApiRecurrencePattern;
  recurrence_end_date?: string;
  recurrence_count?: number;
}

/**
 * Request to update an appointment
 */
export interface ApiUpdateAppointmentRequest {
  start_time?: string;
  duration?: number;
  type?: ApiAppointmentType;
  status?: ApiAppointmentStatus;
  room?: string;
  notes?: string;
  therapist_id?: string;
}

/**
 * Therapist entity from API
 */
export interface ApiTherapist {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email?: string;
  specialty?: string;
  avatar_url?: string;
  is_active: boolean;
}

/**
 * Availability slot from API
 */
export interface ApiAvailabilitySlot {
  start_time: string;
  end_time: string;
  therapist_id: string;
  therapist_name?: string;
  duration: number;
}

/**
 * Day schedule from API
 */
export interface ApiDaySchedule {
  date: string;
  appointments: ApiAppointment[];
  total_count: number;
}

// ============================================================================
// Exercise Types (from API)
// ============================================================================

/**
 * Exercise category
 */
export type ApiExerciseCategory =
  | "stretching"
  | "strengthening"
  | "balance"
  | "cardiovascular"
  | "mobility"
  | "postural";

/**
 * Exercise difficulty
 */
export type ApiExerciseDifficulty = "beginner" | "intermediate" | "advanced";

/**
 * Muscle group
 */
export type ApiMuscleGroup =
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
 * Exercise entity from API
 */
export interface ApiExercise {
  id: string;
  clinic_id?: string;
  name: string;
  name_vi: string;
  description: string;
  description_vi: string;
  instructions: string;
  instructions_vi: string;
  category: ApiExerciseCategory;
  difficulty: ApiExerciseDifficulty;
  equipment: string[];
  muscle_groups: ApiMuscleGroup[];
  image_url?: string;
  video_url?: string;
  thumbnail_url?: string;
  default_sets: number;
  default_reps: number;
  default_hold_secs: number;
  precautions?: string;
  precautions_vi?: string;
  is_global: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Exercise list response from API
 */
export type ApiExerciseListResponse = ApiPaginatedResponse<ApiExercise>;

/**
 * Prescription status
 */
export type ApiPrescriptionStatus = "active" | "completed" | "paused" | "cancelled";

/**
 * Exercise prescription from API
 */
export interface ApiExercisePrescription {
  id: string;
  patient_id: string;
  exercise_id: string;
  program_id?: string;
  sets: number;
  reps: number;
  hold_seconds: number;
  frequency: string;
  duration_weeks: number;
  custom_instructions?: string;
  notes?: string;
  status: ApiPrescriptionStatus;
  start_date: string;
  end_date?: string;
  exercise?: ApiExercise;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Checklist Types (from API)
// ============================================================================

/**
 * Checklist input type
 */
export type ApiChecklistInputType =
  | "checkbox"
  | "pain_scale"
  | "rom"
  | "quick_select"
  | "yes_no_na"
  | "voice_text"
  | "multi_select"
  | "text"
  | "number";

/**
 * Checklist option
 */
export interface ApiChecklistOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * ROM configuration
 */
export interface ApiROMConfig {
  min_degree: number;
  max_degree: number;
  normal_min: number;
  normal_max: number;
  joint: string;
  movement: string;
}

/**
 * Checklist template item from API
 */
export interface ApiChecklistTemplateItem {
  id: string;
  label: string;
  input_type: ApiChecklistInputType;
  required: boolean;
  description?: string;
  options?: ApiChecklistOption[];
  rom_config?: ApiROMConfig;
  default_value?: string | number | boolean | string[];
  auto_populate_from?: "baseline" | "previous_visit";
  order: number;
}

/**
 * Checklist template section from API
 */
export interface ApiChecklistTemplateSection {
  id: string;
  title: string;
  description?: string;
  required: boolean;
  order: number;
  items: ApiChecklistTemplateItem[];
}

/**
 * Checklist template from API
 */
export interface ApiChecklistTemplate {
  id: string;
  name: string;
  description?: string;
  specialty_id?: string;
  condition_id?: string;
  target_duration_minutes: number;
  is_quick_mode: boolean;
  sections: ApiChecklistTemplateSection[];
  created_at: string;
  updated_at: string;
}

/**
 * Checklist response value
 */
export type ApiChecklistResponseValue = string | number | boolean | string[] | null;

/**
 * Checklist item response from API
 */
export interface ApiChecklistItemResponse {
  item_id: string;
  value: ApiChecklistResponseValue;
  previous_value?: ApiChecklistResponseValue;
  baseline_value?: ApiChecklistResponseValue;
  delta?: number;
  auto_populated: boolean;
  completed_at?: string;
}

/**
 * Section status from API
 */
export interface ApiChecklistSectionStatus {
  section_id: string;
  completed_items: number;
  total_items: number;
  required_completed: number;
  required_total: number;
  is_complete: boolean;
}

/**
 * Visit checklist from API
 */
export interface ApiVisitChecklist {
  id: string;
  visit_id: string;
  template_id: string;
  patient_id: string;
  therapist_id: string;
  template: ApiChecklistTemplate;
  responses: Record<string, ApiChecklistItemResponse>;
  section_statuses: Record<string, ApiChecklistSectionStatus>;
  status: "in_progress" | "completed" | "cancelled";
  started_at: string;
  completed_at?: string;
  total_progress: number;
  elapsed_seconds: number;
  created_at: string;
  updated_at: string;
}

/**
 * SOAP note structure from API
 */
export interface ApiSOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

/**
 * Generated note from API
 */
export interface ApiGeneratedNote {
  id: string;
  checklist_id: string;
  visit_id: string;
  soap_note: ApiSOAPNote;
  raw_text: string;
  is_edited: boolean;
  signed_at?: string;
  signed_by?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Health Check Types (from API)
// ============================================================================

/**
 * Health check response
 */
export interface ApiHealthResponse {
  status: string;
  timestamp: string;
  uptime: string;
}

/**
 * Readiness check response
 */
export interface ApiReadyResponse {
  status: "ready" | "not_ready";
  checks: Record<string, string>;
  ready: boolean;
}
