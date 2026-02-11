package model

import (
	"encoding/json"
	"time"
)

// MeasureType represents the type of standardized outcome measure.
type MeasureType string

const (
	MeasureTypeVAS    MeasureType = "vas"     // Visual Analog Scale (pain)
	MeasureTypeNRS    MeasureType = "nrs"     // Numeric Rating Scale (pain)
	MeasureTypeNDI    MeasureType = "ndi"     // Neck Disability Index
	MeasureTypeODI    MeasureType = "odi"     // Oswestry Disability Index
	MeasureTypeDASH   MeasureType = "dash"    // Disabilities of the Arm, Shoulder and Hand
	MeasureTypeLEFS   MeasureType = "lefs"    // Lower Extremity Functional Scale
	MeasureTypeKOOS   MeasureType = "koos"    // Knee injury and Osteoarthritis Outcome Score
	MeasureTypeWOMAC  MeasureType = "womac"   // Western Ontario and McMaster Universities Osteoarthritis Index
	MeasureTypeSF36   MeasureType = "sf36"    // Short Form 36 Health Survey
	MeasureTypeBBS    MeasureType = "bbs"     // Berg Balance Scale
	MeasureTypeTUG    MeasureType = "tug"     // Timed Up and Go
	MeasureTypeFIM    MeasureType = "fim"     // Functional Independence Measure
	MeasureTypeMMT    MeasureType = "mmt"     // Manual Muscle Testing
	MeasureTypeROM    MeasureType = "rom"     // Range of Motion
	MeasureTypeCustom MeasureType = "custom"  // Clinic-defined custom measure
)

// MeasureCategory groups outcome measures by clinical purpose.
type MeasureCategory string

const (
	MeasureCategoryPain       MeasureCategory = "pain"
	MeasureCategoryFunction   MeasureCategory = "function"
	MeasureCategoryDisability MeasureCategory = "disability"
	MeasureCategoryBalance    MeasureCategory = "balance"
	MeasureCategoryStrength   MeasureCategory = "strength"
	MeasureCategoryMobility   MeasureCategory = "mobility"
	MeasureCategoryQuality    MeasureCategory = "quality_of_life"
	MeasureCategoryCustom     MeasureCategory = "custom"
)

// TrendDirection indicates the direction of change in outcome scores.
type TrendDirection string

const (
	TrendImproved   TrendDirection = "improved"
	TrendDeclined   TrendDirection = "declined"
	TrendStable     TrendDirection = "stable"
	TrendInsuffData TrendDirection = "insufficient_data"
)

// OutcomeMeasureLibrary represents a standardized outcome measure definition.
type OutcomeMeasureLibrary struct {
	ID               string          `json:"id" db:"id"`
	ClinicID         *string         `json:"clinic_id,omitempty" db:"clinic_id"`
	Code             string          `json:"code" db:"code"`
	MeasureType      MeasureType     `json:"measure_type" db:"measure_type"`
	Category         MeasureCategory `json:"category" db:"category"`
	Name             string          `json:"name" db:"name"`
	NameVi           string          `json:"name_vi" db:"name_vi"`
	Description      string          `json:"description,omitempty" db:"description"`
	DescriptionVi    string          `json:"description_vi,omitempty" db:"description_vi"`
	Instructions     string          `json:"instructions,omitempty" db:"instructions"`
	InstructionsVi   string          `json:"instructions_vi,omitempty" db:"instructions_vi"`
	MinScore         float64         `json:"min_score" db:"min_score"`
	MaxScore         float64         `json:"max_score" db:"max_score"`
	HigherIsBetter   bool            `json:"higher_is_better" db:"higher_is_better"`
	MCID             *float64        `json:"mcid,omitempty" db:"mcid"`     // Minimal Clinically Important Difference
	MDC              *float64        `json:"mdc,omitempty" db:"mdc"`       // Minimal Detectable Change
	QuestionsJSON    json.RawMessage `json:"-" db:"questions"`
	Questions        []MeasureQuestion `json:"questions,omitempty" db:"-"`
	ScoringMethodJSON json.RawMessage `json:"-" db:"scoring_method"`
	ScoringMethod    *ScoringMethod  `json:"scoring_method,omitempty" db:"-"`
	BodyRegion       *string         `json:"body_region,omitempty" db:"body_region"`
	IsGlobal         bool            `json:"is_global" db:"is_global"`
	IsActive         bool            `json:"is_active" db:"is_active"`
	CreatedAt        time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at" db:"updated_at"`
	CreatedBy        *string         `json:"created_by,omitempty" db:"created_by"`
}

// MeasureQuestion represents a single question within an outcome measure.
type MeasureQuestion struct {
	QuestionID  string         `json:"question_id"`
	Text        string         `json:"text"`
	TextVi      string         `json:"text_vi,omitempty"`
	InputType   string         `json:"input_type"` // scale, number, radio, text
	Options     []OptionConfig `json:"options,omitempty"`
	MinValue    *float64       `json:"min_value,omitempty"`
	MaxValue    *float64       `json:"max_value,omitempty"`
	Weight      float64        `json:"weight,omitempty"`
	IsRequired  bool           `json:"is_required"`
}

// ScoringMethod describes how an outcome measure is scored.
type ScoringMethod struct {
	Method      string  `json:"method"` // sum, average, weighted, custom
	Formula     string  `json:"formula,omitempty"`
	NormalizeTo *float64 `json:"normalize_to,omitempty"` // e.g. normalize to 100
}

// OutcomeMeasure represents a recorded outcome measure for a patient.
type OutcomeMeasure struct {
	ID            string          `json:"id" db:"id"`
	PatientID     string          `json:"patient_id" db:"patient_id" validate:"required,uuid"`
	ClinicID      string          `json:"clinic_id" db:"clinic_id" validate:"required,uuid"`
	TherapistID   string          `json:"therapist_id" db:"therapist_id" validate:"required,uuid"`
	LibraryID     string          `json:"library_id" db:"library_id" validate:"required,uuid"`
	MeasureType   MeasureType     `json:"measure_type" db:"measure_type"`
	SessionID     *string         `json:"session_id,omitempty" db:"session_id"`
	Score         float64         `json:"score" db:"score"`
	MaxPossible   float64         `json:"max_possible" db:"max_possible"`
	Percentage    *float64        `json:"percentage,omitempty" db:"percentage"`
	ResponsesJSON json.RawMessage `json:"-" db:"responses"`
	Responses     []MeasureResponse `json:"responses,omitempty" db:"-"`
	InterpretJSON json.RawMessage `json:"-" db:"interpretation"`
	Interpretation *MeasureInterpretation `json:"interpretation,omitempty" db:"-"`
	Notes         string          `json:"notes,omitempty" db:"notes"`
	MeasuredAt    time.Time       `json:"measured_at" db:"measured_at"`
	CreatedAt     time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at" db:"updated_at"`
	CreatedBy     *string         `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy     *string         `json:"updated_by,omitempty" db:"updated_by"`

	// Joined fields
	Library *OutcomeMeasureLibrary `json:"library,omitempty" db:"-"`
}

// MeasureResponse holds the patient's answer to a single question.
type MeasureResponse struct {
	QuestionID string  `json:"question_id"`
	Value      float64 `json:"value"`
	TextValue  string  `json:"text_value,omitempty"`
}

// MeasureInterpretation holds the clinical interpretation of a score.
type MeasureInterpretation struct {
	Severity    string `json:"severity"`     // minimal, mild, moderate, severe
	SeverityVi  string `json:"severity_vi,omitempty"`
	Description string `json:"description,omitempty"`
	DescriptionVi string `json:"description_vi,omitempty"`
}

// ProgressCalculation represents the comparison between two measurements over time.
type ProgressCalculation struct {
	PatientID       string         `json:"patient_id"`
	MeasureType     MeasureType    `json:"measure_type"`
	LibraryID       string         `json:"library_id"`
	CurrentScore    float64        `json:"current_score"`
	PreviousScore   *float64       `json:"previous_score,omitempty"`
	BaselineScore   *float64       `json:"baseline_score,omitempty"`
	Change          *float64       `json:"change,omitempty"`
	ChangePercent   *float64       `json:"change_percent,omitempty"`
	MeetsMinChange  *bool          `json:"meets_mcid,omitempty"` // Exceeds Minimal Clinically Important Difference
	Trend           TrendDirection `json:"trend"`
	TotalMeasurements int          `json:"total_measurements"`
	CalculatedAt    time.Time      `json:"calculated_at"`
}

// TrendingData represents a time series of outcome measure scores for charting.
type TrendingData struct {
	PatientID   string           `json:"patient_id"`
	MeasureType MeasureType      `json:"measure_type"`
	LibraryID   string           `json:"library_id"`
	MeasureName string           `json:"measure_name"`
	MeasureNameVi string         `json:"measure_name_vi,omitempty"`
	DataPoints  []TrendDataPoint `json:"data_points"`
	Baseline    *float64         `json:"baseline,omitempty"`
	Goal        *float64         `json:"goal,omitempty"`
	MCID        *float64         `json:"mcid,omitempty"`
	Trend       TrendDirection   `json:"trend"`
}

// TrendDataPoint represents a single data point in a trend chart.
type TrendDataPoint struct {
	Score      float64   `json:"score"`
	Percentage *float64  `json:"percentage,omitempty"`
	MeasuredAt time.Time `json:"measured_at"`
	SessionID  *string   `json:"session_id,omitempty"`
	Notes      string    `json:"notes,omitempty"`
}

// CreateOutcomeMeasureRequest represents the request body for recording an outcome measure.
type CreateOutcomeMeasureRequest struct {
	PatientID   string            `json:"patient_id" validate:"required,uuid"`
	LibraryID   string            `json:"library_id" validate:"required,uuid"`
	SessionID   string            `json:"session_id" validate:"omitempty,uuid"`
	Responses   []MeasureResponse `json:"responses" validate:"required,min=1"`
	Notes       string            `json:"notes" validate:"max=2000"`
	MeasuredAt  string            `json:"measured_at" validate:"omitempty,datetime=2006-01-02T15:04:05Z07:00"`
}

// OutcomeMeasureSearchParams represents search and filter parameters for outcome measures.
type OutcomeMeasureSearchParams struct {
	ClinicID    string      `query:"clinic_id"`
	PatientID   string      `query:"patient_id"`
	TherapistID string      `query:"therapist_id"`
	MeasureType MeasureType `query:"measure_type"`
	LibraryID   string      `query:"library_id"`
	DateFrom    *time.Time  `query:"date_from"`
	DateTo      *time.Time  `query:"date_to"`
	SortBy      string      `query:"sort_by"`
	SortOrder   string      `query:"sort_order"`
	Page        int         `query:"page"`
	PerPage     int         `query:"per_page"`
}

// NewOutcomeMeasureSearchParams creates OutcomeMeasureSearchParams with default values.
func NewOutcomeMeasureSearchParams() OutcomeMeasureSearchParams {
	return OutcomeMeasureSearchParams{
		SortBy:    "measured_at",
		SortOrder: "desc",
		Page:      1,
		PerPage:   20,
	}
}

// Offset calculates the offset for pagination.
func (p OutcomeMeasureSearchParams) Offset() int {
	return (p.Page - 1) * p.Limit()
}

// Limit returns the number of items per page.
func (p OutcomeMeasureSearchParams) Limit() int {
	if p.PerPage <= 0 {
		return 20
	}
	if p.PerPage > 100 {
		return 100
	}
	return p.PerPage
}

// OutcomeMeasureListResponse represents a paginated list of outcome measures.
type OutcomeMeasureListResponse struct {
	Data       []OutcomeMeasure `json:"data"`
	Total      int64            `json:"total"`
	Page       int              `json:"page"`
	PerPage    int              `json:"per_page"`
	TotalPages int              `json:"total_pages"`
}
