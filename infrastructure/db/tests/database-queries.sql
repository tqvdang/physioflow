-- Database Query Performance Tests
-- Run with: psql -U emr -d physioflow -f infrastructure/db/tests/database-queries.sql

\echo ''
\echo '========================================='
\echo 'Database Query Performance Tests'
\echo '========================================='
\echo ''

-- Enable timing
\timing on

-- Test 1: Outcome measures query with partitioning
\echo ''
\echo 'Test 1: Outcome measures query with date range (should use partition pruning)'
\echo 'Target: < 50ms'
\echo ''

EXPLAIN ANALYZE
SELECT
    id,
    patient_id,
    measure_type,
    score,
    max_possible,
    measured_at
FROM outcome_measures
WHERE patient_id = '550e8400-e29b-41d4-a716-446655440001'
  AND measured_at >= '2024-01-01'
  AND measured_at < '2025-01-01'
ORDER BY measured_at DESC;

\echo ''
\echo 'Expected: Should use index on (patient_id, measured_at) or partition pruning if table is partitioned'
\echo ''

-- Test 2: Medical terms trigram search
\echo ''
\echo 'Test 2: Medical terms trigram search (Vietnamese)'
\echo 'Target: < 10ms with GIN index'
\echo ''

EXPLAIN ANALYZE
SELECT
    id,
    term_vi,
    term_en,
    category,
    similarity(term_vi, 'vai') as sim_score
FROM vietnamese_medical_terms
WHERE term_vi % 'vai'
ORDER BY similarity(term_vi, 'vai') DESC
LIMIT 20;

\echo ''
\echo 'Expected: Should use GIN index on term_vi with pg_trgm'
\echo ''

-- Test 3: Medical terms trigram search (English)
\echo ''
\echo 'Test 3: Medical terms trigram search (English)'
\echo 'Target: < 10ms with GIN index'
\echo ''

EXPLAIN ANALYZE
SELECT
    id,
    term_vi,
    term_en,
    category,
    similarity(term_en, 'shoulder') as sim_score
FROM vietnamese_medical_terms
WHERE term_en % 'shoulder'
ORDER BY similarity(term_en, 'shoulder') DESC
LIMIT 20;

\echo ''
\echo 'Expected: Should use GIN index on term_en with pg_trgm'
\echo ''

-- Test 4: Invoice query with joins
\echo ''
\echo 'Test 4: Invoice query with patient join'
\echo 'Target: < 50ms'
\echo ''

EXPLAIN ANALYZE
SELECT
    i.id,
    i.invoice_number,
    i.total_amount,
    i.status,
    p.full_name,
    p.phone_number
FROM invoices i
JOIN patients p ON i.patient_id = p.id
WHERE i.status = 'pending'
  AND i.clinic_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY i.issued_at DESC
LIMIT 50;

\echo ''
\echo 'Expected: Should use index on (clinic_id, status, issued_at)'
\echo ''

-- Test 5: Patient search with trigram
\echo ''
\echo 'Test 5: Patient search by name'
\echo 'Target: < 50ms with GIN index'
\echo ''

EXPLAIN ANALYZE
SELECT
    id,
    full_name,
    phone_number,
    date_of_birth,
    similarity(full_name, 'Nguyen') as sim_score
FROM patients
WHERE full_name % 'Nguyen'
  AND clinic_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY similarity(full_name, 'Nguyen') DESC
LIMIT 20;

\echo ''
\echo 'Expected: Should use GIN index on full_name or bitmap scan'
\echo ''

-- Test 6: Appointments query with date range
\echo ''
\echo 'Test 6: Appointments query with date range'
\echo 'Target: < 30ms'
\echo ''

EXPLAIN ANALYZE
SELECT
    a.id,
    a.scheduled_at,
    a.status,
    p.full_name as patient_name
FROM appointments a
JOIN patients p ON a.patient_id = p.id
WHERE a.clinic_id = '550e8400-e29b-41d4-a716-446655440000'
  AND a.scheduled_at >= CURRENT_DATE
  AND a.scheduled_at < CURRENT_DATE + INTERVAL '7 days'
  AND a.status != 'cancelled'
ORDER BY a.scheduled_at;

\echo ''
\echo 'Expected: Should use index on (clinic_id, scheduled_at, status)'
\echo ''

-- Test 7: Outcome measures progress calculation
\echo ''
\echo 'Test 7: Outcome measures progress calculation (window functions)'
\echo 'Target: < 100ms'
\echo ''

EXPLAIN ANALYZE
WITH measure_history AS (
    SELECT
        patient_id,
        measure_type,
        library_id,
        score,
        measured_at,
        ROW_NUMBER() OVER (PARTITION BY patient_id, measure_type ORDER BY measured_at DESC) as rn,
        FIRST_VALUE(score) OVER (PARTITION BY patient_id, measure_type ORDER BY measured_at ASC) as baseline_score,
        LAG(score) OVER (PARTITION BY patient_id, measure_type ORDER BY measured_at ASC) as previous_score
    FROM outcome_measures
    WHERE patient_id = '550e8400-e29b-41d4-a716-446655440001'
      AND measure_type = 'vas'
)
SELECT
    patient_id,
    measure_type,
    score as current_score,
    previous_score,
    baseline_score,
    score - COALESCE(previous_score, score) as change_from_previous,
    score - COALESCE(baseline_score, score) as change_from_baseline
FROM measure_history
WHERE rn = 1;

\echo ''
\echo 'Expected: Should use index on (patient_id, measure_type, measured_at)'
\echo ''

-- Test 8: BHYT insurance lookup
\echo ''
\echo 'Test 8: BHYT insurance card lookup by patient'
\echo 'Target: < 10ms'
\echo ''

EXPLAIN ANALYZE
SELECT
    id,
    card_number,
    valid_from,
    valid_until,
    registration_location,
    copay_percent
FROM bhyt_insurance_cards
WHERE patient_id = '550e8400-e29b-41d4-a716-446655440001'
  AND status = 'active'
  AND valid_until >= CURRENT_DATE
ORDER BY created_at DESC
LIMIT 1;

\echo ''
\echo 'Expected: Should use index on (patient_id, status, valid_until)'
\echo ''

-- Test 9: Service codes lookup with category filter
\echo ''
\echo 'Test 9: Service codes lookup by category'
\echo 'Target: < 20ms'
\echo ''

EXPLAIN ANALYZE
SELECT
    id,
    code,
    name,
    name_vi,
    unit_price,
    bhyt_coverable,
    bhyt_price
FROM pt_service_codes
WHERE category = 'therapeutic_procedures'
  AND is_active = true
ORDER BY code;

\echo ''
\echo 'Expected: Should use index on (category, is_active)'
\echo ''

-- Test 10: Discharge summary with multiple joins
\echo ''
\echo 'Test 10: Discharge summary with related data'
\echo 'Target: < 200ms'
\echo ''

EXPLAIN ANALYZE
SELECT
    ds.id,
    ds.diagnosis,
    ds.treatment_summary,
    ds.total_sessions,
    dp.status as plan_status,
    dp.reason as discharge_reason,
    p.full_name as patient_name,
    p.date_of_birth
FROM discharge_summaries ds
JOIN discharge_plans dp ON ds.discharge_plan_id = dp.id
JOIN patients p ON ds.patient_id = p.id
WHERE ds.patient_id = '550e8400-e29b-41d4-a716-446655440001'
ORDER BY ds.created_at DESC
LIMIT 1;

\echo ''
\echo 'Expected: Should use indexes efficiently, minimal nested loops'
\echo ''

-- Summary: Check for missing indexes
\echo ''
\echo '========================================='
\echo 'Missing Index Detection'
\echo '========================================='
\echo ''

\echo 'Tables without indexes (excluding system tables):'
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT DISTINCT tablename
    FROM pg_indexes
    WHERE schemaname = 'public'
  )
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

\echo ''
\echo 'Tables with sequential scans (potential missing indexes):'
SELECT
    schemaname,
    relname as tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    CASE
        WHEN seq_scan + idx_scan > 0
        THEN ROUND(100.0 * seq_scan / (seq_scan + idx_scan), 2)
        ELSE 0
    END as seq_scan_percent
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND seq_scan > 0
ORDER BY seq_scan DESC
LIMIT 10;

\echo ''
\echo 'Unused indexes (candidates for removal):'
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(schemaname||'.'||indexname)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(schemaname||'.'||indexname) DESC;

\echo ''
\echo '========================================='
\echo 'Index Usage Statistics'
\echo '========================================='
\echo ''

SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(schemaname||'.'||indexname)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan > 0
ORDER BY idx_scan DESC
LIMIT 20;

\timing off

\echo ''
\echo '========================================='
\echo 'Performance Test Complete'
\echo '========================================='
\echo ''
\echo 'Review the EXPLAIN ANALYZE output above to:'
\echo '  1. Verify indexes are being used'
\echo '  2. Check for sequential scans on large tables'
\echo '  3. Identify slow queries (> target threshold)'
\echo '  4. Look for missing indexes'
\echo ''
