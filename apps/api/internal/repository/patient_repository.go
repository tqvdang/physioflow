package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/lib/pq"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// PatientRepository defines the interface for patient data access.
type PatientRepository interface {
	Create(ctx context.Context, patient *model.Patient) error
	GetByID(ctx context.Context, clinicID, id string) (*model.Patient, error)
	GetByMRN(ctx context.Context, clinicID, mrn string) (*model.Patient, error)
	Update(ctx context.Context, patient *model.Patient) error
	Delete(ctx context.Context, clinicID, id string) error
	List(ctx context.Context, params model.PatientSearchParams) ([]model.Patient, int64, error)
	Search(ctx context.Context, clinicID, query string, limit int) ([]model.Patient, error)
	FindDuplicates(ctx context.Context, clinicID, phone, firstName, lastName string) ([]model.DuplicatePatientMatch, error)
	GetNextMRNSequence(ctx context.Context, clinicID string) (int64, error)
	GetDashboard(ctx context.Context, clinicID, patientID string) (*model.PatientDashboard, error)
	GetInsuranceInfo(ctx context.Context, patientID string) ([]model.PatientInsurance, error)
	CountByClinic(ctx context.Context, clinicID string) (int64, error)
}

// postgresPatientRepo implements PatientRepository with PostgreSQL.
type postgresPatientRepo struct {
	db *DB
}

// NewPatientRepository creates a new PostgreSQL patient repository.
func NewPatientRepository(db *DB) PatientRepository {
	return &postgresPatientRepo{db: db}
}

// Create inserts a new patient record.
func (r *postgresPatientRepo) Create(ctx context.Context, patient *model.Patient) error {
	query := `
		INSERT INTO patients (
			id, clinic_id, mrn, first_name, last_name, first_name_vi, last_name_vi,
			date_of_birth, gender, phone, email, address, address_vi,
			language_preference, emergency_contact, medical_alerts, notes,
			is_active, created_by, updated_by
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $19
		)
		RETURNING created_at, updated_at`

	emergencyContactJSON, err := json.Marshal(patient.EmergencyContact)
	if err != nil {
		return fmt.Errorf("failed to marshal emergency contact: %w", err)
	}

	err = r.db.QueryRowContext(ctx, query,
		patient.ID,
		patient.ClinicID,
		patient.MRN,
		patient.FirstName,
		patient.LastName,
		NullableStringValue(patient.FirstNameVi),
		NullableStringValue(patient.LastNameVi),
		patient.DateOfBirth,
		patient.Gender,
		NullableStringValue(patient.Phone),
		NullableStringValue(patient.Email),
		NullableStringValue(patient.Address),
		NullableStringValue(patient.AddressVi),
		patient.LanguagePreference,
		emergencyContactJSON,
		pq.Array(patient.MedicalAlerts),
		NullableStringValue(patient.Notes),
		patient.IsActive,
		NullableString(patient.CreatedBy),
	).Scan(&patient.CreatedAt, &patient.UpdatedAt)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == "23505" { // unique_violation
				if strings.Contains(pqErr.Constraint, "mrn") {
					return fmt.Errorf("%w: MRN already exists", ErrAlreadyExists)
				}
				return ErrAlreadyExists
			}
		}
		return fmt.Errorf("failed to create patient: %w", err)
	}

	return nil
}

// GetByID retrieves a patient by ID.
func (r *postgresPatientRepo) GetByID(ctx context.Context, clinicID, id string) (*model.Patient, error) {
	query := `
		SELECT
			id, clinic_id, mrn, first_name, last_name, first_name_vi, last_name_vi,
			date_of_birth, gender, phone, email, address, address_vi,
			language_preference, emergency_contact, medical_alerts, notes,
			is_active, created_at, updated_at, created_by, updated_by
		FROM patients
		WHERE id = $1 AND clinic_id = $2 AND is_active = true`

	return r.scanPatient(r.db.QueryRowContext(ctx, query, id, clinicID))
}

// GetByMRN retrieves a patient by MRN.
func (r *postgresPatientRepo) GetByMRN(ctx context.Context, clinicID, mrn string) (*model.Patient, error) {
	query := `
		SELECT
			id, clinic_id, mrn, first_name, last_name, first_name_vi, last_name_vi,
			date_of_birth, gender, phone, email, address, address_vi,
			language_preference, emergency_contact, medical_alerts, notes,
			is_active, created_at, updated_at, created_by, updated_by
		FROM patients
		WHERE mrn = $1 AND clinic_id = $2 AND is_active = true`

	return r.scanPatient(r.db.QueryRowContext(ctx, query, mrn, clinicID))
}

// scanPatient scans a patient row into a Patient struct.
func (r *postgresPatientRepo) scanPatient(row *sql.Row) (*model.Patient, error) {
	var p model.Patient
	var firstNameVi, lastNameVi, phone, email, address, addressVi, notes sql.NullString
	var createdBy, updatedBy sql.NullString
	var emergencyContactJSON []byte
	var medicalAlerts []string

	err := row.Scan(
		&p.ID,
		&p.ClinicID,
		&p.MRN,
		&p.FirstName,
		&p.LastName,
		&firstNameVi,
		&lastNameVi,
		&p.DateOfBirth,
		&p.Gender,
		&phone,
		&email,
		&address,
		&addressVi,
		&p.LanguagePreference,
		&emergencyContactJSON,
		pq.Array(&medicalAlerts),
		&notes,
		&p.IsActive,
		&p.CreatedAt,
		&p.UpdatedAt,
		&createdBy,
		&updatedBy,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan patient: %w", err)
	}

	p.FirstNameVi = StringFromNull(firstNameVi)
	p.LastNameVi = StringFromNull(lastNameVi)
	p.Phone = StringFromNull(phone)
	p.Email = StringFromNull(email)
	p.Address = StringFromNull(address)
	p.AddressVi = StringFromNull(addressVi)
	p.Notes = StringFromNull(notes)
	p.CreatedBy = StringPtrFromNull(createdBy)
	p.UpdatedBy = StringPtrFromNull(updatedBy)
	p.MedicalAlerts = medicalAlerts

	if len(emergencyContactJSON) > 0 {
		if err := json.Unmarshal(emergencyContactJSON, &p.EmergencyContact); err != nil {
			log.Warn().Err(err).Str("patient_id", p.ID).Msg("failed to unmarshal emergency contact")
		}
	}

	return &p, nil
}

// Update updates an existing patient record.
func (r *postgresPatientRepo) Update(ctx context.Context, patient *model.Patient) error {
	query := `
		UPDATE patients SET
			first_name = $1,
			last_name = $2,
			first_name_vi = $3,
			last_name_vi = $4,
			date_of_birth = $5,
			gender = $6,
			phone = $7,
			email = $8,
			address = $9,
			address_vi = $10,
			language_preference = $11,
			emergency_contact = $12,
			medical_alerts = $13,
			notes = $14,
			is_active = $15,
			updated_by = $16
		WHERE id = $17 AND clinic_id = $18
		RETURNING updated_at`

	emergencyContactJSON, err := json.Marshal(patient.EmergencyContact)
	if err != nil {
		return fmt.Errorf("failed to marshal emergency contact: %w", err)
	}

	result := r.db.QueryRowContext(ctx, query,
		patient.FirstName,
		patient.LastName,
		NullableStringValue(patient.FirstNameVi),
		NullableStringValue(patient.LastNameVi),
		patient.DateOfBirth,
		patient.Gender,
		NullableStringValue(patient.Phone),
		NullableStringValue(patient.Email),
		NullableStringValue(patient.Address),
		NullableStringValue(patient.AddressVi),
		patient.LanguagePreference,
		emergencyContactJSON,
		pq.Array(patient.MedicalAlerts),
		NullableStringValue(patient.Notes),
		patient.IsActive,
		NullableString(patient.UpdatedBy),
		patient.ID,
		patient.ClinicID,
	)

	if err := result.Scan(&patient.UpdatedAt); err != nil {
		if err == sql.ErrNoRows {
			return ErrNotFound
		}
		return fmt.Errorf("failed to update patient: %w", err)
	}

	return nil
}

// Delete performs a soft delete on a patient record.
func (r *postgresPatientRepo) Delete(ctx context.Context, clinicID, id string) error {
	query := `
		UPDATE patients
		SET is_active = false, updated_at = NOW()
		WHERE id = $1 AND clinic_id = $2 AND is_active = true`

	result, err := r.db.ExecContext(ctx, query, id, clinicID)
	if err != nil {
		return fmt.Errorf("failed to delete patient: %w", err)
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

// List returns a paginated list of patients with filtering.
func (r *postgresPatientRepo) List(ctx context.Context, params model.PatientSearchParams) ([]model.Patient, int64, error) {
	// Build WHERE clause
	conditions := []string{"clinic_id = $1"}
	args := []interface{}{params.ClinicID}
	argIdx := 2

	if params.IsActive != nil {
		conditions = append(conditions, fmt.Sprintf("is_active = $%d", argIdx))
		args = append(args, *params.IsActive)
		argIdx++
	}

	if params.Gender != "" {
		conditions = append(conditions, fmt.Sprintf("gender = $%d", argIdx))
		args = append(args, params.Gender)
		argIdx++
	}

	if params.Search != "" {
		// Use trigram similarity for Vietnamese name search
		searchCondition := fmt.Sprintf(`(
			first_name || ' ' || last_name ILIKE $%d
			OR last_name || ' ' || first_name ILIKE $%d
			OR COALESCE(first_name_vi, '') || ' ' || COALESCE(last_name_vi, '') ILIKE $%d
			OR COALESCE(last_name_vi, '') || ' ' || COALESCE(first_name_vi, '') ILIKE $%d
			OR mrn ILIKE $%d
			OR phone ILIKE $%d
			OR email ILIKE $%d
			OR (first_name || ' ' || last_name) %% $%d
		)`, argIdx, argIdx, argIdx, argIdx, argIdx, argIdx, argIdx, argIdx+1)
		conditions = append(conditions, searchCondition)
		searchPattern := "%" + params.Search + "%"
		args = append(args, searchPattern, params.Search)
		argIdx += 2
	}

	if params.MinAge != nil || params.MaxAge != nil {
		now := time.Now()
		if params.MinAge != nil {
			maxDOB := now.AddDate(-*params.MinAge, 0, 0)
			conditions = append(conditions, fmt.Sprintf("date_of_birth <= $%d", argIdx))
			args = append(args, maxDOB)
			argIdx++
		}
		if params.MaxAge != nil {
			minDOB := now.AddDate(-*params.MaxAge-1, 0, 0)
			conditions = append(conditions, fmt.Sprintf("date_of_birth > $%d", argIdx))
			args = append(args, minDOB)
			argIdx++
		}
	}

	whereClause := strings.Join(conditions, " AND ")

	// Count total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM patients WHERE %s", whereClause)
	var total int64
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count patients: %w", err)
	}

	if total == 0 {
		return []model.Patient{}, 0, nil
	}

	// Build ORDER BY clause
	orderBy := "created_at DESC"
	allowedSortFields := map[string]bool{
		"created_at":    true,
		"updated_at":    true,
		"first_name":    true,
		"last_name":     true,
		"date_of_birth": true,
		"mrn":           true,
	}
	if params.SortBy != "" && allowedSortFields[params.SortBy] {
		order := "ASC"
		if strings.ToUpper(params.SortOrder) == "DESC" {
			order = "DESC"
		}
		orderBy = fmt.Sprintf("%s %s", params.SortBy, order)
	}

	// Build main query
	query := fmt.Sprintf(`
		SELECT
			id, clinic_id, mrn, first_name, last_name, first_name_vi, last_name_vi,
			date_of_birth, gender, phone, email, address, address_vi,
			language_preference, emergency_contact, medical_alerts, notes,
			is_active, created_at, updated_at, created_by, updated_by
		FROM patients
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d`,
		whereClause, orderBy, argIdx, argIdx+1)

	args = append(args, params.Limit(), params.Offset())

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list patients: %w", err)
	}
	defer rows.Close()

	patients := make([]model.Patient, 0)
	for rows.Next() {
		p, err := r.scanPatientRows(rows)
		if err != nil {
			return nil, 0, err
		}
		patients = append(patients, *p)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating patients: %w", err)
	}

	return patients, total, nil
}

// scanPatientRows scans a patient from sql.Rows.
func (r *postgresPatientRepo) scanPatientRows(rows *sql.Rows) (*model.Patient, error) {
	var p model.Patient
	var firstNameVi, lastNameVi, phone, email, address, addressVi, notes sql.NullString
	var createdBy, updatedBy sql.NullString
	var emergencyContactJSON []byte
	var medicalAlerts []string

	err := rows.Scan(
		&p.ID,
		&p.ClinicID,
		&p.MRN,
		&p.FirstName,
		&p.LastName,
		&firstNameVi,
		&lastNameVi,
		&p.DateOfBirth,
		&p.Gender,
		&phone,
		&email,
		&address,
		&addressVi,
		&p.LanguagePreference,
		&emergencyContactJSON,
		pq.Array(&medicalAlerts),
		&notes,
		&p.IsActive,
		&p.CreatedAt,
		&p.UpdatedAt,
		&createdBy,
		&updatedBy,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to scan patient row: %w", err)
	}

	p.FirstNameVi = StringFromNull(firstNameVi)
	p.LastNameVi = StringFromNull(lastNameVi)
	p.Phone = StringFromNull(phone)
	p.Email = StringFromNull(email)
	p.Address = StringFromNull(address)
	p.AddressVi = StringFromNull(addressVi)
	p.Notes = StringFromNull(notes)
	p.CreatedBy = StringPtrFromNull(createdBy)
	p.UpdatedBy = StringPtrFromNull(updatedBy)
	p.MedicalAlerts = medicalAlerts

	if len(emergencyContactJSON) > 0 {
		if err := json.Unmarshal(emergencyContactJSON, &p.EmergencyContact); err != nil {
			log.Warn().Err(err).Str("patient_id", p.ID).Msg("failed to unmarshal emergency contact")
		}
	}

	return &p, nil
}

// Search performs a quick search for patients using trigram similarity.
func (r *postgresPatientRepo) Search(ctx context.Context, clinicID, query string, limit int) ([]model.Patient, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}

	searchQuery := `
		SELECT
			id, clinic_id, mrn, first_name, last_name, first_name_vi, last_name_vi,
			date_of_birth, gender, phone, email, address, address_vi,
			language_preference, emergency_contact, medical_alerts, notes,
			is_active, created_at, updated_at, created_by, updated_by,
			GREATEST(
				similarity(first_name || ' ' || last_name, $2),
				similarity(COALESCE(first_name_vi, '') || ' ' || COALESCE(last_name_vi, ''), $2),
				similarity(COALESCE(last_name_vi, '') || ' ' || COALESCE(first_name_vi, ''), $2)
			) as sim_score
		FROM patients
		WHERE clinic_id = $1
			AND is_active = true
			AND (
				first_name || ' ' || last_name ILIKE $3
				OR last_name || ' ' || first_name ILIKE $3
				OR COALESCE(first_name_vi, '') || ' ' || COALESCE(last_name_vi, '') ILIKE $3
				OR COALESCE(last_name_vi, '') || ' ' || COALESCE(first_name_vi, '') ILIKE $3
				OR mrn ILIKE $3
				OR phone ILIKE $3
				OR (first_name || ' ' || last_name) % $2
				OR (COALESCE(first_name_vi, '') || ' ' || COALESCE(last_name_vi, '')) % $2
			)
		ORDER BY sim_score DESC, last_name, first_name
		LIMIT $4`

	searchPattern := "%" + query + "%"
	rows, err := r.db.QueryContext(ctx, searchQuery, clinicID, query, searchPattern, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to search patients: %w", err)
	}
	defer rows.Close()

	patients := make([]model.Patient, 0)
	for rows.Next() {
		var p model.Patient
		var firstNameVi, lastNameVi, phone, email, address, addressVi, notes sql.NullString
		var createdBy, updatedBy sql.NullString
		var emergencyContactJSON []byte
		var medicalAlerts []string
		var simScore float64

		err := rows.Scan(
			&p.ID,
			&p.ClinicID,
			&p.MRN,
			&p.FirstName,
			&p.LastName,
			&firstNameVi,
			&lastNameVi,
			&p.DateOfBirth,
			&p.Gender,
			&phone,
			&email,
			&address,
			&addressVi,
			&p.LanguagePreference,
			&emergencyContactJSON,
			pq.Array(&medicalAlerts),
			&notes,
			&p.IsActive,
			&p.CreatedAt,
			&p.UpdatedAt,
			&createdBy,
			&updatedBy,
			&simScore,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan search result: %w", err)
		}

		p.FirstNameVi = StringFromNull(firstNameVi)
		p.LastNameVi = StringFromNull(lastNameVi)
		p.Phone = StringFromNull(phone)
		p.Email = StringFromNull(email)
		p.Address = StringFromNull(address)
		p.AddressVi = StringFromNull(addressVi)
		p.Notes = StringFromNull(notes)
		p.CreatedBy = StringPtrFromNull(createdBy)
		p.UpdatedBy = StringPtrFromNull(updatedBy)
		p.MedicalAlerts = medicalAlerts

		if len(emergencyContactJSON) > 0 {
			json.Unmarshal(emergencyContactJSON, &p.EmergencyContact)
		}

		patients = append(patients, p)
	}

	return patients, nil
}

// FindDuplicates finds potential duplicate patients by phone or name.
func (r *postgresPatientRepo) FindDuplicates(ctx context.Context, clinicID, phone, firstName, lastName string) ([]model.DuplicatePatientMatch, error) {
	query := `
		SELECT
			id, clinic_id, mrn, first_name, last_name, first_name_vi, last_name_vi,
			date_of_birth, gender, phone, email, address, address_vi,
			language_preference, emergency_contact, medical_alerts, notes,
			is_active, created_at, updated_at, created_by, updated_by,
			CASE
				WHEN phone IS NOT NULL AND phone = $2 THEN 'phone'
				ELSE 'name'
			END as match_type,
			CASE
				WHEN phone IS NOT NULL AND phone = $2 THEN 1.0
				ELSE similarity(first_name || ' ' || last_name, $3 || ' ' || $4)
			END as match_score
		FROM patients
		WHERE clinic_id = $1
			AND is_active = true
			AND (
				(phone IS NOT NULL AND phone = $2)
				OR similarity(first_name || ' ' || last_name, $3 || ' ' || $4) > 0.4
			)
		ORDER BY match_score DESC
		LIMIT 10`

	rows, err := r.db.QueryContext(ctx, query, clinicID, phone, firstName, lastName)
	if err != nil {
		return nil, fmt.Errorf("failed to find duplicates: %w", err)
	}
	defer rows.Close()

	matches := make([]model.DuplicatePatientMatch, 0)
	for rows.Next() {
		var p model.Patient
		var firstNameVi, lastNameVi, phoneVal, email, address, addressVi, notes sql.NullString
		var createdBy, updatedBy sql.NullString
		var emergencyContactJSON []byte
		var medicalAlerts []string
		var matchType string
		var matchScore float64

		err := rows.Scan(
			&p.ID,
			&p.ClinicID,
			&p.MRN,
			&p.FirstName,
			&p.LastName,
			&firstNameVi,
			&lastNameVi,
			&p.DateOfBirth,
			&p.Gender,
			&phoneVal,
			&email,
			&address,
			&addressVi,
			&p.LanguagePreference,
			&emergencyContactJSON,
			pq.Array(&medicalAlerts),
			&notes,
			&p.IsActive,
			&p.CreatedAt,
			&p.UpdatedAt,
			&createdBy,
			&updatedBy,
			&matchType,
			&matchScore,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan duplicate match: %w", err)
		}

		p.FirstNameVi = StringFromNull(firstNameVi)
		p.LastNameVi = StringFromNull(lastNameVi)
		p.Phone = StringFromNull(phoneVal)
		p.Email = StringFromNull(email)
		p.Address = StringFromNull(address)
		p.AddressVi = StringFromNull(addressVi)
		p.Notes = StringFromNull(notes)
		p.CreatedBy = StringPtrFromNull(createdBy)
		p.UpdatedBy = StringPtrFromNull(updatedBy)
		p.MedicalAlerts = medicalAlerts

		if len(emergencyContactJSON) > 0 {
			json.Unmarshal(emergencyContactJSON, &p.EmergencyContact)
		}

		matches = append(matches, model.DuplicatePatientMatch{
			Patient:    p,
			MatchScore: matchScore,
			MatchType:  matchType,
		})
	}

	return matches, nil
}

// GetNextMRNSequence gets the next MRN sequence number for a clinic.
func (r *postgresPatientRepo) GetNextMRNSequence(ctx context.Context, clinicID string) (int64, error) {
	// Use a sequence per clinic or extract from existing MRNs
	query := `
		SELECT COALESCE(MAX(
			CASE
				WHEN mrn ~ '^[A-Z]+-[0-9]+$'
				THEN CAST(SUBSTRING(mrn FROM '[0-9]+$') AS BIGINT)
				ELSE 0
			END
		), 0) + 1
		FROM patients
		WHERE clinic_id = $1`

	var nextSeq int64
	if err := r.db.QueryRowContext(ctx, query, clinicID).Scan(&nextSeq); err != nil {
		return 0, fmt.Errorf("failed to get next MRN sequence: %w", err)
	}

	return nextSeq, nil
}

// GetDashboard retrieves aggregated patient dashboard data.
func (r *postgresPatientRepo) GetDashboard(ctx context.Context, clinicID, patientID string) (*model.PatientDashboard, error) {
	// Get patient first
	patient, err := r.GetByID(ctx, clinicID, patientID)
	if err != nil {
		return nil, err
	}

	dashboard := &model.PatientDashboard{
		Patient: *patient,
	}

	// Get appointment counts and dates
	appointmentQuery := `
		SELECT
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE start_time > NOW() AND status != 'cancelled') as upcoming,
			COUNT(*) FILTER (WHERE status = 'completed') as completed,
			MAX(start_time) FILTER (WHERE status = 'completed') as last_visit,
			MIN(start_time) FILTER (WHERE start_time > NOW() AND status != 'cancelled') as next_appointment
		FROM appointments
		WHERE patient_id = $1`

	var lastVisit, nextAppointment sql.NullTime
	err = r.db.QueryRowContext(ctx, appointmentQuery, patientID).Scan(
		&dashboard.TotalAppointments,
		&dashboard.UpcomingAppointments,
		&dashboard.CompletedSessions,
		&lastVisit,
		&nextAppointment,
	)
	if err != nil && err != sql.ErrNoRows {
		log.Warn().Err(err).Str("patient_id", patientID).Msg("failed to get appointment stats")
	}

	dashboard.LastVisit = TimePtrFromNull(lastVisit)
	dashboard.NextAppointment = TimePtrFromNull(nextAppointment)

	// Get active treatment plans count
	treatmentQuery := `
		SELECT COUNT(*)
		FROM treatment_plans
		WHERE patient_id = $1 AND status = 'active'`
	_ = r.db.QueryRowContext(ctx, treatmentQuery, patientID).Scan(&dashboard.ActiveTreatmentPlans)

	// Get insurance info
	insurance, err := r.GetInsuranceInfo(ctx, patientID)
	if err == nil {
		dashboard.InsuranceInfo = insurance
	}

	return dashboard, nil
}

// GetInsuranceInfo retrieves insurance information for a patient.
func (r *postgresPatientRepo) GetInsuranceInfo(ctx context.Context, patientID string) ([]model.PatientInsurance, error) {
	query := `
		SELECT
			id, patient_id, provider, provider_type, policy_number, group_number,
			coverage_percentage, copay_amount, valid_from, valid_to,
			is_primary, is_active, verification_status
		FROM insurance_info
		WHERE patient_id = $1 AND is_active = true
		ORDER BY is_primary DESC, valid_from DESC`

	rows, err := r.db.QueryContext(ctx, query, patientID)
	if err != nil {
		return nil, fmt.Errorf("failed to get insurance info: %w", err)
	}
	defer rows.Close()

	insurances := make([]model.PatientInsurance, 0)
	for rows.Next() {
		var ins model.PatientInsurance
		var groupNumber sql.NullString
		var copayAmount sql.NullFloat64
		var validTo sql.NullTime

		err := rows.Scan(
			&ins.ID,
			&ins.PatientID,
			&ins.Provider,
			&ins.ProviderType,
			&ins.PolicyNumber,
			&groupNumber,
			&ins.CoveragePercentage,
			&copayAmount,
			&ins.ValidFrom,
			&validTo,
			&ins.IsPrimary,
			&ins.IsActive,
			&ins.VerificationStatus,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan insurance info: %w", err)
		}

		ins.GroupNumber = StringFromNull(groupNumber)
		if copayAmount.Valid {
			ins.CopayAmount = &copayAmount.Float64
		}
		ins.ValidTo = TimePtrFromNull(validTo)

		insurances = append(insurances, ins)
	}

	return insurances, nil
}

// CountByClinic returns the total number of active patients in a clinic.
func (r *postgresPatientRepo) CountByClinic(ctx context.Context, clinicID string) (int64, error) {
	query := `SELECT COUNT(*) FROM patients WHERE clinic_id = $1 AND is_active = true`
	var count int64
	if err := r.db.QueryRowContext(ctx, query, clinicID).Scan(&count); err != nil {
		return 0, fmt.Errorf("failed to count patients: %w", err)
	}
	return count, nil
}
