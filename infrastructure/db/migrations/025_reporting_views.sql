-- Migration: 025_reporting_views.sql
-- Description: Materialized views for financial reporting
-- Created: 2026-02-11
-- Depends on: 007_billing_tables.sql

-- =============================================================================
-- MATERIALIZED VIEW: Revenue by Period
-- Aggregates paid invoice revenue by day, week, and month
-- =============================================================================

CREATE MATERIALIZED VIEW mv_revenue_by_period AS
WITH daily_revenue AS (
    SELECT
        i.invoice_date AS date,
        'daily' AS period_type,
        SUM(i.total_amount) AS total_revenue,
        SUM(i.insurance_amount) AS insurance_revenue,
        SUM(i.total_amount - i.insurance_amount) AS cash_revenue,
        COUNT(*) AS invoice_count
    FROM invoices i
    WHERE i.status IN ('paid', 'partially_paid')
    GROUP BY i.invoice_date
),
weekly_revenue AS (
    SELECT
        DATE_TRUNC('week', i.invoice_date)::date AS date,
        'weekly' AS period_type,
        SUM(i.total_amount) AS total_revenue,
        SUM(i.insurance_amount) AS insurance_revenue,
        SUM(i.total_amount - i.insurance_amount) AS cash_revenue,
        COUNT(*) AS invoice_count
    FROM invoices i
    WHERE i.status IN ('paid', 'partially_paid')
    GROUP BY DATE_TRUNC('week', i.invoice_date)
),
monthly_revenue AS (
    SELECT
        DATE_TRUNC('month', i.invoice_date)::date AS date,
        'monthly' AS period_type,
        SUM(i.total_amount) AS total_revenue,
        SUM(i.insurance_amount) AS insurance_revenue,
        SUM(i.total_amount - i.insurance_amount) AS cash_revenue,
        COUNT(*) AS invoice_count
    FROM invoices i
    WHERE i.status IN ('paid', 'partially_paid')
    GROUP BY DATE_TRUNC('month', i.invoice_date)
)
SELECT * FROM daily_revenue
UNION ALL
SELECT * FROM weekly_revenue
UNION ALL
SELECT * FROM monthly_revenue;

CREATE UNIQUE INDEX idx_mv_revenue_period ON mv_revenue_by_period (date, period_type);

COMMENT ON MATERIALIZED VIEW mv_revenue_by_period IS 'Aggregated revenue data by daily, weekly, and monthly periods';

-- =============================================================================
-- MATERIALIZED VIEW: Outstanding Payments
-- Shows unpaid/partially paid invoices with aging buckets
-- =============================================================================

CREATE MATERIALIZED VIEW mv_outstanding_payments AS
SELECT
    i.id AS invoice_id,
    i.patient_id,
    COALESCE(
        p.last_name || ' ' || p.first_name,
        'Unknown'
    ) AS patient_name,
    i.balance_due AS amount_due,
    (CURRENT_DATE - i.invoice_date) AS days_outstanding,
    CASE
        WHEN (CURRENT_DATE - i.invoice_date) <= 30 THEN '0-30'
        WHEN (CURRENT_DATE - i.invoice_date) <= 60 THEN '31-60'
        WHEN (CURRENT_DATE - i.invoice_date) <= 90 THEN '61-90'
        ELSE '90+'
    END AS aging_bucket,
    i.invoice_number,
    i.invoice_date,
    i.total_amount,
    i.status
FROM invoices i
LEFT JOIN patients p ON p.id = i.patient_id
WHERE i.status IN ('pending', 'partially_paid', 'submitted', 'approved')
  AND i.balance_due > 0;

CREATE UNIQUE INDEX idx_mv_outstanding_invoice ON mv_outstanding_payments (invoice_id);
CREATE INDEX idx_mv_outstanding_bucket ON mv_outstanding_payments (aging_bucket);
CREATE INDEX idx_mv_outstanding_patient ON mv_outstanding_payments (patient_id);

COMMENT ON MATERIALIZED VIEW mv_outstanding_payments IS 'Outstanding invoices with aging bucket classification';

-- =============================================================================
-- MATERIALIZED VIEW: Service Revenue
-- Ranks services by total revenue generated
-- =============================================================================

CREATE MATERIALIZED VIEW mv_service_revenue AS
SELECT
    sc.code AS service_code,
    sc.service_name,
    sc.service_name_vi,
    SUM(ili.quantity) AS quantity_sold,
    SUM(ili.total_price) AS total_revenue,
    RANK() OVER (ORDER BY SUM(ili.total_price) DESC) AS rank
FROM invoice_line_items ili
JOIN pt_service_codes sc ON sc.id = ili.service_code_id
JOIN invoices i ON i.id = ili.invoice_id
WHERE i.status IN ('paid', 'partially_paid')
GROUP BY sc.code, sc.service_name, sc.service_name_vi;

CREATE UNIQUE INDEX idx_mv_service_revenue_code ON mv_service_revenue (service_code);
CREATE INDEX idx_mv_service_revenue_rank ON mv_service_revenue (rank);

COMMENT ON MATERIALIZED VIEW mv_service_revenue IS 'Service codes ranked by total revenue';

-- =============================================================================
-- MATERIALIZED VIEW: Therapist Productivity
-- Tracks session counts and revenue per therapist per month
-- =============================================================================

CREATE MATERIALIZED VIEW mv_therapist_productivity AS
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
GROUP BY ts.therapist_id, u.first_name, u.last_name, DATE_TRUNC('month', ts.session_date);

CREATE UNIQUE INDEX idx_mv_therapist_prod ON mv_therapist_productivity (therapist_id, period);
CREATE INDEX idx_mv_therapist_prod_period ON mv_therapist_productivity (period);

COMMENT ON MATERIALIZED VIEW mv_therapist_productivity IS 'Therapist productivity metrics by month';

-- =============================================================================
-- REFRESH FUNCTION
-- Can be called manually or scheduled via pg_cron
-- =============================================================================

CREATE OR REPLACE FUNCTION refresh_reporting_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_revenue_by_period;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_outstanding_payments;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_service_revenue;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_therapist_productivity;

    RAISE NOTICE 'Reporting materialized views refreshed at %', NOW();
END;
$$;

COMMENT ON FUNCTION refresh_reporting_views() IS 'Refreshes all financial reporting materialized views concurrently';

-- =============================================================================
-- SCHEDULE (requires pg_cron extension)
-- Refresh daily at 2:00 AM local time
-- Run: CREATE EXTENSION IF NOT EXISTS pg_cron;
-- Then uncomment the line below:
-- =============================================================================
-- SELECT cron.schedule('refresh-reporting-views', '0 2 * * *', 'SELECT refresh_reporting_views()');
