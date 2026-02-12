# API Endpoints Reference

This document provides detailed documentation for PhysioFlow API endpoints related to anatomy regions and outcome measures.

## Table of Contents

- [Authentication](#authentication)
- [Base URLs](#base-urls)
- [Anatomy Regions](#anatomy-regions)
  - [List Anatomy Regions](#list-anatomy-regions)
  - [Get Anatomy Region](#get-anatomy-region)
- [Outcome Measures](#outcome-measures)
  - [Record Outcome Measure](#record-outcome-measure)
  - [Get Patient Outcome Measures](#get-patient-outcome-measures)
  - [Update Outcome Measure](#update-outcome-measure)
  - [Delete Outcome Measure](#delete-outcome-measure)
  - [Calculate Progress](#calculate-progress)
  - [Get Trending Data](#get-trending-data)
  - [Get Outcome Measure Library](#get-outcome-measure-library)

## Authentication

All endpoints require JWT authentication via Keycloak. Include the Bearer token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

To obtain a token, authenticate with Keycloak:

```bash
curl -X POST 'https://keycloak.trancloud.work/realms/physioflow-dev/protocol/openid-connect/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=password' \
  -d 'username=therapist@physioflow.local' \
  -d 'password=Therapist@123' \
  -d 'client_id=physioflow-web'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI...",
  "expires_in": 3600,
  "refresh_expires_in": 1800,
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCIg...",
  "token_type": "Bearer"
}
```

## Base URLs

| Environment | URL |
|------------|-----|
| Production | `https://physioflow.trancloud.work/api` |
| Staging | `https://physioflow-staging.trancloud.work/api` |
| Development | `https://physioflow-dev.trancloud.work/api` |
| Local | `http://localhost:7011` |

---

## Anatomy Regions

Anatomy regions are used for marking pain locations on body diagrams during patient assessments.

### List Anatomy Regions

Retrieves all available anatomy regions.

**Endpoint:** `GET /api/v1/anatomy/regions`

**Authentication:** Required (any authenticated user)

**Request Parameters:** None

**Response:** `200 OK`

```json
[
  {
    "id": "shoulder_left",
    "name": "Left Shoulder",
    "name_vi": "Vai trái",
    "category": "upper_limb",
    "view": "front",
    "side": "left",
    "description": "Left glenohumeral joint and deltoid region"
  },
  {
    "id": "lumbar_spine",
    "name": "Lumbar Spine",
    "name_vi": "Cột sống thắt lưng",
    "category": "spine",
    "view": "back",
    "side": "bilateral",
    "description": "L1-L5 vertebrae"
  }
]
```

**Field Descriptions:**

| Field | Type | Description (EN) | Mô tả (VI) |
|-------|------|------------------|------------|
| `id` | string | Unique region identifier | Mã định danh vùng duy nhất |
| `name` | string | English name | Tên tiếng Anh |
| `name_vi` | string | Vietnamese name | Tên tiếng Việt |
| `category` | string | Body region category (`upper_limb`, `lower_limb`, `spine`, `trunk`, `head_neck`) | Phân loại vùng cơ thể |
| `view` | string | Anatomical view (`front`, `back`) | Góc nhìn giải phẫu |
| `side` | string | Laterality (`left`, `right`, `bilateral`) | Bên trái/phải/hai bên |
| `description` | string | Detailed description | Mô tả chi tiết |

**Error Responses:**

| Code | Error | Description |
|------|-------|-------------|
| 401 | `unauthorized` | Missing or invalid authentication token |
| 500 | `internal_error` | Internal server error |

**Example Request:**

```bash
curl -X GET 'http://localhost:7011/api/v1/anatomy/regions' \
  -H 'Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI...'
```

---

### Get Anatomy Region

Retrieves details for a specific anatomy region by ID.

**Endpoint:** `GET /api/v1/anatomy/regions/{id}`

**Authentication:** Required (any authenticated user)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Anatomy region ID (e.g., `shoulder_left`) |

**Response:** `200 OK`

```json
{
  "id": "shoulder_left",
  "name": "Left Shoulder",
  "name_vi": "Vai trái",
  "category": "upper_limb",
  "view": "front",
  "side": "left",
  "description": "Left glenohumeral joint and deltoid region"
}
```

**Error Responses:**

| Code | Error | Description |
|------|-------|-------------|
| 400 | `invalid_request` | Region ID is required |
| 401 | `unauthorized` | Missing or invalid authentication token |
| 404 | `not_found` | Anatomy region not found |
| 500 | `internal_error` | Internal server error |

**Example Request:**

```bash
curl -X GET 'http://localhost:7011/api/v1/anatomy/regions/shoulder_left' \
  -H 'Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI...'
```

---

## Outcome Measures

Outcome measures are standardized assessments used to track patient progress over time.

### Record Outcome Measure

Records a new outcome measure score for a patient.

**Endpoint:** `POST /api/v1/patients/{patientId}/outcome-measures`

**Authentication:** Required (therapist, clinic_admin, super_admin)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | UUID | Yes | Patient unique identifier |

**Request Body:**

```json
{
  "library_id": "123e4567-e89b-12d3-a456-426614174000",
  "session_id": "550e8400-e29b-41d4-a716-446655440001",
  "responses": [
    {
      "question_id": "vas_pain",
      "value": 7
    }
  ],
  "notes": "Patient reports sharp pain during movement",
  "measured_at": "2026-02-11T10:30:00Z"
}
```

**Request Body Fields:**

| Field | Type | Required | Description (EN) | Mô tả (VI) |
|-------|------|----------|------------------|------------|
| `library_id` | UUID | Yes | Reference to outcome measure library entry | Tham chiếu đến thư viện đánh giá |
| `session_id` | UUID | No | Associated treatment session ID | ID phiên điều trị liên quan |
| `responses` | array | Yes | Question responses (min 1) | Câu trả lời cho các câu hỏi |
| `responses[].question_id` | string | Yes | Question identifier | Mã định danh câu hỏi |
| `responses[].value` | number | Yes | Numeric response value | Giá trị số |
| `responses[].text_value` | string | No | Text response for open-ended questions | Câu trả lời văn bản |
| `notes` | string | No | Clinical notes (max 2000 chars) | Ghi chú lâm sàng |
| `measured_at` | ISO 8601 | No | When measured (defaults to current time) | Thời điểm đo |

**Response:** `201 Created`

```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "patient_id": "550e8400-e29b-41d4-a716-446655440000",
  "clinic_id": "123e4567-e89b-12d3-a456-426614174002",
  "therapist_id": "223e4567-e89b-12d3-a456-426614174003",
  "library_id": "123e4567-e89b-12d3-a456-426614174000",
  "measure_type": "vas",
  "session_id": "550e8400-e29b-41d4-a716-446655440001",
  "score": 7.0,
  "max_possible": 10.0,
  "percentage": 70.0,
  "responses": [
    {
      "question_id": "vas_pain",
      "value": 7
    }
  ],
  "interpretation": {
    "severity": "moderate",
    "severity_vi": "Trung bình",
    "description": "Moderate pain",
    "description_vi": "Đau mức độ trung bình"
  },
  "notes": "Patient reports sharp pain during movement",
  "measured_at": "2026-02-11T10:30:00Z",
  "created_at": "2026-02-11T10:32:15Z",
  "updated_at": "2026-02-11T10:32:15Z",
  "version": 1
}
```

**Error Responses:**

| Code | Error | Description |
|------|-------|-------------|
| 400 | `invalid_request` | Failed to parse request body |
| 401 | `unauthorized` | Missing or invalid authentication token |
| 404 | `not_found` | Outcome measure library entry not found |
| 422 | `validation_failed` | Request validation failed (see `details` field) |
| 503 | `service_unavailable` | Circuit breaker open, service temporarily unavailable |

**Example Request:**

```bash
curl -X POST 'http://localhost:7011/api/v1/patients/550e8400-e29b-41d4-a716-446655440000/outcome-measures' \
  -H 'Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI...' \
  -H 'Content-Type: application/json' \
  -d '{
    "library_id": "123e4567-e89b-12d3-a456-426614174000",
    "responses": [
      {
        "question_id": "vas_pain",
        "value": 7
      }
    ],
    "notes": "Patient reports sharp pain during movement"
  }'
```

---

### Get Patient Outcome Measures

Retrieves all outcome measure records for a patient.

**Endpoint:** `GET /api/v1/patients/{patientId}/outcome-measures`

**Authentication:** Required (therapist, clinic_admin, super_admin)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | UUID | Yes | Patient unique identifier |

**Response:** `200 OK`

```json
[
  {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "patient_id": "550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "123e4567-e89b-12d3-a456-426614174002",
    "therapist_id": "223e4567-e89b-12d3-a456-426614174003",
    "library_id": "123e4567-e89b-12d3-a456-426614174000",
    "measure_type": "vas",
    "score": 7.0,
    "max_possible": 10.0,
    "percentage": 70.0,
    "measured_at": "2026-02-11T10:30:00Z",
    "created_at": "2026-02-11T10:32:15Z",
    "updated_at": "2026-02-11T10:32:15Z",
    "version": 1
  }
]
```

**Error Responses:**

| Code | Error | Description |
|------|-------|-------------|
| 401 | `unauthorized` | Missing or invalid authentication token |
| 500 | `internal_error` | Internal server error |
| 503 | `service_unavailable` | Circuit breaker open |

**Example Request:**

```bash
curl -X GET 'http://localhost:7011/api/v1/patients/550e8400-e29b-41d4-a716-446655440000/outcome-measures' \
  -H 'Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI...'
```

---

### Update Outcome Measure

Updates an existing outcome measure record.

**Endpoint:** `PUT /api/v1/patients/{patientId}/outcome-measures/{measureId}`

**Authentication:** Required (therapist, clinic_admin, super_admin)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | UUID | Yes | Patient unique identifier |
| `measureId` | UUID | Yes | Outcome measure record ID |

**Request Body:**

```json
{
  "responses": [
    {
      "question_id": "vas_pain",
      "value": 5
    }
  ],
  "notes": "Patient reports improvement with prescribed exercises",
  "measured_at": "2026-02-11T10:30:00Z",
  "version": 1
}
```

**Request Body Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `responses` | array | No | Updated question responses |
| `notes` | string | No | Updated clinical notes (max 2000 chars) |
| `measured_at` | ISO 8601 | No | Updated measurement timestamp |
| `version` | integer | Yes | Current version (for optimistic locking) |

**Response:** `200 OK` (same structure as Record Outcome Measure)

**Error Responses:**

| Code | Error | Description |
|------|-------|-------------|
| 400 | `invalid_request` | Failed to parse request body |
| 401 | `unauthorized` | Missing or invalid authentication token |
| 404 | `not_found` | Outcome measure not found |
| 409 | `version_conflict` | Record was modified by another request (optimistic locking conflict) |
| 422 | `validation_failed` | Request validation failed |
| 503 | `service_unavailable` | Circuit breaker open |

**Example Request:**

```bash
curl -X PUT 'http://localhost:7011/api/v1/patients/550e8400-e29b-41d4-a716-446655440000/outcome-measures/7c9e6679-7425-40de-944b-e07fc1f90ae7' \
  -H 'Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI...' \
  -H 'Content-Type: application/json' \
  -d '{
    "responses": [
      {
        "question_id": "vas_pain",
        "value": 5
      }
    ],
    "notes": "Patient reports improvement with prescribed exercises",
    "version": 1
  }'
```

---

### Delete Outcome Measure

Deletes an outcome measure record.

**Endpoint:** `DELETE /api/v1/patients/{patientId}/outcome-measures/{measureId}`

**Authentication:** Required (therapist, clinic_admin, super_admin)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | UUID | Yes | Patient unique identifier |
| `measureId` | UUID | Yes | Outcome measure record ID |

**Response:** `204 No Content`

**Error Responses:**

| Code | Error | Description |
|------|-------|-------------|
| 400 | `invalid_request` | Patient ID or Measure ID is required |
| 401 | `unauthorized` | Missing or invalid authentication token |
| 404 | `not_found` | Outcome measure not found |
| 503 | `service_unavailable` | Circuit breaker open |

**Example Request:**

```bash
curl -X DELETE 'http://localhost:7011/api/v1/patients/550e8400-e29b-41d4-a716-446655440000/outcome-measures/7c9e6679-7425-40de-944b-e07fc1f90ae7' \
  -H 'Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI...'
```

---

### Calculate Progress

Calculates progress by comparing baseline to current score for a specific measure type.

**Endpoint:** `GET /api/v1/patients/{patientId}/outcome-measures/progress`

**Authentication:** Required (therapist, clinic_admin, super_admin)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | UUID | Yes | Patient unique identifier |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `measureType` | string | Yes | Measure type (e.g., `vas`, `nrs`, `ndi`, `odi`) |

**Measure Types:**

- `vas` - Visual Analog Scale (pain)
- `nrs` - Numeric Rating Scale (pain)
- `ndi` - Neck Disability Index
- `odi` - Oswestry Disability Index
- `dash` - Disabilities of the Arm, Shoulder and Hand
- `lefs` - Lower Extremity Functional Scale
- `koos` - Knee Injury and Osteoarthritis Outcome Score
- `womac` - Western Ontario and McMaster Universities Osteoarthritis Index
- `sf36` - Short Form 36 Health Survey
- `bbs` - Berg Balance Scale
- `tug` - Timed Up and Go
- `fim` - Functional Independence Measure
- `mmt` - Manual Muscle Testing
- `rom` - Range of Motion
- `custom` - Custom clinic-defined measure

**Response:** `200 OK`

```json
{
  "patient_id": "550e8400-e29b-41d4-a716-446655440000",
  "measure_type": "vas",
  "library_id": "123e4567-e89b-12d3-a456-426614174000",
  "current_score": 4.0,
  "previous_score": 7.0,
  "baseline_score": 8.0,
  "change": -4.0,
  "change_percent": -50.0,
  "meets_mcid": true,
  "trend": "improved",
  "total_measurements": 5,
  "calculated_at": "2026-02-11T10:45:00Z"
}
```

**Response Fields:**

| Field | Type | Description (EN) | Mô tả (VI) |
|-------|------|------------------|------------|
| `patient_id` | UUID | Patient identifier | Mã bệnh nhân |
| `measure_type` | string | Type of measure | Loại đánh giá |
| `library_id` | UUID | Library entry reference | Tham chiếu thư viện |
| `current_score` | number | Most recent score | Điểm hiện tại |
| `previous_score` | number | Previous score | Điểm trước đó |
| `baseline_score` | number | First recorded score | Điểm cơ sở |
| `change` | number | Absolute change from baseline | Thay đổi tuyệt đối |
| `change_percent` | number | Percentage change from baseline | Phần trăm thay đổi |
| `meets_mcid` | boolean | Meets Minimal Clinically Important Difference | Đạt MCID |
| `trend` | string | Direction: `improved`, `declined`, `stable`, `insufficient_data` | Xu hướng |
| `total_measurements` | integer | Total measurements recorded | Tổng số lần đo |
| `calculated_at` | ISO 8601 | Calculation timestamp | Thời điểm tính toán |

**Error Responses:**

| Code | Error | Description |
|------|-------|-------------|
| 400 | `invalid_request` | Missing required query parameter `measureType` |
| 401 | `unauthorized` | Missing or invalid authentication token |
| 404 | `not_found` | No measures found for this patient and type |
| 503 | `service_unavailable` | Circuit breaker open |

**Example Request:**

```bash
curl -X GET 'http://localhost:7011/api/v1/patients/550e8400-e29b-41d4-a716-446655440000/outcome-measures/progress?measureType=vas' \
  -H 'Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI...'
```

---

### Get Trending Data

Retrieves time-series data points for charting outcome measure trends.

**Endpoint:** `GET /api/v1/patients/{patientId}/outcome-measures/trending`

**Authentication:** Required (therapist, clinic_admin, super_admin)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | UUID | Yes | Patient unique identifier |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `measureType` | string | Yes | Measure type (see Calculate Progress for valid types) |

**Response:** `200 OK`

```json
{
  "patient_id": "550e8400-e29b-41d4-a716-446655440000",
  "measure_type": "vas",
  "library_id": "123e4567-e89b-12d3-a456-426614174000",
  "measure_name": "Visual Analog Scale",
  "measure_name_vi": "Thang đo thị giác tương tự",
  "data_points": [
    {
      "score": 8.0,
      "percentage": 80.0,
      "measured_at": "2026-01-15T10:00:00Z",
      "session_id": "550e8400-e29b-41d4-a716-446655440001",
      "notes": "Initial assessment"
    },
    {
      "score": 7.0,
      "percentage": 70.0,
      "measured_at": "2026-01-22T10:00:00Z",
      "session_id": "550e8400-e29b-41d4-a716-446655440002",
      "notes": "Slight improvement"
    },
    {
      "score": 4.0,
      "percentage": 40.0,
      "measured_at": "2026-02-11T10:30:00Z",
      "session_id": "550e8400-e29b-41d4-a716-446655440003",
      "notes": "Significant improvement"
    }
  ],
  "baseline": 8.0,
  "goal": 2.0,
  "mcid": 2.0,
  "trend": "improved"
}
```

**Error Responses:**

| Code | Error | Description |
|------|-------|-------------|
| 400 | `invalid_request` | Missing required query parameter `measureType` |
| 401 | `unauthorized` | Missing or invalid authentication token |
| 404 | `not_found` | No trending data found for this patient and measure type |
| 503 | `service_unavailable` | Circuit breaker open |

**Example Request:**

```bash
curl -X GET 'http://localhost:7011/api/v1/patients/550e8400-e29b-41d4-a716-446655440000/outcome-measures/trending?measureType=vas' \
  -H 'Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI...'
```

---

### Get Outcome Measure Library

Retrieves all standardized outcome measure definitions.

**Endpoint:** `GET /api/v1/outcome-measures/library`

**Authentication:** Required (any authenticated user)

**Request Parameters:** None

**Response:** `200 OK`

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "code": "VAS-001",
    "measure_type": "vas",
    "category": "pain",
    "name": "Visual Analog Scale",
    "name_vi": "Thang đo thị giác tương tự",
    "description": "Measures pain intensity on a 0-10 scale",
    "description_vi": "Đo cường độ đau trên thang điểm 0-10",
    "instructions": "Mark your pain level on the scale from 0 (no pain) to 10 (worst pain)",
    "instructions_vi": "Đánh dấu mức độ đau của bạn trên thang điểm từ 0 (không đau) đến 10 (đau nhất)",
    "min_score": 0,
    "max_score": 10,
    "higher_is_better": false,
    "mcid": 2.0,
    "mdc": 1.5,
    "body_region": null,
    "is_global": true,
    "is_active": true,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  }
]
```

**Library Entry Fields:**

| Field | Type | Description (EN) | Mô tả (VI) |
|-------|------|------------------|------------|
| `id` | UUID | Library entry identifier | Mã định danh |
| `clinic_id` | UUID | Clinic ID for custom measures (null for global) | Mã phòng khám (null nếu toàn cục) |
| `code` | string | Unique measure code | Mã đánh giá duy nhất |
| `measure_type` | string | Measure type | Loại đánh giá |
| `category` | string | Clinical category | Danh mục lâm sàng |
| `name` | string | English name | Tên tiếng Anh |
| `name_vi` | string | Vietnamese name | Tên tiếng Việt |
| `description` | string | English description | Mô tả tiếng Anh |
| `description_vi` | string | Vietnamese description | Mô tả tiếng Việt |
| `instructions` | string | Administration instructions | Hướng dẫn thực hiện |
| `instructions_vi` | string | Vietnamese instructions | Hướng dẫn tiếng Việt |
| `min_score` | number | Minimum possible score | Điểm tối thiểu |
| `max_score` | number | Maximum possible score | Điểm tối đa |
| `higher_is_better` | boolean | Whether higher scores indicate improvement | Điểm cao hơn tốt hơn |
| `mcid` | number | Minimal Clinically Important Difference | Sự khác biệt lâm sàng quan trọng tối thiểu |
| `mdc` | number | Minimal Detectable Change | Thay đổi có thể phát hiện tối thiểu |
| `body_region` | string | Specific body region if applicable | Vùng cơ thể cụ thể |
| `is_global` | boolean | Global (built-in) measure | Đánh giá toàn cục |
| `is_active` | boolean | Currently active | Đang hoạt động |

**Error Responses:**

| Code | Error | Description |
|------|-------|-------------|
| 401 | `unauthorized` | Missing or invalid authentication token |
| 500 | `internal_error` | Internal server error |
| 503 | `service_unavailable` | Circuit breaker open |

**Example Request:**

```bash
curl -X GET 'http://localhost:7011/api/v1/outcome-measures/library' \
  -H 'Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI...'
```

---

## Rate Limiting

Some endpoints may be rate-limited. When rate limits are applied, you'll see these headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
```

If you exceed the rate limit, you'll receive a `429 Too Many Requests` response:

```json
{
  "error": "rate_limit_exceeded",
  "message": "Rate limit exceeded. Maximum 100 requests per 1m."
}
```

The response will include a `Retry-After` header indicating seconds to wait before retrying.

---

## Error Response Format

All error responses follow this standard format:

```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {
    "field_name": "Validation error for this field"
  }
}
```

The `details` field is optional and only present for validation errors (422 responses).
