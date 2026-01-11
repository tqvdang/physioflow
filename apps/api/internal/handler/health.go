package handler

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/tqvdang/physioflow/apps/api/internal/service"
)

// HealthHandler handles health check endpoints.
type HealthHandler struct {
	svc       *service.Service
	startTime time.Time
}

// NewHealthHandler creates a new HealthHandler.
func NewHealthHandler(svc *service.Service) *HealthHandler {
	return &HealthHandler{
		svc:       svc,
		startTime: time.Now(),
	}
}

// HealthResponse represents the health check response.
type HealthResponse struct {
	Status    string `json:"status"`
	Timestamp string `json:"timestamp"`
	Uptime    string `json:"uptime"`
}

// ReadyResponse represents the readiness check response.
type ReadyResponse struct {
	Status   string            `json:"status"`
	Checks   map[string]string `json:"checks"`
	Ready    bool              `json:"ready"`
}

// Health returns the application health status.
// @Summary Health check
// @Description Returns the health status of the API
// @Tags health
// @Produce json
// @Success 200 {object} HealthResponse
// @Router /health [get]
func (h *HealthHandler) Health(c echo.Context) error {
	return c.JSON(http.StatusOK, HealthResponse{
		Status:    "healthy",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Uptime:    time.Since(h.startTime).String(),
	})
}

// Ready returns the application readiness status.
// @Summary Readiness check
// @Description Returns the readiness status including dependency checks
// @Tags health
// @Produce json
// @Success 200 {object} ReadyResponse
// @Failure 503 {object} ReadyResponse
// @Router /ready [get]
func (h *HealthHandler) Ready(c echo.Context) error {
	checks := make(map[string]string)
	allReady := true

	// Check database connectivity
	if err := h.svc.CheckDatabase(); err != nil {
		checks["database"] = "unhealthy: " + err.Error()
		allReady = false
	} else {
		checks["database"] = "healthy"
	}

	// Check Redis connectivity
	if err := h.svc.CheckRedis(); err != nil {
		checks["redis"] = "unhealthy: " + err.Error()
		allReady = false
	} else {
		checks["redis"] = "healthy"
	}

	status := "ready"
	statusCode := http.StatusOK
	if !allReady {
		status = "not_ready"
		statusCode = http.StatusServiceUnavailable
	}

	return c.JSON(statusCode, ReadyResponse{
		Status: status,
		Checks: checks,
		Ready:  allReady,
	})
}
