package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/lib/pq"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// ProtocolRepository defines the interface for clinical protocol data access.
type ProtocolRepository interface {
	// Protocol templates
	GetProtocols(ctx context.Context) ([]*model.ClinicalProtocolDB, error)
	GetProtocolByID(ctx context.Context, id string) (*model.ClinicalProtocolDB, error)

	// Patient protocol assignments
	AssignProtocol(ctx context.Context, pp *model.PatientProtocolDB) error
	GetPatientProtocols(ctx context.Context, patientID string) ([]*model.PatientProtocolDB, error)
	GetPatientProtocolByID(ctx context.Context, id string) (*model.PatientProtocolDB, error)
	UpdateProgress(ctx context.Context, pp *model.PatientProtocolDB) error
}

// postgresProtocolRepo implements ProtocolRepository with PostgreSQL.
type postgresProtocolRepo struct {
	db *DB
}

// NewProtocolRepository creates a new PostgreSQL protocol repository.
func NewProtocolRepository(db *DB) ProtocolRepository {
	return &postgresProtocolRepo{db: db}
}

// GetProtocols retrieves all active clinical protocols.
func (r *postgresProtocolRepo) GetProtocols(ctx context.Context) ([]*model.ClinicalProtocolDB, error) {
	query := `
		SELECT
			id, clinic_id, protocol_name, protocol_name_vi,
			description, description_vi,
			goals, exercises,
			frequency_per_week, duration_weeks, session_duration_minutes,
			progression_criteria,
			category, applicable_diagnoses, body_regions,
			is_active, version,
			created_at, updated_at
		FROM clinical_protocols
		WHERE is_active = true
		ORDER BY protocol_name ASC`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list protocols: %w", err)
	}
	defer rows.Close()

	protocols := make([]*model.ClinicalProtocolDB, 0)
	for rows.Next() {
		p, err := r.scanProtocolRow(rows)
		if err != nil {
			return nil, err
		}
		protocols = append(protocols, p)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating protocols: %w", err)
	}

	return protocols, nil
}

// GetProtocolByID retrieves a single clinical protocol by ID.
func (r *postgresProtocolRepo) GetProtocolByID(ctx context.Context, id string) (*model.ClinicalProtocolDB, error) {
	query := `
		SELECT
			id, clinic_id, protocol_name, protocol_name_vi,
			description, description_vi,
			goals, exercises,
			frequency_per_week, duration_weeks, session_duration_minutes,
			progression_criteria,
			category, applicable_diagnoses, body_regions,
			is_active, version,
			created_at, updated_at
		FROM clinical_protocols
		WHERE id = $1`

	var p model.ClinicalProtocolDB
	var clinicID, description, descriptionVi, category sql.NullString
	var protocolNameVi sql.NullString
	var goalsJSON, exercisesJSON, progressionJSON []byte
	var diagnoses, bodyRegions []string

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&p.ID,
		&clinicID,
		&p.ProtocolName,
		&protocolNameVi,
		&description,
		&descriptionVi,
		&goalsJSON,
		&exercisesJSON,
		&p.FrequencyPerWeek,
		&p.DurationWeeks,
		&p.SessionDurationMinutes,
		&progressionJSON,
		&category,
		pq.Array(&diagnoses),
		pq.Array(&bodyRegions),
		&p.IsActive,
		&p.Version,
		&p.CreatedAt,
		&p.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get protocol: %w", err)
	}

	p.ClinicID = StringPtrFromNull(clinicID)
	p.ProtocolNameVi = StringFromNull(protocolNameVi)
	p.Description = StringFromNull(description)
	p.DescriptionVi = StringFromNull(descriptionVi)
	p.Category = StringFromNull(category)
	p.ApplicableDiagnoses = diagnoses
	p.BodyRegions = bodyRegions

	if err := json.Unmarshal(goalsJSON, &p.Goals); err != nil {
		p.Goals = []model.ProtocolGoalJSON{}
	}
	if err := json.Unmarshal(exercisesJSON, &p.Exercises); err != nil {
		p.Exercises = []model.ProtocolExerciseJSON{}
	}
	if err := json.Unmarshal(progressionJSON, &p.ProgressionCriteria); err != nil {
		p.ProgressionCriteria = model.ProgressionCriteriaJSON{}
	}

	return &p, nil
}

// scanProtocolRow scans a clinical protocol from sql.Rows.
func (r *postgresProtocolRepo) scanProtocolRow(rows *sql.Rows) (*model.ClinicalProtocolDB, error) {
	var p model.ClinicalProtocolDB
	var clinicID, description, descriptionVi, category sql.NullString
	var protocolNameVi sql.NullString
	var goalsJSON, exercisesJSON, progressionJSON []byte
	var diagnoses, bodyRegions []string

	err := rows.Scan(
		&p.ID,
		&clinicID,
		&p.ProtocolName,
		&protocolNameVi,
		&description,
		&descriptionVi,
		&goalsJSON,
		&exercisesJSON,
		&p.FrequencyPerWeek,
		&p.DurationWeeks,
		&p.SessionDurationMinutes,
		&progressionJSON,
		&category,
		pq.Array(&diagnoses),
		pq.Array(&bodyRegions),
		&p.IsActive,
		&p.Version,
		&p.CreatedAt,
		&p.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to scan protocol row: %w", err)
	}

	p.ClinicID = StringPtrFromNull(clinicID)
	p.ProtocolNameVi = StringFromNull(protocolNameVi)
	p.Description = StringFromNull(description)
	p.DescriptionVi = StringFromNull(descriptionVi)
	p.Category = StringFromNull(category)
	p.ApplicableDiagnoses = diagnoses
	p.BodyRegions = bodyRegions

	if err := json.Unmarshal(goalsJSON, &p.Goals); err != nil {
		p.Goals = []model.ProtocolGoalJSON{}
	}
	if err := json.Unmarshal(exercisesJSON, &p.Exercises); err != nil {
		p.Exercises = []model.ProtocolExerciseJSON{}
	}
	if err := json.Unmarshal(progressionJSON, &p.ProgressionCriteria); err != nil {
		p.ProgressionCriteria = model.ProgressionCriteriaJSON{}
	}

	return &p, nil
}

// AssignProtocol inserts a new patient protocol assignment.
func (r *postgresProtocolRepo) AssignProtocol(ctx context.Context, pp *model.PatientProtocolDB) error {
	query := `
		INSERT INTO patient_protocols (
			id, patient_id, protocol_id, therapist_id, clinic_id,
			assigned_date, start_date, target_end_date,
			progress_status, current_phase, sessions_completed,
			progress_notes, version, created_by
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8,
			$9, $10, $11,
			$12, $13, $14
		)
		RETURNING created_at, updated_at`

	progressNotesJSON, err := json.Marshal(pp.ProgressNotes)
	if err != nil {
		progressNotesJSON = []byte("[]")
	}

	err = r.db.QueryRowContext(ctx, query,
		pp.ID,
		pp.PatientID,
		pp.ProtocolID,
		pp.TherapistID,
		pp.ClinicID,
		pp.AssignedDate,
		NullableTime(pp.StartDate),
		NullableTime(pp.TargetEndDate),
		pp.ProgressStatus,
		pp.CurrentPhase,
		pp.SessionsCompleted,
		progressNotesJSON,
		pp.Version,
		NullableString(pp.CreatedBy),
	).Scan(&pp.CreatedAt, &pp.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to assign protocol: %w", err)
	}

	return nil
}

// GetPatientProtocols retrieves all protocols assigned to a patient.
func (r *postgresProtocolRepo) GetPatientProtocols(ctx context.Context, patientID string) ([]*model.PatientProtocolDB, error) {
	query := `
		SELECT
			pp.id, pp.patient_id, pp.protocol_id, pp.therapist_id, pp.clinic_id,
			pp.assigned_date, pp.start_date, pp.target_end_date, pp.actual_end_date,
			pp.progress_status, pp.current_phase, pp.sessions_completed,
			pp.custom_goals, pp.custom_exercises,
			pp.custom_frequency_per_week, pp.custom_duration_weeks,
			pp.progress_notes, pp.version,
			pp.created_at, pp.updated_at,
			cp.id, cp.protocol_name, cp.protocol_name_vi,
			cp.category, cp.duration_weeks, cp.frequency_per_week
		FROM patient_protocols pp
		JOIN clinical_protocols cp ON cp.id = pp.protocol_id
		WHERE pp.patient_id = $1
		ORDER BY pp.assigned_date DESC`

	rows, err := r.db.QueryContext(ctx, query, patientID)
	if err != nil {
		return nil, fmt.Errorf("failed to list patient protocols: %w", err)
	}
	defer rows.Close()

	results := make([]*model.PatientProtocolDB, 0)
	for rows.Next() {
		pp, err := r.scanPatientProtocolRow(rows)
		if err != nil {
			return nil, err
		}
		results = append(results, pp)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating patient protocols: %w", err)
	}

	return results, nil
}

// GetPatientProtocolByID retrieves a single patient protocol assignment by ID.
func (r *postgresProtocolRepo) GetPatientProtocolByID(ctx context.Context, id string) (*model.PatientProtocolDB, error) {
	query := `
		SELECT
			pp.id, pp.patient_id, pp.protocol_id, pp.therapist_id, pp.clinic_id,
			pp.assigned_date, pp.start_date, pp.target_end_date, pp.actual_end_date,
			pp.progress_status, pp.current_phase, pp.sessions_completed,
			pp.custom_goals, pp.custom_exercises,
			pp.custom_frequency_per_week, pp.custom_duration_weeks,
			pp.progress_notes, pp.version,
			pp.created_at, pp.updated_at,
			cp.id, cp.protocol_name, cp.protocol_name_vi,
			cp.category, cp.duration_weeks, cp.frequency_per_week
		FROM patient_protocols pp
		JOIN clinical_protocols cp ON cp.id = pp.protocol_id
		WHERE pp.id = $1`

	rows, err := r.db.QueryContext(ctx, query, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get patient protocol: %w", err)
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, ErrNotFound
	}

	pp, err := r.scanPatientProtocolRow(rows)
	if err != nil {
		return nil, err
	}

	return pp, nil
}

// scanPatientProtocolRow scans a patient protocol from sql.Rows.
func (r *postgresProtocolRepo) scanPatientProtocolRow(rows *sql.Rows) (*model.PatientProtocolDB, error) {
	var pp model.PatientProtocolDB
	var cp model.ClinicalProtocolSummary
	var startDate, targetEndDate, actualEndDate sql.NullTime
	var customGoals, customExercises, progressNotes []byte
	var customFrequency, customDuration sql.NullInt64
	var cpCategory, cpProtocolNameVi sql.NullString

	err := rows.Scan(
		&pp.ID,
		&pp.PatientID,
		&pp.ProtocolID,
		&pp.TherapistID,
		&pp.ClinicID,
		&pp.AssignedDate,
		&startDate,
		&targetEndDate,
		&actualEndDate,
		&pp.ProgressStatus,
		&pp.CurrentPhase,
		&pp.SessionsCompleted,
		&customGoals,
		&customExercises,
		&customFrequency,
		&customDuration,
		&progressNotes,
		&pp.Version,
		&pp.CreatedAt,
		&pp.UpdatedAt,
		// Joined protocol summary
		&cp.ID,
		&cp.ProtocolName,
		&cpProtocolNameVi,
		&cpCategory,
		&cp.DurationWeeks,
		&cp.FrequencyPerWeek,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to scan patient protocol row: %w", err)
	}

	pp.StartDate = TimePtrFromNull(startDate)
	pp.TargetEndDate = TimePtrFromNull(targetEndDate)
	pp.ActualEndDate = TimePtrFromNull(actualEndDate)

	if customFrequency.Valid {
		v := int(customFrequency.Int64)
		pp.CustomFrequencyPerWeek = &v
	}
	if customDuration.Valid {
		v := int(customDuration.Int64)
		pp.CustomDurationWeeks = &v
	}

	if progressNotes != nil {
		if err := json.Unmarshal(progressNotes, &pp.ProgressNotes); err != nil {
			pp.ProgressNotes = []model.ProgressNote{}
		}
	}

	cp.ProtocolNameVi = StringFromNull(cpProtocolNameVi)
	cp.Category = StringFromNull(cpCategory)
	pp.Protocol = &cp

	return &pp, nil
}

// UpdateProgress updates a patient protocol's progress with optimistic locking.
func (r *postgresProtocolRepo) UpdateProgress(ctx context.Context, pp *model.PatientProtocolDB) error {
	progressNotesJSON, err := json.Marshal(pp.ProgressNotes)
	if err != nil {
		progressNotesJSON = []byte("[]")
	}

	query := `
		UPDATE patient_protocols SET
			progress_status = $1,
			current_phase = $2,
			sessions_completed = $3,
			progress_notes = $4,
			actual_end_date = $5,
			version = $6
		WHERE id = $7 AND version = $8
		RETURNING updated_at`

	result := r.db.QueryRowContext(ctx, query,
		pp.ProgressStatus,
		pp.CurrentPhase,
		pp.SessionsCompleted,
		progressNotesJSON,
		NullableTime(pp.ActualEndDate),
		pp.Version,
		pp.ID,
		pp.Version-1, // Check against previous version
	)

	if err := result.Scan(&pp.UpdatedAt); err != nil {
		if err == sql.ErrNoRows {
			return ErrVersionConflict
		}
		return fmt.Errorf("failed to update protocol progress: %w", err)
	}

	return nil
}

// mockProtocolRepo provides a mock implementation for development.
type mockProtocolRepo struct{}

// NewMockProtocolRepository creates a mock protocol repository.
func NewMockProtocolRepository() ProtocolRepository {
	return &mockProtocolRepo{}
}

func (r *mockProtocolRepo) GetProtocols(ctx context.Context) ([]*model.ClinicalProtocolDB, error) {
	return []*model.ClinicalProtocolDB{}, nil
}

func (r *mockProtocolRepo) GetProtocolByID(ctx context.Context, id string) (*model.ClinicalProtocolDB, error) {
	return nil, ErrNotFound
}

func (r *mockProtocolRepo) AssignProtocol(ctx context.Context, pp *model.PatientProtocolDB) error {
	return nil
}

func (r *mockProtocolRepo) GetPatientProtocols(ctx context.Context, patientID string) ([]*model.PatientProtocolDB, error) {
	return []*model.PatientProtocolDB{}, nil
}

func (r *mockProtocolRepo) GetPatientProtocolByID(ctx context.Context, id string) (*model.PatientProtocolDB, error) {
	return nil, ErrNotFound
}

func (r *mockProtocolRepo) UpdateProgress(ctx context.Context, pp *model.PatientProtocolDB) error {
	return nil
}
