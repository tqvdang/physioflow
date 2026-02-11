package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// SpecialTestRepository defines the interface for special test data access.
type SpecialTestRepository interface {
	GetAll(ctx context.Context) ([]*model.SpecialTest, error)
	GetByCategory(ctx context.Context, category model.TestCategory) ([]*model.SpecialTest, error)
	GetByID(ctx context.Context, id string) (*model.SpecialTest, error)
	Search(ctx context.Context, query string, limit int) ([]*model.SpecialTest, error)
	CreateResult(ctx context.Context, result *model.PatientSpecialTestResult) error
	GetPatientResults(ctx context.Context, patientID string) ([]*model.PatientSpecialTestResult, error)
	GetResultsByVisit(ctx context.Context, visitID string) ([]*model.PatientSpecialTestResult, error)
}

// postgresSpecialTestRepo implements SpecialTestRepository with PostgreSQL.
type postgresSpecialTestRepo struct {
	db *DB
}

// NewSpecialTestRepository creates a new PostgreSQL special test repository.
func NewSpecialTestRepository(db *DB) SpecialTestRepository {
	return &postgresSpecialTestRepo{db: db}
}

// GetAll retrieves all special tests ordered by category and name.
func (r *postgresSpecialTestRepo) GetAll(ctx context.Context) ([]*model.SpecialTest, error) {
	query := `
		SELECT id, name, name_vi, category, description, description_vi,
			   positive_finding, positive_finding_vi, negative_finding, negative_finding_vi,
			   sensitivity, specificity, created_at
		FROM special_tests
		ORDER BY category, name`

	return r.scanTests(ctx, query)
}

// GetByCategory retrieves special tests for a given body region category.
func (r *postgresSpecialTestRepo) GetByCategory(ctx context.Context, category model.TestCategory) ([]*model.SpecialTest, error) {
	query := `
		SELECT id, name, name_vi, category, description, description_vi,
			   positive_finding, positive_finding_vi, negative_finding, negative_finding_vi,
			   sensitivity, specificity, created_at
		FROM special_tests
		WHERE category = $1
		ORDER BY name`

	return r.scanTests(ctx, query, category)
}

// GetByID retrieves a single special test by its ID.
func (r *postgresSpecialTestRepo) GetByID(ctx context.Context, id string) (*model.SpecialTest, error) {
	query := `
		SELECT id, name, name_vi, category, description, description_vi,
			   positive_finding, positive_finding_vi, negative_finding, negative_finding_vi,
			   sensitivity, specificity, created_at
		FROM special_tests
		WHERE id = $1`

	return r.scanTest(r.db.QueryRowContext(ctx, query, id))
}

// Search finds special tests by name (English or Vietnamese) using trigram similarity.
func (r *postgresSpecialTestRepo) Search(ctx context.Context, query string, limit int) ([]*model.SpecialTest, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	sqlQuery := `
		SELECT id, name, name_vi, category, description, description_vi,
			   positive_finding, positive_finding_vi, negative_finding, negative_finding_vi,
			   sensitivity, specificity, created_at
		FROM special_tests
		WHERE name ILIKE '%' || $1 || '%'
		   OR name_vi ILIKE '%' || $1 || '%'
		ORDER BY
			CASE WHEN name ILIKE $1 || '%' THEN 0 ELSE 1 END,
			name
		LIMIT $2`

	return r.scanTests(ctx, sqlQuery, query, limit)
}

// CreateResult inserts a new special test result for a patient.
func (r *postgresSpecialTestRepo) CreateResult(ctx context.Context, result *model.PatientSpecialTestResult) error {
	query := `
		INSERT INTO patient_special_test_results (
			id, patient_id, visit_id, special_test_id, result, notes, therapist_id, assessed_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8
		)
		RETURNING created_at`

	err := r.db.QueryRowContext(ctx, query,
		result.ID,
		result.PatientID,
		NullableString(result.VisitID),
		result.SpecialTestID,
		result.Result,
		NullableStringValue(result.Notes),
		result.TherapistID,
		result.AssessedAt,
	).Scan(&result.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create special test result: %w", err)
	}

	return nil
}

// GetPatientResults retrieves all special test results for a patient with test details.
func (r *postgresSpecialTestRepo) GetPatientResults(ctx context.Context, patientID string) ([]*model.PatientSpecialTestResult, error) {
	query := `
		SELECT r.id, r.patient_id, r.visit_id, r.special_test_id, r.result,
			   r.notes, r.therapist_id, r.assessed_at, r.created_at,
			   st.name AS test_name, st.name_vi AS test_name_vi, st.category AS test_category
		FROM patient_special_test_results r
		JOIN special_tests st ON st.id = r.special_test_id
		WHERE r.patient_id = $1
		ORDER BY r.assessed_at DESC`

	return r.scanResults(ctx, query, patientID)
}

// GetResultsByVisit retrieves all special test results for a specific visit.
func (r *postgresSpecialTestRepo) GetResultsByVisit(ctx context.Context, visitID string) ([]*model.PatientSpecialTestResult, error) {
	query := `
		SELECT r.id, r.patient_id, r.visit_id, r.special_test_id, r.result,
			   r.notes, r.therapist_id, r.assessed_at, r.created_at,
			   st.name AS test_name, st.name_vi AS test_name_vi, st.category AS test_category
		FROM patient_special_test_results r
		JOIN special_tests st ON st.id = r.special_test_id
		WHERE r.visit_id = $1
		ORDER BY r.assessed_at DESC`

	return r.scanResults(ctx, query, visitID)
}

// scanTest scans a single special test row.
func (r *postgresSpecialTestRepo) scanTest(row *sql.Row) (*model.SpecialTest, error) {
	var t model.SpecialTest
	var sensitivity, specificity sql.NullInt32

	err := row.Scan(
		&t.ID, &t.Name, &t.NameVi, &t.Category, &t.Description, &t.DescriptionVi,
		&t.PositiveFinding, &t.PositiveFindingVi, &t.NegativeFinding, &t.NegativeFindingVi,
		&sensitivity, &specificity, &t.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan special test: %w", err)
	}

	if sensitivity.Valid {
		v := int(sensitivity.Int32)
		t.Sensitivity = &v
	}
	if specificity.Valid {
		v := int(specificity.Int32)
		t.Specificity = &v
	}

	return &t, nil
}

// scanTests scans multiple special test rows.
func (r *postgresSpecialTestRepo) scanTests(ctx context.Context, query string, args ...interface{}) ([]*model.SpecialTest, error) {
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query special tests: %w", err)
	}
	defer rows.Close()

	tests := make([]*model.SpecialTest, 0)
	for rows.Next() {
		var t model.SpecialTest
		var sensitivity, specificity sql.NullInt32

		err := rows.Scan(
			&t.ID, &t.Name, &t.NameVi, &t.Category, &t.Description, &t.DescriptionVi,
			&t.PositiveFinding, &t.PositiveFindingVi, &t.NegativeFinding, &t.NegativeFindingVi,
			&sensitivity, &specificity, &t.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan special test row: %w", err)
		}

		if sensitivity.Valid {
			v := int(sensitivity.Int32)
			t.Sensitivity = &v
		}
		if specificity.Valid {
			v := int(specificity.Int32)
			t.Specificity = &v
		}

		tests = append(tests, &t)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating special tests: %w", err)
	}

	return tests, nil
}

// scanResults scans multiple special test result rows (with joined test details).
func (r *postgresSpecialTestRepo) scanResults(ctx context.Context, query string, args ...interface{}) ([]*model.PatientSpecialTestResult, error) {
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query special test results: %w", err)
	}
	defer rows.Close()

	results := make([]*model.PatientSpecialTestResult, 0)
	for rows.Next() {
		var res model.PatientSpecialTestResult
		var visitID, notes sql.NullString

		err := rows.Scan(
			&res.ID, &res.PatientID, &visitID, &res.SpecialTestID, &res.Result,
			&notes, &res.TherapistID, &res.AssessedAt, &res.CreatedAt,
			&res.TestName, &res.TestNameVi, &res.TestCategory,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan special test result row: %w", err)
		}

		res.VisitID = StringPtrFromNull(visitID)
		res.Notes = StringFromNull(notes)

		results = append(results, &res)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating special test results: %w", err)
	}

	return results, nil
}

// mockSpecialTestRepo provides a mock implementation for development.
type mockSpecialTestRepo struct{}

// NewMockSpecialTestRepository creates a mock special test repository.
func NewMockSpecialTestRepository() SpecialTestRepository {
	return &mockSpecialTestRepo{}
}

func (r *mockSpecialTestRepo) GetAll(ctx context.Context) ([]*model.SpecialTest, error) {
	return []*model.SpecialTest{}, nil
}

func (r *mockSpecialTestRepo) GetByCategory(ctx context.Context, category model.TestCategory) ([]*model.SpecialTest, error) {
	return []*model.SpecialTest{}, nil
}

func (r *mockSpecialTestRepo) GetByID(ctx context.Context, id string) (*model.SpecialTest, error) {
	return nil, ErrNotFound
}

func (r *mockSpecialTestRepo) Search(ctx context.Context, query string, limit int) ([]*model.SpecialTest, error) {
	return []*model.SpecialTest{}, nil
}

func (r *mockSpecialTestRepo) CreateResult(ctx context.Context, result *model.PatientSpecialTestResult) error {
	return nil
}

func (r *mockSpecialTestRepo) GetPatientResults(ctx context.Context, patientID string) ([]*model.PatientSpecialTestResult, error) {
	return []*model.PatientSpecialTestResult{}, nil
}

func (r *mockSpecialTestRepo) GetResultsByVisit(ctx context.Context, visitID string) ([]*model.PatientSpecialTestResult, error) {
	return []*model.PatientSpecialTestResult{}, nil
}
