package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
)

// AppointmentService defines the interface for appointment business logic.
type AppointmentService interface {
	Create(ctx context.Context, clinicID, userID string, req *model.CreateAppointmentRequest) (*model.AppointmentWithDetails, error)
	GetByID(ctx context.Context, clinicID, id string) (*model.AppointmentWithDetails, error)
	Update(ctx context.Context, clinicID, id, userID string, req *model.UpdateAppointmentRequest) (*model.AppointmentWithDetails, error)
	Cancel(ctx context.Context, clinicID, id, userID string, req *model.CancelAppointmentRequest) error
	Delete(ctx context.Context, clinicID, id string) error
	List(ctx context.Context, params model.AppointmentSearchParams) (*model.AppointmentListResponse, error)
	GetByDateRange(ctx context.Context, clinicID string, start, end time.Time) ([]model.AppointmentWithDetails, error)
	GetByPatient(ctx context.Context, clinicID, patientID string, limit int) ([]model.AppointmentWithDetails, error)
	GetByTherapist(ctx context.Context, clinicID, therapistID string, start, end time.Time) ([]model.AppointmentWithDetails, error)
	GetDaySchedule(ctx context.Context, clinicID string, date time.Time) (*model.DaySchedule, error)
	GetAvailableSlots(ctx context.Context, clinicID, therapistID string, date time.Time, duration int) ([]model.AvailabilitySlot, error)
	Reschedule(ctx context.Context, clinicID, id, userID string, newStartTime time.Time) (*model.AppointmentWithDetails, error)
	GetTherapists(ctx context.Context, clinicID string) ([]model.Therapist, error)
	CheckConflicts(ctx context.Context, clinicID, therapistID string, start, end time.Time, excludeID string) ([]model.ConflictInfo, error)
}

// appointmentService implements AppointmentService.
type appointmentService struct {
	repo repository.AppointmentRepository
}

// NewAppointmentService creates a new appointment service.
func NewAppointmentService(repo repository.AppointmentRepository) AppointmentService {
	return &appointmentService{repo: repo}
}

// Create creates a new appointment with conflict checking and optional recurrence.
func (s *appointmentService) Create(ctx context.Context, clinicID, userID string, req *model.CreateAppointmentRequest) (*model.AppointmentWithDetails, error) {
	// Parse start time
	startTime, err := time.Parse(time.RFC3339, req.StartTime)
	if err != nil {
		return nil, fmt.Errorf("invalid start_time format: %w", err)
	}

	// Calculate end time
	endTime := startTime.Add(time.Duration(req.Duration) * time.Minute)

	// Check for conflicts
	conflicts, err := s.CheckConflicts(ctx, clinicID, req.TherapistID, startTime, endTime, "")
	if err != nil {
		return nil, fmt.Errorf("failed to check conflicts: %w", err)
	}

	if len(conflicts) > 0 {
		return nil, fmt.Errorf("scheduling conflict: %s", conflicts[0].Message)
	}

	// Handle recurrence
	recurrencePattern := model.RecurrencePattern(req.RecurrencePattern)
	if recurrencePattern == "" {
		recurrencePattern = model.RecurrenceNone
	}

	var recurrenceID *string
	if recurrencePattern != model.RecurrenceNone {
		id := uuid.New().String()
		recurrenceID = &id
	}

	// Create the appointment
	appointment := &model.Appointment{
		ID:           uuid.New().String(),
		ClinicID:     clinicID,
		PatientID:    req.PatientID,
		TherapistID:  req.TherapistID,
		StartTime:    startTime,
		EndTime:      endTime,
		Duration:     req.Duration,
		Type:         model.AppointmentType(req.Type),
		Status:       model.AppointmentStatusScheduled,
		Room:         req.Room,
		Notes:        req.Notes,
		RecurrenceID: recurrenceID,
		CreatedBy:    &userID,
		UpdatedBy:    &userID,
	}

	if err := s.repo.Create(ctx, appointment); err != nil {
		return nil, err
	}

	log.Info().
		Str("appointment_id", appointment.ID).
		Str("patient_id", req.PatientID).
		Str("therapist_id", req.TherapistID).
		Time("start_time", startTime).
		Str("clinic_id", clinicID).
		Str("created_by", userID).
		Msg("appointment created")

	// If recurring, create future appointments
	if recurrencePattern != model.RecurrenceNone && recurrenceID != nil {
		err := s.createRecurringAppointments(ctx, clinicID, userID, appointment, recurrencePattern, req.RecurrenceEndDate, req.RecurrenceCount)
		if err != nil {
			log.Warn().Err(err).Str("appointment_id", appointment.ID).Msg("failed to create some recurring appointments")
		}
	}

	// Get the full appointment with details
	return s.repo.GetByID(ctx, clinicID, appointment.ID)
}

// createRecurringAppointments creates future appointments for a recurring series.
func (s *appointmentService) createRecurringAppointments(
	ctx context.Context,
	clinicID, userID string,
	original *model.Appointment,
	pattern model.RecurrencePattern,
	endDateStr *string,
	maxCount *int,
) error {
	// Determine the recurrence interval
	var interval time.Duration
	switch pattern {
	case model.RecurrenceDaily:
		interval = 24 * time.Hour
	case model.RecurrenceWeekly:
		interval = 7 * 24 * time.Hour
	case model.RecurrenceBiweekly:
		interval = 14 * 24 * time.Hour
	case model.RecurrenceMonthly:
		// Handled specially below
		interval = 0
	default:
		return nil
	}

	// Determine end condition
	var endDate time.Time
	count := 12 // Default: 12 occurrences (3 months for weekly)

	if endDateStr != nil {
		parsed, err := time.Parse("2006-01-02", *endDateStr)
		if err == nil {
			endDate = parsed
		}
	}

	if maxCount != nil && *maxCount > 0 {
		count = *maxCount
	}

	created := 0
	currentStart := original.StartTime

	for created < count {
		// Calculate next occurrence
		if pattern == model.RecurrenceMonthly {
			currentStart = currentStart.AddDate(0, 1, 0)
		} else {
			currentStart = currentStart.Add(interval)
		}

		// Check end date condition
		if !endDate.IsZero() && currentStart.After(endDate) {
			break
		}

		currentEnd := currentStart.Add(time.Duration(original.Duration) * time.Minute)

		// Check for conflicts
		conflicts, err := s.repo.FindConflicts(ctx, clinicID, original.TherapistID, currentStart, currentEnd, "")
		if err != nil {
			log.Warn().Err(err).Time("start_time", currentStart).Msg("failed to check conflicts for recurring appointment")
			continue
		}

		if len(conflicts) > 0 {
			log.Info().
				Time("start_time", currentStart).
				Str("therapist_id", original.TherapistID).
				Msg("skipping recurring appointment due to conflict")
			// Don't count this one, try next slot
			continue
		}

		// Create the recurring appointment
		appt := &model.Appointment{
			ID:           uuid.New().String(),
			ClinicID:     clinicID,
			PatientID:    original.PatientID,
			TherapistID:  original.TherapistID,
			StartTime:    currentStart,
			EndTime:      currentEnd,
			Duration:     original.Duration,
			Type:         original.Type,
			Status:       model.AppointmentStatusScheduled,
			Room:         original.Room,
			Notes:        original.Notes,
			RecurrenceID: original.RecurrenceID,
			CreatedBy:    &userID,
			UpdatedBy:    &userID,
		}

		if err := s.repo.Create(ctx, appt); err != nil {
			log.Warn().Err(err).Time("start_time", currentStart).Msg("failed to create recurring appointment")
			continue
		}

		created++
	}

	log.Info().
		Int("created_count", created).
		Str("recurrence_id", *original.RecurrenceID).
		Msg("recurring appointments created")

	return nil
}

// GetByID retrieves an appointment by ID.
func (s *appointmentService) GetByID(ctx context.Context, clinicID, id string) (*model.AppointmentWithDetails, error) {
	return s.repo.GetByID(ctx, clinicID, id)
}

// Update updates an existing appointment.
func (s *appointmentService) Update(ctx context.Context, clinicID, id, userID string, req *model.UpdateAppointmentRequest) (*model.AppointmentWithDetails, error) {
	// Get existing appointment
	existing, err := s.repo.GetByID(ctx, clinicID, id)
	if err != nil {
		return nil, err
	}

	// Build updated appointment
	appointment := &existing.Appointment

	if req.TherapistID != nil {
		appointment.TherapistID = *req.TherapistID
	}

	if req.StartTime != nil {
		startTime, err := time.Parse(time.RFC3339, *req.StartTime)
		if err != nil {
			return nil, fmt.Errorf("invalid start_time format: %w", err)
		}
		appointment.StartTime = startTime

		// Recalculate end time
		duration := appointment.Duration
		if req.Duration != nil {
			duration = *req.Duration
		}
		appointment.EndTime = startTime.Add(time.Duration(duration) * time.Minute)
	}

	if req.Duration != nil {
		appointment.Duration = *req.Duration
		if req.StartTime == nil {
			// Only update end time if start time wasn't also changed
			appointment.EndTime = appointment.StartTime.Add(time.Duration(*req.Duration) * time.Minute)
		}
	}

	if req.Type != nil {
		appointment.Type = model.AppointmentType(*req.Type)
	}

	if req.Status != nil {
		appointment.Status = model.AppointmentStatus(*req.Status)
	}

	if req.Room != nil {
		appointment.Room = *req.Room
	}

	if req.Notes != nil {
		appointment.Notes = *req.Notes
	}

	appointment.UpdatedBy = &userID

	// Check for conflicts if time or therapist changed
	if req.StartTime != nil || req.Duration != nil || req.TherapistID != nil {
		conflicts, err := s.CheckConflicts(ctx, clinicID, appointment.TherapistID, appointment.StartTime, appointment.EndTime, id)
		if err != nil {
			return nil, fmt.Errorf("failed to check conflicts: %w", err)
		}

		if len(conflicts) > 0 {
			return nil, fmt.Errorf("scheduling conflict: %s", conflicts[0].Message)
		}
	}

	// Update in database
	if err := s.repo.Update(ctx, appointment); err != nil {
		return nil, err
	}

	log.Info().
		Str("appointment_id", id).
		Str("clinic_id", clinicID).
		Str("updated_by", userID).
		Msg("appointment updated")

	return s.repo.GetByID(ctx, clinicID, id)
}

// Cancel cancels an appointment.
func (s *appointmentService) Cancel(ctx context.Context, clinicID, id, userID string, req *model.CancelAppointmentRequest) error {
	// Get existing appointment
	existing, err := s.repo.GetByID(ctx, clinicID, id)
	if err != nil {
		return err
	}

	// Check if already cancelled or completed
	if existing.Status == model.AppointmentStatusCancelled {
		return fmt.Errorf("appointment is already cancelled")
	}
	if existing.Status == model.AppointmentStatusCompleted {
		return fmt.Errorf("cannot cancel a completed appointment")
	}

	// Update appointment status
	appointment := &existing.Appointment
	appointment.Status = model.AppointmentStatusCancelled
	appointment.CancellationReason = req.Reason
	appointment.UpdatedBy = &userID

	if err := s.repo.Update(ctx, appointment); err != nil {
		return err
	}

	log.Info().
		Str("appointment_id", id).
		Str("clinic_id", clinicID).
		Str("cancelled_by", userID).
		Str("reason", req.Reason).
		Msg("appointment cancelled")

	// Cancel future recurring appointments if requested
	if req.CancelSeries && existing.RecurrenceID != nil {
		if err := s.repo.CancelByRecurrenceID(ctx, clinicID, *existing.RecurrenceID, req.Reason, existing.StartTime); err != nil {
			log.Warn().Err(err).Str("recurrence_id", *existing.RecurrenceID).Msg("failed to cancel recurring appointments")
		}
	}

	return nil
}

// Delete deletes an appointment.
func (s *appointmentService) Delete(ctx context.Context, clinicID, id string) error {
	if err := s.repo.Delete(ctx, clinicID, id); err != nil {
		return err
	}

	log.Info().
		Str("appointment_id", id).
		Str("clinic_id", clinicID).
		Msg("appointment deleted")

	return nil
}

// List returns a paginated list of appointments.
func (s *appointmentService) List(ctx context.Context, params model.AppointmentSearchParams) (*model.AppointmentListResponse, error) {
	appointments, total, err := s.repo.List(ctx, params)
	if err != nil {
		return nil, err
	}

	perPage := params.Limit()
	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}

	return &model.AppointmentListResponse{
		Data:       appointments,
		Total:      total,
		Page:       params.Page,
		PerPage:    perPage,
		TotalPages: totalPages,
	}, nil
}

// GetByDateRange retrieves appointments within a date range.
func (s *appointmentService) GetByDateRange(ctx context.Context, clinicID string, start, end time.Time) ([]model.AppointmentWithDetails, error) {
	return s.repo.GetByDateRange(ctx, clinicID, start, end)
}

// GetByPatient retrieves appointments for a patient.
func (s *appointmentService) GetByPatient(ctx context.Context, clinicID, patientID string, limit int) ([]model.AppointmentWithDetails, error) {
	return s.repo.GetByPatient(ctx, clinicID, patientID, limit)
}

// GetByTherapist retrieves appointments for a therapist within a date range.
func (s *appointmentService) GetByTherapist(ctx context.Context, clinicID, therapistID string, start, end time.Time) ([]model.AppointmentWithDetails, error) {
	return s.repo.GetByTherapist(ctx, clinicID, therapistID, start, end)
}

// GetDaySchedule retrieves all appointments for a specific day.
func (s *appointmentService) GetDaySchedule(ctx context.Context, clinicID string, date time.Time) (*model.DaySchedule, error) {
	return s.repo.GetDaySchedule(ctx, clinicID, date)
}

// GetAvailableSlots retrieves available time slots for a therapist on a given date.
func (s *appointmentService) GetAvailableSlots(ctx context.Context, clinicID, therapistID string, date time.Time, duration int) ([]model.AvailabilitySlot, error) {
	slots, err := s.repo.GetAvailableSlots(ctx, clinicID, therapistID, date, duration)
	if err != nil {
		return nil, err
	}

	// Get therapist name if available
	therapists, _ := s.repo.GetTherapists(ctx, clinicID)
	for _, t := range therapists {
		if t.ID == therapistID {
			for i := range slots {
				slots[i].TherapistName = t.FullName
			}
			break
		}
	}

	return slots, nil
}

// Reschedule moves an appointment to a new time.
func (s *appointmentService) Reschedule(ctx context.Context, clinicID, id, userID string, newStartTime time.Time) (*model.AppointmentWithDetails, error) {
	// Get existing appointment
	existing, err := s.repo.GetByID(ctx, clinicID, id)
	if err != nil {
		return nil, err
	}

	// Check if can be rescheduled
	if existing.Status == model.AppointmentStatusCancelled {
		return nil, fmt.Errorf("cannot reschedule a cancelled appointment")
	}
	if existing.Status == model.AppointmentStatusCompleted {
		return nil, fmt.Errorf("cannot reschedule a completed appointment")
	}

	// Calculate new end time
	newEndTime := newStartTime.Add(time.Duration(existing.Duration) * time.Minute)

	// Check for conflicts
	conflicts, err := s.CheckConflicts(ctx, clinicID, existing.TherapistID, newStartTime, newEndTime, id)
	if err != nil {
		return nil, fmt.Errorf("failed to check conflicts: %w", err)
	}

	if len(conflicts) > 0 {
		return nil, fmt.Errorf("scheduling conflict: %s", conflicts[0].Message)
	}

	// Update appointment
	startTimeStr := newStartTime.Format(time.RFC3339)
	req := &model.UpdateAppointmentRequest{
		StartTime: &startTimeStr,
	}

	return s.Update(ctx, clinicID, id, userID, req)
}

// GetTherapists retrieves all active therapists for a clinic.
func (s *appointmentService) GetTherapists(ctx context.Context, clinicID string) ([]model.Therapist, error) {
	return s.repo.GetTherapists(ctx, clinicID)
}

// CheckConflicts checks for scheduling conflicts.
func (s *appointmentService) CheckConflicts(ctx context.Context, clinicID, therapistID string, start, end time.Time, excludeID string) ([]model.ConflictInfo, error) {
	conflicts, err := s.repo.FindConflicts(ctx, clinicID, therapistID, start, end, excludeID)
	if err != nil {
		return nil, err
	}

	var result []model.ConflictInfo
	for _, c := range conflicts {
		result = append(result, model.ConflictInfo{
			ConflictType: "overlap",
			Message:      fmt.Sprintf("Overlaps with existing appointment from %s to %s", c.StartTime.Format("15:04"), c.EndTime.Format("15:04")),
			Appointment:  &c,
		})
	}

	return result, nil
}
