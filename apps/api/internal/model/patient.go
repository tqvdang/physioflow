package model

import (
	"database/sql"
	"encoding/json"
	"time"
)

// Gender represents the gender enum type.
type Gender string

const (
	GenderMale         Gender = "male"
	GenderFemale       Gender = "female"
	GenderOther        Gender = "other"
	GenderPreferNotSay Gender = "prefer_not_to_say"
)

// LanguagePreference represents the language preference enum type.
type LanguagePreference string

const (
	LanguageVietnamese LanguagePreference = "vi"
	LanguageEnglish    LanguagePreference = "en"
)

// EmergencyContact represents emergency contact information.
type EmergencyContact struct {
	Name         string `json:"name,omitempty"`
	Phone        string `json:"phone,omitempty"`
	Relationship string `json:"relationship,omitempty"`
}

// Patient represents a patient in the system.
type Patient struct {
	ID                 string             `json:"id" db:"id"`
	ClinicID           string             `json:"clinic_id" db:"clinic_id"`
	MRN                string             `json:"mrn" db:"mrn"`
	FirstName          string             `json:"first_name" db:"first_name"`
	LastName           string             `json:"last_name" db:"last_name"`
	FirstNameVi        string             `json:"first_name_vi,omitempty" db:"first_name_vi"`
	LastNameVi         string             `json:"last_name_vi,omitempty" db:"last_name_vi"`
	DateOfBirth        time.Time          `json:"date_of_birth" db:"date_of_birth"`
	Gender             Gender             `json:"gender" db:"gender"`
	Phone              string             `json:"phone,omitempty" db:"phone"`
	Email              string             `json:"email,omitempty" db:"email"`
	Address            string             `json:"address,omitempty" db:"address"`
	AddressVi          string             `json:"address_vi,omitempty" db:"address_vi"`
	LanguagePreference LanguagePreference `json:"language_preference" db:"language_preference"`
	EmergencyContact   EmergencyContact   `json:"emergency_contact" db:"emergency_contact"`
	MedicalAlerts      []string           `json:"medical_alerts,omitempty" db:"medical_alerts"`
	Notes              string             `json:"notes,omitempty" db:"notes"`
	IsActive           bool               `json:"is_active" db:"is_active"`
	CreatedAt          time.Time          `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time          `json:"updated_at" db:"updated_at"`
	CreatedBy          *string            `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy          *string            `json:"updated_by,omitempty" db:"updated_by"`
}

// FullName returns the patient's full name in English.
func (p *Patient) FullName() string {
	return p.FirstName + " " + p.LastName
}

// FullNameVi returns the patient's full name in Vietnamese format (last name first).
func (p *Patient) FullNameVi() string {
	if p.LastNameVi != "" && p.FirstNameVi != "" {
		return p.LastNameVi + " " + p.FirstNameVi
	}
	return p.FullName()
}

// Age returns the patient's age in years.
func (p *Patient) Age() int {
	now := time.Now()
	age := now.Year() - p.DateOfBirth.Year()
	if now.YearDay() < p.DateOfBirth.YearDay() {
		age--
	}
	return age
}

// CreatePatientRequest represents the request body for creating a patient.
type CreatePatientRequest struct {
	FirstName          string            `json:"first_name" validate:"required,max=100"`
	LastName           string            `json:"last_name" validate:"required,max=100"`
	FirstNameVi        string            `json:"first_name_vi" validate:"max=100"`
	LastNameVi         string            `json:"last_name_vi" validate:"max=100"`
	DateOfBirth        string            `json:"date_of_birth" validate:"required,datetime=2006-01-02"`
	Gender             string            `json:"gender" validate:"required,oneof=male female other prefer_not_to_say"`
	Phone              string            `json:"phone" validate:"omitempty,max=50"`
	Email              string            `json:"email" validate:"omitempty,email,max=255"`
	Address            string            `json:"address" validate:"max=500"`
	AddressVi          string            `json:"address_vi" validate:"max=500"`
	LanguagePreference string            `json:"language_preference" validate:"omitempty,oneof=vi en"`
	EmergencyContact   *EmergencyContact `json:"emergency_contact" validate:"omitempty"`
	MedicalAlerts      []string          `json:"medical_alerts" validate:"omitempty,dive,max=255"`
	Notes              string            `json:"notes" validate:"max=2000"`
}

// UpdatePatientRequest represents the request body for updating a patient.
type UpdatePatientRequest struct {
	FirstName          *string           `json:"first_name" validate:"omitempty,max=100"`
	LastName           *string           `json:"last_name" validate:"omitempty,max=100"`
	FirstNameVi        *string           `json:"first_name_vi" validate:"omitempty,max=100"`
	LastNameVi         *string           `json:"last_name_vi" validate:"omitempty,max=100"`
	DateOfBirth        *string           `json:"date_of_birth" validate:"omitempty,datetime=2006-01-02"`
	Gender             *string           `json:"gender" validate:"omitempty,oneof=male female other prefer_not_to_say"`
	Phone              *string           `json:"phone" validate:"omitempty,max=50"`
	Email              *string           `json:"email" validate:"omitempty,email,max=255"`
	Address            *string           `json:"address" validate:"omitempty,max=500"`
	AddressVi          *string           `json:"address_vi" validate:"omitempty,max=500"`
	LanguagePreference *string           `json:"language_preference" validate:"omitempty,oneof=vi en"`
	EmergencyContact   *EmergencyContact `json:"emergency_contact" validate:"omitempty"`
	MedicalAlerts      []string          `json:"medical_alerts" validate:"omitempty,dive,max=255"`
	Notes              *string           `json:"notes" validate:"omitempty,max=2000"`
	IsActive           *bool             `json:"is_active"`
}

// PatientSearchParams represents search and filter parameters.
type PatientSearchParams struct {
	ClinicID   string `query:"clinic_id"`
	Search     string `query:"search"`
	Gender     string `query:"gender"`
	IsActive   *bool  `query:"is_active"`
	MinAge     *int   `query:"min_age"`
	MaxAge     *int   `query:"max_age"`
	SortBy     string `query:"sort_by"`
	SortOrder  string `query:"sort_order"`
	Page       int    `query:"page"`
	PerPage    int    `query:"per_page"`
}

// NewPatientSearchParams creates PatientSearchParams with default values.
func NewPatientSearchParams() PatientSearchParams {
	isActive := true
	return PatientSearchParams{
		IsActive:  &isActive,
		SortBy:    "created_at",
		SortOrder: "desc",
		Page:      1,
		PerPage:   20,
	}
}

// Offset calculates the offset for pagination.
func (p PatientSearchParams) Offset() int {
	return (p.Page - 1) * p.Limit()
}

// Limit returns the number of items per page.
func (p PatientSearchParams) Limit() int {
	if p.PerPage <= 0 {
		return 20
	}
	if p.PerPage > 100 {
		return 100
	}
	return p.PerPage
}

// PatientListResponse represents a paginated list of patients.
type PatientListResponse struct {
	Data       []Patient `json:"data"`
	Total      int64     `json:"total"`
	Page       int       `json:"page"`
	PerPage    int       `json:"per_page"`
	TotalPages int       `json:"total_pages"`
}

// PatientDashboard represents aggregated patient data for dashboard view.
type PatientDashboard struct {
	Patient              Patient              `json:"patient"`
	TotalAppointments    int                  `json:"total_appointments"`
	UpcomingAppointments int                  `json:"upcoming_appointments"`
	CompletedSessions    int                  `json:"completed_sessions"`
	ActiveTreatmentPlans int                  `json:"active_treatment_plans"`
	LastVisit            *time.Time           `json:"last_visit,omitempty"`
	NextAppointment      *time.Time           `json:"next_appointment,omitempty"`
	InsuranceInfo        []PatientInsurance   `json:"insurance_info,omitempty"`
	RecentNotes          []PatientNote        `json:"recent_notes,omitempty"`
}

// PatientInsurance represents insurance information for a patient.
type PatientInsurance struct {
	ID                 string     `json:"id" db:"id"`
	PatientID          string     `json:"patient_id" db:"patient_id"`
	Provider           string     `json:"provider" db:"provider"`
	ProviderType       string     `json:"provider_type" db:"provider_type"`
	PolicyNumber       string     `json:"policy_number" db:"policy_number"`
	GroupNumber        string     `json:"group_number,omitempty" db:"group_number"`
	CoveragePercentage float64    `json:"coverage_percentage" db:"coverage_percentage"`
	CopayAmount        *float64   `json:"copay_amount,omitempty" db:"copay_amount"`
	ValidFrom          time.Time  `json:"valid_from" db:"valid_from"`
	ValidTo            *time.Time `json:"valid_to,omitempty" db:"valid_to"`
	IsPrimary          bool       `json:"is_primary" db:"is_primary"`
	IsActive           bool       `json:"is_active" db:"is_active"`
	VerificationStatus string     `json:"verification_status" db:"verification_status"`
}

// PatientNote represents a clinical note for a patient (minimal for dashboard).
type PatientNote struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`
	Summary   string    `json:"summary"`
	CreatedAt time.Time `json:"created_at"`
	CreatedBy string    `json:"created_by"`
}

// DuplicatePatientMatch represents a potential duplicate patient.
type DuplicatePatientMatch struct {
	Patient    Patient `json:"patient"`
	MatchScore float64 `json:"match_score"`
	MatchType  string  `json:"match_type"`
}

// NullString is a helper for nullable strings in database operations.
type NullString struct {
	sql.NullString
}

// MarshalJSON implements json.Marshaler for NullString.
func (ns NullString) MarshalJSON() ([]byte, error) {
	if ns.Valid {
		return json.Marshal(ns.String)
	}
	return []byte("null"), nil
}

// UnmarshalJSON implements json.Unmarshaler for NullString.
func (ns *NullString) UnmarshalJSON(data []byte) error {
	if string(data) == "null" {
		ns.Valid = false
		return nil
	}
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}
	ns.String = s
	ns.Valid = true
	return nil
}

// PatientFilter is kept for backward compatibility.
// Deprecated: Use PatientSearchParams instead.
type PatientFilter = PatientSearchParams

// NewPatientFilter creates a PatientFilter with default values.
// Deprecated: Use NewPatientSearchParams instead.
func NewPatientFilter() PatientFilter {
	return NewPatientSearchParams()
}
