package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// ROMRepository defines the interface for ROM assessment data access.
type ROMRepository interface {
	Create(ctx context.Context, assessment *model.ROMAssessment) error
	GetByID(ctx context.Context, id string) (*model.ROMAssessment, error)
	GetByPatientID(ctx context.Context, patientID string) ([]*model.ROMAssessment, error)
	GetByVisitID(ctx context.Context, visitID string) ([]*model.ROMAssessment, error)
	GetHistory(ctx context.Context, patientID string, joint model.ROMJoint, side model.ROMSide, movementType model.ROMMovementType) ([]*model.ROMAssessment, error)
}

// postgresROMRepo implements ROMRepository with PostgreSQL.
type postgresROMRepo struct {
	db *DB
}

// NewROMRepository creates a new PostgreSQL ROM repository.
func NewROMRepository(db *DB) ROMRepository {
	return &postgresROMRepo{db: db}
}

// Create inserts a new ROM assessment record.
func (r *postgresROMRepo) Create(ctx context.Context, assessment *model.ROMAssessment) error {
	query := `
		INSERT INTO rom_assessments (
			id, patient_id, visit_id, clinic_id, therapist_id,
			joint, side, movement_type, degree, notes, assessed_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
		)
		RETURNING created_at, updated_at`

	err := r.db.QueryRowContext(ctx, query,
		assessment.ID,
		assessment.PatientID,
		NullableString(assessment.VisitID),
		assessment.ClinicID,
		assessment.TherapistID,
		assessment.Joint,
		assessment.Side,
		assessment.MovementType,
		assessment.Degree,
		NullableStringValue(assessment.Notes),
		assessment.AssessedAt,
	).Scan(&assessment.CreatedAt, &assessment.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create ROM assessment: %w", err)
	}

	return nil
}

// GetByID retrieves a ROM assessment by ID.
func (r *postgresROMRepo) GetByID(ctx context.Context, id string) (*model.ROMAssessment, error) {
	query := `
		SELECT id, patient_id, visit_id, clinic_id, therapist_id,
			   joint, side, movement_type, degree, notes,
			   assessed_at, created_at, updated_at
		FROM rom_assessments
		WHERE id = $1`

	return r.scanAssessment(r.db.QueryRowContext(ctx, query, id))
}

// GetByPatientID retrieves all ROM assessments for a patient.
func (r *postgresROMRepo) GetByPatientID(ctx context.Context, patientID string) ([]*model.ROMAssessment, error) {
	query := `
		SELECT id, patient_id, visit_id, clinic_id, therapist_id,
			   joint, side, movement_type, degree, notes,
			   assessed_at, created_at, updated_at
		FROM rom_assessments
		WHERE patient_id = $1
		ORDER BY assessed_at DESC`

	return r.scanAssessments(ctx, query, patientID)
}

// GetByVisitID retrieves all ROM assessments for a visit.
func (r *postgresROMRepo) GetByVisitID(ctx context.Context, visitID string) ([]*model.ROMAssessment, error) {
	query := `
		SELECT id, patient_id, visit_id, clinic_id, therapist_id,
			   joint, side, movement_type, degree, notes,
			   assessed_at, created_at, updated_at
		FROM rom_assessments
		WHERE visit_id = $1
		ORDER BY assessed_at DESC`

	return r.scanAssessments(ctx, query, visitID)
}

// GetHistory retrieves ROM assessment history for a specific joint/side/movement combination.
func (r *postgresROMRepo) GetHistory(ctx context.Context, patientID string, joint model.ROMJoint, side model.ROMSide, movementType model.ROMMovementType) ([]*model.ROMAssessment, error) {
	query := `
		SELECT id, patient_id, visit_id, clinic_id, therapist_id,
			   joint, side, movement_type, degree, notes,
			   assessed_at, created_at, updated_at
		FROM rom_assessments
		WHERE patient_id = $1 AND joint = $2 AND side = $3 AND movement_type = $4
		ORDER BY assessed_at ASC`

	return r.scanAssessments(ctx, query, patientID, joint, side, movementType)
}

// scanAssessment scans a single ROM assessment row.
func (r *postgresROMRepo) scanAssessment(row *sql.Row) (*model.ROMAssessment, error) {
	var a model.ROMAssessment
	var visitID, notes sql.NullString

	err := row.Scan(
		&a.ID, &a.PatientID, &visitID, &a.ClinicID, &a.TherapistID,
		&a.Joint, &a.Side, &a.MovementType, &a.Degree, &notes,
		&a.AssessedAt, &a.CreatedAt, &a.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan ROM assessment: %w", err)
	}

	a.VisitID = StringPtrFromNull(visitID)
	a.Notes = StringFromNull(notes)

	return &a, nil
}

// scanAssessments scans multiple ROM assessment rows.
func (r *postgresROMRepo) scanAssessments(ctx context.Context, query string, args ...interface{}) ([]*model.ROMAssessment, error) {
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query ROM assessments: %w", err)
	}
	defer rows.Close()

	assessments := make([]*model.ROMAssessment, 0)
	for rows.Next() {
		var a model.ROMAssessment
		var visitID, notes sql.NullString

		err := rows.Scan(
			&a.ID, &a.PatientID, &visitID, &a.ClinicID, &a.TherapistID,
			&a.Joint, &a.Side, &a.MovementType, &a.Degree, &notes,
			&a.AssessedAt, &a.CreatedAt, &a.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan ROM assessment row: %w", err)
		}

		a.VisitID = StringPtrFromNull(visitID)
		a.Notes = StringFromNull(notes)

		assessments = append(assessments, &a)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating ROM assessments: %w", err)
	}

	return assessments, nil
}

// mockROMRepo provides a mock implementation for development.
type mockROMRepo struct{}

// NewMockROMRepository creates a mock ROM repository.
func NewMockROMRepository() ROMRepository {
	return &mockROMRepo{}
}

func (r *mockROMRepo) Create(ctx context.Context, assessment *model.ROMAssessment) error {
	return nil
}

func (r *mockROMRepo) GetByID(ctx context.Context, id string) (*model.ROMAssessment, error) {
	return nil, ErrNotFound
}

func (r *mockROMRepo) GetByPatientID(ctx context.Context, patientID string) ([]*model.ROMAssessment, error) {
	return []*model.ROMAssessment{}, nil
}

func (r *mockROMRepo) GetByVisitID(ctx context.Context, visitID string) ([]*model.ROMAssessment, error) {
	return []*model.ROMAssessment{}, nil
}

func (r *mockROMRepo) GetHistory(ctx context.Context, patientID string, joint model.ROMJoint, side model.ROMSide, movementType model.ROMMovementType) ([]*model.ROMAssessment, error) {
	return []*model.ROMAssessment{}, nil
}
