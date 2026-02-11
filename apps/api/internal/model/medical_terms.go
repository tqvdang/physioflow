package model

import "time"

// TermCategory groups medical terms by clinical domain.
type TermCategory string

const (
	TermCategoryAnatomy    TermCategory = "anatomy"
	TermCategorySymptom    TermCategory = "symptom"
	TermCategoryCondition  TermCategory = "condition"
	TermCategoryTreatment  TermCategory = "treatment"
	TermCategoryAssessment TermCategory = "assessment"
)

// ValidTermCategories contains all valid term categories.
var ValidTermCategories = []string{
	string(TermCategoryAnatomy),
	string(TermCategorySymptom),
	string(TermCategoryCondition),
	string(TermCategoryTreatment),
	string(TermCategoryAssessment),
}

// MedicalTerm represents a bilingual medical term for Vietnamese PT practice.
// Maps to the vietnamese_medical_terms table.
type MedicalTerm struct {
	ID           string    `json:"id" db:"id"`
	TermEn       string    `json:"term_en" db:"term_en"`
	TermVi       string    `json:"term_vi" db:"term_vi"`
	DefinitionEn string    `json:"definition_en,omitempty" db:"definition_en"`
	DefinitionVi string    `json:"definition_vi,omitempty" db:"definition_vi"`
	Category     string    `json:"category" db:"category"`
	Subcategory  string    `json:"subcategory,omitempty" db:"subcategory"`
	ICD10Code    string    `json:"icd10_code,omitempty" db:"icd10_code"`
	AliasesEn    []string  `json:"aliases_en,omitempty" db:"aliases_en"`
	AliasesVi    []string  `json:"aliases_vi,omitempty" db:"aliases_vi"`
	CommonlyUsed bool      `json:"commonly_used" db:"commonly_used"`
	UsageNotes   string    `json:"usage_notes,omitempty" db:"usage_notes"`
	IsActive     bool      `json:"is_active" db:"is_active"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

// TermSearchResult represents a medical term search result with relevance scoring.
type TermSearchResult struct {
	Term       MedicalTerm `json:"term"`
	Score      float64     `json:"score"`
	MatchField string      `json:"match_field"` // term_en or term_vi
}

// CreateMedicalTermRequest represents the request body for creating a medical term.
type CreateMedicalTermRequest struct {
	TermEn       string   `json:"term_en" validate:"required,max=255"`
	TermVi       string   `json:"term_vi" validate:"required,max=255"`
	DefinitionEn string   `json:"definition_en" validate:"max=2000"`
	DefinitionVi string   `json:"definition_vi" validate:"max=2000"`
	Category     string   `json:"category" validate:"required,oneof=anatomy symptom condition treatment assessment"`
	Subcategory  string   `json:"subcategory" validate:"max=100"`
	ICD10Code    string   `json:"icd10_code" validate:"max=20"`
	AliasesEn    []string `json:"aliases_en" validate:"omitempty,dive,max=255"`
	AliasesVi    []string `json:"aliases_vi" validate:"omitempty,dive,max=255"`
	CommonlyUsed *bool    `json:"commonly_used"`
	UsageNotes   string   `json:"usage_notes" validate:"max=2000"`
}

// MedicalTermSearchParams represents search and filter parameters for medical terms.
type MedicalTermSearchParams struct {
	Search    string `query:"search"`
	Category  string `query:"category"`
	IsActive  *bool  `query:"is_active"`
	SortBy    string `query:"sort_by"`
	SortOrder string `query:"sort_order"`
	Page      int    `query:"page"`
	PerPage   int    `query:"per_page"`
}

// NewMedicalTermSearchParams creates MedicalTermSearchParams with default values.
func NewMedicalTermSearchParams() MedicalTermSearchParams {
	isActive := true
	return MedicalTermSearchParams{
		IsActive:  &isActive,
		SortBy:    "term_en",
		SortOrder: "asc",
		Page:      1,
		PerPage:   20,
	}
}

// Offset calculates the offset for pagination.
func (p MedicalTermSearchParams) Offset() int {
	return (p.Page - 1) * p.Limit()
}

// Limit returns the number of items per page.
func (p MedicalTermSearchParams) Limit() int {
	if p.PerPage <= 0 {
		return 20
	}
	if p.PerPage > 100 {
		return 100
	}
	return p.PerPage
}

// MedicalTermListResponse represents a paginated list of medical terms.
type MedicalTermListResponse struct {
	Data       []MedicalTerm `json:"data"`
	Total      int64         `json:"total"`
	Page       int           `json:"page"`
	PerPage    int           `json:"per_page"`
	TotalPages int           `json:"total_pages"`
}
