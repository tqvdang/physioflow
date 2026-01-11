/**
 * Checklist types for PhysioFlow EMR
 */

import { BodyRegion } from './clinical';

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export type ChecklistItemType =
  | 'checkbox'
  | 'radio'
  | 'text'
  | 'number'
  | 'scale'
  | 'multi_select'
  | 'date'
  | 'time'
  | 'duration'
  | 'body_diagram'
  | 'signature';

export type ChecklistStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'reviewed'
  | 'locked';

export type NoteGenerationStatus =
  | 'pending'
  | 'generating'
  | 'completed'
  | 'failed';

// -----------------------------------------------------------------------------
// Item Configuration Types
// -----------------------------------------------------------------------------

export interface CheckboxConfig {
  defaultChecked?: boolean;
}

export interface SelectOption {
  value: string;
  label: string;
  labelVi?: string;
}

export interface RadioConfig {
  options: SelectOption[];
  otherOption?: boolean;
}

export interface MultiSelectConfig {
  options: SelectOption[];
  otherOption?: boolean;
  maxSelections?: number;
}

export interface ScaleConfig {
  min: number;
  max: number;
  step?: number;
  labels?: {
    min: string;
    max: string;
  };
}

export interface NumberConfig {
  min?: number;
  max?: number;
  unit?: string;
  unitVi?: string;
}

export interface BodyDiagramConfig {
  view: 'anterior' | 'posterior' | 'both';
  allowMultiple?: boolean;
}

export type ChecklistItemConfig =
  | CheckboxConfig
  | RadioConfig
  | MultiSelectConfig
  | ScaleConfig
  | NumberConfig
  | BodyDiagramConfig
  | Record<string, unknown>;

// -----------------------------------------------------------------------------
// Validation and Display Rules
// -----------------------------------------------------------------------------

export interface ValidationRules {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  customMessage?: string;
  customMessageVi?: string;
}

export interface DisplayConditionRule {
  itemId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: unknown;
  logic?: 'AND' | 'OR';
}

export interface DisplayConditions {
  rules?: DisplayConditionRule[];
}

// -----------------------------------------------------------------------------
// Quick Phrases
// -----------------------------------------------------------------------------

export interface QuickPhrase {
  phrase: string;
  phraseVi?: string;
}

export interface QuickPhraseLibrary {
  id: string;
  clinicId?: string;
  userId?: string;
  phrase: string;
  phraseVi?: string;
  shortcut?: string;
  category: string;
  subcategory?: string;
  tags?: string[];
  usageCount: number;
  lastUsedAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// -----------------------------------------------------------------------------
// Clinical Decision Support
// -----------------------------------------------------------------------------

export interface CDSRule {
  condition: {
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
    value: unknown;
  };
  alertType: 'info' | 'warning' | 'critical';
  message: string;
  messageVi?: string;
}

// -----------------------------------------------------------------------------
// Data Mapping
// -----------------------------------------------------------------------------

export interface DataMapping {
  sourceField?: string;
  targetField?: string;
  transform?: 'text' | 'json_path';
}

// -----------------------------------------------------------------------------
// Template Settings
// -----------------------------------------------------------------------------

export interface ChecklistTemplateSettings {
  allowSkip?: boolean;
  requireAllSections?: boolean;
  autoSaveIntervalSeconds?: number;
  showProgressBar?: boolean;
  enableQuickPhrases?: boolean;
  defaultLanguage?: 'en' | 'vi';
}

// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

export interface ChecklistTemplate {
  id: string;
  clinicId?: string;
  name: string;
  nameVi?: string;
  description?: string;
  descriptionVi?: string;
  code?: string;
  templateType: string;
  bodyRegion?: BodyRegion;
  applicableDiagnoses?: string[];
  version: number;
  isCurrentVersion: boolean;
  previousVersionId?: string;
  settings: ChecklistTemplateSettings;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  sections?: ChecklistSection[];
}

export interface ChecklistSection {
  id: string;
  templateId: string;
  title: string;
  titleVi?: string;
  description?: string;
  descriptionVi?: string;
  sortOrder: number;
  isRequired: boolean;
  isCollapsible: boolean;
  defaultCollapsed: boolean;
  displayConditions: DisplayConditions;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  items?: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  sectionId: string;
  label: string;
  labelVi?: string;
  helpText?: string;
  helpTextVi?: string;
  itemType: ChecklistItemType;
  itemConfig: ChecklistItemConfig;
  sortOrder: number;
  isRequired: boolean;
  validationRules: ValidationRules;
  displayConditions: DisplayConditions;
  quickPhrases: QuickPhrase[];
  dataMapping: DataMapping;
  cdsRules: CDSRule[];
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Visit Checklist (Instance)
// -----------------------------------------------------------------------------

export interface VisitChecklist {
  id: string;
  templateId: string;
  templateVersion: number;
  patientId: string;
  treatmentSessionId?: string;
  assessmentId?: string;
  therapistId: string;
  clinicId: string;
  status: ChecklistStatus;
  progressPercentage: number;
  startedAt?: string;
  completedAt?: string;
  lockedAt?: string;
  lockedBy?: string;
  lastAutoSaveAt?: string;
  autoSaveData: Record<string, unknown>;
  generatedNote?: string;
  generatedNoteVi?: string;
  noteGenerationStatus?: NoteGenerationStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  template?: ChecklistTemplate;
  responses?: ChecklistResponse[];
}

// -----------------------------------------------------------------------------
// Response Types
// -----------------------------------------------------------------------------

export interface CheckboxResponse {
  checked: boolean;
}

export interface RadioResponse {
  selected: string;
}

export interface MultiSelectResponse {
  selected: string[];
}

export interface TextResponse {
  text: string;
}

export interface NumberResponse {
  value: number;
}

export interface ScaleResponse {
  value: number;
}

export interface DateResponse {
  date: string;
}

export interface TimeResponse {
  time: string;
}

export interface DurationResponse {
  minutes: number;
}

export interface BodyDiagramPoint {
  x: number;
  y: number;
  label?: string;
}

export interface BodyDiagramResponse {
  points: BodyDiagramPoint[];
}

export interface SignatureResponse {
  signatureData: string;
  signedAt: string;
}

export type ChecklistResponseValue =
  | CheckboxResponse
  | RadioResponse
  | MultiSelectResponse
  | TextResponse
  | NumberResponse
  | ScaleResponse
  | DateResponse
  | TimeResponse
  | DurationResponse
  | BodyDiagramResponse
  | SignatureResponse;

export interface ResponseHistoryEntry {
  value: ChecklistResponseValue;
  changedAt: string;
  changedBy: string;
}

export interface TriggeredAlert {
  ruleIndex: number;
  alertType: 'info' | 'warning' | 'critical';
  message: string;
  messageVi?: string;
  triggeredAt: string;
}

export interface ChecklistResponse {
  id: string;
  visitChecklistId: string;
  checklistItemId: string;
  responseValue: ChecklistResponseValue;
  isSkipped: boolean;
  skipReason?: string;
  triggeredAlerts: TriggeredAlert[];
  responseHistory: ResponseHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// -----------------------------------------------------------------------------
// Request Types
// -----------------------------------------------------------------------------

export interface CreateChecklistTemplateRequest {
  clinicId?: string;
  name: string;
  nameVi?: string;
  description?: string;
  descriptionVi?: string;
  code?: string;
  templateType: string;
  bodyRegion?: BodyRegion;
  applicableDiagnoses?: string[];
  settings?: ChecklistTemplateSettings;
}

export interface CreateChecklistSectionRequest {
  templateId: string;
  title: string;
  titleVi?: string;
  description?: string;
  descriptionVi?: string;
  sortOrder?: number;
  isRequired?: boolean;
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
  displayConditions?: DisplayConditions;
}

export interface CreateChecklistItemRequest {
  sectionId: string;
  label: string;
  labelVi?: string;
  helpText?: string;
  helpTextVi?: string;
  itemType: ChecklistItemType;
  itemConfig?: ChecklistItemConfig;
  sortOrder?: number;
  isRequired?: boolean;
  validationRules?: ValidationRules;
  displayConditions?: DisplayConditions;
  quickPhrases?: QuickPhrase[];
  cdsRules?: CDSRule[];
}

export interface StartVisitChecklistRequest {
  templateId: string;
  patientId: string;
  treatmentSessionId?: string;
  assessmentId?: string;
  therapistId: string;
  clinicId: string;
}

export interface SaveChecklistResponseRequest {
  visitChecklistId: string;
  checklistItemId: string;
  responseValue: ChecklistResponseValue;
  isSkipped?: boolean;
  skipReason?: string;
}

export interface AutoSaveChecklistRequest {
  visitChecklistId: string;
  data: Record<string, unknown>;
}

export interface CompleteVisitChecklistRequest {
  visitChecklistId: string;
  generateNote?: boolean;
}

export interface CreateQuickPhraseRequest {
  clinicId?: string;
  userId?: string;
  phrase: string;
  phraseVi?: string;
  shortcut?: string;
  category: string;
  subcategory?: string;
  tags?: string[];
}
