package service

import (
	"context"
	"encoding/xml"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// MockBHYTClaimRepository is a mock implementation of BHYTClaimRepository.
type MockBHYTClaimRepository struct {
	mock.Mock
}

func (m *MockBHYTClaimRepository) CreateClaim(ctx context.Context, claim *model.BHYTClaim) error {
	args := m.Called(ctx, claim)
	claim.CreatedAt = time.Now()
	claim.UpdatedAt = time.Now()
	return args.Error(0)
}

func (m *MockBHYTClaimRepository) GetClaimByID(ctx context.Context, id string) (*model.BHYTClaim, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.BHYTClaim), args.Error(1)
}

func (m *MockBHYTClaimRepository) ListClaims(ctx context.Context, params model.BHYTClaimSearchParams) ([]model.BHYTClaim, int64, error) {
	args := m.Called(ctx, params)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]model.BHYTClaim), args.Get(1).(int64), args.Error(2)
}

func (m *MockBHYTClaimRepository) UpdateClaimStatus(ctx context.Context, id string, status model.BHYTClaimStatus, updatedBy *string) error {
	args := m.Called(ctx, id, status, updatedBy)
	return args.Error(0)
}

func (m *MockBHYTClaimRepository) CreateLineItems(ctx context.Context, items []model.BHYTClaimLineItem) error {
	args := m.Called(ctx, items)
	return args.Error(0)
}

func (m *MockBHYTClaimRepository) GetLineItemsByClaimID(ctx context.Context, claimID string) ([]model.BHYTClaimLineItem, error) {
	args := m.Called(ctx, claimID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]model.BHYTClaimLineItem), args.Error(1)
}

func (m *MockBHYTClaimRepository) GetBillableServices(ctx context.Context, clinicID string, facilityCode string, month, year int) ([]model.BHYTClaimLineItem, error) {
	args := m.Called(ctx, clinicID, facilityCode, month, year)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]model.BHYTClaimLineItem), args.Error(1)
}

// TestGenerateClaimFile tests the claim generation flow.
func TestGenerateClaimFile(t *testing.T) {
	tests := []struct {
		name             string
		facilityCode     string
		month            int
		year             int
		billableItems    []model.BHYTClaimLineItem
		expectError      bool
		errorContains    string
		expectedTotal    float64
		expectedInsurance float64
		expectedPatient  float64
		expectedCount    int
	}{
		{
			name:         "Successful claim generation with multiple patients",
			facilityCode: "12345",
			month:        1,
			year:         2026,
			billableItems: []model.BHYTClaimLineItem{
				{
					PatientID:      "patient-1",
					PatientName:    "Nguyen Van A",
					BHYTCardNumber: "DN1501234567890",
					ServiceCode:    "PT001",
					ServiceNameVi:  "Danh gia va tai danh gia toan dien",
					Quantity:       1,
					UnitPrice:      150000,
					TotalPrice:     150000,
					InsurancePaid:  120000,
					PatientPaid:    30000,
					ServiceDate:    time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC),
				},
				{
					PatientID:      "patient-2",
					PatientName:    "Tran Thi B",
					BHYTCardNumber: "TE1601234567890",
					ServiceCode:    "PT002",
					ServiceNameVi:  "Vat ly tri lieu thu cong",
					Quantity:       2,
					UnitPrice:      100000,
					TotalPrice:     200000,
					InsurancePaid:  200000,
					PatientPaid:    0,
					ServiceDate:    time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC),
				},
			},
			expectError:       false,
			expectedTotal:     350000,
			expectedInsurance: 320000,
			expectedPatient:   30000,
			expectedCount:     2,
		},
		{
			name:          "No billable services found",
			facilityCode:  "12345",
			month:         1,
			year:          2026,
			billableItems: []model.BHYTClaimLineItem{},
			expectError:   true,
			errorContains: "no billable services found",
		},
		{
			name:         "Single patient, single service",
			facilityCode: "67890",
			month:        12,
			year:         2025,
			billableItems: []model.BHYTClaimLineItem{
				{
					PatientID:      "patient-1",
					PatientName:    "Le Van C",
					BHYTCardNumber: "HN1001234567890",
					ServiceCode:    "PT003",
					ServiceNameVi:  "Dieu tri bang dien",
					Quantity:       1,
					UnitPrice:      80000,
					TotalPrice:     80000,
					InsurancePaid:  80000,
					PatientPaid:    0,
					ServiceDate:    time.Date(2025, 12, 5, 0, 0, 0, 0, time.UTC),
				},
			},
			expectError:       false,
			expectedTotal:     80000,
			expectedInsurance: 80000,
			expectedPatient:   0,
			expectedCount:     1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockBHYTClaimRepository)
			svc := NewBHYTClaimService(mockRepo)

			mockRepo.On("GetBillableServices", mock.Anything, "clinic-1", tt.facilityCode, tt.month, tt.year).
				Return(tt.billableItems, nil)

			if !tt.expectError {
				mockRepo.On("CreateClaim", mock.Anything, mock.AnythingOfType("*model.BHYTClaim")).
					Run(func(args mock.Arguments) {
						claim := args.Get(1).(*model.BHYTClaim)
						assert.Equal(t, tt.facilityCode, claim.FacilityCode)
						assert.Equal(t, tt.month, claim.Month)
						assert.Equal(t, tt.year, claim.Year)
						assert.Equal(t, model.BHYTClaimStatusPending, claim.Status)
						assert.Equal(t, tt.expectedTotal, claim.TotalAmount)
						assert.Equal(t, tt.expectedInsurance, claim.TotalInsuranceAmount)
						assert.Equal(t, tt.expectedPatient, claim.TotalPatientAmount)
						assert.Equal(t, tt.expectedCount, claim.LineItemCount)
					}).
					Return(nil)

				mockRepo.On("CreateLineItems", mock.Anything, mock.AnythingOfType("[]model.BHYTClaimLineItem")).
					Return(nil)
			}

			req := &model.GenerateClaimRequest{
				FacilityCode: tt.facilityCode,
				Month:        tt.month,
				Year:         tt.year,
			}

			result, err := svc.GenerateClaimFile(context.Background(), "clinic-1", "user-1", req)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorContains != "" {
					assert.Contains(t, err.Error(), tt.errorContains)
				}
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, tt.expectedTotal, result.TotalAmount)
				assert.Equal(t, tt.expectedInsurance, result.TotalInsuranceAmount)
				assert.Equal(t, tt.expectedPatient, result.TotalPatientAmount)
				assert.Equal(t, tt.expectedCount, result.LineItemCount)
				assert.Equal(t, tt.expectedCount, len(result.LineItems))
				mockRepo.AssertExpectations(t)
			}
		})
	}
}

// TestGenerateFileName tests VSS-compliant file naming.
func TestGenerateFileName(t *testing.T) {
	tests := []struct {
		name         string
		facilityCode string
		month        int
		year         int
		expected     string
	}{
		{
			name:         "Standard case",
			facilityCode: "12345",
			month:        2,
			year:         2026,
			expected:     "HS_12345_022026.xml",
		},
		{
			name:         "December",
			facilityCode: "67890",
			month:        12,
			year:         2025,
			expected:     "HS_67890_122025.xml",
		},
		{
			name:         "Single digit month",
			facilityCode: "ABCDE",
			month:        1,
			year:         2026,
			expected:     "HS_ABCDE_012026.xml",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			claim := &model.BHYTClaim{
				FacilityCode: tt.facilityCode,
				Month:        tt.month,
				Year:         tt.year,
			}
			assert.Equal(t, tt.expected, claim.GenerateFileName())
		})
	}
}

// TestBuildClaimXML tests VSS XML structure generation.
func TestBuildClaimXML(t *testing.T) {
	claim := &model.BHYTClaim{
		ID:                   "claim-1",
		FacilityCode:         "12345",
		Month:                2,
		Year:                 2026,
		TotalAmount:          350000,
		TotalInsuranceAmount: 320000,
		TotalPatientAmount:   30000,
		LineItems: []model.BHYTClaimLineItem{
			{
				PatientID:      "p1",
				PatientName:    "Nguyen Van A",
				BHYTCardNumber: "HC1-2024-12345-67890",
				ServiceCode:    "PT001",
				ServiceNameVi:  "Danh gia va tai danh gia toan dien",
				Quantity:       1,
				UnitPrice:      150000,
				TotalPrice:     150000,
				InsurancePaid:  120000,
				PatientPaid:    30000,
				ServiceDate:    time.Date(2026, 2, 10, 0, 0, 0, 0, time.UTC),
			},
			{
				PatientID:      "p1",
				PatientName:    "Nguyen Van A",
				BHYTCardNumber: "HC1-2024-12345-67890",
				ServiceCode:    "PT002",
				ServiceNameVi:  "Vat ly tri lieu thu cong",
				Quantity:       1,
				UnitPrice:      100000,
				TotalPrice:     100000,
				InsurancePaid:  80000,
				PatientPaid:    20000,
				ServiceDate:    time.Date(2026, 2, 10, 0, 0, 0, 0, time.UTC),
			},
			{
				PatientID:      "p2",
				PatientName:    "Tran Thi B",
				BHYTCardNumber: "TE1601234567890",
				ServiceCode:    "PT001",
				ServiceNameVi:  "Danh gia va tai danh gia toan dien",
				Quantity:       1,
				UnitPrice:      100000,
				TotalPrice:     100000,
				InsurancePaid:  100000,
				PatientPaid:    0,
				ServiceDate:    time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC),
			},
		},
	}

	xmlData := BuildClaimXML(claim)

	// Verify root structure
	assert.Equal(t, "12345", xmlData.MaCSKCB)
	assert.Equal(t, 2, xmlData.Thang)
	assert.Equal(t, 2026, xmlData.Nam)
	assert.Equal(t, 2, xmlData.SoHoSo) // 2 unique patients
	assert.Equal(t, 350000.0, xmlData.TongTien)
	assert.Equal(t, 320000.0, xmlData.TongBHYT)
	assert.Equal(t, 30000.0, xmlData.TongBNTT)

	// Verify patient grouping
	assert.Len(t, xmlData.DanhSachHoSo, 2)

	// Patient 1: Nguyen Van A with 2 services
	patient1 := xmlData.DanhSachHoSo[0]
	assert.Equal(t, "p1", patient1.MaBN)
	assert.Equal(t, "HC1-2024-12345-67890", patient1.MaThe)
	assert.Equal(t, "Nguyen Van A", patient1.TenBN)
	assert.Len(t, patient1.DichVu, 2)
	assert.Equal(t, "PT001", patient1.DichVu[0].Ma)
	assert.Equal(t, 150000.0, patient1.DichVu[0].DonGia)
	assert.Equal(t, 120000.0, patient1.DichVu[0].BHYTThanhToan)
	assert.Equal(t, 30000.0, patient1.DichVu[0].BNThanhToan)
	assert.Equal(t, "10/02/2026", patient1.DichVu[0].NgayDV)

	// Patient 2: Tran Thi B with 1 service
	patient2 := xmlData.DanhSachHoSo[1]
	assert.Equal(t, "p2", patient2.MaBN)
	assert.Equal(t, "Tran Thi B", patient2.TenBN)
	assert.Len(t, patient2.DichVu, 1)
	assert.Equal(t, 100000.0, patient2.DichVu[0].InsurancePaidAmount())
}

// Helper to make assertion cleaner - add method to check insurance paid
func (d ChiTietDichVu) InsurancePaidAmount() float64 {
	return d.BHYTThanhToan
}

// TestMarshalClaimXML tests XML marshaling produces valid UTF-8 XML.
func TestMarshalClaimXML(t *testing.T) {
	xmlData := &model.HoSoXML{
		MaCSKCB: "12345",
		Thang:   2,
		Nam:     2026,
		SoHoSo:  1,
		TongTien: 150000,
		TongBHYT: 120000,
		TongBNTT: 30000,
		DanhSachHoSo: []model.HoSoBenhNhan{
			{
				MaBN:  "p1",
				MaThe: "HC1-2024-12345-67890",
				TenBN: "Nguyen Van A",
				DichVu: []model.ChiTietDichVu{
					{
						Ma:            "PT001",
						TenDV:         "Danh gia va tai danh gia toan dien",
						SoLuong:       1,
						DonGia:        150000,
						ThanhTien:     150000,
						BHYTThanhToan: 120000,
						BNThanhToan:   30000,
						NgayDV:        "10/02/2026",
					},
				},
			},
		},
	}

	xmlBytes, err := MarshalClaimXML(xmlData)
	assert.NoError(t, err)
	assert.NotNil(t, xmlBytes)

	xmlStr := string(xmlBytes)

	// Verify XML declaration
	assert.True(t, strings.HasPrefix(xmlStr, "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"))

	// Verify root element
	assert.Contains(t, xmlStr, "<HoSoXML>")
	assert.Contains(t, xmlStr, "</HoSoXML>")

	// Verify facility info
	assert.Contains(t, xmlStr, "<MaCSKCB>12345</MaCSKCB>")
	assert.Contains(t, xmlStr, "<Thang>2</Thang>")
	assert.Contains(t, xmlStr, "<Nam>2026</Nam>")

	// Verify patient data
	assert.Contains(t, xmlStr, "<MaBN>p1</MaBN>")
	assert.Contains(t, xmlStr, "<MaThe>HC1-2024-12345-67890</MaThe>")
	assert.Contains(t, xmlStr, "<TenBN>Nguyen Van A</TenBN>")

	// Verify service data
	assert.Contains(t, xmlStr, "<Ma>PT001</Ma>")
	assert.Contains(t, xmlStr, "<DonGia>150000</DonGia>")
	assert.Contains(t, xmlStr, "<BHYTThanhToan>120000</BHYTThanhToan>")
	assert.Contains(t, xmlStr, "<BNThanhToan>30000</BNThanhToan>")

	// Verify it's valid XML by trying to unmarshal
	var parsed model.HoSoXML
	err = xml.Unmarshal(xmlBytes, &parsed)
	assert.NoError(t, err)
	assert.Equal(t, "12345", parsed.MaCSKCB)
	assert.Equal(t, 1, len(parsed.DanhSachHoSo))
}

// TestValidateClaimPeriod tests claim period validation.
func TestValidateClaimPeriod(t *testing.T) {
	now := time.Now()
	currentMonth := int(now.Month())
	currentYear := now.Year()

	tests := []struct {
		name        string
		month       int
		year        int
		expectError bool
	}{
		{
			name:        "Past month is valid",
			month:       1,
			year:        2025,
			expectError: false,
		},
		{
			name:        "Last year December is valid",
			month:       12,
			year:        2024,
			expectError: false,
		},
		{
			name:        "Current month is invalid (not ended yet)",
			month:       currentMonth,
			year:        currentYear,
			expectError: true,
		},
		{
			name:        "Future month is invalid",
			month:       12,
			year:        currentYear + 1,
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateClaimPeriod(tt.month, tt.year)
			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), "has not ended yet")
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// TestRoundToVND tests VND rounding.
func TestRoundToVNDClaim(t *testing.T) {
	tests := []struct {
		input    float64
		expected float64
	}{
		{100000.0, 100000.0},
		{100000.4, 100000.0},
		{100000.5, 100001.0},
		{0.0, 0.0},
	}

	for _, tt := range tests {
		result := roundToVND(tt.input)
		assert.Equal(t, tt.expected, result)
	}
}

// ChiTietDichVu alias for testing helper method.
type ChiTietDichVu = model.ChiTietDichVu
