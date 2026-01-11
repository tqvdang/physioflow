package handler

import (
	"github.com/tqvdang/physioflow/apps/api/internal/service"
)

// Handler aggregates all HTTP handlers.
type Handler struct {
	Health       *HealthHandler
	Patient      *PatientHandler
	Checklist    *ChecklistHandler
	QuickActions *QuickActionsHandler
	Appointment  *AppointmentHandler
	Exercise     *ExerciseHandler
}

// New creates a new Handler with all sub-handlers initialized.
func New(svc *service.Service) *Handler {
	return &Handler{
		Health:       NewHealthHandler(svc),
		Patient:      NewPatientHandler(svc),
		Checklist:    NewChecklistHandler(svc),
		QuickActions: NewQuickActionsHandler(svc),
		Appointment:  NewAppointmentHandler(svc),
		Exercise:     NewExerciseHandler(svc),
	}
}
