package model

import (
	"encoding/json"
	"time"
)

// InvoiceStatus represents the lifecycle state of an invoice.
type InvoiceStatus string

const (
	InvoiceStatusDraft     InvoiceStatus = "draft"
	InvoiceStatusPending   InvoiceStatus = "pending"
	InvoiceStatusPartial   InvoiceStatus = "partial"    // Partially paid
	InvoiceStatusPaid      InvoiceStatus = "paid"
	InvoiceStatusOverdue   InvoiceStatus = "overdue"
	InvoiceStatusCancelled InvoiceStatus = "cancelled"
	InvoiceStatusRefunded  InvoiceStatus = "refunded"
)

// PaymentMethod represents the method used for payment.
type PaymentMethod string

const (
	PaymentMethodCash         PaymentMethod = "cash"          // Tien mat
	PaymentMethodBankTransfer PaymentMethod = "bank_transfer"  // Chuyen khoan
	PaymentMethodCard         PaymentMethod = "card"           // The ngan hang
	PaymentMethodMomo         PaymentMethod = "momo"           // Momo e-wallet
	PaymentMethodZaloPay      PaymentMethod = "zalopay"        // ZaloPay e-wallet
	PaymentMethodVNPay        PaymentMethod = "vnpay"          // VNPay gateway
	PaymentMethodBHYT         PaymentMethod = "bhyt"           // BHYT insurance
	PaymentMethodOther        PaymentMethod = "other"
)

// PaymentStatus represents the status of a payment transaction.
type PaymentStatus string

const (
	PaymentStatusPending   PaymentStatus = "pending"
	PaymentStatusCompleted PaymentStatus = "completed"
	PaymentStatusFailed    PaymentStatus = "failed"
	PaymentStatusRefunded  PaymentStatus = "refunded"
)

// ServiceCodeCategory groups PT service codes by type.
type ServiceCodeCategory string

const (
	ServiceCodeCategoryEvaluation  ServiceCodeCategory = "evaluation"
	ServiceCodeCategoryTreatment   ServiceCodeCategory = "treatment"
	ServiceCodeCategoryModality    ServiceCodeCategory = "modality"
	ServiceCodeCategoryExercise    ServiceCodeCategory = "exercise"
	ServiceCodeCategoryManual      ServiceCodeCategory = "manual_therapy"
	ServiceCodeCategoryConsult     ServiceCodeCategory = "consultation"
	ServiceCodeCategoryOther       ServiceCodeCategory = "other"
)

// PTServiceCode represents a physical therapy service code used for billing.
type PTServiceCode struct {
	ID            string              `json:"id" db:"id"`
	ClinicID      *string             `json:"clinic_id,omitempty" db:"clinic_id"`
	Code          string              `json:"code" db:"code" validate:"required,max=20"`
	Name          string              `json:"name" db:"name" validate:"required,max=200"`
	NameVi        string              `json:"name_vi" db:"name_vi" validate:"required,max=200"`
	Description   string              `json:"description,omitempty" db:"description"`
	DescriptionVi string              `json:"description_vi,omitempty" db:"description_vi"`
	Category      ServiceCodeCategory `json:"category" db:"category"`
	UnitPrice     float64             `json:"unit_price" db:"unit_price"`
	Currency      string              `json:"currency" db:"currency"` // VND
	UnitType      string              `json:"unit_type" db:"unit_type"` // session, minute, unit
	DurationMins  *int                `json:"duration_mins,omitempty" db:"duration_mins"`
	BHYTCode      string              `json:"bhyt_code,omitempty" db:"bhyt_code"`
	BHYTPrice     *float64            `json:"bhyt_price,omitempty" db:"bhyt_price"`
	BHYTCoverable bool                `json:"bhyt_coverable" db:"bhyt_coverable"`
	IsGlobal      bool                `json:"is_global" db:"is_global"`
	IsActive      bool                `json:"is_active" db:"is_active"`
	CreatedAt     time.Time           `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time           `json:"updated_at" db:"updated_at"`
	CreatedBy     *string             `json:"created_by,omitempty" db:"created_by"`
}

// Invoice represents a billing invoice for PT services rendered.
type Invoice struct {
	ID               string          `json:"id" db:"id"`
	ClinicID         string          `json:"clinic_id" db:"clinic_id"`
	PatientID        string          `json:"patient_id" db:"patient_id"`
	InvoiceNumber    string          `json:"invoice_number" db:"invoice_number"`
	SessionID        *string         `json:"session_id,omitempty" db:"session_id"`
	Status           InvoiceStatus   `json:"status" db:"status"`
	Currency         string          `json:"currency" db:"currency"` // VND
	Subtotal         float64         `json:"subtotal" db:"subtotal"`
	TaxRate          float64         `json:"tax_rate" db:"tax_rate"`
	TaxAmount        float64         `json:"tax_amount" db:"tax_amount"`
	DiscountAmount   float64         `json:"discount_amount" db:"discount_amount"`
	DiscountReason   string          `json:"discount_reason,omitempty" db:"discount_reason"`
	TotalAmount      float64         `json:"total_amount" db:"total_amount"`
	InsuranceAmount  float64         `json:"insurance_amount" db:"insurance_amount"`
	PatientAmount    float64         `json:"patient_amount" db:"patient_amount"`
	PaidAmount       float64         `json:"paid_amount" db:"paid_amount"`
	BalanceDue       float64         `json:"balance_due" db:"balance_due"`
	BHYTCardID       *string         `json:"bhyt_card_id,omitempty" db:"bhyt_card_id"`
	CoverageJSON     json.RawMessage `json:"-" db:"coverage_details"`
	CoverageDetails  *CoverageCalculation `json:"coverage_details,omitempty" db:"-"`
	Notes            string          `json:"notes,omitempty" db:"notes"`
	NotesVi          string          `json:"notes_vi,omitempty" db:"notes_vi"`
	IssuedAt         time.Time       `json:"issued_at" db:"issued_at"`
	DueAt            *time.Time      `json:"due_at,omitempty" db:"due_at"`
	PaidAt           *time.Time      `json:"paid_at,omitempty" db:"paid_at"`
	CancelledAt      *time.Time      `json:"cancelled_at,omitempty" db:"cancelled_at"`
	CancelledBy      *string         `json:"cancelled_by,omitempty" db:"cancelled_by"`
	CancelledReason  string          `json:"cancelled_reason,omitempty" db:"cancelled_reason"`
	CreatedAt        time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at" db:"updated_at"`
	CreatedBy        *string         `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy        *string         `json:"updated_by,omitempty" db:"updated_by"`

	// Joined fields
	Items    []InvoiceItem `json:"items,omitempty" db:"-"`
	Payments []Payment     `json:"payments,omitempty" db:"-"`
}

// IsPaid returns true if the invoice is fully paid.
func (inv *Invoice) IsPaid() bool {
	return inv.Status == InvoiceStatusPaid
}

// InvoiceItem represents a single line item on an invoice.
type InvoiceItem struct {
	ID            string    `json:"id" db:"id"`
	InvoiceID     string    `json:"invoice_id" db:"invoice_id"`
	ServiceCodeID string    `json:"service_code_id" db:"service_code_id"`
	Description   string    `json:"description" db:"description"`
	DescriptionVi string    `json:"description_vi,omitempty" db:"description_vi"`
	Quantity      int       `json:"quantity" db:"quantity"`
	UnitPrice     float64   `json:"unit_price" db:"unit_price"`
	TotalPrice    float64   `json:"total_price" db:"total_price"`
	BHYTCoverable bool      `json:"bhyt_coverable" db:"bhyt_coverable"`
	BHYTAmount    float64   `json:"bhyt_amount" db:"bhyt_amount"`
	Notes         string    `json:"notes,omitempty" db:"notes"`
	SortOrder     int       `json:"sort_order" db:"sort_order"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`

	// Joined fields
	ServiceCode *PTServiceCode `json:"service_code,omitempty" db:"-"`
}

// Payment represents a payment transaction against an invoice.
type Payment struct {
	ID              string        `json:"id" db:"id"`
	InvoiceID       string        `json:"invoice_id" db:"invoice_id"`
	ClinicID        string        `json:"clinic_id" db:"clinic_id"`
	Amount          float64       `json:"amount" db:"amount"`
	Currency        string        `json:"currency" db:"currency"`
	Method          PaymentMethod `json:"method" db:"method"`
	Status          PaymentStatus `json:"status" db:"status"`
	TransactionRef  string        `json:"transaction_ref,omitempty" db:"transaction_ref"`
	ReceiptNumber   string        `json:"receipt_number,omitempty" db:"receipt_number"`
	Notes           string        `json:"notes,omitempty" db:"notes"`
	PaidAt          time.Time     `json:"paid_at" db:"paid_at"`
	RefundedAt      *time.Time    `json:"refunded_at,omitempty" db:"refunded_at"`
	RefundedBy      *string       `json:"refunded_by,omitempty" db:"refunded_by"`
	RefundReason    string        `json:"refund_reason,omitempty" db:"refund_reason"`
	CreatedAt       time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time     `json:"updated_at" db:"updated_at"`
	CreatedBy       *string       `json:"created_by,omitempty" db:"created_by"`
}

// CreateInvoiceRequest represents the request body for creating an invoice.
type CreateInvoiceRequest struct {
	PatientID      string                   `json:"patient_id" validate:"required,uuid"`
	SessionID      string                   `json:"session_id" validate:"omitempty,uuid"`
	BHYTCardID     string                   `json:"bhyt_card_id" validate:"omitempty,uuid"`
	Items          []CreateInvoiceItemRequest `json:"items" validate:"required,min=1"`
	DiscountAmount float64                  `json:"discount_amount" validate:"min=0"`
	DiscountReason string                   `json:"discount_reason" validate:"max=500"`
	Notes          string                   `json:"notes" validate:"max=2000"`
	NotesVi        string                   `json:"notes_vi" validate:"max=2000"`
	DueAt          string                   `json:"due_at" validate:"omitempty,datetime=2006-01-02"`
}

// CreateInvoiceItemRequest represents a line item in a create invoice request.
type CreateInvoiceItemRequest struct {
	ServiceCodeID string `json:"service_code_id" validate:"required,uuid"`
	Quantity      int    `json:"quantity" validate:"required,min=1,max=100"`
	Notes         string `json:"notes" validate:"max=500"`
}

// RecordPaymentRequest represents the request body for recording a payment.
type RecordPaymentRequest struct {
	InvoiceID      string `json:"invoice_id" validate:"required,uuid"`
	Amount         float64 `json:"amount" validate:"required,gt=0"`
	Method         string `json:"method" validate:"required,oneof=cash bank_transfer card momo zalopay vnpay bhyt other"`
	TransactionRef string `json:"transaction_ref" validate:"max=100"`
	Notes          string `json:"notes" validate:"max=1000"`
	PaidAt         string `json:"paid_at" validate:"omitempty,datetime=2006-01-02T15:04:05Z07:00"`
}

// InvoiceSearchParams represents search and filter parameters for invoices.
type InvoiceSearchParams struct {
	ClinicID  string        `query:"clinic_id"`
	PatientID string        `query:"patient_id"`
	Status    InvoiceStatus `query:"status"`
	DateFrom  *time.Time    `query:"date_from"`
	DateTo    *time.Time    `query:"date_to"`
	Search    string        `query:"search"`
	SortBy    string        `query:"sort_by"`
	SortOrder string        `query:"sort_order"`
	Page      int           `query:"page"`
	PerPage   int           `query:"per_page"`
}

// NewInvoiceSearchParams creates InvoiceSearchParams with default values.
func NewInvoiceSearchParams() InvoiceSearchParams {
	return InvoiceSearchParams{
		SortBy:    "issued_at",
		SortOrder: "desc",
		Page:      1,
		PerPage:   20,
	}
}

// Offset calculates the offset for pagination.
func (p InvoiceSearchParams) Offset() int {
	return (p.Page - 1) * p.Limit()
}

// Limit returns the number of items per page.
func (p InvoiceSearchParams) Limit() int {
	if p.PerPage <= 0 {
		return 20
	}
	if p.PerPage > 100 {
		return 100
	}
	return p.PerPage
}

// InvoiceListResponse represents a paginated list of invoices.
type InvoiceListResponse struct {
	Data       []Invoice `json:"data"`
	Total      int64     `json:"total"`
	Page       int       `json:"page"`
	PerPage    int       `json:"per_page"`
	TotalPages int       `json:"total_pages"`
}

// BillingSummary provides aggregated billing data for a patient or clinic.
type BillingSummary struct {
	TotalInvoices    int     `json:"total_invoices"`
	TotalBilled      float64 `json:"total_billed"`
	TotalPaid        float64 `json:"total_paid"`
	TotalOutstanding float64 `json:"total_outstanding"`
	TotalInsurance   float64 `json:"total_insurance"`
	TotalDiscount    float64 `json:"total_discount"`
	Currency         string  `json:"currency"`
}

// BillingCalculation represents a billing estimate without persisting an invoice.
type BillingCalculation struct {
	PatientID       string            `json:"patient_id"`
	TotalAmount     float64           `json:"total_amount"`
	InsuranceAmount float64           `json:"insurance_amount"`
	CopayAmount     float64           `json:"copay_amount"`
	CoveragePercent float64           `json:"coverage_percent"`
	Currency        string            `json:"currency"`
	LineItems       []BillingLineItem `json:"line_items"`
	CalculatedAt    time.Time         `json:"calculated_at"`
}

// BillingLineItem represents a single service in a billing calculation.
type BillingLineItem struct {
	Code            string  `json:"code"`
	Name            string  `json:"name"`
	NameVi          string  `json:"name_vi"`
	UnitPrice       float64 `json:"unit_price"`
	Currency        string  `json:"currency"`
	BHYTCoverable   bool    `json:"bhyt_coverable"`
	InsuranceAmount float64 `json:"insurance_amount"`
	PatientAmount   float64 `json:"patient_amount"`
}

// CalculateBillingRequest represents the request body for calculating billing.
type CalculateBillingRequest struct {
	ServiceCodes []string `json:"service_codes" validate:"required,min=1"`
}
