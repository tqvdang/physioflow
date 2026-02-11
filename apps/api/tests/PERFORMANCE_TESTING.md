# Performance Testing Suite

Comprehensive performance and load testing for PhysioFlow API.

## Overview

This suite includes three types of performance tests:

1. **Load Tests (K6)** - Test endpoints under realistic load conditions
2. **Database Performance Tests (SQL)** - Validate query execution plans and index usage
3. **N+1 Query Detection (Go)** - Detect inefficient query patterns in application code

## Performance Targets

| Feature | Target p95 | Target RPS | Status |
|---------|-----------|------------|--------|
| BHYT Validation | < 100ms | 100 req/s | ✓ Tested |
| Outcome Progress | < 500ms | 50 req/s | ✓ Tested |
| Medical Term Search | < 200ms | 200 req/s | ✓ Tested |
| Discharge PDF | < 3s | 10 req/s | ✓ Tested |
| Billing Calculation | < 200ms | 100 req/s | ✓ Tested |

## Quick Start

### Prerequisites

```bash
# Install K6 (for load tests)
brew install k6  # macOS
# or
sudo apt-get install k6  # Linux

# Start the API
make dev-local

# Seed test data
make seed
```

### Run All Performance Tests

```bash
make test-performance
```

This runs:
1. Database query performance tests
2. N+1 query detection
3. Load tests for all endpoints

### Run Individual Test Suites

```bash
# Database performance only
make test-db-performance

# N+1 query detection only
make test-n-plus-one

# Load tests only
make test-load
```

### Run Specific Load Tests

```bash
# BHYT validation (target: p95 < 100ms)
make test-load-bhyt

# Outcome measures (target: p95 < 500ms)
make test-load-outcome

# Medical term search (target: p95 < 200ms)
make test-load-search

# Discharge PDF (target: p95 < 3s)
make test-load-discharge

# Billing calculation (target: p95 < 200ms)
make test-load-billing
```

## Test Files

### Load Tests (K6)

Location: `apps/api/tests/load/`

| File | Purpose | Target |
|------|---------|--------|
| `bhyt-validation.js` | BHYT insurance card validation | p95 < 100ms, 100 req/s |
| `outcome-measures.js` | Outcome measure progress calculation | p95 < 500ms, 50 req/s |
| `medical-term-search.js` | Medical term trigram search | p95 < 200ms, 200 req/s |
| `discharge-pdf.js` | Discharge summary PDF generation | p95 < 3s, 10 req/s |
| `billing-calculation.js` | Billing calculation with insurance | p95 < 200ms, 100 req/s |
| `run-all-load-tests.sh` | Run all load tests and generate report | - |
| `README.md` | Load testing documentation | - |

### Database Performance Tests

Location: `infrastructure/db/tests/`

| File | Purpose |
|------|---------|
| `database-queries.sql` | Validate query plans, index usage, detect missing indexes |

Tests include:
- Outcome measures date range query (partition pruning)
- Medical terms trigram search (GIN index)
- Invoice joins (multi-table efficiency)
- Patient search (trigram on names)
- Appointments date range (index usage)
- Progress calculation (window functions)
- BHYT insurance lookup
- Service codes filtering
- Discharge summary (complex joins)

### N+1 Query Detection Tests

Location: `apps/api/tests/performance/`

| File | Purpose |
|------|---------|
| `n_plus_one_test.go` | Detect N+1 query patterns in repository methods |
| `README.md` | N+1 detection documentation |

Tests include:
- Patient list with protocols (should use JOIN or IN clause)
- Outcome measures with library (should batch load)
- Invoice list with items and payments (should batch load)
- Discharge summary baseline comparisons (should batch query)

## Understanding Results

### Load Test Results (K6)

#### Success Output
```
✓ status is 200
✓ response time < 100ms
✓ has validation result

checks.........................: 100.00% ✓ 3000 ✗ 0
http_req_duration..............: avg=45ms p(95)=95ms
http_req_failed................: 0.00%   ✓ 0    ✗ 3000
http_reqs......................: 3000    100/s

PASS: p95 < 100ms ✓
PASS: Error rate < 1% ✓
```

#### Failure Output
```
✗ http_req_duration............: avg=250ms p(95)=450ms
  { p(95)<200ms }...............: FAILED

FAIL: p95 exceeded threshold (450ms > 200ms)
```

### Database Test Results

#### Good Query Plan
```sql
Index Scan using idx_outcome_measures_patient_date
  (cost=0.42..8.45 rows=1 width=88)
  (actual time=0.015..0.016 rows=0 loops=1)
Planning Time: 0.082 ms
Execution Time: 0.031 ms  ✓ < 50ms target
```

#### Bad Query Plan (Needs Optimization)
```sql
Seq Scan on outcome_measures
  (cost=0.00..1234.56 rows=100 width=88)
  (actual time=0.015..45.632 rows=100 loops=1)
Execution Time: 45.632 ms  ✗ > 50ms target

Action: Add index on (patient_id, measured_at)
```

### N+1 Detection Results

#### Optimized (PASS)
```
Total queries executed: 2
Query 1: select * from patients where clinic_id = ?
Query 2: select * from protocols where patient_id in (?, ?, ?, ...)

✓ PASS: Should use at most 3 queries
```

#### N+1 Pattern (FAIL)
```
Total queries executed: 11
Query 1: select * from patients where clinic_id = ?
Query 2-11: select * from protocols where patient_id = ?

✗ FAIL: Should not query protocols individually for each patient
```

## Common Performance Issues

### Issue 1: High Response Times

**Symptoms:**
- Load test p95 exceeds threshold
- Slow API responses in logs

**Diagnosis:**
```bash
# Check database queries
make test-db-performance

# Check for N+1 queries
make test-n-plus-one

# Enable API debug logging
LOG_LEVEL=debug go run cmd/api/main.go
```

**Solutions:**
1. Add missing database indexes
2. Fix N+1 queries (use JOIN or IN clause)
3. Optimize complex calculations
4. Add caching for frequently accessed data

### Issue 2: Missing Indexes

**Symptoms:**
```sql
Seq Scan on large_table  (actual time=0.015..45.632 rows=100 loops=1)
```

**Solution:**
```sql
-- Add index based on WHERE clause columns
CREATE INDEX idx_table_column ON large_table(column);

-- For multiple columns (composite index)
CREATE INDEX idx_table_col1_col2 ON large_table(col1, col2);

-- For trigram search
CREATE INDEX idx_table_name_trgm ON table USING GIN (name gin_trgm_ops);
```

### Issue 3: N+1 Queries

**Symptoms:**
- Many similar queries in logs
- Query count scales with result set size

**Solution (Option 1 - JOIN):**
```go
query := `
    SELECT
        p.*,
        pr.id as protocol_id,
        pr.name as protocol_name
    FROM patients p
    LEFT JOIN protocols pr ON pr.patient_id = p.id
    WHERE p.clinic_id = $1
`
```

**Solution (Option 2 - IN Clause):**
```go
// Get patients
patients, _ := GetAll(ctx)

// Collect IDs
ids := extractIDs(patients)

// Batch load protocols
protocols, _ := db.Query(`
    SELECT * FROM protocols WHERE patient_id = ANY($1)
`, ids)

// Map to patients
mapProtocolsToPatients(patients, protocols)
```

### Issue 4: Slow Calculations

**Symptoms:**
- Outcome progress calculation exceeds 500ms
- Discharge summary generation exceeds 3s

**Solutions:**
1. Use database window functions instead of application logic
2. Pre-calculate common aggregations
3. Use materialized views for complex queries
4. Cache calculation results

### Issue 5: High Memory Usage

**Symptoms:**
- K6 load tests crash with OOM
- API memory usage grows over time

**Solutions:**
1. Reduce K6 VUs (virtual users)
2. Add pagination to large result sets
3. Use streaming for large responses
4. Fix memory leaks in application code

## Performance Optimization Checklist

### Database Optimization
- [ ] All queries use appropriate indexes
- [ ] No sequential scans on large tables
- [ ] Composite indexes for multi-column filters
- [ ] GIN indexes for trigram search
- [ ] EXPLAIN ANALYZE shows efficient plans

### Application Optimization
- [ ] No N+1 query patterns
- [ ] Batch loading of related data
- [ ] Connection pooling configured
- [ ] Query result caching for static data
- [ ] Proper error handling (no silent failures)

### Load Testing
- [ ] All endpoints meet p95 targets
- [ ] Error rate < 1% under load
- [ ] Graceful degradation under stress
- [ ] Recovery after spike testing
- [ ] Consistent performance over time

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Performance Tests

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Start services
        run: make dev-local

      - name: Run database performance tests
        run: make test-db-performance

      - name: Run N+1 detection
        run: make test-n-plus-one

      - name: Run load tests
        run: make test-load

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: apps/api/tests/load/results/
```

### Performance Regression Detection

```bash
# Save baseline metrics
make test-load > baseline.txt

# After changes, compare
make test-load > current.txt
diff baseline.txt current.txt

# Fail if p95 increased by >10%
```

## Monitoring in Production

### Enable PostgreSQL Slow Query Log

```sql
ALTER SYSTEM SET log_min_duration_statement = 100;
SELECT pg_reload_conf();
```

### Install pg_stat_statements

```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slowest queries
SELECT
    calls,
    mean_exec_time,
    query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Application Metrics

```go
// Log slow queries in application
if duration > 100*time.Millisecond {
    log.Warn("Slow query detected",
        zap.String("query", query),
        zap.Duration("duration", duration),
    )
}
```

## Further Reading

- [K6 Documentation](https://k6.io/docs/)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Database Indexing Best Practices](https://use-the-index-luke.com/)
- [N+1 Query Problem](https://stackoverflow.com/questions/97197/what-is-the-n1-selects-problem-in-orm-object-relational-mapping)

## Support

For questions or issues with performance tests:
1. Check the README files in each test directory
2. Review the test output for specific error messages
3. Run tests individually to isolate issues
4. Check database and application logs
