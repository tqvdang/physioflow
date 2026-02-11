# Integration Tests

## Overview

This directory contains comprehensive integration tests for the PhysioFlow API. The tests use a real PostgreSQL database connection (or mock mode for CI) and cover all Vietnamese PT-specific endpoints.

## Test Coverage

### Vietnamese PT-Specific Features (31 tests)

File: `vietnamese_pt_test.go`

#### 1. BHYT Insurance Endpoints (5 tests)
- `TestCreateInsurance` - POST /patients/:id/insurance
- `TestGetPatientInsurance` - GET /patients/:id/insurance
- `TestUpdateInsurance` - PUT /patients/:id/insurance/:id (with version conflict)
- `TestValidateBHYTCard` - POST /patients/:id/insurance/validate
- `TestCalculateCoverage` - POST /patients/:id/insurance/calculate-coverage

#### 2. Outcome Measures Endpoints (5 tests)
- `TestRecordMeasure` - POST /patients/:id/outcome-measures
- `TestGetPatientMeasures` - GET /patients/:id/outcome-measures
- `TestCalculateProgress` - GET /patients/:id/outcome-measures/progress
- `TestGetTrending` - GET /patients/:id/outcome-measures/trending
- `TestGetMeasureLibrary` - GET /outcome-measures/library

#### 3. Billing Endpoints (6 tests)
- `TestCreateInvoice` - POST /patients/:id/billing/invoice
- `TestGetInvoice` - GET /patients/:id/billing/invoice/:id
- `TestCalculateBilling` - POST /patients/:id/billing/calculate
- `TestGetServiceCodes` - GET /billing/service-codes
- `TestRecordPayment` - POST /patients/:id/billing/payment
- `TestGetPaymentHistory` - GET /patients/:id/billing/history

#### 4. Protocol Endpoints (5 tests)
- `TestGetProtocols` - GET /protocols
- `TestGetProtocol` - GET /protocols/:id
- `TestAssignProtocol` - POST /patients/:id/protocols/assign
- `TestGetPatientProtocols` - GET /patients/:id/protocols
- `TestUpdateProtocolProgress` - PUT /patients/:id/protocols/:id/progress (with optimistic locking)

#### 5. Discharge Endpoints (5 tests)
- `TestCreateDischargePlan` - POST /patients/:id/discharge/plan
- `TestGetDischargePlan` - GET /patients/:id/discharge/plan
- `TestGenerateDischargeSummary` - POST /patients/:id/discharge/summary
- `TestGetDischargeSummary` - GET /discharge/summary/:id
- `TestCompleteDischarge` - POST /patients/:id/discharge/complete

#### 6. Medical Terms Endpoints (5 tests)
- `TestSearchMedicalTerms` - GET /medical-terms/search?q=vai
- `TestGetTermByID` - GET /medical-terms/:id
- `TestCreateCustomTerm` - POST /medical-terms
- `TestGetTermsByCategory` - GET /medical-terms/category/anatomy
- `TestGetTermByICD10` - GET /medical-terms/icd10/M25.5

### Additional Test Scenarios (6 tests)

#### Security & Reliability Tests
- `TestSQLInjectionPrevention` - Verifies SQL injection attempts are safely handled
- `TestConcurrentInsuranceUpdates` - Tests race conditions with 10 concurrent updates
- `TestDatabaseTransactionRollback` - Ensures failed operations rollback correctly
- `TestAuthorizationEnforcement` - Verifies endpoints enforce proper authorization
- `TestRateLimitingBehavior` - Tests rate limiting (429 after 100 requests/min) - SKIPPED
- `TestAuditLogging` - Verifies audit logs are created for sensitive operations

#### Feature Tests
- `TestBilingualContentSupport` - Verifies Vietnamese/English content is properly handled

## Running the Tests

### Local Development (with database)

1. **Start the test database:**
   ```bash
   # From infrastructure/docker directory
   make up
   ```

2. **Run all integration tests:**
   ```bash
   # From project root
   make test-api

   # Or directly with go
   cd apps/api && go test -v ./tests/integration/...
   ```

3. **Run specific test:**
   ```bash
   cd apps/api && go test -v ./tests/integration/... -run TestCreateInsurance
   ```

4. **Run with coverage:**
   ```bash
   cd apps/api && go test -v -cover ./tests/integration/...
   ```

### CI Mode (without database)

The tests automatically fall back to mock mode when no database is available:

```bash
cd apps/api && go test -v ./tests/integration/...
```

Tests that require a database will be skipped with a message:
```
Skipping database-dependent test (mock mode)
```

## Test Database Setup

The test suite uses:
- **Database:** `physioflow_test`
- **User:** `emr`
- **Port:** `7012` (configurable via `DATABASE_URL`)

### Environment Variables

```bash
# Optional: Override default test database
export DATABASE_URL="postgres://emr:emr_secret_dev_only@localhost:7012/physioflow_test?sslmode=disable"
```

### Test Data

The test suite automatically:
1. **Cleans** existing test data (WHERE clinic_id = 'test-clinic-id')
2. **Seeds** test patients and appointments
3. **Cleans up** after tests complete

Test patients:
- `11111111-1111-1111-1111-111111111111` - John Doe
- `22222222-2222-2222-2222-222222222222` - Jane Smith
- `33333333-3333-3333-3333-333333333333` - Minh Nguyen

## Test Patterns

### Making Requests

```go
// GET request
resp := doRequest(t, http.MethodGet, "/api/v1/patients", nil)

// POST request with body
body := map[string]interface{}{
    "field": "value",
}
resp := doRequest(t, http.MethodPost, "/api/v1/patients", body)
```

### Parsing Responses

```go
var result struct {
    Data []Patient `json:"data"`
}
parseResponse(t, resp, &result)
```

### Asserting Status

```go
assertStatus(t, resp, http.StatusOK)
```

### Handling Mock vs Real Database

```go
func TestExample(t *testing.T) {
    if testServer.DB == nil {
        t.Skip("Skipping database-dependent test (mock mode)")
    }

    // Test implementation...
}
```

## Test Coverage Goals

- **Target:** 80%+ endpoint coverage
- **Current:** 31 Vietnamese PT endpoints + 6 security/reliability tests
- **Total:** 37 integration tests

## Common Test Scenarios

### Testing Version Conflicts (Optimistic Locking)

```go
// Create with version 1
updateBody := map[string]interface{}{
    "field": "value",
    "version": 1,
}
resp := doRequest(t, http.MethodPut, "/api/v1/resource/id", updateBody)

// Second update with stale version should return 409 Conflict
```

### Testing Concurrent Updates

```go
var wg sync.WaitGroup
for i := 0; i < 10; i++ {
    wg.Add(1)
    go func() {
        defer wg.Done()
        // Concurrent update
        resp := doRequest(...)
    }()
}
wg.Wait()
```

### Testing Bilingual Content

```go
body := map[string]interface{}{
    "notes":    "English notes",
    "notes_vi": "Ghi chú tiếng Việt",
}

// Verify both fields are saved and returned
if result["notes_vi"] != "Ghi chú tiếng Việt" {
    t.Error("Vietnamese content not properly saved")
}
```

## Troubleshooting

### Tests Fail to Connect to Database

```bash
# Check database is running
docker ps | grep postgres

# Check database connection
psql -U emr -h localhost -p 7012 -d physioflow_test -c "SELECT 1"

# Verify DATABASE_URL
echo $DATABASE_URL
```

### Tests Run in Mock Mode Unexpectedly

The test suite falls back to mock mode if:
1. `DATABASE_URL` is not set or invalid
2. Database connection fails
3. Database is not running

Check the test output:
```
Failed to connect to database: ...
Make sure the test database is running. Trying with mock mode...
```

### Cleanup Errors

If tests leave orphaned data:

```bash
# Manually clean test data
psql -U emr -h localhost -p 7012 -d physioflow_test -c "DELETE FROM patients WHERE clinic_id = 'test-clinic-id'"
```

## Contributing

When adding new tests:

1. **Use existing test patients** (IDs listed above)
2. **Clean up test data** in `cleanupTestData()`
3. **Handle mock mode** gracefully with `t.Skip()`
4. **Follow naming conventions** - `Test<Feature><Action>`
5. **Add documentation** to this README

## Test Execution Time

- **Full suite:** ~30-60 seconds (with database)
- **Mock mode:** ~5-10 seconds
- **Single test:** ~1-3 seconds

## Known Limitations

1. **Rate limiting tests** are skipped (not yet implemented)
2. **Audit logging tests** need direct database queries
3. **Mock mode** provides limited testing (mainly route/handler structure)
4. **Test isolation** relies on clinic_id filtering (not full isolation)

## Future Improvements

- [ ] Add performance benchmarks
- [ ] Implement rate limiting tests
- [ ] Add test coverage reporting
- [ ] Add database snapshot/restore for faster cleanup
- [ ] Add integration with CI/CD pipeline
- [ ] Add load testing scenarios
- [ ] Add API documentation tests (OpenAPI validation)
