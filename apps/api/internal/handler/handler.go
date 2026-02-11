package handler

import (
	"github.com/tqvdang/physioflow/apps/api/internal/service"
)

// Handler aggregates all HTTP handlers.
type Handler struct {
	Health          *HealthHandler
	Patient         *PatientHandler
	Checklist       *ChecklistHandler
	QuickActions    *QuickActionsHandler
	Appointment     *AppointmentHandler
	Exercise        *ExerciseHandler
	OutcomeMeasures *OutcomeMeasuresHandler
	Insurance       *InsuranceHandler
	Billing         *BillingHandler
	MedicalTerms    *MedicalTermsHandler
	Protocol        *ProtocolHandler
	Discharge       *DischargeHandler
	PainLocation    *PainLocationHandler
	ROM             *ROMHandler
	MMT             *MMTHandler
	BHYTClaim        *BHYTClaimHandler
	Report           *ReportHandler
	Reevaluation         *ReevaluationHandler
	FinancialReport      *FinancialReportHandler
	AssessmentTemplate   *AssessmentTemplateHandler
	SpecialTest          *SpecialTestHandler
}

// New creates a new Handler with all sub-handlers initialized.
func New(svc *service.Service) *Handler {
	return &Handler{
		Health:          NewHealthHandler(svc),
		Patient:         NewPatientHandler(svc),
		Checklist:       NewChecklistHandler(svc),
		QuickActions:    NewQuickActionsHandler(svc),
		Appointment:     NewAppointmentHandler(svc),
		Exercise:        NewExerciseHandler(svc),
		OutcomeMeasures: NewOutcomeMeasuresHandler(svc),
		Insurance:       NewInsuranceHandler(svc),
		Billing:         NewBillingHandler(svc),
		MedicalTerms:    NewMedicalTermsHandler(svc),
		Protocol:        NewProtocolHandler(svc),
		Discharge:       NewDischargeHandler(svc),
		PainLocation:    NewPainLocationHandler(svc),
		ROM:             NewROMHandler(svc),
		MMT:             NewMMTHandler(svc),
		BHYTClaim:       NewBHYTClaimHandler(svc),
		Report:          NewReportHandler(svc),
		Reevaluation:       NewReevaluationHandler(svc),
		FinancialReport:    NewFinancialReportHandler(svc),
		AssessmentTemplate: NewAssessmentTemplateHandler(svc),
		SpecialTest:        NewSpecialTestHandler(svc),
	}
}
