package model

import (
	"encoding/json"
	"time"
)

// ProgressStatus represents the progress state of a patient following a protocol.
type ProgressStatus string

const (
	ProgressStatusNotStarted  ProgressStatus = "not_started"
	ProgressStatusOnTrack     ProgressStatus = "on_track"
	ProgressStatusBehind      ProgressStatus = "behind"
	ProgressStatusAhead       ProgressStatus = "ahead"
	ProgressStatusCompleted   ProgressStatus = "completed"
	ProgressStatusDiscontinued ProgressStatus = "discontinued"
)

// ProtocolPhase represents a named phase within a treatment protocol.
type ProtocolPhase string

const (
	ProtocolPhaseAcute        ProtocolPhase = "acute"
	ProtocolPhaseSubacute     ProtocolPhase = "subacute"
	ProtocolPhaseStrengthening ProtocolPhase = "strengthening"
	ProtocolPhaseReturn       ProtocolPhase = "return_to_activity"
	ProtocolPhaseMaintenance  ProtocolPhase = "maintenance"
)

// ProtocolCategory groups protocols by condition type.
type ProtocolCategory string

const (
	ProtocolCategoryOrthopedic   ProtocolCategory = "orthopedic"
	ProtocolCategoryNeurological ProtocolCategory = "neurological"
	ProtocolCategoryCardiopulm   ProtocolCategory = "cardiopulmonary"
	ProtocolCategoryPediatric    ProtocolCategory = "pediatric"
	ProtocolCategoryGeriatric    ProtocolCategory = "geriatric"
	ProtocolCategorySports       ProtocolCategory = "sports"
	ProtocolCategoryPostSurgical ProtocolCategory = "post_surgical"
	ProtocolCategoryPainMgmt     ProtocolCategory = "pain_management"
	ProtocolCategoryCustom       ProtocolCategory = "custom"
)

// ClinicalProtocol represents a standardized treatment protocol template.
type ClinicalProtocol struct {
	ID               string           `json:"id" db:"id"`
	ClinicID         *string          `json:"clinic_id,omitempty" db:"clinic_id"`
	Code             string           `json:"code" db:"code" validate:"required,max=50"`
	Name             string           `json:"name" db:"name" validate:"required,max=200"`
	NameVi           string           `json:"name_vi" db:"name_vi" validate:"required,max=200"`
	Description      string           `json:"description,omitempty" db:"description"`
	DescriptionVi    string           `json:"description_vi,omitempty" db:"description_vi"`
	Category         ProtocolCategory `json:"category" db:"category"`
	Condition        string           `json:"condition" db:"condition"`
	ConditionVi      string           `json:"condition_vi,omitempty" db:"condition_vi"`
	BodyRegion       string           `json:"body_region,omitempty" db:"body_region"`
	DurationWeeks    int              `json:"duration_weeks" db:"duration_weeks"`
	SessionsPerWeek  int              `json:"sessions_per_week" db:"sessions_per_week"`
	TotalSessions    int              `json:"total_sessions" db:"total_sessions"`
	GoalsJSON        json.RawMessage  `json:"-" db:"goals"`
	Goals            []ProtocolGoal   `json:"goals,omitempty" db:"-"`
	PhasesJSON       json.RawMessage  `json:"-" db:"phases"`
	Phases           []ProtocolPhaseConfig `json:"phases,omitempty" db:"-"`
	ExercisesJSON    json.RawMessage  `json:"-" db:"exercises"`
	Exercises        []ProtocolExercise `json:"exercises,omitempty" db:"-"`
	PrecautionsJSON  json.RawMessage  `json:"-" db:"precautions"`
	Precautions      []ProtocolPrecaution `json:"precautions,omitempty" db:"-"`
	OutcomeMeasures  []string         `json:"outcome_measures,omitempty" db:"outcome_measures"`
	EvidenceLevel    string           `json:"evidence_level,omitempty" db:"evidence_level"`
	References       []string         `json:"references,omitempty" db:"references"`
	Version          int              `json:"version" db:"version"`
	IsGlobal         bool             `json:"is_global" db:"is_global"`
	IsActive         bool             `json:"is_active" db:"is_active"`
	CreatedAt        time.Time        `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time        `json:"updated_at" db:"updated_at"`
	CreatedBy        *string          `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy        *string          `json:"updated_by,omitempty" db:"updated_by"`
}

// ProtocolGoal represents a treatment goal within a protocol.
type ProtocolGoal struct {
	GoalID       string  `json:"goal_id"`
	Description  string  `json:"description"`
	DescriptionVi string `json:"description_vi,omitempty"`
	Type         string  `json:"type"` // short_term, long_term, functional
	TargetWeek   int     `json:"target_week,omitempty"`
	MeasureType  string  `json:"measure_type,omitempty"`
	TargetValue  *float64 `json:"target_value,omitempty"`
	IsRequired   bool    `json:"is_required"`
}

// ProtocolPhaseConfig describes the configuration for a single phase of a protocol.
type ProtocolPhaseConfig struct {
	Phase         ProtocolPhase `json:"phase"`
	Name          string        `json:"name"`
	NameVi        string        `json:"name_vi,omitempty"`
	StartWeek     int           `json:"start_week"`
	EndWeek       int           `json:"end_week"`
	Description   string        `json:"description,omitempty"`
	DescriptionVi string        `json:"description_vi,omitempty"`
	Criteria      []string      `json:"criteria,omitempty"`
	CriteriaVi    []string      `json:"criteria_vi,omitempty"`
	ExerciseIDs   []string      `json:"exercise_ids,omitempty"`
}

// ProtocolExercise represents an exercise prescribed within a protocol phase.
type ProtocolExercise struct {
	ExerciseID    string `json:"exercise_id"`
	Phase         string `json:"phase"`
	Sets          int    `json:"sets"`
	Reps          int    `json:"reps"`
	HoldSeconds   int    `json:"hold_seconds,omitempty"`
	Frequency     string `json:"frequency"`
	Progression   string `json:"progression,omitempty"`
	ProgressionVi string `json:"progression_vi,omitempty"`
	Notes         string `json:"notes,omitempty"`
	NotesVi       string `json:"notes_vi,omitempty"`
}

// ProtocolPrecaution represents a precaution or contraindication for a protocol.
type ProtocolPrecaution struct {
	Description   string `json:"description"`
	DescriptionVi string `json:"description_vi,omitempty"`
	Severity      string `json:"severity"` // info, warning, critical
}

// PatientProtocol represents an active treatment protocol assigned to a patient.
type PatientProtocol struct {
	ID              string          `json:"id" db:"id"`
	PatientID       string          `json:"patient_id" db:"patient_id" validate:"required,uuid"`
	ClinicID        string          `json:"clinic_id" db:"clinic_id" validate:"required,uuid"`
	ProtocolID      string          `json:"protocol_id" db:"protocol_id" validate:"required,uuid"`
	TherapistID     string          `json:"therapist_id" db:"therapist_id" validate:"required,uuid"`
	Status          ProgressStatus  `json:"status" db:"status"`
	CurrentPhase    ProtocolPhase   `json:"current_phase" db:"current_phase"`
	CurrentWeek     int             `json:"current_week" db:"current_week"`
	CompletedSessions int           `json:"completed_sessions" db:"completed_sessions"`
	GoalProgressJSON json.RawMessage `json:"-" db:"goal_progress"`
	GoalProgress    []GoalProgress  `json:"goal_progress,omitempty" db:"-"`
	ModificationsJSON json.RawMessage `json:"-" db:"modifications"`
	Modifications   []ProtocolModification `json:"modifications,omitempty" db:"-"`
	Notes           string          `json:"notes,omitempty" db:"notes"`
	StartDate       time.Time       `json:"start_date" db:"start_date"`
	ExpectedEndDate *time.Time      `json:"expected_end_date,omitempty" db:"expected_end_date"`
	CompletedAt     *time.Time      `json:"completed_at,omitempty" db:"completed_at"`
	DiscontinuedAt  *time.Time      `json:"discontinued_at,omitempty" db:"discontinued_at"`
	DiscontinuedReason string       `json:"discontinued_reason,omitempty" db:"discontinued_reason"`
	CreatedAt       time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at" db:"updated_at"`
	CreatedBy       *string         `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy       *string         `json:"updated_by,omitempty" db:"updated_by"`

	// Joined fields
	Protocol *ClinicalProtocol `json:"protocol,omitempty" db:"-"`
}

// GoalProgress tracks a patient's progress toward a specific protocol goal.
type GoalProgress struct {
	GoalID       string   `json:"goal_id"`
	CurrentValue *float64 `json:"current_value,omitempty"`
	TargetValue  *float64 `json:"target_value,omitempty"`
	IsAchieved   bool     `json:"is_achieved"`
	AchievedAt   *string  `json:"achieved_at,omitempty"` // ISO date
	Notes        string   `json:"notes,omitempty"`
}

// ProtocolModification records changes made to a patient's active protocol.
type ProtocolModification struct {
	ModifiedAt    string `json:"modified_at"` // ISO datetime
	ModifiedBy    string `json:"modified_by"`
	Field         string `json:"field"`
	OldValue      string `json:"old_value,omitempty"`
	NewValue      string `json:"new_value"`
	Reason        string `json:"reason"`
}

// Exercise represents a single exercise within a protocol for inline display.
// For the full exercise library model, see exercise.go.
type ProtocolExerciseRef struct {
	ExerciseID string `json:"exercise_id"`
	Name       string `json:"name"`
	NameVi     string `json:"name_vi,omitempty"`
}

// AssignProtocolRequest represents the request body for assigning a protocol to a patient.
type AssignProtocolRequest struct {
	PatientID   string `json:"patient_id" validate:"required,uuid"`
	ProtocolID  string `json:"protocol_id" validate:"required,uuid"`
	StartDate   string `json:"start_date" validate:"omitempty,datetime=2006-01-02"`
	Notes       string `json:"notes" validate:"max=2000"`
}

// UpdatePatientProtocolRequest represents the request body for updating a patient protocol.
type UpdatePatientProtocolRequest struct {
	Status         *string `json:"status" validate:"omitempty,oneof=not_started on_track behind ahead completed discontinued"`
	CurrentPhase   *string `json:"current_phase" validate:"omitempty,oneof=acute subacute strengthening return_to_activity maintenance"`
	CurrentWeek    *int    `json:"current_week" validate:"omitempty,min=1"`
	Notes          *string `json:"notes" validate:"omitempty,max=2000"`
	DiscontinuedReason *string `json:"discontinued_reason" validate:"omitempty,max=1000"`
}

// PatientProtocolSearchParams represents search and filter parameters for patient protocols.
type PatientProtocolSearchParams struct {
	ClinicID    string         `query:"clinic_id"`
	PatientID   string         `query:"patient_id"`
	TherapistID string         `query:"therapist_id"`
	ProtocolID  string         `query:"protocol_id"`
	Status      ProgressStatus `query:"status"`
	Category    ProtocolCategory `query:"category"`
	SortBy      string         `query:"sort_by"`
	SortOrder   string         `query:"sort_order"`
	Page        int            `query:"page"`
	PerPage     int            `query:"per_page"`
}

// NewPatientProtocolSearchParams creates PatientProtocolSearchParams with default values.
func NewPatientProtocolSearchParams() PatientProtocolSearchParams {
	return PatientProtocolSearchParams{
		SortBy:    "start_date",
		SortOrder: "desc",
		Page:      1,
		PerPage:   20,
	}
}

// Offset calculates the offset for pagination.
func (p PatientProtocolSearchParams) Offset() int {
	return (p.Page - 1) * p.Limit()
}

// Limit returns the number of items per page.
func (p PatientProtocolSearchParams) Limit() int {
	if p.PerPage <= 0 {
		return 20
	}
	if p.PerPage > 100 {
		return 100
	}
	return p.PerPage
}

// PatientProtocolListResponse represents a paginated list of patient protocols.
type PatientProtocolListResponse struct {
	Data       []PatientProtocol `json:"data"`
	Total      int64             `json:"total"`
	Page       int               `json:"page"`
	PerPage    int               `json:"per_page"`
	TotalPages int               `json:"total_pages"`
}

// ---------------------------------------------------------------------------
// DB-aligned models matching migration 008_clinical_protocols_tables.sql
// ---------------------------------------------------------------------------

// ClinicalProtocolDB represents a row in the clinical_protocols table.
type ClinicalProtocolDB struct {
	ID                     string                `json:"id"`
	ClinicID               *string               `json:"clinic_id,omitempty"`
	ProtocolName           string                `json:"protocol_name"`
	ProtocolNameVi         string                `json:"protocol_name_vi"`
	Description            string                `json:"description,omitempty"`
	DescriptionVi          string                `json:"description_vi,omitempty"`
	Goals                  []ProtocolGoalJSON    `json:"goals"`
	Exercises              []ProtocolExerciseJSON `json:"exercises"`
	FrequencyPerWeek       int                   `json:"frequency_per_week"`
	DurationWeeks          int                   `json:"duration_weeks"`
	SessionDurationMinutes int                   `json:"session_duration_minutes"`
	ProgressionCriteria    ProgressionCriteriaJSON `json:"progression_criteria"`
	Category               string                `json:"category,omitempty"`
	ApplicableDiagnoses    []string              `json:"applicable_diagnoses,omitempty"`
	BodyRegions            []string              `json:"body_regions,omitempty"`
	IsActive               bool                  `json:"is_active"`
	Version                int                   `json:"version"`
	CreatedAt              time.Time             `json:"created_at"`
	UpdatedAt              time.Time             `json:"updated_at"`
}

// ProtocolGoalJSON matches the JSONB goals array in clinical_protocols.
type ProtocolGoalJSON struct {
	Type                   string `json:"type"`
	Description            string `json:"description"`
	DescriptionVi          string `json:"description_vi,omitempty"`
	MeasurableCriteria     string `json:"measurable_criteria,omitempty"`
	TargetTimeframeWeeks   int    `json:"target_timeframe_weeks,omitempty"`
}

// ProtocolExerciseJSON matches the JSONB exercises array in clinical_protocols.
type ProtocolExerciseJSON struct {
	Name            string   `json:"name"`
	NameVi          string   `json:"name_vi,omitempty"`
	Description     string   `json:"description,omitempty"`
	DescriptionVi   string   `json:"description_vi,omitempty"`
	Sets            int      `json:"sets"`
	Reps            int      `json:"reps"`
	DurationSeconds *int     `json:"duration_seconds,omitempty"`
	FrequencyPerDay int      `json:"frequency_per_day"`
	Phase           string   `json:"phase"`
	Precautions     []string `json:"precautions,omitempty"`
}

// ProgressionCriteriaJSON matches the JSONB progression_criteria in clinical_protocols.
type ProgressionCriteriaJSON struct {
	PhaseTransitions    []PhaseTransition `json:"phase_transitions,omitempty"`
	DischargeCriteria   string            `json:"discharge_criteria,omitempty"`
	DischargeCriteriaVi string            `json:"discharge_criteria_vi,omitempty"`
}

// PhaseTransition describes when to move from one treatment phase to the next.
type PhaseTransition struct {
	FromPhase   string `json:"from_phase"`
	ToPhase     string `json:"to_phase"`
	Criteria    string `json:"criteria"`
	CriteriaVi  string `json:"criteria_vi,omitempty"`
	TypicalWeek int    `json:"typical_week,omitempty"`
}

// ClinicalProtocolSummary is a lightweight join for patient protocol queries.
type ClinicalProtocolSummary struct {
	ID               string `json:"id"`
	ProtocolName     string `json:"protocol_name"`
	ProtocolNameVi   string `json:"protocol_name_vi"`
	Category         string `json:"category,omitempty"`
	DurationWeeks    int    `json:"duration_weeks"`
	FrequencyPerWeek int    `json:"frequency_per_week"`
}

// PatientProtocolDB represents a row in the patient_protocols table.
type PatientProtocolDB struct {
	ID                    string              `json:"id"`
	PatientID             string              `json:"patient_id"`
	ProtocolID            string              `json:"protocol_id"`
	TherapistID           string              `json:"therapist_id"`
	ClinicID              string              `json:"clinic_id"`
	AssignedDate          time.Time           `json:"assigned_date"`
	StartDate             *time.Time          `json:"start_date,omitempty"`
	TargetEndDate         *time.Time          `json:"target_end_date,omitempty"`
	ActualEndDate         *time.Time          `json:"actual_end_date,omitempty"`
	ProgressStatus        string              `json:"progress_status"`
	CurrentPhase          string              `json:"current_phase"`
	SessionsCompleted     int                 `json:"sessions_completed"`
	CustomGoals           json.RawMessage     `json:"custom_goals,omitempty"`
	CustomExercises       json.RawMessage     `json:"custom_exercises,omitempty"`
	CustomFrequencyPerWeek *int               `json:"custom_frequency_per_week,omitempty"`
	CustomDurationWeeks   *int                `json:"custom_duration_weeks,omitempty"`
	ProgressNotes         []ProgressNote      `json:"progress_notes,omitempty"`
	Version               int                 `json:"version"`
	CreatedAt             time.Time           `json:"created_at"`
	UpdatedAt             time.Time           `json:"updated_at"`
	CreatedBy             *string             `json:"created_by,omitempty"`

	// Joined fields
	Protocol *ClinicalProtocolSummary `json:"protocol,omitempty"`
}

// ProgressNote represents an entry in the patient_protocols.progress_notes JSONB array.
type ProgressNote struct {
	Date        string `json:"date"`
	Note        string `json:"note"`
	NoteVi      string `json:"note_vi,omitempty"`
	Phase       string `json:"phase,omitempty"`
	TherapistID string `json:"therapist_id,omitempty"`
}

// AssignProtocolRequestDB is the request body for assigning a protocol (matches DB schema).
type AssignProtocolRequestDB struct {
	ProtocolID string `json:"protocol_id" validate:"required,uuid"`
	StartDate  string `json:"start_date" validate:"omitempty,datetime=2006-01-02"`
	Notes      string `json:"notes" validate:"omitempty,max=2000"`
}

// UpdateProgressRequest is the request body for updating protocol progress.
type UpdateProgressRequest struct {
	ProgressStatus    *string `json:"progress_status" validate:"omitempty,oneof=active completed on_hold discontinued"`
	CurrentPhase      *string `json:"current_phase" validate:"omitempty,oneof=initial intermediate advanced"`
	SessionsCompleted *int    `json:"sessions_completed" validate:"omitempty,min=0"`
	Note              *string `json:"note" validate:"omitempty,max=2000"`
	NoteVi            *string `json:"note_vi" validate:"omitempty,max=2000"`
	Version           int     `json:"version" validate:"required,min=1"`
}
