package model

import "time"

// ReportPeriodType represents the time granularity for revenue reports.
type ReportPeriodType string

const (
	ReportPeriodDaily   ReportPeriodType = "daily"
	ReportPeriodWeekly  ReportPeriodType = "weekly"
	ReportPeriodMonthly ReportPeriodType = "monthly"
	ReportPeriodYearly  ReportPeriodType = "yearly"
)

// AgingBucket represents the days-outstanding classification for receivables.
type AgingBucket string

const (
	AgingBucket0to30  AgingBucket = "0-30"
	AgingBucket31to60 AgingBucket = "31-60"
	AgingBucket61to90 AgingBucket = "61-90"
	AgingBucket90Plus AgingBucket = "90+"
)

// ExportFormat represents the file format for report exports.
type ExportFormat string

const (
	ExportFormatCSV   ExportFormat = "csv"
	ExportFormatExcel ExportFormat = "excel"
)

// RevenueByPeriod represents a single row of revenue data for a time period.
type RevenueByPeriod struct {
	Date             time.Time `json:"date" db:"date"`
	PeriodType       string    `json:"period_type" db:"period_type"`
	TotalRevenue     float64   `json:"total_revenue" db:"total_revenue"`
	InsuranceRevenue float64   `json:"insurance_revenue" db:"insurance_revenue"`
	CashRevenue      float64   `json:"cash_revenue" db:"cash_revenue"`
	InvoiceCount     int       `json:"invoice_count" db:"invoice_count"`
}

// RevenueByPeriodReport is the full revenue report response.
type RevenueByPeriodReport struct {
	Data         []RevenueByPeriod `json:"data"`
	TotalRevenue float64           `json:"total_revenue"`
	TotalInvoices int              `json:"total_invoices"`
	StartDate    string            `json:"start_date"`
	EndDate      string            `json:"end_date"`
	PeriodType   string            `json:"period_type"`
}

// OutstandingPayment represents a single outstanding invoice with aging info.
type OutstandingPayment struct {
	InvoiceID       string  `json:"invoice_id" db:"invoice_id"`
	PatientID       string  `json:"patient_id" db:"patient_id"`
	PatientName     string  `json:"patient_name" db:"patient_name"`
	AmountDue       float64 `json:"amount_due" db:"amount_due"`
	DaysOutstanding int     `json:"days_outstanding" db:"days_outstanding"`
	AgingBucket     string  `json:"aging_bucket" db:"aging_bucket"`
	InvoiceNumber   string  `json:"invoice_number" db:"invoice_number"`
	InvoiceDate     string  `json:"invoice_date" db:"invoice_date"`
	TotalAmount     float64 `json:"total_amount" db:"total_amount"`
	Status          string  `json:"status" db:"status"`
}

// AgingBucketSummary summarizes a single aging bucket.
type AgingBucketSummary struct {
	Bucket       string  `json:"bucket"`
	Count        int     `json:"count"`
	TotalAmount  float64 `json:"total_amount"`
}

// OutstandingPaymentsReport is the full aging report response.
type OutstandingPaymentsReport struct {
	Data           []OutstandingPayment `json:"data"`
	Summary        []AgingBucketSummary `json:"summary"`
	TotalOutstanding float64            `json:"total_outstanding"`
	TotalCount     int                  `json:"total_count"`
}

// ServiceRevenue represents revenue data for a single service code.
type ServiceRevenue struct {
	ServiceCode   string  `json:"service_code" db:"service_code"`
	ServiceName   string  `json:"service_name" db:"service_name"`
	ServiceNameVi string  `json:"service_name_vi" db:"service_name_vi"`
	QuantitySold  int     `json:"quantity_sold" db:"quantity_sold"`
	TotalRevenue  float64 `json:"total_revenue" db:"total_revenue"`
	Rank          int     `json:"rank" db:"rank"`
}

// ServiceRevenueReport is the full top-services report response.
type ServiceRevenueReport struct {
	Data          []ServiceRevenue `json:"data"`
	TotalRevenue  float64          `json:"total_revenue"`
	TotalServices int              `json:"total_services"`
}

// TherapistProductivity represents productivity data for a single therapist.
type TherapistProductivity struct {
	TherapistID       string  `json:"therapist_id" db:"therapist_id"`
	TherapistName     string  `json:"therapist_name" db:"therapist_name"`
	SessionCount      int     `json:"session_count" db:"session_count"`
	TotalRevenue      float64 `json:"total_revenue" db:"total_revenue"`
	AvgRevenuePerSession float64 `json:"avg_revenue_per_session" db:"avg_revenue_per_session"`
	Period            string  `json:"period" db:"period"`
}

// TherapistProductivityReport is the full productivity report response.
type TherapistProductivityReport struct {
	Data             []TherapistProductivity `json:"data"`
	TotalSessions    int                     `json:"total_sessions"`
	TotalRevenue     float64                 `json:"total_revenue"`
	AvgRevenuePerSession float64             `json:"avg_revenue_per_session"`
}

// ReportFilters contains filter parameters for financial reports.
type ReportFilters struct {
	StartDate    *time.Time `query:"startDate"`
	EndDate      *time.Time `query:"endDate"`
	PeriodType   string     `query:"period"`
	TherapistID  string     `query:"therapistId"`
	ServiceCode  string     `query:"serviceCode"`
	AgingBucket  string     `query:"agingBucket"`
	Limit        int        `query:"limit"`
	Format       string     `query:"format"`
}

// DefaultLimit returns the limit or a sensible default.
func (f ReportFilters) DefaultLimit() int {
	if f.Limit <= 0 {
		return 10
	}
	if f.Limit > 100 {
		return 100
	}
	return f.Limit
}

// DefaultPeriod returns the period type or a sensible default.
func (f ReportFilters) DefaultPeriod() string {
	switch f.PeriodType {
	case "daily", "weekly", "monthly", "yearly":
		return f.PeriodType
	default:
		return "monthly"
	}
}
