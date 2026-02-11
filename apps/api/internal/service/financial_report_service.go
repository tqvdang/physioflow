package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"strconv"
	"time"

	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
)

// FinancialReportService defines the interface for financial report business logic.
type FinancialReportService interface {
	GenerateRevenueReport(ctx context.Context, filters model.ReportFilters) (*model.RevenueByPeriodReport, error)
	GenerateAgingReport(ctx context.Context, filters model.ReportFilters) (*model.OutstandingPaymentsReport, error)
	GenerateServiceReport(ctx context.Context, filters model.ReportFilters) (*model.ServiceRevenueReport, error)
	GenerateProductivityReport(ctx context.Context, filters model.ReportFilters) (*model.TherapistProductivityReport, error)
	ExportRevenueCSV(ctx context.Context, filters model.ReportFilters) ([]byte, string, error)
	ExportAgingCSV(ctx context.Context, filters model.ReportFilters) ([]byte, string, error)
	ExportServicesCSV(ctx context.Context, filters model.ReportFilters) ([]byte, string, error)
	ExportProductivityCSV(ctx context.Context, filters model.ReportFilters) ([]byte, string, error)
	RefreshViews(ctx context.Context) error
}

// financialReportService implements FinancialReportService.
type financialReportService struct {
	repo repository.FinancialReportRepository
}

// NewFinancialReportService creates a new financial report service.
func NewFinancialReportService(repo repository.FinancialReportRepository) FinancialReportService {
	return &financialReportService{repo: repo}
}

// defaultDateRange returns sensible default start/end dates when not provided.
func defaultDateRange(filters model.ReportFilters) (time.Time, time.Time) {
	now := time.Now()
	endDate := now
	startDate := now.AddDate(0, -6, 0) // Default: 6 months back

	if filters.StartDate != nil {
		startDate = *filters.StartDate
	}
	if filters.EndDate != nil {
		endDate = *filters.EndDate
	}
	return startDate, endDate
}

// GenerateRevenueReport produces a revenue-by-period report.
func (s *financialReportService) GenerateRevenueReport(ctx context.Context, filters model.ReportFilters) (*model.RevenueByPeriodReport, error) {
	startDate, endDate := defaultDateRange(filters)
	periodType := filters.DefaultPeriod()

	data, err := s.repo.GetRevenueByPeriod(ctx, startDate, endDate, periodType)
	if err != nil {
		return nil, fmt.Errorf("failed to get revenue by period: %w", err)
	}

	// Compute totals
	var totalRevenue float64
	var totalInvoices int
	for _, row := range data {
		totalRevenue += row.TotalRevenue
		totalInvoices += row.InvoiceCount
	}

	report := &model.RevenueByPeriodReport{
		Data:          data,
		TotalRevenue:  totalRevenue,
		TotalInvoices: totalInvoices,
		StartDate:     startDate.Format("2006-01-02"),
		EndDate:       endDate.Format("2006-01-02"),
		PeriodType:    periodType,
	}

	log.Info().
		Str("start_date", report.StartDate).
		Str("end_date", report.EndDate).
		Str("period", periodType).
		Int("rows", len(data)).
		Msg("revenue report generated")

	return report, nil
}

// GenerateAgingReport produces an outstanding payments aging report.
func (s *financialReportService) GenerateAgingReport(ctx context.Context, filters model.ReportFilters) (*model.OutstandingPaymentsReport, error) {
	data, err := s.repo.GetOutstandingPayments(ctx, filters.AgingBucket)
	if err != nil {
		return nil, fmt.Errorf("failed to get outstanding payments: %w", err)
	}

	// Build aging bucket summaries
	bucketMap := map[string]*model.AgingBucketSummary{
		"0-30":  {Bucket: "0-30"},
		"31-60": {Bucket: "31-60"},
		"61-90": {Bucket: "61-90"},
		"90+":   {Bucket: "90+"},
	}

	var totalOutstanding float64
	for _, row := range data {
		totalOutstanding += row.AmountDue
		if bucket, ok := bucketMap[row.AgingBucket]; ok {
			bucket.Count++
			bucket.TotalAmount += row.AmountDue
		}
	}

	summary := []model.AgingBucketSummary{
		*bucketMap["0-30"],
		*bucketMap["31-60"],
		*bucketMap["61-90"],
		*bucketMap["90+"],
	}

	report := &model.OutstandingPaymentsReport{
		Data:             data,
		Summary:          summary,
		TotalOutstanding: totalOutstanding,
		TotalCount:       len(data),
	}

	log.Info().
		Int("outstanding_count", len(data)).
		Float64("total_outstanding", totalOutstanding).
		Msg("aging report generated")

	return report, nil
}

// GenerateServiceReport produces a top-services-by-revenue report.
func (s *financialReportService) GenerateServiceReport(ctx context.Context, filters model.ReportFilters) (*model.ServiceRevenueReport, error) {
	limit := filters.DefaultLimit()

	data, err := s.repo.GetTopServices(ctx, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get top services: %w", err)
	}

	var totalRevenue float64
	for _, row := range data {
		totalRevenue += row.TotalRevenue
	}

	report := &model.ServiceRevenueReport{
		Data:          data,
		TotalRevenue:  totalRevenue,
		TotalServices: len(data),
	}

	log.Info().
		Int("services", len(data)).
		Int("limit", limit).
		Msg("service revenue report generated")

	return report, nil
}

// GenerateProductivityReport produces a therapist productivity report.
func (s *financialReportService) GenerateProductivityReport(ctx context.Context, filters model.ReportFilters) (*model.TherapistProductivityReport, error) {
	startDate, endDate := defaultDateRange(filters)

	data, err := s.repo.GetTherapistProductivity(ctx, filters.TherapistID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get therapist productivity: %w", err)
	}

	var totalSessions int
	var totalRevenue float64
	for _, row := range data {
		totalSessions += row.SessionCount
		totalRevenue += row.TotalRevenue
	}

	var avgRevenue float64
	if totalSessions > 0 {
		avgRevenue = totalRevenue / float64(totalSessions)
	}

	report := &model.TherapistProductivityReport{
		Data:                 data,
		TotalSessions:        totalSessions,
		TotalRevenue:         totalRevenue,
		AvgRevenuePerSession: avgRevenue,
	}

	log.Info().
		Int("therapists", len(data)).
		Int("total_sessions", totalSessions).
		Msg("productivity report generated")

	return report, nil
}

// ExportRevenueCSV exports the revenue report as a CSV file.
func (s *financialReportService) ExportRevenueCSV(ctx context.Context, filters model.ReportFilters) ([]byte, string, error) {
	report, err := s.GenerateRevenueReport(ctx, filters)
	if err != nil {
		return nil, "", err
	}

	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	// BOM for Excel UTF-8 compatibility
	buf.Write([]byte{0xEF, 0xBB, 0xBF})

	// Header
	if err := writer.Write([]string{
		"Date", "Period", "Total Revenue (VND)", "Insurance Revenue (VND)",
		"Cash Revenue (VND)", "Invoice Count",
	}); err != nil {
		return nil, "", fmt.Errorf("failed to write CSV header: %w", err)
	}

	// Rows
	for _, row := range report.Data {
		if err := writer.Write([]string{
			row.Date.Format("2006-01-02"),
			row.PeriodType,
			strconv.FormatFloat(row.TotalRevenue, 'f', 0, 64),
			strconv.FormatFloat(row.InsuranceRevenue, 'f', 0, 64),
			strconv.FormatFloat(row.CashRevenue, 'f', 0, 64),
			strconv.Itoa(row.InvoiceCount),
		}); err != nil {
			return nil, "", fmt.Errorf("failed to write CSV row: %w", err)
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, "", fmt.Errorf("CSV flush error: %w", err)
	}

	filename := fmt.Sprintf("revenue_report_%s_%s.csv",
		report.StartDate, report.EndDate)

	return buf.Bytes(), filename, nil
}

// ExportAgingCSV exports the aging report as a CSV file.
func (s *financialReportService) ExportAgingCSV(ctx context.Context, filters model.ReportFilters) ([]byte, string, error) {
	report, err := s.GenerateAgingReport(ctx, filters)
	if err != nil {
		return nil, "", err
	}

	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	buf.Write([]byte{0xEF, 0xBB, 0xBF})

	if err := writer.Write([]string{
		"Invoice Number", "Patient Name", "Invoice Date",
		"Total Amount (VND)", "Amount Due (VND)", "Days Outstanding", "Aging Bucket", "Status",
	}); err != nil {
		return nil, "", fmt.Errorf("failed to write CSV header: %w", err)
	}

	for _, row := range report.Data {
		if err := writer.Write([]string{
			row.InvoiceNumber,
			row.PatientName,
			row.InvoiceDate,
			strconv.FormatFloat(row.TotalAmount, 'f', 0, 64),
			strconv.FormatFloat(row.AmountDue, 'f', 0, 64),
			strconv.Itoa(row.DaysOutstanding),
			row.AgingBucket,
			row.Status,
		}); err != nil {
			return nil, "", fmt.Errorf("failed to write CSV row: %w", err)
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, "", fmt.Errorf("CSV flush error: %w", err)
	}

	filename := fmt.Sprintf("outstanding_payments_%s.csv", time.Now().Format("20060102"))
	return buf.Bytes(), filename, nil
}

// ExportServicesCSV exports the top services report as a CSV file.
func (s *financialReportService) ExportServicesCSV(ctx context.Context, filters model.ReportFilters) ([]byte, string, error) {
	report, err := s.GenerateServiceReport(ctx, filters)
	if err != nil {
		return nil, "", err
	}

	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	buf.Write([]byte{0xEF, 0xBB, 0xBF})

	if err := writer.Write([]string{
		"Rank", "Service Code", "Service Name", "Service Name (VI)",
		"Quantity Sold", "Total Revenue (VND)",
	}); err != nil {
		return nil, "", fmt.Errorf("failed to write CSV header: %w", err)
	}

	for _, row := range report.Data {
		if err := writer.Write([]string{
			strconv.Itoa(row.Rank),
			row.ServiceCode,
			row.ServiceName,
			row.ServiceNameVi,
			strconv.Itoa(row.QuantitySold),
			strconv.FormatFloat(row.TotalRevenue, 'f', 0, 64),
		}); err != nil {
			return nil, "", fmt.Errorf("failed to write CSV row: %w", err)
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, "", fmt.Errorf("CSV flush error: %w", err)
	}

	filename := fmt.Sprintf("top_services_%s.csv", time.Now().Format("20060102"))
	return buf.Bytes(), filename, nil
}

// ExportProductivityCSV exports the therapist productivity report as a CSV file.
func (s *financialReportService) ExportProductivityCSV(ctx context.Context, filters model.ReportFilters) ([]byte, string, error) {
	report, err := s.GenerateProductivityReport(ctx, filters)
	if err != nil {
		return nil, "", err
	}

	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	buf.Write([]byte{0xEF, 0xBB, 0xBF})

	if err := writer.Write([]string{
		"Therapist Name", "Period", "Session Count",
		"Total Revenue (VND)", "Avg Revenue/Session (VND)",
	}); err != nil {
		return nil, "", fmt.Errorf("failed to write CSV header: %w", err)
	}

	for _, row := range report.Data {
		if err := writer.Write([]string{
			row.TherapistName,
			row.Period,
			strconv.Itoa(row.SessionCount),
			strconv.FormatFloat(row.TotalRevenue, 'f', 0, 64),
			strconv.FormatFloat(row.AvgRevenuePerSession, 'f', 0, 64),
		}); err != nil {
			return nil, "", fmt.Errorf("failed to write CSV row: %w", err)
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, "", fmt.Errorf("CSV flush error: %w", err)
	}

	filename := fmt.Sprintf("therapist_productivity_%s.csv", time.Now().Format("20060102"))
	return buf.Bytes(), filename, nil
}

// RefreshViews triggers a refresh of all materialized views.
func (s *financialReportService) RefreshViews(ctx context.Context) error {
	log.Info().Msg("refreshing financial reporting materialized views")
	return s.repo.RefreshMaterializedViews(ctx)
}
