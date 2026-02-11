package handler

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/middleware"
	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
	"github.com/tqvdang/physioflow/apps/api/internal/service"
	"github.com/tqvdang/physioflow/apps/api/pkg/validator"
)

// SpecialTestHandler handles special test HTTP requests.
type SpecialTestHandler struct {
	svc *service.Service
}

// NewSpecialTestHandler creates a new SpecialTestHandler.
func NewSpecialTestHandler(svc *service.Service) *SpecialTestHandler {
	return &SpecialTestHandler{svc: svc}
}

// SpecialTestResponse represents a special test in API responses.
type SpecialTestResponse struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	NameVi            string `json:"name_vi"`
	Category          string `json:"category"`
	Description       string `json:"description"`
	DescriptionVi     string `json:"description_vi"`
	PositiveFinding   string `json:"positive_finding"`
	PositiveFindingVi string `json:"positive_finding_vi"`
	NegativeFinding   string `json:"negative_finding"`
	NegativeFindingVi string `json:"negative_finding_vi"`
	Sensitivity       *int   `json:"sensitivity,omitempty"`
	Specificity       *int   `json:"specificity,omitempty"`
	CreatedAt         string `json:"created_at"`
}

// SpecialTestResultResponse represents a special test result in API responses.
type SpecialTestResultResponse struct {
	ID            string  `json:"id"`
	PatientID     string  `json:"patient_id"`
	VisitID       *string `json:"visit_id,omitempty"`
	SpecialTestID string  `json:"special_test_id"`
	Result        string  `json:"result"`
	Notes         string  `json:"notes,omitempty"`
	TherapistID   string  `json:"therapist_id"`
	AssessedAt    string  `json:"assessed_at"`
	CreatedAt     string  `json:"created_at"`
	TestName      string  `json:"test_name,omitempty"`
	TestNameVi    string  `json:"test_name_vi,omitempty"`
	TestCategory  string  `json:"test_category,omitempty"`
}

// ListTests returns all special tests, optionally filtered by category.
// @Summary List special tests
// @Description Retrieves all special tests in the library, optionally filtered by category
// @Tags special-tests
// @Accept json
// @Produce json
// @Param category query string false "Filter by category" Enums(shoulder, knee, spine, hip, ankle, elbow)
// @Success 200 {array} SpecialTestResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/special-tests [get]
func (h *SpecialTestHandler) ListTests(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	category := c.QueryParam("category")
	ctx := c.Request().Context()

	var tests []*model.SpecialTest
	var err error

	if category != "" {
		tests, err = h.svc.SpecialTest().GetTestsByCategory(ctx, category)
		if err != nil {
			return c.JSON(http.StatusBadRequest, ErrorResponse{
				Error:   "invalid_request",
				Message: err.Error(),
			})
		}
	} else {
		tests, err = h.svc.SpecialTest().GetAllTests(ctx)
		if err != nil {
			log.Error().Err(err).Msg("failed to list special tests")
			return c.JSON(http.StatusInternalServerError, ErrorResponse{
				Error:   "internal_error",
				Message: "Failed to retrieve special tests",
			})
		}
	}

	results := make([]SpecialTestResponse, len(tests))
	for i, t := range tests {
		results[i] = toSpecialTestResponse(t)
	}

	return c.JSON(http.StatusOK, results)
}

// GetTestsByCategory returns special tests filtered by body region category.
// @Summary Get special tests by category
// @Description Retrieves special tests for a specific body region
// @Tags special-tests
// @Accept json
// @Produce json
// @Param category path string true "Test category" Enums(shoulder, knee, spine, hip, ankle, elbow)
// @Success 200 {array} SpecialTestResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/special-tests/category/{category} [get]
func (h *SpecialTestHandler) GetTestsByCategory(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	category := c.Param("category")
	if category == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Category is required",
		})
	}

	tests, err := h.svc.SpecialTest().GetTestsByCategory(c.Request().Context(), category)
	if err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: err.Error(),
		})
	}

	results := make([]SpecialTestResponse, len(tests))
	for i, t := range tests {
		results[i] = toSpecialTestResponse(t)
	}

	return c.JSON(http.StatusOK, results)
}

// SearchTests searches special tests by name.
// @Summary Search special tests
// @Description Searches special tests by name (English or Vietnamese)
// @Tags special-tests
// @Accept json
// @Produce json
// @Param q query string true "Search query"
// @Param limit query int false "Maximum number of results (default 20)"
// @Success 200 {array} SpecialTestResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/special-tests/search [get]
func (h *SpecialTestHandler) SearchTests(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	q := c.QueryParam("q")
	if q == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Search query 'q' is required",
		})
	}

	limit := 20
	if limitStr := c.QueryParam("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	tests, err := h.svc.SpecialTest().SearchTests(c.Request().Context(), q, limit)
	if err != nil {
		log.Error().Err(err).Str("query", q).Msg("failed to search special tests")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to search special tests",
		})
	}

	results := make([]SpecialTestResponse, len(tests))
	for i, t := range tests {
		results[i] = toSpecialTestResponse(t)
	}

	return c.JSON(http.StatusOK, results)
}

// RecordResult records a special test result for a patient.
// @Summary Record special test result
// @Description Records a special test result (positive/negative/inconclusive) for a patient
// @Tags special-tests
// @Accept json
// @Produce json
// @Param result body model.CreateSpecialTestResultRequest true "Special test result data"
// @Success 201 {object} SpecialTestResultResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/special-tests/results [post]
func (h *SpecialTestHandler) RecordResult(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	var req model.CreateSpecialTestResultRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Failed to parse request body",
		})
	}

	if err := validator.Validate(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, ErrorResponse{
			Error:   "validation_failed",
			Message: "Request validation failed",
			Details: validator.FormatErrors(err),
		})
	}

	result, err := h.svc.SpecialTest().RecordTestResult(c.Request().Context(), user.UserID, &req)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusBadRequest, ErrorResponse{
				Error:   "invalid_request",
				Message: "Special test not found",
			})
		}
		log.Error().Err(err).Str("patient_id", req.PatientID).Msg("failed to record special test result")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to record special test result",
		})
	}

	return c.JSON(http.StatusCreated, toSpecialTestResultResponse(result))
}

// GetPatientResults retrieves all special test results for a patient.
// @Summary Get patient special test history
// @Description Retrieves all special test results recorded for a patient
// @Tags special-tests
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID"
// @Success 200 {array} SpecialTestResultResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/special-tests/results/patient/{patientId} [get]
func (h *SpecialTestHandler) GetPatientResults(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	patientID := c.Param("patientId")
	if patientID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Patient ID is required",
		})
	}

	results, err := h.svc.SpecialTest().GetPatientTestHistory(c.Request().Context(), patientID)
	if err != nil {
		log.Error().Err(err).Str("patient_id", patientID).Msg("failed to get patient special test results")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve patient special test results",
		})
	}

	responses := make([]SpecialTestResultResponse, len(results))
	for i, r := range results {
		responses[i] = toSpecialTestResultResponse(r)
	}

	return c.JSON(http.StatusOK, responses)
}

// toSpecialTestResponse converts a SpecialTest model to response.
func toSpecialTestResponse(t *model.SpecialTest) SpecialTestResponse {
	return SpecialTestResponse{
		ID:                t.ID,
		Name:              t.Name,
		NameVi:            t.NameVi,
		Category:          string(t.Category),
		Description:       t.Description,
		DescriptionVi:     t.DescriptionVi,
		PositiveFinding:   t.PositiveFinding,
		PositiveFindingVi: t.PositiveFindingVi,
		NegativeFinding:   t.NegativeFinding,
		NegativeFindingVi: t.NegativeFindingVi,
		Sensitivity:       t.Sensitivity,
		Specificity:       t.Specificity,
		CreatedAt:         t.CreatedAt.Format(time.RFC3339),
	}
}

// toSpecialTestResultResponse converts a PatientSpecialTestResult model to response.
func toSpecialTestResultResponse(r *model.PatientSpecialTestResult) SpecialTestResultResponse {
	return SpecialTestResultResponse{
		ID:            r.ID,
		PatientID:     r.PatientID,
		VisitID:       r.VisitID,
		SpecialTestID: r.SpecialTestID,
		Result:        string(r.Result),
		Notes:         r.Notes,
		TherapistID:   r.TherapistID,
		AssessedAt:    r.AssessedAt.Format(time.RFC3339),
		CreatedAt:     r.CreatedAt.Format(time.RFC3339),
		TestName:      r.TestName,
		TestNameVi:    r.TestNameVi,
		TestCategory:  string(r.TestCategory),
	}
}
