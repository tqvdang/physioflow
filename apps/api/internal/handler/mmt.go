package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/middleware"
	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
	"github.com/tqvdang/physioflow/apps/api/internal/service"
	"github.com/tqvdang/physioflow/apps/api/pkg/validator"
)

// MMTHandler handles MMT assessment HTTP requests.
type MMTHandler struct {
	svc *service.Service
}

// NewMMTHandler creates a new MMTHandler.
func NewMMTHandler(svc *service.Service) *MMTHandler {
	return &MMTHandler{svc: svc}
}

// MMTAssessmentResponse represents a MMT assessment in API responses.
type MMTAssessmentResponse struct {
	ID          string  `json:"id"`
	PatientID   string  `json:"patient_id"`
	VisitID     *string `json:"visit_id,omitempty"`
	ClinicID    string  `json:"clinic_id"`
	TherapistID string  `json:"therapist_id"`
	MuscleGroup string  `json:"muscle_group"`
	Side        string  `json:"side"`
	Grade       float64 `json:"grade"`
	Notes       string  `json:"notes,omitempty"`
	AssessedAt  string  `json:"assessed_at"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

// MMTTrendingResponse represents MMT trending data in API responses.
type MMTTrendingResponse struct {
	PatientID   string                      `json:"patient_id"`
	MuscleGroup string                      `json:"muscle_group"`
	Side        string                      `json:"side"`
	DataPoints  []MMTTrendDataPointResponse `json:"data_points"`
	Baseline    *float64                    `json:"baseline,omitempty"`
	Current     *float64                    `json:"current,omitempty"`
	Change      *float64                    `json:"change,omitempty"`
	Trend       string                      `json:"trend"`
}

// MMTTrendDataPointResponse represents a single MMT trend data point.
type MMTTrendDataPointResponse struct {
	Grade      float64 `json:"grade"`
	AssessedAt string  `json:"assessed_at"`
	Notes      string  `json:"notes,omitempty"`
}

// RecordMMT records a new MMT assessment for a patient.
// @Summary Record MMT assessment
// @Description Records a new manual muscle testing measurement for a patient
// @Tags assessments
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID"
// @Param assessment body model.CreateMMTAssessmentRequest true "MMT assessment data"
// @Success 201 {object} MMTAssessmentResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/assessments/mmt [post]
func (h *MMTHandler) RecordMMT(c echo.Context) error {
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

	var req model.CreateMMTAssessmentRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Failed to parse request body",
		})
	}

	req.PatientID = patientID

	if err := validator.Validate(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, ErrorResponse{
			Error:   "validation_failed",
			Message: "Request validation failed",
			Details: validator.FormatErrors(err),
		})
	}

	assessment, err := h.svc.MMT().RecordAssessment(c.Request().Context(), user.ClinicID, user.UserID, &req)
	if err != nil {
		log.Error().Err(err).Str("patient_id", patientID).Msg("failed to record MMT assessment")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to record MMT assessment",
		})
	}

	return c.JSON(http.StatusCreated, toMMTAssessmentResponse(assessment))
}

// GetPatientMMT retrieves all MMT assessments for a patient.
// @Summary Get patient MMT assessments
// @Description Retrieves all MMT assessment records for a patient
// @Tags assessments
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID"
// @Success 200 {array} MMTAssessmentResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/assessments/mmt [get]
func (h *MMTHandler) GetPatientMMT(c echo.Context) error {
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

	assessments, err := h.svc.MMT().GetByPatientID(c.Request().Context(), patientID)
	if err != nil {
		log.Error().Err(err).Str("patient_id", patientID).Msg("failed to get patient MMT assessments")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve MMT assessments",
		})
	}

	results := make([]MMTAssessmentResponse, len(assessments))
	for i, a := range assessments {
		results[i] = toMMTAssessmentResponse(a)
	}

	return c.JSON(http.StatusOK, results)
}

// GetMMTTrending retrieves MMT trending data for a specific muscle group.
// @Summary Get MMT trending data
// @Description Retrieves time-series MMT data for charting trends
// @Tags assessments
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID"
// @Param muscleGroup query string true "Muscle Group"
// @Param side query string true "Side" Enums(left, right, bilateral)
// @Success 200 {object} MMTTrendingResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/assessments/mmt/trending [get]
func (h *MMTHandler) GetMMTTrending(c echo.Context) error {
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

	muscleGroup := c.QueryParam("muscleGroup")
	side := c.QueryParam("side")

	if muscleGroup == "" || side == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Query parameters 'muscleGroup' and 'side' are required",
		})
	}

	trending, err := h.svc.MMT().GetTrending(
		c.Request().Context(),
		patientID,
		muscleGroup,
		model.MMTSide(side),
	)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "No MMT data found for this muscle group/side",
			})
		}
		log.Error().Err(err).
			Str("patient_id", patientID).
			Str("muscle_group", muscleGroup).
			Msg("failed to get MMT trending data")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve MMT trending data",
		})
	}

	return c.JSON(http.StatusOK, toMMTTrendingResponse(trending))
}

// toMMTAssessmentResponse converts a MMTAssessment model to response.
func toMMTAssessmentResponse(a *model.MMTAssessment) MMTAssessmentResponse {
	return MMTAssessmentResponse{
		ID:          a.ID,
		PatientID:   a.PatientID,
		VisitID:     a.VisitID,
		ClinicID:    a.ClinicID,
		TherapistID: a.TherapistID,
		MuscleGroup: a.MuscleGroup,
		Side:        string(a.Side),
		Grade:       a.Grade,
		Notes:       a.Notes,
		AssessedAt:  a.AssessedAt.Format(time.RFC3339),
		CreatedAt:   a.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   a.UpdatedAt.Format(time.RFC3339),
	}
}

// toMMTTrendingResponse converts a MMTTrendingData model to response.
func toMMTTrendingResponse(t *model.MMTTrendingData) MMTTrendingResponse {
	dataPoints := make([]MMTTrendDataPointResponse, len(t.DataPoints))
	for i, dp := range t.DataPoints {
		dataPoints[i] = MMTTrendDataPointResponse{
			Grade:      dp.Grade,
			AssessedAt: dp.AssessedAt.Format(time.RFC3339),
			Notes:      dp.Notes,
		}
	}

	return MMTTrendingResponse{
		PatientID:   t.PatientID,
		MuscleGroup: t.MuscleGroup,
		Side:        string(t.Side),
		DataPoints:  dataPoints,
		Baseline:    t.Baseline,
		Current:     t.Current,
		Change:      t.Change,
		Trend:       string(t.Trend),
	}
}
