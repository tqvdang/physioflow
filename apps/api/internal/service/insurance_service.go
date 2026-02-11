package service

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	valerr "github.com/tqvdang/physioflow/apps/api/internal/errors"
	"github.com/tqvdang/physioflow/apps/api/internal/metrics"
	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
)

// ErrCardExpired is returned when a BHYT card has expired.
var ErrCardExpired = fmt.Errorf("card expired")

// ErrFacilityMismatch is returned when the visit facility doesn't match the card's registered facility.
var ErrFacilityMismatch = fmt.Errorf("facility mismatch")

// InsuranceService defines the interface for BHYT insurance business logic.
type InsuranceService interface {
	CreateInsurance(ctx context.Context, patientID, clinicID, userID string, req *model.CreateBHYTCardRequest) (*model.BHYTCard, error)
	GetPatientInsurance(ctx context.Context, patientID string) (*model.BHYTCard, error)
	UpdateInsurance(ctx context.Context, id, userID string, req *model.UpdateBHYTCardRequest) (*model.BHYTCard, error)
	ValidateBHYTCard(ctx context.Context, cardNumber string, userID string) (*model.BHYTValidationResult, error)
	CalculateCoverage(ctx context.Context, patientID string, req *model.CalculateCoverageRequest) (*model.CoverageCalculation, error)
}

// insuranceService implements InsuranceService.
type insuranceService struct {
	repo      repository.InsuranceRepository
	auditRepo repository.AuditRepository
}

// NewInsuranceService creates a new insurance service.
func NewInsuranceService(repo repository.InsuranceRepository, auditRepo repository.AuditRepository) InsuranceService {
	return &insuranceService{
		repo:      repo,
		auditRepo: auditRepo,
	}
}

// bhytCardRegex validates the BHYT card format (supports both formats):
// Format 1 (OpenEMR): XX#-####-#####-##### (with dashes, 20 chars)
// Format 2 (Legacy): XX############### (without dashes, 15 chars)
// Structure: 2 letters (prefix) + 1 digit (beneficiary type) + 2 digits (province) + 10 digits (ID)
var bhytCardRegex = regexp.MustCompile(`^[A-Z]{2}\d-\d{4}-\d{5}-\d{5}$|^[A-Z]{2}[1-5]\d{2}\d{10}$`)

// normalizeBHYTCard strips dashes from card number for parsing
func normalizeBHYTCard(cardNumber string) string {
	return strings.ReplaceAll(cardNumber, "-", "")
}

// validPrefixes is a lookup set for valid BHYT prefix codes.
var validPrefixes = func() map[string]bool {
	m := make(map[string]bool, len(model.ValidBHYTPrefixes))
	for _, p := range model.ValidBHYTPrefixes {
		m[p] = true
	}
	return m
}()

// beneficiaryTypeCoverage maps beneficiary type digit to coverage percentage.
var beneficiaryTypeCoverage = map[model.BHYTBeneficiaryType]float64{
	model.BHYTBeneficiary80:  80.0,
	model.BHYTBeneficiary100: 100.0,
	model.BHYTBeneficiary95:  95.0,
	model.BHYTBeneficiary40:  40.0,
	model.BHYTBeneficiary70:  70.0,
}

// CreateInsurance registers a new BHYT card for a patient.
func (s *insuranceService) CreateInsurance(ctx context.Context, patientID, clinicID, userID string, req *model.CreateBHYTCardRequest) (*model.BHYTCard, error) {
	// Validate card number format
	if !bhytCardRegex.MatchString(req.CardNumber) {
		metrics.RecordValidationError("invalid_format")
		return nil, fmt.Errorf("%w: invalid BHYT card number format", repository.ErrInvalidInput)
	}

	// Parse the card number components (strip dashes for position-based parsing)
	normalized := normalizeBHYTCard(req.CardNumber)
	prefix := normalized[:2]
	benefType := model.BHYTBeneficiaryType(int(normalized[2] - '0'))
	provinceCode := normalized[3:5]

	// Validate prefix
	if !validPrefixes[prefix] {
		metrics.RecordValidationError("invalid_prefix")
		return nil, fmt.Errorf("%w: unrecognized BHYT prefix code: %s", repository.ErrInvalidInput, prefix)
	}

	// Parse dates
	dob, err := time.Parse("2006-01-02", req.DateOfBirth)
	if err != nil {
		return nil, fmt.Errorf("%w: invalid date of birth format", repository.ErrInvalidInput)
	}

	validFrom, err := time.Parse("2006-01-02", req.ValidFrom)
	if err != nil {
		return nil, fmt.Errorf("%w: invalid valid_from date format", repository.ErrInvalidInput)
	}

	var validTo *time.Time
	if req.ValidTo != "" {
		vt, err := time.Parse("2006-01-02", req.ValidTo)
		if err != nil {
			return nil, fmt.Errorf("%w: invalid valid_to date format", repository.ErrInvalidInput)
		}
		validTo = &vt
	}

	// Parse optional expiration date
	var expirationDate *time.Time
	if req.ExpirationDate != "" {
		ed, err := time.Parse("2006-01-02", req.ExpirationDate)
		if err != nil {
			return nil, fmt.Errorf("%w: invalid expiration_date format", repository.ErrInvalidInput)
		}
		expirationDate = &ed
	}

	// Validate coverage start date < end date
	if validTo != nil && !validFrom.Before(*validTo) {
		return nil, fmt.Errorf("%w: valid_from must be before valid_to", repository.ErrInvalidInput)
	}

	// Check for duplicate card number across patients
	isDuplicate, err := s.repo.CheckDuplicateCard(ctx, req.CardNumber, patientID)
	if err != nil {
		log.Warn().Err(err).Str("card_number", req.CardNumber).Msg("failed to check duplicate card")
	} else if isDuplicate {
		metrics.RecordValidationError("duplicate_card")
		return nil, valerr.ErrDuplicateCardNumber
	}

	// Validate co-payment exemption for children under 6
	age := ageOnDate(dob, time.Now())
	if age < 6 && prefix != model.BHYTPrefixChild {
		log.Warn().
			Int("age", age).
			Str("prefix", prefix).
			Msg("child under 6 should use TE prefix; continuing with provided prefix")
	}

	// Validate 5-year bonus only if card age >= 5 years
	if req.FiveYearContinuous {
		cardAgeYears := ageOnDate(validFrom, time.Now())
		if cardAgeYears < 5 {
			metrics.RecordValidationError("five_year_bonus_ineligible")
			return nil, valerr.ErrFiveYearBonusIneligible
		}
	}

	// Validate hospital registration matches facility if both are provided
	if req.HospitalRegistrationCode != "" && req.RegisteredFacilityCode != "" {
		if strings.TrimSpace(req.HospitalRegistrationCode) != strings.TrimSpace(req.RegisteredFacilityCode) {
			log.Warn().
				Str("hospital_code", req.HospitalRegistrationCode).
				Str("facility_code", req.RegisteredFacilityCode).
				Msg("hospital registration code differs from registered facility code")
		}
	}

	card := &model.BHYTCard{
		ID:                       uuid.New().String(),
		PatientID:                patientID,
		ClinicID:                 clinicID,
		CardNumber:               req.CardNumber,
		Prefix:                   prefix,
		BeneficiaryType:          benefType,
		ProvinceCode:             provinceCode,
		HolderName:               strings.TrimSpace(req.HolderName),
		HolderNameVi:             strings.TrimSpace(req.HolderNameVi),
		DateOfBirth:              dob,
		RegisteredFacilityCode:   strings.TrimSpace(req.RegisteredFacilityCode),
		RegisteredFacilityName:   strings.TrimSpace(req.RegisteredFacilityName),
		HospitalRegistrationCode: strings.TrimSpace(req.HospitalRegistrationCode),
		ExpirationDate:           expirationDate,
		ValidFrom:                validFrom,
		ValidTo:                  validTo,
		FiveYearContinuous:       req.FiveYearContinuous,
		Verification:             model.InsuranceVerificationPending,
		Notes:                    strings.TrimSpace(req.Notes),
		IsActive:                 true,
		CreatedBy:                &userID,
		UpdatedBy:                &userID,
	}

	if err := s.repo.Create(ctx, card); err != nil {
		return nil, err
	}

	// Audit log
	s.auditRepo.LogAction(ctx, &model.AuditEntry{
		ID:          uuid.New().String(),
		EntityType:  "bhyt_card",
		EntityID:    card.ID,
		Action:      "create",
		PerformedBy: userID,
		Details:     fmt.Sprintf("Created BHYT card %s for patient %s", card.CardNumber, patientID),
	})

	log.Info().
		Str("card_id", card.ID).
		Str("card_number", card.CardNumber).
		Str("patient_id", patientID).
		Str("created_by", userID).
		Msg("BHYT insurance card created")

	return card, nil
}

// GetPatientInsurance retrieves the active BHYT card for a patient.
func (s *insuranceService) GetPatientInsurance(ctx context.Context, patientID string) (*model.BHYTCard, error) {
	return s.repo.GetByPatientID(ctx, patientID)
}

// UpdateInsurance updates an existing BHYT card.
func (s *insuranceService) UpdateInsurance(ctx context.Context, id, userID string, req *model.UpdateBHYTCardRequest) (*model.BHYTCard, error) {
	card, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Apply updates
	if req.CardNumber != nil {
		cn := *req.CardNumber
		if !bhytCardRegex.MatchString(cn) {
			metrics.RecordValidationError("invalid_format")
			return nil, fmt.Errorf("%w: invalid BHYT card number format", repository.ErrInvalidInput)
		}
		// Normalize for position-based parsing
		normalized := normalizeBHYTCard(cn)
		prefix := normalized[:2]
		if !validPrefixes[prefix] {
			metrics.RecordValidationError("invalid_prefix")
			return nil, fmt.Errorf("%w: unrecognized BHYT prefix code: %s", repository.ErrInvalidInput, prefix)
		}
		card.CardNumber = cn // Store with original format (with dashes)
		card.Prefix = prefix
		card.BeneficiaryType = model.BHYTBeneficiaryType(int(normalized[2] - '0'))
		card.ProvinceCode = normalized[3:5]
		// Re-set verification to pending when card number changes
		card.Verification = model.InsuranceVerificationPending
	}
	if req.HolderName != nil {
		card.HolderName = strings.TrimSpace(*req.HolderName)
	}
	if req.HolderNameVi != nil {
		card.HolderNameVi = strings.TrimSpace(*req.HolderNameVi)
	}
	if req.RegisteredFacilityCode != nil {
		card.RegisteredFacilityCode = strings.TrimSpace(*req.RegisteredFacilityCode)
	}
	if req.RegisteredFacilityName != nil {
		card.RegisteredFacilityName = strings.TrimSpace(*req.RegisteredFacilityName)
	}
	if req.HospitalRegistrationCode != nil {
		card.HospitalRegistrationCode = strings.TrimSpace(*req.HospitalRegistrationCode)
	}
	if req.ExpirationDate != nil {
		ed, err := time.Parse("2006-01-02", *req.ExpirationDate)
		if err != nil {
			return nil, fmt.Errorf("%w: invalid expiration_date format", repository.ErrInvalidInput)
		}
		card.ExpirationDate = &ed
	}
	if req.ValidFrom != nil {
		vf, err := time.Parse("2006-01-02", *req.ValidFrom)
		if err != nil {
			return nil, fmt.Errorf("%w: invalid valid_from date format", repository.ErrInvalidInput)
		}
		card.ValidFrom = vf
	}
	if req.ValidTo != nil {
		vt, err := time.Parse("2006-01-02", *req.ValidTo)
		if err != nil {
			return nil, fmt.Errorf("%w: invalid valid_to date format", repository.ErrInvalidInput)
		}
		card.ValidTo = &vt
	}
	if req.FiveYearContinuous != nil {
		card.FiveYearContinuous = *req.FiveYearContinuous
	}
	if req.Notes != nil {
		card.Notes = strings.TrimSpace(*req.Notes)
	}
	if req.IsActive != nil {
		card.IsActive = *req.IsActive
	}

	card.UpdatedBy = &userID

	if err := s.repo.Update(ctx, card); err != nil {
		return nil, err
	}

	// Audit log
	s.auditRepo.LogAction(ctx, &model.AuditEntry{
		ID:          uuid.New().String(),
		EntityType:  "bhyt_card",
		EntityID:    card.ID,
		Action:      "update",
		PerformedBy: userID,
		Details:     fmt.Sprintf("Updated BHYT card %s", card.CardNumber),
	})

	log.Info().
		Str("card_id", card.ID).
		Str("updated_by", userID).
		Msg("BHYT insurance card updated")

	return card, nil
}

// ValidateBHYTCard validates a BHYT card number including format, prefix, and expiration.
func (s *insuranceService) ValidateBHYTCard(ctx context.Context, cardNumber string, userID string) (*model.BHYTValidationResult, error) {
	cardNumber = strings.TrimSpace(cardNumber)
	var validationErrors []string

	// Validate format with regex
	if !bhytCardRegex.MatchString(cardNumber) {
		metrics.RecordValidationError("invalid_format")
		metrics.RecordBHYTValidation("invalid", "")
		result := &model.BHYTValidationResult{
			CardNumber:   cardNumber,
			IsValid:      false,
			Verification: model.InsuranceVerificationInvalid,
			Errors:       []string{"card number does not match expected format (XX#-####-#####-##### or XX###############)"},
			ValidatedAt:  time.Now(),
		}

		s.auditRepo.LogAction(ctx, &model.AuditEntry{
			ID:          uuid.New().String(),
			EntityType:  "bhyt_validation",
			EntityID:    cardNumber,
			Action:      "validate_format_failed",
			PerformedBy: userID,
			Details:     "Card number format validation failed",
		})

		return result, nil
	}

	// Parse components (normalize first to handle dashes)
	normalized := normalizeBHYTCard(cardNumber)
	prefix := normalized[:2]
	benefType := model.BHYTBeneficiaryType(int(normalized[2] - '0'))
	provinceCode := normalized[3:5]

	// Validate prefix code
	if !validPrefixes[prefix] {
		validationErrors = append(validationErrors, fmt.Sprintf("unrecognized prefix code: %s", prefix))
		metrics.RecordValidationError("invalid_prefix")
	}

	// Try to look up the card in the database for further info
	dbResult, err := s.repo.ValidateCard(ctx, cardNumber)
	if err != nil {
		return nil, fmt.Errorf("failed to validate card in database: %w", err)
	}

	// Merge database info with format validation
	if dbResult != nil && len(dbResult.Errors) > 0 {
		validationErrors = append(validationErrors, dbResult.Errors...)
	}

	// Determine coverage percentage from beneficiary type
	coverage, ok := beneficiaryTypeCoverage[benefType]
	if !ok {
		validationErrors = append(validationErrors, fmt.Sprintf("unknown beneficiary type: %d", benefType))
		metrics.RecordValidationError("unknown_beneficiary_type")
	}

	isValid := len(validationErrors) == 0
	verification := model.InsuranceVerificationVerified
	if !isValid {
		verification = model.InsuranceVerificationInvalid
	}

	// If DB has expiration info, use it
	if dbResult != nil && dbResult.IsExpired {
		isValid = false
		verification = model.InsuranceVerificationExpired
		validationErrors = append(validationErrors, "card has expired")
		metrics.RecordValidationError("expired")
	}

	isContinuous := false
	if dbResult != nil {
		isContinuous = dbResult.IsContinuous
	}

	status := "valid"
	if !isValid {
		status = "invalid"
	}
	metrics.RecordBHYTValidation(status, prefix)

	result := &model.BHYTValidationResult{
		CardNumber:      cardNumber,
		IsValid:         isValid,
		Verification:    verification,
		Prefix:          prefix,
		BeneficiaryType: benefType,
		ProvinceCode:    provinceCode,
		CoveragePercent: coverage,
		IsExpired:       dbResult != nil && dbResult.IsExpired,
		IsContinuous:    isContinuous,
		Errors:          validationErrors,
		ValidatedAt:     time.Now(),
	}

	// Audit log
	s.auditRepo.LogAction(ctx, &model.AuditEntry{
		ID:          uuid.New().String(),
		EntityType:  "bhyt_validation",
		EntityID:    cardNumber,
		Action:      "validate",
		PerformedBy: userID,
		Details:     fmt.Sprintf("Validation result: valid=%t, coverage=%.0f%%", isValid, coverage),
	})

	return result, nil
}

// CalculateCoverage computes the BHYT coverage for a given total amount.
func (s *insuranceService) CalculateCoverage(ctx context.Context, patientID string, req *model.CalculateCoverageRequest) (*model.CoverageCalculation, error) {
	start := time.Now()

	// Get the patient's active insurance card
	card, err := s.repo.GetByPatientID(ctx, patientID)
	if err != nil {
		return nil, err
	}

	// Check if card is expired
	if card.IsExpiredOnDate(time.Now()) {
		return nil, fmt.Errorf("%w: BHYT card has expired", ErrCardExpired)
	}

	// Check facility eligibility when facility code is provided
	if req.FacilityCode != "" && !card.IsFacilityEligible(req.FacilityCode) {
		return nil, fmt.Errorf("%w: card is not registered at facility %s", ErrFacilityMismatch, req.FacilityCode)
	}

	// Determine base coverage from beneficiary type
	baseCoverage, ok := beneficiaryTypeCoverage[card.BeneficiaryType]
	if !ok {
		return nil, fmt.Errorf("%w: unknown beneficiary type on card", repository.ErrInvalidInput)
	}

	coveragePercent := baseCoverage

	// Co-payment exemption for children under 6: coverage = 100%, copay = 0
	if IsChildUnder6CopayExempt(card.DateOfBirth) {
		coveragePercent = 100.0
	}

	// Adjust for wrong facility level (not correct facility and not a referral)
	if !req.IsCorrectFacility && !req.IsReferral && coveragePercent < 100.0 {
		// Wrong facility without referral: coverage reduced to 40%
		coveragePercent = 40.0
	}

	// Referral adjustments: if referred, keep base coverage but note it
	referralAdjustment := 0.0
	if req.IsReferral && !req.IsCorrectFacility {
		// Referrals to higher-level facilities keep coverage but may have a small reduction
		referralAdjustment = baseCoverage - coveragePercent
	}

	// Five-year continuous enrollment bonus: additional coverage
	// Validate that card age is actually >= 5 years
	fiveYearAdjustment := 0.0
	if card.FiveYearContinuous && coveragePercent < 100.0 {
		cardAgeYears := ageOnDate(card.ValidFrom, time.Now())
		if cardAgeYears >= 5 {
			fiveYearAdjustment = 5.0
			coveragePercent = minFloat64(coveragePercent+fiveYearAdjustment, 100.0)
		} else {
			log.Warn().
				Int("card_age_years", cardAgeYears).
				Str("card_id", card.ID).
				Msg("five-year bonus flag set but card age < 5 years; ignoring bonus")
		}
	}

	insurancePays := req.TotalAmount * (coveragePercent / 100.0)
	patientPays := req.TotalAmount - insurancePays

	calculation := &model.CoverageCalculation{
		BHYTCardID:         card.ID,
		PatientID:          patientID,
		ServiceTotal:       req.TotalAmount,
		CoveragePercent:    coveragePercent,
		InsurancePays:      insurancePays,
		PatientPays:        patientPays,
		IsCorrectFacility:  req.IsCorrectFacility,
		IsReferral:         req.IsReferral,
		ReferralAdjustment: referralAdjustment,
		FiveYearBonus:      card.FiveYearContinuous,
		FiveYearAdjustment: fiveYearAdjustment,
		CalculatedAt:       time.Now(),
	}

	duration := time.Since(start)
	metrics.RecordCoverageCalculation(duration)

	log.Info().
		Str("patient_id", patientID).
		Float64("total", req.TotalAmount).
		Float64("coverage_pct", coveragePercent).
		Float64("insurance_pays", insurancePays).
		Float64("patient_pays", patientPays).
		Msg("BHYT coverage calculated")

	return calculation, nil
}

// minFloat64 returns the smaller of two float64 values.
func minFloat64(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

// ageOnDate calculates the age in years from a birth date to a reference date.
func ageOnDate(birthDate time.Time, referenceDate time.Time) int {
	age := referenceDate.Year() - birthDate.Year()
	if referenceDate.YearDay() < birthDate.YearDay() {
		age--
	}
	return age
}

// IsChildUnder6CopayExempt returns true if the patient is under 6 years old and
// therefore exempt from co-payment per Vietnamese BHYT regulations.
func IsChildUnder6CopayExempt(dateOfBirth time.Time) bool {
	return ageOnDate(dateOfBirth, time.Now()) < 6
}
