package model

import (
	"math"
	"time"
)

// AssessmentType represents the type of clinical assessment being re-evaluated.
type AssessmentType string

const (
	AssessmentTypeROM            AssessmentType = "rom"
	AssessmentTypeMMT            AssessmentType = "mmt"
	AssessmentTypeOutcomeMeasure AssessmentType = "outcome_measure"
)

// Interpretation represents the clinical interpretation of change.
type Interpretation string

const (
	InterpretationImproved Interpretation = "improved"
	InterpretationDeclined Interpretation = "declined"
	InterpretationStable   Interpretation = "stable"
)

// ReevaluationAssessment represents a single re-evaluation comparison record.
type ReevaluationAssessment struct {
	ID                   string         `json:"id" db:"id"`
	PatientID            string         `json:"patient_id" db:"patient_id" validate:"required,uuid"`
	VisitID              *string        `json:"visit_id,omitempty" db:"visit_id"`
	ClinicID             string         `json:"clinic_id" db:"clinic_id" validate:"required,uuid"`
	BaselineAssessmentID *string        `json:"baseline_assessment_id,omitempty" db:"baseline_assessment_id"`
	AssessmentType       AssessmentType `json:"assessment_type" db:"assessment_type" validate:"required"`
	MeasureLabel         string         `json:"measure_label" db:"measure_label" validate:"required,max=120"`
	CurrentValue         float64        `json:"current_value" db:"current_value"`
	BaselineValue        float64        `json:"baseline_value" db:"baseline_value"`
	Change               float64        `json:"change" db:"change"`
	ChangePercentage     *float64       `json:"change_percentage,omitempty" db:"change_percentage"`
	HigherIsBetter       bool           `json:"higher_is_better" db:"higher_is_better"`
	MCIDThreshold        *float64       `json:"mcid_threshold,omitempty" db:"mcid_threshold"`
	MCIDAchieved         bool           `json:"mcid_achieved" db:"mcid_achieved"`
	Interpretation       Interpretation `json:"interpretation" db:"interpretation"`
	TherapistID          string         `json:"therapist_id" db:"therapist_id" validate:"required,uuid"`
	Notes                string         `json:"notes,omitempty" db:"notes"`
	AssessedAt           time.Time      `json:"assessed_at" db:"assessed_at"`
	CreatedAt            time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time      `json:"updated_at" db:"updated_at"`
}

// ComparisonResult encapsulates the computed comparison between baseline and current values.
type ComparisonResult struct {
	MeasureLabel     string         `json:"measure_label"`
	AssessmentType   AssessmentType `json:"assessment_type"`
	BaselineValue    float64        `json:"baseline_value"`
	CurrentValue     float64        `json:"current_value"`
	Change           float64        `json:"change"`
	ChangePercentage *float64       `json:"change_percentage,omitempty"`
	HigherIsBetter   bool           `json:"higher_is_better"`
	MCIDThreshold    *float64       `json:"mcid_threshold,omitempty"`
	MCIDAchieved     bool           `json:"mcid_achieved"`
	Interpretation   Interpretation `json:"interpretation"`
}

// ReevaluationSummary groups re-evaluation results for a patient visit.
type ReevaluationSummary struct {
	PatientID    string                    `json:"patient_id"`
	VisitID      *string                   `json:"visit_id,omitempty"`
	TherapistID  string                    `json:"therapist_id"`
	AssessedAt   time.Time                 `json:"assessed_at"`
	Comparisons  []ReevaluationAssessment  `json:"comparisons"`
	TotalItems   int                       `json:"total_items"`
	Improved     int                       `json:"improved"`
	Declined     int                       `json:"declined"`
	Stable       int                       `json:"stable"`
	MCIDAchieved int                       `json:"mcid_achieved"`
}

// CreateReevaluationRequest represents the request body for creating re-evaluation records.
type CreateReevaluationRequest struct {
	PatientID            string                         `json:"patient_id" validate:"required,uuid"`
	VisitID              string                         `json:"visit_id" validate:"omitempty,uuid"`
	BaselineAssessmentID string                         `json:"baseline_assessment_id" validate:"omitempty,uuid"`
	Assessments          []CreateReevaluationItemRequest `json:"assessments" validate:"required,min=1"`
	Notes                string                         `json:"notes" validate:"max=2000"`
	AssessedAt           string                         `json:"assessed_at" validate:"omitempty,datetime=2006-01-02T15:04:05Z07:00"`
}

// CreateReevaluationItemRequest represents a single comparison item in a re-evaluation.
type CreateReevaluationItemRequest struct {
	AssessmentType AssessmentType `json:"assessment_type" validate:"required"`
	MeasureLabel   string         `json:"measure_label" validate:"required,max=120"`
	CurrentValue   float64        `json:"current_value"`
	BaselineValue  float64        `json:"baseline_value"`
	HigherIsBetter bool           `json:"higher_is_better"`
	MCIDThreshold  *float64       `json:"mcid_threshold,omitempty"`
}

// CalculateChange computes the change and percentage between baseline and current.
func CalculateChange(baseline, current float64) (change float64, changePct *float64) {
	change = current - baseline
	if math.Abs(baseline) > 0.0001 {
		pct := (change / math.Abs(baseline)) * 100
		changePct = &pct
	}
	return change, changePct
}

// DetermineInterpretation determines if the change represents improvement, decline, or stability.
// mcid is the Minimal Clinically Important Difference threshold.
// higherIsBetter indicates whether higher values represent improvement (true for ROM/function,
// false for pain scales).
func DetermineInterpretation(change float64, mcid *float64, higherIsBetter bool) (Interpretation, bool) {
	threshold := 0.0
	if mcid != nil && *mcid > 0 {
		threshold = *mcid
	}

	absChange := math.Abs(change)

	// If there is a meaningful MCID and the change does not exceed it, consider stable
	if threshold > 0 && absChange < threshold {
		return InterpretationStable, false
	}

	// If there is no MCID but the change is essentially zero, consider stable
	if threshold == 0 && absChange < 0.0001 {
		return InterpretationStable, false
	}

	mcidAchieved := threshold > 0 && absChange >= threshold

	if higherIsBetter {
		if change > 0 {
			return InterpretationImproved, mcidAchieved
		}
		return InterpretationDeclined, mcidAchieved
	}

	// For pain scales where lower is better
	if change < 0 {
		return InterpretationImproved, mcidAchieved
	}
	return InterpretationDeclined, mcidAchieved
}
