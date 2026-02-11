package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// FinancialReportRepository defines the interface for financial report data access.
type FinancialReportRepository interface {
	GetRevenueByPeriod(ctx context.Context, startDate, endDate time.Time, periodType string) ([]model.RevenueByPeriod, error)
	GetOutstandingPayments(ctx context.Context, agingBucket string) ([]model.OutstandingPayment, error)
	GetTopServices(ctx context.Context, limit int) ([]model.ServiceRevenue, error)
	GetTherapistProductivity(ctx context.Context, therapistID string, startDate, endDate time.Time) ([]model.TherapistProductivity, error)
	RefreshMaterializedViews(ctx context.Context) error
}

// postgresFinancialReportRepo implements FinancialReportRepository with PostgreSQL.
type postgresFinancialReportRepo struct {
	db *DB
}

// NewFinancialReportRepository creates a new PostgreSQL financial report repository.
func NewFinancialReportRepository(db *DB) FinancialReportRepository {
	return &postgresFinancialReportRepo{db: db}
}

// GetRevenueByPeriod retrieves revenue data aggregated by the specified period type.
// It queries live invoice data directly for flexibility with date filters.
func (r *postgresFinancialReportRepo) GetRevenueByPeriod(ctx context.Context, startDate, endDate time.Time, periodType string) ([]model.RevenueByPeriod, error) {
	truncFunc := "month"
	switch periodType {
	case "daily":
		truncFunc = "day"
	case "weekly":
		truncFunc = "week"
	case "monthly":
		truncFunc = "month"
	case "yearly":
		truncFunc = "year"
	}

	query := fmt.Sprintf(`
		SELECT
			DATE_TRUNC('%s', i.invoice_date)::date AS date,
			$1 AS period_type,
			COALESCE(SUM(i.total_amount), 0) AS total_revenue,
			COALESCE(SUM(i.insurance_amount), 0) AS insurance_revenue,
			COALESCE(SUM(i.total_amount - i.insurance_amount), 0) AS cash_revenue,
			COUNT(*) AS invoice_count
		FROM invoices i
		WHERE i.status IN ('paid', 'partially_paid')
		  AND i.invoice_date >= $2
		  AND i.invoice_date <= $3
		GROUP BY DATE_TRUNC('%s', i.invoice_date)
		ORDER BY date`, truncFunc, truncFunc)

	rows, err := r.db.QueryContext(ctx, query, periodType, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to query revenue by period: %w", err)
	}
	defer rows.Close()

	var results []model.RevenueByPeriod
	for rows.Next() {
		var row model.RevenueByPeriod
		if err := rows.Scan(
			&row.Date, &row.PeriodType,
			&row.TotalRevenue, &row.InsuranceRevenue, &row.CashRevenue,
			&row.InvoiceCount,
		); err != nil {
			return nil, fmt.Errorf("failed to scan revenue row: %w", err)
		}
		results = append(results, row)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return results, nil
}

// GetOutstandingPayments retrieves outstanding invoices with aging classification.
func (r *postgresFinancialReportRepo) GetOutstandingPayments(ctx context.Context, agingBucket string) ([]model.OutstandingPayment, error) {
	query := `
		SELECT
			i.id AS invoice_id,
			i.patient_id,
			COALESCE(p.last_name || ' ' || p.first_name, 'Unknown') AS patient_name,
			i.balance_due AS amount_due,
			(CURRENT_DATE - i.invoice_date) AS days_outstanding,
			CASE
				WHEN (CURRENT_DATE - i.invoice_date) <= 30 THEN '0-30'
				WHEN (CURRENT_DATE - i.invoice_date) <= 60 THEN '31-60'
				WHEN (CURRENT_DATE - i.invoice_date) <= 90 THEN '61-90'
				ELSE '90+'
			END AS aging_bucket,
			i.invoice_number,
			i.invoice_date::text,
			i.total_amount,
			i.status::text
		FROM invoices i
		LEFT JOIN patients p ON p.id = i.patient_id
		WHERE i.status IN ('pending', 'partially_paid', 'submitted', 'approved')
		  AND i.balance_due > 0`

	var args []interface{}
	argIdx := 1

	if agingBucket != "" {
		query += fmt.Sprintf(`
		  AND CASE
			WHEN (CURRENT_DATE - i.invoice_date) <= 30 THEN '0-30'
			WHEN (CURRENT_DATE - i.invoice_date) <= 60 THEN '31-60'
			WHEN (CURRENT_DATE - i.invoice_date) <= 90 THEN '61-90'
			ELSE '90+'
		  END = $%d`, argIdx)
		args = append(args, agingBucket)
		argIdx++
	}

	query += `
		ORDER BY days_outstanding DESC`

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query outstanding payments: %w", err)
	}
	defer rows.Close()

	var results []model.OutstandingPayment
	for rows.Next() {
		var row model.OutstandingPayment
		if err := rows.Scan(
			&row.InvoiceID, &row.PatientID, &row.PatientName,
			&row.AmountDue, &row.DaysOutstanding, &row.AgingBucket,
			&row.InvoiceNumber, &row.InvoiceDate,
			&row.TotalAmount, &row.Status,
		); err != nil {
			return nil, fmt.Errorf("failed to scan outstanding payment row: %w", err)
		}
		results = append(results, row)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return results, nil
}

// GetTopServices retrieves services ranked by total revenue.
func (r *postgresFinancialReportRepo) GetTopServices(ctx context.Context, limit int) ([]model.ServiceRevenue, error) {
	if limit <= 0 {
		limit = 10
	}

	query := `
		SELECT
			sc.code AS service_code,
			sc.service_name,
			COALESCE(sc.service_name_vi, sc.service_name) AS service_name_vi,
			COALESCE(SUM(ili.quantity), 0) AS quantity_sold,
			COALESCE(SUM(ili.total_price), 0) AS total_revenue,
			RANK() OVER (ORDER BY COALESCE(SUM(ili.total_price), 0) DESC) AS rank
		FROM invoice_line_items ili
		JOIN pt_service_codes sc ON sc.id = ili.service_code_id
		JOIN invoices i ON i.id = ili.invoice_id
		WHERE i.status IN ('paid', 'partially_paid')
		GROUP BY sc.code, sc.service_name, sc.service_name_vi
		ORDER BY total_revenue DESC
		LIMIT $1`

	rows, err := r.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query top services: %w", err)
	}
	defer rows.Close()

	var results []model.ServiceRevenue
	for rows.Next() {
		var row model.ServiceRevenue
		if err := rows.Scan(
			&row.ServiceCode, &row.ServiceName, &row.ServiceNameVi,
			&row.QuantitySold, &row.TotalRevenue, &row.Rank,
		); err != nil {
			return nil, fmt.Errorf("failed to scan service revenue row: %w", err)
		}
		results = append(results, row)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return results, nil
}

// GetTherapistProductivity retrieves therapist productivity metrics.
func (r *postgresFinancialReportRepo) GetTherapistProductivity(ctx context.Context, therapistID string, startDate, endDate time.Time) ([]model.TherapistProductivity, error) {
	query := `
		SELECT
			ts.therapist_id,
			COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') AS therapist_name,
			DATE_TRUNC('month', ts.session_date)::date AS period,
			COUNT(ts.id) AS session_count,
			COALESCE(SUM(i.total_amount), 0) AS total_revenue,
			CASE
				WHEN COUNT(ts.id) > 0
				THEN COALESCE(SUM(i.total_amount), 0) / COUNT(ts.id)
				ELSE 0
			END AS avg_revenue_per_session
		FROM treatment_sessions ts
		LEFT JOIN users u ON u.id = ts.therapist_id
		LEFT JOIN invoices i ON i.treatment_session_id = ts.id
			AND i.status IN ('paid', 'partially_paid')
		WHERE ts.status = 'completed'
		  AND ts.session_date >= $1
		  AND ts.session_date <= $2`

	args := []interface{}{startDate, endDate}
	argIdx := 3

	if therapistID != "" {
		query += fmt.Sprintf(` AND ts.therapist_id = $%d`, argIdx)
		args = append(args, therapistID)
	}

	query += `
		GROUP BY ts.therapist_id, u.first_name, u.last_name, DATE_TRUNC('month', ts.session_date)
		ORDER BY period DESC, total_revenue DESC`

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query therapist productivity: %w", err)
	}
	defer rows.Close()

	var results []model.TherapistProductivity
	for rows.Next() {
		var row model.TherapistProductivity
		var period time.Time
		if err := rows.Scan(
			&row.TherapistID, &row.TherapistName,
			&period,
			&row.SessionCount, &row.TotalRevenue, &row.AvgRevenuePerSession,
		); err != nil {
			return nil, fmt.Errorf("failed to scan therapist productivity row: %w", err)
		}
		row.Period = period.Format("2006-01")
		results = append(results, row)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return results, nil
}

// RefreshMaterializedViews refreshes all financial reporting materialized views.
func (r *postgresFinancialReportRepo) RefreshMaterializedViews(ctx context.Context) error {
	views := []string{
		"mv_revenue_by_period",
		"mv_outstanding_payments",
		"mv_service_revenue",
		"mv_therapist_productivity",
	}

	for _, view := range views {
		_, err := r.db.ExecContext(ctx, fmt.Sprintf("REFRESH MATERIALIZED VIEW CONCURRENTLY %s", view))
		if err != nil {
			// If CONCURRENTLY fails (e.g., no unique index), try non-concurrent
			log.Warn().Err(err).Str("view", view).Msg("concurrent refresh failed, trying non-concurrent")
			_, err = r.db.ExecContext(ctx, fmt.Sprintf("REFRESH MATERIALIZED VIEW %s", view))
			if err != nil {
				return fmt.Errorf("failed to refresh materialized view %s: %w", view, err)
			}
		}
	}

	log.Info().Msg("all financial reporting materialized views refreshed")
	return nil
}

// mockFinancialReportRepo provides a mock implementation for development.
type mockFinancialReportRepo struct{}

// NewMockFinancialReportRepository creates a mock financial report repository.
func NewMockFinancialReportRepository() FinancialReportRepository {
	return &mockFinancialReportRepo{}
}

func (r *mockFinancialReportRepo) GetRevenueByPeriod(_ context.Context, startDate, endDate time.Time, periodType string) ([]model.RevenueByPeriod, error) {
	// Generate sample monthly data
	var results []model.RevenueByPeriod
	current := startDate
	for current.Before(endDate) || current.Equal(endDate) {
		results = append(results, model.RevenueByPeriod{
			Date:             current,
			PeriodType:       periodType,
			TotalRevenue:     5000000,
			InsuranceRevenue: 3500000,
			CashRevenue:      1500000,
			InvoiceCount:     25,
		})
		switch periodType {
		case "daily":
			current = current.AddDate(0, 0, 1)
		case "weekly":
			current = current.AddDate(0, 0, 7)
		default:
			current = current.AddDate(0, 1, 0)
		}
	}
	return results, nil
}

func (r *mockFinancialReportRepo) GetOutstandingPayments(_ context.Context, _ string) ([]model.OutstandingPayment, error) {
	return []model.OutstandingPayment{
		{
			InvoiceID: "mock-inv-001", PatientID: "mock-pat-001", PatientName: "Nguyen Van A",
			AmountDue: 500000, DaysOutstanding: 15, AgingBucket: "0-30",
			InvoiceNumber: "INV-2026-001", InvoiceDate: "2026-01-27", TotalAmount: 750000, Status: "pending",
		},
		{
			InvoiceID: "mock-inv-002", PatientID: "mock-pat-002", PatientName: "Tran Thi B",
			AmountDue: 1200000, DaysOutstanding: 45, AgingBucket: "31-60",
			InvoiceNumber: "INV-2025-050", InvoiceDate: "2025-12-28", TotalAmount: 1500000, Status: "partially_paid",
		},
		{
			InvoiceID: "mock-inv-003", PatientID: "mock-pat-003", PatientName: "Le Van C",
			AmountDue: 2000000, DaysOutstanding: 95, AgingBucket: "90+",
			InvoiceNumber: "INV-2025-030", InvoiceDate: "2025-11-08", TotalAmount: 2000000, Status: "pending",
		},
	}, nil
}

func (r *mockFinancialReportRepo) GetTopServices(_ context.Context, limit int) ([]model.ServiceRevenue, error) {
	data := []model.ServiceRevenue{
		{ServiceCode: "PT001", ServiceName: "Comprehensive Evaluation", ServiceNameVi: "Danh gia toan dien", QuantitySold: 120, TotalRevenue: 18000000, Rank: 1},
		{ServiceCode: "PT002", ServiceName: "Manual Therapy", ServiceNameVi: "Vat ly tri lieu thu cong", QuantitySold: 200, TotalRevenue: 16000000, Rank: 2},
		{ServiceCode: "PT003", ServiceName: "Therapeutic Exercise", ServiceNameVi: "Bai tap tri lieu", QuantitySold: 350, TotalRevenue: 14000000, Rank: 3},
		{ServiceCode: "PT004", ServiceName: "Electrotherapy", ServiceNameVi: "Dien tri lieu", QuantitySold: 180, TotalRevenue: 9000000, Rank: 4},
		{ServiceCode: "PT005", ServiceName: "Ultrasound Therapy", ServiceNameVi: "Sieu am tri lieu", QuantitySold: 150, TotalRevenue: 7500000, Rank: 5},
	}
	if limit < len(data) {
		data = data[:limit]
	}
	return data, nil
}

func (r *mockFinancialReportRepo) GetTherapistProductivity(_ context.Context, _ string, _, _ time.Time) ([]model.TherapistProductivity, error) {
	return []model.TherapistProductivity{
		{TherapistID: "mock-ther-001", TherapistName: "Dr. Nguyen", SessionCount: 45, TotalRevenue: 22500000, AvgRevenuePerSession: 500000, Period: "2026-01"},
		{TherapistID: "mock-ther-002", TherapistName: "Dr. Tran", SessionCount: 38, TotalRevenue: 19000000, AvgRevenuePerSession: 500000, Period: "2026-01"},
	}, nil
}

func (r *mockFinancialReportRepo) RefreshMaterializedViews(_ context.Context) error {
	return nil
}

// Ensure mockFinancialReportRepo implements the interface at compile time.
var _ FinancialReportRepository = (*mockFinancialReportRepo)(nil)
var _ FinancialReportRepository = (*postgresFinancialReportRepo)(nil)
