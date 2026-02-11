package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// DischargeRepository defines the interface for discharge data access.
type DischargeRepository interface {
	// Plans
	CreatePlan(ctx context.Context, plan *model.DischargePlan) error
	GetPlanByPatientID(ctx context.Context, patientID string) (*model.DischargePlan, error)
	UpdatePlan(ctx context.Context, plan *model.DischargePlan) error

	// Summaries
	CreateSummary(ctx context.Context, summary *model.DischargeSummary) error
	GetSummaryByID(ctx context.Context, id string) (*model.DischargeSummary, error)
	GetSummaryByPatientID(ctx context.Context, patientID string) (*model.DischargeSummary, error)

	// Discharge completion
	CompleteDischarge(ctx context.Context, patientID string, dischargeDate time.Time) error
}

// postgresDischargeRepo implements DischargeRepository with PostgreSQL.
type postgresDischargeRepo struct {
	db *DB
}

// NewDischargeRepository creates a new PostgreSQL discharge repository.
func NewDischargeRepository(db *DB) DischargeRepository {
	return &postgresDischargeRepo{db: db}
}

// CreatePlan inserts a new discharge plan.
func (r *postgresDischargeRepo) CreatePlan(ctx context.Context, plan *model.DischargePlan) error {
	goalOutcomesJSON, err := json.Marshal(plan.GoalOutcomes)
	if err != nil {
		return fmt.Errorf("failed to marshal goal outcomes: %w", err)
	}

	recommendationsJSON, err := json.Marshal(plan.Recommendations)
	if err != nil {
		return fmt.Errorf("failed to marshal recommendations: %w", err)
	}

	var homeProgramJSON []byte
	if plan.HomeProgram != nil {
		homeProgramJSON, err = json.Marshal(plan.HomeProgram)
		if err != nil {
			return fmt.Errorf("failed to marshal home program: %w", err)
		}
	}

	var followUpJSON []byte
	if plan.FollowUp != nil {
		followUpJSON, err = json.Marshal(plan.FollowUp)
		if err != nil {
			return fmt.Errorf("failed to marshal follow-up plan: %w", err)
		}
	}

	var patientEducationJSON []byte
	if len(plan.PatientEducation) > 0 {
		patientEducationJSON, err = json.Marshal(plan.PatientEducation)
		if err != nil {
			return fmt.Errorf("failed to marshal patient education: %w", err)
		}
	}

	query := `
		INSERT INTO discharge_plans (
			id, patient_id, clinic_id, therapist_id, protocol_id,
			status, reason, reason_details, reason_details_vi,
			planned_date, goal_outcomes, home_program, recommendations,
			follow_up, patient_education, notes, notes_vi,
			created_by, updated_by
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9,
			$10, $11, $12, $13, $14, $15, $16, $17, $18, $19
		)
		RETURNING created_at, updated_at`

	err = r.db.QueryRowContext(ctx, query,
		plan.ID,
		plan.PatientID,
		plan.ClinicID,
		plan.TherapistID,
		NullableString(plan.ProtocolID),
		plan.Status,
		plan.Reason,
		NullableStringValue(plan.ReasonDetails),
		NullableStringValue(plan.ReasonDetailsVi),
		NullableTime(plan.PlannedDate),
		goalOutcomesJSON,
		homeProgramJSON,
		recommendationsJSON,
		followUpJSON,
		patientEducationJSON,
		NullableStringValue(plan.Notes),
		NullableStringValue(plan.NotesVi),
		NullableString(plan.CreatedBy),
		NullableString(plan.UpdatedBy),
	).Scan(&plan.CreatedAt, &plan.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create discharge plan: %w", err)
	}

	return nil
}

// GetPlanByPatientID retrieves a discharge plan by patient ID (most recent).
func (r *postgresDischargeRepo) GetPlanByPatientID(ctx context.Context, patientID string) (*model.DischargePlan, error) {
	query := `
		SELECT
			id, patient_id, clinic_id, therapist_id, protocol_id,
			status, reason, reason_details, reason_details_vi,
			planned_date, actual_date, goal_outcomes, home_program,
			recommendations, follow_up, patient_education,
			notes, notes_vi, created_at, updated_at, created_by, updated_by
		FROM discharge_plans
		WHERE patient_id = $1
		ORDER BY created_at DESC
		LIMIT 1`

	return r.scanPlan(r.db.QueryRowContext(ctx, query, patientID))
}

// scanPlan scans a single discharge plan row.
func (r *postgresDischargeRepo) scanPlan(row *sql.Row) (*model.DischargePlan, error) {
	var plan model.DischargePlan
	var protocolID, reasonDetails, reasonDetailsVi, notes, notesVi sql.NullString
	var createdBy, updatedBy sql.NullString
	var plannedDate, actualDate sql.NullTime
	var goalOutcomesJSON, homeProgramJSON, recommendationsJSON, followUpJSON, patientEducationJSON []byte

	err := row.Scan(
		&plan.ID,
		&plan.PatientID,
		&plan.ClinicID,
		&plan.TherapistID,
		&protocolID,
		&plan.Status,
		&plan.Reason,
		&reasonDetails,
		&reasonDetailsVi,
		&plannedDate,
		&actualDate,
		&goalOutcomesJSON,
		&homeProgramJSON,
		&recommendationsJSON,
		&followUpJSON,
		&patientEducationJSON,
		&notes,
		&notesVi,
		&plan.CreatedAt,
		&plan.UpdatedAt,
		&createdBy,
		&updatedBy,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan discharge plan: %w", err)
	}

	plan.ProtocolID = StringPtrFromNull(protocolID)
	plan.ReasonDetails = StringFromNull(reasonDetails)
	plan.ReasonDetailsVi = StringFromNull(reasonDetailsVi)
	plan.Notes = StringFromNull(notes)
	plan.NotesVi = StringFromNull(notesVi)
	plan.CreatedBy = StringPtrFromNull(createdBy)
	plan.UpdatedBy = StringPtrFromNull(updatedBy)

	if plannedDate.Valid {
		plan.PlannedDate = &plannedDate.Time
	}
	if actualDate.Valid {
		plan.ActualDate = &actualDate.Time
	}

	if len(goalOutcomesJSON) > 0 {
		if jsonErr := json.Unmarshal(goalOutcomesJSON, &plan.GoalOutcomes); jsonErr != nil {
			log.Warn().Err(jsonErr).Str("plan_id", plan.ID).Msg("failed to unmarshal goal outcomes")
		}
	}

	if len(homeProgramJSON) > 0 {
		var hp model.DischargeHomeProgram
		if jsonErr := json.Unmarshal(homeProgramJSON, &hp); jsonErr != nil {
			log.Warn().Err(jsonErr).Str("plan_id", plan.ID).Msg("failed to unmarshal home program")
		} else {
			plan.HomeProgram = &hp
		}
	}

	if len(recommendationsJSON) > 0 {
		if jsonErr := json.Unmarshal(recommendationsJSON, &plan.Recommendations); jsonErr != nil {
			log.Warn().Err(jsonErr).Str("plan_id", plan.ID).Msg("failed to unmarshal recommendations")
		}
	}

	if len(followUpJSON) > 0 {
		var fp model.FollowUpPlan
		if jsonErr := json.Unmarshal(followUpJSON, &fp); jsonErr != nil {
			log.Warn().Err(jsonErr).Str("plan_id", plan.ID).Msg("failed to unmarshal follow-up plan")
		} else {
			plan.FollowUp = &fp
		}
	}

	if len(patientEducationJSON) > 0 {
		if jsonErr := json.Unmarshal(patientEducationJSON, &plan.PatientEducation); jsonErr != nil {
			log.Warn().Err(jsonErr).Str("plan_id", plan.ID).Msg("failed to unmarshal patient education")
		}
	}

	return &plan, nil
}

// UpdatePlan updates an existing discharge plan with optimistic locking.
func (r *postgresDischargeRepo) UpdatePlan(ctx context.Context, plan *model.DischargePlan) error {
	goalOutcomesJSON, err := json.Marshal(plan.GoalOutcomes)
	if err != nil {
		return fmt.Errorf("failed to marshal goal outcomes: %w", err)
	}

	recommendationsJSON, err := json.Marshal(plan.Recommendations)
	if err != nil {
		return fmt.Errorf("failed to marshal recommendations: %w", err)
	}

	var homeProgramJSON []byte
	if plan.HomeProgram != nil {
		homeProgramJSON, err = json.Marshal(plan.HomeProgram)
		if err != nil {
			return fmt.Errorf("failed to marshal home program: %w", err)
		}
	}

	var followUpJSON []byte
	if plan.FollowUp != nil {
		followUpJSON, err = json.Marshal(plan.FollowUp)
		if err != nil {
			return fmt.Errorf("failed to marshal follow-up plan: %w", err)
		}
	}

	var patientEducationJSON []byte
	if len(plan.PatientEducation) > 0 {
		patientEducationJSON, err = json.Marshal(plan.PatientEducation)
		if err != nil {
			return fmt.Errorf("failed to marshal patient education: %w", err)
		}
	}

	query := `
		UPDATE discharge_plans SET
			status = $1, reason = $2, reason_details = $3, reason_details_vi = $4,
			planned_date = $5, actual_date = $6, goal_outcomes = $7,
			home_program = $8, recommendations = $9, follow_up = $10,
			patient_education = $11, notes = $12, notes_vi = $13,
			updated_by = $14, updated_at = NOW()
		WHERE id = $15 AND updated_at = $16
		RETURNING updated_at`

	var newUpdatedAt time.Time
	err = r.db.QueryRowContext(ctx, query,
		plan.Status,
		plan.Reason,
		NullableStringValue(plan.ReasonDetails),
		NullableStringValue(plan.ReasonDetailsVi),
		NullableTime(plan.PlannedDate),
		NullableTime(plan.ActualDate),
		goalOutcomesJSON,
		homeProgramJSON,
		recommendationsJSON,
		followUpJSON,
		patientEducationJSON,
		NullableStringValue(plan.Notes),
		NullableStringValue(plan.NotesVi),
		NullableString(plan.UpdatedBy),
		plan.ID,
		plan.UpdatedAt,
	).Scan(&newUpdatedAt)

	if err == sql.ErrNoRows {
		return fmt.Errorf("discharge plan was modified by another user: %w", ErrNotFound)
	}
	if err != nil {
		return fmt.Errorf("failed to update discharge plan: %w", err)
	}

	plan.UpdatedAt = newUpdatedAt
	return nil
}

// CreateSummary inserts a new discharge summary.
func (r *postgresDischargeRepo) CreateSummary(ctx context.Context, summary *model.DischargeSummary) error {
	baselineJSON, err := json.Marshal(summary.BaselineComparison)
	if err != nil {
		return fmt.Errorf("failed to marshal baseline comparison: %w", err)
	}

	query := `
		INSERT INTO discharge_summaries (
			id, discharge_plan_id, patient_id, clinic_id, therapist_id,
			diagnosis, diagnosis_vi, treatment_summary, treatment_summary_vi,
			total_sessions, treatment_duration_days, first_visit_date, last_visit_date,
			baseline_comparison, functional_status, functional_status_vi,
			discharge_reason, prognosis, prognosis_vi,
			created_by, updated_by
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9,
			$10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
		)
		RETURNING created_at, updated_at`

	err = r.db.QueryRowContext(ctx, query,
		summary.ID,
		summary.DischargePlanID,
		summary.PatientID,
		summary.ClinicID,
		summary.TherapistID,
		NullableStringValue(summary.Diagnosis),
		NullableStringValue(summary.DiagnosisVi),
		NullableStringValue(summary.TreatmentSummary),
		NullableStringValue(summary.TreatmentSummaryVi),
		summary.TotalSessions,
		summary.TreatmentDuration,
		summary.FirstVisitDate,
		summary.LastVisitDate,
		baselineJSON,
		NullableStringValue(summary.FunctionalStatus),
		NullableStringValue(summary.FunctionalStatusVi),
		summary.DischargeReason,
		NullableStringValue(summary.Prognosis),
		NullableStringValue(summary.PrognosisVi),
		NullableString(summary.CreatedBy),
		NullableString(summary.UpdatedBy),
	).Scan(&summary.CreatedAt, &summary.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create discharge summary: %w", err)
	}

	return nil
}

// GetSummaryByID retrieves a discharge summary by ID.
func (r *postgresDischargeRepo) GetSummaryByID(ctx context.Context, id string) (*model.DischargeSummary, error) {
	query := `
		SELECT
			id, discharge_plan_id, patient_id, clinic_id, therapist_id,
			diagnosis, diagnosis_vi, treatment_summary, treatment_summary_vi,
			total_sessions, treatment_duration_days, first_visit_date, last_visit_date,
			baseline_comparison, functional_status, functional_status_vi,
			discharge_reason, prognosis, prognosis_vi,
			signed_by, signed_at, created_at, updated_at, created_by, updated_by
		FROM discharge_summaries
		WHERE id = $1`

	return r.scanSummary(r.db.QueryRowContext(ctx, query, id))
}

// GetSummaryByPatientID retrieves the most recent discharge summary for a patient.
func (r *postgresDischargeRepo) GetSummaryByPatientID(ctx context.Context, patientID string) (*model.DischargeSummary, error) {
	query := `
		SELECT
			id, discharge_plan_id, patient_id, clinic_id, therapist_id,
			diagnosis, diagnosis_vi, treatment_summary, treatment_summary_vi,
			total_sessions, treatment_duration_days, first_visit_date, last_visit_date,
			baseline_comparison, functional_status, functional_status_vi,
			discharge_reason, prognosis, prognosis_vi,
			signed_by, signed_at, created_at, updated_at, created_by, updated_by
		FROM discharge_summaries
		WHERE patient_id = $1
		ORDER BY created_at DESC
		LIMIT 1`

	return r.scanSummary(r.db.QueryRowContext(ctx, query, patientID))
}

// scanSummary scans a single discharge summary row.
func (r *postgresDischargeRepo) scanSummary(row *sql.Row) (*model.DischargeSummary, error) {
	var s model.DischargeSummary
	var diagnosis, diagnosisVi, treatmentSummary, treatmentSummaryVi sql.NullString
	var functionalStatus, functionalStatusVi sql.NullString
	var prognosis, prognosisVi sql.NullString
	var signedBy, createdBy, updatedBy sql.NullString
	var signedAt sql.NullTime
	var baselineJSON []byte

	err := row.Scan(
		&s.ID,
		&s.DischargePlanID,
		&s.PatientID,
		&s.ClinicID,
		&s.TherapistID,
		&diagnosis,
		&diagnosisVi,
		&treatmentSummary,
		&treatmentSummaryVi,
		&s.TotalSessions,
		&s.TreatmentDuration,
		&s.FirstVisitDate,
		&s.LastVisitDate,
		&baselineJSON,
		&functionalStatus,
		&functionalStatusVi,
		&s.DischargeReason,
		&prognosis,
		&prognosisVi,
		&signedBy,
		&signedAt,
		&s.CreatedAt,
		&s.UpdatedAt,
		&createdBy,
		&updatedBy,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan discharge summary: %w", err)
	}

	s.Diagnosis = StringFromNull(diagnosis)
	s.DiagnosisVi = StringFromNull(diagnosisVi)
	s.TreatmentSummary = StringFromNull(treatmentSummary)
	s.TreatmentSummaryVi = StringFromNull(treatmentSummaryVi)
	s.FunctionalStatus = StringFromNull(functionalStatus)
	s.FunctionalStatusVi = StringFromNull(functionalStatusVi)
	s.Prognosis = StringFromNull(prognosis)
	s.PrognosisVi = StringFromNull(prognosisVi)
	s.SignedBy = StringPtrFromNull(signedBy)
	s.CreatedBy = StringPtrFromNull(createdBy)
	s.UpdatedBy = StringPtrFromNull(updatedBy)

	if signedAt.Valid {
		s.SignedAt = &signedAt.Time
	}

	if len(baselineJSON) > 0 {
		if jsonErr := json.Unmarshal(baselineJSON, &s.BaselineComparison); jsonErr != nil {
			log.Warn().Err(jsonErr).Str("summary_id", s.ID).Msg("failed to unmarshal baseline comparison")
		}
	}

	return &s, nil
}

// CompleteDischarge marks a patient's discharge plan as completed.
func (r *postgresDischargeRepo) CompleteDischarge(ctx context.Context, patientID string, dischargeDate time.Time) error {
	query := `
		UPDATE discharge_plans SET
			status = $1, actual_date = $2, updated_at = NOW()
		WHERE patient_id = $3 AND status != $4
		ORDER BY created_at DESC
		LIMIT 1`

	// PostgreSQL does not support ORDER BY + LIMIT in UPDATE directly.
	// Use a subquery instead.
	query = `
		UPDATE discharge_plans SET
			status = $1, actual_date = $2, updated_at = NOW()
		WHERE id = (
			SELECT id FROM discharge_plans
			WHERE patient_id = $3 AND status != $4
			ORDER BY created_at DESC
			LIMIT 1
		)`

	result, err := r.db.ExecContext(ctx, query,
		model.DischargeStatusCompleted,
		dischargeDate,
		patientID,
		model.DischargeStatusCompleted,
	)
	if err != nil {
		return fmt.Errorf("failed to complete discharge: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

// mockDischargeRepo provides a mock implementation for development.
type mockDischargeRepo struct{}

// NewMockDischargeRepository creates a mock discharge repository.
func NewMockDischargeRepository() DischargeRepository {
	return &mockDischargeRepo{}
}

func (r *mockDischargeRepo) CreatePlan(ctx context.Context, plan *model.DischargePlan) error {
	plan.CreatedAt = time.Now()
	plan.UpdatedAt = time.Now()
	return nil
}

func (r *mockDischargeRepo) GetPlanByPatientID(ctx context.Context, patientID string) (*model.DischargePlan, error) {
	return nil, ErrNotFound
}

func (r *mockDischargeRepo) UpdatePlan(ctx context.Context, plan *model.DischargePlan) error {
	plan.UpdatedAt = time.Now()
	return nil
}

func (r *mockDischargeRepo) CreateSummary(ctx context.Context, summary *model.DischargeSummary) error {
	summary.CreatedAt = time.Now()
	summary.UpdatedAt = time.Now()
	return nil
}

func (r *mockDischargeRepo) GetSummaryByID(ctx context.Context, id string) (*model.DischargeSummary, error) {
	return nil, ErrNotFound
}

func (r *mockDischargeRepo) GetSummaryByPatientID(ctx context.Context, patientID string) (*model.DischargeSummary, error) {
	return nil, ErrNotFound
}

func (r *mockDischargeRepo) CompleteDischarge(ctx context.Context, patientID string, dischargeDate time.Time) error {
	return nil
}
