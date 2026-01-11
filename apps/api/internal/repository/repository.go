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
