package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/lib/pq"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// AppointmentRepository defines the interface for appointment data access.
type AppointmentRepository interface {
	Create(ctx context.Context, appointment *model.Appointment) error
	GetByID(ctx context.Context, clinicID, id string) (*model.AppointmentWithDetails, error)
	Update(ctx context.Context, appointment *model.Appointment) error
	Delete(ctx context.Context, clinicID, id string) error
	List(ctx context.Context, params model.AppointmentSearchParams) ([]model.AppointmentWithDetails, int64, error)
	GetByDateRange(ctx context.Context, clinicID string, start, end time.Time) ([]model.AppointmentWithDetails, error)
	GetByPatient(ctx context.Context, clinicID, patientID string, limit int) ([]model.AppointmentWithDetails, error)
	GetByTherapist(ctx context.Context, clinicID, therapistID string, start, end time.Time) ([]model.AppointmentWithDetails, error)
	GetDaySchedule(ctx context.Context, clinicID string, date time.Time) (*model.DaySchedule, error)
	FindConflicts(ctx context.Context, clinicID, therapistID string, start, end time.Time, excludeID string) ([]model.Appointment, error)
	GetTherapistSchedule(ctx context.Context, clinicID, therapistID string) ([]model.TherapistSchedule, error)
	GetScheduleExceptions(ctx context.Context, clinicID, therapistID string, start, end time.Time) ([]model.ScheduleException, error)
	GetAvailableSlots(ctx context.Context, clinicID, therapistID string, date time.Time, duration int) ([]model.AvailabilitySlot, error)
	CancelByRecurrenceID(ctx context.Context, clinicID, recurrenceID string, reason string, fromDate time.Time) error
	CountByClinic(ctx context.Context, clinicID string) (int64, error)
	GetTherapists(ctx context.Context, clinicID string) ([]model.Therapist, error)
}

// postgresAppointmentRepo implements AppointmentRepository with PostgreSQL.
type postgresAppointmentRepo struct {
	db *DB
}

// NewAppointmentRepository creates a new PostgreSQL appointment repository.
func NewAppointmentRepository(db *DB) AppointmentRepository {
	return &postgresAppointmentRepo{db: db}
}

// Create inserts a new appointment record.
func (r *postgresAppointmentRepo) Create(ctx context.Context, appointment *model.Appointment) error {
	query := `
		INSERT INTO appointments (
			id, clinic_id, patient_id, therapist_id, start_time, end_time,
			duration, type, status, room, notes, recurrence_id, created_by, updated_by
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13
		)
		RETURNING created_at, updated_at`

	err := r.db.QueryRowContext(ctx, query,
		appointment.ID,
		appointment.ClinicID,
		appointment.PatientID,
		appointment.TherapistID,
		appointment.StartTime,
		appointment.EndTime,
		appointment.Duration,
		appointment.Type,
		appointment.Status,
		NullableStringValue(appointment.Room),
		NullableStringValue(appointment.Notes),
		NullableString(appointment.RecurrenceID),
		NullableString(appointment.CreatedBy),
	).Scan(&appointment.CreatedAt, &appointment.UpdatedAt)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == "23505" {
				return ErrAlreadyExists
			}
			if pqErr.Code == "23503" { // foreign key violation
				return fmt.Errorf("%w: invalid patient or therapist ID", ErrInvalidInput)
			}
		}
		return fmt.Errorf("failed to create appointment: %w", err)
	}

	return nil
}

// GetByID retrieves an appointment by ID with patient and therapist details.
func (r *postgresAppointmentRepo) GetByID(ctx context.Context, clinicID, id string) (*model.AppointmentWithDetails, error) {
	query := `
		SELECT
			a.id, a.clinic_id, a.patient_id, a.therapist_id, a.start_time, a.end_time,
			a.duration, a.type, a.status, a.room, a.notes, a.cancellation_reason,
			a.recurrence_id, a.created_at, a.updated_at, a.created_by, a.updated_by,
			COALESCE(p.first_name || ' ' || p.last_name, '') as patient_name,
			COALESCE(p.mrn, '') as patient_mrn,
			COALESCE(p.phone, '') as patient_phone,
			COALESCE(u.first_name || ' ' || u.last_name, '') as therapist_name
		FROM appointments a
		LEFT JOIN patients p ON a.patient_id = p.id
		LEFT JOIN users u ON a.therapist_id = u.id
		WHERE a.id = $1 AND a.clinic_id = $2`

	return r.scanAppointmentWithDetails(r.db.QueryRowContext(ctx, query, id, clinicID))
}

// scanAppointmentWithDetails scans an appointment row with details into struct.
func (r *postgresAppointmentRepo) scanAppointmentWithDetails(row *sql.Row) (*model.AppointmentWithDetails, error) {
	var a model.AppointmentWithDetails
	var room, notes, cancellationReason sql.NullString
	var recurrenceID, createdBy, updatedBy sql.NullString

	err := row.Scan(
		&a.ID,
		&a.ClinicID,
		&a.PatientID,
		&a.TherapistID,
		&a.StartTime,
		&a.EndTime,
		&a.Duration,
		&a.Type,
		&a.Status,
		&room,
		&notes,
		&cancellationReason,
		&recurrenceID,
		&a.CreatedAt,
		&a.UpdatedAt,
		&createdBy,
		&updatedBy,
		&a.PatientName,
		&a.PatientMRN,
		&a.PatientPhone,
		&a.TherapistName,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan appointment: %w", err)
	}

	a.Room = StringFromNull(room)
	a.Notes = StringFromNull(notes)
	a.CancellationReason = StringFromNull(cancellationReason)
	a.RecurrenceID = StringPtrFromNull(recurrenceID)
	a.CreatedBy = StringPtrFromNull(createdBy)
	a.UpdatedBy = StringPtrFromNull(updatedBy)

	return &a, nil
}

// Update updates an existing appointment record.
func (r *postgresAppointmentRepo) Update(ctx context.Context, appointment *model.Appointment) error {
	query := `
		UPDATE appointments SET
			therapist_id = $1,
			start_time = $2,
			end_time = $3,
			duration = $4,
			type = $5,
			status = $6,
			room = $7,
			notes = $8,
			cancellation_reason = $9,
			updated_by = $10
		WHERE id = $11 AND clinic_id = $12
		RETURNING updated_at`

	result := r.db.QueryRowContext(ctx, query,
		appointment.TherapistID,
		appointment.StartTime,
		appointment.EndTime,
		appointment.Duration,
		appointment.Type,
		appointment.Status,
		NullableStringValue(appointment.Room),
		NullableStringValue(appointment.Notes),
		NullableStringValue(appointment.CancellationReason),
		NullableString(appointment.UpdatedBy),
		appointment.ID,
		appointment.ClinicID,
	)

	if err := result.Scan(&appointment.UpdatedAt); err != nil {
		if err == sql.ErrNoRows {
			return ErrNotFound
		}
		return fmt.Errorf("failed to update appointment: %w", err)
	}

	return nil
}

// Delete performs a hard delete on an appointment record.
func (r *postgresAppointmentRepo) Delete(ctx context.Context, clinicID, id string) error {
	query := `DELETE FROM appointments WHERE id = $1 AND clinic_id = $2`

	result, err := r.db.ExecContext(ctx, query, id, clinicID)
	if err != nil {
		return fmt.Errorf("failed to delete appointment: %w", err)
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

// List returns a paginated list of appointments with filtering.
func (r *postgresAppointmentRepo) List(ctx context.Context, params model.AppointmentSearchParams) ([]model.AppointmentWithDetails, int64, error) {
	conditions := []string{"a.clinic_id = $1"}
	args := []interface{}{params.ClinicID}
	argIdx := 2

	if params.PatientID != "" {
		conditions = append(conditions, fmt.Sprintf("a.patient_id = $%d", argIdx))
		args = append(args, params.PatientID)
		argIdx++
	}

	if params.TherapistID != "" {
		conditions = append(conditions, fmt.Sprintf("a.therapist_id = $%d", argIdx))
		args = append(args, params.TherapistID)
		argIdx++
	}

	if params.StartDate != nil {
		conditions = append(conditions, fmt.Sprintf("a.start_time >= $%d", argIdx))
		args = append(args, *params.StartDate)
		argIdx++
	}

	if params.EndDate != nil {
		conditions = append(conditions, fmt.Sprintf("a.start_time < $%d", argIdx))
		args = append(args, *params.EndDate)
		argIdx++
	}

	if params.Status != "" {
		conditions = append(conditions, fmt.Sprintf("a.status = $%d", argIdx))
		args = append(args, params.Status)
		argIdx++
	}

	if params.Type != "" {
		conditions = append(conditions, fmt.Sprintf("a.type = $%d", argIdx))
		args = append(args, params.Type)
		argIdx++
	}

	if params.Room != "" {
		conditions = append(conditions, fmt.Sprintf("a.room = $%d", argIdx))
		args = append(args, params.Room)
		argIdx++
	}

	whereClause := strings.Join(conditions, " AND ")

	// Count total
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM appointments a WHERE %s`, whereClause)
	var total int64
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count appointments: %w", err)
	}

	if total == 0 {
		return []model.AppointmentWithDetails{}, 0, nil
	}

	// Build ORDER BY clause
	orderBy := "a.start_time ASC"
	allowedSortFields := map[string]bool{
		"start_time": true,
		"created_at": true,
		"updated_at": true,
		"status":     true,
		"type":       true,
	}
	if params.SortBy != "" && allowedSortFields[params.SortBy] {
		order := "ASC"
		if strings.ToUpper(params.SortOrder) == "DESC" {
			order = "DESC"
		}
		orderBy = fmt.Sprintf("a.%s %s", params.SortBy, order)
	}

	query := fmt.Sprintf(`
		SELECT
			a.id, a.clinic_id, a.patient_id, a.therapist_id, a.start_time, a.end_time,
			a.duration, a.type, a.status, a.room, a.notes, a.cancellation_reason,
			a.recurrence_id, a.created_at, a.updated_at, a.created_by, a.updated_by,
			COALESCE(p.first_name || ' ' || p.last_name, '') as patient_name,
			COALESCE(p.mrn, '') as patient_mrn,
			COALESCE(p.phone, '') as patient_phone,
			COALESCE(u.first_name || ' ' || u.last_name, '') as therapist_name
		FROM appointments a
		LEFT JOIN patients p ON a.patient_id = p.id
		LEFT JOIN users u ON a.therapist_id = u.id
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d`,
		whereClause, orderBy, argIdx, argIdx+1)

	args = append(args, params.Limit(), params.Offset())

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list appointments: %w", err)
	}
	defer rows.Close()

	appointments := make([]model.AppointmentWithDetails, 0)
	for rows.Next() {
		a, err := r.scanAppointmentWithDetailsRows(rows)
		if err != nil {
			return nil, 0, err
		}
		appointments = append(appointments, *a)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating appointments: %w", err)
	}

	return appointments, total, nil
}

// scanAppointmentWithDetailsRows scans an appointment from sql.Rows.
func (r *postgresAppointmentRepo) scanAppointmentWithDetailsRows(rows *sql.Rows) (*model.AppointmentWithDetails, error) {
	var a model.AppointmentWithDetails
	var room, notes, cancellationReason sql.NullString
	var recurrenceID, createdBy, updatedBy sql.NullString

	err := rows.Scan(
		&a.ID,
		&a.ClinicID,
		&a.PatientID,
		&a.TherapistID,
		&a.StartTime,
		&a.EndTime,
		&a.Duration,
		&a.Type,
		&a.Status,
		&room,
		&notes,
		&cancellationReason,
		&recurrenceID,
		&a.CreatedAt,
		&a.UpdatedAt,
		&createdBy,
		&updatedBy,
		&a.PatientName,
		&a.PatientMRN,
		&a.PatientPhone,
		&a.TherapistName,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to scan appointment row: %w", err)
	}

	a.Room = StringFromNull(room)
	a.Notes = StringFromNull(notes)
	a.CancellationReason = StringFromNull(cancellationReason)
	a.RecurrenceID = StringPtrFromNull(recurrenceID)
	a.CreatedBy = StringPtrFromNull(createdBy)
	a.UpdatedBy = StringPtrFromNull(updatedBy)

	return &a, nil
}

// GetByDateRange retrieves appointments within a date range.
func (r *postgresAppointmentRepo) GetByDateRange(ctx context.Context, clinicID string, start, end time.Time) ([]model.AppointmentWithDetails, error) {
	query := `
		SELECT
			a.id, a.clinic_id, a.patient_id, a.therapist_id, a.start_time, a.end_time,
			a.duration, a.type, a.status, a.room, a.notes, a.cancellation_reason,
			a.recurrence_id, a.created_at, a.updated_at, a.created_by, a.updated_by,
			COALESCE(p.first_name || ' ' || p.last_name, '') as patient_name,
			COALESCE(p.mrn, '') as patient_mrn,
			COALESCE(p.phone, '') as patient_phone,
			COALESCE(u.first_name || ' ' || u.last_name, '') as therapist_name
		FROM appointments a
		LEFT JOIN patients p ON a.patient_id = p.id
		LEFT JOIN users u ON a.therapist_id = u.id
		WHERE a.clinic_id = $1
			AND a.start_time >= $2
			AND a.start_time < $3
			AND a.status != 'cancelled'
		ORDER BY a.start_time ASC`

	rows, err := r.db.QueryContext(ctx, query, clinicID, start, end)
	if err != nil {
		return nil, fmt.Errorf("failed to get appointments by date range: %w", err)
	}
	defer rows.Close()

	appointments := make([]model.AppointmentWithDetails, 0)
	for rows.Next() {
		a, err := r.scanAppointmentWithDetailsRows(rows)
		if err != nil {
			return nil, err
		}
		appointments = append(appointments, *a)
	}

	return appointments, nil
}

// GetByPatient retrieves appointments for a patient.
func (r *postgresAppointmentRepo) GetByPatient(ctx context.Context, clinicID, patientID string, limit int) ([]model.AppointmentWithDetails, error) {
	if limit <= 0 {
		limit = 20
	}

	query := `
		SELECT
			a.id, a.clinic_id, a.patient_id, a.therapist_id, a.start_time, a.end_time,
			a.duration, a.type, a.status, a.room, a.notes, a.cancellation_reason,
			a.recurrence_id, a.created_at, a.updated_at, a.created_by, a.updated_by,
			COALESCE(p.first_name || ' ' || p.last_name, '') as patient_name,
			COALESCE(p.mrn, '') as patient_mrn,
			COALESCE(p.phone, '') as patient_phone,
			COALESCE(u.first_name || ' ' || u.last_name, '') as therapist_name
		FROM appointments a
		LEFT JOIN patients p ON a.patient_id = p.id
		LEFT JOIN users u ON a.therapist_id = u.id
		WHERE a.clinic_id = $1 AND a.patient_id = $2
		ORDER BY a.start_time DESC
		LIMIT $3`

	rows, err := r.db.QueryContext(ctx, query, clinicID, patientID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get appointments by patient: %w", err)
	}
	defer rows.Close()

	appointments := make([]model.AppointmentWithDetails, 0)
	for rows.Next() {
		a, err := r.scanAppointmentWithDetailsRows(rows)
		if err != nil {
			return nil, err
		}
		appointments = append(appointments, *a)
	}

	return appointments, nil
}

// GetByTherapist retrieves appointments for a therapist within a date range.
func (r *postgresAppointmentRepo) GetByTherapist(ctx context.Context, clinicID, therapistID string, start, end time.Time) ([]model.AppointmentWithDetails, error) {
	query := `
		SELECT
			a.id, a.clinic_id, a.patient_id, a.therapist_id, a.start_time, a.end_time,
			a.duration, a.type, a.status, a.room, a.notes, a.cancellation_reason,
			a.recurrence_id, a.created_at, a.updated_at, a.created_by, a.updated_by,
			COALESCE(p.first_name || ' ' || p.last_name, '') as patient_name,
			COALESCE(p.mrn, '') as patient_mrn,
			COALESCE(p.phone, '') as patient_phone,
			COALESCE(u.first_name || ' ' || u.last_name, '') as therapist_name
		FROM appointments a
		LEFT JOIN patients p ON a.patient_id = p.id
		LEFT JOIN users u ON a.therapist_id = u.id
		WHERE a.clinic_id = $1
			AND a.therapist_id = $2
			AND a.start_time >= $3
			AND a.start_time < $4
			AND a.status != 'cancelled'
		ORDER BY a.start_time ASC`

	rows, err := r.db.QueryContext(ctx, query, clinicID, therapistID, start, end)
	if err != nil {
		return nil, fmt.Errorf("failed to get appointments by therapist: %w", err)
	}
	defer rows.Close()

	appointments := make([]model.AppointmentWithDetails, 0)
	for rows.Next() {
		a, err := r.scanAppointmentWithDetailsRows(rows)
		if err != nil {
			return nil, err
		}
		appointments = append(appointments, *a)
	}

	return appointments, nil
}

// GetDaySchedule retrieves all appointments for a specific day.
func (r *postgresAppointmentRepo) GetDaySchedule(ctx context.Context, clinicID string, date time.Time) (*model.DaySchedule, error) {
	// Start of day
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.AddDate(0, 0, 1)

	appointments, err := r.GetByDateRange(ctx, clinicID, startOfDay, endOfDay)
	if err != nil {
		return nil, err
	}

	return &model.DaySchedule{
		Date:         date.Format("2006-01-02"),
		Appointments: appointments,
		TotalCount:   len(appointments),
	}, nil
}

// FindConflicts finds appointments that overlap with the given time range.
func (r *postgresAppointmentRepo) FindConflicts(ctx context.Context, clinicID, therapistID string, start, end time.Time, excludeID string) ([]model.Appointment, error) {
	query := `
		SELECT
			id, clinic_id, patient_id, therapist_id, start_time, end_time,
			duration, type, status, room, notes, cancellation_reason,
			recurrence_id, created_at, updated_at, created_by, updated_by
		FROM appointments
		WHERE clinic_id = $1
			AND therapist_id = $2
			AND status NOT IN ('cancelled', 'no_show')
			AND start_time < $4
			AND end_time > $3
			AND ($5 = '' OR id != $5)`

	rows, err := r.db.QueryContext(ctx, query, clinicID, therapistID, start, end, excludeID)
	if err != nil {
		return nil, fmt.Errorf("failed to find conflicts: %w", err)
	}
	defer rows.Close()

	conflicts := make([]model.Appointment, 0)
	for rows.Next() {
		var a model.Appointment
		var room, notes, cancellationReason sql.NullString
		var recurrenceID, createdBy, updatedBy sql.NullString

		err := rows.Scan(
			&a.ID,
			&a.ClinicID,
			&a.PatientID,
			&a.TherapistID,
			&a.StartTime,
			&a.EndTime,
			&a.Duration,
			&a.Type,
			&a.Status,
			&room,
			&notes,
			&cancellationReason,
			&recurrenceID,
			&a.CreatedAt,
			&a.UpdatedAt,
			&createdBy,
			&updatedBy,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan conflict: %w", err)
		}

		a.Room = StringFromNull(room)
		a.Notes = StringFromNull(notes)
		a.CancellationReason = StringFromNull(cancellationReason)
		a.RecurrenceID = StringPtrFromNull(recurrenceID)
		a.CreatedBy = StringPtrFromNull(createdBy)
		a.UpdatedBy = StringPtrFromNull(updatedBy)

		conflicts = append(conflicts, a)
	}

	return conflicts, nil
}

// GetTherapistSchedule retrieves the regular working schedule for a therapist.
func (r *postgresAppointmentRepo) GetTherapistSchedule(ctx context.Context, clinicID, therapistID string) ([]model.TherapistSchedule, error) {
	query := `
		SELECT id, clinic_id, therapist_id, day_of_week, start_time, end_time,
			is_active, created_at, updated_at
		FROM therapist_schedules
		WHERE clinic_id = $1 AND therapist_id = $2 AND is_active = true
		ORDER BY day_of_week, start_time`

	rows, err := r.db.QueryContext(ctx, query, clinicID, therapistID)
	if err != nil {
		return nil, fmt.Errorf("failed to get therapist schedule: %w", err)
	}
	defer rows.Close()

	schedules := make([]model.TherapistSchedule, 0)
	for rows.Next() {
		var s model.TherapistSchedule
		err := rows.Scan(
			&s.ID,
			&s.ClinicID,
			&s.TherapistID,
			&s.DayOfWeek,
			&s.StartTime,
			&s.EndTime,
			&s.IsActive,
			&s.CreatedAt,
			&s.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan therapist schedule: %w", err)
		}
		schedules = append(schedules, s)
	}

	return schedules, nil
}

// GetScheduleExceptions retrieves schedule exceptions for a therapist within a date range.
func (r *postgresAppointmentRepo) GetScheduleExceptions(ctx context.Context, clinicID, therapistID string, start, end time.Time) ([]model.ScheduleException, error) {
	query := `
		SELECT id, clinic_id, therapist_id, date, start_time, end_time,
			is_available, reason, created_at, updated_at
		FROM schedule_exceptions
		WHERE clinic_id = $1 AND therapist_id = $2 AND date >= $3 AND date < $4
		ORDER BY date, start_time`

	rows, err := r.db.QueryContext(ctx, query, clinicID, therapistID, start, end)
	if err != nil {
		return nil, fmt.Errorf("failed to get schedule exceptions: %w", err)
	}
	defer rows.Close()

	exceptions := make([]model.ScheduleException, 0)
	for rows.Next() {
		var e model.ScheduleException
		var startTime, endTime, reason sql.NullString

		err := rows.Scan(
			&e.ID,
			&e.ClinicID,
			&e.TherapistID,
			&e.Date,
			&startTime,
			&endTime,
			&e.IsAvailable,
			&reason,
			&e.CreatedAt,
			&e.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan schedule exception: %w", err)
		}

		e.StartTime = StringPtrFromNull(startTime)
		e.EndTime = StringPtrFromNull(endTime)
		e.Reason = StringFromNull(reason)

		exceptions = append(exceptions, e)
	}

	return exceptions, nil
}

// GetAvailableSlots calculates available time slots for a therapist on a given date.
func (r *postgresAppointmentRepo) GetAvailableSlots(ctx context.Context, clinicID, therapistID string, date time.Time, duration int) ([]model.AvailabilitySlot, error) {
	// Get the day of week
	dayOfWeek := int(date.Weekday())

	// Get therapist's schedule for this day
	scheduleQuery := `
		SELECT start_time, end_time
		FROM therapist_schedules
		WHERE clinic_id = $1 AND therapist_id = $2 AND day_of_week = $3 AND is_active = true`

	rows, err := r.db.QueryContext(ctx, scheduleQuery, clinicID, therapistID, dayOfWeek)
	if err != nil {
		return nil, fmt.Errorf("failed to get therapist schedule: %w", err)
	}
	defer rows.Close()

	var workingPeriods []model.TimeRange
	for rows.Next() {
		var startStr, endStr string
		if err := rows.Scan(&startStr, &endStr); err != nil {
			return nil, fmt.Errorf("failed to scan schedule: %w", err)
		}

		startTime, _ := time.Parse("15:04", startStr)
		endTime, _ := time.Parse("15:04", endStr)

		start := time.Date(date.Year(), date.Month(), date.Day(), startTime.Hour(), startTime.Minute(), 0, 0, date.Location())
		end := time.Date(date.Year(), date.Month(), date.Day(), endTime.Hour(), endTime.Minute(), 0, 0, date.Location())

		workingPeriods = append(workingPeriods, model.TimeRange{Start: start, End: end})
	}

	// If no schedule found, use default working hours (8:00 - 17:00)
	if len(workingPeriods) == 0 {
		start := time.Date(date.Year(), date.Month(), date.Day(), 8, 0, 0, 0, date.Location())
		end := time.Date(date.Year(), date.Month(), date.Day(), 17, 0, 0, 0, date.Location())
		workingPeriods = append(workingPeriods, model.TimeRange{Start: start, End: end})
	}

	// Get existing appointments for the day
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.AddDate(0, 0, 1)

	existingAppointments, err := r.GetByTherapist(ctx, clinicID, therapistID, startOfDay, endOfDay)
	if err != nil {
		return nil, err
	}

	// Build list of booked time ranges
	var bookedPeriods []model.TimeRange
	for _, appt := range existingAppointments {
		bookedPeriods = append(bookedPeriods, model.TimeRange{Start: appt.StartTime, End: appt.EndTime})
	}

	// Calculate available slots
	slots := make([]model.AvailabilitySlot, 0)
	slotIncrement := 15 * time.Minute // 15-minute increments

	for _, period := range workingPeriods {
		current := period.Start
		for current.Add(time.Duration(duration) * time.Minute).Before(period.End) || current.Add(time.Duration(duration)*time.Minute).Equal(period.End) {
			slotEnd := current.Add(time.Duration(duration) * time.Minute)

			// Check if this slot overlaps with any booked period
			isAvailable := true
			for _, booked := range bookedPeriods {
				if current.Before(booked.End) && slotEnd.After(booked.Start) {
					isAvailable = false
					break
				}
			}

			// Don't show slots in the past
			if current.Before(time.Now()) {
				isAvailable = false
			}

			if isAvailable {
				slots = append(slots, model.AvailabilitySlot{
					StartTime:   current,
					EndTime:     slotEnd,
					TherapistID: therapistID,
					Duration:    duration,
				})
			}

			current = current.Add(slotIncrement)
		}
	}

	return slots, nil
}

// CancelByRecurrenceID cancels all appointments in a recurring series from a given date.
func (r *postgresAppointmentRepo) CancelByRecurrenceID(ctx context.Context, clinicID, recurrenceID string, reason string, fromDate time.Time) error {
	query := `
		UPDATE appointments
		SET status = 'cancelled', cancellation_reason = $1, updated_at = NOW()
		WHERE clinic_id = $2 AND recurrence_id = $3 AND start_time >= $4 AND status NOT IN ('completed', 'cancelled')`

	_, err := r.db.ExecContext(ctx, query, reason, clinicID, recurrenceID, fromDate)
	if err != nil {
		return fmt.Errorf("failed to cancel recurring appointments: %w", err)
	}

	return nil
}

// CountByClinic returns the total number of appointments in a clinic.
func (r *postgresAppointmentRepo) CountByClinic(ctx context.Context, clinicID string) (int64, error) {
	query := `SELECT COUNT(*) FROM appointments WHERE clinic_id = $1`
	var count int64
	if err := r.db.QueryRowContext(ctx, query, clinicID).Scan(&count); err != nil {
		return 0, fmt.Errorf("failed to count appointments: %w", err)
	}
	return count, nil
}

// GetTherapists retrieves all active therapists for a clinic.
func (r *postgresAppointmentRepo) GetTherapists(ctx context.Context, clinicID string) ([]model.Therapist, error) {
	query := `
		SELECT id, first_name, last_name, email
		FROM users
		WHERE clinic_id = $1 AND active = true AND 'therapist' = ANY(roles)
		ORDER BY last_name, first_name`

	rows, err := r.db.QueryContext(ctx, query, clinicID)
	if err != nil {
		// If users table doesn't have roles column, try alternative
		log.Warn().Err(err).Msg("falling back to basic therapist query")
		return r.getTherapistsBasic(ctx, clinicID)
	}
	defer rows.Close()

	therapists := make([]model.Therapist, 0)
	for rows.Next() {
		var t model.Therapist
		var email sql.NullString

		err := rows.Scan(&t.ID, &t.FirstName, &t.LastName, &email)
		if err != nil {
			return nil, fmt.Errorf("failed to scan therapist: %w", err)
		}

		t.FullName = t.FirstName + " " + t.LastName
		t.Email = StringFromNull(email)
		t.IsActive = true

		therapists = append(therapists, t)
	}

	return therapists, nil
}

// getTherapistsBasic is a fallback for getting therapists without role filtering.
func (r *postgresAppointmentRepo) getTherapistsBasic(ctx context.Context, clinicID string) ([]model.Therapist, error) {
	query := `
		SELECT id, first_name, last_name, email
		FROM users
		WHERE clinic_id = $1 AND active = true
		ORDER BY last_name, first_name`

	rows, err := r.db.QueryContext(ctx, query, clinicID)
	if err != nil {
		return nil, fmt.Errorf("failed to get therapists: %w", err)
	}
	defer rows.Close()

	therapists := make([]model.Therapist, 0)
	for rows.Next() {
		var t model.Therapist
		var email sql.NullString

		err := rows.Scan(&t.ID, &t.FirstName, &t.LastName, &email)
		if err != nil {
			return nil, fmt.Errorf("failed to scan therapist: %w", err)
		}

		t.FullName = t.FirstName + " " + t.LastName
		t.Email = StringFromNull(email)
		t.IsActive = true

		therapists = append(therapists, t)
	}

	return therapists, nil
}

// mockAppointmentRepo provides a mock implementation for development.
type mockAppointmentRepo struct{}

func (r *mockAppointmentRepo) Create(ctx context.Context, appointment *model.Appointment) error {
	appointment.CreatedAt = time.Now()
	appointment.UpdatedAt = time.Now()
	return nil
}

func (r *mockAppointmentRepo) GetByID(ctx context.Context, clinicID, id string) (*model.AppointmentWithDetails, error) {
	return nil, ErrNotFound
}

func (r *mockAppointmentRepo) Update(ctx context.Context, appointment *model.Appointment) error {
	return nil
}

func (r *mockAppointmentRepo) Delete(ctx context.Context, clinicID, id string) error {
	return nil
}

func (r *mockAppointmentRepo) List(ctx context.Context, params model.AppointmentSearchParams) ([]model.AppointmentWithDetails, int64, error) {
	return []model.AppointmentWithDetails{}, 0, nil
}

func (r *mockAppointmentRepo) GetByDateRange(ctx context.Context, clinicID string, start, end time.Time) ([]model.AppointmentWithDetails, error) {
	return []model.AppointmentWithDetails{}, nil
}

func (r *mockAppointmentRepo) GetByPatient(ctx context.Context, clinicID, patientID string, limit int) ([]model.AppointmentWithDetails, error) {
	return []model.AppointmentWithDetails{}, nil
}

func (r *mockAppointmentRepo) GetByTherapist(ctx context.Context, clinicID, therapistID string, start, end time.Time) ([]model.AppointmentWithDetails, error) {
	return []model.AppointmentWithDetails{}, nil
}

func (r *mockAppointmentRepo) GetDaySchedule(ctx context.Context, clinicID string, date time.Time) (*model.DaySchedule, error) {
	return &model.DaySchedule{
		Date:         date.Format("2006-01-02"),
		Appointments: []model.AppointmentWithDetails{},
		TotalCount:   0,
	}, nil
}

func (r *mockAppointmentRepo) FindConflicts(ctx context.Context, clinicID, therapistID string, start, end time.Time, excludeID string) ([]model.Appointment, error) {
	return []model.Appointment{}, nil
}

func (r *mockAppointmentRepo) GetTherapistSchedule(ctx context.Context, clinicID, therapistID string) ([]model.TherapistSchedule, error) {
	return []model.TherapistSchedule{}, nil
}

func (r *mockAppointmentRepo) GetScheduleExceptions(ctx context.Context, clinicID, therapistID string, start, end time.Time) ([]model.ScheduleException, error) {
	return []model.ScheduleException{}, nil
}

func (r *mockAppointmentRepo) GetAvailableSlots(ctx context.Context, clinicID, therapistID string, date time.Time, duration int) ([]model.AvailabilitySlot, error) {
	return []model.AvailabilitySlot{}, nil
}

func (r *mockAppointmentRepo) CancelByRecurrenceID(ctx context.Context, clinicID, recurrenceID string, reason string, fromDate time.Time) error {
	return nil
}

func (r *mockAppointmentRepo) CountByClinic(ctx context.Context, clinicID string) (int64, error) {
	return 0, nil
}

func (r *mockAppointmentRepo) GetTherapists(ctx context.Context, clinicID string) ([]model.Therapist, error) {
	return []model.Therapist{}, nil
}
