package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	valerr "github.com/tqvdang/physioflow/apps/api/internal/errors"
	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
)

// jointSpecificMaxDegrees defines strict maximum ROM values per joint.
// These are absolute maximums (slightly above normal range to account for hypermobility).
var jointSpecificMaxDegrees = map[model.ROMJoint]float64{
	model.ROMJointShoulder:      200, // Normal: 180, allow some hypermobility
	model.ROMJointElbow:         160, // Normal: 150
	model.ROMJointWrist:         100, // Normal: 80
	model.ROMJointHip:           140, // Normal: 120
	model.ROMJointKnee:          150, // Normal: 135
	model.ROMJointAnkle:         70,  // Normal: 50
	model.ROMJointCervicalSpine: 100, // Normal: 80
	model.ROMJointThoracicSpine: 60,  // Normal: 40
	model.ROMJointLumbarSpine:   80,  // Normal: 60
}

// ROMService defines the interface for ROM assessment business logic.
type ROMService interface {
	RecordAssessment(ctx context.Context, clinicID, therapistID string, req *model.CreateROMAssessmentRequest) (*model.ROMAssessment, error)
	GetByPatientID(ctx context.Context, patientID string) ([]*model.ROMAssessment, error)
	GetByVisitID(ctx context.Context, visitID string) ([]*model.ROMAssessment, error)
	GetTrending(ctx context.Context, patientID string, joint model.ROMJoint, side model.ROMSide, movementType model.ROMMovementType) (*model.ROMTrendingData, error)
}

// romService implements ROMService.
type romService struct {
	repo repository.ROMRepository
}

// NewROMService creates a new ROM service.
func NewROMService(repo repository.ROMRepository) ROMService {
	return &romService{repo: repo}
}

// RecordAssessment records a new ROM assessment for a patient.
func (s *romService) RecordAssessment(ctx context.Context, clinicID, therapistID string, req *model.CreateROMAssessmentRequest) (*model.ROMAssessment, error) {
	// Validate degree >= 0
	if req.Degree < 0 {
		return nil, valerr.NewValidationErrorf(
			"ASSESSMENT_ROM_OUT_OF_RANGE",
			"ROM degree must be >= 0 (got %.1f)",
			"Gia tri ROM phai >= 0 (nhan duoc %.1f)",
			req.Degree,
		)
	}

	// Validate joint-specific degree range with strict maximums
	joint := model.ROMJoint(req.Joint)
	if maxDegree, ok := jointSpecificMaxDegrees[joint]; ok {
		if req.Degree > maxDegree {
			normalRange := model.NormalROMRanges[joint]
			return nil, valerr.NewValidationErrorf(
				"ASSESSMENT_ROM_OUT_OF_RANGE",
				"ROM degree %.1f exceeds maximum for %s (normal: 0-%.0f, max allowed: %.0f)",
				"Gia tri ROM %.1f vuot qua toi da cho %s (binh thuong: 0-%.0f, toi da cho phep: %.0f)",
				req.Degree, req.Joint, normalRange, maxDegree,
			)
		}
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

	assessment := &model.ROMAssessment{
		ID:           uuid.New().String(),
		PatientID:    req.PatientID,
		VisitID:      visitID,
		ClinicID:     clinicID,
		TherapistID:  therapistID,
		Joint:        joint,
		Side:         model.ROMSide(req.Side),
		MovementType: model.ROMMovementType(req.MovementType),
		Degree:       req.Degree,
		Notes:        req.Notes,
		AssessedAt:   assessedAt,
	}

	if err := s.repo.Create(ctx, assessment); err != nil {
		return nil, err
	}

	log.Info().
		Str("assessment_id", assessment.ID).
		Str("patient_id", assessment.PatientID).
		Str("joint", string(assessment.Joint)).
		Str("side", string(assessment.Side)).
		Float64("degree", assessment.Degree).
		Str("therapist_id", therapistID).
		Msg("ROM assessment recorded")

	return assessment, nil
}

// GetByPatientID retrieves all ROM assessments for a patient.
func (s *romService) GetByPatientID(ctx context.Context, patientID string) ([]*model.ROMAssessment, error) {
	return s.repo.GetByPatientID(ctx, patientID)
}

// GetByVisitID retrieves all ROM assessments for a visit.
func (s *romService) GetByVisitID(ctx context.Context, visitID string) ([]*model.ROMAssessment, error) {
	return s.repo.GetByVisitID(ctx, visitID)
}

// GetTrending retrieves trending data for ROM measurements of a specific joint.
func (s *romService) GetTrending(ctx context.Context, patientID string, joint model.ROMJoint, side model.ROMSide, movementType model.ROMMovementType) (*model.ROMTrendingData, error) {
	// Get chronological history for this joint/side/movement combination
	assessments, err := s.repo.GetHistory(ctx, patientID, joint, side, movementType)
	if err != nil {
		return nil, err
	}

	if len(assessments) == 0 {
		return nil, repository.ErrNotFound
	}

	dataPoints := make([]model.ROMTrendDataPoint, len(assessments))
	for i, a := range assessments {
		dataPoints[i] = model.ROMTrendDataPoint{
			Degree:     a.Degree,
			AssessedAt: a.AssessedAt,
			Notes:      a.Notes,
		}
	}

	// Calculate baseline, current, change, and trend
	baseline := assessments[0].Degree
	current := assessments[len(assessments)-1].Degree
	change := current - baseline

	var trend model.TrendDirection
	if len(assessments) < 2 {
		trend = model.TrendInsuffData
	} else {
		// For ROM, higher is better (more range of motion)
		if change > 0 {
			trend = model.TrendImproved
		} else if change < 0 {
			trend = model.TrendDeclined
		} else {
			trend = model.TrendStable
		}
	}

	return &model.ROMTrendingData{
		PatientID:    patientID,
		Joint:        joint,
		Side:         side,
		MovementType: movementType,
		DataPoints:   dataPoints,
		Baseline:     &baseline,
		Current:      &current,
		Change:       &change,
		Trend:        trend,
	}, nil
}
