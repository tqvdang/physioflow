package repository

import (
	"context"
	"errors"

	"github.com/tqvdang/physioflow/apps/api/internal/config"
	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// Common errors
var (
	ErrNotFound      = errors.New("record not found")
	ErrAlreadyExists = errors.New("record already exists")
	ErrInvalidInput  = errors.New("invalid input")
)

// Repository provides access to the data store.
type Repository struct {
	cfg               *config.Config
	db                *DB
	patient           PatientRepository
	user              UserRepository
	clinic            ClinicRepository
	checklistTemplate ChecklistTemplateRepository
	visitChecklist    VisitChecklistRepository
	quickActions      QuickActionsRepository
	appointment       AppointmentRepository
	exercise          ExerciseRepository
	outcomeMeasures   OutcomeMeasuresRepository
	insurance         InsuranceRepository
	audit             AuditRepository
	billing           BillingRepository
	medicalTerms      MedicalTermsRepository
	protocol          ProtocolRepository
	discharge         DischargeRepository
	painLocation      PainLocationRepository
	rom               ROMRepository
	mmt               MMTRepository
	bhytClaim            BHYTClaimRepository
	report               ReportRepository
	reevaluation         ReevaluationRepository
	assessmentTemplate   AssessmentTemplateRepository
	financialReport      FinancialReportRepository
	specialTest          SpecialTestRepository
}

// New creates a new Repository instance without database connection.
// Use NewWithDB for production use with actual database.
func New(cfg *config.Config) *Repository {
	return &Repository{
		cfg:               cfg,
		patient:           &mockPatientRepo{},
		user:              &userRepo{cfg: cfg},
		clinic:            &mockClinicRepo{},
		checklistTemplate: nil,
		visitChecklist:    nil,
		quickActions:      &mockQuickActionsRepo{},
		appointment:       &mockAppointmentRepo{},
		exercise:          NewMockExerciseRepository(),
		outcomeMeasures:   NewMockOutcomeMeasuresRepository(),
		insurance:         &mockInsuranceRepo{},
		audit:             &mockAuditRepo{},
		billing:           NewMockBillingRepository(),
		medicalTerms:      NewMockMedicalTermsRepository(),
		protocol:          NewMockProtocolRepository(),
		discharge:         NewMockDischargeRepository(),
		painLocation:      NewMockPainLocationRepository(),
		rom:               NewMockROMRepository(),
		mmt:               NewMockMMTRepository(),
		bhytClaim:         NewMockBHYTClaimRepository(),
		report:             NewMockReportRepository(),
		reevaluation:       NewMockReevaluationRepository(),
		assessmentTemplate: NewMockAssessmentTemplateRepository(),
		financialReport:    NewMockFinancialReportRepository(),
		specialTest:        NewMockSpecialTestRepository(),
	}
}

// NewWithDB creates a new Repository instance with database connection.
func NewWithDB(cfg *config.Config, db *DB) *Repository {
	return &Repository{
		cfg:               cfg,
		db:                db,
		patient:           NewPatientRepository(db),
		user:              &userRepo{cfg: cfg, db: db},
		clinic:            NewClinicRepository(db),
		checklistTemplate: newChecklistTemplateRepo(cfg, db),
		visitChecklist:    newVisitChecklistRepo(cfg, db),
		quickActions:      newQuickActionsRepo(cfg, db),
		appointment:       NewAppointmentRepository(db),
		exercise:          NewExerciseRepository(db),
		outcomeMeasures:   NewOutcomeMeasuresRepository(db),
		insurance:         NewInsuranceRepository(db),
		audit:             NewAuditRepository(db),
		billing:           NewBillingRepository(db),
		medicalTerms:      NewMedicalTermsRepository(db),
		protocol:          NewProtocolRepository(db),
		discharge:         NewDischargeRepository(db),
		painLocation:      NewPainLocationRepository(db),
		rom:               NewROMRepository(db),
		mmt:               NewMMTRepository(db),
		bhytClaim:         NewBHYTClaimRepository(db),
		report:             NewReportRepository(db),
		reevaluation:       NewReevaluationRepository(db),
		assessmentTemplate: NewAssessmentTemplateRepository(db),
		financialReport:    NewFinancialReportRepository(db),
		specialTest:        NewSpecialTestRepository(db),
	}
}

// DB returns the database connection.
func (r *Repository) DB() *DB {
	return r.db
}

// Patient returns the patient repository.
func (r *Repository) Patient() PatientRepository {
	return r.patient
}

// User returns the user repository.
func (r *Repository) User() UserRepository {
	return r.user
}

// Clinic returns the clinic repository.
func (r *Repository) Clinic() ClinicRepository {
	return r.clinic
}

// ChecklistTemplate returns the checklist template repository.
func (r *Repository) ChecklistTemplate() ChecklistTemplateRepository {
	return r.checklistTemplate
}

// VisitChecklist returns the visit checklist repository.
func (r *Repository) VisitChecklist() VisitChecklistRepository {
	return r.visitChecklist
}

// QuickActions returns the quick actions repository.
func (r *Repository) QuickActions() QuickActionsRepository {
	return r.quickActions
}

// Appointment returns the appointment repository.
func (r *Repository) Appointment() AppointmentRepository {
	return r.appointment
}

// Exercise returns the exercise repository.
func (r *Repository) Exercise() ExerciseRepository {
	return r.exercise
}

// OutcomeMeasures returns the outcome measures repository.
func (r *Repository) OutcomeMeasures() OutcomeMeasuresRepository {
	return r.outcomeMeasures
}

// Insurance returns the insurance repository.
func (r *Repository) Insurance() InsuranceRepository {
	return r.insurance
}

// Audit returns the audit repository.
func (r *Repository) Audit() AuditRepository {
	return r.audit
}

// Billing returns the billing repository.
func (r *Repository) Billing() BillingRepository {
	return r.billing
}

// MedicalTerms returns the medical terms repository.
func (r *Repository) MedicalTerms() MedicalTermsRepository {
	return r.medicalTerms
}

// Protocol returns the clinical protocol repository.
func (r *Repository) Protocol() ProtocolRepository {
	return r.protocol
}

// Discharge returns the discharge repository.
func (r *Repository) Discharge() DischargeRepository {
	return r.discharge
}

// PainLocation returns the pain location repository.
func (r *Repository) PainLocation() PainLocationRepository {
	return r.painLocation
}

// ROM returns the ROM assessment repository.
func (r *Repository) ROM() ROMRepository {
	return r.rom
}

// MMT returns the MMT assessment repository.
func (r *Repository) MMT() MMTRepository {
	return r.mmt
}

// BHYTClaim returns the BHYT claim repository.
func (r *Repository) BHYTClaim() BHYTClaimRepository {
	return r.bhytClaim
}

// Report returns the report repository.
func (r *Repository) Report() ReportRepository {
	return r.report
}

// Reevaluation returns the re-evaluation repository.
func (r *Repository) Reevaluation() ReevaluationRepository {
	return r.reevaluation
}

// FinancialReport returns the financial report repository.
func (r *Repository) FinancialReport() FinancialReportRepository {
	return r.financialReport
}

// AssessmentTemplate returns the assessment template repository.
func (r *Repository) AssessmentTemplate() AssessmentTemplateRepository {
	return r.assessmentTemplate
}

// SpecialTest returns the special test repository.
func (r *Repository) SpecialTest() SpecialTestRepository {
	return r.specialTest
}

// CheckDatabase verifies database connectivity.
func (r *Repository) CheckDatabase() error {
	if r.db == nil {
		return nil // No database configured (mock mode)
	}
	return r.db.Ping(context.Background())
}

// CheckRedis verifies Redis connectivity.
func (r *Repository) CheckRedis() error {
	// TODO: Implement actual Redis ping
	return nil
}

// Close closes all repository connections.
func (r *Repository) Close() error {
	if r.db != nil {
		return r.db.Close()
	}
	return nil
}

// UserRepository defines the interface for user data access.
type UserRepository interface {
	GetByID(ctx context.Context, id string) (*model.User, error)
	GetByEmail(ctx context.Context, email string) (*model.User, error)
}

// ClinicRepository defines the interface for clinic data access.
type ClinicRepository interface {
	GetPrefix(ctx context.Context, clinicID string) (string, error)
}

// userRepo implements UserRepository.
type userRepo struct {
	cfg *config.Config
	db  *DB
}

func (r *userRepo) GetByID(ctx context.Context, id string) (*model.User, error) {
	if r.db == nil {
		return nil, ErrNotFound
	}
	// TODO: Implement database query
	return nil, ErrNotFound
}

func (r *userRepo) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	if r.db == nil {
		return nil, ErrNotFound
	}
	// TODO: Implement database query
	return nil, ErrNotFound
}

// clinicRepo implements ClinicRepository.
type clinicRepo struct {
	db *DB
}

// NewClinicRepository creates a new clinic repository.
func NewClinicRepository(db *DB) ClinicRepository {
	return &clinicRepo{db: db}
}

func (r *clinicRepo) GetPrefix(ctx context.Context, clinicID string) (string, error) {
	if r.db == nil {
		return "PF", nil
	}

	// Try to get prefix from clinic settings
	query := `
		SELECT COALESCE(settings->>'mrn_prefix', 'PF')
		FROM clinics
		WHERE id = $1`

	var prefix string
	if err := r.db.QueryRowContext(ctx, query, clinicID).Scan(&prefix); err != nil {
		return "PF", nil // Default prefix
	}

	return prefix, nil
}

// mockPatientRepo provides a mock implementation for development.
type mockPatientRepo struct{}

func (r *mockPatientRepo) Create(ctx context.Context, patient *model.Patient) error {
	return nil
}

func (r *mockPatientRepo) GetByID(ctx context.Context, clinicID, id string) (*model.Patient, error) {
	return nil, ErrNotFound
}

func (r *mockPatientRepo) GetByMRN(ctx context.Context, clinicID, mrn string) (*model.Patient, error) {
	return nil, ErrNotFound
}

func (r *mockPatientRepo) Update(ctx context.Context, patient *model.Patient) error {
	return nil
}

func (r *mockPatientRepo) Delete(ctx context.Context, clinicID, id string) error {
	return nil
}

func (r *mockPatientRepo) List(ctx context.Context, params model.PatientSearchParams) ([]model.Patient, int64, error) {
	return []model.Patient{}, 0, nil
}

func (r *mockPatientRepo) Search(ctx context.Context, clinicID, query string, limit int) ([]model.Patient, error) {
	return []model.Patient{}, nil
}

func (r *mockPatientRepo) FindDuplicates(ctx context.Context, clinicID, phone, firstName, lastName string) ([]model.DuplicatePatientMatch, error) {
	return []model.DuplicatePatientMatch{}, nil
}

func (r *mockPatientRepo) GetNextMRNSequence(ctx context.Context, clinicID string) (int64, error) {
	return 1, nil
}

func (r *mockPatientRepo) GetDashboard(ctx context.Context, clinicID, patientID string) (*model.PatientDashboard, error) {
	return nil, ErrNotFound
}

func (r *mockPatientRepo) GetInsuranceInfo(ctx context.Context, patientID string) ([]model.PatientInsurance, error) {
	return []model.PatientInsurance{}, nil
}

func (r *mockPatientRepo) CountByClinic(ctx context.Context, clinicID string) (int64, error) {
	return 0, nil
}

// mockClinicRepo provides a mock implementation for development.
type mockClinicRepo struct{}

func (r *mockClinicRepo) GetPrefix(ctx context.Context, clinicID string) (string, error) {
	return "PF", nil
}
