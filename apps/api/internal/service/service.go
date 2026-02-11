package service

import (
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
)

// Service provides business logic operations.
type Service struct {
	repo            *repository.Repository
	patient         PatientService
	checklist       ChecklistService
	quickActions    QuickActionsService
	appointment     AppointmentService
	exercise        ExerciseService
	outcomeMeasures OutcomeMeasuresService
	insurance       InsuranceService
	billing         BillingService
	medicalTerms    MedicalTermsService
	protocol        ProtocolService
	discharge       DischargeService
	painLocation    PainLocationService
	rom             ROMService
	mmt             MMTService
	bhytClaim       BHYTClaimService
	report          ReportService
}

// New creates a new Service instance.
func New(repo *repository.Repository) *Service {
	svc := &Service{repo: repo}
	svc.patient = NewPatientService(repo.Patient(), repo.Clinic())
	svc.checklist = newChecklistService(repo)
	svc.quickActions = newQuickActionsService(repo)
	svc.appointment = NewAppointmentService(repo.Appointment())
	svc.exercise = NewExerciseService(repo.Exercise(), repo.Patient())
	svc.outcomeMeasures = NewOutcomeMeasuresService(repo.OutcomeMeasures())
	svc.insurance = NewInsuranceService(repo.Insurance(), repo.Audit())
	svc.billing = NewBillingService(repo.Billing(), repo.Patient())
	svc.medicalTerms = NewMedicalTermsService(repo.MedicalTerms())
	svc.protocol = NewProtocolService(repo.Protocol())
	svc.discharge = NewDischargeService(repo.Discharge(), svc.outcomeMeasures, svc.exercise)
	svc.painLocation = NewPainLocationService(repo.PainLocation())
	svc.rom = NewROMService(repo.ROM())
	svc.mmt = NewMMTService(repo.MMT())
	svc.bhytClaim = NewBHYTClaimService(repo.BHYTClaim())
	svc.report = NewReportService(repo.Report(), repo.Discharge(), repo.Billing(), repo.Patient())
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

// OutcomeMeasures returns the outcome measures service.
func (s *Service) OutcomeMeasures() OutcomeMeasuresService {
	return s.outcomeMeasures
}

// Insurance returns the insurance service.
func (s *Service) Insurance() InsuranceService {
	return s.insurance
}

// Billing returns the billing service.
func (s *Service) Billing() BillingService {
	return s.billing
}

// MedicalTerms returns the medical terms service.
func (s *Service) MedicalTerms() MedicalTermsService {
	return s.medicalTerms
}

// Protocol returns the clinical protocol service.
func (s *Service) Protocol() ProtocolService {
	return s.protocol
}

// Discharge returns the discharge service.
func (s *Service) Discharge() DischargeService {
	return s.discharge
}

// PainLocation returns the pain location service.
func (s *Service) PainLocation() PainLocationService {
	return s.painLocation
}

// ROM returns the ROM assessment service.
func (s *Service) ROM() ROMService {
	return s.rom
}

// MMT returns the MMT assessment service.
func (s *Service) MMT() MMTService {
	return s.mmt
}

// BHYTClaim returns the BHYT claim service.
func (s *Service) BHYTClaim() BHYTClaimService {
	return s.bhytClaim
}

// Report returns the report generation service.
func (s *Service) Report() ReportService {
	return s.report
}

// CheckDatabase verifies database connectivity.
func (s *Service) CheckDatabase() error {
	return s.repo.CheckDatabase()
}

// CheckRedis verifies Redis connectivity.
func (s *Service) CheckRedis() error {
	return s.repo.CheckRedis()
}
