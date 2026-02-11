package service

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
)

// MockInsuranceRepository is a mock implementation of InsuranceRepository
type MockInsuranceRepository struct {
	mock.Mock
}

func (m *MockInsuranceRepository) Create(ctx context.Context, card *model.BHYTCard) error {
	args := m.Called(ctx, card)
	return args.Error(0)
}

func (m *MockInsuranceRepository) GetByID(ctx context.Context, id string) (*model.BHYTCard, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.BHYTCard), args.Error(1)
}

func (m *MockInsuranceRepository) GetByPatientID(ctx context.Context, patientID string) (*model.BHYTCard, error) {
	args := m.Called(ctx, patientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.BHYTCard), args.Error(1)
}

func (m *MockInsuranceRepository) Update(ctx context.Context, card *model.BHYTCard) error {
	args := m.Called(ctx, card)
	return args.Error(0)
}

func (m *MockInsuranceRepository) ValidateCard(ctx context.Context, cardNumber string) (*model.BHYTValidationResult, error) {
	args := m.Called(ctx, cardNumber)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.BHYTValidationResult), args.Error(1)
}

// MockAuditRepository is a mock implementation of AuditRepository
type MockAuditRepository struct {
	mock.Mock
}

func (m *MockAuditRepository) LogAction(ctx context.Context, entry *model.AuditEntry) error {
	args := m.Called(ctx, entry)
	return args.Error(0)
}

// TestValidateBHYTCard tests card validation with various card formats
func TestValidateBHYTCard(t *testing.T) {
	tests := []struct {
		name             string
		cardNumber       string
		dbResult         *model.BHYTValidationResult
		dbError          error
		expectedValid    bool
		expectedPrefix   string
		expectedBeneficiary model.BHYTBeneficiaryType
		expectedCoverage float64
		expectedErrors   []string
	}{
		{
			name:             "Valid HC1 card (civil servant, 80% coverage)",
			cardNumber:       "HC1011234567890",
			dbResult:         &model.BHYTValidationResult{IsExpired: false, IsContinuous: false},
			expectedValid:    true,
			expectedPrefix:   "HC",
			expectedBeneficiary: model.BHYTBeneficiary80,
			expectedCoverage: 80.0,
			expectedErrors:   nil,
		},
		{
			name:             "Valid DN2 card (salaried worker, 100% coverage)",
			cardNumber:       "DN2011234567890",
			dbResult:         &model.BHYTValidationResult{IsExpired: false, IsContinuous: true},
			expectedValid:    true,
			expectedPrefix:   "DN",
			expectedBeneficiary: model.BHYTBeneficiary100,
			expectedCoverage: 100.0,
			expectedErrors:   nil,
		},
		{
			name:             "Valid HT3 card (retiree, 95% coverage)",
			cardNumber:       "HT3011234567890",
			dbResult:         &model.BHYTValidationResult{IsExpired: false, IsContinuous: false},
			expectedValid:    true,
			expectedPrefix:   "HT",
			expectedBeneficiary: model.BHYTBeneficiary95,
			expectedCoverage: 95.0,
			expectedErrors:   nil,
		},
		{
			name:             "Valid TN5 card (voluntary, 70% coverage)",
			cardNumber:       "TN5011234567890",
			dbResult:         &model.BHYTValidationResult{IsExpired: false, IsContinuous: false},
			expectedValid:    true,
			expectedPrefix:   "TN",
			expectedBeneficiary: model.BHYTBeneficiary70,
			expectedCoverage: 70.0,
			expectedErrors:   nil,
		},
		{
			name:             "Invalid format - too short",
			cardNumber:       "HC101123456",
			dbResult:         nil,
			expectedValid:    false,
			expectedPrefix:   "",
			expectedBeneficiary: 0,
			expectedCoverage: 0,
			expectedErrors:   []string{"card number does not match expected format"},
		},
		{
			name:             "Invalid format - contains letters in number part",
			cardNumber:       "HC10112345ABC90",
			dbResult:         nil,
			expectedValid:    false,
			expectedPrefix:   "",
			expectedBeneficiary: 0,
			expectedCoverage: 0,
			expectedErrors:   []string{"card number does not match expected format"},
		},
		{
			name:             "Invalid prefix code",
			cardNumber:       "ZZ1011234567890",
			dbResult:         nil,
			expectedValid:    false,
			expectedPrefix:   "",
			expectedBeneficiary: 0,
			expectedCoverage: 0,
			expectedErrors:   []string{"card number does not match expected format"},
		},
		{
			name:             "Expired card",
			cardNumber:       "HC1011234567890",
			dbResult:         &model.BHYTValidationResult{IsExpired: true, IsContinuous: false, Errors: []string{}},
			expectedValid:    false,
			expectedPrefix:   "HC",
			expectedBeneficiary: model.BHYTBeneficiary80,
			expectedCoverage: 80.0,
			expectedErrors:   []string{"card has expired"},
		},
		{
			name:             "Valid format but unrecognized prefix",
			cardNumber:       "XX1011234567890",
			dbResult:         &model.BHYTValidationResult{IsExpired: false, IsContinuous: false},
			expectedValid:    false,
			expectedPrefix:   "XX",
			expectedBeneficiary: model.BHYTBeneficiary80,
			expectedCoverage: 80.0,
			expectedErrors:   []string{"unrecognized prefix code: XX"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockInsuranceRepository)
			mockAudit := new(MockAuditRepository)
			service := NewInsuranceService(mockRepo, mockAudit)

			// Only setup mock expectations if card passes format validation
			if tt.dbResult != nil || tt.dbError != nil {
				mockRepo.On("ValidateCard", mock.Anything, tt.cardNumber).Return(tt.dbResult, tt.dbError)
			}
			mockAudit.On("LogAction", mock.Anything, mock.Anything).Return(nil)

			result, err := service.ValidateBHYTCard(context.Background(), tt.cardNumber, "user-123")

			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.Equal(t, tt.expectedValid, result.IsValid)

			if tt.expectedPrefix != "" {
				assert.Equal(t, tt.expectedPrefix, result.Prefix)
			}

			if tt.expectedBeneficiary != 0 {
				assert.Equal(t, tt.expectedBeneficiary, result.BeneficiaryType)
			}

			if tt.expectedCoverage > 0 {
				assert.Equal(t, tt.expectedCoverage, result.CoveragePercent)
			}

			if tt.expectedErrors != nil {
				for _, expectedErr := range tt.expectedErrors {
					assert.Contains(t, result.Errors, expectedErr)
				}
			}

			mockAudit.AssertExpectations(t)
		})
	}
}

// TestCalculateCoverage tests BHYT coverage calculation
func TestCalculateCoverage(t *testing.T) {
	tests := []struct {
		name                 string
		card                 *model.BHYTCard
		request              *model.CalculateCoverageRequest
		expectedCoverage     float64
		expectedInsurancePays float64
		expectedPatientPays  float64
	}{
		{
			name: "80% coverage at correct facility",
			card: &model.BHYTCard{
				ID:              "card-1",
				BeneficiaryType: model.BHYTBeneficiary80,
				FiveYearContinuous: false,
			},
			request: &model.CalculateCoverageRequest{
				TotalAmount:       100000,
				IsCorrectFacility: true,
				IsReferral:        false,
			},
			expectedCoverage:     80.0,
			expectedInsurancePays: 80000,
			expectedPatientPays:  20000,
		},
		{
			name: "100% coverage for poor household",
			card: &model.BHYTCard{
				ID:              "card-2",
				BeneficiaryType: model.BHYTBeneficiary100,
				FiveYearContinuous: false,
			},
			request: &model.CalculateCoverageRequest{
				TotalAmount:       100000,
				IsCorrectFacility: true,
				IsReferral:        false,
			},
			expectedCoverage:     100.0,
			expectedInsurancePays: 100000,
			expectedPatientPays:  0,
		},
		{
			name: "95% coverage for near-poor",
			card: &model.BHYTCard{
				ID:              "card-3",
				BeneficiaryType: model.BHYTBeneficiary95,
				FiveYearContinuous: false,
			},
			request: &model.CalculateCoverageRequest{
				TotalAmount:       100000,
				IsCorrectFacility: true,
				IsReferral:        false,
			},
			expectedCoverage:     95.0,
			expectedInsurancePays: 95000,
			expectedPatientPays:  5000,
		},
		{
			name: "Wrong facility without referral reduces to 40%",
			card: &model.BHYTCard{
				ID:              "card-4",
				BeneficiaryType: model.BHYTBeneficiary80,
				FiveYearContinuous: false,
			},
			request: &model.CalculateCoverageRequest{
				TotalAmount:       100000,
				IsCorrectFacility: false,
				IsReferral:        false,
			},
			expectedCoverage:     40.0,
			expectedInsurancePays: 40000,
			expectedPatientPays:  60000,
		},
		{
			name: "Wrong facility with referral keeps base coverage",
			card: &model.BHYTCard{
				ID:              "card-5",
				BeneficiaryType: model.BHYTBeneficiary80,
				FiveYearContinuous: false,
			},
			request: &model.CalculateCoverageRequest{
				TotalAmount:       100000,
				IsCorrectFacility: false,
				IsReferral:        true,
			},
			expectedCoverage:     80.0,
			expectedInsurancePays: 80000,
			expectedPatientPays:  20000,
		},
		{
			name: "Five-year continuous bonus adds 5%",
			card: &model.BHYTCard{
				ID:              "card-6",
				BeneficiaryType: model.BHYTBeneficiary80,
				FiveYearContinuous: true,
			},
			request: &model.CalculateCoverageRequest{
				TotalAmount:       100000,
				IsCorrectFacility: true,
				IsReferral:        false,
			},
			expectedCoverage:     85.0,
			expectedInsurancePays: 85000,
			expectedPatientPays:  15000,
		},
		{
			name: "Five-year bonus doesn't exceed 100%",
			card: &model.BHYTCard{
				ID:              "card-7",
				BeneficiaryType: model.BHYTBeneficiary100,
				FiveYearContinuous: true,
			},
			request: &model.CalculateCoverageRequest{
				TotalAmount:       100000,
				IsCorrectFacility: true,
				IsReferral:        false,
			},
			expectedCoverage:     100.0,
			expectedInsurancePays: 100000,
			expectedPatientPays:  0,
		},
		{
			name: "Zero amount edge case",
			card: &model.BHYTCard{
				ID:              "card-8",
				BeneficiaryType: model.BHYTBeneficiary80,
				FiveYearContinuous: false,
			},
			request: &model.CalculateCoverageRequest{
				TotalAmount:       0,
				IsCorrectFacility: true,
				IsReferral:        false,
			},
			expectedCoverage:     80.0,
			expectedInsurancePays: 0,
			expectedPatientPays:  0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockInsuranceRepository)
			mockAudit := new(MockAuditRepository)
			service := NewInsuranceService(mockRepo, mockAudit)

			mockRepo.On("GetByPatientID", mock.Anything, "patient-123").Return(tt.card, nil)

			result, err := service.CalculateCoverage(context.Background(), "patient-123", tt.request)

			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.Equal(t, tt.expectedCoverage, result.CoveragePercent)
			assert.Equal(t, tt.expectedInsurancePays, result.InsurancePays)
			assert.Equal(t, tt.expectedPatientPays, result.PatientPays)

			mockRepo.AssertExpectations(t)
		})
	}
}

// TestCreateInsurance tests BHYT card creation with validation
func TestCreateInsurance(t *testing.T) {
	tests := []struct {
		name        string
		request     *model.CreateBHYTCardRequest
		expectError bool
		errorMsg    string
	}{
		{
			name: "Valid card creation",
			request: &model.CreateBHYTCardRequest{
				PatientID:              "patient-123",
				CardNumber:             "HC1011234567890",
				HolderName:             "Nguyen Van A",
				HolderNameVi:           "Nguyễn Văn A",
				DateOfBirth:            "1980-01-01",
				RegisteredFacilityCode: "01234",
				RegisteredFacilityName: "Hospital A",
				ValidFrom:              "2024-01-01",
				ValidTo:                "2024-12-31",
				FiveYearContinuous:     false,
				Notes:                  "Test card",
			},
			expectError: false,
		},
		{
			name: "Invalid card format",
			request: &model.CreateBHYTCardRequest{
				PatientID:              "patient-123",
				CardNumber:             "INVALID",
				HolderName:             "Nguyen Van A",
				HolderNameVi:           "Nguyễn Văn A",
				DateOfBirth:            "1980-01-01",
				RegisteredFacilityCode: "01234",
				ValidFrom:              "2024-01-01",
			},
			expectError: true,
			errorMsg:    "invalid BHYT card number format",
		},
		{
			name: "Invalid prefix code",
			request: &model.CreateBHYTCardRequest{
				PatientID:              "patient-123",
				CardNumber:             "ZZ1011234567890",
				HolderName:             "Nguyen Van A",
				HolderNameVi:           "Nguyễn Văn A",
				DateOfBirth:            "1980-01-01",
				RegisteredFacilityCode: "01234",
				ValidFrom:              "2024-01-01",
			},
			expectError: true,
			errorMsg:    "unrecognized BHYT prefix code",
		},
		{
			name: "Invalid date format",
			request: &model.CreateBHYTCardRequest{
				PatientID:              "patient-123",
				CardNumber:             "HC1011234567890",
				HolderName:             "Nguyen Van A",
				HolderNameVi:           "Nguyễn Văn A",
				DateOfBirth:            "invalid-date",
				RegisteredFacilityCode: "01234",
				ValidFrom:              "2024-01-01",
			},
			expectError: true,
			errorMsg:    "invalid date of birth format",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockInsuranceRepository)
			mockAudit := new(MockAuditRepository)
			service := NewInsuranceService(mockRepo, mockAudit)

			if !tt.expectError {
				mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*model.BHYTCard")).Return(nil)
				mockAudit.On("LogAction", mock.Anything, mock.Anything).Return(nil)
			}

			result, err := service.CreateInsurance(context.Background(), "patient-123", "clinic-123", "user-123", tt.request)

			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, tt.request.CardNumber, result.CardNumber)
				assert.Equal(t, "HC", result.Prefix)
				assert.Equal(t, model.BHYTBeneficiary80, result.BeneficiaryType)
				mockRepo.AssertExpectations(t)
				mockAudit.AssertExpectations(t)
			}
		})
	}
}

// TestBeneficiaryTypeCoverage ensures all beneficiary types have correct coverage
func TestBeneficiaryTypeCoverage(t *testing.T) {
	tests := []struct {
		beneficiaryType     model.BHYTBeneficiaryType
		expectedCoverage    float64
	}{
		{model.BHYTBeneficiary80, 80.0},
		{model.BHYTBeneficiary100, 100.0},
		{model.BHYTBeneficiary95, 95.0},
		{model.BHYTBeneficiary40, 40.0},
		{model.BHYTBeneficiary70, 70.0},
	}

	for _, tt := range tests {
		t.Run(string(rune(tt.beneficiaryType)), func(t *testing.T) {
			coverage, exists := beneficiaryTypeCoverage[tt.beneficiaryType]
			assert.True(t, exists, "Beneficiary type should exist in coverage map")
			assert.Equal(t, tt.expectedCoverage, coverage)
		})
	}
}

// TestValidPrefixes ensures all 17 BHYT prefixes are recognized
func TestValidPrefixes(t *testing.T) {
	expectedPrefixes := []string{
		"DN", "HC", "HT", "TE", "HS", "HN", "CN", "TN", "CC", "QN",
		"CA", "NN", "GD", "NO", "CB", "XK", "TX",
	}

	for _, prefix := range expectedPrefixes {
		t.Run(prefix, func(t *testing.T) {
			assert.True(t, validPrefixes[prefix], "Prefix %s should be valid", prefix)
		})
	}

	// Verify count matches
	assert.Equal(t, len(expectedPrefixes), len(validPrefixes), "Should have exactly 17 valid prefixes")

	// Test invalid prefix
	assert.False(t, validPrefixes["ZZ"], "Invalid prefix should not be valid")
	assert.False(t, validPrefixes["SV"], "SV should not be a valid prefix")
}

// TestUpdateInsurance tests card update functionality
func TestUpdateInsurance(t *testing.T) {
	now := time.Now()
	validTo := now.AddDate(1, 0, 0)
	existingCard := &model.BHYTCard{
		ID:              "card-1",
		PatientID:       "patient-123",
		ClinicID:        "clinic-123",
		CardNumber:      "HC1011234567890",
		Prefix:          "HC",
		BeneficiaryType: model.BHYTBeneficiary80,
		ProvinceCode:    "01",
		HolderName:      "Nguyen Van A",
		HolderNameVi:    "Nguyễn Văn A",
		ValidFrom:       now,
		ValidTo:         &validTo,
		IsActive:        true,
	}

	newCardNumber := "DN2021234567890"
	updateReq := &model.UpdateBHYTCardRequest{
		CardNumber: &newCardNumber,
	}

	mockRepo := new(MockInsuranceRepository)
	mockAudit := new(MockAuditRepository)
	service := NewInsuranceService(mockRepo, mockAudit)

	mockRepo.On("GetByID", mock.Anything, "card-1").Return(existingCard, nil)
	mockRepo.On("Update", mock.Anything, mock.AnythingOfType("*model.BHYTCard")).Return(nil)
	mockAudit.On("LogAction", mock.Anything, mock.Anything).Return(nil)

	result, err := service.UpdateInsurance(context.Background(), "card-1", "user-123", updateReq)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, newCardNumber, result.CardNumber)
	assert.Equal(t, "DN", result.Prefix)
	assert.Equal(t, model.BHYTBeneficiary100, result.BeneficiaryType)
	assert.Equal(t, model.InsuranceVerificationPending, result.Verification) // Should reset to pending

	mockRepo.AssertExpectations(t)
	mockAudit.AssertExpectations(t)
}

// TestCreateInsuranceWithNewFields tests card creation with hospital registration code and expiration date
func TestCreateInsuranceWithNewFields(t *testing.T) {
	mockRepo := new(MockInsuranceRepository)
	mockAudit := new(MockAuditRepository)
	svc := NewInsuranceService(mockRepo, mockAudit)

	req := &model.CreateBHYTCardRequest{
		PatientID:                "patient-123",
		CardNumber:               "CA1011234567890",
		HolderName:               "Nguyen Van B",
		HolderNameVi:             "Nguyễn Văn B",
		DateOfBirth:              "1950-05-15",
		RegisteredFacilityCode:   "79024",
		RegisteredFacilityName:   "Hospital B",
		HospitalRegistrationCode: "79024",
		ExpirationDate:           "2026-12-31",
		ValidFrom:                "2024-01-01",
		ValidTo:                  "2026-12-31",
		FiveYearContinuous:       true,
		Notes:                    "Veteran card",
	}

	mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*model.BHYTCard")).Return(nil)
	mockAudit.On("LogAction", mock.Anything, mock.Anything).Return(nil)

	result, err := svc.CreateInsurance(context.Background(), "patient-123", "clinic-123", "user-123", req)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "CA", result.Prefix)
	assert.Equal(t, "79024", result.HospitalRegistrationCode)
	assert.NotNil(t, result.ExpirationDate)
	assert.True(t, result.FiveYearContinuous)

	mockRepo.AssertExpectations(t)
	mockAudit.AssertExpectations(t)
}

// TestCalculateCoverageExpiredCard tests that expired cards are rejected
func TestCalculateCoverageExpiredCard(t *testing.T) {
	mockRepo := new(MockInsuranceRepository)
	mockAudit := new(MockAuditRepository)
	svc := NewInsuranceService(mockRepo, mockAudit)

	expiredDate := time.Now().AddDate(0, 0, -1) // yesterday
	card := &model.BHYTCard{
		ID:              "card-expired",
		BeneficiaryType: model.BHYTBeneficiary80,
		ExpirationDate:  &expiredDate,
		ValidFrom:       time.Now().AddDate(-1, 0, 0),
	}

	mockRepo.On("GetByPatientID", mock.Anything, "patient-123").Return(card, nil)

	req := &model.CalculateCoverageRequest{
		TotalAmount:       100000,
		IsCorrectFacility: true,
	}

	result, err := svc.CalculateCoverage(context.Background(), "patient-123", req)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.ErrorIs(t, err, ErrCardExpired)

	mockRepo.AssertExpectations(t)
}

// TestCalculateCoverageFacilityMismatch tests facility mismatch detection
func TestCalculateCoverageFacilityMismatch(t *testing.T) {
	mockRepo := new(MockInsuranceRepository)
	mockAudit := new(MockAuditRepository)
	svc := NewInsuranceService(mockRepo, mockAudit)

	futureDate := time.Now().AddDate(1, 0, 0) // next year
	card := &model.BHYTCard{
		ID:                       "card-facility",
		BeneficiaryType:          model.BHYTBeneficiary80,
		HospitalRegistrationCode: "79024",
		ValidFrom:                time.Now().AddDate(-1, 0, 0),
		ValidTo:                  &futureDate,
	}

	mockRepo.On("GetByPatientID", mock.Anything, "patient-123").Return(card, nil)

	req := &model.CalculateCoverageRequest{
		TotalAmount:       100000,
		FacilityCode:      "01001", // different facility
		IsCorrectFacility: true,
	}

	result, err := svc.CalculateCoverage(context.Background(), "patient-123", req)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.ErrorIs(t, err, ErrFacilityMismatch)

	mockRepo.AssertExpectations(t)
}

// TestCalculateCoverageFacilityMatch tests successful facility match
func TestCalculateCoverageFacilityMatch(t *testing.T) {
	mockRepo := new(MockInsuranceRepository)
	mockAudit := new(MockAuditRepository)
	svc := NewInsuranceService(mockRepo, mockAudit)

	futureDate := time.Now().AddDate(1, 0, 0)
	card := &model.BHYTCard{
		ID:                       "card-match",
		BeneficiaryType:          model.BHYTBeneficiary80,
		HospitalRegistrationCode: "79024",
		ValidFrom:                time.Now().AddDate(-1, 0, 0),
		ValidTo:                  &futureDate,
	}

	mockRepo.On("GetByPatientID", mock.Anything, "patient-123").Return(card, nil)

	req := &model.CalculateCoverageRequest{
		TotalAmount:       100000,
		FacilityCode:      "79024", // same facility
		IsCorrectFacility: true,
	}

	result, err := svc.CalculateCoverage(context.Background(), "patient-123", req)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 80.0, result.CoveragePercent)
	assert.Equal(t, 80000.0, result.InsurancePays)

	mockRepo.AssertExpectations(t)
}

// TestValidateNewPrefixCodes tests that new prefix codes HS, CA, GD, NO, CB, XK, TX are accepted
func TestValidateNewPrefixCodes(t *testing.T) {
	newPrefixes := []struct {
		prefix   string
		name     string
	}{
		{"HS", "Students"},
		{"CA", "Veterans"},
		{"GD", "Martyrs' families"},
		{"NO", "Elderly 80+"},
		{"CB", "War veterans"},
		{"XK", "Poor/near-poor"},
		{"TX", "Social insurance"},
	}

	for _, tt := range newPrefixes {
		t.Run(tt.prefix+"_"+tt.name, func(t *testing.T) {
			mockRepo := new(MockInsuranceRepository)
			mockAudit := new(MockAuditRepository)
			svc := NewInsuranceService(mockRepo, mockAudit)

			cardNumber := tt.prefix + "1011234567890"

			mockRepo.On("ValidateCard", mock.Anything, cardNumber).Return(
				&model.BHYTValidationResult{IsExpired: false, IsContinuous: false}, nil,
			)
			mockAudit.On("LogAction", mock.Anything, mock.Anything).Return(nil)

			result, err := svc.ValidateBHYTCard(context.Background(), cardNumber, "user-123")

			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.True(t, result.IsValid, "Card with prefix %s should be valid", tt.prefix)
			assert.Equal(t, tt.prefix, result.Prefix)

			mockAudit.AssertExpectations(t)
		})
	}
}

// TestUpdateInsuranceWithNewFields tests updating hospital registration code and expiration date
func TestUpdateInsuranceWithNewFields(t *testing.T) {
	now := time.Now()
	validTo := now.AddDate(1, 0, 0)
	existingCard := &model.BHYTCard{
		ID:              "card-update-new",
		PatientID:       "patient-123",
		ClinicID:        "clinic-123",
		CardNumber:      "HC1011234567890",
		Prefix:          "HC",
		BeneficiaryType: model.BHYTBeneficiary80,
		ProvinceCode:    "01",
		HolderName:      "Nguyen Van A",
		HolderNameVi:    "Nguyễn Văn A",
		ValidFrom:       now,
		ValidTo:         &validTo,
		IsActive:        true,
	}

	regCode := "79024"
	expDate := "2026-12-31"
	updateReq := &model.UpdateBHYTCardRequest{
		HospitalRegistrationCode: &regCode,
		ExpirationDate:           &expDate,
	}

	mockRepo := new(MockInsuranceRepository)
	mockAudit := new(MockAuditRepository)
	svc := NewInsuranceService(mockRepo, mockAudit)

	mockRepo.On("GetByID", mock.Anything, "card-update-new").Return(existingCard, nil)
	mockRepo.On("Update", mock.Anything, mock.AnythingOfType("*model.BHYTCard")).Return(nil)
	mockAudit.On("LogAction", mock.Anything, mock.Anything).Return(nil)

	result, err := svc.UpdateInsurance(context.Background(), "card-update-new", "user-123", updateReq)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "79024", result.HospitalRegistrationCode)
	assert.NotNil(t, result.ExpirationDate)

	mockRepo.AssertExpectations(t)
	mockAudit.AssertExpectations(t)
}
