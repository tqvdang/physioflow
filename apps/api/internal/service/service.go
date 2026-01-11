package service

import (
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
)

// Service provides business logic operations.
type Service struct {
	repo         *repository.Repository
	patient      PatientService
	checklist    ChecklistService
	quickActions QuickActionsService
	appointment  AppointmentService
	exercise     ExerciseService
}

// New creates a new Service instance.
func New(repo *repository.Repository) *Service {
	svc := &Service{repo: repo}
	svc.patient = NewPatientService(repo.Patient(), repo.Clinic())
	svc.checklist = newChecklistService(repo)
	svc.quickActions = newQuickActionsService(repo)
	svc.appointment = NewAppointmentService(repo.Appointment())
	svc.exercise = NewExerciseService(repo.Exercise(), repo.Patient())
	return svc
}

// Patient returns the patient service.
func (s *Service) Patient() PatientService {
	return s.patient
}

// Checklist returns the checklist service.
func (s *Service) Checklist() ChecklistService {
	return s.checklist
}

// QuickActions returns the quick actions service.
func (s *Service) QuickActions() QuickActionsService {
	return s.quickActions
}

// Appointment returns the appointment service.
func (s *Service) Appointment() AppointmentService {
	return s.appointment
}

// Exercise returns the exercise service.
func (s *Service) Exercise() ExerciseService {
	return s.exercise
}

// CheckDatabase verifies database connectivity.
func (s *Service) CheckDatabase() error {
	return s.repo.CheckDatabase()
}

// CheckRedis verifies Redis connectivity.
func (s *Service) CheckRedis() error {
	return s.repo.CheckRedis()
}
