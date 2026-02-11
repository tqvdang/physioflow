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

// ReevaluationService defines the interface for re-evaluation business logic.
type ReevaluationService interface {
	PerformReevaluation(ctx context.Context, clinicID, therapistID string, req *model.CreateReevaluationRequest) (*model.ReevaluationSummary, error)
	GetReevaluationHistory(ctx context.Context, patientID string) ([]*model.ReevaluationAssessment, error)
	GetComparison(ctx context.Context, id string) ([]*model.ReevaluationAssessment, error)
}

// reevaluationService implements ReevaluationService.
type reevaluationService struct {
	repo repository.ReevaluationRepository
}

// NewReevaluationService creates a new re-evaluation service.
func NewReevaluationService(repo repository.ReevaluationRepository) ReevaluationService {
	return &reevaluationService{repo: repo}
}

// PerformReevaluation processes a batch of comparison items, calculates changes,
// determines interpretations, and persists the re-evaluation records.
func (s *reevaluationService) PerformReevaluation(ctx context.Context, clinicID, therapistID string, req *model.CreateReevaluationRequest) (*model.ReevaluationSummary, error) {
	if len(req.Assessments) == 0 {
		return nil, fmt.Errorf("at least one assessment item is required")
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

	var baselineID *string
	if req.BaselineAssessmentID != "" {
		baselineID = &req.BaselineAssessmentID
	}

	assessments := make([]*model.ReevaluationAssessment, 0, len(req.Assessments))
	improved, declined, stable, mcidCount := 0, 0, 0, 0

	for _, item := range req.Assessments {
		change, changePct := model.CalculateChange(item.BaselineValue, item.CurrentValue)
		interpretation, mcidAchieved := model.DetermineInterpretation(change, item.MCIDThreshold, item.HigherIsBetter)

		a := &model.ReevaluationAssessment{
			ID:                   uuid.New().String(),
			PatientID:            req.PatientID,
			VisitID:              visitID,
			ClinicID:             clinicID,
			BaselineAssessmentID: baselineID,
			AssessmentType:       item.AssessmentType,
			MeasureLabel:         item.MeasureLabel,
			CurrentValue:         item.CurrentValue,
			BaselineValue:        item.BaselineValue,
			Change:               change,
			ChangePercentage:     changePct,
			HigherIsBetter:       item.HigherIsBetter,
			MCIDThreshold:        item.MCIDThreshold,
			MCIDAchieved:         mcidAchieved,
			Interpretation:       interpretation,
			TherapistID:          therapistID,
			Notes:                req.Notes,
			AssessedAt:           assessedAt,
		}

		assessments = append(assessments, a)

		switch interpretation {
		case model.InterpretationImproved:
			improved++
		case model.InterpretationDeclined:
			declined++
		case model.InterpretationStable:
			stable++
		}
		if mcidAchieved {
			mcidCount++
		}
	}

	// Persist all assessments in a batch
	if err := s.repo.CreateBatch(ctx, assessments); err != nil {
		return nil, fmt.Errorf("failed to persist reevaluation: %w", err)
	}

	summary := &model.ReevaluationSummary{
		PatientID:    req.PatientID,
		VisitID:      visitID,
		TherapistID:  therapistID,
		AssessedAt:   assessedAt,
		Comparisons:  make([]model.ReevaluationAssessment, len(assessments)),
		TotalItems:   len(assessments),
		Improved:     improved,
		Declined:     declined,
		Stable:       stable,
		MCIDAchieved: mcidCount,
	}

	for i, a := range assessments {
		summary.Comparisons[i] = *a
	}

	log.Info().
		Str("patient_id", req.PatientID).
		Str("therapist_id", therapistID).
		Int("total_items", summary.TotalItems).
		Int("improved", improved).
		Int("declined", declined).
		Int("stable", stable).
		Int("mcid_achieved", mcidCount).
		Msg("re-evaluation performed")

	return summary, nil
}

// GetReevaluationHistory retrieves all re-evaluation records for a patient.
func (s *reevaluationService) GetReevaluationHistory(ctx context.Context, patientID string) ([]*model.ReevaluationAssessment, error) {
	return s.repo.GetByPatientID(ctx, patientID)
}

// GetComparison retrieves all re-evaluation items for a specific re-evaluation session.
func (s *reevaluationService) GetComparison(ctx context.Context, id string) ([]*model.ReevaluationAssessment, error) {
	return s.repo.GetComparisonData(ctx, id)
}
