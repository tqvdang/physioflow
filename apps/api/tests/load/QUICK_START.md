# Quick Start - Performance Testing

## Prerequisites

```bash
# Install K6
brew install k6  # macOS
# or
sudo apt-get install k6  # Linux
```

## Setup

```bash
# 1. Start the API
cd /home/dang/dev/physioflow
make dev-local

# 2. Seed test data (optional)
make seed
```

## Run All Tests

```bash
# From repository root
make test-performance
```

This runs:
1. Database query performance tests
2. N+1 query detection tests
3. All K6 load tests

## Run Individual Load Tests

```bash
# BHYT Validation (target: p95 < 100ms)
make test-load-bhyt

# Outcome Measures (target: p95 < 500ms)
make test-load-outcome

# Medical Term Search (target: p95 < 200ms)
make test-load-search

# Discharge PDF (target: p95 < 3s)
make test-load-discharge

# Billing Calculation (target: p95 < 200ms)
make test-load-billing
```

## Run Database Tests

```bash
# Query performance and index validation
make test-db-performance
```

## Run N+1 Detection

```bash
# Detect inefficient query patterns
make test-n-plus-one
```

## Understanding Results

### Load Tests (K6)

**Success:**
```
✓ status is 200
✓ response time < 100ms

http_req_duration..............: avg=45ms p(95)=95ms
http_req_failed................: 0.00%
```

**Failure:**
```
✗ http_req_duration............: p(95)=450ms
  { p(95)<200ms }...............: FAILED
```

### Database Tests

**Good:**
```
Index Scan using idx_table_column
Execution Time: 31ms  ✓
```

**Bad:**
```
Seq Scan on large_table
Execution Time: 145ms  ✗
Action: Add index
```

### N+1 Detection

**Optimized:**
```
Total queries: 2
✓ PASS: Uses batch loading
```

**N+1 Pattern:**
```
Total queries: 11
✗ FAIL: N+1 pattern detected
```

## Common Commands

```bash
# Run specific test with custom URL
cd apps/api/tests/load
k6 run --env API_URL=http://custom-url:port bhyt-validation.js

# Run with authentication
k6 run --env API_TOKEN=your-token bhyt-validation.js

# Export results to JSON
k6 run --out json=results.json bhyt-validation.js

# Run all load tests
./run-all-load-tests.sh

# Run load tests against staging
./run-all-load-tests.sh https://api-staging.example.com
```

## Troubleshooting

### Issue: Connection Refused

```bash
# Check if API is running
curl http://localhost:7011/health

# Check port
lsof -i :7011
```

### Issue: High Response Times

```bash
# Check database performance
make test-db-performance

# Check for N+1 queries
make test-n-plus-one

# Enable debug logging
LOG_LEVEL=debug go run cmd/api/main.go
```

### Issue: Test Failures

```bash
# Run single test with verbose output
cd apps/api/tests/load
k6 run --verbose bhyt-validation.js

# Check API logs
make logs
```

## Performance Targets

| Endpoint | p95 | RPS |
|----------|-----|-----|
| BHYT Validation | < 100ms | 100 |
| Outcome Progress | < 500ms | 50 |
| Medical Search | < 200ms | 200 |
| Discharge PDF | < 3s | 10 |
| Billing Calc | < 200ms | 100 |

## More Information

- Load Testing: `apps/api/tests/load/README.md`
- N+1 Detection: `apps/api/tests/performance/README.md`
- Complete Guide: `apps/api/tests/PERFORMANCE_TESTING.md`
