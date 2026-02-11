package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// AssessmentTemplateRepository defines the interface for assessment template data access.
type AssessmentTemplateRepository interface {
	GetAll(ctx context.Context) ([]*model.AssessmentTemplate, error)
	GetByID(ctx context.Context, id string) (*model.AssessmentTemplate, error)
	GetByCondition(ctx context.Context, condition string) (*model.AssessmentTemplate, error)
	GetByCategory(ctx context.Context, category string) ([]*model.AssessmentTemplate, error)
	CreateResult(ctx context.Context, result *model.PatientAssessmentResult) error
	GetPatientResults(ctx context.Context, patientID string) ([]*model.PatientAssessmentResult, error)
	GetResultByID(ctx context.Context, id string) (*model.PatientAssessmentResult, error)
}

// postgresAssessmentTemplateRepo implements AssessmentTemplateRepository with PostgreSQL.
type postgresAssessmentTemplateRepo struct {
	db *DB
}

// NewAssessmentTemplateRepository creates a new PostgreSQL assessment template repository.
func NewAssessmentTemplateRepository(db *DB) AssessmentTemplateRepository {
	return &postgresAssessmentTemplateRepo{db: db}
}

// GetAll retrieves all active assessment templates.
func (r *postgresAssessmentTemplateRepo) GetAll(ctx context.Context) ([]*model.AssessmentTemplate, error) {
	query := `
		SELECT id, name, name_vi, condition, category,
		       COALESCE(description, '') as description,
		       COALESCE(description_vi, '') as description_vi,
		       checklist_items, is_active, created_at, updated_at
		FROM assessment_templates
		WHERE is_active = true
		ORDER BY category, name`

	return r.scanTemplates(ctx, query)
}

// GetByID retrieves an assessment template by ID.
func (r *postgresAssessmentTemplateRepo) GetByID(ctx context.Context, id string) (*model.AssessmentTemplate, error) {
	query := `
		SELECT id, name, name_vi, condition, category,
		       COALESCE(description, '') as description,
		       COALESCE(description_vi, '') as description_vi,
		       checklist_items, is_active, created_at, updated_at
		FROM assessment_templates
		WHERE id = $1`

	return r.scanTemplate(r.db.QueryRowContext(ctx, query, id))
}

// GetByCondition retrieves an assessment template by condition.
func (r *postgresAssessmentTemplateRepo) GetByCondition(ctx context.Context, condition string) (*model.AssessmentTemplate, error) {
	query := `
		SELECT id, name, name_vi, condition, category,
		       COALESCE(description, '') as description,
		       COALESCE(description_vi, '') as description_vi,
		       checklist_items, is_active, created_at, updated_at
		FROM assessment_templates
		WHERE condition = $1 AND is_active = true`

	return r.scanTemplate(r.db.QueryRowContext(ctx, query, condition))
}

// GetByCategory retrieves all active templates for a given category.
func (r *postgresAssessmentTemplateRepo) GetByCategory(ctx context.Context, category string) ([]*model.AssessmentTemplate, error) {
	query := `
		SELECT id, name, name_vi, condition, category,
		       COALESCE(description, '') as description,
		       COALESCE(description_vi, '') as description_vi,
		       checklist_items, is_active, created_at, updated_at
		FROM assessment_templates
		WHERE category = $1 AND is_active = true
		ORDER BY name`

	return r.scanTemplates(ctx, query, category)
}

// CreateResult inserts a new patient assessment result.
func (r *postgresAssessmentTemplateRepo) CreateResult(ctx context.Context, result *model.PatientAssessmentResult) error {
	query := `
		INSERT INTO patient_assessment_results (
			id, patient_id, template_id, clinic_id, therapist_id,
			results, notes, assessed_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8
		)
		RETURNING created_at, updated_at`

	err := r.db.QueryRowContext(ctx, query,
		result.ID,
		result.PatientID,
		result.TemplateID,
		result.ClinicID,
		result.TherapistID,
		result.Results,
		NullableStringValue(result.Notes),
		result.AssessedAt,
	).Scan(&result.CreatedAt, &result.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create assessment result: %w", err)
	}

	return nil
}

// GetPatientResults retrieves all assessment results for a patient, ordered by date descending.
func (r *postgresAssessmentTemplateRepo) GetPatientResults(ctx context.Context, patientID string) ([]*model.PatientAssessmentResult, error) {
	query := `
		SELECT r.id, r.patient_id, r.template_id, r.clinic_id, r.therapist_id,
		       r.results, COALESCE(r.notes, '') as notes, r.assessed_at,
		       r.created_at, r.updated_at,
		       t.name as template_name, t.name_vi as template_name_vi, t.condition as template_condition
		FROM patient_assessment_results r
		JOIN assessment_templates t ON t.id = r.template_id
		WHERE r.patient_id = $1
		ORDER BY r.assessed_at DESC`

	rows, err := r.db.QueryContext(ctx, query, patientID)
	if err != nil {
		return nil, fmt.Errorf("failed to query patient assessment results: %w", err)
	}
	defer rows.Close()

	results := make([]*model.PatientAssessmentResult, 0)
	for rows.Next() {
		var res model.PatientAssessmentResult
		err := rows.Scan(
			&res.ID, &res.PatientID, &res.TemplateID, &res.ClinicID, &res.TherapistID,
			&res.Results, &res.Notes, &res.AssessedAt,
			&res.CreatedAt, &res.UpdatedAt,
			&res.TemplateName, &res.TemplateNameVi, &res.TemplateCondition,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan assessment result row: %w", err)
		}
		results = append(results, &res)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating assessment results: %w", err)
	}

	return results, nil
}

// GetResultByID retrieves a single assessment result by ID.
func (r *postgresAssessmentTemplateRepo) GetResultByID(ctx context.Context, id string) (*model.PatientAssessmentResult, error) {
	query := `
		SELECT r.id, r.patient_id, r.template_id, r.clinic_id, r.therapist_id,
		       r.results, COALESCE(r.notes, '') as notes, r.assessed_at,
		       r.created_at, r.updated_at,
		       t.name as template_name, t.name_vi as template_name_vi, t.condition as template_condition
		FROM patient_assessment_results r
		JOIN assessment_templates t ON t.id = r.template_id
		WHERE r.id = $1`

	var res model.PatientAssessmentResult
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&res.ID, &res.PatientID, &res.TemplateID, &res.ClinicID, &res.TherapistID,
		&res.Results, &res.Notes, &res.AssessedAt,
		&res.CreatedAt, &res.UpdatedAt,
		&res.TemplateName, &res.TemplateNameVi, &res.TemplateCondition,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan assessment result: %w", err)
	}

	return &res, nil
}

// scanTemplate scans a single assessment template row.
func (r *postgresAssessmentTemplateRepo) scanTemplate(row *sql.Row) (*model.AssessmentTemplate, error) {
	var t model.AssessmentTemplate

	err := row.Scan(
		&t.ID, &t.Name, &t.NameVi, &t.Condition, &t.Category,
		&t.Description, &t.DescriptionVi,
		&t.ChecklistJSON, &t.IsActive, &t.CreatedAt, &t.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan assessment template: %w", err)
	}

	if err := t.UnmarshalChecklist(); err != nil {
		return nil, fmt.Errorf("failed to unmarshal checklist items: %w", err)
	}

	return &t, nil
}

// scanTemplates scans multiple assessment template rows.
func (r *postgresAssessmentTemplateRepo) scanTemplates(ctx context.Context, query string, args ...interface{}) ([]*model.AssessmentTemplate, error) {
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query assessment templates: %w", err)
	}
	defer rows.Close()

	templates := make([]*model.AssessmentTemplate, 0)
	for rows.Next() {
		var t model.AssessmentTemplate

		err := rows.Scan(
			&t.ID, &t.Name, &t.NameVi, &t.Condition, &t.Category,
			&t.Description, &t.DescriptionVi,
			&t.ChecklistJSON, &t.IsActive, &t.CreatedAt, &t.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan assessment template row: %w", err)
		}

		if err := t.UnmarshalChecklist(); err != nil {
			return nil, fmt.Errorf("failed to unmarshal checklist items: %w", err)
		}

		templates = append(templates, &t)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating assessment templates: %w", err)
	}

	return templates, nil
}

// mockAssessmentTemplateRepo provides a mock implementation for development.
type mockAssessmentTemplateRepo struct{}

// NewMockAssessmentTemplateRepository creates a mock assessment template repository.
func NewMockAssessmentTemplateRepository() AssessmentTemplateRepository {
	return &mockAssessmentTemplateRepo{}
}

func (r *mockAssessmentTemplateRepo) GetAll(ctx context.Context) ([]*model.AssessmentTemplate, error) {
	return []*model.AssessmentTemplate{}, nil
}

func (r *mockAssessmentTemplateRepo) GetByID(ctx context.Context, id string) (*model.AssessmentTemplate, error) {
	return nil, ErrNotFound
}

func (r *mockAssessmentTemplateRepo) GetByCondition(ctx context.Context, condition string) (*model.AssessmentTemplate, error) {
	return nil, ErrNotFound
}

func (r *mockAssessmentTemplateRepo) GetByCategory(ctx context.Context, category string) ([]*model.AssessmentTemplate, error) {
	return []*model.AssessmentTemplate{}, nil
}

func (r *mockAssessmentTemplateRepo) CreateResult(ctx context.Context, result *model.PatientAssessmentResult) error {
	return nil
}

func (r *mockAssessmentTemplateRepo) GetPatientResults(ctx context.Context, patientID string) ([]*model.PatientAssessmentResult, error) {
	return []*model.PatientAssessmentResult{}, nil
}

func (r *mockAssessmentTemplateRepo) GetResultByID(ctx context.Context, id string) (*model.PatientAssessmentResult, error) {
	return nil, ErrNotFound
}
