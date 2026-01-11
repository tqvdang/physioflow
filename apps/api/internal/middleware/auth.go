package middleware

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/tqvdang/physioflow/apps/api/internal/config"
)

// User roles constants
const (
	RoleSuperAdmin = "super_admin"
	RoleClinicAdmin = "clinic_admin"
	RoleTherapist  = "therapist"
	RoleAssistant  = "assistant"
	RoleFrontDesk  = "front_desk"
	RolePatient    = "patient"
)

// AuthClaims represents the claims extracted from JWT token.
type AuthClaims struct {
	UserID        string   `json:"sub"`
	Email         string   `json:"email"`
	EmailVerified bool     `json:"email_verified"`
	Username      string   `json:"preferred_username"`
	FirstName     string   `json:"given_name"`
	LastName      string   `json:"family_name"`
	Name          string   `json:"name"`
	Roles         []string `json:"roles"`
	TenantID      string   `json:"tenant_id"`
	ClinicID      string   `json:"clinic_id"`
	Locale        string   `json:"locale"`
	Issuer        string   `json:"iss"`
	Audience      any      `json:"aud"`
	ExpiresAt     int64    `json:"exp"`
	IssuedAt      int64    `json:"iat"`
}

// HasRole checks if the user has a specific role.
func (c *AuthClaims) HasRole(role string) bool {
	for _, r := range c.Roles {
		if r == role {
			return true
		}
	}
	return false
}

// HasAnyRole checks if the user has any of the specified roles.
func (c *AuthClaims) HasAnyRole(roles ...string) bool {
	for _, role := range roles {
		if c.HasRole(role) {
			return true
		}
	}
	return false
}

// IsStaff checks if the user is a staff member (not a patient).
func (c *AuthClaims) IsStaff() bool {
	return c.HasAnyRole(RoleSuperAdmin, RoleClinicAdmin, RoleTherapist, RoleAssistant, RoleFrontDesk)
}

// IsAdmin checks if the user has admin privileges.
func (c *AuthClaims) IsAdmin() bool {
	return c.HasAnyRole(RoleSuperAdmin, RoleClinicAdmin)
}

// IsClinical checks if the user can access clinical data.
func (c *AuthClaims) IsClinical() bool {
	return c.HasAnyRole(RoleSuperAdmin, RoleClinicAdmin, RoleTherapist, RoleAssistant)
}

// JWK represents a JSON Web Key.
type JWK struct {
	Kty string `json:"kty"`
	Use string `json:"use"`
	Kid string `json:"kid"`
	Alg string `json:"alg"`
	N   string `json:"n"`
	E   string `json:"e"`
}

// JWKS represents a JSON Web Key Set.
type JWKS struct {
	Keys []JWK `json:"keys"`
}

// KeycloakAuthenticator handles OIDC token validation with Keycloak.
type KeycloakAuthenticator struct {
	cfg           *config.Config
	jwks          *JWKS
	jwksLock      sync.RWMutex
	jwksLoadedAt  time.Time
	jwksCacheTTL  time.Duration
	httpClient    *http.Client
}

// NewKeycloakAuthenticator creates a new Keycloak authenticator.
func NewKeycloakAuthenticator(cfg *config.Config) *KeycloakAuthenticator {
	return &KeycloakAuthenticator{
		cfg:          cfg,
		jwksCacheTTL: 5 * time.Minute,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// getJWKSURL returns the JWKS endpoint URL.
func (ka *KeycloakAuthenticator) getJWKSURL() string {
	return fmt.Sprintf("%s/realms/%s/protocol/openid-connect/certs",
		ka.cfg.Keycloak.URL, ka.cfg.Keycloak.Realm)
}

// getIssuer returns the expected token issuer.
func (ka *KeycloakAuthenticator) getIssuer() string {
	return fmt.Sprintf("%s/realms/%s", ka.cfg.Keycloak.URL, ka.cfg.Keycloak.Realm)
}

// fetchJWKS fetches the JWKS from Keycloak.
func (ka *KeycloakAuthenticator) fetchJWKS() error {
	resp, err := ka.httpClient.Get(ka.getJWKSURL())
	if err != nil {
		return fmt.Errorf("failed to fetch JWKS: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("JWKS endpoint returned status %d", resp.StatusCode)
	}

	var jwks JWKS
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return fmt.Errorf("failed to decode JWKS: %w", err)
	}

	ka.jwksLock.Lock()
	ka.jwks = &jwks
	ka.jwksLoadedAt = time.Now()
	ka.jwksLock.Unlock()

	return nil
}

// getJWKS returns the cached JWKS, fetching if needed.
func (ka *KeycloakAuthenticator) getJWKS() (*JWKS, error) {
	ka.jwksLock.RLock()
	jwks := ka.jwks
	loadedAt := ka.jwksLoadedAt
	ka.jwksLock.RUnlock()

	// Check if cache is still valid
	if jwks != nil && time.Since(loadedAt) < ka.jwksCacheTTL {
		return jwks, nil
	}

	// Fetch new JWKS
	if err := ka.fetchJWKS(); err != nil {
		// If we have a cached version, use it even if expired
		if jwks != nil {
			return jwks, nil
		}
		return nil, err
	}

	ka.jwksLock.RLock()
	defer ka.jwksLock.RUnlock()
	return ka.jwks, nil
}

// getPublicKey returns the RSA public key for the given key ID.
func (ka *KeycloakAuthenticator) getPublicKey(kid string) (*rsa.PublicKey, error) {
	jwks, err := ka.getJWKS()
	if err != nil {
		return nil, err
	}

	for _, key := range jwks.Keys {
		if key.Kid == kid && key.Kty == "RSA" {
			return parseRSAPublicKey(key)
		}
	}

	// Key not found, try refreshing JWKS
	if err := ka.fetchJWKS(); err != nil {
		return nil, fmt.Errorf("key %s not found and failed to refresh JWKS: %w", kid, err)
	}

	ka.jwksLock.RLock()
	defer ka.jwksLock.RUnlock()

	for _, key := range ka.jwks.Keys {
		if key.Kid == kid && key.Kty == "RSA" {
			return parseRSAPublicKey(key)
		}
	}

	return nil, fmt.Errorf("key %s not found in JWKS", kid)
}

// parseRSAPublicKey parses an RSA public key from a JWK.
func parseRSAPublicKey(jwk JWK) (*rsa.PublicKey, error) {
	// Decode n (modulus)
	nBytes, err := base64.RawURLEncoding.DecodeString(jwk.N)
	if err != nil {
		return nil, fmt.Errorf("failed to decode modulus: %w", err)
	}
	n := new(big.Int).SetBytes(nBytes)

	// Decode e (exponent)
	eBytes, err := base64.RawURLEncoding.DecodeString(jwk.E)
	if err != nil {
		return nil, fmt.Errorf("failed to decode exponent: %w", err)
	}
	e := 0
	for _, b := range eBytes {
		e = e<<8 + int(b)
	}

	return &rsa.PublicKey{N: n, E: e}, nil
}

// ValidateToken validates a JWT token and returns the claims.
func (ka *KeycloakAuthenticator) ValidateToken(tokenString string) (*AuthClaims, error) {
	// Split token into parts
	parts := strings.Split(tokenString, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid token format")
	}

	// Decode header to get key ID
	headerBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, fmt.Errorf("failed to decode token header: %w", err)
	}

	var header struct {
		Alg string `json:"alg"`
		Kid string `json:"kid"`
		Typ string `json:"typ"`
	}
	if err := json.Unmarshal(headerBytes, &header); err != nil {
		return nil, fmt.Errorf("failed to parse token header: %w", err)
	}

	// Verify algorithm
	if header.Alg != "RS256" {
		return nil, fmt.Errorf("unsupported algorithm: %s", header.Alg)
	}

	// Get public key
	publicKey, err := ka.getPublicKey(header.Kid)
	if err != nil {
		return nil, fmt.Errorf("failed to get public key: %w", err)
	}

	// Verify signature
	signedContent := parts[0] + "." + parts[1]
	signature, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return nil, fmt.Errorf("failed to decode signature: %w", err)
	}

	if err := verifyRS256Signature(signedContent, signature, publicKey); err != nil {
		return nil, fmt.Errorf("invalid signature: %w", err)
	}

	// Decode and parse claims
	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("failed to decode token payload: %w", err)
	}

	var rawClaims map[string]any
	if err := json.Unmarshal(payloadBytes, &rawClaims); err != nil {
		return nil, fmt.Errorf("failed to parse token claims: %w", err)
	}

	claims := extractClaims(rawClaims)

	// Validate claims
	if err := ka.validateClaims(claims); err != nil {
		return nil, err
	}

	return claims, nil
}

// extractClaims extracts AuthClaims from raw JWT claims.
func extractClaims(raw map[string]any) *AuthClaims {
	claims := &AuthClaims{}

	if v, ok := raw["sub"].(string); ok {
		claims.UserID = v
	}
	if v, ok := raw["email"].(string); ok {
		claims.Email = v
	}
	if v, ok := raw["email_verified"].(bool); ok {
		claims.EmailVerified = v
	}
	if v, ok := raw["preferred_username"].(string); ok {
		claims.Username = v
	}
	if v, ok := raw["given_name"].(string); ok {
		claims.FirstName = v
	}
	if v, ok := raw["family_name"].(string); ok {
		claims.LastName = v
	}
	if v, ok := raw["name"].(string); ok {
		claims.Name = v
	}
	if v, ok := raw["tenant_id"].(string); ok {
		claims.TenantID = v
	}
	if v, ok := raw["clinic_id"].(string); ok {
		claims.ClinicID = v
	}
	if v, ok := raw["locale"].(string); ok {
		claims.Locale = v
	}
	if v, ok := raw["iss"].(string); ok {
		claims.Issuer = v
	}
	claims.Audience = raw["aud"]
	if v, ok := raw["exp"].(float64); ok {
		claims.ExpiresAt = int64(v)
	}
	if v, ok := raw["iat"].(float64); ok {
		claims.IssuedAt = int64(v)
	}

	// Extract roles from different possible locations
	claims.Roles = extractRoles(raw)

	return claims
}

// extractRoles extracts roles from JWT claims.
func extractRoles(raw map[string]any) []string {
	var roles []string

	// Try direct roles claim first (custom mapper)
	if r, ok := raw["roles"].([]any); ok {
		for _, role := range r {
			if s, ok := role.(string); ok {
				roles = append(roles, s)
			}
		}
		if len(roles) > 0 {
			return roles
		}
	}

	// Try realm_access.roles
	if realmAccess, ok := raw["realm_access"].(map[string]any); ok {
		if r, ok := realmAccess["roles"].([]any); ok {
			for _, role := range r {
				if s, ok := role.(string); ok {
					// Filter to known roles
					switch s {
					case RoleSuperAdmin, RoleClinicAdmin, RoleTherapist, RoleAssistant, RoleFrontDesk, RolePatient:
						roles = append(roles, s)
					}
				}
			}
		}
	}

	return roles
}

// validateClaims validates the token claims.
func (ka *KeycloakAuthenticator) validateClaims(claims *AuthClaims) error {
	now := time.Now().Unix()

	// Check expiration
	if claims.ExpiresAt < now {
		return fmt.Errorf("token has expired")
	}

	// Check issued at (allow 1 minute clock skew)
	if claims.IssuedAt > now+60 {
		return fmt.Errorf("token issued in the future")
	}

	// Check issuer
	expectedIssuer := ka.getIssuer()
	if claims.Issuer != expectedIssuer {
		return fmt.Errorf("invalid token issuer")
	}

	return nil
}

// verifyRS256Signature verifies an RS256 signature.
func verifyRS256Signature(content string, signature []byte, key *rsa.PublicKey) error {
	// Import crypto packages
	h := sha256Hash([]byte(content))
	return rsaVerifyPKCS1v15(key, h, signature)
}

// sha256Hash computes SHA256 hash.
func sha256Hash(data []byte) []byte {
	// Using crypto/sha256
	h := newSHA256()
	h.Write(data)
	return h.Sum(nil)
}

// Global authenticator instance
var authenticator *KeycloakAuthenticator
var authenticatorOnce sync.Once

// getAuthenticator returns the global authenticator instance.
func getAuthenticator(cfg *config.Config) *KeycloakAuthenticator {
	authenticatorOnce.Do(func() {
		authenticator = NewKeycloakAuthenticator(cfg)
	})
	return authenticator
}

// Auth returns a middleware that validates JWT tokens.
func Auth(cfg *config.Config) echo.MiddlewareFunc {
	auth := getAuthenticator(cfg)

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Skip auth in development mode if Keycloak is not configured
			if cfg.IsDevelopment() && cfg.Keycloak.URL == "" {
				// Set mock claims for development
				c.Set("user", &AuthClaims{
					UserID:    "dev-user",
					Email:     "dev@physioflow.local",
					Username:  "dev",
					FirstName: "Development",
					LastName:  "User",
					Name:      "Development User",
					Roles:     []string{RoleSuperAdmin},
					TenantID:  "dev-tenant",
				})
				return next(c)
			}

			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				return c.JSON(http.StatusUnauthorized, map[string]interface{}{
					"error":   "unauthorized",
					"message": "Missing authorization header",
				})
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				return c.JSON(http.StatusUnauthorized, map[string]interface{}{
					"error":   "unauthorized",
					"message": "Invalid authorization header format",
				})
			}

			token := parts[1]
			if token == "" {
				return c.JSON(http.StatusUnauthorized, map[string]interface{}{
					"error":   "unauthorized",
					"message": "Missing token",
				})
			}

			claims, err := auth.ValidateToken(token)
			if err != nil {
				return c.JSON(http.StatusUnauthorized, map[string]interface{}{
					"error":   "unauthorized",
					"message": "Invalid or expired token",
					"details": err.Error(),
				})
			}

			c.Set("user", claims)

			// Add user info to request context for logging
			ctx := context.WithValue(c.Request().Context(), "user_id", claims.UserID)
			ctx = context.WithValue(ctx, "tenant_id", claims.TenantID)
			c.SetRequest(c.Request().WithContext(ctx))

			return next(c)
		}
	}
}

// GetUser retrieves the authenticated user from the context.
func GetUser(c echo.Context) *AuthClaims {
	if user, ok := c.Get("user").(*AuthClaims); ok {
		return user
	}
	return nil
}

// RequireRole returns a middleware that checks for required roles.
func RequireRole(roles ...string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			user := GetUser(c)
			if user == nil {
				return c.JSON(http.StatusUnauthorized, map[string]interface{}{
					"error":   "unauthorized",
					"message": "User not authenticated",
				})
			}

			if !user.HasAnyRole(roles...) {
				return c.JSON(http.StatusForbidden, map[string]interface{}{
					"error":   "forbidden",
					"message": "Insufficient permissions",
				})
			}

			return next(c)
		}
	}
}

// RequireAdmin returns a middleware that requires admin privileges.
func RequireAdmin() echo.MiddlewareFunc {
	return RequireRole(RoleSuperAdmin, RoleClinicAdmin)
}

// RequireClinical returns a middleware that requires clinical access.
func RequireClinical() echo.MiddlewareFunc {
	return RequireRole(RoleSuperAdmin, RoleClinicAdmin, RoleTherapist, RoleAssistant)
}

// RequireStaff returns a middleware that requires staff access.
func RequireStaff() echo.MiddlewareFunc {
	return RequireRole(RoleSuperAdmin, RoleClinicAdmin, RoleTherapist, RoleAssistant, RoleFrontDesk)
}

// RequireTenant returns a middleware that validates tenant access.
func RequireTenant() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			user := GetUser(c)
			if user == nil {
				return c.JSON(http.StatusUnauthorized, map[string]interface{}{
					"error":   "unauthorized",
					"message": "User not authenticated",
				})
			}

			// Super admin can access all tenants
			if user.HasRole(RoleSuperAdmin) {
				return next(c)
			}

			// Get tenant ID from path or query
			tenantID := c.Param("tenant_id")
			if tenantID == "" {
				tenantID = c.QueryParam("tenant_id")
			}

			// If no tenant specified, use user's tenant
			if tenantID == "" {
				tenantID = user.TenantID
			}

			// Validate user has access to the tenant
			if tenantID != user.TenantID {
				return c.JSON(http.StatusForbidden, map[string]interface{}{
					"error":   "forbidden",
					"message": "Access denied to this tenant",
				})
			}

			return next(c)
		}
	}
}
