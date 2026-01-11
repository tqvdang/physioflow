package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/lib/pq"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// ExerciseRepository defines the interface for exercise data access.
type ExerciseRepository interface {
	// Exercise library CRUD
	Create(ctx context.Context, exercise *model.Exercise) error
	GetByID(ctx context.Context, id string) (*model.Exercise, error)
	Update(ctx context.Context, exercise *model.Exercise) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, params model.ExerciseSearchParams) ([]model.Exercise, int64, error)
	Search(ctx context.Context, clinicID, query string, limit int) ([]model.Exercise, error)

	// Prescriptions
	CreatePrescription(ctx context.Context, prescription *model.ExercisePrescription) error
	GetPrescriptionByID(ctx context.Context, id string) (*model.ExercisePrescription, error)
	UpdatePrescription(ctx context.Context, prescription *model.ExercisePrescription) error
	DeletePrescription(ctx context.Context, id string) error
	ListPatientPrescriptions(ctx context.Context, patientID string, activeOnly bool) ([]model.ExercisePrescription, error)

	// Home Exercise Programs
	CreateProgram(ctx context.Context, program *model.HomeExerciseProgram) error
	GetProgramByID(ctx context.Context, id string) (*model.HomeExerciseProgram, error)
	UpdateProgram(ctx context.Context, program *model.HomeExerciseProgram) error
	ListPatientPrograms(ctx context.Context, patientID string) ([]model.HomeExerciseProgram, error)

	// Compliance tracking
	LogCompliance(ctx context.Context, log *model.ExerciseComplianceLog) error
	GetComplianceLogs(ctx context.Context, prescriptionID string, limit int) ([]model.ExerciseComplianceLog, error)
	GetPatientComplianceSummary(ctx context.Context, patientID string) (*model.PatientExerciseSummary, error)
}

// postgresExerciseRepo implements ExerciseRepository with PostgreSQL.
type postgresExerciseRepo struct {
	db *DB
}

// NewExerciseRepository creates a new PostgreSQL exercise repository.
func NewExerciseRepository(db *DB) ExerciseRepository {
	return &postgresExerciseRepo{db: db}
}

// Create inserts a new exercise into the library.
func (r *postgresExerciseRepo) Create(ctx context.Context, exercise *model.Exercise) error {
	query := `
		INSERT INTO exercises (
			id, clinic_id, name, name_vi, description, description_vi,
			instructions, instructions_vi, category, difficulty,
			equipment, muscle_groups, image_url, video_url, thumbnail_url,
			default_sets, default_reps, default_hold_secs, default_duration_mins,
			precautions, precautions_vi, is_global, is_active, created_by
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
			$11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
		)
		RETURNING created_at, updated_at`

	muscleGroups := make([]string, len(exercise.MuscleGroups))
	for i, mg := range exercise.MuscleGroups {
		muscleGroups[i] = string(mg)
	}

	err := r.db.QueryRowContext(ctx, query,
		exercise.ID,
		NullableString(exercise.ClinicID),
		exercise.Name,
		exercise.NameVi,
		exercise.Description,
		exercise.DescriptionVi,
		exercise.Instructions,
		exercise.InstructionsVi,
		exercise.Category,
		exercise.Difficulty,
		pq.Array(exercise.Equipment),
		pq.Array(muscleGroups),
		NullableStringValue(exercise.ImageURL),
		NullableStringValue(exercise.VideoURL),
		NullableStringValue(exercise.ThumbnailURL),
		exercise.DefaultSets,
		exercise.DefaultReps,
		exercise.DefaultHoldSecs,
		exercise.DefaultDuration,
		NullableStringValue(exercise.Precautions),
		NullableStringValue(exercise.PrecautionsVi),
		exercise.IsGlobal,
		exercise.IsActive,
		NullableString(exercise.CreatedBy),
	).Scan(&exercise.CreatedAt, &exercise.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create exercise: %w", err)
	}

	return nil
}

// GetByID retrieves an exercise by ID.
func (r *postgresExerciseRepo) GetByID(ctx context.Context, id string) (*model.Exercise, error) {
	query := `
		SELECT
			id, clinic_id, name, name_vi, description, description_vi,
			instructions, instructions_vi, category, difficulty,
			equipment, muscle_groups, image_url, video_url, thumbnail_url,
			default_sets, default_reps, default_hold_secs, default_duration_mins,
			precautions, precautions_vi, is_global, is_active,
			created_at, updated_at, created_by
		FROM exercises
		WHERE id = $1`

	return r.scanExercise(r.db.QueryRowContext(ctx, query, id))
}

// scanExercise scans a single exercise row.
func (r *postgresExerciseRepo) scanExercise(row *sql.Row) (*model.Exercise, error) {
	var e model.Exercise
	var clinicID, imageURL, videoURL, thumbnailURL, precautions, precautionsVi, createdBy sql.NullString
	var equipment []string
	var muscleGroups []string

	err := row.Scan(
		&e.ID,
		&clinicID,
		&e.Name,
		&e.NameVi,
		&e.Description,
		&e.DescriptionVi,
		&e.Instructions,
		&e.InstructionsVi,
		&e.Category,
		&e.Difficulty,
		pq.Array(&equipment),
		pq.Array(&muscleGroups),
		&imageURL,
		&videoURL,
		&thumbnailURL,
		&e.DefaultSets,
		&e.DefaultReps,
		&e.DefaultHoldSecs,
		&e.DefaultDuration,
		&precautions,
		&precautionsVi,
		&e.IsGlobal,
		&e.IsActive,
		&e.CreatedAt,
		&e.UpdatedAt,
		&createdBy,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan exercise: %w", err)
	}

	e.ClinicID = StringPtrFromNull(clinicID)
	e.ImageURL = StringFromNull(imageURL)
	e.VideoURL = StringFromNull(videoURL)
	e.ThumbnailURL = StringFromNull(thumbnailURL)
	e.Precautions = StringFromNull(precautions)
	e.PrecautionsVi = StringFromNull(precautionsVi)
	e.CreatedBy = StringPtrFromNull(createdBy)
	e.Equipment = equipment

	e.MuscleGroups = make([]model.MuscleGroup, len(muscleGroups))
	for i, mg := range muscleGroups {
		e.MuscleGroups[i] = model.MuscleGroup(mg)
	}

	return &e, nil
}

// Update updates an existing exercise.
func (r *postgresExerciseRepo) Update(ctx context.Context, exercise *model.Exercise) error {
	query := `
		UPDATE exercises SET
			name = $1,
			name_vi = $2,
			description = $3,
			description_vi = $4,
			instructions = $5,
			instructions_vi = $6,
			category = $7,
			difficulty = $8,
			equipment = $9,
			muscle_groups = $10,
			image_url = $11,
			video_url = $12,
			thumbnail_url = $13,
			default_sets = $14,
			default_reps = $15,
			default_hold_secs = $16,
			default_duration_mins = $17,
			precautions = $18,
			precautions_vi = $19,
			is_active = $20
		WHERE id = $21
		RETURNING updated_at`

	muscleGroups := make([]string, len(exercise.MuscleGroups))
	for i, mg := range exercise.MuscleGroups {
		muscleGroups[i] = string(mg)
	}

	result := r.db.QueryRowContext(ctx, query,
		exercise.Name,
		exercise.NameVi,
		exercise.Description,
		exercise.DescriptionVi,
		exercise.Instructions,
		exercise.InstructionsVi,
		exercise.Category,
		exercise.Difficulty,
		pq.Array(exercise.Equipment),
		pq.Array(muscleGroups),
		NullableStringValue(exercise.ImageURL),
		NullableStringValue(exercise.VideoURL),
		NullableStringValue(exercise.ThumbnailURL),
		exercise.DefaultSets,
		exercise.DefaultReps,
		exercise.DefaultHoldSecs,
		exercise.DefaultDuration,
		NullableStringValue(exercise.Precautions),
		NullableStringValue(exercise.PrecautionsVi),
		exercise.IsActive,
		exercise.ID,
	)

	if err := result.Scan(&exercise.UpdatedAt); err != nil {
		if err == sql.ErrNoRows {
			return ErrNotFound
		}
		return fmt.Errorf("failed to update exercise: %w", err)
	}

	return nil
}

// Delete soft-deletes an exercise.
func (r *postgresExerciseRepo) Delete(ctx context.Context, id string) error {
	query := `UPDATE exercises SET is_active = false WHERE id = $1 AND is_active = true`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete exercise: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

// List returns a paginated list of exercises with filtering.
func (r *postgresExerciseRepo) List(ctx context.Context, params model.ExerciseSearchParams) ([]model.Exercise, int64, error) {
	conditions := []string{"(is_global = true OR clinic_id = $1 OR clinic_id IS NULL)"}
	args := []interface{}{params.ClinicID}
	argIdx := 2

	if params.IsActive != nil {
		conditions = append(conditions, fmt.Sprintf("is_active = $%d", argIdx))
		args = append(args, *params.IsActive)
		argIdx++
	}

	if params.Category != "" {
		conditions = append(conditions, fmt.Sprintf("category = $%d", argIdx))
		args = append(args, params.Category)
		argIdx++
	}

	if params.Difficulty != "" {
		conditions = append(conditions, fmt.Sprintf("difficulty = $%d", argIdx))
		args = append(args, params.Difficulty)
		argIdx++
	}

	if params.Search != "" {
		searchCondition := fmt.Sprintf(`(
			name ILIKE $%d
			OR name_vi ILIKE $%d
			OR description ILIKE $%d
			OR description_vi ILIKE $%d
		)`, argIdx, argIdx, argIdx, argIdx)
		conditions = append(conditions, searchCondition)
		args = append(args, "%"+params.Search+"%")
		argIdx++
	}

	if len(params.MuscleGroups) > 0 {
		muscleStrs := make([]string, len(params.MuscleGroups))
		for i, mg := range params.MuscleGroups {
			muscleStrs[i] = string(mg)
		}
		conditions = append(conditions, fmt.Sprintf("muscle_groups && $%d", argIdx))
		args = append(args, pq.Array(muscleStrs))
		argIdx++
	}

	if len(params.Equipment) > 0 {
		conditions = append(conditions, fmt.Sprintf("equipment && $%d", argIdx))
		args = append(args, pq.Array(params.Equipment))
		argIdx++
	}

	whereClause := strings.Join(conditions, " AND ")

	// Count total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM exercises WHERE %s", whereClause)
	var total int64
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count exercises: %w", err)
	}

	if total == 0 {
		return []model.Exercise{}, 0, nil
	}

	// Build ORDER BY
	orderBy := "name ASC"
	allowedSortFields := map[string]bool{
		"name":       true,
		"name_vi":    true,
		"category":   true,
		"difficulty": true,
		"created_at": true,
	}
	if params.SortBy != "" && allowedSortFields[params.SortBy] {
		order := "ASC"
		if strings.ToUpper(params.SortOrder) == "DESC" {
			order = "DESC"
		}
		orderBy = fmt.Sprintf("%s %s", params.SortBy, order)
	}

	query := fmt.Sprintf(`
		SELECT
			id, clinic_id, name, name_vi, description, description_vi,
			instructions, instructions_vi, category, difficulty,
			equipment, muscle_groups, image_url, video_url, thumbnail_url,
			default_sets, default_reps, default_hold_secs, default_duration_mins,
			precautions, precautions_vi, is_global, is_active,
			created_at, updated_at, created_by
		FROM exercises
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d`,
		whereClause, orderBy, argIdx, argIdx+1)

	args = append(args, params.Limit(), params.Offset())

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list exercises: %w", err)
	}
	defer rows.Close()

	exercises := make([]model.Exercise, 0)
	for rows.Next() {
		e, err := r.scanExerciseRows(rows)
		if err != nil {
			return nil, 0, err
		}
		exercises = append(exercises, *e)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating exercises: %w", err)
	}

	return exercises, total, nil
}

// scanExerciseRows scans an exercise from sql.Rows.
func (r *postgresExerciseRepo) scanExerciseRows(rows *sql.Rows) (*model.Exercise, error) {
	var e model.Exercise
	var clinicID, imageURL, videoURL, thumbnailURL, precautions, precautionsVi, createdBy sql.NullString
	var equipment []string
	var muscleGroups []string

	err := rows.Scan(
		&e.ID,
		&clinicID,
		&e.Name,
		&e.NameVi,
		&e.Description,
		&e.DescriptionVi,
		&e.Instructions,
		&e.InstructionsVi,
		&e.Category,
		&e.Difficulty,
		pq.Array(&equipment),
		pq.Array(&muscleGroups),
		&imageURL,
		&videoURL,
		&thumbnailURL,
		&e.DefaultSets,
		&e.DefaultReps,
		&e.DefaultHoldSecs,
		&e.DefaultDuration,
		&precautions,
		&precautionsVi,
		&e.IsGlobal,
		&e.IsActive,
		&e.CreatedAt,
		&e.UpdatedAt,
		&createdBy,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to scan exercise row: %w", err)
	}

	e.ClinicID = StringPtrFromNull(clinicID)
	e.ImageURL = StringFromNull(imageURL)
	e.VideoURL = StringFromNull(videoURL)
	e.ThumbnailURL = StringFromNull(thumbnailURL)
	e.Precautions = StringFromNull(precautions)
	e.PrecautionsVi = StringFromNull(precautionsVi)
	e.CreatedBy = StringPtrFromNull(createdBy)
	e.Equipment = equipment

	e.MuscleGroups = make([]model.MuscleGroup, len(muscleGroups))
	for i, mg := range muscleGroups {
		e.MuscleGroups[i] = model.MuscleGroup(mg)
	}

	return &e, nil
}

// Search performs a quick search for exercises.
func (r *postgresExerciseRepo) Search(ctx context.Context, clinicID, query string, limit int) ([]model.Exercise, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}

	searchQuery := `
		SELECT
			id, clinic_id, name, name_vi, description, description_vi,
			instructions, instructions_vi, category, difficulty,
			equipment, muscle_groups, image_url, video_url, thumbnail_url,
			default_sets, default_reps, default_hold_secs, default_duration_mins,
			precautions, precautions_vi, is_global, is_active,
			created_at, updated_at, created_by
		FROM exercises
		WHERE (is_global = true OR clinic_id = $1 OR clinic_id IS NULL)
			AND is_active = true
			AND (
				name ILIKE $2
				OR name_vi ILIKE $2
				OR description ILIKE $2
			)
		ORDER BY name ASC
		LIMIT $3`

	searchPattern := "%" + query + "%"
	rows, err := r.db.QueryContext(ctx, searchQuery, clinicID, searchPattern, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to search exercises: %w", err)
	}
	defer rows.Close()

	exercises := make([]model.Exercise, 0)
	for rows.Next() {
		e, err := r.scanExerciseRows(rows)
		if err != nil {
			return nil, err
		}
		exercises = append(exercises, *e)
	}

	return exercises, nil
}

// CreatePrescription creates a new exercise prescription.
func (r *postgresExerciseRepo) CreatePrescription(ctx context.Context, prescription *model.ExercisePrescription) error {
	query := `
		INSERT INTO exercise_prescriptions (
			id, patient_id, exercise_id, clinic_id, prescribed_by, program_id,
			sets, reps, hold_seconds, frequency, duration_weeks,
			custom_instructions, notes, status, start_date, end_date
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
		)
		RETURNING created_at, updated_at`

	err := r.db.QueryRowContext(ctx, query,
		prescription.ID,
		prescription.PatientID,
		prescription.ExerciseID,
		prescription.ClinicID,
		prescription.PrescribedBy,
		NullableString(prescription.ProgramID),
		prescription.Sets,
		prescription.Reps,
		prescription.HoldSeconds,
		prescription.Frequency,
		prescription.DurationWeeks,
		NullableStringValue(prescription.CustomInstructions),
		NullableStringValue(prescription.Notes),
		prescription.Status,
		prescription.StartDate,
		prescription.EndDate,
	).Scan(&prescription.CreatedAt, &prescription.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create prescription: %w", err)
	}

	return nil
}

// GetPrescriptionByID retrieves a prescription by ID.
func (r *postgresExerciseRepo) GetPrescriptionByID(ctx context.Context, id string) (*model.ExercisePrescription, error) {
	query := `
		SELECT
			p.id, p.patient_id, p.exercise_id, p.clinic_id, p.prescribed_by, p.program_id,
			p.sets, p.reps, p.hold_seconds, p.frequency, p.duration_weeks,
			p.custom_instructions, p.notes, p.status, p.start_date, p.end_date,
			p.created_at, p.updated_at,
			e.id, e.name, e.name_vi, e.description, e.description_vi,
			e.instructions, e.instructions_vi, e.category, e.difficulty,
			e.equipment, e.muscle_groups, e.image_url, e.video_url
		FROM exercise_prescriptions p
		JOIN exercises e ON e.id = p.exercise_id
		WHERE p.id = $1`

	var p model.ExercisePrescription
	var e model.Exercise
	var programID, customInstructions, notes sql.NullString
	var endDate sql.NullTime
	var imageURL, videoURL sql.NullString
	var equipment []string
	var muscleGroups []string

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&p.ID,
		&p.PatientID,
		&p.ExerciseID,
		&p.ClinicID,
		&p.PrescribedBy,
		&programID,
		&p.Sets,
		&p.Reps,
		&p.HoldSeconds,
		&p.Frequency,
		&p.DurationWeeks,
		&customInstructions,
		&notes,
		&p.Status,
		&p.StartDate,
		&endDate,
		&p.CreatedAt,
		&p.UpdatedAt,
		&e.ID,
		&e.Name,
		&e.NameVi,
		&e.Description,
		&e.DescriptionVi,
		&e.Instructions,
		&e.InstructionsVi,
		&e.Category,
		&e.Difficulty,
		pq.Array(&equipment),
		pq.Array(&muscleGroups),
		&imageURL,
		&videoURL,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get prescription: %w", err)
	}

	p.ProgramID = StringPtrFromNull(programID)
	p.CustomInstructions = StringFromNull(customInstructions)
	p.Notes = StringFromNull(notes)
	p.EndDate = TimePtrFromNull(endDate)

	e.Equipment = equipment
	e.MuscleGroups = make([]model.MuscleGroup, len(muscleGroups))
	for i, mg := range muscleGroups {
		e.MuscleGroups[i] = model.MuscleGroup(mg)
	}
	e.ImageURL = StringFromNull(imageURL)
	e.VideoURL = StringFromNull(videoURL)

	p.Exercise = &e

	return &p, nil
}

// UpdatePrescription updates an existing prescription.
func (r *postgresExerciseRepo) UpdatePrescription(ctx context.Context, prescription *model.ExercisePrescription) error {
	query := `
		UPDATE exercise_prescriptions SET
			sets = $1,
			reps = $2,
			hold_seconds = $3,
			frequency = $4,
			duration_weeks = $5,
			custom_instructions = $6,
			notes = $7,
			status = $8,
			end_date = $9
		WHERE id = $10
		RETURNING updated_at`

	result := r.db.QueryRowContext(ctx, query,
		prescription.Sets,
		prescription.Reps,
		prescription.HoldSeconds,
		prescription.Frequency,
		prescription.DurationWeeks,
		NullableStringValue(prescription.CustomInstructions),
		NullableStringValue(prescription.Notes),
		prescription.Status,
		prescription.EndDate,
		prescription.ID,
	)

	if err := result.Scan(&prescription.UpdatedAt); err != nil {
		if err == sql.ErrNoRows {
			return ErrNotFound
		}
		return fmt.Errorf("failed to update prescription: %w", err)
	}

	return nil
}

// DeletePrescription deletes a prescription.
func (r *postgresExerciseRepo) DeletePrescription(ctx context.Context, id string) error {
	query := `DELETE FROM exercise_prescriptions WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete prescription: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

// ListPatientPrescriptions lists all prescriptions for a patient.
func (r *postgresExerciseRepo) ListPatientPrescriptions(ctx context.Context, patientID string, activeOnly bool) ([]model.ExercisePrescription, error) {
	query := `
		SELECT
			p.id, p.patient_id, p.exercise_id, p.clinic_id, p.prescribed_by, p.program_id,
			p.sets, p.reps, p.hold_seconds, p.frequency, p.duration_weeks,
			p.custom_instructions, p.notes, p.status, p.start_date, p.end_date,
			p.created_at, p.updated_at,
			e.id, e.name, e.name_vi, e.description, e.description_vi,
			e.instructions, e.instructions_vi, e.category, e.difficulty,
			e.equipment, e.muscle_groups, e.image_url, e.video_url
		FROM exercise_prescriptions p
		JOIN exercises e ON e.id = p.exercise_id
		WHERE p.patient_id = $1`

	if activeOnly {
		query += " AND p.status = 'active'"
	}

	query += " ORDER BY p.created_at DESC"

	rows, err := r.db.QueryContext(ctx, query, patientID)
	if err != nil {
		return nil, fmt.Errorf("failed to list prescriptions: %w", err)
	}
	defer rows.Close()

	prescriptions := make([]model.ExercisePrescription, 0)
	for rows.Next() {
		var p model.ExercisePrescription
		var e model.Exercise
		var programID, customInstructions, notes sql.NullString
		var endDate sql.NullTime
		var imageURL, videoURL sql.NullString
		var equipment []string
		var muscleGroups []string

		err := rows.Scan(
			&p.ID,
			&p.PatientID,
			&p.ExerciseID,
			&p.ClinicID,
			&p.PrescribedBy,
			&programID,
			&p.Sets,
			&p.Reps,
			&p.HoldSeconds,
			&p.Frequency,
			&p.DurationWeeks,
			&customInstructions,
			&notes,
			&p.Status,
			&p.StartDate,
			&endDate,
			&p.CreatedAt,
			&p.UpdatedAt,
			&e.ID,
			&e.Name,
			&e.NameVi,
			&e.Description,
			&e.DescriptionVi,
			&e.Instructions,
			&e.InstructionsVi,
			&e.Category,
			&e.Difficulty,
			pq.Array(&equipment),
			pq.Array(&muscleGroups),
			&imageURL,
			&videoURL,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan prescription: %w", err)
		}

		p.ProgramID = StringPtrFromNull(programID)
		p.CustomInstructions = StringFromNull(customInstructions)
		p.Notes = StringFromNull(notes)
		p.EndDate = TimePtrFromNull(endDate)

		e.Equipment = equipment
		e.MuscleGroups = make([]model.MuscleGroup, len(muscleGroups))
		for i, mg := range muscleGroups {
			e.MuscleGroups[i] = model.MuscleGroup(mg)
		}
		e.ImageURL = StringFromNull(imageURL)
		e.VideoURL = StringFromNull(videoURL)

		p.Exercise = &e
		prescriptions = append(prescriptions, p)
	}

	return prescriptions, nil
}

// CreateProgram creates a new home exercise program.
func (r *postgresExerciseRepo) CreateProgram(ctx context.Context, program *model.HomeExerciseProgram) error {
	query := `
		INSERT INTO home_exercise_programs (
			id, patient_id, clinic_id, created_by, name, name_vi,
			description, description_vi, frequency, duration_weeks,
			start_date, end_date, is_active
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
		)
		RETURNING created_at, updated_at`

	err := r.db.QueryRowContext(ctx, query,
		program.ID,
		program.PatientID,
		program.ClinicID,
		program.CreatedBy,
		program.Name,
		NullableStringValue(program.NameVi),
		NullableStringValue(program.Description),
		NullableStringValue(program.DescriptionVi),
		program.Frequency,
		program.DurationWeeks,
		program.StartDate,
		program.EndDate,
		program.IsActive,
	).Scan(&program.CreatedAt, &program.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create program: %w", err)
	}

	return nil
}

// GetProgramByID retrieves a program by ID with its exercises.
func (r *postgresExerciseRepo) GetProgramByID(ctx context.Context, id string) (*model.HomeExerciseProgram, error) {
	query := `
		SELECT
			id, patient_id, clinic_id, created_by, name, name_vi,
			description, description_vi, frequency, duration_weeks,
			start_date, end_date, is_active, created_at, updated_at
		FROM home_exercise_programs
		WHERE id = $1`

	var p model.HomeExerciseProgram
	var nameVi, description, descriptionVi sql.NullString
	var endDate sql.NullTime

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&p.ID,
		&p.PatientID,
		&p.ClinicID,
		&p.CreatedBy,
		&p.Name,
		&nameVi,
		&description,
		&descriptionVi,
		&p.Frequency,
		&p.DurationWeeks,
		&p.StartDate,
		&endDate,
		&p.IsActive,
		&p.CreatedAt,
		&p.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get program: %w", err)
	}

	p.NameVi = StringFromNull(nameVi)
	p.Description = StringFromNull(description)
	p.DescriptionVi = StringFromNull(descriptionVi)
	p.EndDate = TimePtrFromNull(endDate)

	// Get associated prescriptions
	prescriptions, err := r.listProgramPrescriptions(ctx, id)
	if err != nil {
		log.Warn().Err(err).Str("program_id", id).Msg("failed to get program prescriptions")
	} else {
		p.Exercises = prescriptions
	}

	return &p, nil
}

// listProgramPrescriptions lists prescriptions for a program.
func (r *postgresExerciseRepo) listProgramPrescriptions(ctx context.Context, programID string) ([]model.ExercisePrescription, error) {
	query := `
		SELECT
			p.id, p.patient_id, p.exercise_id, p.clinic_id, p.prescribed_by, p.program_id,
			p.sets, p.reps, p.hold_seconds, p.frequency, p.duration_weeks,
			p.custom_instructions, p.notes, p.status, p.start_date, p.end_date,
			p.created_at, p.updated_at,
			e.id, e.name, e.name_vi, e.category, e.difficulty
		FROM exercise_prescriptions p
		JOIN exercises e ON e.id = p.exercise_id
		WHERE p.program_id = $1
		ORDER BY p.created_at ASC`

	rows, err := r.db.QueryContext(ctx, query, programID)
	if err != nil {
		return nil, fmt.Errorf("failed to list program prescriptions: %w", err)
	}
	defer rows.Close()

	prescriptions := make([]model.ExercisePrescription, 0)
	for rows.Next() {
		var p model.ExercisePrescription
		var e model.Exercise
		var pID, customInstructions, notes sql.NullString
		var endDate sql.NullTime

		err := rows.Scan(
			&p.ID,
			&p.PatientID,
			&p.ExerciseID,
			&p.ClinicID,
			&p.PrescribedBy,
			&pID,
			&p.Sets,
			&p.Reps,
			&p.HoldSeconds,
			&p.Frequency,
			&p.DurationWeeks,
			&customInstructions,
			&notes,
			&p.Status,
			&p.StartDate,
			&endDate,
			&p.CreatedAt,
			&p.UpdatedAt,
			&e.ID,
			&e.Name,
			&e.NameVi,
			&e.Category,
			&e.Difficulty,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan prescription: %w", err)
		}

		p.ProgramID = StringPtrFromNull(pID)
		p.CustomInstructions = StringFromNull(customInstructions)
		p.Notes = StringFromNull(notes)
		p.EndDate = TimePtrFromNull(endDate)
		p.Exercise = &e
		prescriptions = append(prescriptions, p)
	}

	return prescriptions, nil
}

// UpdateProgram updates an existing program.
func (r *postgresExerciseRepo) UpdateProgram(ctx context.Context, program *model.HomeExerciseProgram) error {
	query := `
		UPDATE home_exercise_programs SET
			name = $1,
			name_vi = $2,
			description = $3,
			description_vi = $4,
			frequency = $5,
			duration_weeks = $6,
			end_date = $7,
			is_active = $8
		WHERE id = $9
		RETURNING updated_at`

	result := r.db.QueryRowContext(ctx, query,
		program.Name,
		NullableStringValue(program.NameVi),
		NullableStringValue(program.Description),
		NullableStringValue(program.DescriptionVi),
		program.Frequency,
		program.DurationWeeks,
		program.EndDate,
		program.IsActive,
		program.ID,
	)

	if err := result.Scan(&program.UpdatedAt); err != nil {
		if err == sql.ErrNoRows {
			return ErrNotFound
		}
		return fmt.Errorf("failed to update program: %w", err)
	}

	return nil
}

// ListPatientPrograms lists all programs for a patient.
func (r *postgresExerciseRepo) ListPatientPrograms(ctx context.Context, patientID string) ([]model.HomeExerciseProgram, error) {
	query := `
		SELECT
			id, patient_id, clinic_id, created_by, name, name_vi,
			description, description_vi, frequency, duration_weeks,
			start_date, end_date, is_active, created_at, updated_at
		FROM home_exercise_programs
		WHERE patient_id = $1
		ORDER BY created_at DESC`

	rows, err := r.db.QueryContext(ctx, query, patientID)
	if err != nil {
		return nil, fmt.Errorf("failed to list programs: %w", err)
	}
	defer rows.Close()

	programs := make([]model.HomeExerciseProgram, 0)
	for rows.Next() {
		var p model.HomeExerciseProgram
		var nameVi, description, descriptionVi sql.NullString
		var endDate sql.NullTime

		err := rows.Scan(
			&p.ID,
			&p.PatientID,
			&p.ClinicID,
			&p.CreatedBy,
			&p.Name,
			&nameVi,
			&description,
			&descriptionVi,
			&p.Frequency,
			&p.DurationWeeks,
			&p.StartDate,
			&endDate,
			&p.IsActive,
			&p.CreatedAt,
			&p.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan program: %w", err)
		}

		p.NameVi = StringFromNull(nameVi)
		p.Description = StringFromNull(description)
		p.DescriptionVi = StringFromNull(descriptionVi)
		p.EndDate = TimePtrFromNull(endDate)

		programs = append(programs, p)
	}

	return programs, nil
}

// LogCompliance logs an exercise completion.
func (r *postgresExerciseRepo) LogCompliance(ctx context.Context, complianceLog *model.ExerciseComplianceLog) error {
	query := `
		INSERT INTO exercise_compliance_logs (
			id, prescription_id, patient_id, completed_at,
			sets_completed, reps_completed, pain_level, difficulty, notes
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9
		)
		RETURNING created_at`

	err := r.db.QueryRowContext(ctx, query,
		complianceLog.ID,
		complianceLog.PrescriptionID,
		complianceLog.PatientID,
		complianceLog.CompletedAt,
		complianceLog.SetsCompleted,
		complianceLog.RepsCompleted,
		complianceLog.PainLevel,
		NullableStringValue(complianceLog.Difficulty),
		NullableStringValue(complianceLog.Notes),
	).Scan(&complianceLog.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to log compliance: %w", err)
	}

	return nil
}

// GetComplianceLogs retrieves compliance logs for a prescription.
func (r *postgresExerciseRepo) GetComplianceLogs(ctx context.Context, prescriptionID string, limit int) ([]model.ExerciseComplianceLog, error) {
	if limit <= 0 {
		limit = 30
	}

	query := `
		SELECT
			id, prescription_id, patient_id, completed_at,
			sets_completed, reps_completed, pain_level, difficulty, notes, created_at
		FROM exercise_compliance_logs
		WHERE prescription_id = $1
		ORDER BY completed_at DESC
		LIMIT $2`

	rows, err := r.db.QueryContext(ctx, query, prescriptionID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get compliance logs: %w", err)
	}
	defer rows.Close()

	logs := make([]model.ExerciseComplianceLog, 0)
	for rows.Next() {
		var l model.ExerciseComplianceLog
		var painLevel sql.NullInt64
		var difficulty, notes sql.NullString

		err := rows.Scan(
			&l.ID,
			&l.PrescriptionID,
			&l.PatientID,
			&l.CompletedAt,
			&l.SetsCompleted,
			&l.RepsCompleted,
			&painLevel,
			&difficulty,
			&notes,
			&l.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan compliance log: %w", err)
		}

		if painLevel.Valid {
			pl := int(painLevel.Int64)
			l.PainLevel = &pl
		}
		l.Difficulty = StringFromNull(difficulty)
		l.Notes = StringFromNull(notes)

		logs = append(logs, l)
	}

	return logs, nil
}

// GetPatientComplianceSummary retrieves a compliance summary for a patient.
func (r *postgresExerciseRepo) GetPatientComplianceSummary(ctx context.Context, patientID string) (*model.PatientExerciseSummary, error) {
	query := `
		SELECT
			COUNT(*) as total_prescriptions,
			COUNT(*) FILTER (WHERE status = 'active') as active_prescriptions,
			COUNT(*) FILTER (WHERE status = 'completed') as completed_prescriptions,
			(
				SELECT COUNT(*) FROM exercise_compliance_logs
				WHERE patient_id = $1
			) as total_compliance_logs,
			(
				SELECT MAX(completed_at) FROM exercise_compliance_logs
				WHERE patient_id = $1
			) as last_activity
		FROM exercise_prescriptions
		WHERE patient_id = $1`

	var summary model.PatientExerciseSummary
	var lastActivity sql.NullTime

	err := r.db.QueryRowContext(ctx, query, patientID).Scan(
		&summary.TotalPrescriptions,
		&summary.ActivePrescriptions,
		&summary.CompletedPrescriptions,
		&summary.TotalComplianceLogs,
		&lastActivity,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get compliance summary: %w", err)
	}

	summary.PatientID = patientID
	summary.LastActivityDate = TimePtrFromNull(lastActivity)

	// Calculate compliance rate (simplified)
	if summary.TotalPrescriptions > 0 {
		// For now, use a simple ratio of logs to expected completions
		expectedLogs := summary.ActivePrescriptions * 7 // Assume weekly over 7 days
		if expectedLogs > 0 {
			summary.ComplianceRate = float64(summary.TotalComplianceLogs) / float64(expectedLogs)
			if summary.ComplianceRate > 1.0 {
				summary.ComplianceRate = 1.0
			}
		}
	}

	return &summary, nil
}

// mockExerciseRepo provides a mock implementation for development.
type mockExerciseRepo struct{}

// NewMockExerciseRepository creates a mock exercise repository.
func NewMockExerciseRepository() ExerciseRepository {
	return &mockExerciseRepo{}
}

func (r *mockExerciseRepo) Create(ctx context.Context, exercise *model.Exercise) error {
	return nil
}

func (r *mockExerciseRepo) GetByID(ctx context.Context, id string) (*model.Exercise, error) {
	return nil, ErrNotFound
}

func (r *mockExerciseRepo) Update(ctx context.Context, exercise *model.Exercise) error {
	return nil
}

func (r *mockExerciseRepo) Delete(ctx context.Context, id string) error {
	return nil
}

func (r *mockExerciseRepo) List(ctx context.Context, params model.ExerciseSearchParams) ([]model.Exercise, int64, error) {
	return []model.Exercise{}, 0, nil
}

func (r *mockExerciseRepo) Search(ctx context.Context, clinicID, query string, limit int) ([]model.Exercise, error) {
	return []model.Exercise{}, nil
}

func (r *mockExerciseRepo) CreatePrescription(ctx context.Context, prescription *model.ExercisePrescription) error {
	return nil
}

func (r *mockExerciseRepo) GetPrescriptionByID(ctx context.Context, id string) (*model.ExercisePrescription, error) {
	return nil, ErrNotFound
}

func (r *mockExerciseRepo) UpdatePrescription(ctx context.Context, prescription *model.ExercisePrescription) error {
	return nil
}

func (r *mockExerciseRepo) DeletePrescription(ctx context.Context, id string) error {
	return nil
}

func (r *mockExerciseRepo) ListPatientPrescriptions(ctx context.Context, patientID string, activeOnly bool) ([]model.ExercisePrescription, error) {
	return []model.ExercisePrescription{}, nil
}

func (r *mockExerciseRepo) CreateProgram(ctx context.Context, program *model.HomeExerciseProgram) error {
	return nil
}

func (r *mockExerciseRepo) GetProgramByID(ctx context.Context, id string) (*model.HomeExerciseProgram, error) {
	return nil, ErrNotFound
}

func (r *mockExerciseRepo) UpdateProgram(ctx context.Context, program *model.HomeExerciseProgram) error {
	return nil
}

func (r *mockExerciseRepo) ListPatientPrograms(ctx context.Context, patientID string) ([]model.HomeExerciseProgram, error) {
	return []model.HomeExerciseProgram{}, nil
}

func (r *mockExerciseRepo) LogCompliance(ctx context.Context, log *model.ExerciseComplianceLog) error {
	return nil
}

func (r *mockExerciseRepo) GetComplianceLogs(ctx context.Context, prescriptionID string, limit int) ([]model.ExerciseComplianceLog, error) {
	return []model.ExerciseComplianceLog{}, nil
}

func (r *mockExerciseRepo) GetPatientComplianceSummary(ctx context.Context, patientID string) (*model.PatientExerciseSummary, error) {
	return &model.PatientExerciseSummary{PatientID: patientID}, nil
}
