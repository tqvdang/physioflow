package service

import (
	"context"
	"fmt"
	"time"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
)

// QuickActionsService defines the interface for quick action operations.
type QuickActionsService interface {
	// Pain tracking
	RecordPain(ctx context.Context, record model.QuickPainRecord) (string, *model.PainDelta, error)
	GetPainHistory(ctx context.Context, patientID string, limit int) ([]model.QuickPainRecord, error)

	// ROM tracking
	RecordROM(ctx context.Context, record model.QuickROMRecord) (string, *ROMDelta, error)
	GetROMHistory(ctx context.Context, patientID, joint string, limit int) ([]model.QuickROMRecord, error)

	// Quick scheduling
	QuickSchedule(ctx context.Context, req model.QuickScheduleRequest) (*QuickScheduleResult, error)
}

// ROMDelta represents the change in ROM from a previous measurement.
type ROMDelta struct {
	CurrentActive   *float64 `json:"current_active,omitempty"`
	PreviousActive  *float64 `json:"previous_active,omitempty"`
	DeltaActive     *float64 `json:"delta_active,omitempty"`
	CurrentPassive  *float64 `json:"current_passive,omitempty"`
	PreviousPassive *float64 `json:"previous_passive,omitempty"`
	DeltaPassive    *float64 `json:"delta_passive,omitempty"`
	Trend           string   `json:"trend"` // improved, worsened, stable, first_record
}

// QuickScheduleResult represents the result of a quick schedule operation.
type QuickScheduleResult struct {
	ID          string `json:"id"`
	PatientID   string `json:"patient_id"`
	TherapistID string `json:"therapist_id"`
	Date        string `json:"date"`
	TimeSlot    string `json:"time_slot"`
	Duration    int    `json:"duration"`
	Status      string `json:"status"`
	Notes       string `json:"notes,omitempty"`
	CreatedAt   string `json:"created_at"`
}

// quickActionsService implements QuickActionsService.
type quickActionsService struct {
	repo *repository.Repository
}

// newQuickActionsService creates a new QuickActionsService.
func newQuickActionsService(repo *repository.Repository) *quickActionsService {
	return &quickActionsService{repo: repo}
}

// RecordPain records a pain measurement and calculates delta.
func (s *quickActionsService) RecordPain(ctx context.Context, record model.QuickPainRecord) (string, *model.PainDelta, error) {
	// Get the last pain record for this patient
	lastRecord, err := s.repo.QuickActions().GetLastPainRecord(ctx, record.PatientID)

	// Create the new record
	id, err := s.repo.QuickActions().CreatePainRecord(ctx, record)
	if err != nil {
		return "", nil, fmt.Errorf("failed to create pain record: %w", err)
	}

	// Calculate delta
	delta := &model.PainDelta{
		CurrentLevel: record.Level,
		Trend:        "first_record",
	}

	if lastRecord != nil {
		delta.PreviousLevel = &lastRecord.Level
		d := lastRecord.Level - record.Level // Positive delta = improvement
		delta.Delta = &d

		if lastRecord.Level > 0 {
			pct := float64(d) / float64(lastRecord.Level) * 100
			delta.DeltaPercent = &pct
		}

		if d > 0 {
			delta.Trend = "improved"
		} else if d < 0 {
			delta.Trend = "worsened"
		} else {
			delta.Trend = "stable"
		}
	}

	return id, delta, nil
}

// GetPainHistory retrieves recent pain records.
func (s *quickActionsService) GetPainHistory(ctx context.Context, patientID string, limit int) ([]model.QuickPainRecord, error) {
	return s.repo.QuickActions().GetPainHistory(ctx, patientID, limit)
}

// RecordROM records a ROM measurement and calculates delta.
func (s *quickActionsService) RecordROM(ctx context.Context, record model.QuickROMRecord) (string, *ROMDelta, error) {
	// Get the last ROM record for this joint/movement
	lastRecord, err := s.repo.QuickActions().GetLastROMRecord(ctx, record.PatientID, record.Joint, record.Movement, record.Side)

	// Create the new record
	id, err := s.repo.QuickActions().CreateROMRecord(ctx, record)
	if err != nil {
		return "", nil, fmt.Errorf("failed to create ROM record: %w", err)
	}

	// Calculate delta
	delta := &ROMDelta{
		CurrentActive:  record.ActiveROM,
		CurrentPassive: record.PassiveROM,
		Trend:          "first_record",
	}

	if lastRecord != nil {
		delta.PreviousActive = lastRecord.ActiveROM
		delta.PreviousPassive = lastRecord.PassiveROM

		// Calculate active ROM delta
		if record.ActiveROM != nil && lastRecord.ActiveROM != nil {
			d := *record.ActiveROM - *lastRecord.ActiveROM
			delta.DeltaActive = &d
		}

		// Calculate passive ROM delta
		if record.PassiveROM != nil && lastRecord.PassiveROM != nil {
			d := *record.PassiveROM - *lastRecord.PassiveROM
			delta.DeltaPassive = &d
		}

		// Determine trend (positive delta = improvement for ROM)
		overallDelta := 0.0
		count := 0
		if delta.DeltaActive != nil {
			overallDelta += *delta.DeltaActive
			count++
		}
		if delta.DeltaPassive != nil {
			overallDelta += *delta.DeltaPassive
			count++
		}

		if count > 0 {
			avgDelta := overallDelta / float64(count)
			if avgDelta > 1 {
				delta.Trend = "improved"
			} else if avgDelta < -1 {
				delta.Trend = "worsened"
			} else {
				delta.Trend = "stable"
			}
		}
	}

	return id, delta, nil
}

// GetROMHistory retrieves recent ROM records.
func (s *quickActionsService) GetROMHistory(ctx context.Context, patientID, joint string, limit int) ([]model.QuickROMRecord, error) {
	return s.repo.QuickActions().GetROMHistory(ctx, patientID, joint, limit)
}

// QuickSchedule creates a quick appointment.
func (s *quickActionsService) QuickSchedule(ctx context.Context, req model.QuickScheduleRequest) (*QuickScheduleResult, error) {
	// Check for scheduling conflicts
	available, err := s.repo.QuickActions().CheckTimeSlotAvailable(ctx, req.ClinicID, req.TherapistID, req.Date, req.TimeSlot, req.Duration)
	if err != nil {
		return nil, fmt.Errorf("failed to check availability: %w", err)
	}
	if !available {
		return nil, fmt.Errorf("time slot not available")
	}

	// Create the appointment
	id, err := s.repo.QuickActions().CreateAppointment(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to create appointment: %w", err)
	}

	return &QuickScheduleResult{
		ID:          id,
		PatientID:   req.PatientID,
		TherapistID: req.TherapistID,
		Date:        req.Date,
		TimeSlot:    req.TimeSlot,
		Duration:    req.Duration,
		Status:      "scheduled",
		Notes:       req.Notes,
		CreatedAt:   time.Now().Format("2006-01-02T15:04:05Z07:00"),
	}, nil
}
