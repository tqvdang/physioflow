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

// MMTService defines the interface for MMT assessment business logic.
type MMTService interface {
	RecordAssessment(ctx context.Context, clinicID, therapistID string, req *model.CreateMMTAssessmentRequest) (*model.MMTAssessment, error)
	GetByPatientID(ctx context.Context, patientID string) ([]*model.MMTAssessment, error)
	GetByVisitID(ctx context.Context, visitID string) ([]*model.MMTAssessment, error)
	GetTrending(ctx context.Context, patientID string, muscleGroup string, side model.MMTSide) (*model.MMTTrendingData, error)
}

// mmtService implements MMTService.
type mmtService struct {
	repo repository.MMTRepository
}

// NewMMTService creates a new MMT service.
func NewMMTService(repo repository.MMTRepository) MMTService {
	return &mmtService{repo: repo}
}

// RecordAssessment records a new MMT assessment for a patient.
func (s *mmtService) RecordAssessment(ctx context.Context, clinicID, therapistID string, req *model.CreateMMTAssessmentRequest) (*model.MMTAssessment, error) {
	// Validate grade is a valid MMT grade (0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5)
	if !isValidMMTGrade(req.Grade) {
		return nil, fmt.Errorf("invalid MMT grade %.1f: must be 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, or 5", req.Grade)
	}

	// Parse assessed_at or default to now
	assessedAt := time.Now()
	if req.AssessedAt != "" {
		parsed, err := time.Parse(time.RFC3339, req.AssessedAt)
		if err != nil {
			return nil, fmt.Errorf("invalid assessed_at format: %w", err)
		}
		assessedAt = parsed
	}

	var visitID *string
	if req.VisitID != "" {
		visitID = &req.VisitID
	}

	assessment := &model.MMTAssessment{
		ID:          uuid.New().String(),
		PatientID:   req.PatientID,
		VisitID:     visitID,
		ClinicID:    clinicID,
		TherapistID: therapistID,
		MuscleGroup: req.MuscleGroup,
		Side:        model.MMTSide(req.Side),
		Grade:       req.Grade,
		Notes:       req.Notes,
		AssessedAt:  assessedAt,
	}

	if err := s.repo.Create(ctx, assessment); err != nil {
		return nil, err
	}

	log.Info().
		Str("assessment_id", assessment.ID).
		Str("patient_id", assessment.PatientID).
		Str("muscle_group", assessment.MuscleGroup).
		Str("side", string(assessment.Side)).
		Float64("grade", assessment.Grade).
		Str("therapist_id", therapistID).
		Msg("MMT assessment recorded")

	return assessment, nil
}

// isValidMMTGrade checks if a grade is a valid MMT value (0-5, in 0.5 increments).
func isValidMMTGrade(grade float64) bool {
	validGrades := []float64{0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5}
	for _, v := range validGrades {
		if grade == v {
			return true
		}
	}
	return false
}

// GetByPatientID retrieves all MMT assessments for a patient.
func (s *mmtService) GetByPatientID(ctx context.Context, patientID string) ([]*model.MMTAssessment, error) {
	return s.repo.GetByPatientID(ctx, patientID)
}

// GetByVisitID retrieves all MMT assessments for a visit.
func (s *mmtService) GetByVisitID(ctx context.Context, visitID string) ([]*model.MMTAssessment, error) {
	return s.repo.GetByVisitID(ctx, visitID)
}

// GetTrending retrieves trending data for MMT measurements of a specific muscle group.
func (s *mmtService) GetTrending(ctx context.Context, patientID string, muscleGroup string, side model.MMTSide) (*model.MMTTrendingData, error) {
	// Get chronological history for this muscle group/side combination
	assessments, err := s.repo.GetHistory(ctx, patientID, muscleGroup, side)
	if err != nil {
		return nil, err
	}

	if len(assessments) == 0 {
		return nil, repository.ErrNotFound
	}

	dataPoints := make([]model.MMTTrendDataPoint, len(assessments))
	for i, a := range assessments {
		dataPoints[i] = model.MMTTrendDataPoint{
			Grade:      a.Grade,
			AssessedAt: a.AssessedAt,
			Notes:      a.Notes,
		}
	}

	// Calculate baseline, current, change, and trend
	baseline := assessments[0].Grade
	current := assessments[len(assessments)-1].Grade
	change := current - baseline

	var trend model.TrendDirection
	if len(assessments) < 2 {
		trend = model.TrendInsuffData
	} else {
		// For MMT, higher is better (more strength)
		if change > 0 {
			trend = model.TrendImproved
		} else if change < 0 {
			trend = model.TrendDeclined
		} else {
			trend = model.TrendStable
		}
	}

	return &model.MMTTrendingData{
		PatientID:   patientID,
		MuscleGroup: muscleGroup,
		Side:        side,
		DataPoints:  dataPoints,
		Baseline:    &baseline,
		Current:     &current,
		Change:      &change,
		Trend:       trend,
	}, nil
}
