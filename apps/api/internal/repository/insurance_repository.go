package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// InsuranceRepository defines the interface for insurance data access.
type InsuranceRepository interface {
	Create(ctx context.Context, card *model.BHYTCard) error
	GetByID(ctx context.Context, id string) (*model.BHYTCard, error)
	GetByPatientID(ctx context.Context, patientID string) (*model.BHYTCard, error)
	Update(ctx context.Context, card *model.BHYTCard) error
	ValidateCard(ctx context.Context, cardNumber string) (*model.BHYTValidationResult, error)
	CheckDuplicateCard(ctx context.Context, cardNumber string, excludePatientID string) (bool, error)
}

// AuditRepository defines the interface for audit log data access.
type AuditRepository interface {
	LogAction(ctx context.Context, entry *model.AuditEntry) error
}

// postgresInsuranceRepo implements InsuranceRepository with PostgreSQL.
type postgresInsuranceRepo struct {
	db *DB
}

// NewInsuranceRepository creates a new PostgreSQL insurance repository.
func NewInsuranceRepository(db *DB) InsuranceRepository {
	return &postgresInsuranceRepo{db: db}
}

// Create inserts a new BHYT card record.
func (r *postgresInsuranceRepo) Create(ctx context.Context, card *model.BHYTCard) error {
	query := `
		INSERT INTO insurance_info (
			id, patient_id, clinic_id, card_number, prefix, beneficiary_type,
			province_code, holder_name, holder_name_vi, date_of_birth,
			registered_facility_code, registered_facility_name,
			hospital_registration_code, expiration_date,
			valid_from, valid_to, five_year_continuous, verification,
			notes, is_active, created_by, updated_by
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
			$11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $21
		)
		RETURNING created_at, updated_at`

	err := r.db.QueryRowContext(ctx, query,
		card.ID,
		card.PatientID,
		card.ClinicID,
		card.CardNumber,
		card.Prefix,
		card.BeneficiaryType,
		card.ProvinceCode,
		card.HolderName,
		card.HolderNameVi,
		card.DateOfBirth,
		card.RegisteredFacilityCode,
		NullableStringValue(card.RegisteredFacilityName),
		NullableStringValue(card.HospitalRegistrationCode),
		NullableTime(card.ExpirationDate),
		card.ValidFrom,
		NullableTime(card.ValidTo),
		card.FiveYearContinuous,
		card.Verification,
		NullableStringValue(card.Notes),
		card.IsActive,
		NullableString(card.CreatedBy),
	).Scan(&card.CreatedAt, &card.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create insurance card: %w", err)
	}

	return nil
}

// GetByID retrieves a BHYT card by ID.
func (r *postgresInsuranceRepo) GetByID(ctx context.Context, id string) (*model.BHYTCard, error) {
	query := `
		SELECT
			id, patient_id, clinic_id, card_number, prefix, beneficiary_type,
			province_code, holder_name, holder_name_vi, date_of_birth,
			registered_facility_code, registered_facility_name,
			hospital_registration_code, expiration_date,
			valid_from, valid_to, five_year_continuous, verification,
			verified_at, verified_by, notes, is_active,
			created_at, updated_at, created_by, updated_by
		FROM insurance_info
		WHERE id = $1 AND is_active = true`

	return r.scanCard(r.db.QueryRowContext(ctx, query, id))
}

// GetByPatientID retrieves the active BHYT card for a patient.
func (r *postgresInsuranceRepo) GetByPatientID(ctx context.Context, patientID string) (*model.BHYTCard, error) {
	query := `
		SELECT
			id, patient_id, clinic_id, card_number, prefix, beneficiary_type,
			province_code, holder_name, holder_name_vi, date_of_birth,
			registered_facility_code, registered_facility_name,
			hospital_registration_code, expiration_date,
			valid_from, valid_to, five_year_continuous, verification,
			verified_at, verified_by, notes, is_active,
			created_at, updated_at, created_by, updated_by
		FROM insurance_info
		WHERE patient_id = $1 AND is_active = true
		ORDER BY created_at DESC
		LIMIT 1`

	return r.scanCard(r.db.QueryRowContext(ctx, query, patientID))
}

// Update updates an existing BHYT card with optimistic locking.
func (r *postgresInsuranceRepo) Update(ctx context.Context, card *model.BHYTCard) error {
	query := `
		UPDATE insurance_info SET
			card_number = $1,
			prefix = $2,
			beneficiary_type = $3,
			province_code = $4,
			holder_name = $5,
			holder_name_vi = $6,
			registered_facility_code = $7,
			registered_facility_name = $8,
			hospital_registration_code = $9,
			expiration_date = $10,
			valid_from = $11,
			valid_to = $12,
			five_year_continuous = $13,
			verification = $14,
			notes = $15,
			is_active = $16,
			updated_by = $17
		WHERE id = $18 AND updated_at = $19
		RETURNING updated_at`

	result := r.db.QueryRowContext(ctx, query,
		card.CardNumber,
		card.Prefix,
		card.BeneficiaryType,
		card.ProvinceCode,
		card.HolderName,
		card.HolderNameVi,
		card.RegisteredFacilityCode,
		NullableStringValue(card.RegisteredFacilityName),
		NullableStringValue(card.HospitalRegistrationCode),
		NullableTime(card.ExpirationDate),
		card.ValidFrom,
		NullableTime(card.ValidTo),
		card.FiveYearContinuous,
		card.Verification,
		NullableStringValue(card.Notes),
		card.IsActive,
		NullableString(card.UpdatedBy),
		card.ID,
		card.UpdatedAt, // optimistic locking: check version via updated_at
	)

	if err := result.Scan(&card.UpdatedAt); err != nil {
		if err == sql.ErrNoRows {
			// Could be not found OR version conflict
			exists, _ := r.GetByID(ctx, card.ID)
			if exists != nil {
				return ErrVersionConflict
			}
			return ErrNotFound
		}
		return fmt.Errorf("failed to update insurance card: %w", err)
	}

	return nil
}

// ValidateCard checks if a card number exists in the database and returns validation info.
func (r *postgresInsuranceRepo) ValidateCard(ctx context.Context, cardNumber string) (*model.BHYTValidationResult, error) {
	query := `
		SELECT
			card_number, verification, prefix, beneficiary_type,
			province_code, valid_to, expiration_date,
			five_year_continuous, hospital_registration_code
		FROM insurance_info
		WHERE card_number = $1 AND is_active = true
		ORDER BY created_at DESC
		LIMIT 1`

	var (
		number         string
		verification   model.InsuranceVerificationStatus
		prefix         string
		benefType      model.BHYTBeneficiaryType
		provinceCode   string
		validTo        sql.NullTime
		expirationDate sql.NullTime
		continuous     bool
		hospitalCode   sql.NullString
	)

	err := r.db.QueryRowContext(ctx, query, cardNumber).Scan(
		&number, &verification, &prefix, &benefType,
		&provinceCode, &validTo, &expirationDate,
		&continuous, &hospitalCode,
	)

	if err == sql.ErrNoRows {
		// Card not in database - return a result indicating not found
		return &model.BHYTValidationResult{
			CardNumber:   cardNumber,
			IsValid:      false,
			Verification: model.InsuranceVerificationPending,
			Errors:       []string{"card not found in database"},
			ValidatedAt:  time.Now(),
		}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to validate card: %w", err)
	}

	isExpired := false
	now := time.Now()
	if expirationDate.Valid && now.After(expirationDate.Time) {
		isExpired = true
	}
	if validTo.Valid && now.After(validTo.Time) {
		isExpired = true
	}

	return &model.BHYTValidationResult{
		CardNumber:      number,
		IsValid:         verification == model.InsuranceVerificationVerified && !isExpired,
		Verification:    verification,
		Prefix:          prefix,
		BeneficiaryType: benefType,
		ProvinceCode:    provinceCode,
		IsExpired:       isExpired,
		IsContinuous:    continuous,
		ValidatedAt:     time.Now(),
	}, nil
}

// scanCard scans a BHYT card row into a BHYTCard struct.
func (r *postgresInsuranceRepo) scanCard(row *sql.Row) (*model.BHYTCard, error) {
	var card model.BHYTCard
	var facilityName, hospitalRegCode, notes sql.NullString
	var expirationDate, validTo, verifiedAt sql.NullTime
	var verifiedBy, createdBy, updatedBy sql.NullString

	err := row.Scan(
		&card.ID,
		&card.PatientID,
		&card.ClinicID,
		&card.CardNumber,
		&card.Prefix,
		&card.BeneficiaryType,
		&card.ProvinceCode,
		&card.HolderName,
		&card.HolderNameVi,
		&card.DateOfBirth,
		&card.RegisteredFacilityCode,
		&facilityName,
		&hospitalRegCode,
		&expirationDate,
		&card.ValidFrom,
		&validTo,
		&card.FiveYearContinuous,
		&card.Verification,
		&verifiedAt,
		&verifiedBy,
		&notes,
		&card.IsActive,
		&card.CreatedAt,
		&card.UpdatedAt,
		&createdBy,
		&updatedBy,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan insurance card: %w", err)
	}

	card.RegisteredFacilityName = StringFromNull(facilityName)
	card.HospitalRegistrationCode = StringFromNull(hospitalRegCode)
	card.Notes = StringFromNull(notes)
	card.ExpirationDate = TimePtrFromNull(expirationDate)
	card.ValidTo = TimePtrFromNull(validTo)
	card.VerifiedAt = TimePtrFromNull(verifiedAt)
	card.VerifiedBy = StringPtrFromNull(verifiedBy)
	card.CreatedBy = StringPtrFromNull(createdBy)
	card.UpdatedBy = StringPtrFromNull(updatedBy)

	return &card, nil
}

// postgresAuditRepo implements AuditRepository with PostgreSQL.
type postgresAuditRepo struct {
	db *DB
}

// NewAuditRepository creates a new PostgreSQL audit repository.
func NewAuditRepository(db *DB) AuditRepository {
	return &postgresAuditRepo{db: db}
}

// LogAction inserts an audit log entry.
func (r *postgresAuditRepo) LogAction(ctx context.Context, entry *model.AuditEntry) error {
	query := `
		INSERT INTO audit_logs (id, entity_type, entity_id, action, performed_by, details)
		VALUES ($1, $2, $3, $4, $5, $6)`

	_, err := r.db.ExecContext(ctx, query,
		entry.ID,
		entry.EntityType,
		entry.EntityID,
		entry.Action,
		entry.PerformedBy,
		NullableStringValue(entry.Details),
	)
	if err != nil {
		// Log but do not fail the main operation for audit errors.
		log.Warn().Err(err).
			Str("entity_type", entry.EntityType).
			Str("action", entry.Action).
			Msg("failed to write audit log to database, logging only")
		return nil
	}
	return nil
}

// CheckDuplicateCard checks if a card number is already registered to a different patient.
func (r *postgresInsuranceRepo) CheckDuplicateCard(ctx context.Context, cardNumber string, excludePatientID string) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM insurance_info
			WHERE card_number = $1 AND patient_id != $2 AND is_active = true
		)`

	var exists bool
	if err := r.db.QueryRowContext(ctx, query, cardNumber, excludePatientID).Scan(&exists); err != nil {
		return false, fmt.Errorf("failed to check duplicate card: %w", err)
	}
	return exists, nil
}

// mockInsuranceRepo provides a mock implementation for development.
type mockInsuranceRepo struct{}

func (r *mockInsuranceRepo) Create(ctx context.Context, card *model.BHYTCard) error {
	card.CreatedAt = time.Now()
	card.UpdatedAt = time.Now()
	return nil
}

func (r *mockInsuranceRepo) GetByID(ctx context.Context, id string) (*model.BHYTCard, error) {
	return nil, ErrNotFound
}

func (r *mockInsuranceRepo) GetByPatientID(ctx context.Context, patientID string) (*model.BHYTCard, error) {
	return nil, ErrNotFound
}

func (r *mockInsuranceRepo) Update(ctx context.Context, card *model.BHYTCard) error {
	return nil
}

func (r *mockInsuranceRepo) ValidateCard(ctx context.Context, cardNumber string) (*model.BHYTValidationResult, error) {
	return &model.BHYTValidationResult{
		CardNumber:   cardNumber,
		IsValid:      false,
		Verification: model.InsuranceVerificationPending,
		Errors:       []string{"mock mode: card not found"},
		ValidatedAt:  time.Now(),
	}, nil
}

func (r *mockInsuranceRepo) CheckDuplicateCard(ctx context.Context, cardNumber string, excludePatientID string) (bool, error) {
	return false, nil
}

// mockAuditRepo provides a mock implementation for development.
type mockAuditRepo struct{}

func (r *mockAuditRepo) LogAction(ctx context.Context, entry *model.AuditEntry) error {
	log.Debug().
		Str("entity_type", entry.EntityType).
		Str("action", entry.Action).
		Str("performed_by", entry.PerformedBy).
		Msg("audit log (mock)")
	return nil
}
