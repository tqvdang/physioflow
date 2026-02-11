# Performance Tests

Database query performance tests and N+1 query detection.

## Overview

This suite includes:

1. **Database Query Performance Tests** (SQL) - Validates query execution plans and index usage
2. **N+1 Query Detection Tests** (Go) - Detects inefficient query patterns in application code
3. **Query Performance Benchmarks** (Go) - Measures actual query execution time

## Database Performance Tests

### Running Tests

```bash
cd infrastructure/db
psql -U emr -d physioflow -f tests/database-queries.sql
```

### What It Tests

1. **Outcome Measures Query** - Partition pruning for date ranges (target: < 50ms)
2. **Medical Terms Trigram Search** - GIN index usage for Vietnamese/English search (target: < 10ms)
3. **Invoice Query with Joins** - Efficient multi-table queries (target: < 50ms)
4. **Patient Search** - Trigram search on names (target: < 50ms)
5. **Appointments Date Range** - Index usage for calendar queries (target: < 30ms)
6. **Progress Calculation** - Window functions performance (target: < 100ms)
7. **BHYT Insurance Lookup** - Fast card validation (target: < 10ms)
8. **Service Codes by Category** - Filtered lookups (target: < 20ms)
9. **Discharge Summary** - Complex multi-table joins (target: < 200ms)

### Expected Output

```sql
Test 1: Outcome measures query with date range
Target: < 50ms

QUERY PLAN
---------------------------------------------------------
Index Scan using idx_outcome_measures_patient_date on outcome_measures  (cost=0.42..8.45 rows=1 width=88) (actual time=0.015..0.016 rows=0 loops=1)
  Index Cond: ((patient_id = '550e8400-e29b-41d4-a716-446655440001'::uuid) AND (measured_at >= '2024-01-01'::date) AND (measured_at < '2025-01-01'::date))
Planning Time: 0.082 ms
Execution Time: 0.031 ms

Expected: Should use index on (patient_id, measured_at)
```

### Interpreting Results

- **Seq Scan**: Sequential scan = NO INDEX! Should be avoided on large tables
- **Index Scan**: Good! Using index efficiently
- **Bitmap Index Scan**: Good for moderate selectivity
- **Planning Time**: Time to plan query (should be < 1ms for simple queries)
- **Execution Time**: Actual query time - compare to target

### Common Issues

#### Issue: Sequential Scan on Large Table

```
Seq Scan on outcome_measures  (cost=0.00..1234.56 rows=100 width=88) (actual time=0.015..45.632 rows=100 loops=1)
```

**Fix**: Add missing index

```sql
CREATE INDEX idx_outcome_measures_patient_date
ON outcome_measures(patient_id, measured_at);
```

#### Issue: Slow Trigram Search

```
Seq Scan on vietnamese_medical_terms  (cost=0.00..2345.67 rows=20 width=256) (actual time=120.234..125.456 rows=20 loops=1)
  Filter: (term_vi % 'vai'::text)
```

**Fix**: Create GIN index for trigram search

```sql
CREATE INDEX idx_medical_terms_vi_trgm
ON vietnamese_medical_terms USING GIN (term_vi gin_trgm_ops);
```

## N+1 Query Detection

### Running Tests

```bash
cd apps/api
go test -v ./tests/performance -run TestNoNPlusOne
```

### What It Tests

Detects N+1 query patterns where the application makes:
- 1 query to fetch parent records
- N queries to fetch related records (once per parent)

Instead of:
- 1 query for parents
- 1 query for all related records (using JOIN or IN clause)

### Example N+1 Pattern

**Bad (N+1)**:
```go
// Query 1: Get patients
patients := GetPatients() // 1 query

// Query 2-11: Get protocols for each patient (N queries)
for _, patient := range patients {
    protocols := GetPatientProtocols(patient.ID) // N queries!
}
// Total: 1 + N queries = 11 queries for 10 patients
```

**Good (Optimized)**:
```go
// Query 1: Get patients
patients := GetPatients() // 1 query

// Query 2: Get ALL protocols in one query
patientIDs := extractIDs(patients)
protocols := GetProtocolsByPatientIDs(patientIDs) // 1 query using IN clause

// Total: 2 queries regardless of patient count
```

### Test Structure

```go
func TestNoNPlusOneInPatientList(t *testing.T) {
    logger := NewQueryLogger()
    logger.Enable()

    // Call repository method
    patients := patientRepo.GetAllWithProtocols(ctx)

    logger.Disable()

    // Assert: Should be at most 2-3 queries
    assert.LessOrEqual(t, logger.Count(), 3)
}
```

### Fixing N+1 Queries

#### Option 1: Use JOINs

```go
// repository/patient_repository.go
func (r *PatientRepository) GetAllWithProtocols(ctx context.Context) ([]*model.Patient, error) {
    query := `
        SELECT
            p.*,
            pr.id as protocol_id,
            pr.name as protocol_name,
            pr.status as protocol_status
        FROM patients p
        LEFT JOIN protocols pr ON pr.patient_id = p.id
        WHERE p.clinic_id = $1
    `

    // Then group results by patient
    return r.scanPatientProtocolRows(rows)
}
```

#### Option 2: Use IN Clause (Batch Loading)

```go
// Get patients first
patients, err := r.GetAll(ctx)

// Collect all patient IDs
patientIDs := make([]string, len(patients))
for i, p := range patients {
    patientIDs[i] = p.ID
}

// Fetch all protocols in one query
query := `
    SELECT * FROM protocols
    WHERE patient_id = ANY($1)
`
protocols, err := r.db.Query(ctx, query, patientIDs)

// Map protocols to patients
protocolsByPatient := groupBy(protocols, "patient_id")
for _, patient := range patients {
    patient.Protocols = protocolsByPatient[patient.ID]
}
```

## Query Performance Benchmarks

### Running Benchmarks

```bash
cd apps/api
go test -bench=. -benchmem ./tests/performance
```

### Example Output

```
BenchmarkPatientListQuery-8                 1000    1234567 ns/op    123456 B/op    123 allocs/op
BenchmarkOutcomeMeasureProgress-8            200    5678901 ns/op    234567 B/op    234 allocs/op
BenchmarkMedicalTermSearch-8                5000     234567 ns/op     12345 B/op     12 allocs/op
```

### Interpreting Benchmarks

- **ns/op**: Nanoseconds per operation (lower is better)
- **B/op**: Bytes allocated per operation (lower is better)
- **allocs/op**: Number of allocations per operation (lower is better)

### Performance Regression Detection

Save baseline:
```bash
go test -bench=. ./tests/performance > baseline.txt
```

Compare after changes:
```bash
go test -bench=. ./tests/performance > current.txt
benchcmp baseline.txt current.txt
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run database performance tests
  run: |
    make psql < infrastructure/db/tests/database-queries.sql

- name: Run N+1 query detection
  run: |
    cd apps/api
    go test -v ./tests/performance -run TestNoNPlusOne

- name: Run performance benchmarks
  run: |
    cd apps/api
    go test -bench=. -benchmem ./tests/performance
```

### Performance Thresholds in CI

```go
func TestQueryPerformanceThresholds(t *testing.T) {
    tests := []struct {
        name      string
        operation func() error
        threshold time.Duration
    }{
        {
            name:      "BHYT validation < 100ms",
            operation: validateBHYT,
            threshold: 100 * time.Millisecond,
        },
    }

    for _, tt := range tests {
        start := time.Now()
        err := tt.operation()
        duration := time.Since(start)

        if duration > tt.threshold {
            t.Errorf("Exceeded threshold: %v > %v", duration, tt.threshold)
        }
    }
}
```

## Monitoring Query Performance in Production

### Enable PostgreSQL Slow Query Log

```sql
-- Log queries slower than 100ms
ALTER SYSTEM SET log_min_duration_statement = 100;
SELECT pg_reload_conf();
```

### Install pg_stat_statements Extension

```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slowest queries
SELECT
    calls,
    mean_exec_time,
    max_exec_time,
    query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Application-Level Query Logging

```go
// Enable query logging in development
db.LogMode(true)

// Custom logger
type QueryLogger struct {
    logger *zap.Logger
}

func (l *QueryLogger) Log(query string, duration time.Duration) {
    if duration > 100*time.Millisecond {
        l.logger.Warn("Slow query detected",
            zap.String("query", query),
            zap.Duration("duration", duration),
        )
    }
}
```

## Related Documentation

- [Load Testing (K6)](../load/README.md)
- [Integration Tests](../integration/README.md)
- [Database Migrations](../../../infrastructure/db/migrations/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
