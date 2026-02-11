package model

import (
	"time"
)

// ReportType represents the type of report.
type ReportType string

const (
	ReportTypeDischargeSummary ReportType = "discharge_summary"
	ReportTypeInvoice          ReportType = "invoice"
	ReportTypeTreatmentPlan    ReportType = "treatment_plan"
	ReportTypeCustom           ReportType = "custom"
)

// ReportTemplate represents a stored report template.
type ReportTemplate struct {
	ID             string     `json:"id" db:"id"`
	Name           string     `json:"name" db:"name"`
	Slug           string     `json:"slug" db:"slug"`
	Description    string     `json:"description,omitempty" db:"description"`
	Locale         string     `json:"locale" db:"locale"`
	TemplateType   ReportType `json:"template_type" db:"template_type"`
	ContentHTML    string     `json:"content_html" db:"content_html"`
	HeaderHTML     string     `json:"header_html,omitempty" db:"header_html"`
	FooterHTML     string     `json:"footer_html,omitempty" db:"footer_html"`
	CSS            string     `json:"css,omitempty" db:"css"`
	PageSize       string     `json:"page_size" db:"page_size"`
	Orientation    string     `json:"orientation" db:"orientation"`
	MarginTopMM    int        `json:"margin_top_mm" db:"margin_top_mm"`
	MarginBottomMM int        `json:"margin_bottom_mm" db:"margin_bottom_mm"`
	MarginLeftMM   int        `json:"margin_left_mm" db:"margin_left_mm"`
	MarginRightMM  int        `json:"margin_right_mm" db:"margin_right_mm"`
	IsDefault      bool       `json:"is_default" db:"is_default"`
	IsActive       bool       `json:"is_active" db:"is_active"`
	Version        int        `json:"version" db:"version"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
}

// GeneratedReport tracks a generated PDF report.
type GeneratedReport struct {
	ID            string    `json:"id" db:"id"`
	TemplateID    *string   `json:"template_id,omitempty" db:"template_id"`
	ReportType    string    `json:"report_type" db:"report_type"`
	SourceID      string    `json:"source_id" db:"source_id"`
	SourceType    string    `json:"source_type" db:"source_type"`
	Locale        string    `json:"locale" db:"locale"`
	FilePath      string    `json:"file_path,omitempty" db:"file_path"`
	FileSizeBytes int64     `json:"file_size_bytes" db:"file_size_bytes"`
	MimeType      string    `json:"mime_type" db:"mime_type"`
	GeneratedBy   *string   `json:"generated_by,omitempty" db:"generated_by"`
	GeneratedAt   time.Time `json:"generated_at" db:"generated_at"`
}

// DischargeSummaryPDFData holds all data needed to render a discharge summary PDF template.
type DischargeSummaryPDFData struct {
	// Patient info
	PatientName   string
	PatientNameVi string
	PatientMRN    string
	PatientDOB    string
	PatientPhone  string

	// Clinical info
	Diagnosis          string
	DiagnosisVi        string
	TreatmentSummary   string
	TreatmentSummaryVi string

	// Treatment stats
	TotalSessions     int
	TreatmentDuration int
	FirstVisitDate    string
	LastVisitDate     string
	DateRange         string

	// Therapist
	TherapistName string

	// Outcome comparisons
	BaselineComparisons []BaselineComparison

	// Functional status
	FunctionalStatus   string
	FunctionalStatusVi string

	// Discharge details
	DischargeReason   string
	DischargeReasonVi string
	Prognosis         string
	PrognosisVi       string

	// Home program
	HomeProgram *DischargeHomeProgram

	// Recommendations
	Recommendations []DischargeRecommendation

	// Follow-up
	FollowUp *FollowUpPlan

	// Metadata
	GeneratedAt   string
	ClinicName    string
	ClinicNameVi  string
	ClinicAddress string
	ClinicPhone   string
}

// InvoicePDFData holds all data needed to render an invoice PDF template.
type InvoicePDFData struct {
	// Invoice info
	InvoiceNumber string
	InvoiceDate   string
	DueDate       string
	Status        string
	StatusVi      string

	// Patient info
	PatientName   string
	PatientNameVi string
	PatientMRN    string
	PatientPhone  string

	// Items
	Items []InvoicePDFItem

	// Amounts
	Subtotal        string
	SubtotalRaw     float64
	TaxRate         float64
	TaxAmount       string
	TaxAmountRaw    float64
	DiscountAmount  string
	DiscountReason  string
	TotalAmount     string
	TotalAmountRaw  float64
	InsuranceAmount string
	PatientAmount   string
	PaidAmount      string
	BalanceDue      string
	Currency        string

	// BHYT info
	HasBHYT        bool
	BHYTCardNumber string
	CoverageRate   string

	// Notes
	Notes   string
	NotesVi string

	// Metadata
	GeneratedAt   string
	ClinicName    string
	ClinicNameVi  string
	ClinicAddress string
	ClinicPhone   string
}

// InvoicePDFItem represents a line item for the invoice PDF.
type InvoicePDFItem struct {
	Index         int
	Description   string
	DescriptionVi string
	Quantity      int
	UnitPrice     string
	TotalPrice    string
	BHYTCoverable bool
	BHYTAmount    string
}
