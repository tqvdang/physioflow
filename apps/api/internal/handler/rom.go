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

// ROMHandler handles ROM assessment HTTP requests.
type ROMHandler struct {
	svc *service.Service
}

// NewROMHandler creates a new ROMHandler.
func NewROMHandler(svc *service.Service) *ROMHandler {
	return &ROMHandler{svc: svc}
}

// ROMAssessmentResponse represents a ROM assessment in API responses.
type ROMAssessmentResponse struct {
	ID           string  `json:"id"`
	PatientID    string  `json:"patient_id"`
	VisitID      *string `json:"visit_id,omitempty"`
	ClinicID     string  `json:"clinic_id"`
	TherapistID  string  `json:"therapist_id"`
	Joint        string  `json:"joint"`
	Side         string  `json:"side"`
	MovementType string  `json:"movement_type"`
	Degree       float64 `json:"degree"`
	Notes        string  `json:"notes,omitempty"`
	AssessedAt   string  `json:"assessed_at"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}

// ROMTrendingResponse represents ROM trending data in API responses.
type ROMTrendingResponse struct {
	PatientID    string                     `json:"patient_id"`
	Joint        string                     `json:"joint"`
	Side         string                     `json:"side"`
	MovementType string                     `json:"movement_type"`
	DataPoints   []ROMTrendDataPointResponse `json:"data_points"`
	Baseline     *float64                   `json:"baseline,omitempty"`
	Current      *float64                   `json:"current,omitempty"`
	Change       *float64                   `json:"change,omitempty"`
	Trend        string                     `json:"trend"`
}

// ROMTrendDataPointResponse represents a single ROM trend data point.
type ROMTrendDataPointResponse struct {
	Degree     float64 `json:"degree"`
	AssessedAt string  `json:"assessed_at"`
	Notes      string  `json:"notes,omitempty"`
}

// RecordROM records a new ROM assessment for a patient.
// @Summary Record ROM assessment
// @Description Records a new range of motion measurement for a patient
// @Tags assessments
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID"
// @Param assessment body model.CreateROMAssessmentRequest true "ROM assessment data"
// @Success 201 {object} ROMAssessmentResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/assessments/rom [post]
func (h *ROMHandler) RecordROM(c echo.Context) error {
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

	var req model.CreateROMAssessmentRequest
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

	assessment, err := h.svc.ROM().RecordAssessment(c.Request().Context(), user.ClinicID, user.UserID, &req)
	if err != nil {
		log.Error().Err(err).Str("patient_id", patientID).Msg("failed to record ROM assessment")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to record ROM assessment",
		})
	}

	return c.JSON(http.StatusCreated, toROMAssessmentResponse(assessment))
}

// GetPatientROM retrieves all ROM assessments for a patient.
// @Summary Get patient ROM assessments
// @Description Retrieves all ROM assessment records for a patient
// @Tags assessments
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID"
// @Success 200 {array} ROMAssessmentResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/assessments/rom [get]
func (h *ROMHandler) GetPatientROM(c echo.Context) error {
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

	assessments, err := h.svc.ROM().GetByPatientID(c.Request().Context(), patientID)
	if err != nil {
		log.Error().Err(err).Str("patient_id", patientID).Msg("failed to get patient ROM assessments")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve ROM assessments",
		})
	}

	results := make([]ROMAssessmentResponse, len(assessments))
	for i, a := range assessments {
		results[i] = toROMAssessmentResponse(a)
	}

	return c.JSON(http.StatusOK, results)
}

// GetROMTrending retrieves ROM trending data for a specific joint.
// @Summary Get ROM trending data
// @Description Retrieves time-series ROM data for charting trends
// @Tags assessments
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID"
// @Param joint query string true "Joint" Enums(shoulder, elbow, wrist, hip, knee, ankle, cervical_spine, thoracic_spine, lumbar_spine)
// @Param side query string true "Side" Enums(left, right, bilateral)
// @Param movementType query string true "Movement Type" Enums(active, passive)
// @Success 200 {object} ROMTrendingResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/assessments/rom/trending [get]
func (h *ROMHandler) GetROMTrending(c echo.Context) error {
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

	joint := c.QueryParam("joint")
	side := c.QueryParam("side")
	movementType := c.QueryParam("movementType")

	if joint == "" || side == "" || movementType == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Query parameters 'joint', 'side', and 'movementType' are required",
		})
	}

	trending, err := h.svc.ROM().GetTrending(
		c.Request().Context(),
		patientID,
		model.ROMJoint(joint),
		model.ROMSide(side),
		model.ROMMovementType(movementType),
	)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "No ROM data found for this joint/side/movement type",
			})
		}
		log.Error().Err(err).
			Str("patient_id", patientID).
			Str("joint", joint).
			Msg("failed to get ROM trending data")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve ROM trending data",
		})
	}

	return c.JSON(http.StatusOK, toROMTrendingResponse(trending))
}

// toROMAssessmentResponse converts a ROMAssessment model to response.
func toROMAssessmentResponse(a *model.ROMAssessment) ROMAssessmentResponse {
	return ROMAssessmentResponse{
		ID:           a.ID,
		PatientID:    a.PatientID,
		VisitID:      a.VisitID,
		ClinicID:     a.ClinicID,
		TherapistID:  a.TherapistID,
		Joint:        string(a.Joint),
		Side:         string(a.Side),
		MovementType: string(a.MovementType),
		Degree:       a.Degree,
		Notes:        a.Notes,
		AssessedAt:   a.AssessedAt.Format(time.RFC3339),
		CreatedAt:    a.CreatedAt.Format(time.RFC3339),
		UpdatedAt:    a.UpdatedAt.Format(time.RFC3339),
	}
}

// toROMTrendingResponse converts a ROMTrendingData model to response.
func toROMTrendingResponse(t *model.ROMTrendingData) ROMTrendingResponse {
	dataPoints := make([]ROMTrendDataPointResponse, len(t.DataPoints))
	for i, dp := range t.DataPoints {
		dataPoints[i] = ROMTrendDataPointResponse{
			Degree:     dp.Degree,
			AssessedAt: dp.AssessedAt.Format(time.RFC3339),
			Notes:      dp.Notes,
		}
	}

	return ROMTrendingResponse{
		PatientID:    t.PatientID,
		Joint:        string(t.Joint),
		Side:         string(t.Side),
		MovementType: string(t.MovementType),
		DataPoints:   dataPoints,
		Baseline:     t.Baseline,
		Current:      t.Current,
		Change:       t.Change,
		Trend:        string(t.Trend),
	}
}
