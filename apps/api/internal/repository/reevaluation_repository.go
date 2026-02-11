package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// ReevaluationRepository defines the interface for re-evaluation data access.
type ReevaluationRepository interface {
	Create(ctx context.Context, assessment *model.ReevaluationAssessment) error
	CreateBatch(ctx context.Context, assessments []*model.ReevaluationAssessment) error
	GetByID(ctx context.Context, id string) (*model.ReevaluationAssessment, error)
	GetByPatientID(ctx context.Context, patientID string) ([]*model.ReevaluationAssessment, error)
	GetByBaselineID(ctx context.Context, baselineAssessmentID string) ([]*model.ReevaluationAssessment, error)
	GetComparisonData(ctx context.Context, id string) ([]*model.ReevaluationAssessment, error)
}

// postgresReevaluationRepo implements ReevaluationRepository with PostgreSQL.
type postgresReevaluationRepo struct {
	db *DB
}

// NewReevaluationRepository creates a new PostgreSQL re-evaluation repository.
func NewReevaluationRepository(db *DB) ReevaluationRepository {
	return &postgresReevaluationRepo{db: db}
}

// Create inserts a new re-evaluation assessment record.
func (r *postgresReevaluationRepo) Create(ctx context.Context, assessment *model.ReevaluationAssessment) error {
	query := `
		INSERT INTO reevaluation_assessments (
			id, patient_id, visit_id, clinic_id, baseline_assessment_id,
			assessment_type, measure_label, current_value, baseline_value,
			change, change_percentage, higher_is_better,
			mcid_threshold, mcid_achieved, interpretation,
			therapist_id, notes, assessed_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9,
			$10, $11, $12, $13, $14, $15, $16, $17, $18
		)
		RETURNING created_at, updated_at`

	var changePct sql.NullFloat64
	if assessment.ChangePercentage != nil {
		changePct = sql.NullFloat64{Float64: *assessment.ChangePercentage, Valid: true}
	}

	var mcidThreshold sql.NullFloat64
	if assessment.MCIDThreshold != nil {
		mcidThreshold = sql.NullFloat64{Float64: *assessment.MCIDThreshold, Valid: true}
	}

	err := r.db.QueryRowContext(ctx, query,
		assessment.ID,
		assessment.PatientID,
		NullableString(assessment.VisitID),
		assessment.ClinicID,
		NullableString(assessment.BaselineAssessmentID),
		assessment.AssessmentType,
		assessment.MeasureLabel,
		assessment.CurrentValue,
		assessment.BaselineValue,
		assessment.Change,
		changePct,
		assessment.HigherIsBetter,
		mcidThreshold,
		assessment.MCIDAchieved,
		assessment.Interpretation,
		assessment.TherapistID,
		NullableStringValue(assessment.Notes),
		assessment.AssessedAt,
	).Scan(&assessment.CreatedAt, &assessment.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create reevaluation assessment: %w", err)
	}

	return nil
}

// CreateBatch inserts multiple re-evaluation assessment records in a transaction.
func (r *postgresReevaluationRepo) CreateBatch(ctx context.Context, assessments []*model.ReevaluationAssessment) error {
	return r.db.WithTx(ctx, func(tx *Tx) error {
		query := `
			INSERT INTO reevaluation_assessments (
				id, patient_id, visit_id, clinic_id, baseline_assessment_id,
				assessment_type, measure_label, current_value, baseline_value,
				change, change_percentage, higher_is_better,
				mcid_threshold, mcid_achieved, interpretation,
				therapist_id, notes, assessed_at
			) VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8, $9,
				$10, $11, $12, $13, $14, $15, $16, $17, $18
			)
			RETURNING created_at, updated_at`

		for _, a := range assessments {
			var changePct sql.NullFloat64
			if a.ChangePercentage != nil {
				changePct = sql.NullFloat64{Float64: *a.ChangePercentage, Valid: true}
			}

			var mcidThreshold sql.NullFloat64
			if a.MCIDThreshold != nil {
				mcidThreshold = sql.NullFloat64{Float64: *a.MCIDThreshold, Valid: true}
			}

			err := tx.QueryRowContext(ctx, query,
				a.ID,
				a.PatientID,
				NullableString(a.VisitID),
				a.ClinicID,
				NullableString(a.BaselineAssessmentID),
				a.AssessmentType,
				a.MeasureLabel,
				a.CurrentValue,
				a.BaselineValue,
				a.Change,
				changePct,
				a.HigherIsBetter,
				mcidThreshold,
				a.MCIDAchieved,
				a.Interpretation,
				a.TherapistID,
				NullableStringValue(a.Notes),
				a.AssessedAt,
			).Scan(&a.CreatedAt, &a.UpdatedAt)

			if err != nil {
				return fmt.Errorf("failed to create reevaluation assessment %s: %w", a.ID, err)
			}
		}

		return nil
	})
}

// GetByID retrieves a re-evaluation assessment by ID.
func (r *postgresReevaluationRepo) GetByID(ctx context.Context, id string) (*model.ReevaluationAssessment, error) {
	query := `
		SELECT
			id, patient_id, visit_id, clinic_id, baseline_assessment_id,
			assessment_type, measure_label, current_value, baseline_value,
			change, change_percentage, higher_is_better,
			mcid_threshold, mcid_achieved, interpretation,
			therapist_id, notes, assessed_at, created_at, updated_at
		FROM reevaluation_assessments
		WHERE id = $1`

	return r.scanAssessment(r.db.QueryRowContext(ctx, query, id))
}

// GetByPatientID retrieves all re-evaluation assessments for a patient.
func (r *postgresReevaluationRepo) GetByPatientID(ctx context.Context, patientID string) ([]*model.ReevaluationAssessment, error) {
	query := `
		SELECT
			id, patient_id, visit_id, clinic_id, baseline_assessment_id,
			assessment_type, measure_label, current_value, baseline_value,
			change, change_percentage, higher_is_better,
			mcid_threshold, mcid_achieved, interpretation,
			therapist_id, notes, assessed_at, created_at, updated_at
		FROM reevaluation_assessments
		WHERE patient_id = $1
		ORDER BY assessed_at DESC`

	return r.scanAssessments(ctx, query, patientID)
}

// GetByBaselineID retrieves all re-evaluation assessments linked to a baseline assessment.
func (r *postgresReevaluationRepo) GetByBaselineID(ctx context.Context, baselineAssessmentID string) ([]*model.ReevaluationAssessment, error) {
	query := `
		SELECT
			id, patient_id, visit_id, clinic_id, baseline_assessment_id,
			assessment_type, measure_label, current_value, baseline_value,
			change, change_percentage, higher_is_better,
			mcid_threshold, mcid_achieved, interpretation,
			therapist_id, notes, assessed_at, created_at, updated_at
		FROM reevaluation_assessments
		WHERE baseline_assessment_id = $1
		ORDER BY assessed_at DESC`

	return r.scanAssessments(ctx, query, baselineAssessmentID)
}

// GetComparisonData retrieves all re-evaluation items for a specific re-evaluation session.
// Groups by the same assessed_at timestamp and patient to identify a re-evaluation visit.
func (r *postgresReevaluationRepo) GetComparisonData(ctx context.Context, id string) ([]*model.ReevaluationAssessment, error) {
	// First get the target record to find its assessed_at and patient_id
	target, err := r.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	query := `
		SELECT
			id, patient_id, visit_id, clinic_id, baseline_assessment_id,
			assessment_type, measure_label, current_value, baseline_value,
			change, change_percentage, higher_is_better,
			mcid_threshold, mcid_achieved, interpretation,
			therapist_id, notes, assessed_at, created_at, updated_at
		FROM reevaluation_assessments
		WHERE patient_id = $1 AND assessed_at = $2
		ORDER BY assessment_type, measure_label`

	return r.scanAssessments(ctx, query, target.PatientID, target.AssessedAt)
}

// scanAssessment scans a single re-evaluation assessment row.
func (r *postgresReevaluationRepo) scanAssessment(row *sql.Row) (*model.ReevaluationAssessment, error) {
	var a model.ReevaluationAssessment
	var visitID, baselineID, notes sql.NullString
	var changePct, mcidThreshold sql.NullFloat64

	err := row.Scan(
		&a.ID,
		&a.PatientID,
		&visitID,
		&a.ClinicID,
		&baselineID,
		&a.AssessmentType,
		&a.MeasureLabel,
		&a.CurrentValue,
		&a.BaselineValue,
		&a.Change,
		&changePct,
		&a.HigherIsBetter,
		&mcidThreshold,
		&a.MCIDAchieved,
		&a.Interpretation,
		&a.TherapistID,
		&notes,
		&a.AssessedAt,
		&a.CreatedAt,
		&a.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan reevaluation assessment: %w", err)
	}

	a.VisitID = StringPtrFromNull(visitID)
	a.BaselineAssessmentID = StringPtrFromNull(baselineID)
	a.Notes = StringFromNull(notes)
	if changePct.Valid {
		a.ChangePercentage = &changePct.Float64
	}
	if mcidThreshold.Valid {
		a.MCIDThreshold = &mcidThreshold.Float64
	}

	return &a, nil
}

// scanAssessments scans multiple re-evaluation assessment rows.
func (r *postgresReevaluationRepo) scanAssessments(ctx context.Context, query string, args ...interface{}) ([]*model.ReevaluationAssessment, error) {
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query reevaluation assessments: %w", err)
	}
	defer rows.Close()

	assessments := make([]*model.ReevaluationAssessment, 0)
	for rows.Next() {
		var a model.ReevaluationAssessment
		var visitID, baselineID, notes sql.NullString
		var changePct, mcidThreshold sql.NullFloat64

		err := rows.Scan(
			&a.ID,
			&a.PatientID,
			&visitID,
			&a.ClinicID,
			&baselineID,
			&a.AssessmentType,
			&a.MeasureLabel,
			&a.CurrentValue,
			&a.BaselineValue,
			&a.Change,
			&changePct,
			&a.HigherIsBetter,
			&mcidThreshold,
			&a.MCIDAchieved,
			&a.Interpretation,
			&a.TherapistID,
			&notes,
			&a.AssessedAt,
			&a.CreatedAt,
			&a.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan reevaluation assessment row: %w", err)
		}

		a.VisitID = StringPtrFromNull(visitID)
		a.BaselineAssessmentID = StringPtrFromNull(baselineID)
		a.Notes = StringFromNull(notes)
		if changePct.Valid {
			a.ChangePercentage = &changePct.Float64
		}
		if mcidThreshold.Valid {
			a.MCIDThreshold = &mcidThreshold.Float64
		}

		assessments = append(assessments, &a)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating reevaluation assessments: %w", err)
	}

	return assessments, nil
}

// mockReevaluationRepo provides a mock implementation for development.
type mockReevaluationRepo struct{}

// NewMockReevaluationRepository creates a mock re-evaluation repository.
func NewMockReevaluationRepository() ReevaluationRepository {
	return &mockReevaluationRepo{}
}

func (r *mockReevaluationRepo) Create(ctx context.Context, assessment *model.ReevaluationAssessment) error {
	log.Debug().Str("id", assessment.ID).Msg("mock: create reevaluation assessment")
	return nil
}

func (r *mockReevaluationRepo) CreateBatch(ctx context.Context, assessments []*model.ReevaluationAssessment) error {
	log.Debug().Int("count", len(assessments)).Msg("mock: create batch reevaluation assessments")
	return nil
}

func (r *mockReevaluationRepo) GetByID(ctx context.Context, id string) (*model.ReevaluationAssessment, error) {
	return nil, ErrNotFound
}

func (r *mockReevaluationRepo) GetByPatientID(ctx context.Context, patientID string) ([]*model.ReevaluationAssessment, error) {
	return []*model.ReevaluationAssessment{}, nil
}

func (r *mockReevaluationRepo) GetByBaselineID(ctx context.Context, baselineAssessmentID string) ([]*model.ReevaluationAssessment, error) {
	return []*model.ReevaluationAssessment{}, nil
}

func (r *mockReevaluationRepo) GetComparisonData(ctx context.Context, id string) ([]*model.ReevaluationAssessment, error) {
	return []*model.ReevaluationAssessment{}, nil
}
