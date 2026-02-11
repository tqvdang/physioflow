package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
)

// ProtocolService defines the interface for clinical protocol business logic.
type ProtocolService interface {
	// Protocol templates
	GetProtocols(ctx context.Context) ([]*model.ClinicalProtocolDB, error)
	GetProtocolByID(ctx context.Context, id string) (*model.ClinicalProtocolDB, error)

	// Patient protocol assignments
	AssignProtocol(ctx context.Context, patientID, therapistID, clinicID string, req *model.AssignProtocolRequestDB) (*model.PatientProtocolDB, error)
	GetPatientProtocols(ctx context.Context, patientID string) ([]*model.PatientProtocolDB, error)
	UpdateProtocolProgress(ctx context.Context, id, therapistID string, req *model.UpdateProgressRequest) (*model.PatientProtocolDB, error)
}

// protocolService implements ProtocolService.
type protocolService struct {
	repo repository.ProtocolRepository
}

// NewProtocolService creates a new protocol service.
func NewProtocolService(repo repository.ProtocolRepository) ProtocolService {
	return &protocolService{repo: repo}
}

// GetProtocols returns all active clinical protocol templates.
func (s *protocolService) GetProtocols(ctx context.Context) ([]*model.ClinicalProtocolDB, error) {
	return s.repo.GetProtocols(ctx)
}

// GetProtocolByID returns a single clinical protocol by ID.
func (s *protocolService) GetProtocolByID(ctx context.Context, id string) (*model.ClinicalProtocolDB, error) {
	return s.repo.GetProtocolByID(ctx, id)
}

// AssignProtocol assigns a clinical protocol to a patient.
func (s *protocolService) AssignProtocol(ctx context.Context, patientID, therapistID, clinicID string, req *model.AssignProtocolRequestDB) (*model.PatientProtocolDB, error) {
	// Validate protocol exists and is active
	protocol, err := s.repo.GetProtocolByID(ctx, req.ProtocolID)
	if err != nil {
		return nil, fmt.Errorf("protocol not found: %w", err)
	}

	if !protocol.IsActive {
		return nil, fmt.Errorf("protocol is not active")
	}

	// Parse optional start date
	now := time.Now()
	assignedDate := now
	var startDate *time.Time
	if req.StartDate != "" {
		parsed, err := time.Parse("2006-01-02", req.StartDate)
		if err != nil {
			return nil, fmt.Errorf("invalid start date format: %w", err)
		}
		startDate = &parsed
	} else {
		startDate = &assignedDate
	}

	// Calculate target end date
	var targetEndDate *time.Time
	if startDate != nil {
		end := startDate.AddDate(0, 0, protocol.DurationWeeks*7)
		targetEndDate = &end
	}

	// Build initial progress notes
	var progressNotes []model.ProgressNote
	if req.Notes != "" {
		progressNotes = append(progressNotes, model.ProgressNote{
			Date:        now.Format(time.RFC3339),
			Note:        req.Notes,
			Phase:       "initial",
			TherapistID: therapistID,
		})
	}

	pp := &model.PatientProtocolDB{
		ID:                patientID, // Will be overwritten below
		PatientID:         patientID,
		ProtocolID:        req.ProtocolID,
		TherapistID:       therapistID,
		ClinicID:          clinicID,
		AssignedDate:      assignedDate,
		StartDate:         startDate,
		TargetEndDate:     targetEndDate,
		ProgressStatus:    "active",
		CurrentPhase:      "initial",
		SessionsCompleted: 0,
		ProgressNotes:     progressNotes,
		Version:           1,
		CreatedBy:         &therapistID,
	}
	pp.ID = uuid.New().String()

	if err := s.repo.AssignProtocol(ctx, pp); err != nil {
		return nil, err
	}

	// Attach protocol summary for the response
	pp.Protocol = &model.ClinicalProtocolSummary{
		ID:               protocol.ID,
		ProtocolName:     protocol.ProtocolName,
		ProtocolNameVi:   protocol.ProtocolNameVi,
		Category:         protocol.Category,
		DurationWeeks:    protocol.DurationWeeks,
		FrequencyPerWeek: protocol.FrequencyPerWeek,
	}

	log.Info().
		Str("patient_protocol_id", pp.ID).
		Str("patient_id", patientID).
		Str("protocol_id", req.ProtocolID).
		Str("therapist_id", therapistID).
		Msg("protocol assigned to patient")

	return pp, nil
}

// GetPatientProtocols returns all protocols assigned to a patient.
func (s *protocolService) GetPatientProtocols(ctx context.Context, patientID string) ([]*model.PatientProtocolDB, error) {
	return s.repo.GetPatientProtocols(ctx, patientID)
}

// UpdateProtocolProgress updates a patient protocol's progress with optimistic locking.
func (s *protocolService) UpdateProtocolProgress(ctx context.Context, id, therapistID string, req *model.UpdateProgressRequest) (*model.PatientProtocolDB, error) {
	// Get current patient protocol
	pp, err := s.repo.GetPatientProtocolByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Version check: the request must carry the version the client last saw
	if pp.Version != req.Version {
		return nil, repository.ErrVersionConflict
	}

	// Apply updates
	if req.ProgressStatus != nil {
		pp.ProgressStatus = *req.ProgressStatus

		// Set actual end date when completing or discontinuing
		if *req.ProgressStatus == "completed" || *req.ProgressStatus == "discontinued" {
			now := time.Now()
			pp.ActualEndDate = &now
		}
	}
	if req.CurrentPhase != nil {
		pp.CurrentPhase = *req.CurrentPhase
	}
	if req.SessionsCompleted != nil {
		pp.SessionsCompleted = *req.SessionsCompleted
	}

	// Append progress note if provided
	if req.Note != nil && *req.Note != "" {
		note := model.ProgressNote{
			Date:        time.Now().Format(time.RFC3339),
			Note:        *req.Note,
			Phase:       pp.CurrentPhase,
			TherapistID: therapistID,
		}
		if req.NoteVi != nil {
			note.NoteVi = *req.NoteVi
		}
		pp.ProgressNotes = append(pp.ProgressNotes, note)
	}

	// Increment version for optimistic locking
	pp.Version++

	if err := s.repo.UpdateProgress(ctx, pp); err != nil {
		return nil, err
	}

	log.Info().
		Str("patient_protocol_id", id).
		Str("status", pp.ProgressStatus).
		Str("phase", pp.CurrentPhase).
		Int("sessions", pp.SessionsCompleted).
		Int("version", pp.Version).
		Msg("protocol progress updated")

	return pp, nil
}
