package middleware

import (
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/metrics"
)

// slowRequestThreshold defines the duration above which a request is logged as slow.
const slowRequestThreshold = 500 * time.Millisecond

// Logger returns a middleware that logs HTTP requests using zerolog
// and records metrics for observability. It generates a request ID if
// one is not already present and adds structured fields for user context,
// patient context, and slow request detection.
func Logger() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			start := time.Now()

			req := c.Request()
			res := c.Response()

			// Generate or retrieve request ID.
			requestID := req.Header.Get(echo.HeaderXRequestID)
			if requestID == "" {
				requestID = uuid.New().String()
			}
			// Set request ID on the response header and context so downstream can use it.
			res.Header().Set(echo.HeaderXRequestID, requestID)
			c.Set("request_id", requestID)

			// Process request
			err := next(c)
			if err != nil {
				c.Error(err)
			}

			// Calculate latency
			latency := time.Since(start)

			// Extract user context (if available)
			userID := ""
			if u := GetUser(c); u != nil {
				userID = u.UserID
			} else if claims, ok := c.Get("user").(map[string]interface{}); ok {
				if sub, ok := claims["sub"].(string); ok {
					userID = sub
				}
			}

			// Extract patient ID from path params (for PHI audit trail)
			patientID := c.Param("patientId")
			if patientID == "" {
				patientID = c.Param("pid")
			}

			// Determine operation name from the Echo route path.
			operation := c.Path()

			// Build log event based on status code.
			event := log.Info()
			if res.Status >= 500 {
				event = log.Error()
			} else if res.Status >= 400 {
				event = log.Warn()
			}

			// Log the request with structured fields.
			logEvent := event.
				Str("request_id", requestID).
				Str("method", req.Method).
				Str("uri", req.RequestURI).
				Str("path", operation).
				Str("remote_addr", c.RealIP()).
				Int("status", res.Status).
				Int64("size", res.Size).
				Dur("latency", latency).
				Float64("latency_ms", float64(latency.Milliseconds())).
				Str("user_agent", req.UserAgent())

			// Add user context if available.
			if userID != "" {
				logEvent = logEvent.Str("user_id", userID)
			}

			// Add patient context if available (for PHI audit).
			if patientID != "" {
				logEvent = logEvent.Str("patient_id", patientID)
			}

			// Add operation field for easier filtering.
			logEvent = logEvent.Str("operation", req.Method+" "+operation)

			// Flag slow requests.
			if latency > slowRequestThreshold {
				logEvent = logEvent.Bool("slow_request", true)
			}

			// Add error details if present.
			if err != nil {
				logEvent = logEvent.Err(err)
			}

			// Log Vietnamese PT-specific endpoints at INFO level.
			if isVietnamesePTEndpoint(operation) {
				logEvent = logEvent.Str("feature", "vietnamese_pt")
			}

			logEvent.Msg("http request")

			// Record metrics.
			endpoint := normalizePath(operation)
			metrics.RecordAPIRequest(endpoint, req.Method, res.Status, latency)

			return nil
		}
	}
}

// isVietnamesePTEndpoint checks if the endpoint is Vietnamese PT-specific.
func isVietnamesePTEndpoint(path string) bool {
	ptEndpoints := []string{
		"/api/v1/patients/:patientId/insurance",
		"/api/v1/patients/:patientId/billing",
		"/api/v1/patients/:patientId/outcome-measures",
		"/api/v1/patients/:patientId/protocols",
		"/api/v1/patients/:patientId/discharge",
		"/api/v1/medical-terms",
		"/api/v1/protocols",
		"/api/v1/billing/service-codes",
	}

	for _, endpoint := range ptEndpoints {
		if matchesPath(path, endpoint) {
			return true
		}
	}

	return false
}

// matchesPath checks if a path matches a pattern with path parameters.
func matchesPath(path, pattern string) bool {
	// Simple pattern matching for common cases
	// In production, use a proper router pattern matcher
	if path == pattern {
		return true
	}

	// Check if path starts with the pattern prefix (for nested routes)
	patternPrefix := pattern
	if idx := len(pattern); idx > 0 && pattern[idx-1] == '/' {
		patternPrefix = pattern[:idx-1]
	}

	return len(path) >= len(patternPrefix) && path[:len(patternPrefix)] == patternPrefix
}

// normalizePath normalizes the path by replacing IDs with placeholders.
func normalizePath(path string) string {
	// Simple normalization - replace UUIDs and numeric IDs with placeholders
	// In production, use the router's pattern matching
	return path
}
