/**
 * Clinical types for PhysioFlow EMR
 */

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export type AssessmentStatus =
  | 'draft'
  | 'in_progress'
  | 'completed'
  | 'reviewed'
  | 'amended';

export type AssessmentType = 'initial' | 'follow_up' | 'discharge' | 're_evaluation';

export type TreatmentPlanStatus =
  | 'draft'
  | 'active'
  | 'on_hold'
  | 'completed'
  | 'discontinued';

export type SessionStatus =
  | 'scheduled'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type PainType =
  | 'sharp'
  | 'dull'
  | 'aching'
  | 'burning'
  | 'throbbing'
  | 'stabbing'
  | 'radiating'
  | 'cramping'
  | 'other';

export type BodyRegion =
  | 'head_neck'
  | 'cervical_spine'
  | 'thoracic_spine'
  | 'lumbar_spine'
  | 'shoulder_left'
  | 'shoulder_right'
  | 'elbow_left'
  | 'elbow_right'
  | 'wrist_hand_left'
  | 'wrist_hand_right'
  | 'hip_left'
  | 'hip_right'
  | 'knee_left'
  | 'knee_right'
  | 'ankle_foot_left'
  | 'ankle_foot_right'
  | 'chest'
  | 'abdomen'
  | 'pelvis'
  | 'other';

export type Prognosis = 'excellent' | 'good' | 'fair' | 'guarded' | 'poor';

export type Tolerance = 'good' | 'fair' | 'poor';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export type GoalStatus = 'active' | 'achieved' | 'modified' | 'discontinued';

export type GoalType = 'short_term' | 'long_term';

// -----------------------------------------------------------------------------
// Pain Measurement Types
// -----------------------------------------------------------------------------

export interface PainLocation {
  region: BodyRegion;
  currentLevel: number;
  worstLevel: number;
  bestLevel: number;
  painType: PainType;
  aggravatingFactors?: string[];
  relievingFactors?: string[];
  pattern24hr?: string;
}

export interface PainMeasurement {
  locations: PainLocation[];
  vasScore?: number;
  nprsScore?: number;
}

// -----------------------------------------------------------------------------
// ROM Measurement Types
// -----------------------------------------------------------------------------

export interface ROMValue {
  value: number;
  withinNormal: boolean;
  painful: boolean;
}

export interface ROMMovement {
  active?: ROMValue;
  passive?: ROMValue;
  notes?: string;
}

export interface ROMMeasurement {
  [joint: string]: {
    [movement: string]: ROMMovement;
  };
}

// -----------------------------------------------------------------------------
// Strength Measurement Types
// -----------------------------------------------------------------------------

export interface StrengthGrade {
  left?: string;
  right?: string;
  notes?: string;
}

export interface StrengthMeasurement {
  [muscleGroup: string]: StrengthGrade;
}

// -----------------------------------------------------------------------------
// Special Tests
// -----------------------------------------------------------------------------

export interface SpecialTest {
  testName: string;
  result: 'positive' | 'negative' | 'inconclusive';
  side?: 'left' | 'right' | 'bilateral';
  notes?: string;
}

// -----------------------------------------------------------------------------
// Outcome Measures
// -----------------------------------------------------------------------------

export interface OutcomeMeasure {
  score: number;
  date: string;
  interpretation?: string;
}

export interface OutcomeMeasures {
  [measureName: string]: OutcomeMeasure;
}

// -----------------------------------------------------------------------------
// Goals
// -----------------------------------------------------------------------------

export interface Goal {
  type: GoalType;
  description: string;
  descriptionVi?: string;
  targetDate?: string;
  measurableOutcome?: string;
  status: GoalStatus;
}

export interface TreatmentGoal {
  goal: string;
  goalVi?: string;
  targetDate?: string;
  measurableCriteria?: string;
  status: GoalStatus;
}

// -----------------------------------------------------------------------------
// Interventions
// -----------------------------------------------------------------------------

export type InterventionType =
  | 'manual_therapy'
  | 'therapeutic_exercise'
  | 'modality'
  | 'education'
  | 'other';

export interface InterventionParameters {
  sets?: number;
  reps?: number;
  duration?: string;
  frequency?: string;
  intensity?: string;
  resistance?: string;
}

export interface PlannedIntervention {
  type: InterventionType;
  name: string;
  nameVi?: string;
  description?: string;
  parameters: InterventionParameters;
  precautions?: string[];
  isActive: boolean;
}

export interface PerformedIntervention {
  interventionType: string;
  name: string;
  parameters: InterventionParameters;
  patientResponse?: string;
  durationMinutes?: number;
}

// -----------------------------------------------------------------------------
// Diagnosis
// -----------------------------------------------------------------------------

export interface Diagnosis {
  id: string;
  code: string;
  description: string;
  descriptionVi?: string;
  category?: string;
  isActive: boolean;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Medical History
// -----------------------------------------------------------------------------

export interface MedicalHistory {
  conditions?: string[];
  surgeries?: SurgicalHistory[];
  medications?: Medication[];
  allergies?: string[];
  familyHistory?: string[];
  socialHistory?: string;
}

export interface SurgicalHistory {
  procedure: string;
  date?: string;
  notes?: string;
}

export interface Medication {
  name: string;
  dosage?: string;
  frequency?: string;
  prescribedFor?: string;
}

// -----------------------------------------------------------------------------
// Timer Data
// -----------------------------------------------------------------------------

export interface TimerActivity {
  name: string;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  category: 'evaluation' | 'treatment' | 'documentation';
}

export interface SessionTimerData {
  activities: TimerActivity[];
  totalTreatmentTime: number;
  totalDocumentationTime: number;
}

// -----------------------------------------------------------------------------
// Auto-generated Notes
// -----------------------------------------------------------------------------

export interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface AutoGeneratedNotes {
  soapNote?: SOAPNote;
  soapNoteVi?: SOAPNote;
  generatedAt: string;
  generationVersion: string;
}

// -----------------------------------------------------------------------------
// Vitals
// -----------------------------------------------------------------------------

export interface Vitals {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
}

// -----------------------------------------------------------------------------
// Core Clinical Types
// -----------------------------------------------------------------------------

export interface Assessment {
  id: string;
  patientId: string;
  therapistId: string;
  clinicId: string;
  assessmentDate: string;
  assessmentType: AssessmentType;
  status: AssessmentStatus;
  chiefComplaint?: string;
  chiefComplaintVi?: string;
  onsetDate?: string;
  mechanismOfInjury?: string;
  mechanismOfInjuryVi?: string;
  medicalHistory: MedicalHistory;
  surgicalHistory: SurgicalHistory[];
  medications: Medication[];
  allergies?: string[];
  painData: PainMeasurement;
  romMeasurements: ROMMeasurement;
  strengthMeasurements: StrengthMeasurement;
  specialTests: SpecialTest[];
  functionalAssessment: Record<string, unknown>;
  gaitAnalysis?: string;
  gaitAnalysisVi?: string;
  balanceAssessment?: string;
  postureAssessment?: string;
  outcomeMeasures: OutcomeMeasures;
  clinicalImpression?: string;
  clinicalImpressionVi?: string;
  primaryDiagnosisId?: string;
  secondaryDiagnoses?: string[];
  goals: Goal[];
  prognosis?: Prognosis;
  prognosisNotes?: string;
  therapistSignatureAt?: string;
  supervisorId?: string;
  supervisorSignatureAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  primaryDiagnosis?: Diagnosis;
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  assessmentId?: string;
  therapistId: string;
  clinicId: string;
  planName?: string;
  status: TreatmentPlanStatus;
  startDate: string;
  endDate?: string;
  primaryDiagnosisId?: string;
  diagnosisDescription?: string;
  diagnosisDescriptionVi?: string;
  shortTermGoals: TreatmentGoal[];
  longTermGoals: TreatmentGoal[];
  interventions: PlannedIntervention[];
  frequencyPerWeek: number;
  sessionDurationMinutes: number;
  totalSessionsPlanned?: number;
  sessionsCompleted: number;
  precautions?: string[];
  contraindications?: string[];
  patientEducation: Record<string, unknown>[];
  homeExerciseProgram: HomeExercise[];
  progressNotes?: string;
  progressNotesVi?: string;
  insuranceAuthorizationNumber?: string;
  authorizedSessions?: number;
  authorizationValidUntil?: string;
  therapistSignatureAt?: string;
  patientConsentAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  primaryDiagnosis?: Diagnosis;
}

export interface TreatmentSession {
  id: string;
  patientId: string;
  treatmentPlanId?: string;
  therapistId: string;
  clinicId: string;
  appointmentId?: string;
  sessionDate: string;
  scheduledStartTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  durationMinutes?: number;
  status: SessionStatus;
  timerData: SessionTimerData;
  patientReport?: string;
  patientReportVi?: string;
  painLevelPre?: number;
  painLevelPost?: number;
  objectiveFindings: Record<string, unknown>;
  vitals: Vitals;
  interventionsPerformed: PerformedIntervention[];
  patientResponse?: string;
  patientResponseVi?: string;
  tolerance?: Tolerance;
  planForNext?: string;
  planForNextVi?: string;
  autoGeneratedNotes: AutoGeneratedNotes;
  finalNotes?: string;
  finalNotesVi?: string;
  billingCodes?: string[];
  unitsBilled: Record<string, number>;
  therapistSignatureAt?: string;
  patientSignatureAt?: string;
  cosignerId?: string;
  cosignerSignatureAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// -----------------------------------------------------------------------------
// Exercise Types
// -----------------------------------------------------------------------------

export interface Exercise {
  id: string;
  clinicId?: string;
  name: string;
  nameVi?: string;
  description?: string;
  descriptionVi?: string;
  instructions?: string;
  instructionsVi?: string;
  category: string;
  bodyRegions?: BodyRegion[];
  imageUrls?: string[];
  videoUrl?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultDurationSeconds?: number;
  difficultyLevel?: DifficultyLevel;
  equipmentNeeded?: string[];
  precautions?: string;
  precautionsVi?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface HomeExercise {
  exerciseId?: string;
  name: string;
  nameVi?: string;
  instructions?: string;
  instructionsVi?: string;
  sets?: number;
  reps?: number;
  durationSeconds?: number;
  frequency?: string;
  notes?: string;
}

// -----------------------------------------------------------------------------
// Request Types
// -----------------------------------------------------------------------------

export interface CreateAssessmentRequest {
  patientId: string;
  therapistId: string;
  clinicId: string;
  assessmentType?: AssessmentType;
  chiefComplaint?: string;
  chiefComplaintVi?: string;
  onsetDate?: string;
  mechanismOfInjury?: string;
  mechanismOfInjuryVi?: string;
}

export interface UpdateAssessmentRequest {
  status?: AssessmentStatus;
  chiefComplaint?: string;
  chiefComplaintVi?: string;
  onsetDate?: string;
  mechanismOfInjury?: string;
  mechanismOfInjuryVi?: string;
  medicalHistory?: MedicalHistory;
  painData?: PainMeasurement;
  romMeasurements?: ROMMeasurement;
  strengthMeasurements?: StrengthMeasurement;
  specialTests?: SpecialTest[];
  functionalAssessment?: Record<string, unknown>;
  gaitAnalysis?: string;
  gaitAnalysisVi?: string;
  balanceAssessment?: string;
  postureAssessment?: string;
  outcomeMeasures?: OutcomeMeasures;
  clinicalImpression?: string;
  clinicalImpressionVi?: string;
  primaryDiagnosisId?: string;
  secondaryDiagnoses?: string[];
  goals?: Goal[];
  prognosis?: Prognosis;
  prognosisNotes?: string;
}

export interface CreateTreatmentPlanRequest {
  patientId: string;
  assessmentId?: string;
  therapistId: string;
  clinicId: string;
  planName?: string;
  startDate: string;
  endDate?: string;
  primaryDiagnosisId?: string;
  diagnosisDescription?: string;
  diagnosisDescriptionVi?: string;
  frequencyPerWeek?: number;
  sessionDurationMinutes?: number;
  totalSessionsPlanned?: number;
}

export interface UpdateTreatmentPlanRequest {
  planName?: string;
  status?: TreatmentPlanStatus;
  endDate?: string;
  primaryDiagnosisId?: string;
  diagnosisDescription?: string;
  diagnosisDescriptionVi?: string;
  shortTermGoals?: TreatmentGoal[];
  longTermGoals?: TreatmentGoal[];
  interventions?: PlannedIntervention[];
  frequencyPerWeek?: number;
  sessionDurationMinutes?: number;
  totalSessionsPlanned?: number;
  precautions?: string[];
  contraindications?: string[];
  patientEducation?: Record<string, unknown>[];
  homeExerciseProgram?: HomeExercise[];
  progressNotes?: string;
  progressNotesVi?: string;
  insuranceAuthorizationNumber?: string;
  authorizedSessions?: number;
  authorizationValidUntil?: string;
}

export interface CreateTreatmentSessionRequest {
  patientId: string;
  treatmentPlanId?: string;
  therapistId: string;
  clinicId: string;
  appointmentId?: string;
  sessionDate: string;
  scheduledStartTime?: string;
}

export interface UpdateTreatmentSessionRequest {
  status?: SessionStatus;
  actualStartTime?: string;
  actualEndTime?: string;
  timerData?: SessionTimerData;
  patientReport?: string;
  patientReportVi?: string;
  painLevelPre?: number;
  painLevelPost?: number;
  objectiveFindings?: Record<string, unknown>;
  vitals?: Vitals;
  interventionsPerformed?: PerformedIntervention[];
  patientResponse?: string;
  patientResponseVi?: string;
  tolerance?: Tolerance;
  planForNext?: string;
  planForNextVi?: string;
  finalNotes?: string;
  finalNotesVi?: string;
  billingCodes?: string[];
  unitsBilled?: Record<string, number>;
}

export interface CreateExerciseRequest {
  clinicId?: string;
  name: string;
  nameVi?: string;
  description?: string;
  descriptionVi?: string;
  instructions?: string;
  instructionsVi?: string;
  category: string;
  bodyRegions?: BodyRegion[];
  imageUrls?: string[];
  videoUrl?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultDurationSeconds?: number;
  difficultyLevel?: DifficultyLevel;
  equipmentNeeded?: string[];
  precautions?: string;
  precautionsVi?: string;
}
