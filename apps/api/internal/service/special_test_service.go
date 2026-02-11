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

// SpecialTestService defines the interface for special test business logic.
type SpecialTestService interface {
	GetAllTests(ctx context.Context) ([]*model.SpecialTest, error)
	GetTestsByCategory(ctx context.Context, category string) ([]*model.SpecialTest, error)
	GetTestByID(ctx context.Context, id string) (*model.SpecialTest, error)
	SearchTests(ctx context.Context, query string, limit int) ([]*model.SpecialTest, error)
	RecordTestResult(ctx context.Context, therapistID string, req *model.CreateSpecialTestResultRequest) (*model.PatientSpecialTestResult, error)
	GetPatientTestHistory(ctx context.Context, patientID string) ([]*model.PatientSpecialTestResult, error)
	GetResultsByVisit(ctx context.Context, visitID string) ([]*model.PatientSpecialTestResult, error)
}

// specialTestService implements SpecialTestService.
type specialTestService struct {
	repo repository.SpecialTestRepository
}

// NewSpecialTestService creates a new special test service.
func NewSpecialTestService(repo repository.SpecialTestRepository) SpecialTestService {
	return &specialTestService{repo: repo}
}

// GetAllTests retrieves all special tests in the library.
func (s *specialTestService) GetAllTests(ctx context.Context) ([]*model.SpecialTest, error) {
	return s.repo.GetAll(ctx)
}

// GetTestsByCategory retrieves special tests filtered by body region category.
func (s *specialTestService) GetTestsByCategory(ctx context.Context, category string) ([]*model.SpecialTest, error) {
	if !model.IsValidTestCategory(category) {
		return nil, fmt.Errorf("invalid test category: %s", category)
	}
	return s.repo.GetByCategory(ctx, model.TestCategory(category))
}

// GetTestByID retrieves a single special test by ID.
func (s *specialTestService) GetTestByID(ctx context.Context, id string) (*model.SpecialTest, error) {
	return s.repo.GetByID(ctx, id)
}

// SearchTests searches special tests by name (English or Vietnamese).
func (s *specialTestService) SearchTests(ctx context.Context, query string, limit int) ([]*model.SpecialTest, error) {
	if query == "" {
		return []*model.SpecialTest{}, nil
	}
	return s.repo.Search(ctx, query, limit)
}

// RecordTestResult records a special test result for a patient.
func (s *specialTestService) RecordTestResult(ctx context.Context, therapistID string, req *model.CreateSpecialTestResultRequest) (*model.PatientSpecialTestResult, error) {
	// Verify the special test exists
	_, err := s.repo.GetByID(ctx, req.SpecialTestID)
	if err != nil {
		return nil, fmt.Errorf("special test not found: %w", err)
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

	result := &model.PatientSpecialTestResult{
		ID:            uuid.New().String(),
		PatientID:     req.PatientID,
		VisitID:       visitID,
		SpecialTestID: req.SpecialTestID,
		Result:        model.TestResult(req.Result),
		Notes:         req.Notes,
		TherapistID:   therapistID,
		AssessedAt:    assessedAt,
	}

	if err := s.repo.CreateResult(ctx, result); err != nil {
		return nil, err
	}

	log.Info().
		Str("result_id", result.ID).
		Str("patient_id", result.PatientID).
		Str("special_test_id", result.SpecialTestID).
		Str("result", string(result.Result)).
		Str("therapist_id", therapistID).
		Msg("special test result recorded")

	return result, nil
}

// GetPatientTestHistory retrieves all special test results for a patient.
func (s *specialTestService) GetPatientTestHistory(ctx context.Context, patientID string) ([]*model.PatientSpecialTestResult, error) {
	return s.repo.GetPatientResults(ctx, patientID)
}

// GetResultsByVisit retrieves all special test results for a specific visit.
func (s *specialTestService) GetResultsByVisit(ctx context.Context, visitID string) ([]*model.PatientSpecialTestResult, error) {
	return s.repo.GetResultsByVisit(ctx, visitID)
}
