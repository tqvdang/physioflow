package model

import (
	"encoding/json"
	"time"
)

// ChecklistItemType represents the type of input for a checklist item.
type ChecklistItemType string

const (
	ItemTypeCheckbox    ChecklistItemType = "checkbox"
	ItemTypeRadio       ChecklistItemType = "radio"
	ItemTypeText        ChecklistItemType = "text"
	ItemTypeNumber      ChecklistItemType = "number"
	ItemTypeScale       ChecklistItemType = "scale"
	ItemTypeMultiSelect ChecklistItemType = "multi_select"
	ItemTypeDate        ChecklistItemType = "date"
	ItemTypeTime        ChecklistItemType = "time"
	ItemTypeDuration    ChecklistItemType = "duration"
	ItemTypeBodyDiagram ChecklistItemType = "body_diagram"
	ItemTypeSignature   ChecklistItemType = "signature"
)

// ChecklistStatus represents the status of a visit checklist.
type ChecklistStatus string

const (
	ChecklistStatusNotStarted  ChecklistStatus = "not_started"
	ChecklistStatusInProgress  ChecklistStatus = "in_progress"
	ChecklistStatusCompleted   ChecklistStatus = "completed"
	ChecklistStatusReviewed    ChecklistStatus = "reviewed"
	ChecklistStatusLocked      ChecklistStatus = "locked"
)

// TemplateType represents the type of checklist template.
type TemplateType string

const (
	TemplateTypeInitialEval TemplateType = "initial_eval"
	TemplateTypeFollowUp    TemplateType = "follow_up"
	TemplateTypeDischarge   TemplateType = "discharge"
	TemplateTypeDailyNote   TemplateType = "daily_note"
)

// =============================================================================
// TEMPLATE CONFIGURATION TYPES
// =============================================================================

// TemplateSettings holds behavior settings for a checklist template.
type TemplateSettings struct {
	AllowSkip              bool   `json:"allow_skip"`
	RequireAllSections     bool   `json:"require_all_sections"`
	AutoSaveIntervalSecs   int    `json:"auto_save_interval_seconds"`
	ShowProgressBar        bool   `json:"show_progress_bar"`
	EnableQuickPhrases     bool   `json:"enable_quick_phrases"`
	DefaultLanguage        string `json:"default_language"`
}

// DisplayCondition represents a conditional display rule.
type DisplayCondition struct {
	ItemID   string `json:"item_id"`
	Operator string `json:"operator"` // equals, not_equals, contains, greater_than
	Value    any    `json:"value"`
	Logic    string `json:"logic"` // AND, OR
}

// DisplayConditions holds conditional display rules.
type DisplayConditions struct {
	Rules []DisplayCondition `json:"rules,omitempty"`
}

// =============================================================================
// ITEM CONFIGURATION TYPES
// =============================================================================

// CheckboxConfig holds configuration for checkbox items.
type CheckboxConfig struct {
	DefaultChecked bool `json:"default_checked"`
}

// OptionConfig holds a single option for radio/multi-select.
type OptionConfig struct {
	Value   string `json:"value"`
	Label   string `json:"label"`
	LabelVi string `json:"label_vi,omitempty"`
}

// RadioConfig holds configuration for radio button items.
type RadioConfig struct {
	Options     []OptionConfig `json:"options"`
	OtherOption bool           `json:"other_option"`
}

// MultiSelectConfig holds configuration for multi-select items.
type MultiSelectConfig struct {
	Options     []OptionConfig `json:"options"`
	OtherOption bool           `json:"other_option"`
	MaxSelect   int            `json:"max_select,omitempty"`
}

// ScaleConfig holds configuration for scale items.
type ScaleConfig struct {
	Min    int           `json:"min"`
	Max    int           `json:"max"`
	Step   int           `json:"step"`
	Labels *ScaleLabels  `json:"labels,omitempty"`
}

// ScaleLabels holds min/max labels for scale items.
type ScaleLabels struct {
	Min   string `json:"min"`
	Max   string `json:"max"`
	MinVi string `json:"min_vi,omitempty"`
	MaxVi string `json:"max_vi,omitempty"`
}

// NumberConfig holds configuration for number items.
type NumberConfig struct {
	Min     *float64 `json:"min,omitempty"`
	Max     *float64 `json:"max,omitempty"`
	Unit    string   `json:"unit,omitempty"`
	UnitVi  string   `json:"unit_vi,omitempty"`
	Decimal int      `json:"decimal,omitempty"`
}

// TextConfig holds configuration for text items.
type TextConfig struct {
	Multiline   bool `json:"multiline"`
	MinLength   int  `json:"min_length,omitempty"`
	MaxLength   int  `json:"max_length,omitempty"`
	Placeholder string `json:"placeholder,omitempty"`
}

// BodyDiagramConfig holds configuration for body diagram items.
type BodyDiagramConfig struct {
	View          string `json:"view"` // anterior, posterior, both
	AllowMultiple bool   `json:"allow_multiple"`
}

// ValidationRules holds validation rules for an item.
type ValidationRules struct {
	Pattern         string `json:"pattern,omitempty"`
	MinLength       int    `json:"min_length,omitempty"`
	MaxLength       int    `json:"max_length,omitempty"`
	CustomMessage   string `json:"custom_message,omitempty"`
	CustomMessageVi string `json:"custom_message_vi,omitempty"`
}

// QuickPhrase holds a quick phrase for text items.
type QuickPhrase struct {
	Phrase   string `json:"phrase"`
	PhraseVi string `json:"phrase_vi,omitempty"`
}

// DataMapping holds source/target mapping for auto-population.
type DataMapping struct {
	SourceField string `json:"source_field,omitempty"`
	TargetField string `json:"target_field,omitempty"`
	Transform   string `json:"transform,omitempty"`
}

// CDSRule holds clinical decision support rules.
type CDSRule struct {
	Condition CDSCondition `json:"condition"`
	AlertType string       `json:"alert_type"` // warning, info, critical
	Message   string       `json:"message"`
	MessageVi string       `json:"message_vi,omitempty"`
}

// CDSCondition holds the condition for a CDS rule.
type CDSCondition struct {
	Operator string `json:"operator"`
	Value    any    `json:"value"`
}

// =============================================================================
// CORE MODELS
// =============================================================================

// ChecklistTemplate represents a checklist template.
type ChecklistTemplate struct {
	ID                  string            `json:"id" db:"id"`
	ClinicID            *string           `json:"clinic_id,omitempty" db:"clinic_id"`
	Name                string            `json:"name" db:"name"`
	NameVi              string            `json:"name_vi,omitempty" db:"name_vi"`
	Description         string            `json:"description,omitempty" db:"description"`
	DescriptionVi       string            `json:"description_vi,omitempty" db:"description_vi"`
	Code                string            `json:"code,omitempty" db:"code"`
	TemplateType        string            `json:"template_type" db:"template_type"`
	BodyRegion          *string           `json:"body_region,omitempty" db:"body_region"`
	ApplicableDiagnoses []string          `json:"applicable_diagnoses,omitempty" db:"applicable_diagnoses"`
	Version             int               `json:"version" db:"version"`
	IsCurrentVersion    bool              `json:"is_current_version" db:"is_current_version"`
	PreviousVersionID   *string           `json:"previous_version_id,omitempty" db:"previous_version_id"`
	Settings            *TemplateSettings `json:"settings,omitempty" db:"-"`
	SettingsJSON        json.RawMessage   `json:"-" db:"settings"`
	IsActive            bool              `json:"is_active" db:"is_active"`
	IsArchived          bool              `json:"is_archived" db:"is_archived"`
	CreatedAt           time.Time         `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time         `json:"updated_at" db:"updated_at"`
	CreatedBy           *string           `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy           *string           `json:"updated_by,omitempty" db:"updated_by"`

	// Nested data (populated on fetch)
	Sections []ChecklistSection `json:"sections,omitempty" db:"-"`
}

// ChecklistSection represents a section within a checklist template.
type ChecklistSection struct {
	ID                 string             `json:"id" db:"id"`
	TemplateID         string             `json:"template_id" db:"template_id"`
	Title              string             `json:"title" db:"title"`
	TitleVi            string             `json:"title_vi,omitempty" db:"title_vi"`
	Description        string             `json:"description,omitempty" db:"description"`
	DescriptionVi      string             `json:"description_vi,omitempty" db:"description_vi"`
	SortOrder          int                `json:"sort_order" db:"sort_order"`
	IsRequired         bool               `json:"is_required" db:"is_required"`
	IsCollapsible      bool               `json:"is_collapsible" db:"is_collapsible"`
	DefaultCollapsed   bool               `json:"default_collapsed" db:"default_collapsed"`
	DisplayConditions  *DisplayConditions `json:"display_conditions,omitempty" db:"-"`
	DisplayCondJSON    json.RawMessage    `json:"-" db:"display_conditions"`
	Settings           json.RawMessage    `json:"settings,omitempty" db:"settings"`
	CreatedAt          time.Time          `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time          `json:"updated_at" db:"updated_at"`

	// Nested data
	Items []ChecklistItem `json:"items,omitempty" db:"-"`
}

// ChecklistItem represents an individual item within a section.
type ChecklistItem struct {
	ID                string             `json:"id" db:"id"`
	SectionID         string             `json:"section_id" db:"section_id"`
	Label             string             `json:"label" db:"label"`
	LabelVi           string             `json:"label_vi,omitempty" db:"label_vi"`
	HelpText          string             `json:"help_text,omitempty" db:"help_text"`
	HelpTextVi        string             `json:"help_text_vi,omitempty" db:"help_text_vi"`
	ItemType          ChecklistItemType  `json:"item_type" db:"item_type"`
	ItemConfig        json.RawMessage    `json:"item_config" db:"item_config"`
	SortOrder         int                `json:"sort_order" db:"sort_order"`
	IsRequired        bool               `json:"is_required" db:"is_required"`
	ValidationRules   *ValidationRules   `json:"validation_rules,omitempty" db:"-"`
	ValidationJSON    json.RawMessage    `json:"-" db:"validation_rules"`
	DisplayConditions *DisplayConditions `json:"display_conditions,omitempty" db:"-"`
	DisplayCondJSON   json.RawMessage    `json:"-" db:"display_conditions"`
	QuickPhrases      []QuickPhrase      `json:"quick_phrases,omitempty" db:"-"`
	QuickPhrasesJSON  json.RawMessage    `json:"-" db:"quick_phrases"`
	DataMapping       *DataMapping       `json:"data_mapping,omitempty" db:"-"`
	DataMappingJSON   json.RawMessage    `json:"-" db:"data_mapping"`
	CDSRules          []CDSRule          `json:"cds_rules,omitempty" db:"-"`
	CDSRulesJSON      json.RawMessage    `json:"-" db:"cds_rules"`
	CreatedAt         time.Time          `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time          `json:"updated_at" db:"updated_at"`
}

// =============================================================================
// VISIT CHECKLIST (Instance)
// =============================================================================

// VisitChecklist represents a completed checklist instance for a patient visit.
type VisitChecklist struct {
	ID                   string          `json:"id" db:"id"`
	TemplateID           string          `json:"template_id" db:"template_id"`
	TemplateVersion      int             `json:"template_version" db:"template_version"`
	PatientID            string          `json:"patient_id" db:"patient_id"`
	TreatmentSessionID   *string         `json:"treatment_session_id,omitempty" db:"treatment_session_id"`
	AssessmentID         *string         `json:"assessment_id,omitempty" db:"assessment_id"`
	TherapistID          string          `json:"therapist_id" db:"therapist_id"`
	ClinicID             string          `json:"clinic_id" db:"clinic_id"`
	Status               ChecklistStatus `json:"status" db:"status"`
	ProgressPercentage   float64         `json:"progress_percentage" db:"progress_percentage"`
	StartedAt            *time.Time      `json:"started_at,omitempty" db:"started_at"`
	CompletedAt          *time.Time      `json:"completed_at,omitempty" db:"completed_at"`
	LockedAt             *time.Time      `json:"locked_at,omitempty" db:"locked_at"`
	LockedBy             *string         `json:"locked_by,omitempty" db:"locked_by"`
	LastAutoSaveAt       *time.Time      `json:"last_auto_save_at,omitempty" db:"last_auto_save_at"`
	AutoSaveData         json.RawMessage `json:"auto_save_data,omitempty" db:"auto_save_data"`
	GeneratedNote        string          `json:"generated_note,omitempty" db:"generated_note"`
	GeneratedNoteVi      string          `json:"generated_note_vi,omitempty" db:"generated_note_vi"`
	NoteGenerationStatus string          `json:"note_generation_status,omitempty" db:"note_generation_status"`
	ReviewedBy           *string         `json:"reviewed_by,omitempty" db:"reviewed_by"`
	ReviewedAt           *time.Time      `json:"reviewed_at,omitempty" db:"reviewed_at"`
	ReviewNotes          string          `json:"review_notes,omitempty" db:"review_notes"`
	CreatedAt            time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time       `json:"updated_at" db:"updated_at"`
	CreatedBy            *string         `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy            *string         `json:"updated_by,omitempty" db:"updated_by"`

	// Nested data
	Template  *ChecklistTemplate   `json:"template,omitempty" db:"-"`
	Responses []ChecklistResponse  `json:"responses,omitempty" db:"-"`
}

// ChecklistResponse represents a response to a single checklist item.
type ChecklistResponse struct {
	ID                string          `json:"id" db:"id"`
	VisitChecklistID  string          `json:"visit_checklist_id" db:"visit_checklist_id"`
	ChecklistItemID   string          `json:"checklist_item_id" db:"checklist_item_id"`
	ResponseValue     json.RawMessage `json:"response_value" db:"response_value"`
	IsSkipped         bool            `json:"is_skipped" db:"is_skipped"`
	SkipReason        string          `json:"skip_reason,omitempty" db:"skip_reason"`
	TriggeredAlerts   json.RawMessage `json:"triggered_alerts,omitempty" db:"triggered_alerts"`
	ResponseHistory   json.RawMessage `json:"response_history,omitempty" db:"response_history"`
	CreatedAt         time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at" db:"updated_at"`
	CreatedBy         *string         `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy         *string         `json:"updated_by,omitempty" db:"updated_by"`

	// Additional context
	Item *ChecklistItem `json:"item,omitempty" db:"-"`
}

// =============================================================================
// RESPONSE VALUE TYPES
// =============================================================================

// CheckboxResponse holds a checkbox response value.
type CheckboxResponse struct {
	Checked bool `json:"checked"`
}

// RadioResponse holds a radio response value.
type RadioResponse struct {
	Selected string `json:"selected"`
	Other    string `json:"other,omitempty"`
}

// MultiSelectResponse holds a multi-select response value.
type MultiSelectResponse struct {
	Selected []string `json:"selected"`
	Other    string   `json:"other,omitempty"`
}

// TextResponse holds a text response value.
type TextResponse struct {
	Text string `json:"text"`
}

// NumberResponse holds a number response value.
type NumberResponse struct {
	Value float64 `json:"value"`
}

// ScaleResponse holds a scale response value.
type ScaleResponse struct {
	Value int `json:"value"`
}

// DateResponse holds a date response value.
type DateResponse struct {
	Date string `json:"date"` // ISO date
}

// TimeResponse holds a time response value.
type TimeResponse struct {
	Time string `json:"time"` // HH:MM
}

// DurationResponse holds a duration response value.
type DurationResponse struct {
	Minutes int `json:"minutes"`
}

// BodyDiagramPoint holds a single point on a body diagram.
type BodyDiagramPoint struct {
	X     float64 `json:"x"`
	Y     float64 `json:"y"`
	Label string  `json:"label,omitempty"`
	Type  string  `json:"type,omitempty"` // pain, tenderness, etc.
}

// BodyDiagramResponse holds a body diagram response value.
type BodyDiagramResponse struct {
	Points []BodyDiagramPoint `json:"points"`
}

// SignatureResponse holds a signature response value.
type SignatureResponse struct {
	SignatureData string    `json:"signature_data"` // base64 encoded
	SignedAt      time.Time `json:"signed_at"`
}

// ResponseHistoryEntry represents a single history entry for response changes.
type ResponseHistoryEntry struct {
	Value     json.RawMessage `json:"value"`
	ChangedAt time.Time       `json:"changed_at"`
	ChangedBy string          `json:"changed_by"`
}

// =============================================================================
// FILTERS
// =============================================================================

// ChecklistTemplateFilter represents query filters for listing templates.
type ChecklistTemplateFilter struct {
	ClinicID     string
	TemplateType string
	BodyRegion   string
	IsActive     *bool
	Search       string
	Page         int
	PerPage      int
}

// NewChecklistTemplateFilter creates a filter with defaults.
func NewChecklistTemplateFilter() ChecklistTemplateFilter {
	active := true
	return ChecklistTemplateFilter{
		IsActive: &active,
		Page:     1,
		PerPage:  20,
	}
}

// Offset calculates pagination offset.
func (f ChecklistTemplateFilter) Offset() int {
	return (f.Page - 1) * f.PerPage
}

// Limit returns items per page.
func (f ChecklistTemplateFilter) Limit() int {
	if f.PerPage <= 0 {
		return 20
	}
	if f.PerPage > 100 {
		return 100
	}
	return f.PerPage
}

// VisitChecklistFilter represents query filters for listing visit checklists.
type VisitChecklistFilter struct {
	ClinicID    string
	PatientID   string
	TherapistID string
	Status      ChecklistStatus
	DateFrom    *time.Time
	DateTo      *time.Time
	Page        int
	PerPage     int
}

// NewVisitChecklistFilter creates a filter with defaults.
func NewVisitChecklistFilter() VisitChecklistFilter {
	return VisitChecklistFilter{
		Page:    1,
		PerPage: 20,
	}
}

// Offset calculates pagination offset.
func (f VisitChecklistFilter) Offset() int {
	return (f.Page - 1) * f.PerPage
}

// Limit returns items per page.
func (f VisitChecklistFilter) Limit() int {
	if f.PerPage <= 0 {
		return 20
	}
	if f.PerPage > 100 {
		return 100
	}
	return f.PerPage
}

// =============================================================================
// QUICK ACTIONS MODELS
// =============================================================================

// QuickPainRecord represents a quick pain recording.
type QuickPainRecord struct {
	PatientID   string          `json:"patient_id"`
	ClinicID    string          `json:"clinic_id"`
	TherapistID string          `json:"therapist_id"`
	Level       int             `json:"level"` // 0-10
	Location    string          `json:"location,omitempty"`
	BodyRegion  string          `json:"body_region,omitempty"`
	Notes       string          `json:"notes,omitempty"`
	RecordedAt  time.Time       `json:"recorded_at"`
	Context     string          `json:"context,omitempty"` // pre_session, post_session, follow_up
}

// QuickROMRecord represents a quick ROM measurement.
type QuickROMRecord struct {
	PatientID   string    `json:"patient_id"`
	ClinicID    string    `json:"clinic_id"`
	TherapistID string    `json:"therapist_id"`
	Joint       string    `json:"joint"`
	Movement    string    `json:"movement"`
	Side        string    `json:"side,omitempty"` // left, right, bilateral
	ActiveROM   *float64  `json:"active_rom,omitempty"`
	PassiveROM  *float64  `json:"passive_rom,omitempty"`
	IsPainful   bool      `json:"is_painful"`
	Notes       string    `json:"notes,omitempty"`
	RecordedAt  time.Time `json:"recorded_at"`
}

// QuickScheduleRequest represents a quick scheduling request.
type QuickScheduleRequest struct {
	PatientID   string    `json:"patient_id"`
	ClinicID    string    `json:"clinic_id"`
	TherapistID string    `json:"therapist_id"`
	Date        string    `json:"date"`        // ISO date
	TimeSlot    string    `json:"time_slot"`   // HH:MM
	Duration    int       `json:"duration"`    // minutes
	Notes       string    `json:"notes,omitempty"`
}

// PainDelta represents the change in pain level.
type PainDelta struct {
	CurrentLevel  int     `json:"current_level"`
	PreviousLevel *int    `json:"previous_level,omitempty"`
	Delta         *int    `json:"delta,omitempty"`
	DeltaPercent  *float64 `json:"delta_percent,omitempty"`
	Trend         string  `json:"trend"` // improved, worsened, stable, first_record
}
