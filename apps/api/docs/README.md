# PhysioFlow API Documentation

Comprehensive API documentation for the PhysioFlow Physical Therapy EHR system.

## Documentation Overview

This directory contains complete API documentation covering authentication, endpoints, error handling, and OpenAPI specifications.

### Available Documentation

| Document | Description |
|----------|-------------|
| [openapi.yaml](./openapi.yaml) | **OpenAPI 3.0 Specification** - Machine-readable API specification for anatomy regions and outcome measures endpoints |
| [API_ENDPOINTS.md](./API_ENDPOINTS.md) | **Endpoint Reference** - Detailed documentation for each endpoint with examples |
| [AUTHENTICATION.md](./AUTHENTICATION.md) | **Authentication Guide** - Keycloak integration, JWT tokens, and RBAC |
| [ERROR_HANDLING.md](./ERROR_HANDLING.md) | **Error Handling** - Error formats, status codes, circuit breakers, and retry strategies |

---

## Quick Start

### 1. Authenticate with Keycloak

Obtain a JWT token (development/testing only):

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
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCIg...",
  "token_type": "Bearer"
}
```

### 2. Make API Requests

Use the access token in the `Authorization` header:

```bash
curl -X GET 'http://localhost:7011/api/v1/anatomy/regions' \
  -H 'Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI...'
```

### 3. Handle Errors

Check HTTP status codes and parse error responses:

```javascript
const response = await fetch(url, {
  headers: { 'Authorization': `Bearer ${token}` }
});

if (!response.ok) {
  const error = await response.json();
  console.error(`Error ${response.status}: ${error.message}`);
}
```

---

## API Base URLs

| Environment | URL |
|-------------|-----|
| Production | `https://physioflow.trancloud.work/api` |
| Staging | `https://physioflow-staging.trancloud.work/api` |
| Development | `https://physioflow-dev.trancloud.work/api` |
| Local | `http://localhost:7011` |

---

## Documented Endpoints

### Anatomy Regions

Anatomy regions for marking pain locations on body diagrams.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/anatomy/regions` | List all anatomy regions |
| GET | `/api/v1/anatomy/regions/{id}` | Get specific region details |

**Example Response:**
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

### Outcome Measures

Standardized assessments for tracking patient progress.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/patients/{patientId}/outcome-measures` | Record new outcome measure |
| GET | `/api/v1/patients/{patientId}/outcome-measures` | Get patient's outcome measures |
| PUT | `/api/v1/patients/{patientId}/outcome-measures/{measureId}` | Update outcome measure |
| DELETE | `/api/v1/patients/{patientId}/outcome-measures/{measureId}` | Delete outcome measure |
| GET | `/api/v1/patients/{patientId}/outcome-measures/progress` | Calculate progress |
| GET | `/api/v1/patients/{patientId}/outcome-measures/trending` | Get trending data |
| GET | `/api/v1/outcome-measures/library` | Get measure library |

**Example: Record VAS Score:**
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

## Authentication

All endpoints require JWT authentication via Keycloak.

### Roles

| Role | Permissions |
|------|-------------|
| `super_admin` | Full access across all clinics |
| `clinic_admin` | Manage clinic and all clinical data |
| `therapist` | Full clinical access (patients, assessments, treatments) |
| `assistant` | Limited clinical access (view, basic recording) |
| `front_desk` | Administrative (appointments, billing) |
| `patient` | Self-access only |

### Token Refresh

Access tokens expire after 1 hour. Refresh using the refresh token:

```bash
curl -X POST 'https://keycloak.trancloud.work/realms/physioflow-dev/protocol/openid-connect/token' \
  -d 'grant_type=refresh_token' \
  -d 'refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCIg...' \
  -d 'client_id=physioflow-web'
```

---

## Error Handling

### Standard Error Format

```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {
    "field_name": "Validation error"
  }
}
```

### Common Errors

| Status | Error Code | Description | Retry? |
|--------|------------|-------------|--------|
| 400 | `invalid_request` | Malformed request | No |
| 401 | `unauthorized` | Invalid/expired token | Yes (re-auth) |
| 403 | `forbidden` | Insufficient permissions | No |
| 404 | `not_found` | Resource not found | No |
| 409 | `version_conflict` | Optimistic locking conflict | Yes (reload) |
| 422 | `validation_failed` | Field validation failed | No (fix errors) |
| 429 | `rate_limit_exceeded` | Rate limit exceeded | Yes (wait) |
| 500 | `internal_error` | Server error | Yes (backoff) |
| 503 | `service_unavailable` | Circuit breaker open | Yes (wait) |

### Retry Strategy

**✅ Retry these errors:**
- 401 (after re-authentication)
- 409 (after reloading resource)
- 429 (after waiting)
- 500, 503 (with exponential backoff)

**❌ Don't retry:**
- 400, 403, 404, 422 (client errors)

---

## Using the OpenAPI Specification

### Swagger UI

View interactive API documentation:

```bash
# Install Swagger UI
npm install -g swagger-ui-express

# Serve OpenAPI spec
npx swagger-ui-dist
```

Then navigate to the Swagger UI and load `openapi.yaml`.

### Code Generation

Generate API client libraries:

```bash
# Install OpenAPI Generator
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript client
openapi-generator-cli generate \
  -i apps/api/docs/openapi.yaml \
  -g typescript-fetch \
  -o clients/typescript-api

# Generate Go client
openapi-generator-cli generate \
  -i apps/api/docs/openapi.yaml \
  -g go \
  -o clients/go-api
```

### Validation

Validate the OpenAPI specification:

```bash
# Install validator
npm install -g @apidevtools/swagger-cli

# Validate spec
swagger-cli validate apps/api/docs/openapi.yaml
```

---

## Testing

### Test Users (Local/Development)

See [CLAUDE.md](../../../CLAUDE.md) for complete list of test users.

**Example:**
- Username: `therapist@physioflow.local`
- Password: `Therapist@123`
- Role: `therapist`

### Example Requests

**1. List Anatomy Regions:**
```bash
curl -X GET 'http://localhost:7011/api/v1/anatomy/regions' \
  -H 'Authorization: Bearer <token>'
```

**2. Get Outcome Measure Library:**
```bash
curl -X GET 'http://localhost:7011/api/v1/outcome-measures/library' \
  -H 'Authorization: Bearer <token>'
```

**3. Record VAS Pain Score:**
```bash
curl -X POST 'http://localhost:7011/api/v1/patients/<patient-id>/outcome-measures' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "library_id": "<library-id>",
    "responses": [{"question_id": "vas_pain", "value": 7}],
    "notes": "Patient reports pain during movement"
  }'
```

**4. Calculate Progress:**
```bash
curl -X GET 'http://localhost:7011/api/v1/patients/<patient-id>/outcome-measures/progress?measureType=vas' \
  -H 'Authorization: Bearer <token>'
```

---

## Rate Limiting

Check rate limit headers in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
```

When rate limited (429):
```
Retry-After: 42
```

---

## Circuit Breakers

When the database or downstream services are unavailable, the API returns `503 Service Unavailable`:

```json
{
  "error": "service_unavailable",
  "message": "The service is temporarily unavailable. Please try again shortly."
}
```

**Client Strategy:**
1. Wait 5-30 seconds
2. Retry with exponential backoff
3. Show user-friendly "temporarily unavailable" message

---

## Bilingual Support

PhysioFlow supports Vietnamese and English. Many fields include both:

- `name` (English) / `name_vi` (Vietnamese)
- `description` / `description_vi`
- `instructions` / `instructions_vi`
- `severity` / `severity_vi`

**Example:**
```json
{
  "name": "Left Shoulder",
  "name_vi": "Vai trái",
  "category": "upper_limb"
}
```

---

## Support

For questions or issues:

- **Technical Issues:** Check error handling guide and retry strategies
- **Authentication Problems:** Review authentication guide
- **API Questions:** Refer to endpoint reference documentation
- **Integration Help:** Use OpenAPI spec for code generation

---

## Contributing to Documentation

When adding new endpoints:

1. Update `openapi.yaml` with new paths and schemas
2. Document the endpoint in `API_ENDPOINTS.md`
3. Add any new error codes to `ERROR_HANDLING.md`
4. Update authentication requirements in `AUTHENTICATION.md` if needed
5. Validate OpenAPI spec: `swagger-cli validate apps/api/docs/openapi.yaml`

---

## Related Documentation

- [CLAUDE.md](../../../CLAUDE.md) - Project overview and development guide
- [Main README](../../../README.md) - Repository root documentation
- [Infrastructure Docs](../../../infrastructure/) - Deployment and infrastructure

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-11 | Initial documentation for anatomy regions and outcome measures endpoints |

---

**Last Updated:** 2026-02-11
