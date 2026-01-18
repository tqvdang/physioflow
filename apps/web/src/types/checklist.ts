/**
 * Type definitions for the checklist-driven visit system
 */

import { BaseEntity } from "./index";

/**
 * Input types for checklist items
 */
export type ChecklistInputType =
  | "checkbox"
  | "pain_scale"
  | "rom"
  | "quick_select"
  | "yes_no_na"
  | "voice_text"
  | "multi_select"
  | "text"
  | "number"
  | "duration"
  | "strength_rating"
  | "compliance";

/**
 * A single option for quick_select or multi_select items
 */
export interface ChecklistOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * Range of Motion configuration
 */
export interface ROMConfig {
  minDegree: number;
  maxDegree: number;
  normalMin: number;
  normalMax: number;
  joint: string;
  movement: string;
}

/**
 * Template item definition (from checklist template)
 */
export interface ChecklistTemplateItem {
  id: string;
  label: string;
  inputType: ChecklistInputType;
  required: boolean;
  description?: string;
  options?: ChecklistOption[];
  romConfig?: ROMConfig;
  defaultValue?: string | number | boolean | string[];
  autoPopulateFrom?: "baseline" | "previous_visit";
  order: number;
}

/**
 * Template section definition
 */
export interface ChecklistTemplateSection {
  id: string;
  title: string;
  description?: string;
  required: boolean;
  order: number;
  items: ChecklistTemplateItem[];
}

/**
 * Checklist template
 */
export interface ChecklistTemplate extends BaseEntity {
  name: string;
  description?: string;
  specialtyId?: string;
  conditionId?: string;
  targetDurationMinutes: number;
  isQuickMode: boolean;
  sections: ChecklistTemplateSection[];
}

/**
 * Response value for a checklist item
 */
export type ChecklistResponseValue = string | number | boolean | string[] | null;

/**
 * Individual item response (user's answer)
 */
export interface ChecklistItemResponse {
  itemId: string;
  value: ChecklistResponseValue;
  previousValue?: ChecklistResponseValue;
  baselineValue?: ChecklistResponseValue;
  delta?: number;
  autoPopulated: boolean;
  completedAt?: string;
}

/**
 * Section response status
 */
export interface ChecklistSectionStatus {
  sectionId: string;
  completedItems: number;
  totalItems: number;
  requiredCompleted: number;
  requiredTotal: number;
  isComplete: boolean;
}

/**
 * Visit checklist instance (active session)
 */
export interface VisitChecklist extends BaseEntity {
  visitId: string;
  templateId: string;
  patientId: string;
  therapistId: string;
  template: ChecklistTemplate;
  responses: Record<string, ChecklistItemResponse>;
  sectionStatuses: Record<string, ChecklistSectionStatus>;
  status: "in_progress" | "completed" | "cancelled";
  startedAt: string;
  completedAt?: string;
  totalProgress: number;
  elapsedSeconds: number;
}

/**
 * SOAP note structure
 */
export interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

/**
 * Generated clinical note
 */
export interface GeneratedNote extends BaseEntity {
  checklistId: string;
  visitId: string;
  soapNote: SOAPNote;
  rawText: string;
  isEdited: boolean;
  signedAt?: string;
  signedBy?: string;
}

/**
 * Quick schedule option
 */
export interface QuickScheduleOption {
  label: string;
  days: number;
  type: "quick" | "custom";
}

/**
 * Timer state
 */
export interface TimerState {
  elapsedSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  targetSeconds: number;
  isOverTarget: boolean;
}

/**
 * Request to update a checklist response
 */
export interface UpdateResponseRequest {
  checklistId: string;
  itemId: string;
  value: ChecklistResponseValue;
}

/**
 * Request to complete a checklist
 */
export interface CompleteChecklistRequest {
  checklistId: string;
  elapsedSeconds: number;
}
