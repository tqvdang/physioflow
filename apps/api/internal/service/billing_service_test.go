package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// MockBillingRepository is a mock implementation
type MockBillingRepository struct {
	mock.Mock
}

func (m *MockBillingRepository) CreateInvoice(ctx context.Context, invoice *model.Invoice) error {
	args := m.Called(ctx, invoice)
	return args.Error(0)
}

func (m *MockBillingRepository) GetInvoiceByID(ctx context.Context, id string) (*model.Invoice, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Invoice), args.Error(1)
}

func (m *MockBillingRepository) GetPatientInvoices(ctx context.Context, patientID string) ([]*model.Invoice, error) {
	args := m.Called(ctx, patientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Invoice), args.Error(1)
}

func (m *MockBillingRepository) UpdateInvoice(ctx context.Context, invoice *model.Invoice) error {
	args := m.Called(ctx, invoice)
	return args.Error(0)
}

func (m *MockBillingRepository) GetServiceCodes(ctx context.Context) ([]*model.PTServiceCode, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.PTServiceCode), args.Error(1)
}

func (m *MockBillingRepository) GetServiceCodeByCode(ctx context.Context, code string) (*model.PTServiceCode, error) {
	args := m.Called(ctx, code)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.PTServiceCode), args.Error(1)
}

func (m *MockBillingRepository) GetNextInvoiceNumber(ctx context.Context, clinicID string) (string, error) {
	args := m.Called(ctx, clinicID)
	return args.String(0), args.Error(1)
}

func (m *MockBillingRepository) RecordPayment(ctx context.Context, payment *model.Payment) error {
	args := m.Called(ctx, payment)
	return args.Error(0)
}

func (m *MockBillingRepository) GetPaymentsByPatientID(ctx context.Context, patientID string) ([]*model.Payment, error) {
	args := m.Called(ctx, patientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Payment), args.Error(1)
}

// MockPatientRepository is a mock implementation
type MockPatientRepository struct {
	mock.Mock
}

type InsuranceInfo struct {
	ValidTo           *interface{}
	CoveragePercentage float64
}

func (m *MockPatientRepository) GetInsuranceInfo(ctx context.Context, patientID string) ([]InsuranceInfo, error) {
	args := m.Called(ctx, patientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]InsuranceInfo), args.Error(1)
}

// TestCalculateBilling tests copay calculation with various coverage levels
func TestCalculateBilling(t *testing.T) {
	tests := []struct {
		name                 string
		serviceCodes         []string
		serviceCodeData      []*model.PTServiceCode
		insuranceInfo        []InsuranceInfo
		expectedTotal        float64
		expectedInsurance    float64
		expectedCopay        float64
		expectedCoveragePercent float64
	}{
		{
			name:         "80% coverage: 100,000 VND → 20,000 copay",
			serviceCodes: []string{"PT-EVAL"},
			serviceCodeData: []*model.PTServiceCode{
				{
					ID:            "sc-1",
					Code:          "PT-EVAL",
					Name:          "Physical Therapy Evaluation",
					UnitPrice:     100000,
					Currency:      "VND",
					BHYTCoverable: true,
				},
			},
			insuranceInfo: []InsuranceInfo{
				{ValidTo: nil, CoveragePercentage: 80.0},
			},
			expectedTotal:           100000,
			expectedInsurance:       80000,
			expectedCopay:           20000,
			expectedCoveragePercent: 80.0,
		},
		{
			name:         "100% coverage: 100,000 VND → 0 copay",
			serviceCodes: []string{"PT-EVAL"},
			serviceCodeData: []*model.PTServiceCode{
				{
					ID:            "sc-1",
					Code:          "PT-EVAL",
					Name:          "Physical Therapy Evaluation",
					UnitPrice:     100000,
					Currency:      "VND",
					BHYTCoverable: true,
				},
			},
			insuranceInfo: []InsuranceInfo{
				{ValidTo: nil, CoveragePercentage: 100.0},
			},
			expectedTotal:           100000,
			expectedInsurance:       100000,
			expectedCopay:           0,
			expectedCoveragePercent: 100.0,
		},
		{
			name:         "0% coverage (no insurance): 100,000 VND → 100,000 copay",
			serviceCodes: []string{"PT-EVAL"},
			serviceCodeData: []*model.PTServiceCode{
				{
					ID:            "sc-1",
					Code:          "PT-EVAL",
					Name:          "Physical Therapy Evaluation",
					UnitPrice:     100000,
					Currency:      "VND",
					BHYTCoverable: true,
				},
			},
			insuranceInfo:           []InsuranceInfo{},
			expectedTotal:           100000,
			expectedInsurance:       0,
			expectedCopay:           100000,
			expectedCoveragePercent: 0,
		},
		{
			name:         "Multiple services with 80% coverage",
			serviceCodes: []string{"PT-EVAL", "PT-MANUAL"},
			serviceCodeData: []*model.PTServiceCode{
				{
					ID:            "sc-1",
					Code:          "PT-EVAL",
					Name:          "PT Evaluation",
					UnitPrice:     100000,
					Currency:      "VND",
					BHYTCoverable: true,
				},
				{
					ID:            "sc-2",
					Code:          "PT-MANUAL",
					Name:          "Manual Therapy",
					UnitPrice:     150000,
					Currency:      "VND",
					BHYTCoverable: true,
				},
			},
			insuranceInfo: []InsuranceInfo{
				{ValidTo: nil, CoveragePercentage: 80.0},
			},
			expectedTotal:           250000,
			expectedInsurance:       200000,
			expectedCopay:           50000,
			expectedCoveragePercent: 80.0,
		},
		{
			name:         "Service not covered by BHYT",
			serviceCodes: []string{"PT-CUSTOM"},
			serviceCodeData: []*model.PTServiceCode{
				{
					ID:            "sc-3",
					Code:          "PT-CUSTOM",
					Name:          "Custom Service",
					UnitPrice:     100000,
					Currency:      "VND",
					BHYTCoverable: false, // Not covered
				},
			},
			insuranceInfo: []InsuranceInfo{
				{ValidTo: nil, CoveragePercentage: 80.0},
			},
			expectedTotal:           100000,
			expectedInsurance:       0,     // No coverage for non-BHYT service
			expectedCopay:           100000,
			expectedCoveragePercent: 80.0,
		},
		{
			name:         "Mixed: covered and non-covered services",
			serviceCodes: []string{"PT-EVAL", "PT-CUSTOM"},
			serviceCodeData: []*model.PTServiceCode{
				{
					ID:            "sc-1",
					Code:          "PT-EVAL",
					Name:          "PT Evaluation",
					UnitPrice:     100000,
					Currency:      "VND",
					BHYTCoverable: true,
				},
				{
					ID:            "sc-3",
					Code:          "PT-CUSTOM",
					Name:          "Custom Service",
					UnitPrice:     50000,
					Currency:      "VND",
					BHYTCoverable: false,
				},
			},
			insuranceInfo: []InsuranceInfo{
				{ValidTo: nil, CoveragePercentage: 80.0},
			},
			expectedTotal:           150000,
			expectedInsurance:       80000, // Only covers PT-EVAL
			expectedCopay:           70000, // Full PT-CUSTOM + copay for PT-EVAL
			expectedCoveragePercent: 80.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockBilling := new(MockBillingRepository)
			mockPatient := new(MockPatientRepository)
			service := NewBillingService(mockBilling, mockPatient)

			mockPatient.On("GetInsuranceInfo", mock.Anything, "patient-123").Return(tt.insuranceInfo, nil)

			for _, sc := range tt.serviceCodeData {
				mockBilling.On("GetServiceCodeByCode", mock.Anything, sc.Code).Return(sc, nil)
			}

			result, err := service.CalculateBilling(context.Background(), "patient-123", tt.serviceCodes)

			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.Equal(t, tt.expectedTotal, result.TotalAmount, "Total amount mismatch")
			assert.Equal(t, tt.expectedInsurance, result.InsuranceAmount, "Insurance amount mismatch")
			assert.Equal(t, tt.expectedCopay, result.CopayAmount, "Copay amount mismatch")
			assert.Equal(t, tt.expectedCoveragePercent, result.CoveragePercent, "Coverage percent mismatch")

			mockBilling.AssertExpectations(t)
			mockPatient.AssertExpectations(t)
		})
	}
}

// TestRecordPayment tests payment recording and invoice status updates
func TestRecordPayment(t *testing.T) {
	tests := []struct {
		name            string
		invoice         *model.Invoice
		paymentAmount   float64
		expectedStatus  model.InvoiceStatus
		expectedBalance float64
		expectError     bool
		errorMsg        string
	}{
		{
			name: "Full payment on pending invoice",
			invoice: &model.Invoice{
				ID:            "inv-1",
				Status:        model.InvoiceStatusPending,
				PatientAmount: 100000,
				PaidAmount:    0,
				BalanceDue:    100000,
			},
			paymentAmount:   100000,
			expectedStatus:  model.InvoiceStatusPaid,
			expectedBalance: 0,
			expectError:     false,
		},
		{
			name: "Partial payment",
			invoice: &model.Invoice{
				ID:            "inv-2",
				Status:        model.InvoiceStatusPending,
				PatientAmount: 100000,
				PaidAmount:    0,
				BalanceDue:    100000,
			},
			paymentAmount:   50000,
			expectedStatus:  model.InvoiceStatusPartial,
			expectedBalance: 50000,
			expectError:     false,
		},
		{
			name: "Second payment completes invoice",
			invoice: &model.Invoice{
				ID:            "inv-3",
				Status:        model.InvoiceStatusPartial,
				PatientAmount: 100000,
				PaidAmount:    60000,
				BalanceDue:    40000,
			},
			paymentAmount:   40000,
			expectedStatus:  model.InvoiceStatusPaid,
			expectedBalance: 0,
			expectError:     false,
		},
		{
			name: "Overpayment creates credit (no error)",
			invoice: &model.Invoice{
				ID:            "inv-4",
				PatientID:     "patient-123",
				Status:        model.InvoiceStatusPending,
				PatientAmount: 100000,
				PaidAmount:    0,
				BalanceDue:    100000,
			},
			paymentAmount:   150000,
			expectedStatus:  model.InvoiceStatusPaid,
			expectedBalance: 0,
			expectError:     false,
		},
		{
			name: "Cannot pay cancelled invoice",
			invoice: &model.Invoice{
				ID:            "inv-5",
				Status:        model.InvoiceStatusCancelled,
				PatientAmount: 100000,
				PaidAmount:    0,
				BalanceDue:    100000,
			},
			paymentAmount: 100000,
			expectError:   true,
			errorMsg:      "cannot record payment on cancelled invoice",
		},
		{
			name: "Cannot pay already paid invoice",
			invoice: &model.Invoice{
				ID:            "inv-6",
				Status:        model.InvoiceStatusPaid,
				PatientAmount: 100000,
				PaidAmount:    100000,
				BalanceDue:    0,
			},
			paymentAmount: 10000,
			expectError:   true,
			errorMsg:      "invoice is already fully paid",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockBilling := new(MockBillingRepository)
			mockPatient := new(MockPatientRepository)
			service := NewBillingService(mockBilling, mockPatient)

			mockBilling.On("GetInvoiceByID", mock.Anything, tt.invoice.ID).Return(tt.invoice, nil)

			if !tt.expectError {
				mockBilling.On("RecordPayment", mock.Anything, mock.AnythingOfType("*model.Payment")).Return(nil)
				mockBilling.On("UpdateInvoice", mock.Anything, mock.AnythingOfType("*model.Invoice")).
					Run(func(args mock.Arguments) {
						invoice := args.Get(1).(*model.Invoice)
						assert.Equal(t, tt.expectedStatus, invoice.Status)
						assert.Equal(t, tt.expectedBalance, invoice.BalanceDue)
					}).
					Return(nil)
			}

			request := &model.RecordPaymentRequest{
				InvoiceID: tt.invoice.ID,
				Amount:    tt.paymentAmount,
				Method:    "cash",
			}

			result, err := service.RecordPayment(context.Background(), "clinic-123", "user-123", request)

			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, tt.paymentAmount, result.Amount)
				mockBilling.AssertExpectations(t)
			}
		})
	}
}

// TestRoundVND tests VND rounding function
func TestRoundVND(t *testing.T) {
	tests := []struct {
		input    float64
		expected float64
	}{
		{100000.0, 100000.0},
		{100000.4, 100000.0},
		{100000.5, 100001.0},
		{100000.9, 100001.0},
		{0.0, 0.0},
		{-100000.5, -100001.0},
	}

	for _, tt := range tests {
		t.Run("", func(t *testing.T) {
			result := roundVND(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// TestCreateInvoice tests invoice creation with line items
func TestCreateInvoice(t *testing.T) {
	serviceCode := &model.PTServiceCode{
		ID:            "sc-1",
		Code:          "PT-EVAL",
		Name:          "PT Evaluation",
		NameVi:        "Đánh giá vật lý trị liệu",
		UnitPrice:     100000,
		Currency:      "VND",
		BHYTCoverable: true,
		IsActive:      true,
	}

	tests := []struct {
		name              string
		request           *model.CreateInvoiceRequest
		insuranceInfo     []InsuranceInfo
		expectedSubtotal  float64
		expectedInsurance float64
		expectedPatient   float64
		expectedBalance   float64
	}{
		{
			name: "Single item invoice with 80% coverage",
			request: &model.CreateInvoiceRequest{
				PatientID: "patient-123",
				Items: []model.CreateInvoiceItemRequest{
					{ServiceCodeID: "sc-1", Quantity: 1},
				},
				DiscountAmount: 0,
			},
			insuranceInfo: []InsuranceInfo{
				{ValidTo: nil, CoveragePercentage: 80.0},
			},
			expectedSubtotal:  100000,
			expectedInsurance: 80000,
			expectedPatient:   20000,
			expectedBalance:   20000,
		},
		{
			name: "Multiple items with discount",
			request: &model.CreateInvoiceRequest{
				PatientID: "patient-123",
				Items: []model.CreateInvoiceItemRequest{
					{ServiceCodeID: "sc-1", Quantity: 2},
				},
				DiscountAmount: 10000,
				DiscountReason: "Loyalty discount",
			},
			insuranceInfo: []InsuranceInfo{
				{ValidTo: nil, CoveragePercentage: 80.0},
			},
			expectedSubtotal:  200000,
			expectedInsurance: 160000, // 80% of 200000
			expectedPatient:   30000,  // 200000 - 10000 - 160000
			expectedBalance:   30000,
		},
		{
			name: "No insurance coverage",
			request: &model.CreateInvoiceRequest{
				PatientID: "patient-123",
				Items: []model.CreateInvoiceItemRequest{
					{ServiceCodeID: "sc-1", Quantity: 1},
				},
				DiscountAmount: 0,
			},
			insuranceInfo:     []InsuranceInfo{},
			expectedSubtotal:  100000,
			expectedInsurance: 0,
			expectedPatient:   100000,
			expectedBalance:   100000,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockBilling := new(MockBillingRepository)
			mockPatient := new(MockPatientRepository)
			service := NewBillingService(mockBilling, mockPatient)

			mockBilling.On("GetNextInvoiceNumber", mock.Anything, "clinic-123").Return("INV-2024-001", nil)
			mockPatient.On("GetInsuranceInfo", mock.Anything, "patient-123").Return(tt.insuranceInfo, nil)
			mockBilling.On("GetServiceCodes", mock.Anything).Return([]*model.PTServiceCode{serviceCode}, nil)
			mockBilling.On("CreateInvoice", mock.Anything, mock.AnythingOfType("*model.Invoice")).
				Run(func(args mock.Arguments) {
					invoice := args.Get(1).(*model.Invoice)
					assert.Equal(t, tt.expectedSubtotal, invoice.Subtotal)
					assert.Equal(t, tt.expectedInsurance, invoice.InsuranceAmount)
					assert.Equal(t, tt.expectedPatient, invoice.PatientAmount)
					assert.Equal(t, tt.expectedBalance, invoice.BalanceDue)
				}).
				Return(nil)

			result, err := service.CreateInvoice(context.Background(), "clinic-123", "patient-123", "user-123", tt.request)

			assert.NoError(t, err)
			assert.NotNil(t, result)
			mockBilling.AssertExpectations(t)
			mockPatient.AssertExpectations(t)
		})
	}
}
