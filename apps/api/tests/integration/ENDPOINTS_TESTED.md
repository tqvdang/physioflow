# API Endpoints Test Coverage

## Summary

- **Total Endpoints Tested:** 31 Vietnamese PT endpoints + existing core endpoints
- **Test Files:** 5 integration test files
- **Coverage:** Insurance, Outcome Measures, Billing, Protocols, Discharge, Medical Terms

---

## Vietnamese PT Endpoints (31 endpoints)

### BHYT Insurance (5 endpoints)

| Method | Endpoint | Test | Status |
|--------|----------|------|--------|
| POST | `/api/v1/patients/:id/insurance` | TestCreateInsurance | ✅ |
| GET | `/api/v1/patients/:id/insurance` | TestGetPatientInsurance | ✅ |
| PUT | `/api/v1/patients/:id/insurance/:id` | TestUpdateInsurance | ✅ |
| POST | `/api/v1/patients/:id/insurance/validate` | TestValidateBHYTCard | ✅ |
| POST | `/api/v1/patients/:id/insurance/calculate-coverage` | TestCalculateCoverage | ✅ |

### Outcome Measures (5 endpoints)

| Method | Endpoint | Test | Status |
|--------|----------|------|--------|
| POST | `/api/v1/patients/:id/outcome-measures` | TestRecordMeasure | ✅ |
| GET | `/api/v1/patients/:id/outcome-measures` | TestGetPatientMeasures | ✅ |
| GET | `/api/v1/patients/:id/outcome-measures/progress` | TestCalculateProgress | ✅ |
| GET | `/api/v1/patients/:id/outcome-measures/trending` | TestGetTrending | ✅ |
| GET | `/api/v1/outcome-measures/library` | TestGetMeasureLibrary | ✅ |

### Billing (6 endpoints)

| Method | Endpoint | Test | Status |
|--------|----------|------|--------|
| POST | `/api/v1/patients/:id/billing/invoice` | TestCreateInvoice | ✅ |
| GET | `/api/v1/patients/:id/billing/invoice/:id` | TestGetInvoice | ✅ |
| POST | `/api/v1/patients/:id/billing/calculate` | TestCalculateBilling | ✅ |
| GET | `/api/v1/billing/service-codes` | TestGetServiceCodes | ✅ |
| POST | `/api/v1/patients/:id/billing/payment` | TestRecordPayment | ✅ |
| GET | `/api/v1/patients/:id/billing/history` | TestGetPaymentHistory | ✅ |

### Clinical Protocols (5 endpoints)

| Method | Endpoint | Test | Status |
|--------|----------|------|--------|
| GET | `/api/v1/protocols` | TestGetProtocols | ✅ |
| GET | `/api/v1/protocols/:id` | TestGetProtocol | ✅ |
| POST | `/api/v1/patients/:id/protocols/assign` | TestAssignProtocol | ✅ |
| GET | `/api/v1/patients/:id/protocols` | TestGetPatientProtocols | ✅ |
| PUT | `/api/v1/patients/:id/protocols/:id/progress` | TestUpdateProtocolProgress | ✅ |

### Discharge Planning (5 endpoints)

| Method | Endpoint | Test | Status |
|--------|----------|------|--------|
| POST | `/api/v1/patients/:id/discharge/plan` | TestCreateDischargePlan | ✅ |
| GET | `/api/v1/patients/:id/discharge/plan` | TestGetDischargePlan | ✅ |
| POST | `/api/v1/patients/:id/discharge/summary` | TestGenerateDischargeSummary | ✅ |
| GET | `/api/v1/discharge/summary/:id` | TestGetDischargeSummary | ✅ |
| POST | `/api/v1/patients/:id/discharge/complete` | TestCompleteDischarge | ✅ |

### Medical Terms (5 endpoints)

| Method | Endpoint | Test | Status |
|--------|----------|------|--------|
| GET | `/api/v1/medical-terms/search` | TestSearchMedicalTerms | ✅ |
| GET | `/api/v1/medical-terms/:id` | TestGetTermByID | ✅ |
| POST | `/api/v1/medical-terms` | TestCreateCustomTerm | ✅ |
| GET | `/api/v1/medical-terms/category/:category` | TestGetTermsByCategory | ✅ |
| GET | `/api/v1/medical-terms/icd10/:code` | TestGetTermByICD10 | ✅ |

---

## Core Endpoints (from existing tests)

### Health (2 endpoints)

| Method | Endpoint | Test | Status |
|--------|----------|------|--------|
| GET | `/health` | TestHealthEndpoint | ✅ |
| GET | `/ready` | TestReadyEndpoint | ✅ |

### Patients (9 endpoints)

| Method | Endpoint | Test | Status |
|--------|----------|------|--------|
| GET | `/api/v1/patients` | TestPatientList | ✅ |
| GET | `/api/v1/patients?page=1&per_page=5` | TestPatientListWithPagination | ✅ |
| GET | `/api/v1/patients?search=John` | TestPatientListWithSearch | ✅ |
| GET | `/api/v1/patients?gender=male` | TestPatientListWithFilter | ✅ |
| POST | `/api/v1/patients` | TestPatientCreate | ✅ |
| GET | `/api/v1/patients/:id` | TestPatientGet | ✅ |
| PUT | `/api/v1/patients/:id` | TestPatientUpdate | ✅ |
| DELETE | `/api/v1/patients/:id` | TestPatientDelete | ✅ |
| GET | `/api/v1/patients/search` | TestPatientSearch | ✅ |
| GET | `/api/v1/patients/:id/dashboard` | TestPatientDashboard | ✅ |
| GET | `/api/v1/patients/check-duplicates` | TestCheckDuplicates | ✅ |

### Appointments (covered in appointment_test.go)

| Method | Endpoint | Test | Status |
|--------|----------|------|--------|
| GET | `/api/v1/appointments` | - | 📝 |
| POST | `/api/v1/appointments` | - | 📝 |
| GET | `/api/v1/appointments/:id` | - | 📝 |
| PUT | `/api/v1/appointments/:id` | - | 📝 |
| DELETE | `/api/v1/appointments/:id` | - | 📝 |
| POST | `/api/v1/appointments/:id/cancel` | - | 📝 |

### Exercises (covered in exercise_test.go)

| Method | Endpoint | Test | Status |
|--------|----------|------|--------|
| GET | `/api/v1/exercises` | - | 📝 |
| POST | `/api/v1/exercises` | - | 📝 |
| GET | `/api/v1/exercises/:id` | - | 📝 |
| PUT | `/api/v1/exercises/:id` | - | 📝 |
| DELETE | `/api/v1/exercises/:id` | - | 📝 |
| POST | `/api/v1/exercises/:id/prescribe` | - | 📝 |

### Checklists (covered in checklist_test.go)

| Method | Endpoint | Test | Status |
|--------|----------|------|--------|
| POST | `/api/v1/patients/:pid/visit-checklists` | - | 📝 |
| GET | `/api/v1/visit-checklists/:id` | - | 📝 |
| PATCH | `/api/v1/visit-checklists/:id/responses` | - | 📝 |
| POST | `/api/v1/visit-checklists/:id/complete` | - | 📝 |

---

## Security & Reliability Tests

| Test | Description | Status |
|------|-------------|--------|
| TestSQLInjectionPrevention | Tests malicious SQL input handling | ✅ |
| TestConcurrentInsuranceUpdates | Tests optimistic locking with 10 concurrent updates | ✅ |
| TestDatabaseTransactionRollback | Verifies transaction rollback on errors | ✅ |
| TestAuthorizationEnforcement | Tests unauthorized access handling | ✅ |
| TestRateLimitingBehavior | Tests rate limiting (429 after 100 req/min) | ⏭️ Skipped |
| TestAuditLogging | Verifies audit log entries for sensitive ops | ✅ |
| TestBilingualContentSupport | Tests Vietnamese/English content handling | ✅ |

---

## Legend

- ✅ **Tested** - Full integration test exists
- 📝 **File Exists** - Test file exists but tests not detailed in this doc
- ⏭️ **Skipped** - Test exists but skipped (feature not implemented)
- ❌ **Not Tested** - No test coverage

---

## Test Execution

Run all tests:
```bash
cd apps/api && go test -v ./tests/integration/...
```

Run specific feature tests:
```bash
# Insurance tests
go test -v ./tests/integration/... -run Insurance

# Outcome measures tests
go test -v ./tests/integration/... -run Measure

# Billing tests
go test -v ./tests/integration/... -run Billing

# Protocol tests
go test -v ./tests/integration/... -run Protocol

# Discharge tests
go test -v ./tests/integration/... -run Discharge

# Medical terms tests
go test -v ./tests/integration/... -run Term
```

Run security tests:
```bash
go test -v ./tests/integration/... -run SQL
go test -v ./tests/integration/... -run Concurrent
go test -v ./tests/integration/... -run Transaction
```

---

## Coverage Report

Generate coverage report:
```bash
cd apps/api
go test -coverprofile=coverage.out ./tests/integration/...
go tool cover -html=coverage.out -o coverage.html
```

View in browser:
```bash
open coverage.html  # macOS
xdg-open coverage.html  # Linux
```
