package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
)

// PatientService defines the interface for patient business logic.
type PatientService interface {
	Create(ctx context.Context, clinicID, userID string, req *model.CreatePatientRequest) (*model.Patient, error)
	GetByID(ctx context.Context, clinicID, id string) (*model.Patient, error)
	GetByMRN(ctx context.Context, clinicID, mrn string) (*model.Patient, error)
	Update(ctx context.Context, clinicID, id, userID string, req *model.UpdatePatientRequest) (*model.Patient, error)
	Delete(ctx context.Context, clinicID, id string) error
	List(ctx context.Context, params model.PatientSearchParams) (*model.PatientListResponse, error)
	Search(ctx context.Context, clinicID, query string, limit int) ([]model.Patient, error)
	GetDashboard(ctx context.Context, clinicID, patientID string) (*model.PatientDashboard, error)
	CheckDuplicates(ctx context.Context, clinicID, phone, firstName, lastName string) ([]model.DuplicatePatientMatch, error)
	GenerateMRN(ctx context.Context, clinicID, clinicPrefix string) (string, error)
}

// patientService implements PatientService.
type patientService struct {
	repo       repository.PatientRepository
	clinicRepo ClinicRepository
}

// ClinicRepository defines the minimal interface for clinic data access.
type ClinicRepository interface {
	GetPrefix(ctx context.Context, clinicID string) (string, error)
}

// NewPatientService creates a new patient service.
func NewPatientService(repo repository.PatientRepository, clinicRepo ClinicRepository) PatientService {
	return &patientService{
		repo:       repo,
		clinicRepo: clinicRepo,
	}
}

// Create creates a new patient with business logic validation.
func (s *patientService) Create(ctx context.Context, clinicID, userID string, req *model.CreatePatientRequest) (*model.Patient, error) {
	// Check for potential duplicates
	if req.Phone != "" {
		duplicates, err := s.repo.FindDuplicates(ctx, clinicID, req.Phone, req.FirstName, req.LastName)
		if err != nil {
			log.Warn().Err(err).Msg("failed to check for duplicates")
		} else if len(duplicates) > 0 {
			// Log potential duplicates but don't block creation
			log.Info().
				Str("clinic_id", clinicID).
				Str("first_name", req.FirstName).
				Str("last_name", req.LastName).
				Int("duplicate_count", len(duplicates)).
				Msg("potential duplicate patients found")
		}
	}

	// Generate MRN
	clinicPrefix := s.getClinicPrefix(ctx, clinicID)
	mrn, err := s.GenerateMRN(ctx, clinicID, clinicPrefix)
	if err != nil {
		return nil, fmt.Errorf("failed to generate MRN: %w", err)
	}

	// Parse date of birth
	dob, err := time.Parse("2006-01-02", req.DateOfBirth)
	if err != nil {
		return nil, fmt.Errorf("invalid date of birth format: %w", err)
	}

	// Set language preference default
	langPref := model.LanguageVietnamese
	if req.LanguagePreference != "" {
		langPref = model.LanguagePreference(req.LanguagePreference)
	}

	// Build patient record
	patient := &model.Patient{
		ID:                 uuid.New().String(),
		ClinicID:           clinicID,
		MRN:                mrn,
		FirstName:          strings.TrimSpace(req.FirstName),
		LastName:           strings.TrimSpace(req.LastName),
		FirstNameVi:        strings.TrimSpace(req.FirstNameVi),
		LastNameVi:         strings.TrimSpace(req.LastNameVi),
		DateOfBirth:        dob,
		Gender:             model.Gender(req.Gender),
		Phone:              normalizePhone(req.Phone),
		Email:              strings.ToLower(strings.TrimSpace(req.Email)),
		Address:            strings.TrimSpace(req.Address),
		AddressVi:          strings.TrimSpace(req.AddressVi),
		LanguagePreference: langPref,
		MedicalAlerts:      req.MedicalAlerts,
		Notes:              strings.TrimSpace(req.Notes),
		IsActive:           true,
		CreatedBy:          &userID,
		UpdatedBy:          &userID,
	}

	if req.EmergencyContact != nil {
		patient.EmergencyContact = *req.EmergencyContact
	}

	// Create patient in database
	if err := s.repo.Create(ctx, patient); err != nil {
		return nil, err
	}

	log.Info().
		Str("patient_id", patient.ID).
		Str("mrn", patient.MRN).
		Str("clinic_id", clinicID).
		Str("created_by", userID).
		Msg("patient created")

	return patient, nil
}

// GetByID retrieves a patient by ID.
func (s *patientService) GetByID(ctx context.Context, clinicID, id string) (*model.Patient, error) {
	return s.repo.GetByID(ctx, clinicID, id)
}

// GetByMRN retrieves a patient by MRN.
func (s *patientService) GetByMRN(ctx context.Context, clinicID, mrn string) (*model.Patient, error) {
	return s.repo.GetByMRN(ctx, clinicID, mrn)
}

// Update updates an existing patient.
func (s *patientService) Update(ctx context.Context, clinicID, id, userID string, req *model.UpdatePatientRequest) (*model.Patient, error) {
	// Get existing patient
	patient, err := s.repo.GetByID(ctx, clinicID, id)
	if err != nil {
		return nil, err
	}

	// Apply updates
	if req.FirstName != nil {
		patient.FirstName = strings.TrimSpace(*req.FirstName)
	}
	if req.LastName != nil {
		patient.LastName = strings.TrimSpace(*req.LastName)
	}
	if req.FirstNameVi != nil {
		patient.FirstNameVi = strings.TrimSpace(*req.FirstNameVi)
	}
	if req.LastNameVi != nil {
		patient.LastNameVi = strings.TrimSpace(*req.LastNameVi)
	}
	if req.DateOfBirth != nil {
		dob, err := time.Parse("2006-01-02", *req.DateOfBirth)
		if err != nil {
			return nil, fmt.Errorf("invalid date of birth format: %w", err)
		}
		patient.DateOfBirth = dob
	}
	if req.Gender != nil {
		patient.Gender = model.Gender(*req.Gender)
	}
	if req.Phone != nil {
		patient.Phone = normalizePhone(*req.Phone)
	}
	if req.Email != nil {
		patient.Email = strings.ToLower(strings.TrimSpace(*req.Email))
	}
	if req.Address != nil {
		patient.Address = strings.TrimSpace(*req.Address)
	}
	if req.AddressVi != nil {
		patient.AddressVi = strings.TrimSpace(*req.AddressVi)
	}
	if req.LanguagePreference != nil {
		patient.LanguagePreference = model.LanguagePreference(*req.LanguagePreference)
	}
	if req.EmergencyContact != nil {
		patient.EmergencyContact = *req.EmergencyContact
	}
	if req.MedicalAlerts != nil {
		patient.MedicalAlerts = req.MedicalAlerts
	}
	if req.Notes != nil {
		patient.Notes = strings.TrimSpace(*req.Notes)
	}
	if req.IsActive != nil {
		patient.IsActive = *req.IsActive
	}

	patient.UpdatedBy = &userID

	// Update in database
	if err := s.repo.Update(ctx, patient); err != nil {
		return nil, err
	}

	log.Info().
		Str("patient_id", patient.ID).
		Str("clinic_id", clinicID).
		Str("updated_by", userID).
		Msg("patient updated")

	return patient, nil
}

// Delete soft-deletes a patient.
func (s *patientService) Delete(ctx context.Context, clinicID, id string) error {
	if err := s.repo.Delete(ctx, clinicID, id); err != nil {
		return err
	}

	log.Info().
		Str("patient_id", id).
		Str("clinic_id", clinicID).
		Msg("patient deleted")

	return nil
}

// List returns a paginated list of patients.
func (s *patientService) List(ctx context.Context, params model.PatientSearchParams) (*model.PatientListResponse, error) {
	patients, total, err := s.repo.List(ctx, params)
	if err != nil {
		return nil, err
	}

	perPage := params.Limit()
	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}

	return &model.PatientListResponse{
		Data:       patients,
		Total:      total,
		Page:       params.Page,
		PerPage:    perPage,
		TotalPages: totalPages,
	}, nil
}

// Search performs a quick search for patients.
func (s *patientService) Search(ctx context.Context, clinicID, query string, limit int) ([]model.Patient, error) {
	return s.repo.Search(ctx, clinicID, query, limit)
}

// GetDashboard retrieves aggregated patient dashboard data.
func (s *patientService) GetDashboard(ctx context.Context, clinicID, patientID string) (*model.PatientDashboard, error) {
	return s.repo.GetDashboard(ctx, clinicID, patientID)
}

// CheckDuplicates finds potential duplicate patients.
func (s *patientService) CheckDuplicates(ctx context.Context, clinicID, phone, firstName, lastName string) ([]model.DuplicatePatientMatch, error) {
	return s.repo.FindDuplicates(ctx, clinicID, phone, firstName, lastName)
}

// GenerateMRN generates a unique Medical Record Number for a patient.
// Format: {ClinicPrefix}-{Sequence} e.g., "PF-00001"
func (s *patientService) GenerateMRN(ctx context.Context, clinicID, clinicPrefix string) (string, error) {
	seq, err := s.repo.GetNextMRNSequence(ctx, clinicID)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%s-%05d", clinicPrefix, seq), nil
}

// getClinicPrefix returns the MRN prefix for a clinic.
func (s *patientService) getClinicPrefix(ctx context.Context, clinicID string) string {
	if s.clinicRepo != nil {
		prefix, err := s.clinicRepo.GetPrefix(ctx, clinicID)
		if err == nil && prefix != "" {
			return prefix
		}
	}
	// Default prefix if clinic repo not available or no prefix set
	return "PF"
}

// normalizePhone normalizes a phone number by removing spaces and formatting.
func normalizePhone(phone string) string {
	phone = strings.TrimSpace(phone)
	// Remove common formatting characters
	phone = strings.ReplaceAll(phone, " ", "")
	phone = strings.ReplaceAll(phone, "-", "")
	phone = strings.ReplaceAll(phone, ".", "")
	phone = strings.ReplaceAll(phone, "(", "")
	phone = strings.ReplaceAll(phone, ")", "")
	return phone
}
