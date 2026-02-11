package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// MMTRepository defines the interface for MMT assessment data access.
type MMTRepository interface {
	Create(ctx context.Context, assessment *model.MMTAssessment) error
	GetByID(ctx context.Context, id string) (*model.MMTAssessment, error)
	GetByPatientID(ctx context.Context, patientID string) ([]*model.MMTAssessment, error)
	GetByVisitID(ctx context.Context, visitID string) ([]*model.MMTAssessment, error)
	GetHistory(ctx context.Context, patientID string, muscleGroup string, side model.MMTSide) ([]*model.MMTAssessment, error)
}

// postgresMMTRepo implements MMTRepository with PostgreSQL.
type postgresMMTRepo struct {
	db *DB
}

// NewMMTRepository creates a new PostgreSQL MMT repository.
func NewMMTRepository(db *DB) MMTRepository {
	return &postgresMMTRepo{db: db}
}

// Create inserts a new MMT assessment record.
func (r *postgresMMTRepo) Create(ctx context.Context, assessment *model.MMTAssessment) error {
	query := `
		INSERT INTO mmt_assessments (
			id, patient_id, visit_id, clinic_id, therapist_id,
			muscle_group, side, grade, notes, assessed_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10
		)
		RETURNING created_at, updated_at`

	err := r.db.QueryRowContext(ctx, query,
		assessment.ID,
		assessment.PatientID,
		NullableString(assessment.VisitID),
		assessment.ClinicID,
		assessment.TherapistID,
		assessment.MuscleGroup,
		assessment.Side,
		assessment.Grade,
		NullableStringValue(assessment.Notes),
		assessment.AssessedAt,
	).Scan(&assessment.CreatedAt, &assessment.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create MMT assessment: %w", err)
	}

	return nil
}

// GetByID retrieves a MMT assessment by ID.
func (r *postgresMMTRepo) GetByID(ctx context.Context, id string) (*model.MMTAssessment, error) {
	query := `
		SELECT id, patient_id, visit_id, clinic_id, therapist_id,
			   muscle_group, side, grade, notes,
			   assessed_at, created_at, updated_at
		FROM mmt_assessments
		WHERE id = $1`

	return r.scanAssessment(r.db.QueryRowContext(ctx, query, id))
}

// GetByPatientID retrieves all MMT assessments for a patient.
func (r *postgresMMTRepo) GetByPatientID(ctx context.Context, patientID string) ([]*model.MMTAssessment, error) {
	query := `
		SELECT id, patient_id, visit_id, clinic_id, therapist_id,
			   muscle_group, side, grade, notes,
			   assessed_at, created_at, updated_at
		FROM mmt_assessments
		WHERE patient_id = $1
		ORDER BY assessed_at DESC`

	return r.scanAssessments(ctx, query, patientID)
}

// GetByVisitID retrieves all MMT assessments for a visit.
func (r *postgresMMTRepo) GetByVisitID(ctx context.Context, visitID string) ([]*model.MMTAssessment, error) {
	query := `
		SELECT id, patient_id, visit_id, clinic_id, therapist_id,
			   muscle_group, side, grade, notes,
			   assessed_at, created_at, updated_at
		FROM mmt_assessments
		WHERE visit_id = $1
		ORDER BY assessed_at DESC`

	return r.scanAssessments(ctx, query, visitID)
}

// GetHistory retrieves MMT assessment history for a specific muscle group/side combination.
func (r *postgresMMTRepo) GetHistory(ctx context.Context, patientID string, muscleGroup string, side model.MMTSide) ([]*model.MMTAssessment, error) {
	query := `
		SELECT id, patient_id, visit_id, clinic_id, therapist_id,
			   muscle_group, side, grade, notes,
			   assessed_at, created_at, updated_at
		FROM mmt_assessments
		WHERE patient_id = $1 AND muscle_group = $2 AND side = $3
		ORDER BY assessed_at ASC`

	return r.scanAssessments(ctx, query, patientID, muscleGroup, side)
}

// scanAssessment scans a single MMT assessment row.
func (r *postgresMMTRepo) scanAssessment(row *sql.Row) (*model.MMTAssessment, error) {
	var a model.MMTAssessment
	var visitID, notes sql.NullString

	err := row.Scan(
		&a.ID, &a.PatientID, &visitID, &a.ClinicID, &a.TherapistID,
		&a.MuscleGroup, &a.Side, &a.Grade, &notes,
		&a.AssessedAt, &a.CreatedAt, &a.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan MMT assessment: %w", err)
	}

	a.VisitID = StringPtrFromNull(visitID)
	a.Notes = StringFromNull(notes)

	return &a, nil
}

// scanAssessments scans multiple MMT assessment rows.
func (r *postgresMMTRepo) scanAssessments(ctx context.Context, query string, args ...interface{}) ([]*model.MMTAssessment, error) {
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query MMT assessments: %w", err)
	}
	defer rows.Close()

	assessments := make([]*model.MMTAssessment, 0)
	for rows.Next() {
		var a model.MMTAssessment
		var visitID, notes sql.NullString

		err := rows.Scan(
			&a.ID, &a.PatientID, &visitID, &a.ClinicID, &a.TherapistID,
			&a.MuscleGroup, &a.Side, &a.Grade, &notes,
			&a.AssessedAt, &a.CreatedAt, &a.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan MMT assessment row: %w", err)
		}

		a.VisitID = StringPtrFromNull(visitID)
		a.Notes = StringFromNull(notes)

		assessments = append(assessments, &a)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating MMT assessments: %w", err)
	}

	return assessments, nil
}

// mockMMTRepo provides a mock implementation for development.
type mockMMTRepo struct{}

// NewMockMMTRepository creates a mock MMT repository.
func NewMockMMTRepository() MMTRepository {
	return &mockMMTRepo{}
}

func (r *mockMMTRepo) Create(ctx context.Context, assessment *model.MMTAssessment) error {
	return nil
}

func (r *mockMMTRepo) GetByID(ctx context.Context, id string) (*model.MMTAssessment, error) {
	return nil, ErrNotFound
}

func (r *mockMMTRepo) GetByPatientID(ctx context.Context, patientID string) ([]*model.MMTAssessment, error) {
	return []*model.MMTAssessment{}, nil
}

func (r *mockMMTRepo) GetByVisitID(ctx context.Context, visitID string) ([]*model.MMTAssessment, error) {
	return []*model.MMTAssessment{}, nil
}

func (r *mockMMTRepo) GetHistory(ctx context.Context, patientID string, muscleGroup string, side model.MMTSide) ([]*model.MMTAssessment, error) {
	return []*model.MMTAssessment{}, nil
}
