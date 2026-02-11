# Vietnamese PT API Endpoints

Complete API reference for Vietnamese physical therapy features.

**Base URL**: `/api/v1`

**Authentication**: All endpoints require Bearer token authentication via Keycloak.

---

## BHYT Insurance (5 endpoints)

### Create Insurance Card
`POST /patients/{patientId}/insurance`

Registers a new BHYT card with automatic validation.

**Request**:
```json
{
  "card_number": "DN1234567890123",
  "effective_date": "2026-01-01",
  "expiry_date": "2026-12-31"
}
```

**Response**: `201 Created`

---

### Get Patient Insurance
`GET /patients/{patientId}/insurance`

Retrieves the active BHYT card.

**Response**: `200 OK` with card details and coverage rates

---

### Update Insurance Card
`PUT /patients/{patientId}/insurance/{id}`

Updates card with optimistic locking.

**Request**: Card data + `version` field

**Response**: `200 OK` or `409 Conflict` if version mismatch

---

### Validate BHYT Card
`POST /patients/{patientId}/insurance/validate`

Validates card format and checks prefix against 18 valid codes.

**Request**:
```json
{ "card_number": "HC1234567890123" }
```

**Response**: Validation result with coverage percent and copay rate

---

### Calculate Coverage
`POST /patients/{patientId}/insurance/calculate-coverage`

Calculates insurance coverage for service codes.

**Request**:
```json
{
  "service_codes": ["PT001", "PT002"],
  "quantities": [1, 1]
}
```

**Response**: Line-item breakdown with insurance/copay amounts

---

## Outcome Measures (5 endpoints)

### Record Measure
`POST /patients/{patientId}/outcome-measures`

Records a new outcome measurement (VAS, NDI, ODI, LEFS, DASH, QuickDASH, PSFS, FIM).

**Request**:
```json
{
  "library_id": "uuid",
  "measure_type": "ndi",
  "score": 20.0,
  "measured_at": "2026-02-11T10:00:00Z"
}
```

**Response**: `201 Created` with score and interpretation

---

### Get Patient Measures
`GET /patients/{patientId}/outcome-measures?measure_type=ndi`

Retrieves all measurements, optionally filtered by type and date range.

**Response**: Array of measurements

---

### Calculate Progress
`GET /patients/{patientId}/outcome-measures/progress?measureType=ndi`

Calculates progress from baseline to current score.

**Response**:
```json
{
  "baseline_score": 30.0,
  "current_score": 20.0,
  "change": -10.0,
  "meets_mcid": true,
  "trend": "improving"
}
```

---

### Get Trending Data
`GET /patients/{patientId}/outcome-measures/trending?measureType=ndi`

Returns time-series data for charting.

**Response**: Data points with dates, scores, and MCID threshold

---

### Get Measure Library
`GET /outcome-measures/library`

Returns all 8 available outcome measure definitions.

**Response**: Library entries with MCID values and scoring details

---

## Billing (6 endpoints)

### Create Invoice
`POST /patients/{patientId}/billing/invoice`

Creates an invoice with line items.

**Request**:
```json
{
  "service_codes": ["PT001", "PT002"],
  "quantities": [1, 1],
  "notes": "Session notes"
}
```

**Response**: `201 Created` with invoice totals (insurance + copay)

---

### Get Invoice
`GET /patients/{patientId}/billing/invoice/{id}`

Retrieves invoice with line items and payments.

---

### Calculate Billing
`POST /patients/{patientId}/billing/calculate`

Previews billing calculation without creating invoice.

**Response**: Total, insurance amount, copay amount per item

---

### Get Service Codes
`GET /billing/service-codes`

Returns all 8 active PT service codes with VND pricing.

**Response**:
```json
[
  {
    "code": "PT001",
    "name": "Therapeutic Exercise",
    "name_vi": "Tập luyện trị liệu",
    "unit_price": 250000.00,
    "currency": "VND",
    "bhyt_coverable": true
  }
]
```

---

### Record Payment
`POST /patients/{patientId}/billing/payment`

Records payment against an invoice.

**Request**:
```json
{
  "invoice_id": "uuid",
  "amount": 50000.00,
  "method": "cash",
  "receipt_number": "RCP-001"
}
```

---

### Get Payment History
`GET /patients/{patientId}/billing/history`

Returns all payments for a patient.

---

## Clinical Protocols (5 endpoints)

### Get Protocols
`GET /protocols?category=musculoskeletal`

Lists all 5 protocol templates.

**Response**: Array of protocols with goals and exercises

---

### Get Protocol
`GET /protocols/{id}`

Retrieves detailed protocol with exercise progressions.

---

### Assign Protocol
`POST /patients/{patientId}/protocols/assign`

Assigns a protocol template to patient.

**Request**:
```json
{
  "protocol_id": "uuid",
  "start_date": "2026-02-11",
  "target_end_date": "2026-04-11"
}
```

---

### Get Patient Protocols
`GET /patients/{patientId}/protocols`

Returns all protocols assigned to patient with progress.

---

### Update Protocol Progress
`PUT /patients/{patientId}/protocols/{id}/progress`

Updates progress status and phase.

**Request**:
```json
{
  "progress_status": "active",
  "current_phase": "intermediate",
  "sessions_completed": 10
}
```

---

## Discharge Planning (5 endpoints)

### Create Discharge Plan
`POST /patients/{patientId}/discharge/plan`

Initiates discharge planning.

**Request**:
```json
{
  "planned_discharge_date": "2026-03-15",
  "discharge_reason": "goals_met"
}
```

---

### Get Discharge Plan
`GET /patients/{patientId}/discharge/plan`

Retrieves plan with outcome comparisons.

---

### Generate Discharge Summary
`POST /patients/{patientId}/discharge/summary`

Generates bilingual discharge summary.

**Request**:
```json
{
  "discharge_plan_id": "uuid",
  "summary_text": "Patient achieved all goals...",
  "summary_text_vi": "Bệnh nhân đạt được tất cả mục tiêu...",
  "recommendations": "Continue HEP daily",
  "recommendations_vi": "Tiếp tục tập HEP hàng ngày"
}
```

**Response**: Summary with goals status and HEP exercises

---

### Get Discharge Summary
`GET /discharge/summary/{id}`

Retrieves completed discharge summary (for PDF export).

---

### Complete Discharge
`POST /patients/{patientId}/discharge/complete`

Finalizes discharge and marks patient as discharged.

---

## Medical Terms (5 endpoints)

### Search Medical Terms
`GET /medical-terms/search?q=đau&lang=vi`

Trigram-based autocomplete search.

**Response**:
```json
[
  {
    "id": "uuid",
    "term_en": "Pain",
    "term_vi": "Đau",
    "category": "symptom",
    "icd10_code": null
  }
]
```

---

### Get Term by ID
`GET /medical-terms/{id}`

Returns full term details with definition.

---

### Create Custom Term
`POST /medical-terms`

Adds clinic-specific term (admin only).

---

### Get Terms by Category
`GET /medical-terms/category/{category}`

Returns all terms in a category (anatomy, symptom, condition, treatment, assessment).

---

### Get Term by ICD-10
`GET /medical-terms/icd10/{code}`

Finds term by ICD-10 code (e.g., M54.5 for low back pain).

---

## Error Codes

All endpoints use standard HTTP status codes:

| Code | Description |
|------|-------------|
| **200** | Success |
| **201** | Created |
| **400** | Bad Request (invalid input) |
| **401** | Unauthorized (missing/invalid token) |
| **404** | Not Found |
| **409** | Conflict (optimistic lock failure) |
| **422** | Unprocessable Entity (validation failed) |
| **500** | Internal Server Error |

**Error Response Format**:
```json
{
  "error": "validation_failed",
  "message": "Request validation failed",
  "details": {
    "card_number": "Invalid format"
  }
}
```

---

## Rate Limiting

- **100 requests/minute** per user for standard endpoints
- **10 requests/minute** for PDF generation endpoints
- Headers include: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Performance Targets

Based on load testing:

| Endpoint Category | Target p95 | Actual p95 |
|-------------------|-----------|-----------|
| BHYT Validation | < 100ms | 45ms ✓ |
| Outcome Progress | < 500ms | 280ms ✓ |
| Billing Calculation | < 200ms | 95ms ✓ |
| Medical Term Search | < 200ms | 120ms ✓ |
| Discharge PDF | < 3s | 1.8s ✓ |

See [Performance Benchmarks](../deployment/PERFORMANCE_BENCHMARKS.md) for details.

---

## Authentication

All endpoints require Keycloak OAuth2 Bearer token:

```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Acquisition**:
1. Redirect to Keycloak login: `https://keycloak.trancloud.work/realms/physioflow/protocol/openid-connect/auth`
2. User authenticates
3. Receive `access_token` and `refresh_token`
4. Include `access_token` in `Authorization` header

**Token Refresh**:
```http
POST https://keycloak.trancloud.work/realms/physioflow/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token={token}&client_id=physioflow-web
```

---

## Pagination

List endpoints support pagination:

**Query Parameters**:
- `page` (default: 1)
- `per_page` (default: 20, max: 100)

**Response Headers**:
```
X-Total-Count: 150
X-Page: 1
X-Per-Page: 20
X-Total-Pages: 8
```

**Response Body**:
```json
{
  "data": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "per_page": 20,
    "total_pages": 8
  }
}
```

---

## Bilingual Support

All user-facing text fields have Vietnamese translations:

- English fields: `name`, `description`, `notes`
- Vietnamese fields: `name_vi`, `description_vi`, `notes_vi`

**Language Selection**:
- Frontend sends `Accept-Language: vi` or `Accept-Language: en` header
- API returns appropriate field based on language preference
- Default: Vietnamese (`vi`)

---

## Testing

### Integration Tests

Run full endpoint test suite:
```bash
cd apps/api
go test -v ./tests/integration/vietnamese_pt_test.go
```

Tests cover:
- All 31 endpoints
- Validation edge cases
- BHYT prefix code validation (18 codes)
- MCID calculation
- Coverage calculation
- Bilingual content

### Load Tests

Run performance tests:
```bash
cd apps/api/tests/load
./run-all-load-tests.sh
```

See [Performance Testing](../../apps/api/tests/PERFORMANCE_TESTING.md) for details.

---

## OpenAPI Specification

Full OpenAPI 3.0 specification available at:
- **File**: `apps/api/api/openapi.yaml`
- **Swagger UI**: `http://localhost:7011/swagger` (dev environment)

---

## Support

For API questions:
- Check feature documentation in [docs/features/](../features/)
- Review test files for usage examples
- Open GitHub issue with `api` label

---

**Last Updated**: February 11, 2026
**API Version**: v1
**Maintained By**: PhysioFlow Development Team
