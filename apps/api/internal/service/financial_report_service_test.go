package service

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// mockFinancialReportRepo is a testify mock for FinancialReportRepository.
type mockFinancialReportRepoTest struct {
	mock.Mock
}

func (m *mockFinancialReportRepoTest) GetRevenueByPeriod(ctx context.Context, startDate, endDate time.Time, periodType string) ([]model.RevenueByPeriod, error) {
	args := m.Called(ctx, startDate, endDate, periodType)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]model.RevenueByPeriod), args.Error(1)
}

func (m *mockFinancialReportRepoTest) GetOutstandingPayments(ctx context.Context, agingBucket string) ([]model.OutstandingPayment, error) {
	args := m.Called(ctx, agingBucket)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]model.OutstandingPayment), args.Error(1)
}

func (m *mockFinancialReportRepoTest) GetTopServices(ctx context.Context, limit int) ([]model.ServiceRevenue, error) {
	args := m.Called(ctx, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]model.ServiceRevenue), args.Error(1)
}

func (m *mockFinancialReportRepoTest) GetTherapistProductivity(ctx context.Context, therapistID string, startDate, endDate time.Time) ([]model.TherapistProductivity, error) {
	args := m.Called(ctx, therapistID, startDate, endDate)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]model.TherapistProductivity), args.Error(1)
}

func (m *mockFinancialReportRepoTest) RefreshMaterializedViews(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

// =============================================================================
// Revenue Report Tests
// =============================================================================

func TestGenerateRevenueReport(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(mockFinancialReportRepoTest)

	startDate := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2026, 1, 31, 0, 0, 0, 0, time.UTC)

	sampleData := []model.RevenueByPeriod{
		{Date: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC), PeriodType: "monthly", TotalRevenue: 5000000, InsuranceRevenue: 3500000, CashRevenue: 1500000, InvoiceCount: 25},
	}

	mockRepo.On("GetRevenueByPeriod", ctx, startDate, endDate, "monthly").Return(sampleData, nil)

	svc := NewFinancialReportService(mockRepo)

	filters := model.ReportFilters{
		StartDate:  &startDate,
		EndDate:    &endDate,
		PeriodType: "monthly",
	}

	report, err := svc.GenerateRevenueReport(ctx, filters)

	require.NoError(t, err)
	assert.NotNil(t, report)
	assert.Len(t, report.Data, 1)
	assert.Equal(t, float64(5000000), report.TotalRevenue)
	assert.Equal(t, 25, report.TotalInvoices)
	assert.Equal(t, "2026-01-01", report.StartDate)
	assert.Equal(t, "2026-01-31", report.EndDate)
	assert.Equal(t, "monthly", report.PeriodType)

	mockRepo.AssertExpectations(t)
}

func TestGenerateRevenueReportMultiplePeriods(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(mockFinancialReportRepoTest)

	startDate := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC)

	sampleData := []model.RevenueByPeriod{
		{Date: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC), PeriodType: "monthly", TotalRevenue: 5000000, InsuranceRevenue: 3500000, CashRevenue: 1500000, InvoiceCount: 25},
		{Date: time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC), PeriodType: "monthly", TotalRevenue: 6000000, InsuranceRevenue: 4000000, CashRevenue: 2000000, InvoiceCount: 30},
		{Date: time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC), PeriodType: "monthly", TotalRevenue: 7000000, InsuranceRevenue: 5000000, CashRevenue: 2000000, InvoiceCount: 35},
	}

	mockRepo.On("GetRevenueByPeriod", ctx, startDate, endDate, "monthly").Return(sampleData, nil)

	svc := NewFinancialReportService(mockRepo)
	filters := model.ReportFilters{
		StartDate:  &startDate,
		EndDate:    &endDate,
		PeriodType: "monthly",
	}

	report, err := svc.GenerateRevenueReport(ctx, filters)

	require.NoError(t, err)
	assert.Len(t, report.Data, 3)
	assert.Equal(t, float64(18000000), report.TotalRevenue) // 5M + 6M + 7M
	assert.Equal(t, 90, report.TotalInvoices)               // 25 + 30 + 35
}

func TestGenerateRevenueReportDefaultFilters(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(mockFinancialReportRepoTest)

	// When no dates are provided, defaults to last 6 months
	mockRepo.On("GetRevenueByPeriod", ctx, mock.AnythingOfType("time.Time"), mock.AnythingOfType("time.Time"), "monthly").Return([]model.RevenueByPeriod{}, nil)

	svc := NewFinancialReportService(mockRepo)
	filters := model.ReportFilters{} // empty filters

	report, err := svc.GenerateRevenueReport(ctx, filters)

	require.NoError(t, err)
	assert.NotNil(t, report)
	assert.Equal(t, "monthly", report.PeriodType)
	assert.Equal(t, float64(0), report.TotalRevenue)
}

// =============================================================================
// Aging Report Tests
// =============================================================================

func TestGenerateAgingReport(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(mockFinancialReportRepoTest)

	sampleData := []model.OutstandingPayment{
		{InvoiceID: "inv-1", PatientName: "Nguyen Van A", AmountDue: 500000, DaysOutstanding: 15, AgingBucket: "0-30"},
		{InvoiceID: "inv-2", PatientName: "Tran Thi B", AmountDue: 1200000, DaysOutstanding: 45, AgingBucket: "31-60"},
		{InvoiceID: "inv-3", PatientName: "Le Van C", AmountDue: 800000, DaysOutstanding: 22, AgingBucket: "0-30"},
		{InvoiceID: "inv-4", PatientName: "Pham Van D", AmountDue: 2000000, DaysOutstanding: 95, AgingBucket: "90+"},
	}

	mockRepo.On("GetOutstandingPayments", ctx, "").Return(sampleData, nil)

	svc := NewFinancialReportService(mockRepo)
	filters := model.ReportFilters{}

	report, err := svc.GenerateAgingReport(ctx, filters)

	require.NoError(t, err)
	assert.NotNil(t, report)
	assert.Len(t, report.Data, 4)
	assert.Equal(t, 4, report.TotalCount)
	assert.Equal(t, float64(4500000), report.TotalOutstanding)

	// Verify aging bucket summaries
	assert.Len(t, report.Summary, 4)

	// Bucket 0-30: 2 invoices, 500000 + 800000
	assert.Equal(t, "0-30", report.Summary[0].Bucket)
	assert.Equal(t, 2, report.Summary[0].Count)
	assert.Equal(t, float64(1300000), report.Summary[0].TotalAmount)

	// Bucket 31-60: 1 invoice, 1200000
	assert.Equal(t, "31-60", report.Summary[1].Bucket)
	assert.Equal(t, 1, report.Summary[1].Count)
	assert.Equal(t, float64(1200000), report.Summary[1].TotalAmount)

	// Bucket 61-90: 0 invoices
	assert.Equal(t, "61-90", report.Summary[2].Bucket)
	assert.Equal(t, 0, report.Summary[2].Count)

	// Bucket 90+: 1 invoice, 2000000
	assert.Equal(t, "90+", report.Summary[3].Bucket)
	assert.Equal(t, 1, report.Summary[3].Count)
	assert.Equal(t, float64(2000000), report.Summary[3].TotalAmount)

	mockRepo.AssertExpectations(t)
}

func TestGenerateAgingReportWithFilter(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(mockFinancialReportRepoTest)

	sampleData := []model.OutstandingPayment{
		{InvoiceID: "inv-4", PatientName: "Pham Van D", AmountDue: 2000000, DaysOutstanding: 95, AgingBucket: "90+"},
	}

	mockRepo.On("GetOutstandingPayments", ctx, "90+").Return(sampleData, nil)

	svc := NewFinancialReportService(mockRepo)
	filters := model.ReportFilters{AgingBucket: "90+"}

	report, err := svc.GenerateAgingReport(ctx, filters)

	require.NoError(t, err)
	assert.Len(t, report.Data, 1)
	assert.Equal(t, float64(2000000), report.TotalOutstanding)
}

// =============================================================================
// Service Revenue Report Tests
// =============================================================================

func TestGenerateServiceReport(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(mockFinancialReportRepoTest)

	sampleData := []model.ServiceRevenue{
		{ServiceCode: "PT001", ServiceName: "Evaluation", ServiceNameVi: "Danh gia", QuantitySold: 100, TotalRevenue: 15000000, Rank: 1},
		{ServiceCode: "PT002", ServiceName: "Manual Therapy", ServiceNameVi: "Tri lieu thu cong", QuantitySold: 200, TotalRevenue: 12000000, Rank: 2},
	}

	mockRepo.On("GetTopServices", ctx, 10).Return(sampleData, nil)

	svc := NewFinancialReportService(mockRepo)
	filters := model.ReportFilters{}

	report, err := svc.GenerateServiceReport(ctx, filters)

	require.NoError(t, err)
	assert.Len(t, report.Data, 2)
	assert.Equal(t, float64(27000000), report.TotalRevenue)
	assert.Equal(t, 2, report.TotalServices)
	assert.Equal(t, 1, report.Data[0].Rank)
	assert.Equal(t, "PT001", report.Data[0].ServiceCode)
}

func TestGenerateServiceReportCustomLimit(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(mockFinancialReportRepoTest)

	sampleData := []model.ServiceRevenue{
		{ServiceCode: "PT001", ServiceName: "Evaluation", TotalRevenue: 15000000, Rank: 1},
	}

	mockRepo.On("GetTopServices", ctx, 5).Return(sampleData, nil)

	svc := NewFinancialReportService(mockRepo)
	filters := model.ReportFilters{Limit: 5}

	report, err := svc.GenerateServiceReport(ctx, filters)

	require.NoError(t, err)
	assert.Len(t, report.Data, 1)
}

// =============================================================================
// Productivity Report Tests
// =============================================================================

func TestGenerateProductivityReport(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(mockFinancialReportRepoTest)

	sampleData := []model.TherapistProductivity{
		{TherapistID: "t-1", TherapistName: "Dr. Nguyen", SessionCount: 40, TotalRevenue: 20000000, AvgRevenuePerSession: 500000, Period: "2026-01"},
		{TherapistID: "t-2", TherapistName: "Dr. Tran", SessionCount: 35, TotalRevenue: 17500000, AvgRevenuePerSession: 500000, Period: "2026-01"},
	}

	startDate := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2026, 1, 31, 0, 0, 0, 0, time.UTC)

	mockRepo.On("GetTherapistProductivity", ctx, "", startDate, endDate).Return(sampleData, nil)

	svc := NewFinancialReportService(mockRepo)
	filters := model.ReportFilters{
		StartDate: &startDate,
		EndDate:   &endDate,
	}

	report, err := svc.GenerateProductivityReport(ctx, filters)

	require.NoError(t, err)
	assert.Len(t, report.Data, 2)
	assert.Equal(t, 75, report.TotalSessions)
	assert.Equal(t, float64(37500000), report.TotalRevenue)
	assert.Equal(t, float64(500000), report.AvgRevenuePerSession)
}

func TestGenerateProductivityReportFiltered(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(mockFinancialReportRepoTest)

	sampleData := []model.TherapistProductivity{
		{TherapistID: "t-1", TherapistName: "Dr. Nguyen", SessionCount: 40, TotalRevenue: 20000000, AvgRevenuePerSession: 500000, Period: "2026-01"},
	}

	startDate := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2026, 1, 31, 0, 0, 0, 0, time.UTC)

	mockRepo.On("GetTherapistProductivity", ctx, "t-1", startDate, endDate).Return(sampleData, nil)

	svc := NewFinancialReportService(mockRepo)
	filters := model.ReportFilters{
		StartDate:   &startDate,
		EndDate:     &endDate,
		TherapistID: "t-1",
	}

	report, err := svc.GenerateProductivityReport(ctx, filters)

	require.NoError(t, err)
	assert.Len(t, report.Data, 1)
	assert.Equal(t, "Dr. Nguyen", report.Data[0].TherapistName)
}

func TestGenerateProductivityReportZeroSessions(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(mockFinancialReportRepoTest)

	mockRepo.On("GetTherapistProductivity", ctx, "", mock.AnythingOfType("time.Time"), mock.AnythingOfType("time.Time")).Return([]model.TherapistProductivity{}, nil)

	svc := NewFinancialReportService(mockRepo)
	filters := model.ReportFilters{}

	report, err := svc.GenerateProductivityReport(ctx, filters)

	require.NoError(t, err)
	assert.Len(t, report.Data, 0)
	assert.Equal(t, 0, report.TotalSessions)
	assert.Equal(t, float64(0), report.AvgRevenuePerSession) // division-by-zero guard
}

// =============================================================================
// CSV Export Tests
// =============================================================================

func TestExportRevenueCSV(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(mockFinancialReportRepoTest)

	startDate := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2026, 1, 31, 0, 0, 0, 0, time.UTC)

	sampleData := []model.RevenueByPeriod{
		{Date: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC), PeriodType: "monthly", TotalRevenue: 5000000, InsuranceRevenue: 3500000, CashRevenue: 1500000, InvoiceCount: 25},
	}

	mockRepo.On("GetRevenueByPeriod", ctx, startDate, endDate, "monthly").Return(sampleData, nil)

	svc := NewFinancialReportService(mockRepo)
	filters := model.ReportFilters{
		StartDate:  &startDate,
		EndDate:    &endDate,
		PeriodType: "monthly",
	}

	data, filename, err := svc.ExportRevenueCSV(ctx, filters)

	require.NoError(t, err)
	assert.NotEmpty(t, data)
	assert.Contains(t, filename, "revenue_report_")
	assert.Contains(t, filename, ".csv")

	// Check CSV content (after BOM bytes)
	csv := string(data[3:]) // Skip UTF-8 BOM
	assert.Contains(t, csv, "Date")
	assert.Contains(t, csv, "Total Revenue (VND)")
	assert.Contains(t, csv, "5000000")
	assert.Contains(t, csv, "3500000")
}

func TestExportAgingCSV(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(mockFinancialReportRepoTest)

	sampleData := []model.OutstandingPayment{
		{InvoiceID: "inv-1", PatientName: "Nguyen Van A", AmountDue: 500000, DaysOutstanding: 15, AgingBucket: "0-30", InvoiceNumber: "INV-001", InvoiceDate: "2026-01-27", TotalAmount: 750000, Status: "pending"},
	}

	mockRepo.On("GetOutstandingPayments", ctx, "").Return(sampleData, nil)

	svc := NewFinancialReportService(mockRepo)
	filters := model.ReportFilters{}

	data, filename, err := svc.ExportAgingCSV(ctx, filters)

	require.NoError(t, err)
	assert.NotEmpty(t, data)
	assert.Contains(t, filename, "outstanding_payments_")
	assert.Contains(t, filename, ".csv")

	csv := string(data[3:])
	assert.Contains(t, csv, "Invoice Number")
	assert.Contains(t, csv, "INV-001")
	assert.Contains(t, csv, "Nguyen Van A")
}

// =============================================================================
// ReportFilters Tests
// =============================================================================

func TestReportFiltersDefaultLimit(t *testing.T) {
	tests := []struct {
		name     string
		limit    int
		expected int
	}{
		{"zero defaults to 10", 0, 10},
		{"negative defaults to 10", -5, 10},
		{"normal value", 5, 5},
		{"max capped at 100", 200, 100},
		{"at max boundary", 100, 100},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := model.ReportFilters{Limit: tt.limit}
			assert.Equal(t, tt.expected, f.DefaultLimit())
		})
	}
}

func TestReportFiltersDefaultPeriod(t *testing.T) {
	tests := []struct {
		name     string
		period   string
		expected string
	}{
		{"empty defaults to monthly", "", "monthly"},
		{"daily", "daily", "daily"},
		{"weekly", "weekly", "weekly"},
		{"monthly", "monthly", "monthly"},
		{"yearly", "yearly", "yearly"},
		{"invalid defaults to monthly", "hourly", "monthly"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := model.ReportFilters{PeriodType: tt.period}
			assert.Equal(t, tt.expected, f.DefaultPeriod())
		})
	}
}

// =============================================================================
// Refresh Views Tests
// =============================================================================

func TestRefreshViews(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(mockFinancialReportRepoTest)

	mockRepo.On("RefreshMaterializedViews", ctx).Return(nil)

	svc := NewFinancialReportService(mockRepo)

	err := svc.RefreshViews(ctx)

	require.NoError(t, err)
	mockRepo.AssertExpectations(t)
}
