package model

import (
	"encoding/xml"
	"fmt"
	"time"
)

// BHYTClaimStatus represents the lifecycle state of a BHYT claim.
type BHYTClaimStatus string

const (
	BHYTClaimStatusPending   BHYTClaimStatus = "pending"
	BHYTClaimStatusSubmitted BHYTClaimStatus = "submitted"
	BHYTClaimStatusApproved  BHYTClaimStatus = "approved"
	BHYTClaimStatusRejected  BHYTClaimStatus = "rejected"
)

// BHYTClaim represents a BHYT insurance claim file for VSS submission.
type BHYTClaim struct {
	ID                   string          `json:"id" db:"id"`
	ClinicID             string          `json:"clinic_id" db:"clinic_id"`
	FacilityCode         string          `json:"facility_code" db:"facility_code"`
	Month                int             `json:"month" db:"month"`
	Year                 int             `json:"year" db:"year"`
	FilePath             string          `json:"file_path,omitempty" db:"file_path"`
	FileName             string          `json:"file_name,omitempty" db:"file_name"`
	Status               BHYTClaimStatus `json:"status" db:"status"`
	TotalAmount          float64         `json:"total_amount" db:"total_amount"`
	TotalInsuranceAmount float64         `json:"total_insurance_amount" db:"total_insurance_amount"`
	TotalPatientAmount   float64         `json:"total_patient_amount" db:"total_patient_amount"`
	LineItemCount        int             `json:"line_item_count" db:"line_item_count"`
	RejectionReason      string          `json:"rejection_reason,omitempty" db:"rejection_reason"`
	Notes                string          `json:"notes,omitempty" db:"notes"`
	CreatedAt            time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time       `json:"updated_at" db:"updated_at"`
	SubmittedAt          *time.Time      `json:"submitted_at,omitempty" db:"submitted_at"`
	ApprovedAt           *time.Time      `json:"approved_at,omitempty" db:"approved_at"`
	RejectedAt           *time.Time      `json:"rejected_at,omitempty" db:"rejected_at"`
	CreatedBy            *string         `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy            *string         `json:"updated_by,omitempty" db:"updated_by"`

	// Joined fields
	LineItems []BHYTClaimLineItem `json:"line_items,omitempty" db:"-"`
}

// GenerateFileName generates the VSS-compliant file name for this claim.
// Format: HS_<facility_code>_<MM><YYYY>.xml
func (c *BHYTClaim) GenerateFileName() string {
	return fmt.Sprintf("HS_%s_%02d%d.xml", c.FacilityCode, c.Month, c.Year)
}

// BHYTClaimLineItem represents a single service record within a BHYT claim.
type BHYTClaimLineItem struct {
	ID             string    `json:"id" db:"id"`
	ClaimID        string    `json:"claim_id" db:"claim_id"`
	InvoiceID      *string   `json:"invoice_id,omitempty" db:"invoice_id"`
	PatientID      string    `json:"patient_id" db:"patient_id"`
	PatientName    string    `json:"patient_name" db:"patient_name"`
	BHYTCardNumber string    `json:"bhyt_card_number" db:"bhyt_card_number"`
	ServiceCode    string    `json:"service_code" db:"service_code"`
	ServiceNameVi  string    `json:"service_name_vi" db:"service_name_vi"`
	Quantity       int       `json:"quantity" db:"quantity"`
	UnitPrice      float64   `json:"unit_price" db:"unit_price"`
	TotalPrice     float64   `json:"total_price" db:"total_price"`
	InsurancePaid  float64   `json:"insurance_paid" db:"insurance_paid"`
	PatientPaid    float64   `json:"patient_paid" db:"patient_paid"`
	ServiceDate    time.Time `json:"service_date" db:"service_date"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}

// --- VSS XML structures per Decision 5937/QD-BHXH ---

// HoSoXML is the root element of the VSS claim XML.
type HoSoXML struct {
	XMLName     xml.Name         `xml:"HoSoXML"`
	MaCSKCB     string           `xml:"ThongTinHoSo>MaCSKCB"`     // Facility code
	Thang       int              `xml:"ThongTinHoSo>Thang"`       // Month
	Nam         int              `xml:"ThongTinHoSo>Nam"`         // Year
	SoHoSo      int              `xml:"ThongTinHoSo>SoHoSo"`     // Number of records
	TongTien    float64          `xml:"ThongTinHoSo>TongTien"`    // Total amount
	TongBHYT    float64          `xml:"ThongTinHoSo>TongBHYT"`    // Total BHYT pays
	TongBNTT    float64          `xml:"ThongTinHoSo>TongBNTT"`    // Total patient pays
	DanhSachHoSo []HoSoBenhNhan  `xml:"DanhSachHoSo>HoSoBenhNhan"`
}

// HoSoBenhNhan represents a patient record in the VSS claim XML.
type HoSoBenhNhan struct {
	MaBN    string          `xml:"BenhNhan>MaBN"`    // Patient code
	MaThe   string          `xml:"BenhNhan>MaThe"`   // BHYT card number
	TenBN   string          `xml:"BenhNhan>TenBN"`   // Patient name
	DichVu  []ChiTietDichVu `xml:"ChiTietDichVu"`
}

// ChiTietDichVu represents a service detail in the VSS claim XML.
type ChiTietDichVu struct {
	Ma            string  `xml:"Ma"`            // Service code
	TenDV         string  `xml:"TenDV"`         // Service name (Vietnamese)
	SoLuong       int     `xml:"SoLuong"`       // Quantity
	DonGia        float64 `xml:"DonGia"`        // Unit price
	ThanhTien     float64 `xml:"ThanhTien"`     // Total price
	BHYTThanhToan float64 `xml:"BHYTThanhToan"` // Insurance pays
	BNThanhToan   float64 `xml:"BNThanhToan"`   // Patient pays
	NgayDV        string  `xml:"NgayDV"`        // Service date (DD/MM/YYYY)
}

// --- Request/Response types ---

// GenerateClaimRequest represents the request body for generating a BHYT claim.
type GenerateClaimRequest struct {
	FacilityCode string `json:"facility_code" validate:"required,min=1,max=20"`
	Month        int    `json:"month" validate:"required,min=1,max=12"`
	Year         int    `json:"year" validate:"required,min=2000,max=2100"`
}

// BHYTClaimSearchParams represents search and filter parameters for BHYT claims.
type BHYTClaimSearchParams struct {
	ClinicID     string          `query:"clinic_id"`
	FacilityCode string          `query:"facility_code"`
	Status       BHYTClaimStatus `query:"status"`
	Year         int             `query:"year"`
	Month        int             `query:"month"`
	SortBy       string          `query:"sort_by"`
	SortOrder    string          `query:"sort_order"`
	Page         int             `query:"page"`
	PerPage      int             `query:"per_page"`
}

// NewBHYTClaimSearchParams creates BHYTClaimSearchParams with default values.
func NewBHYTClaimSearchParams() BHYTClaimSearchParams {
	return BHYTClaimSearchParams{
		SortBy:    "created_at",
		SortOrder: "desc",
		Page:      1,
		PerPage:   20,
	}
}

// Offset calculates the offset for pagination.
func (p BHYTClaimSearchParams) Offset() int {
	return (p.Page - 1) * p.Limit()
}

// Limit returns the number of items per page.
func (p BHYTClaimSearchParams) Limit() int {
	if p.PerPage <= 0 {
		return 20
	}
	if p.PerPage > 100 {
		return 100
	}
	return p.PerPage
}

// BHYTClaimListResponse represents a paginated list of BHYT claims.
type BHYTClaimListResponse struct {
	Data       []BHYTClaim `json:"data"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	PerPage    int         `json:"per_page"`
	TotalPages int         `json:"total_pages"`
}
