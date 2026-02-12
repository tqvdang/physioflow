# Error Handling Guide

This document describes the error handling approach used in PhysioFlow API, including standard error formats, HTTP status codes, circuit breaker behavior, and retry guidance.

## Table of Contents

- [Standard Error Response Format](#standard-error-response-format)
- [HTTP Status Codes](#http-status-codes)
- [Error Code Reference](#error-code-reference)
- [Circuit Breaker Behavior](#circuit-breaker-behavior)
- [Retry Guidance](#retry-guidance)
- [Version Conflict Handling](#version-conflict-handling)
- [Rate Limiting](#rate-limiting)
- [Best Practices for Clients](#best-practices-for-clients)

---

## Standard Error Response Format

All API errors return a consistent JSON structure:

```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {
    "field_name": "Field-specific error message"
  }
}
```

**Fields:**

- **`error`** (string, required): Machine-readable error code for programmatic handling
- **`message`** (string, required): Human-readable error description
- **`details`** (object, optional): Additional context, typically field-level validation errors

**Example - Simple Error:**

```json
{
  "error": "not_found",
  "message": "Outcome measure not found"
}
```

**Example - Validation Error:**

```json
{
  "error": "validation_failed",
  "message": "Request validation failed",
  "details": {
    "responses": "field is required",
    "library_id": "must be a valid UUID"
  }
}
```

---

## HTTP Status Codes

PhysioFlow API uses standard HTTP status codes to indicate request outcomes:

### Success Codes

| Code | Status | When Used |
|------|--------|-----------|
| 200 | OK | Successful GET, PUT request |
| 201 | Created | Successful POST request creating a resource |
| 204 | No Content | Successful DELETE request |

### Client Error Codes (4xx)

| Code | Status | When Used | Retry? |
|------|--------|-----------|--------|
| 400 | Bad Request | Malformed request, missing required parameters | No |
| 401 | Unauthorized | Missing, invalid, or expired authentication token | Yes (after re-authenticating) |
| 403 | Forbidden | Insufficient permissions for the operation | No |
| 404 | Not Found | Resource does not exist | No |
| 409 | Conflict | Version conflict (optimistic locking) | Yes (after reloading) |
| 422 | Unprocessable Entity | Request validation failed | No (fix validation errors) |
| 429 | Too Many Requests | Rate limit exceeded | Yes (after waiting) |

### Server Error Codes (5xx)

| Code | Status | When Used | Retry? |
|------|--------|-----------|--------|
| 500 | Internal Server Error | Unexpected server error | Yes (with exponential backoff) |
| 503 | Service Unavailable | Circuit breaker open, database unavailable | Yes (after delay) |

---

## Error Code Reference

### Authentication & Authorization Errors

#### `unauthorized`
**HTTP Status:** 401

**Causes:**
- Missing `Authorization` header
- Invalid Bearer token format
- Expired JWT token
- Token signature verification failed
- Invalid token issuer

**Example:**
```json
{
  "error": "unauthorized",
  "message": "Invalid or expired token",
  "details": "token has expired"
}
```

**Resolution:**
1. Check that `Authorization` header is present
2. Verify Bearer token format: `Authorization: Bearer <token>`
3. Obtain a fresh token from Keycloak if expired
4. Ensure token is from the correct Keycloak realm

---

#### `forbidden`
**HTTP Status:** 403

**Causes:**
- User lacks required role for the operation
- Accessing resources outside user's tenant/clinic

**Example:**
```json
{
  "error": "forbidden",
  "message": "Insufficient permissions"
}
```

**Resolution:**
- Verify user has the required role (e.g., therapist, clinic_admin)
- Check that user is accessing resources within their clinic

---

### Request Errors

#### `invalid_request`
**HTTP Status:** 400

**Causes:**
- Malformed JSON body
- Missing required path or query parameters
- Invalid parameter types

**Example:**
```json
{
  "error": "invalid_request",
  "message": "Patient ID is required"
}
```

**Resolution:**
- Validate request structure matches API specification
- Ensure all required parameters are provided
- Check that UUIDs are properly formatted

---

#### `validation_failed`
**HTTP Status:** 422

**Causes:**
- Field-level validation errors
- Invalid enum values
- Value constraints violated (min/max length, range)

**Example:**
```json
{
  "error": "validation_failed",
  "message": "Request validation failed",
  "details": {
    "responses": "field is required",
    "library_id": "must be a valid UUID",
    "notes": "maximum length is 2000 characters"
  }
}
```

**Resolution:**
- Review the `details` object for specific field errors
- Correct invalid fields and resubmit

---

#### `not_found`
**HTTP Status:** 404

**Causes:**
- Requested resource does not exist
- Invalid UUID provided
- Resource was deleted

**Example:**
```json
{
  "error": "not_found",
  "message": "Outcome measure not found"
}
```

**Resolution:**
- Verify the resource ID is correct
- Check that the resource exists before attempting operations
- Handle deletions gracefully in client code

---

### Conflict Errors

#### `version_conflict`
**HTTP Status:** 409

**Causes:**
- Optimistic locking conflict - record was modified by another request
- Version number in update request doesn't match current database version

**Example:**
```json
{
  "error": "version_conflict",
  "message": "This record was modified by another request. Please reload and try again."
}
```

**Resolution:**
1. Reload the resource to get the latest version
2. Re-apply your changes to the fresh copy
3. Submit update with the new version number

**Optimistic Locking Workflow:**
```javascript
// Step 1: Get current record
const measure = await fetch('/api/v1/patients/{id}/outcome-measures/{measureId}');
const currentVersion = measure.version; // e.g., version: 3

// Step 2: Update with current version
const updateResponse = await fetch('/api/v1/patients/{id}/outcome-measures/{measureId}', {
  method: 'PUT',
  body: JSON.stringify({
    notes: 'Updated notes',
    version: currentVersion  // Must match database version
  })
});

// Step 3: Handle conflict
if (updateResponse.status === 409) {
  // Reload and retry with fresh version
  const freshMeasure = await fetch('/api/v1/patients/{id}/outcome-measures/{measureId}');
  // Re-apply changes...
}
```

---

### Rate Limiting Errors

#### `rate_limit_exceeded`
**HTTP Status:** 429

**Causes:**
- Too many requests from the same user/IP within the time window
- Specific endpoint rate limits exceeded

**Example:**
```json
{
  "error": "rate_limit_exceeded",
  "message": "Rate limit exceeded. Maximum 100 requests per 1m."
}
```

**Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
Retry-After: 42
```

**Resolution:**
- Wait for the duration specified in `Retry-After` header (seconds)
- Implement request throttling in client code
- Use exponential backoff for retries

---

### Server Errors

#### `internal_error`
**HTTP Status:** 500

**Causes:**
- Unexpected server-side exception
- Database query errors (outside circuit breaker scope)
- Programming errors

**Example:**
```json
{
  "error": "internal_error",
  "message": "Failed to record outcome measure"
}
```

**Resolution:**
- Retry with exponential backoff
- Contact support if error persists
- Check server logs for detailed error information

---

#### `service_unavailable`
**HTTP Status:** 503

**Causes:**
- Circuit breaker is open (protecting downstream services)
- Database connection unavailable
- Service in maintenance mode

**Example:**
```json
{
  "error": "service_unavailable",
  "message": "The service is temporarily unavailable. Please try again shortly."
}
```

**Resolution:**
- Wait before retrying (recommended: 5-30 seconds)
- Implement exponential backoff
- Display user-friendly message indicating temporary unavailability

---

## Circuit Breaker Behavior

PhysioFlow API uses circuit breakers to protect against cascading failures when downstream services (e.g., PostgreSQL database) become unavailable.

### Circuit Breaker States

**Closed (Normal Operation)**
- All requests proceed normally
- Failures are counted

**Open (Protecting Service)**
- Requests fail immediately with `503 Service Unavailable`
- No calls are made to the failing service
- Response: `{"error": "service_unavailable", "message": "The service is temporarily unavailable. Please try again shortly."}`

**Half-Open (Testing Recovery)**
- Limited requests are allowed through to test service recovery
- If successful, circuit transitions to Closed
- If failed, circuit returns to Open

### Circuit Breaker Triggers

The circuit opens when:
- **Failure threshold exceeded** (e.g., 5 consecutive failures)
- **Failure rate exceeded** (e.g., >50% failures in last 10 requests)
- **Database connection unavailable**

### Recovery

After the circuit opens:
1. **Cool-down period** (typically 30-60 seconds)
2. **Half-open state** - Test requests to verify service recovery
3. **Closed state** - Normal operation resumes if tests succeed

### Client Handling

When you receive a `503` due to circuit breaker:

```javascript
async function callApiWithCircuitBreakerHandling(url) {
  try {
    const response = await fetch(url);

    if (response.status === 503) {
      const error = await response.json();
      if (error.error === 'service_unavailable') {
        // Circuit breaker is open
        console.log('Service temporarily unavailable, retrying after delay...');
        await sleep(5000); // Wait 5 seconds
        return retry(url); // Implement retry logic
      }
    }

    return response.json();
  } catch (err) {
    console.error('Request failed:', err);
  }
}
```

---

## Retry Guidance

Not all errors should be retried. Follow this guidance:

### ✅ Retry These Errors

| Status | Error Code | Retry Strategy |
|--------|------------|----------------|
| 401 | `unauthorized` | Re-authenticate, then retry once |
| 409 | `version_conflict` | Reload resource, re-apply changes, retry |
| 429 | `rate_limit_exceeded` | Wait for `Retry-After` seconds, then retry |
| 500 | `internal_error` | Exponential backoff (1s, 2s, 4s, 8s) |
| 503 | `service_unavailable` | Exponential backoff (5s, 10s, 20s) |

### ❌ Do Not Retry These Errors

| Status | Error Code | Reason |
|--------|------------|--------|
| 400 | `invalid_request` | Request is malformed, will fail again |
| 403 | `forbidden` | User lacks permissions, retry won't help |
| 404 | `not_found` | Resource doesn't exist |
| 422 | `validation_failed` | Request data is invalid |

### Exponential Backoff Example

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Success
      if (response.ok) {
        return response.json();
      }

      // Don't retry client errors (except 401, 409, 429)
      if (response.status >= 400 && response.status < 500) {
        if (![401, 409, 429].includes(response.status)) {
          throw new Error(`Client error: ${response.status}`);
        }
      }

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        console.log(`Rate limited, waiting ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        continue;
      }

      // Handle version conflicts
      if (response.status === 409) {
        // Reload and retry (implement reload logic)
        console.log('Version conflict, reloading resource...');
        // ... reload logic ...
        continue;
      }

      // Server error - exponential backoff
      if (response.status >= 500) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s, 8s
        console.log(`Server error, retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      if (attempt === maxRetries - 1) {
        throw error; // Final attempt failed
      }
      const delay = Math.pow(2, attempt) * 1000;
      await sleep(delay);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## Version Conflict Handling

PhysioFlow uses **optimistic locking** to prevent concurrent update conflicts. Every update request must include the current `version` number.

### How It Works

1. **Read**: Client fetches resource with current version
2. **Modify**: Client makes changes locally
3. **Write**: Client sends update with version number
4. **Verify**: Server checks if version matches database
   - **Match**: Update succeeds, version incremented
   - **Mismatch**: `409 Conflict` returned

### Example Flow

**Successful Update:**
```
GET /outcome-measures/123
← { id: 123, score: 7, version: 1 }

PUT /outcome-measures/123
→ { score: 5, version: 1 }
← { id: 123, score: 5, version: 2 }  ✅ Success
```

**Conflict:**
```
GET /outcome-measures/123
← { id: 123, score: 7, version: 1 }

[Another user updates the record to version 2]

PUT /outcome-measures/123
→ { score: 5, version: 1 }
← 409 Conflict  ❌ Version mismatch
```

### Handling Conflicts

**Option 1: Reload and Retry**
```javascript
async function updateWithConflictHandling(id, changes) {
  let retries = 3;

  while (retries > 0) {
    // Get latest version
    const current = await fetchResource(id);

    // Apply changes
    const updated = { ...current, ...changes, version: current.version };

    try {
      return await updateResource(id, updated);
    } catch (error) {
      if (error.status === 409 && retries > 0) {
        retries--;
        console.log('Conflict detected, retrying...');
        continue;
      }
      throw error;
    }
  }

  throw new Error('Max retries exceeded');
}
```

**Option 2: User Resolution**
```javascript
async function updateWithUserResolution(id, changes) {
  const current = await fetchResource(id);
  const updated = { ...current, ...changes, version: current.version };

  try {
    return await updateResource(id, updated);
  } catch (error) {
    if (error.status === 409) {
      // Show conflict dialog to user
      const freshData = await fetchResource(id);
      showConflictDialog({
        yourChanges: changes,
        currentData: freshData,
        onResolve: (resolved) => updateResource(id, { ...resolved, version: freshData.version })
      });
    }
    throw error;
  }
}
```

---

## Rate Limiting

### Response Headers

Every response includes rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
```

When rate limit is exceeded:
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
Retry-After: 42

{
  "error": "rate_limit_exceeded",
  "message": "Rate limit exceeded. Maximum 100 requests per 1m."
}
```

### Handling Rate Limits

**Proactive Approach:**
```javascript
class ApiClient {
  constructor() {
    this.rateLimitRemaining = Infinity;
    this.rateLimitReset = null;
  }

  async request(url, options) {
    // Check if we're rate limited
    if (this.rateLimitRemaining === 0 && this.rateLimitReset > Date.now()) {
      const waitTime = this.rateLimitReset - Date.now();
      console.log(`Rate limited, waiting ${waitTime}ms...`);
      await sleep(waitTime);
    }

    const response = await fetch(url, options);

    // Update rate limit info
    this.rateLimitRemaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '999');

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
      this.rateLimitReset = Date.now() + (retryAfter * 1000);
      await sleep(retryAfter * 1000);
      return this.request(url, options); // Retry
    }

    return response;
  }
}
```

---

## Best Practices for Clients

### 1. Always Check HTTP Status Code

```javascript
const response = await fetch(url);
if (!response.ok) {
  const error = await response.json();
  throw new ApiError(response.status, error.error, error.message);
}
```

### 2. Parse Error Responses

```javascript
class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  isRetryable() {
    return [401, 409, 429, 500, 503].includes(this.status);
  }

  isClientError() {
    return this.status >= 400 && this.status < 500;
  }
}
```

### 3. Implement Retry Logic

Use exponential backoff for transient failures (500, 503):

```javascript
async function callWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (!error.isRetryable() || i === maxRetries - 1) {
        throw error;
      }
      const delay = Math.pow(2, i) * 1000;
      await sleep(delay);
    }
  }
}
```

### 4. Handle Version Conflicts Gracefully

Always reload before retrying after 409:

```javascript
async function updateOutcomeMeasure(id, changes) {
  try {
    return await api.put(`/outcome-measures/${id}`, changes);
  } catch (error) {
    if (error.status === 409) {
      // Reload, merge changes, retry
      const fresh = await api.get(`/outcome-measures/${id}`);
      return await api.put(`/outcome-measures/${id}`, {
        ...changes,
        version: fresh.version
      });
    }
    throw error;
  }
}
```

### 5. Monitor Rate Limits

Track `X-RateLimit-Remaining` and adjust request patterns:

```javascript
if (rateLimitRemaining < 10) {
  // Slow down requests
  await sleep(1000);
}
```

### 6. Display User-Friendly Messages

Map error codes to user-friendly messages:

```javascript
const ERROR_MESSAGES = {
  unauthorized: 'Your session has expired. Please log in again.',
  forbidden: 'You do not have permission to perform this action.',
  not_found: 'The requested item could not be found.',
  validation_failed: 'Please correct the errors and try again.',
  version_conflict: 'This record was updated by another user. Your changes have been reloaded.',
  rate_limit_exceeded: 'Too many requests. Please wait a moment and try again.',
  service_unavailable: 'The service is temporarily unavailable. Please try again in a few moments.',
  internal_error: 'An unexpected error occurred. Please try again.'
};
```

---

## Summary

- **Use standard error format**: All errors return `{ error, message, details }`
- **Check HTTP status codes**: Different codes require different handling
- **Implement retry logic**: Use exponential backoff for 500/503 errors
- **Handle conflicts**: Reload and retry for 409 version conflicts
- **Respect rate limits**: Check `X-RateLimit-*` headers and `Retry-After`
- **Circuit breakers**: 503 responses indicate temporary service unavailability
- **Don't retry client errors**: 400, 403, 404, 422 won't succeed on retry
- **User-friendly messages**: Map error codes to helpful UI messages
