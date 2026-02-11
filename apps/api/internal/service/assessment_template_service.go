package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
)

// AssessmentTemplateService defines the interface for assessment template business logic.
type AssessmentTemplateService interface {
	GetTemplates(ctx context.Context) ([]*model.AssessmentTemplate, error)
	GetTemplateByID(ctx context.Context, id string) (*model.AssessmentTemplate, error)
	GetTemplateByCondition(ctx context.Context, condition string) (*model.AssessmentTemplate, error)
	GetTemplatesByCategory(ctx context.Context, category string) ([]*model.AssessmentTemplate, error)
	SaveAssessmentResult(ctx context.Context, clinicID, therapistID string, req *model.CreateAssessmentResultRequest) (*model.PatientAssessmentResult, error)
	GetPatientResults(ctx context.Context, patientID string) ([]*model.PatientAssessmentResult, error)
	GetResultByID(ctx context.Context, id string) (*model.PatientAssessmentResult, error)
}

// assessmentTemplateService implements AssessmentTemplateService.
type assessmentTemplateService struct {
	repo repository.AssessmentTemplateRepository
}

// NewAssessmentTemplateService creates a new assessment template service.
func NewAssessmentTemplateService(repo repository.AssessmentTemplateRepository) AssessmentTemplateService {
	return &assessmentTemplateService{repo: repo}
}

// GetTemplates retrieves all active assessment templates.
func (s *assessmentTemplateService) GetTemplates(ctx context.Context) ([]*model.AssessmentTemplate, error) {
	return s.repo.GetAll(ctx)
}

// GetTemplateByID retrieves a single assessment template by ID.
func (s *assessmentTemplateService) GetTemplateByID(ctx context.Context, id string) (*model.AssessmentTemplate, error) {
	return s.repo.GetByID(ctx, id)
}

// GetTemplateByCondition retrieves a template by condition name.
func (s *assessmentTemplateService) GetTemplateByCondition(ctx context.Context, condition string) (*model.AssessmentTemplate, error) {
	return s.repo.GetByCondition(ctx, condition)
}

// GetTemplatesByCategory retrieves templates for a given category.
func (s *assessmentTemplateService) GetTemplatesByCategory(ctx context.Context, category string) ([]*model.AssessmentTemplate, error) {
	if !model.IsValidTemplateCategory(category) {
		return nil, fmt.Errorf("invalid category: %s", category)
	}
	return s.repo.GetByCategory(ctx, category)
}

// SaveAssessmentResult validates and saves a patient assessment result.
func (s *assessmentTemplateService) SaveAssessmentResult(ctx context.Context, clinicID, therapistID string, req *model.CreateAssessmentResultRequest) (*model.PatientAssessmentResult, error) {
	// Fetch the template to validate results against
	template, err := s.repo.GetByID(ctx, req.TemplateID)
	if err != nil {
		return nil, fmt.Errorf("template not found: %w", err)
	}

	// Validate results against template checklist items
	if err := validateResults(template.ChecklistItems, req.Results); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
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

	result := &model.PatientAssessmentResult{
		ID:          uuid.New().String(),
		PatientID:   req.PatientID,
		TemplateID:  req.TemplateID,
		ClinicID:    clinicID,
		TherapistID: therapistID,
		Results:     req.Results,
		Notes:       req.Notes,
		AssessedAt:  assessedAt,
	}

	if err := s.repo.CreateResult(ctx, result); err != nil {
		return nil, err
	}

	log.Info().
		Str("result_id", result.ID).
		Str("patient_id", result.PatientID).
		Str("template_id", result.TemplateID).
		Str("therapist_id", therapistID).
		Msg("Assessment result saved")

	return result, nil
}

// GetPatientResults retrieves all assessment results for a patient.
func (s *assessmentTemplateService) GetPatientResults(ctx context.Context, patientID string) ([]*model.PatientAssessmentResult, error) {
	return s.repo.GetPatientResults(ctx, patientID)
}

// GetResultByID retrieves a single assessment result by ID.
func (s *assessmentTemplateService) GetResultByID(ctx context.Context, id string) (*model.PatientAssessmentResult, error) {
	return s.repo.GetResultByID(ctx, id)
}

// validateResults checks that all required checklist items have answers in the results JSON.
// The results are expected to be a JSON object keyed by item name.
func validateResults(checklistItems []model.ChecklistItem, resultsJSON json.RawMessage) error {
	var results map[string]interface{}
	if err := json.Unmarshal(resultsJSON, &results); err != nil {
		return fmt.Errorf("results must be a valid JSON object: %w", err)
	}

	for _, item := range checklistItems {
		if !item.Required {
			continue
		}

		val, exists := results[item.Item]
		if !exists {
			return fmt.Errorf("required field missing: %s", item.Item)
		}

		// Check that the value is not empty
		switch v := val.(type) {
		case string:
			if v == "" {
				return fmt.Errorf("required field is empty: %s", item.Item)
			}
		case []interface{}:
			if len(v) == 0 {
				return fmt.Errorf("required field has no selections: %s", item.Item)
			}
		case nil:
			return fmt.Errorf("required field is null: %s", item.Item)
		}
		// Numbers (including 0) and booleans are valid non-empty values
	}

	return nil
}
