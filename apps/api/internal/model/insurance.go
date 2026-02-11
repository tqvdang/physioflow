package model

import "time"

// BHYTCardRegex is the validation pattern for Vietnamese BHYT insurance card numbers.
// Format: 2-letter prefix + 1-digit beneficiary type + 2-digit province code + 10-digit ID.
const BHYTCardRegex = `^[A-Z]{2}[1-5]\d{2}\d{10}$`

// BHYT card prefix codes indicating beneficiary categories.
// Total: 18 prefix codes across 10 categories.
const (
	BHYTPrefixSalariedWorker    = "DN" // Doanh nghiep (Enterprise workers)
	BHYTPrefixCivilServant      = "HC" // Hanh chinh (Civil servants)
	BHYTPrefixRetiree           = "HT" // Huu tri (Retirees)
	BHYTPrefixChild             = "TE" // Tre em (Children under 6)
	BHYTPrefixStudent           = "HS" // Hoc sinh (Students) - 5% copay, 80% coverage
	BHYTPrefixPoor              = "HN" // Ho ngheo (Poor households)
	BHYTPrefixNearPoor          = "CN" // Can ngheo (Near-poor households)
	BHYTPrefixVoluntary         = "TN" // Tu nguyen (Voluntary participants)
	BHYTPrefixMeritorious       = "CC" // Chinh sach (Policy beneficiaries)
	BHYTPrefixMilitary          = "QN" // Quan nhan (Military)
	BHYTPrefixVeteran           = "CA" // Cuu chien binh (Veterans) - 0% copay, 95% coverage
	BHYTPrefixForeignWorker     = "NN" // Nguoi nuoc ngoai (Foreign workers)
	BHYTPrefixMartyrFamily      = "GD" // Gia dinh liet si (Martyrs' families) - 0% copay, 100% coverage
	BHYTPrefixElderly           = "NO" // Nguoi cao tuoi 80+ (Elderly 80+) - 0% copay, 100% coverage
	BHYTPrefixWarVeteran        = "CB" // Thuong binh (War veterans)
	BHYTPrefixPoorHousehold     = "XK" // Ho ngheo / can ngheo (Poor/near-poor households)
	BHYTPrefixSocialInsurance   = "TX" // Bao hiem xa hoi (Social insurance)
)

// ValidBHYTPrefixes lists all 18 recognized BHYT card prefix codes.
// Categories:
//   HC1-4: Civil servants             DN1-3: Enterprise workers
//   TE1-3: Children                   CB1-2: War veterans
//   XK1-2: Poor/near-poor households  NN1-3: Farmers/self-employed
//   TN1-2: Voluntary participants     TX1-2: Social insurance
//   HS1-2: Students                   CA1-2: Veterans/police
//   GD1-2: Martyrs' families          NO1:   Elderly 80+
var ValidBHYTPrefixes = []string{
	BHYTPrefixSalariedWorker,   // DN
	BHYTPrefixCivilServant,     // HC
	BHYTPrefixRetiree,          // HT
	BHYTPrefixChild,            // TE
	BHYTPrefixStudent,          // HS
	BHYTPrefixPoor,             // HN
	BHYTPrefixNearPoor,         // CN
	BHYTPrefixVoluntary,        // TN
	BHYTPrefixMeritorious,      // CC
	BHYTPrefixMilitary,         // QN
	BHYTPrefixVeteran,          // CA
	BHYTPrefixForeignWorker,    // NN
	BHYTPrefixMartyrFamily,     // GD
	BHYTPrefixElderly,          // NO
	BHYTPrefixWarVeteran,       // CB
	BHYTPrefixPoorHousehold,    // XK
	BHYTPrefixSocialInsurance,  // TX
}

// BHYTBeneficiaryType indicates the BHYT beneficiary category number (1-5).
type BHYTBeneficiaryType int

const (
	BHYTBeneficiary80  BHYTBeneficiaryType = 1 // 80% coverage
	BHYTBeneficiary100 BHYTBeneficiaryType = 2 // 100% coverage (poor, children, meritorious)
	BHYTBeneficiary95  BHYTBeneficiaryType = 3 // 95% coverage (near-poor, retirees)
	BHYTBeneficiary40  BHYTBeneficiaryType = 4 // 40% co-pay (wrong facility level)
	BHYTBeneficiary70  BHYTBeneficiaryType = 5 // 70% coverage (voluntary participants)
)

// InsuranceVerificationStatus represents the verification state of an insurance card.
type InsuranceVerificationStatus string

const (
	InsuranceVerificationPending  InsuranceVerificationStatus = "pending"
	InsuranceVerificationVerified InsuranceVerificationStatus = "verified"
	InsuranceVerificationExpired  InsuranceVerificationStatus = "expired"
	InsuranceVerificationInvalid  InsuranceVerificationStatus = "invalid"
	InsuranceVerificationFailed   InsuranceVerificationStatus = "failed"
)

// BHYTCard represents a Vietnamese BHYT (Bao Hiem Y Te) national health insurance card.
type BHYTCard struct {
	ID                       string                      `json:"id" db:"id"`
	PatientID                string                      `json:"patient_id" db:"patient_id" validate:"required,uuid"`
	ClinicID                 string                      `json:"clinic_id" db:"clinic_id" validate:"required,uuid"`
	CardNumber               string                      `json:"card_number" db:"card_number" validate:"required,max=15"`
	Prefix                   string                      `json:"prefix" db:"prefix"`
	BeneficiaryType          BHYTBeneficiaryType         `json:"beneficiary_type" db:"beneficiary_type"`
	ProvinceCode             string                      `json:"province_code" db:"province_code"`
	HolderName               string                      `json:"holder_name" db:"holder_name" validate:"required,max=200"`
	HolderNameVi             string                      `json:"holder_name_vi" db:"holder_name_vi" validate:"required,max=200"`
	DateOfBirth              time.Time                   `json:"date_of_birth" db:"date_of_birth"`
	RegisteredFacilityCode   string                      `json:"registered_facility_code" db:"registered_facility_code"`
	RegisteredFacilityName   string                      `json:"registered_facility_name,omitempty" db:"registered_facility_name"`
	HospitalRegistrationCode string                      `json:"hospital_registration_code,omitempty" db:"hospital_registration_code"`
	ExpirationDate           *time.Time                  `json:"expiration_date,omitempty" db:"expiration_date"`
	ValidFrom                time.Time                   `json:"valid_from" db:"valid_from"`
	ValidTo                  *time.Time                  `json:"valid_to,omitempty" db:"valid_to"`
	FiveYearContinuous       bool                        `json:"five_year_continuous" db:"five_year_continuous"`
	Verification             InsuranceVerificationStatus `json:"verification" db:"verification"`
	VerifiedAt               *time.Time                  `json:"verified_at,omitempty" db:"verified_at"`
	VerifiedBy               *string                     `json:"verified_by,omitempty" db:"verified_by"`
	Notes                    string                      `json:"notes,omitempty" db:"notes"`
	IsActive                 bool                        `json:"is_active" db:"is_active"`
	CreatedAt                time.Time                   `json:"created_at" db:"created_at"`
	UpdatedAt                time.Time                   `json:"updated_at" db:"updated_at"`
	CreatedBy                *string                     `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy                *string                     `json:"updated_by,omitempty" db:"updated_by"`
}

// IsValid checks whether the card is currently within its validity period.
func (c *BHYTCard) IsValid() bool {
	now := time.Now()
	if now.Before(c.ValidFrom) {
		return false
	}
	if c.ValidTo != nil && now.After(*c.ValidTo) {
		return false
	}
	return c.Verification == InsuranceVerificationVerified
}

// IsExpiredOnDate checks whether the card is expired on a given date.
// It checks both ExpirationDate and ValidTo fields.
func (c *BHYTCard) IsExpiredOnDate(date time.Time) bool {
	if c.ExpirationDate != nil && date.After(*c.ExpirationDate) {
		return true
	}
	if c.ValidTo != nil && date.After(*c.ValidTo) {
		return true
	}
	return false
}

// IsFacilityEligible checks whether the card is registered at the given facility.
func (c *BHYTCard) IsFacilityEligible(facilityCode string) bool {
	if facilityCode == "" || c.HospitalRegistrationCode == "" {
		return true // Cannot determine, assume eligible
	}
	return c.HospitalRegistrationCode == facilityCode
}

// BHYTValidationResult represents the result of validating a BHYT card.
type BHYTValidationResult struct {
	CardNumber       string                      `json:"card_number"`
	IsValid          bool                        `json:"is_valid"`
	Verification     InsuranceVerificationStatus `json:"verification"`
	Prefix           string                      `json:"prefix"`
	BeneficiaryType  BHYTBeneficiaryType         `json:"beneficiary_type"`
	ProvinceCode     string                      `json:"province_code"`
	CoveragePercent  float64                     `json:"coverage_percent"`
	IsExpired        bool                        `json:"is_expired"`
	IsContinuous     bool                        `json:"is_continuous"`
	FacilityMismatch bool                        `json:"facility_mismatch,omitempty"`
	Errors           []string                    `json:"errors,omitempty"`
	ValidatedAt      time.Time                   `json:"validated_at"`
}

// CoverageCalculation represents a BHYT coverage computation for a visit or service.
type CoverageCalculation struct {
	BHYTCardID          string    `json:"bhyt_card_id"`
	PatientID           string    `json:"patient_id"`
	ServiceTotal        float64   `json:"service_total"`
	CoveragePercent     float64   `json:"coverage_percent"`
	InsurancePays       float64   `json:"insurance_pays"`
	PatientPays         float64   `json:"patient_pays"`
	IsCorrectFacility   bool      `json:"is_correct_facility"`
	IsReferral          bool      `json:"is_referral"`
	ReferralAdjustment  float64   `json:"referral_adjustment,omitempty"`
	FiveYearBonus       bool      `json:"five_year_bonus"`
	FiveYearAdjustment  float64   `json:"five_year_adjustment,omitempty"`
	CalculatedAt        time.Time `json:"calculated_at"`
}

// CreateBHYTCardRequest represents the request body for registering a BHYT card.
type CreateBHYTCardRequest struct {
	PatientID                string `json:"patient_id" validate:"required,uuid"`
	CardNumber               string `json:"card_number" validate:"required,max=15"`
	HolderName               string `json:"holder_name" validate:"required,max=200"`
	HolderNameVi             string `json:"holder_name_vi" validate:"required,max=200"`
	DateOfBirth              string `json:"date_of_birth" validate:"required,datetime=2006-01-02"`
	RegisteredFacilityCode   string `json:"registered_facility_code" validate:"required,max=20"`
	RegisteredFacilityName   string `json:"registered_facility_name" validate:"max=200"`
	HospitalRegistrationCode string `json:"hospital_registration_code" validate:"omitempty,len=5"`
	ExpirationDate           string `json:"expiration_date" validate:"omitempty,datetime=2006-01-02"`
	ValidFrom                string `json:"valid_from" validate:"required,datetime=2006-01-02"`
	ValidTo                  string `json:"valid_to" validate:"omitempty,datetime=2006-01-02"`
	FiveYearContinuous       bool   `json:"five_year_continuous"`
	Notes                    string `json:"notes" validate:"max=1000"`
}

// UpdateBHYTCardRequest represents the request body for updating a BHYT card.
type UpdateBHYTCardRequest struct {
	CardNumber               *string `json:"card_number" validate:"omitempty,max=15"`
	HolderName               *string `json:"holder_name" validate:"omitempty,max=200"`
	HolderNameVi             *string `json:"holder_name_vi" validate:"omitempty,max=200"`
	RegisteredFacilityCode   *string `json:"registered_facility_code" validate:"omitempty,max=20"`
	RegisteredFacilityName   *string `json:"registered_facility_name" validate:"omitempty,max=200"`
	HospitalRegistrationCode *string `json:"hospital_registration_code" validate:"omitempty,len=5"`
	ExpirationDate           *string `json:"expiration_date" validate:"omitempty,datetime=2006-01-02"`
	ValidFrom                *string `json:"valid_from" validate:"omitempty,datetime=2006-01-02"`
	ValidTo                  *string `json:"valid_to" validate:"omitempty,datetime=2006-01-02"`
	FiveYearContinuous       *bool   `json:"five_year_continuous"`
	Notes                    *string `json:"notes" validate:"omitempty,max=1000"`
	IsActive                 *bool   `json:"is_active"`
}

// BHYTCardSearchParams represents search and filter parameters for BHYT cards.
type BHYTCardSearchParams struct {
	ClinicID     string                      `query:"clinic_id"`
	PatientID    string                      `query:"patient_id"`
	CardNumber   string                      `query:"card_number"`
	Verification InsuranceVerificationStatus `query:"verification"`
	IsActive     *bool                       `query:"is_active"`
	SortBy       string                      `query:"sort_by"`
	SortOrder    string                      `query:"sort_order"`
	Page         int                         `query:"page"`
	PerPage      int                         `query:"per_page"`
}

// NewBHYTCardSearchParams creates BHYTCardSearchParams with default values.
func NewBHYTCardSearchParams() BHYTCardSearchParams {
	isActive := true
	return BHYTCardSearchParams{
		IsActive:  &isActive,
		SortBy:    "created_at",
		SortOrder: "desc",
		Page:      1,
		PerPage:   20,
	}
}

// Offset calculates the offset for pagination.
func (p BHYTCardSearchParams) Offset() int {
	return (p.Page - 1) * p.Limit()
}

// Limit returns the number of items per page.
func (p BHYTCardSearchParams) Limit() int {
	if p.PerPage <= 0 {
		return 20
	}
	if p.PerPage > 100 {
		return 100
	}
	return p.PerPage
}

// BHYTCardListResponse represents a paginated list of BHYT cards.
type BHYTCardListResponse struct {
	Data       []BHYTCard `json:"data"`
	Total      int64      `json:"total"`
	Page       int        `json:"page"`
	PerPage    int        `json:"per_page"`
	TotalPages int        `json:"total_pages"`
}

// ValidateBHYTCardRequest represents the request body for validating a BHYT card.
type ValidateBHYTCardRequest struct {
	CardNumber string `json:"card_number" validate:"required,max=15"`
	VisitDate  string `json:"visit_date" validate:"omitempty,datetime=2006-01-02"`
}

// CalculateCoverageRequest represents the request body for calculating coverage.
type CalculateCoverageRequest struct {
	TotalAmount       float64 `json:"total_amount" validate:"required,gt=0"`
	FacilityCode      string  `json:"facility_code" validate:"omitempty,len=5"`
	IsCorrectFacility bool    `json:"is_correct_facility"`
	IsReferral        bool    `json:"is_referral"`
}

// AuditEntry represents an audit log entry for insurance operations.
type AuditEntry struct {
	ID         string    `json:"id" db:"id"`
	EntityType string    `json:"entity_type" db:"entity_type"`
	EntityID   string    `json:"entity_id" db:"entity_id"`
	Action     string    `json:"action" db:"action"`
	PerformedBy string  `json:"performed_by" db:"performed_by"`
	Details    string    `json:"details,omitempty" db:"details"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}
