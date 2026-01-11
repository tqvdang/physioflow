package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/tqvdang/physioflow/apps/api/internal/config"
	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// Note: Quick actions repository uses DB type from postgres.go

// QuickActionsRepository defines the interface for quick action data access.
type QuickActionsRepository interface {
	// Pain records
	CreatePainRecord(ctx context.Context, record model.QuickPainRecord) (string, error)
	GetLastPainRecord(ctx context.Context, patientID string) (*model.QuickPainRecord, error)
	GetPainHistory(ctx context.Context, patientID string, limit int) ([]model.QuickPainRecord, error)

	// ROM records
	CreateROMRecord(ctx context.Context, record model.QuickROMRecord) (string, error)
	GetLastROMRecord(ctx context.Context, patientID, joint, movement, side string) (*model.QuickROMRecord, error)
	GetROMHistory(ctx context.Context, patientID, joint string, limit int) ([]model.QuickROMRecord, error)

	// Appointments
	CreateAppointment(ctx context.Context, req model.QuickScheduleRequest) (string, error)
	CheckTimeSlotAvailable(ctx context.Context, clinicID, therapistID, date, timeSlot string, duration int) (bool, error)
}

// quickActionsRepo implements QuickActionsRepository.
type quickActionsRepo struct {
	cfg *config.Config
	db  *DB
}

// newQuickActionsRepo creates a new quick actions repository.
func newQuickActionsRepo(cfg *config.Config, db *DB) *quickActionsRepo {
	return &quickActionsRepo{cfg: cfg, db: db}
}

// CreatePainRecord creates a new pain record.
func (r *quickActionsRepo) CreatePainRecord(ctx context.Context, record model.QuickPainRecord) (string, error) {
	id := uuid.New().String()

	query := `
		INSERT INTO quick_pain_records (
			id, patient_id, clinic_id, therapist_id, level,
			location, body_region, notes, context, recorded_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	_, err := r.db.ExecContext(ctx, query,
		id, record.PatientID, record.ClinicID, record.TherapistID, record.Level,
		record.Location, record.BodyRegion, record.Notes, record.Context, record.RecordedAt,
	)
	if err != nil {
		return "", fmt.Errorf("failed to create pain record: %w", err)
	}

	return id, nil
}

// GetLastPainRecord retrieves the most recent pain record for a patient.
func (r *quickActionsRepo) GetLastPainRecord(ctx context.Context, patientID string) (*model.QuickPainRecord, error) {
	query := `
		SELECT id, patient_id, clinic_id, therapist_id, level,
			   location, body_region, notes, context, recorded_at
		FROM quick_pain_records
		WHERE patient_id = $1
		ORDER BY recorded_at DESC
		LIMIT 1
	`

	var record model.QuickPainRecord
	var location, bodyRegion, notes, context sql.NullString

	err := r.db.QueryRowContext(ctx, query, patientID).Scan(
		&record.PatientID, &record.PatientID, &record.ClinicID, &record.TherapistID, &record.Level,
		&location, &bodyRegion, &notes, &context, &record.RecordedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get last pain record: %w", err)
	}

	if location.Valid {
		record.Location = location.String
	}
	if bodyRegion.Valid {
		record.BodyRegion = bodyRegion.String
	}
	if notes.Valid {
		record.Notes = notes.String
	}
	if context.Valid {
		record.Context = context.String
	}

	return &record, nil
}

// GetPainHistory retrieves recent pain records.
func (r *quickActionsRepo) GetPainHistory(ctx context.Context, patientID string, limit int) ([]model.QuickPainRecord, error) {
	query := `
		SELECT id, patient_id, clinic_id, therapist_id, level,
			   location, body_region, notes, context, recorded_at
		FROM quick_pain_records
		WHERE patient_id = $1
		ORDER BY recorded_at DESC
		LIMIT $2
	`

	rows, err := r.db.QueryContext(ctx, query, patientID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get pain history: %w", err)
	}
	defer rows.Close()

	var records []model.QuickPainRecord
	for rows.Next() {
		var record model.QuickPainRecord
		var id string
		var location, bodyRegion, notes, context sql.NullString

		if err := rows.Scan(
			&id, &record.PatientID, &record.ClinicID, &record.TherapistID, &record.Level,
			&location, &bodyRegion, &notes, &context, &record.RecordedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan pain record: %w", err)
		}

		if location.Valid {
			record.Location = location.String
		}
		if bodyRegion.Valid {
			record.BodyRegion = bodyRegion.String
		}
		if notes.Valid {
			record.Notes = notes.String
		}
		if context.Valid {
			record.Context = context.String
		}

		records = append(records, record)
	}

	return records, nil
}

// CreateROMRecord creates a new ROM record.
func (r *quickActionsRepo) CreateROMRecord(ctx context.Context, record model.QuickROMRecord) (string, error) {
	id := uuid.New().String()

	query := `
		INSERT INTO quick_rom_records (
			id, patient_id, clinic_id, therapist_id, joint, movement,
			side, active_rom, passive_rom, is_painful, notes, recorded_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`

	_, err := r.db.ExecContext(ctx, query,
		id, record.PatientID, record.ClinicID, record.TherapistID, record.Joint, record.Movement,
		record.Side, record.ActiveROM, record.PassiveROM, record.IsPainful, record.Notes, record.RecordedAt,
	)
	if err != nil {
		return "", fmt.Errorf("failed to create ROM record: %w", err)
	}

	return id, nil
}

// GetLastROMRecord retrieves the most recent ROM record for a specific joint/movement.
func (r *quickActionsRepo) GetLastROMRecord(ctx context.Context, patientID, joint, movement, side string) (*model.QuickROMRecord, error) {
	query := `
		SELECT id, patient_id, clinic_id, therapist_id, joint, movement,
			   side, active_rom, passive_rom, is_painful, notes, recorded_at
		FROM quick_rom_records
		WHERE patient_id = $1 AND joint = $2 AND movement = $3
		  AND (side = $4 OR ($4 = '' AND side IS NULL))
		ORDER BY recorded_at DESC
		LIMIT 1
	`

	var record model.QuickROMRecord
	var id string
	var sideVal, notes sql.NullString
	var activeROM, passiveROM sql.NullFloat64

	err := r.db.QueryRowContext(ctx, query, patientID, joint, movement, side).Scan(
		&id, &record.PatientID, &record.ClinicID, &record.TherapistID, &record.Joint, &record.Movement,
		&sideVal, &activeROM, &passiveROM, &record.IsPainful, &notes, &record.RecordedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get last ROM record: %w", err)
	}

	if sideVal.Valid {
		record.Side = sideVal.String
	}
	if activeROM.Valid {
		record.ActiveROM = &activeROM.Float64
	}
	if passiveROM.Valid {
		record.PassiveROM = &passiveROM.Float64
	}
	if notes.Valid {
		record.Notes = notes.String
	}

	return &record, nil
}

// GetROMHistory retrieves recent ROM records.
func (r *quickActionsRepo) GetROMHistory(ctx context.Context, patientID, joint string, limit int) ([]model.QuickROMRecord, error) {
	query := `
		SELECT id, patient_id, clinic_id, therapist_id, joint, movement,
			   side, active_rom, passive_rom, is_painful, notes, recorded_at
		FROM quick_rom_records
		WHERE patient_id = $1
	`
	args := []interface{}{patientID}

	if joint != "" {
		query += " AND joint = $2"
		args = append(args, joint)
		query += fmt.Sprintf(" ORDER BY recorded_at DESC LIMIT $%d", len(args)+1)
		args = append(args, limit)
	} else {
		query += " ORDER BY recorded_at DESC LIMIT $2"
		args = append(args, limit)
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get ROM history: %w", err)
	}
	defer rows.Close()

	var records []model.QuickROMRecord
	for rows.Next() {
		var record model.QuickROMRecord
		var id string
		var sideVal, notes sql.NullString
		var activeROM, passiveROM sql.NullFloat64

		if err := rows.Scan(
			&id, &record.PatientID, &record.ClinicID, &record.TherapistID, &record.Joint, &record.Movement,
			&sideVal, &activeROM, &passiveROM, &record.IsPainful, &notes, &record.RecordedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan ROM record: %w", err)
		}

		if sideVal.Valid {
			record.Side = sideVal.String
		}
		if activeROM.Valid {
			record.ActiveROM = &activeROM.Float64
		}
		if passiveROM.Valid {
			record.PassiveROM = &passiveROM.Float64
		}
		if notes.Valid {
			record.Notes = notes.String
		}

		records = append(records, record)
	}

	return records, nil
}

// CreateAppointment creates a new appointment.
func (r *quickActionsRepo) CreateAppointment(ctx context.Context, req model.QuickScheduleRequest) (string, error) {
	id := uuid.New().String()

	query := `
		INSERT INTO appointments (
			id, patient_id, clinic_id, therapist_id, appointment_date,
			start_time, duration_minutes, status, notes, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled', $8, $9)
	`

	_, err := r.db.ExecContext(ctx, query,
		id, req.PatientID, req.ClinicID, req.TherapistID, req.Date,
		req.TimeSlot, req.Duration, req.Notes, time.Now(),
	)
	if err != nil {
		return "", fmt.Errorf("failed to create appointment: %w", err)
	}

	return id, nil
}

// CheckTimeSlotAvailable checks if a time slot is available.
func (r *quickActionsRepo) CheckTimeSlotAvailable(ctx context.Context, clinicID, therapistID, date, timeSlot string, duration int) (bool, error) {
	query := `
		SELECT COUNT(*)
		FROM appointments
		WHERE clinic_id = $1 AND therapist_id = $2 AND appointment_date = $3
		  AND status NOT IN ('cancelled', 'no_show')
		  AND (
			(start_time <= $4 AND start_time + (duration_minutes || ' minutes')::interval > $4::time)
			OR
			(start_time < ($4::time + ($5 || ' minutes')::interval) AND start_time >= $4::time)
		  )
	`

	var count int
	err := r.db.QueryRowContext(ctx, query, clinicID, therapistID, date, timeSlot, duration).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("failed to check time slot: %w", err)
	}

	return count == 0, nil
}

// =============================================================================
// MOCK IMPLEMENTATION
// =============================================================================

// mockQuickActionsRepo provides a mock implementation for development.
type mockQuickActionsRepo struct {
	painRecords []model.QuickPainRecord
	romRecords  []model.QuickROMRecord
}

func (r *mockQuickActionsRepo) CreatePainRecord(ctx context.Context, record model.QuickPainRecord) (string, error) {
	id := uuid.New().String()
	r.painRecords = append(r.painRecords, record)
	return id, nil
}

func (r *mockQuickActionsRepo) GetLastPainRecord(ctx context.Context, patientID string) (*model.QuickPainRecord, error) {
	for i := len(r.painRecords) - 1; i >= 0; i-- {
		if r.painRecords[i].PatientID == patientID {
			return &r.painRecords[i], nil
		}
	}
	return nil, nil
}

func (r *mockQuickActionsRepo) GetPainHistory(ctx context.Context, patientID string, limit int) ([]model.QuickPainRecord, error) {
	var result []model.QuickPainRecord
	for i := len(r.painRecords) - 1; i >= 0 && len(result) < limit; i-- {
		if r.painRecords[i].PatientID == patientID {
			result = append(result, r.painRecords[i])
		}
	}
	return result, nil
}

func (r *mockQuickActionsRepo) CreateROMRecord(ctx context.Context, record model.QuickROMRecord) (string, error) {
	id := uuid.New().String()
	r.romRecords = append(r.romRecords, record)
	return id, nil
}

func (r *mockQuickActionsRepo) GetLastROMRecord(ctx context.Context, patientID, joint, movement, side string) (*model.QuickROMRecord, error) {
	for i := len(r.romRecords) - 1; i >= 0; i-- {
		rec := r.romRecords[i]
		if rec.PatientID == patientID && rec.Joint == joint && rec.Movement == movement && rec.Side == side {
			return &rec, nil
		}
	}
	return nil, nil
}

func (r *mockQuickActionsRepo) GetROMHistory(ctx context.Context, patientID, joint string, limit int) ([]model.QuickROMRecord, error) {
	var result []model.QuickROMRecord
	for i := len(r.romRecords) - 1; i >= 0 && len(result) < limit; i-- {
		rec := r.romRecords[i]
		if rec.PatientID == patientID && (joint == "" || rec.Joint == joint) {
			result = append(result, rec)
		}
	}
	return result, nil
}

func (r *mockQuickActionsRepo) CreateAppointment(ctx context.Context, req model.QuickScheduleRequest) (string, error) {
	return uuid.New().String(), nil
}

func (r *mockQuickActionsRepo) CheckTimeSlotAvailable(ctx context.Context, clinicID, therapistID, date, timeSlot string, duration int) (bool, error) {
	return true, nil
}
