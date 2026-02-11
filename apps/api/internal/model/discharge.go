package model

import (
	"encoding/json"
	"time"
)

// DischargeStatus represents the lifecycle state of a discharge plan.
type DischargeStatus string

const (
	DischargeStatusPlanning   DischargeStatus = "planning"
	DischargeStatusReady      DischargeStatus = "ready"
	DischargeStatusCompleted  DischargeStatus = "completed"
	DischargeStatusCancelled  DischargeStatus = "cancelled"
)

// DischargeReason indicates why the patient is being discharged.
type DischargeReason string

const (
	DischargeReasonGoalsMet      DischargeReason = "goals_met"
	DischargeReasonPlateau       DischargeReason = "plateau"
	DischargeReasonPatientChoice DischargeReason = "patient_choice"
	DischargeReasonReferral      DischargeReason = "referral"
	DischargeReasonNonCompliance DischargeReason = "non_compliance"
	DischargeReasonInsurance     DischargeReason = "insurance_exhausted"
	DischargeReasonRelocated     DischargeReason = "relocated"
	DischargeReasonMedical       DischargeReason = "medical_change"
	DischargeReasonOther         DischargeReason = "other"
)

// DischargePlan represents the planning document for patient discharge.
type DischargePlan struct {
	ID                 string          `json:"id" db:"id"`
	PatientID          string          `json:"patient_id" db:"patient_id" validate:"required,uuid"`
	ClinicID           string          `json:"clinic_id" db:"clinic_id" validate:"required,uuid"`
	TherapistID        string          `json:"therapist_id" db:"therapist_id" validate:"required,uuid"`
	ProtocolID         *string         `json:"protocol_id,omitempty" db:"protocol_id"`
	Status             DischargeStatus `json:"status" db:"status"`
	Reason             DischargeReason `json:"reason" db:"reason"`
	ReasonDetails      string          `json:"reason_details,omitempty" db:"reason_details"`
	ReasonDetailsVi    string          `json:"reason_details_vi,omitempty" db:"reason_details_vi"`
	PlannedDate        *time.Time      `json:"planned_date,omitempty" db:"planned_date"`
	ActualDate         *time.Time      `json:"actual_date,omitempty" db:"actual_date"`
	GoalOutcomesJSON   json.RawMessage `json:"-" db:"goal_outcomes"`
	GoalOutcomes       []GoalOutcome   `json:"goal_outcomes,omitempty" db:"-"`
	HomeProgJSON       json.RawMessage `json:"-" db:"home_program"`
	HomeProgram        *DischargeHomeProgram `json:"home_program,omitempty" db:"-"`
	RecommendationsJSON json.RawMessage `json:"-" db:"recommendations"`
	Recommendations    []DischargeRecommendation `json:"recommendations,omitempty" db:"-"`
	FollowUpJSON       json.RawMessage `json:"-" db:"follow_up"`
	FollowUp           *FollowUpPlan   `json:"follow_up,omitempty" db:"-"`
	PatientEducationJSON json.RawMessage `json:"-" db:"patient_education"`
	PatientEducation   []EducationItem `json:"patient_education,omitempty" db:"-"`
	Notes              string          `json:"notes,omitempty" db:"notes"`
	NotesVi            string          `json:"notes_vi,omitempty" db:"notes_vi"`
	CreatedAt          time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time       `json:"updated_at" db:"updated_at"`
	CreatedBy          *string         `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy          *string         `json:"updated_by,omitempty" db:"updated_by"`
}

// GoalOutcome records the final status of a treatment goal at discharge.
type GoalOutcome struct {
	GoalID        string  `json:"goal_id"`
	Description   string  `json:"description"`
	DescriptionVi string  `json:"description_vi,omitempty"`
	Status        string  `json:"status"` // achieved, partially_achieved, not_achieved
	FinalValue    *float64 `json:"final_value,omitempty"`
	TargetValue   *float64 `json:"target_value,omitempty"`
	Notes         string  `json:"notes,omitempty"`
}

// DischargeHomeProgram describes the home exercise program given at discharge.
type DischargeHomeProgram struct {
	ProgramID    string                   `json:"program_id,omitempty"`
	Exercises    []DischargeExercise      `json:"exercises,omitempty"`
	Frequency    string                   `json:"frequency"`
	FrequencyVi  string                   `json:"frequency_vi,omitempty"`
	Duration     string                   `json:"duration"`
	DurationVi   string                   `json:"duration_vi,omitempty"`
	Instructions string                   `json:"instructions,omitempty"`
	InstructionsVi string                 `json:"instructions_vi,omitempty"`
}

// DischargeExercise represents an exercise in the discharge home program.
type DischargeExercise struct {
	ExerciseID    string `json:"exercise_id"`
	Name          string `json:"name"`
	NameVi        string `json:"name_vi,omitempty"`
	Sets          int    `json:"sets"`
	Reps          int    `json:"reps"`
	HoldSeconds   int    `json:"hold_seconds,omitempty"`
	Instructions  string `json:"instructions,omitempty"`
	InstructionsVi string `json:"instructions_vi,omitempty"`
}

// DischargeRecommendation represents a post-discharge recommendation.
type DischargeRecommendation struct {
	Type          string `json:"type"` // activity, precaution, lifestyle, referral
	Description   string `json:"description"`
	DescriptionVi string `json:"description_vi,omitempty"`
	Priority      string `json:"priority"` // high, medium, low
}

// FollowUpPlan describes the follow-up schedule after discharge.
type FollowUpPlan struct {
	IsNeeded       bool   `json:"is_needed"`
	IntervalWeeks  int    `json:"interval_weeks,omitempty"`
	TotalVisits    int    `json:"total_visits,omitempty"`
	Reason         string `json:"reason,omitempty"`
	ReasonVi       string `json:"reason_vi,omitempty"`
	ReferralTo     string `json:"referral_to,omitempty"`
	ReferralToVi   string `json:"referral_to_vi,omitempty"`
	ReferralReason string `json:"referral_reason,omitempty"`
}

// EducationItem represents a patient education topic covered at discharge.
type EducationItem struct {
	Topic       string `json:"topic"`
	TopicVi     string `json:"topic_vi,omitempty"`
	Description string `json:"description,omitempty"`
	DescriptionVi string `json:"description_vi,omitempty"`
	Provided    bool   `json:"provided"`
	MaterialURL string `json:"material_url,omitempty"`
}

// DischargeSummary represents the finalized discharge document combining clinical data.
type DischargeSummary struct {
	ID                 string               `json:"id" db:"id"`
	DischargePlanID    string               `json:"discharge_plan_id" db:"discharge_plan_id"`
	PatientID          string               `json:"patient_id" db:"patient_id"`
	ClinicID           string               `json:"clinic_id" db:"clinic_id"`
	TherapistID        string               `json:"therapist_id" db:"therapist_id"`
	Diagnosis          string               `json:"diagnosis" db:"diagnosis"`
	DiagnosisVi        string               `json:"diagnosis_vi,omitempty" db:"diagnosis_vi"`
	TreatmentSummary   string               `json:"treatment_summary" db:"treatment_summary"`
	TreatmentSummaryVi string               `json:"treatment_summary_vi,omitempty" db:"treatment_summary_vi"`
	TotalSessions      int                  `json:"total_sessions" db:"total_sessions"`
	TreatmentDuration  int                  `json:"treatment_duration_days" db:"treatment_duration_days"`
	FirstVisitDate     time.Time            `json:"first_visit_date" db:"first_visit_date"`
	LastVisitDate      time.Time            `json:"last_visit_date" db:"last_visit_date"`
	BaselineJSON       json.RawMessage      `json:"-" db:"baseline_comparison"`
	BaselineComparison []BaselineComparison `json:"baseline_comparison,omitempty" db:"-"`
	FunctionalStatus   string               `json:"functional_status,omitempty" db:"functional_status"`
	FunctionalStatusVi string               `json:"functional_status_vi,omitempty" db:"functional_status_vi"`
	DischargeReason    DischargeReason      `json:"discharge_reason" db:"discharge_reason"`
	Prognosis          string               `json:"prognosis,omitempty" db:"prognosis"`
	PrognosisVi        string               `json:"prognosis_vi,omitempty" db:"prognosis_vi"`
	SignedBy           *string              `json:"signed_by,omitempty" db:"signed_by"`
	SignedAt           *time.Time           `json:"signed_at,omitempty" db:"signed_at"`
	CreatedAt          time.Time            `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time            `json:"updated_at" db:"updated_at"`
	CreatedBy          *string              `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy          *string              `json:"updated_by,omitempty" db:"updated_by"`

	// Joined fields
	Plan *DischargePlan `json:"plan,omitempty" db:"-"`
}

// BaselineComparison represents a before-and-after comparison of a clinical measure.
type BaselineComparison struct {
	MeasureName   string   `json:"measure_name"`
	MeasureNameVi string   `json:"measure_name_vi,omitempty"`
	MeasureType   string   `json:"measure_type"`
	BaselineValue float64  `json:"baseline_value"`
	FinalValue    float64  `json:"final_value"`
	Change        float64  `json:"change"`
	ChangePercent float64  `json:"change_percent"`
	MeetsMCID     bool     `json:"meets_mcid"`
	Interpretation string  `json:"interpretation,omitempty"`
	InterpretationVi string `json:"interpretation_vi,omitempty"`
}

// CreateDischargePlanRequest represents the request body for creating a discharge plan.
type CreateDischargePlanRequest struct {
	PatientID       string                    `json:"patient_id" validate:"required,uuid"`
	ProtocolID      string                    `json:"protocol_id" validate:"omitempty,uuid"`
	Reason          string                    `json:"reason" validate:"required,oneof=goals_met plateau patient_choice referral non_compliance insurance_exhausted relocated medical_change other"`
	ReasonDetails   string                    `json:"reason_details" validate:"max=2000"`
	ReasonDetailsVi string                    `json:"reason_details_vi" validate:"max=2000"`
	PlannedDate     string                    `json:"planned_date" validate:"omitempty,datetime=2006-01-02"`
	GoalOutcomes    []GoalOutcome             `json:"goal_outcomes" validate:"omitempty"`
	Recommendations []DischargeRecommendation `json:"recommendations" validate:"omitempty"`
	Notes           string                    `json:"notes" validate:"max=2000"`
	NotesVi         string                    `json:"notes_vi" validate:"max=2000"`
}

// UpdateDischargePlanRequest represents the request body for updating a discharge plan.
type UpdateDischargePlanRequest struct {
	Status          *string                    `json:"status" validate:"omitempty,oneof=planning ready completed cancelled"`
	Reason          *string                    `json:"reason" validate:"omitempty,oneof=goals_met plateau patient_choice referral non_compliance insurance_exhausted relocated medical_change other"`
	ReasonDetails   *string                    `json:"reason_details" validate:"omitempty,max=2000"`
	ReasonDetailsVi *string                    `json:"reason_details_vi" validate:"omitempty,max=2000"`
	PlannedDate     *string                    `json:"planned_date" validate:"omitempty,datetime=2006-01-02"`
	GoalOutcomes    []GoalOutcome              `json:"goal_outcomes" validate:"omitempty"`
	Recommendations []DischargeRecommendation  `json:"recommendations" validate:"omitempty"`
	Notes           *string                    `json:"notes" validate:"omitempty,max=2000"`
	NotesVi         *string                    `json:"notes_vi" validate:"omitempty,max=2000"`
}

// DischargePlanSearchParams represents search and filter parameters for discharge plans.
type DischargePlanSearchParams struct {
	ClinicID    string          `query:"clinic_id"`
	PatientID   string          `query:"patient_id"`
	TherapistID string          `query:"therapist_id"`
	Status      DischargeStatus `query:"status"`
	Reason      DischargeReason `query:"reason"`
	DateFrom    *time.Time      `query:"date_from"`
	DateTo      *time.Time      `query:"date_to"`
	SortBy      string          `query:"sort_by"`
	SortOrder   string          `query:"sort_order"`
	Page        int             `query:"page"`
	PerPage     int             `query:"per_page"`
}

// NewDischargePlanSearchParams creates DischargePlanSearchParams with default values.
func NewDischargePlanSearchParams() DischargePlanSearchParams {
	return DischargePlanSearchParams{
		SortBy:    "created_at",
		SortOrder: "desc",
		Page:      1,
		PerPage:   20,
	}
}

// Offset calculates the offset for pagination.
func (p DischargePlanSearchParams) Offset() int {
	return (p.Page - 1) * p.Limit()
}

// Limit returns the number of items per page.
func (p DischargePlanSearchParams) Limit() int {
	if p.PerPage <= 0 {
		return 20
	}
	if p.PerPage > 100 {
		return 100
	}
	return p.PerPage
}

// DischargePlanListResponse represents a paginated list of discharge plans.
type DischargePlanListResponse struct {
	Data       []DischargePlan `json:"data"`
	Total      int64           `json:"total"`
	Page       int             `json:"page"`
	PerPage    int             `json:"per_page"`
	TotalPages int             `json:"total_pages"`
}
