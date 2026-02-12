# Authentication Guide

This document describes how to authenticate with PhysioFlow API using Keycloak OpenID Connect (OIDC).

## Table of Contents

- [Overview](#overview)
- [Keycloak Integration](#keycloak-integration)
- [Obtaining JWT Tokens](#obtaining-jwt-tokens)
  - [Password Grant (Development)](#password-grant-development)
  - [Authorization Code Flow (Production)](#authorization-code-flow-production)
- [Token Refresh](#token-refresh)
- [Using Tokens](#using-tokens)
- [Token Validation](#token-validation)
- [Role-Based Access Control](#role-based-access-control)
- [Multi-Tenancy](#multi-tenancy)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

PhysioFlow API uses **OAuth 2.0 / OpenID Connect** for authentication via Keycloak. All API endpoints (except `/health` and `/ready`) require a valid JWT (JSON Web Token) in the `Authorization` header.

**Authentication Flow:**
1. User authenticates with Keycloak
2. Keycloak returns a JWT access token
3. Client includes token in API requests
4. API validates token signature and claims
5. API authorizes request based on user roles

---

## Keycloak Integration

### Keycloak Endpoints

| Environment | Keycloak URL | Realm |
|-------------|--------------|-------|
| Production | `https://keycloak.trancloud.work` | `physioflow` |
| Staging | `https://keycloak.trancloud.work` | `physioflow-staging` |
| Development | `https://keycloak.trancloud.work` | `physioflow-dev` |
| Local | `http://localhost:7014` | `physioflow-local` |

### OpenID Connect Discovery

Each realm exposes a well-known configuration endpoint:

```
https://keycloak.trancloud.work/realms/physioflow-dev/.well-known/openid-configuration
```

This provides URLs for:
- `token_endpoint` - Obtain tokens
- `authorization_endpoint` - Authorization Code flow
- `jwks_uri` - Public keys for token verification
- `userinfo_endpoint` - User information
- `end_session_endpoint` - Logout

---

## Obtaining JWT Tokens

### Password Grant (Development)

**⚠️ Use only for development and testing. Do not use in production.**

The Resource Owner Password Credentials grant allows direct username/password authentication.

**Request:**

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
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJxY...",
  "expires_in": 3600,
  "refresh_expires_in": 1800,
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICI4...",
  "token_type": "Bearer",
  "not-before-policy": 0,
  "session_state": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  "scope": "openid profile email"
}
```

**Response Fields:**

| Field | Description |
|-------|-------------|
| `access_token` | JWT token to use in API requests |
| `expires_in` | Token validity in seconds (typically 3600 = 1 hour) |
| `refresh_token` | Token to obtain new access tokens |
| `refresh_expires_in` | Refresh token validity in seconds (typically 1800 = 30 minutes) |
| `token_type` | Always "Bearer" |
| `scope` | Granted OAuth scopes |

**JavaScript Example:**

```javascript
async function loginWithPassword(username, password) {
  const params = new URLSearchParams({
    grant_type: 'password',
    username: username,
    password: password,
    client_id: 'physioflow-web'
  });

  const response = await fetch(
    'https://keycloak.trancloud.work/realms/physioflow-dev/protocol/openid-connect/token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    }
  );

  if (!response.ok) {
    throw new Error('Authentication failed');
  }

  const tokens = await response.json();

  // Store tokens securely
  localStorage.setItem('access_token', tokens.access_token);
  localStorage.setItem('refresh_token', tokens.refresh_token);

  return tokens;
}
```

---

### Authorization Code Flow (Production)

**✅ Recommended for production web applications.**

This is the standard OAuth 2.0 flow for web applications:

**Step 1: Redirect to Keycloak**

```javascript
const authUrl = new URL('https://keycloak.trancloud.work/realms/physioflow/protocol/openid-connect/auth');
authUrl.searchParams.set('client_id', 'physioflow-web');
authUrl.searchParams.set('redirect_uri', 'https://physioflow.trancloud.work/auth/callback');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', 'openid profile email');
authUrl.searchParams.set('state', generateRandomState()); // CSRF protection

window.location.href = authUrl.toString();
```

**Step 2: Handle Callback**

Keycloak redirects back with an authorization code:

```
https://physioflow.trancloud.work/auth/callback?code=abc123&state=xyz789
```

**Step 3: Exchange Code for Tokens**

```javascript
async function exchangeCodeForTokens(code) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: 'https://physioflow.trancloud.work/auth/callback',
    client_id: 'physioflow-web'
  });

  const response = await fetch(
    'https://keycloak.trancloud.work/realms/physioflow/protocol/openid-connect/token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    }
  );

  return await response.json();
}
```

---

## Token Refresh

Access tokens expire after 1 hour. Use refresh tokens to obtain new access tokens without re-authentication.

**Request:**

```bash
curl -X POST 'https://keycloak.trancloud.work/realms/physioflow-dev/protocol/openid-connect/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=refresh_token' \
  -d 'refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICI4...' \
  -d 'client_id=physioflow-web'
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJxY...",
  "expires_in": 3600,
  "refresh_expires_in": 1800,
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICI4...",
  "token_type": "Bearer"
}
```

**JavaScript Example:**

```javascript
async function refreshAccessToken(refreshToken) {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: 'physioflow-web'
  });

  const response = await fetch(
    'https://keycloak.trancloud.work/realms/physioflow-dev/protocol/openid-connect/token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    }
  );

  if (!response.ok) {
    // Refresh token expired, need to re-authenticate
    throw new Error('Refresh token expired');
  }

  const tokens = await response.json();

  // Update stored tokens
  localStorage.setItem('access_token', tokens.access_token);
  localStorage.setItem('refresh_token', tokens.refresh_token);

  return tokens;
}
```

**Automatic Refresh:**

```javascript
class ApiClient {
  constructor(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.tokenExpiresAt = this.parseTokenExpiry(accessToken);
  }

  async request(url, options = {}) {
    // Refresh if token expires in < 5 minutes
    if (this.tokenExpiresAt - Date.now() < 5 * 60 * 1000) {
      await this.refresh();
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    // Handle 401 by refreshing and retrying once
    if (response.status === 401) {
      await this.refresh();
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
    }

    return response;
  }

  async refresh() {
    const tokens = await refreshAccessToken(this.refreshToken);
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    this.tokenExpiresAt = this.parseTokenExpiry(tokens.access_token);
  }

  parseTokenExpiry(token) {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // Convert to milliseconds
  }
}
```

---

## Using Tokens

Include the JWT token in the `Authorization` header for all API requests:

```
Authorization: Bearer <access_token>
```

**cURL Example:**

```bash
curl -X GET 'http://localhost:7011/api/v1/anatomy/regions' \
  -H 'Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJxY...'
```

**JavaScript Fetch Example:**

```javascript
async function fetchAnatomyRegions(accessToken) {
  const response = await fetch('http://localhost:7011/api/v1/anatomy/regions', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}
```

**Axios Example:**

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:7011/api/v1',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

// Use API client
const regions = await api.get('/anatomy/regions');
```

---

## Token Validation

The API validates JWT tokens by:

1. **Signature Verification** - Validates token was signed by Keycloak using RS256
2. **Issuer Check** - Ensures token was issued by the correct Keycloak realm
3. **Expiration Check** - Confirms token has not expired (`exp` claim)
4. **Audience Check** - Validates token is intended for this API
5. **Claims Extraction** - Extracts user information and roles

### JWT Token Structure

A JWT token consists of three parts separated by dots:

```
header.payload.signature
```

**Example Token Payload:**

```json
{
  "sub": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  "email": "therapist@physioflow.local",
  "email_verified": true,
  "preferred_username": "therapist",
  "given_name": "John",
  "family_name": "Doe",
  "name": "John Doe",
  "roles": ["therapist"],
  "clinic_id": "123e4567-e89b-12d3-a456-426614174000",
  "tenant_id": "tenant-123",
  "locale": "vi",
  "iss": "https://keycloak.trancloud.work/realms/physioflow-dev",
  "aud": "physioflow-web",
  "exp": 1707736800,
  "iat": 1707733200
}
```

**Claim Descriptions:**

| Claim | Description |
|-------|-------------|
| `sub` | User unique identifier (UUID) |
| `email` | User email address |
| `email_verified` | Email verification status |
| `preferred_username` | Username |
| `given_name` | First name |
| `family_name` | Last name |
| `name` | Full name |
| `roles` | User roles (custom claim) |
| `clinic_id` | Clinic/organization ID (custom claim) |
| `tenant_id` | Tenant ID for multi-tenancy (custom claim) |
| `locale` | User's preferred language (vi/en) |
| `iss` | Token issuer (Keycloak realm URL) |
| `aud` | Token audience (client ID) |
| `exp` | Expiration timestamp (Unix epoch) |
| `iat` | Issued at timestamp (Unix epoch) |

---

## Role-Based Access Control

PhysioFlow implements role-based access control (RBAC). User roles determine which API endpoints and operations are accessible.

### Available Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `super_admin` | System administrator | Full access to all resources across all clinics |
| `clinic_admin` | Clinic administrator | Manage clinic settings, users, and all clinical data |
| `therapist` | Physical therapist | Full clinical access: patients, assessments, treatments |
| `assistant` | Therapist assistant | Limited clinical access: view patients, record assessments |
| `front_desk` | Receptionist | Patient registration, appointments, billing |
| `patient` | Patient | View own records only |

### Role Hierarchy

```
super_admin (全能)
  └─ clinic_admin (clinic-scoped admin)
      ├─ therapist (clinical write access)
      │   └─ assistant (clinical read/limited write)
      ├─ front_desk (administrative access)
      └─ patient (self-access only)
```

### Endpoint Authorization

Different endpoints require different roles:

#### Outcome Measures Endpoints

| Endpoint | Required Roles |
|----------|----------------|
| `POST /patients/{id}/outcome-measures` | therapist, clinic_admin, super_admin |
| `GET /patients/{id}/outcome-measures` | therapist, clinic_admin, super_admin |
| `PUT /patients/{id}/outcome-measures/{id}` | therapist, clinic_admin, super_admin |
| `DELETE /patients/{id}/outcome-measures/{id}` | therapist, clinic_admin, super_admin |
| `GET /outcome-measures/library` | Any authenticated user |

#### Anatomy Regions Endpoints

| Endpoint | Required Roles |
|----------|----------------|
| `GET /anatomy/regions` | Any authenticated user |
| `GET /anatomy/regions/{id}` | Any authenticated user |

### Checking Roles in Client

```javascript
function parseJwtPayload(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join('')
  );
  return JSON.parse(jsonPayload);
}

function hasRole(token, requiredRole) {
  const payload = parseJwtPayload(token);
  return payload.roles && payload.roles.includes(requiredRole);
}

// Example usage
const token = localStorage.getItem('access_token');
const payload = parseJwtPayload(token);

if (hasRole(token, 'therapist')) {
  // Show therapist-only features
  console.log('User is a therapist');
}

if (payload.roles.some(role => ['super_admin', 'clinic_admin'].includes(role))) {
  // Show admin features
  console.log('User has admin privileges');
}
```

### Authorization Errors

If a user attempts to access an endpoint without the required role:

**Response: 403 Forbidden**

```json
{
  "error": "forbidden",
  "message": "Insufficient permissions"
}
```

---

## Multi-Tenancy

PhysioFlow supports multi-tenancy through clinic isolation. Each user belongs to a specific clinic (tenant), and can only access data within their clinic.

### Clinic Isolation

- The `clinic_id` claim in the JWT identifies the user's clinic
- API automatically filters queries by clinic_id
- Super admins can access all clinics

### Tenant Validation

```javascript
// User's clinic from token
const userClinicId = "123e4567-e89b-12d3-a456-426614174000";

// Attempting to access another clinic's data
// GET /api/v1/patients?clinic_id=999e4567-e89b-12d3-a456-426614174999
// Returns: 403 Forbidden (unless user is super_admin)
```

---

## Best Practices

### 1. Secure Token Storage

**✅ Do:**
- Use `httpOnly` cookies for web applications (prevents XSS)
- Use secure storage on mobile (Keychain/KeyStore)
- Clear tokens on logout

**❌ Don't:**
- Store tokens in localStorage if XSS risk exists
- Log tokens to console or analytics
- Send tokens in URLs or query parameters

**Example (Secure Cookie):**

```javascript
// Server-side (after authentication)
res.cookie('access_token', token, {
  httpOnly: true,
  secure: true, // HTTPS only
  sameSite: 'strict',
  maxAge: 3600000 // 1 hour
});
```

### 2. Handle Token Expiration

Always handle 401 responses by refreshing the token:

```javascript
async function apiCall(url) {
  let response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (response.status === 401) {
    // Try refreshing token
    await refreshAccessToken();

    // Retry request
    response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
  }

  return response;
}
```

### 3. Validate Tokens Client-Side

Check token expiration before making requests:

```javascript
function isTokenExpired(token) {
  try {
    const payload = parseJwtPayload(token);
    return Date.now() >= payload.exp * 1000;
  } catch (e) {
    return true;
  }
}

if (isTokenExpired(accessToken)) {
  await refreshAccessToken();
}
```

### 4. Use HTTPS in Production

Always use HTTPS to prevent token interception:

```
✅ https://physioflow.trancloud.work/api
❌ http://physioflow.trancloud.work/api
```

### 5. Implement Logout

Revoke tokens on logout:

```javascript
async function logout(refreshToken) {
  // Revoke refresh token at Keycloak
  await fetch('https://keycloak.trancloud.work/realms/physioflow/protocol/openid-connect/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: 'physioflow-web',
      refresh_token: refreshToken
    })
  });

  // Clear local storage
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}
```

---

## Troubleshooting

### Invalid or Expired Token

**Error:**
```json
{
  "error": "unauthorized",
  "message": "Invalid or expired token",
  "details": "token has expired"
}
```

**Solutions:**
1. Check token expiration: `exp` claim must be in the future
2. Refresh the access token using refresh token
3. Re-authenticate if refresh token also expired
4. Ensure token is from the correct Keycloak realm

### Token Signature Verification Failed

**Error:**
```json
{
  "error": "unauthorized",
  "message": "Invalid or expired token",
  "details": "invalid signature"
}
```

**Causes:**
- Token was tampered with
- Token is from a different Keycloak realm
- Keycloak keys were rotated (rare)

**Solutions:**
1. Obtain a fresh token from Keycloak
2. Verify client is using correct Keycloak realm URL
3. Don't manually modify token payload

### Missing Authorization Header

**Error:**
```json
{
  "error": "unauthorized",
  "message": "Missing authorization header"
}
```

**Solution:**
Ensure the `Authorization` header is included:

```javascript
fetch(url, {
  headers: {
    'Authorization': `Bearer ${accessToken}` // Note: "Bearer" with capital B
  }
})
```

### Insufficient Permissions

**Error:**
```json
{
  "error": "forbidden",
  "message": "Insufficient permissions"
}
```

**Causes:**
- User lacks required role for the endpoint
- User trying to access another clinic's data

**Solutions:**
1. Check user's roles in JWT payload
2. Verify user has appropriate role (therapist, clinic_admin, etc.)
3. Contact clinic administrator to assign correct role

### CORS Errors

**Error in browser console:**
```
Access to fetch at 'http://localhost:7011/api/v1/...' from origin 'http://localhost:3000'
has been blocked by CORS policy
```

**Solutions:**
1. Ensure API CORS middleware is configured
2. Check that `Access-Control-Allow-Origin` header is set
3. In development, configure API to allow localhost origins
4. For production, whitelist your frontend domain

---

## Development vs Production

### Local Development

**Keycloak:** `http://localhost:7014`
**Realm:** `physioflow-local`
**Client:** `physioflow-web`
**Users:** See `CLAUDE.md` for test user credentials

**Example:**
```bash
curl -X POST 'http://localhost:7014/realms/physioflow-local/protocol/openid-connect/token' \
  -d 'grant_type=password' \
  -d 'username=therapist1' \
  -d 'password=Therapist@123' \
  -d 'client_id=physioflow-web'
```

### Production

**Keycloak:** `https://keycloak.trancloud.work`
**Realm:** `physioflow`
**Client:** `physioflow-web`
**Flow:** Authorization Code (not password grant)

**Example:**
```javascript
// Redirect to Keycloak login
window.location.href = 'https://keycloak.trancloud.work/realms/physioflow/protocol/openid-connect/auth?client_id=physioflow-web&redirect_uri=https://physioflow.trancloud.work/auth/callback&response_type=code&scope=openid%20profile%20email';
```

---

## Summary

- **Authentication:** OAuth 2.0 / OpenID Connect via Keycloak
- **Token Format:** JWT (JSON Web Token) with RS256 signature
- **Token Usage:** Include in `Authorization: Bearer <token>` header
- **Token Expiry:** 1 hour (refresh before expiration)
- **Refresh Tokens:** Valid for 30 minutes, use to obtain new access tokens
- **Authorization:** Role-based access control (RBAC)
- **Roles:** super_admin, clinic_admin, therapist, assistant, front_desk, patient
- **Multi-Tenancy:** Clinic isolation via `clinic_id` claim
- **Best Practices:** Secure storage, automatic refresh, HTTPS, proper logout

For more information, see the [Keycloak documentation](https://www.keycloak.org/docs/latest/securing_apps/).
