package middleware

import (
	"time"

	"github.com/labstack/echo/v4"

	"github.com/tqvdang/physioflow/apps/api/internal/metrics"
)

// MetricsRecorder returns a middleware that records feature-specific metrics.
// This middleware should be applied after the Logger middleware to ensure
// request context is properly set up.
func MetricsRecorder() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			start := time.Now()

			// Process request
			err := next(c)

			// Record feature-specific metrics based on endpoint
			recordFeatureMetrics(c, time.Since(start))

			return err
		}
	}
}

// recordFeatureMetrics records metrics for specific Vietnamese PT features.
func recordFeatureMetrics(c echo.Context, duration time.Duration) {
	path := c.Path()
	method := c.Request().Method
	status := c.Response().Status

	// Record metrics for specific feature endpoints
	switch {
	case matchesPath(path, "/api/v1/patients/:patientId/insurance/validate"):
		// BHYT validation metrics are recorded in the handler
		// This middleware just ensures API-level metrics are captured

	case matchesPath(path, "/api/v1/patients/:patientId/insurance/calculate-coverage"):
		// Coverage calculation metrics are recorded in the handler

	case matchesPath(path, "/api/v1/patients/:patientId/outcome-measures/progress"):
		// Outcome progress calculation metrics are recorded in the handler

	case matchesPath(path, "/api/v1/patients/:patientId/billing/invoice") && method == "POST":
		if status >= 200 && status < 300 {
			metrics.RecordBillingInvoice("created")
		}

	case matchesPath(path, "/api/v1/patients/:patientId/billing/payment") && method == "POST":
		// Payment method is extracted in handler and recorded there

	case matchesPath(path, "/api/v1/patients/:patientId/protocols/assign") && method == "POST":
		// Protocol assignment metrics are recorded in the handler

	case matchesPath(path, "/api/v1/patients/:patientId/discharge/summary") && method == "POST":
		if status >= 200 && status < 300 {
			metrics.RecordDischargeSummary()
		}

	case matchesPath(path, "/api/v1/medical-terms/search"):
		// Search duration is recorded in the handler
	}
}
