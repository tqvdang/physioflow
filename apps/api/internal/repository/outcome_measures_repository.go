package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// OutcomeMeasuresRepository defines the interface for outcome measure data access.
type OutcomeMeasuresRepository interface {
	// Measures
	Create(ctx context.Context, measure *model.OutcomeMeasure) error
	Update(ctx context.Context, measure *model.OutcomeMeasure) error
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*model.OutcomeMeasure, error)
	GetByPatientID(ctx context.Context, patientID string) ([]*model.OutcomeMeasure, error)
	GetByPatientAndType(ctx context.Context, patientID string, measureType model.MeasureType) ([]*model.OutcomeMeasure, error)

	// Trending
	GetTrending(ctx context.Context, patientID string, measureType model.MeasureType) (*model.TrendingData, error)

	// Library
	GetLibrary(ctx context.Context) ([]*model.OutcomeMeasureLibrary, error)
	GetLibraryByType(ctx context.Context, measureType model.MeasureType) (*model.OutcomeMeasureLibrary, error)
	GetLibraryByID(ctx context.Context, id string) (*model.OutcomeMeasureLibrary, error)
}

// postgresOutcomeMeasuresRepo implements OutcomeMeasuresRepository with PostgreSQL.
type postgresOutcomeMeasuresRepo struct {
	db *DB
}

// NewOutcomeMeasuresRepository creates a new PostgreSQL outcome measures repository.
func NewOutcomeMeasuresRepository(db *DB) OutcomeMeasuresRepository {
	return &postgresOutcomeMeasuresRepo{db: db}
}

// Create inserts a new outcome measure record.
func (r *postgresOutcomeMeasuresRepo) Create(ctx context.Context, measure *model.OutcomeMeasure) error {
	responsesJSON, err := json.Marshal(measure.Responses)
	if err != nil {
		return fmt.Errorf("failed to marshal responses: %w", err)
	}

	var interpretJSON []byte
	if measure.Interpretation != nil {
		interpretJSON, err = json.Marshal(measure.Interpretation)
		if err != nil {
			return fmt.Errorf("failed to marshal interpretation: %w", err)
		}
	}

	query := `
		INSERT INTO outcome_measures (
			id, patient_id, clinic_id, therapist_id, library_id,
			measure_type, session_id, score, max_possible, percentage,
			responses, interpretation, notes, measured_at, created_by, updated_by
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
			$11, $12, $13, $14, $15, $16
		)
		RETURNING created_at, updated_at`

	err = r.db.QueryRowContext(ctx, query,
		measure.ID,
		measure.PatientID,
		measure.ClinicID,
		measure.TherapistID,
		measure.LibraryID,
		measure.MeasureType,
		NullableString(measure.SessionID),
		measure.Score,
		measure.MaxPossible,
		measure.Percentage,
		responsesJSON,
		interpretJSON,
		NullableStringValue(measure.Notes),
		measure.MeasuredAt,
		NullableString(measure.CreatedBy),
		NullableString(measure.UpdatedBy),
	).Scan(&measure.CreatedAt, &measure.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create outcome measure: %w", err)
	}

	return nil
}

// Update updates an existing outcome measure record.
func (r *postgresOutcomeMeasuresRepo) Update(ctx context.Context, measure *model.OutcomeMeasure) error {
	responsesJSON, err := json.Marshal(measure.Responses)
	if err != nil {
		return fmt.Errorf("failed to marshal responses: %w", err)
	}

	var interpretJSON []byte
	if measure.Interpretation != nil {
		interpretJSON, err = json.Marshal(measure.Interpretation)
		if err != nil {
			return fmt.Errorf("failed to marshal interpretation: %w", err)
		}
	}

	query := `
		UPDATE outcome_measures SET
			score = $1,
			max_possible = $2,
			percentage = $3,
			responses = $4,
			interpretation = $5,
			notes = $6,
			measured_at = $7,
			updated_by = $8,
			updated_at = NOW()
		WHERE id = $9
		RETURNING updated_at`

	err = r.db.QueryRowContext(ctx, query,
		measure.Score,
		measure.MaxPossible,
		measure.Percentage,
		responsesJSON,
		interpretJSON,
		NullableStringValue(measure.Notes),
		measure.MeasuredAt,
		NullableString(measure.UpdatedBy),
		measure.ID,
	).Scan(&measure.UpdatedAt)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("failed to update outcome measure: %w", err)
	}

	return nil
}

// Delete removes an outcome measure record.
func (r *postgresOutcomeMeasuresRepo) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM outcome_measures WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete outcome measure: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return ErrNotFound
	}

	return nil
}

// GetByID retrieves an outcome measure by ID.
func (r *postgresOutcomeMeasuresRepo) GetByID(ctx context.Context, id string) (*model.OutcomeMeasure, error) {
	query := `
		SELECT
			om.id, om.patient_id, om.clinic_id, om.therapist_id, om.library_id,
			om.measure_type, om.session_id, om.score, om.max_possible, om.percentage,
			om.responses, om.interpretation, om.notes, om.measured_at,
			om.created_at, om.updated_at, om.created_by, om.updated_by,
			oml.id, oml.code, oml.name, oml.name_vi, oml.min_score, oml.max_score,
			oml.higher_is_better, oml.mcid
		FROM outcome_measures om
		LEFT JOIN outcome_measure_library oml ON oml.id = om.library_id
		WHERE om.id = $1`

	return r.scanMeasure(r.db.QueryRowContext(ctx, query, id))
}

// scanMeasure scans a single outcome measure row.
func (r *postgresOutcomeMeasuresRepo) scanMeasure(row *sql.Row) (*model.OutcomeMeasure, error) {
	var m model.OutcomeMeasure
	var lib model.OutcomeMeasureLibrary
	var sessionID, notes, createdBy, updatedBy sql.NullString
	var percentage sql.NullFloat64
	var responsesJSON, interpretJSON []byte
	var libID, libCode, libName, libNameVi sql.NullString
	var libMinScore, libMaxScore sql.NullFloat64
	var libHigherIsBetter sql.NullBool
	var libMCID sql.NullFloat64

	err := row.Scan(
		&m.ID,
		&m.PatientID,
		&m.ClinicID,
		&m.TherapistID,
		&m.LibraryID,
		&m.MeasureType,
		&sessionID,
		&m.Score,
		&m.MaxPossible,
		&percentage,
		&responsesJSON,
		&interpretJSON,
		&notes,
		&m.MeasuredAt,
		&m.CreatedAt,
		&m.UpdatedAt,
		&createdBy,
		&updatedBy,
		&libID,
		&libCode,
		&libName,
		&libNameVi,
		&libMinScore,
		&libMaxScore,
		&libHigherIsBetter,
		&libMCID,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan outcome measure: %w", err)
	}

	m.SessionID = StringPtrFromNull(sessionID)
	m.Notes = StringFromNull(notes)
	m.CreatedBy = StringPtrFromNull(createdBy)
	m.UpdatedBy = StringPtrFromNull(updatedBy)

	if percentage.Valid {
		m.Percentage = &percentage.Float64
	}

	if len(responsesJSON) > 0 {
		if err := json.Unmarshal(responsesJSON, &m.Responses); err != nil {
			log.Warn().Err(err).Str("measure_id", m.ID).Msg("failed to unmarshal responses")
		}
	}

	if len(interpretJSON) > 0 {
		var interp model.MeasureInterpretation
		if err := json.Unmarshal(interpretJSON, &interp); err != nil {
			log.Warn().Err(err).Str("measure_id", m.ID).Msg("failed to unmarshal interpretation")
		} else {
			m.Interpretation = &interp
		}
	}

	if libID.Valid {
		lib.ID = libID.String
		lib.Code = StringFromNull(libCode)
		lib.Name = StringFromNull(libName)
		lib.NameVi = StringFromNull(libNameVi)
		if libMinScore.Valid {
			lib.MinScore = libMinScore.Float64
		}
		if libMaxScore.Valid {
			lib.MaxScore = libMaxScore.Float64
		}
		if libHigherIsBetter.Valid {
			lib.HigherIsBetter = libHigherIsBetter.Bool
		}
		if libMCID.Valid {
			lib.MCID = &libMCID.Float64
		}
		m.Library = &lib
	}

	return &m, nil
}

// GetByPatientID retrieves all outcome measures for a patient.
func (r *postgresOutcomeMeasuresRepo) GetByPatientID(ctx context.Context, patientID string) ([]*model.OutcomeMeasure, error) {
	query := `
		SELECT
			om.id, om.patient_id, om.clinic_id, om.therapist_id, om.library_id,
			om.measure_type, om.session_id, om.score, om.max_possible, om.percentage,
			om.responses, om.interpretation, om.notes, om.measured_at,
			om.created_at, om.updated_at, om.created_by, om.updated_by,
			oml.id, oml.code, oml.name, oml.name_vi, oml.min_score, oml.max_score,
			oml.higher_is_better, oml.mcid
		FROM outcome_measures om
		LEFT JOIN outcome_measure_library oml ON oml.id = om.library_id
		WHERE om.patient_id = $1
		ORDER BY om.measured_at DESC`

	return r.scanMeasures(ctx, query, patientID)
}

// GetByPatientAndType retrieves outcome measures for a patient filtered by type.
func (r *postgresOutcomeMeasuresRepo) GetByPatientAndType(ctx context.Context, patientID string, measureType model.MeasureType) ([]*model.OutcomeMeasure, error) {
	query := `
		SELECT
			om.id, om.patient_id, om.clinic_id, om.therapist_id, om.library_id,
			om.measure_type, om.session_id, om.score, om.max_possible, om.percentage,
			om.responses, om.interpretation, om.notes, om.measured_at,
			om.created_at, om.updated_at, om.created_by, om.updated_by,
			oml.id, oml.code, oml.name, oml.name_vi, oml.min_score, oml.max_score,
			oml.higher_is_better, oml.mcid
		FROM outcome_measures om
		LEFT JOIN outcome_measure_library oml ON oml.id = om.library_id
		WHERE om.patient_id = $1 AND om.measure_type = $2
		ORDER BY om.measured_at ASC`

	return r.scanMeasures(ctx, query, patientID, measureType)
}

// scanMeasures scans multiple outcome measure rows.
func (r *postgresOutcomeMeasuresRepo) scanMeasures(ctx context.Context, query string, args ...interface{}) ([]*model.OutcomeMeasure, error) {
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query outcome measures: %w", err)
	}
	defer rows.Close()

	measures := make([]*model.OutcomeMeasure, 0)
	for rows.Next() {
		var m model.OutcomeMeasure
		var lib model.OutcomeMeasureLibrary
		var sessionID, notes, createdBy, updatedBy sql.NullString
		var percentage sql.NullFloat64
		var responsesJSON, interpretJSON []byte
		var libID, libCode, libName, libNameVi sql.NullString
		var libMinScore, libMaxScore sql.NullFloat64
		var libHigherIsBetter sql.NullBool
		var libMCID sql.NullFloat64

		err := rows.Scan(
			&m.ID,
			&m.PatientID,
			&m.ClinicID,
			&m.TherapistID,
			&m.LibraryID,
			&m.MeasureType,
			&sessionID,
			&m.Score,
			&m.MaxPossible,
			&percentage,
			&responsesJSON,
			&interpretJSON,
			&notes,
			&m.MeasuredAt,
			&m.CreatedAt,
			&m.UpdatedAt,
			&createdBy,
			&updatedBy,
			&libID,
			&libCode,
			&libName,
			&libNameVi,
			&libMinScore,
			&libMaxScore,
			&libHigherIsBetter,
			&libMCID,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan outcome measure row: %w", err)
		}

		m.SessionID = StringPtrFromNull(sessionID)
		m.Notes = StringFromNull(notes)
		m.CreatedBy = StringPtrFromNull(createdBy)
		m.UpdatedBy = StringPtrFromNull(updatedBy)

		if percentage.Valid {
			m.Percentage = &percentage.Float64
		}

		if len(responsesJSON) > 0 {
			if jsonErr := json.Unmarshal(responsesJSON, &m.Responses); jsonErr != nil {
				log.Warn().Err(jsonErr).Str("measure_id", m.ID).Msg("failed to unmarshal responses")
			}
		}

		if len(interpretJSON) > 0 {
			var interp model.MeasureInterpretation
			if jsonErr := json.Unmarshal(interpretJSON, &interp); jsonErr != nil {
				log.Warn().Err(jsonErr).Str("measure_id", m.ID).Msg("failed to unmarshal interpretation")
			} else {
				m.Interpretation = &interp
			}
		}

		if libID.Valid {
			lib.ID = libID.String
			lib.Code = StringFromNull(libCode)
			lib.Name = StringFromNull(libName)
			lib.NameVi = StringFromNull(libNameVi)
			if libMinScore.Valid {
				lib.MinScore = libMinScore.Float64
			}
			if libMaxScore.Valid {
				lib.MaxScore = libMaxScore.Float64
			}
			if libHigherIsBetter.Valid {
				lib.HigherIsBetter = libHigherIsBetter.Bool
			}
			if libMCID.Valid {
				lib.MCID = &libMCID.Float64
			}
			m.Library = &lib
		}

		measures = append(measures, &m)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating outcome measures: %w", err)
	}

	return measures, nil
}

// GetTrending retrieves trending data for a patient and measure type.
func (r *postgresOutcomeMeasuresRepo) GetTrending(ctx context.Context, patientID string, measureType model.MeasureType) (*model.TrendingData, error) {
	// Get all measures for this patient and type, ordered chronologically
	measures, err := r.GetByPatientAndType(ctx, patientID, measureType)
	if err != nil {
		return nil, err
	}

	if len(measures) == 0 {
		return nil, ErrNotFound
	}

	// Get library info from the first measure
	var libraryID, measureName, measureNameVi string
	var mcid *float64
	if measures[0].Library != nil {
		libraryID = measures[0].Library.ID
		measureName = measures[0].Library.Name
		measureNameVi = measures[0].Library.NameVi
		mcid = measures[0].Library.MCID
	}

	dataPoints := make([]model.TrendDataPoint, len(measures))
	for i, m := range measures {
		dataPoints[i] = model.TrendDataPoint{
			Score:      m.Score,
			Percentage: m.Percentage,
			MeasuredAt: m.MeasuredAt,
			SessionID:  m.SessionID,
			Notes:      m.Notes,
		}
	}

	// Determine baseline and trend direction
	var baseline *float64
	trend := model.TrendInsuffData
	if len(measures) >= 1 {
		b := measures[0].Score
		baseline = &b
	}
	if len(measures) >= 2 {
		first := measures[0].Score
		last := measures[len(measures)-1].Score
		diff := last - first

		// Check library for higher_is_better
		higherIsBetter := true
		if measures[0].Library != nil {
			higherIsBetter = measures[0].Library.HigherIsBetter
		}

		if higherIsBetter {
			if diff > 0 {
				trend = model.TrendImproved
			} else if diff < 0 {
				trend = model.TrendDeclined
			} else {
				trend = model.TrendStable
			}
		} else {
			// For pain scales where lower is better
			if diff < 0 {
				trend = model.TrendImproved
			} else if diff > 0 {
				trend = model.TrendDeclined
			} else {
				trend = model.TrendStable
			}
		}
	}

	return &model.TrendingData{
		PatientID:     patientID,
		MeasureType:   measureType,
		LibraryID:     libraryID,
		MeasureName:   measureName,
		MeasureNameVi: measureNameVi,
		DataPoints:    dataPoints,
		Baseline:      baseline,
		MCID:          mcid,
		Trend:         trend,
	}, nil
}

// GetLibrary retrieves all active outcome measure library entries.
func (r *postgresOutcomeMeasuresRepo) GetLibrary(ctx context.Context) ([]*model.OutcomeMeasureLibrary, error) {
	query := `
		SELECT
			id, clinic_id, code, measure_type, category,
			name, name_vi, description, description_vi,
			instructions, instructions_vi,
			min_score, max_score, higher_is_better,
			mcid, mdc, questions, scoring_method,
			body_region, is_global, is_active,
			created_at, updated_at, created_by
		FROM outcome_measure_library
		WHERE is_active = true
		ORDER BY category, name`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query outcome measure library: %w", err)
	}
	defer rows.Close()

	libraries := make([]*model.OutcomeMeasureLibrary, 0)
	for rows.Next() {
		lib, err := r.scanLibraryRow(rows)
		if err != nil {
			return nil, err
		}
		libraries = append(libraries, lib)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating outcome measure library: %w", err)
	}

	return libraries, nil
}

// GetLibraryByType retrieves an outcome measure library entry by type.
func (r *postgresOutcomeMeasuresRepo) GetLibraryByType(ctx context.Context, measureType model.MeasureType) (*model.OutcomeMeasureLibrary, error) {
	query := `
		SELECT
			id, clinic_id, code, measure_type, category,
			name, name_vi, description, description_vi,
			instructions, instructions_vi,
			min_score, max_score, higher_is_better,
			mcid, mdc, questions, scoring_method,
			body_region, is_global, is_active,
			created_at, updated_at, created_by
		FROM outcome_measure_library
		WHERE measure_type = $1 AND is_active = true
		LIMIT 1`

	rows, err := r.db.QueryContext(ctx, query, measureType)
	if err != nil {
		return nil, fmt.Errorf("failed to query outcome measure library by type: %w", err)
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, ErrNotFound
	}

	return r.scanLibraryRow(rows)
}

// GetLibraryByID retrieves an outcome measure library entry by ID.
func (r *postgresOutcomeMeasuresRepo) GetLibraryByID(ctx context.Context, id string) (*model.OutcomeMeasureLibrary, error) {
	query := `
		SELECT
			id, clinic_id, code, measure_type, category,
			name, name_vi, description, description_vi,
			instructions, instructions_vi,
			min_score, max_score, higher_is_better,
			mcid, mdc, questions, scoring_method,
			body_region, is_global, is_active,
			created_at, updated_at, created_by
		FROM outcome_measure_library
		WHERE id = $1`

	rows, err := r.db.QueryContext(ctx, query, id)
	if err != nil {
		return nil, fmt.Errorf("failed to query outcome measure library by ID: %w", err)
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, ErrNotFound
	}

	return r.scanLibraryRow(rows)
}

// scanLibraryRow scans a single outcome measure library row from sql.Rows.
func (r *postgresOutcomeMeasuresRepo) scanLibraryRow(rows *sql.Rows) (*model.OutcomeMeasureLibrary, error) {
	var lib model.OutcomeMeasureLibrary
	var clinicID, description, descriptionVi, instructions, instructionsVi sql.NullString
	var bodyRegion, createdBy sql.NullString
	var mcid, mdc sql.NullFloat64
	var questionsJSON, scoringJSON []byte

	err := rows.Scan(
		&lib.ID,
		&clinicID,
		&lib.Code,
		&lib.MeasureType,
		&lib.Category,
		&lib.Name,
		&lib.NameVi,
		&description,
		&descriptionVi,
		&instructions,
		&instructionsVi,
		&lib.MinScore,
		&lib.MaxScore,
		&lib.HigherIsBetter,
		&mcid,
		&mdc,
		&questionsJSON,
		&scoringJSON,
		&bodyRegion,
		&lib.IsGlobal,
		&lib.IsActive,
		&lib.CreatedAt,
		&lib.UpdatedAt,
		&createdBy,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to scan library row: %w", err)
	}

	lib.ClinicID = StringPtrFromNull(clinicID)
	lib.Description = StringFromNull(description)
	lib.DescriptionVi = StringFromNull(descriptionVi)
	lib.Instructions = StringFromNull(instructions)
	lib.InstructionsVi = StringFromNull(instructionsVi)
	lib.BodyRegion = StringPtrFromNull(bodyRegion)
	lib.CreatedBy = StringPtrFromNull(createdBy)

	if mcid.Valid {
		lib.MCID = &mcid.Float64
	}
	if mdc.Valid {
		lib.MDC = &mdc.Float64
	}

	if len(questionsJSON) > 0 {
		if jsonErr := json.Unmarshal(questionsJSON, &lib.Questions); jsonErr != nil {
			log.Warn().Err(jsonErr).Str("library_id", lib.ID).Msg("failed to unmarshal questions")
		}
	}

	if len(scoringJSON) > 0 {
		var scoring model.ScoringMethod
		if jsonErr := json.Unmarshal(scoringJSON, &scoring); jsonErr != nil {
			log.Warn().Err(jsonErr).Str("library_id", lib.ID).Msg("failed to unmarshal scoring method")
		} else {
			lib.ScoringMethod = &scoring
		}
	}

	return &lib, nil
}

// mockOutcomeMeasuresRepo provides a mock implementation for development.
type mockOutcomeMeasuresRepo struct{}

// NewMockOutcomeMeasuresRepository creates a mock outcome measures repository.
func NewMockOutcomeMeasuresRepository() OutcomeMeasuresRepository {
	return &mockOutcomeMeasuresRepo{}
}

func (r *mockOutcomeMeasuresRepo) Create(ctx context.Context, measure *model.OutcomeMeasure) error {
	return nil
}

func (r *mockOutcomeMeasuresRepo) Update(ctx context.Context, measure *model.OutcomeMeasure) error {
	return nil
}

func (r *mockOutcomeMeasuresRepo) Delete(ctx context.Context, id string) error {
	return nil
}

func (r *mockOutcomeMeasuresRepo) GetByID(ctx context.Context, id string) (*model.OutcomeMeasure, error) {
	return nil, ErrNotFound
}

func (r *mockOutcomeMeasuresRepo) GetByPatientID(ctx context.Context, patientID string) ([]*model.OutcomeMeasure, error) {
	return []*model.OutcomeMeasure{}, nil
}

func (r *mockOutcomeMeasuresRepo) GetByPatientAndType(ctx context.Context, patientID string, measureType model.MeasureType) ([]*model.OutcomeMeasure, error) {
	return []*model.OutcomeMeasure{}, nil
}

func (r *mockOutcomeMeasuresRepo) GetTrending(ctx context.Context, patientID string, measureType model.MeasureType) (*model.TrendingData, error) {
	return nil, ErrNotFound
}

func (r *mockOutcomeMeasuresRepo) GetLibrary(ctx context.Context) ([]*model.OutcomeMeasureLibrary, error) {
	return []*model.OutcomeMeasureLibrary{}, nil
}

func (r *mockOutcomeMeasuresRepo) GetLibraryByType(ctx context.Context, measureType model.MeasureType) (*model.OutcomeMeasureLibrary, error) {
	return nil, ErrNotFound
}

func (r *mockOutcomeMeasuresRepo) GetLibraryByID(ctx context.Context, id string) (*model.OutcomeMeasureLibrary, error) {
	return nil, ErrNotFound
}
