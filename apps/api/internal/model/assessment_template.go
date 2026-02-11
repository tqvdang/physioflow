package model

import (
	"encoding/json"
	"time"
)

// TemplateCategory represents the category of an assessment template.
type TemplateCategory string

const (
	TemplateCategoryMusculoskeletal TemplateCategory = "musculoskeletal"
	TemplateCategoryNeurological    TemplateCategory = "neurological"
	TemplateCategoryPediatric       TemplateCategory = "pediatric"
)

// ValidTemplateCategories returns all valid template categories.
func ValidTemplateCategories() []TemplateCategory {
	return []TemplateCategory{
		TemplateCategoryMusculoskeletal,
		TemplateCategoryNeurological,
		TemplateCategoryPediatric,
	}
}

// IsValidTemplateCategory checks whether the given string is a valid category.
func IsValidTemplateCategory(c string) bool {
	for _, v := range ValidTemplateCategories() {
		if string(v) == c {
			return true
		}
	}
	return false
}

// ChecklistItemType represents the type of input for a checklist item.
type ChecklistItemType string

const (
	ChecklistItemTypeSelect   ChecklistItemType = "select"
	ChecklistItemTypeRadio    ChecklistItemType = "radio"
	ChecklistItemTypeNumber   ChecklistItemType = "number"
	ChecklistItemTypeText     ChecklistItemType = "text"
	ChecklistItemTypeCheckbox ChecklistItemType = "checkbox"
)

// ChecklistItem represents a single item within an assessment template.
type ChecklistItem struct {
	Item      string   `json:"item"`
	ItemVi    string   `json:"item_vi"`
	Type      string   `json:"type"`
	Options   []string `json:"options,omitempty"`
	OptionsVi []string `json:"options_vi,omitempty"`
	Unit      string   `json:"unit,omitempty"`
	Range     []int    `json:"range,omitempty"`
	Required  bool     `json:"required"`
	Order     int      `json:"order"`
}

// AssessmentTemplate represents a condition-specific assessment template.
type AssessmentTemplate struct {
	ID             string           `json:"id" db:"id"`
	Name           string           `json:"name" db:"name"`
	NameVi         string           `json:"name_vi" db:"name_vi"`
	Condition      string           `json:"condition" db:"condition"`
	Category       TemplateCategory `json:"category" db:"category"`
	Description    string           `json:"description,omitempty" db:"description"`
	DescriptionVi  string           `json:"description_vi,omitempty" db:"description_vi"`
	ChecklistItems []ChecklistItem  `json:"checklist_items" db:"-"`
	ChecklistJSON  json.RawMessage  `json:"-" db:"checklist_items"`
	IsActive       bool             `json:"is_active" db:"is_active"`
	CreatedAt      time.Time        `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time        `json:"updated_at" db:"updated_at"`
}

// UnmarshalChecklist decodes the JSONB checklist_items into the ChecklistItems field.
func (t *AssessmentTemplate) UnmarshalChecklist() error {
	if t.ChecklistJSON == nil {
		return nil
	}
	return json.Unmarshal(t.ChecklistJSON, &t.ChecklistItems)
}

// MarshalChecklist encodes ChecklistItems into the ChecklistJSON field.
func (t *AssessmentTemplate) MarshalChecklist() error {
	data, err := json.Marshal(t.ChecklistItems)
	if err != nil {
		return err
	}
	t.ChecklistJSON = data
	return nil
}

// PatientAssessmentResult represents a completed assessment for a patient.
type PatientAssessmentResult struct {
	ID          string          `json:"id" db:"id"`
	PatientID   string          `json:"patient_id" db:"patient_id"`
	TemplateID  string          `json:"template_id" db:"template_id"`
	ClinicID    string          `json:"clinic_id" db:"clinic_id"`
	TherapistID string          `json:"therapist_id" db:"therapist_id"`
	Results     json.RawMessage `json:"results" db:"results"`
	Notes       string          `json:"notes,omitempty" db:"notes"`
	AssessedAt  time.Time       `json:"assessed_at" db:"assessed_at"`
	CreatedAt   time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at" db:"updated_at"`
	// Joined fields (not stored directly)
	TemplateName      string `json:"template_name,omitempty" db:"template_name"`
	TemplateNameVi    string `json:"template_name_vi,omitempty" db:"template_name_vi"`
	TemplateCondition string `json:"template_condition,omitempty" db:"template_condition"`
}

// CreateAssessmentResultRequest represents the request body for saving an assessment result.
type CreateAssessmentResultRequest struct {
	PatientID  string          `json:"patient_id" validate:"required,uuid"`
	TemplateID string          `json:"template_id" validate:"required,uuid"`
	Results    json.RawMessage `json:"results" validate:"required"`
	Notes      string          `json:"notes" validate:"max=5000"`
	AssessedAt string          `json:"assessed_at" validate:"omitempty,datetime=2006-01-02T15:04:05Z07:00"`
}
