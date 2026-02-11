package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/circuitbreaker"
	"github.com/tqvdang/physioflow/apps/api/internal/middleware"
	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
	"github.com/tqvdang/physioflow/apps/api/internal/service"
	"github.com/tqvdang/physioflow/apps/api/pkg/validator"
)

// isCircuitBreakerOpen checks if the error is due to an open circuit breaker
// and returns a 503 Service Unavailable response if so.
func isCircuitBreakerOpen(c echo.Context, err error) bool {
	if errors.Is(err, circuitbreaker.ErrCircuitOpen) {
		_ = c.JSON(http.StatusServiceUnavailable, ErrorResponse{
			Error:   "service_unavailable",
			Message: "The service is temporarily unavailable. Please try again shortly.",
		})
		return true
	}
	return false
}

// OutcomeMeasuresHandler handles outcome measure-related HTTP requests.
type OutcomeMeasuresHandler struct {
	svc *service.Service
}

// NewOutcomeMeasuresHandler creates a new OutcomeMeasuresHandler.
func NewOutcomeMeasuresHandler(svc *service.Service) *OutcomeMeasuresHandler {
	return &OutcomeMeasuresHandler{svc: svc}
}

// OutcomeMeasureResponse represents an outcome measure in API responses.
type OutcomeMeasureResponse struct {
	ID             string                        `json:"id"`
	PatientID      string                        `json:"patient_id"`
	ClinicID       string                        `json:"clinic_id"`
	TherapistID    string                        `json:"therapist_id"`
	LibraryID      string                        `json:"library_id"`
	MeasureType    string                        `json:"measure_type"`
	SessionID      *string                       `json:"session_id,omitempty"`
	Score          float64                       `json:"score"`
	MaxPossible    float64                       `json:"max_possible"`
	Percentage     *float64                      `json:"percentage,omitempty"`
	Responses      []model.MeasureResponse       `json:"responses,omitempty"`
	Interpretation *model.MeasureInterpretation   `json:"interpretation,omitempty"`
	Notes          string                        `json:"notes,omitempty"`
	MeasuredAt     string                        `json:"measured_at"`
	CreatedAt      string                        `json:"created_at"`
	UpdatedAt      string                        `json:"updated_at"`
	Version        int                           `json:"version"`
	Library        *OutcomeMeasureLibraryResponse `json:"library,omitempty"`
}

// OutcomeMeasureLibraryResponse represents a library entry in API responses.
type OutcomeMeasureLibraryResponse struct {
	ID             string                  `json:"id"`
	ClinicID       *string                 `json:"clinic_id,omitempty"`
	Code           string                  `json:"code"`
	MeasureType    string                  `json:"measure_type"`
	Category       string                  `json:"category"`
	Name           string                  `json:"name"`
	NameVi         string                  `json:"name_vi"`
	Description    string                  `json:"description,omitempty"`
	DescriptionVi  string                  `json:"description_vi,omitempty"`
	Instructions   string                  `json:"instructions,omitempty"`
	InstructionsVi string                  `json:"instructions_vi,omitempty"`
	MinScore       float64                 `json:"min_score"`
	MaxScore       float64                 `json:"max_score"`
	HigherIsBetter bool                    `json:"higher_is_better"`
	MCID           *float64                `json:"mcid,omitempty"`
	MDC            *float64                `json:"mdc,omitempty"`
	Questions      []model.MeasureQuestion `json:"questions,omitempty"`
	ScoringMethod  *model.ScoringMethod    `json:"scoring_method,omitempty"`
	BodyRegion     *string                 `json:"body_region,omitempty"`
	IsGlobal       bool                    `json:"is_global"`
	IsActive       bool                    `json:"is_active"`
	CreatedAt      string                  `json:"created_at"`
	UpdatedAt      string                  `json:"updated_at"`
}

// ProgressCalculationResponse represents a progress calculation in API responses.
type ProgressCalculationResponse struct {
	PatientID         string  `json:"patient_id"`
	MeasureType       string  `json:"measure_type"`
	LibraryID         string  `json:"library_id"`
	CurrentScore      float64 `json:"current_score"`
	PreviousScore     *float64 `json:"previous_score,omitempty"`
	BaselineScore     *float64 `json:"baseline_score,omitempty"`
	Change            *float64 `json:"change,omitempty"`
	ChangePercent     *float64 `json:"change_percent,omitempty"`
	MeetsMinChange    *bool   `json:"meets_mcid,omitempty"`
	Trend             string  `json:"trend"`
	TotalMeasurements int     `json:"total_measurements"`
	CalculatedAt      string  `json:"calculated_at"`
}

// TrendingDataResponse represents trending data in API responses.
type TrendingDataResponse struct {
	PatientID     string                   `json:"patient_id"`
	MeasureType   string                   `json:"measure_type"`
	LibraryID     string                   `json:"library_id"`
	MeasureName   string                   `json:"measure_name"`
	MeasureNameVi string                   `json:"measure_name_vi,omitempty"`
	DataPoints    []TrendDataPointResponse `json:"data_points"`
	Baseline      *float64                 `json:"baseline,omitempty"`
	Goal          *float64                 `json:"goal,omitempty"`
	MCID          *float64                 `json:"mcid,omitempty"`
	Trend         string                   `json:"trend"`
}

// TrendDataPointResponse represents a single trend data point in API responses.
type TrendDataPointResponse struct {
	Score      float64  `json:"score"`
	Percentage *float64 `json:"percentage,omitempty"`
	MeasuredAt string   `json:"measured_at"`
	SessionID  *string  `json:"session_id,omitempty"`
	Notes      string   `json:"notes,omitempty"`
}

// RecordMeasure records a new outcome measure for a patient.
// @Summary Record outcome measure
// @Description Records a new outcome measure score for a patient
// @Tags outcome-measures
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID"
// @Param measure body model.CreateOutcomeMeasureRequest true "Outcome measure data"
// @Success 201 {object} OutcomeMeasureResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/outcome-measures [post]
func (h *OutcomeMeasuresHandler) RecordMeasure(c echo.Context) error {
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

	var req model.CreateOutcomeMeasureRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Failed to parse request body",
		})
	}

	// Override patient ID from URL path
	req.PatientID = patientID

	if err := validator.Validate(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, ErrorResponse{
			Error:   "validation_failed",
			Message: "Request validation failed",
			Details: validator.FormatErrors(err),
		})
	}

	measure, err := h.svc.OutcomeMeasures().RecordMeasure(c.Request().Context(), user.ClinicID, user.UserID, &req)
	if err != nil {
		if isCircuitBreakerOpen(c, err) {
			return nil
		}
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Outcome measure library entry not found",
			})
		}
		log.Error().Err(err).Str("patient_id", patientID).Msg("failed to record outcome measure")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to record outcome measure",
		})
	}

	return c.JSON(http.StatusCreated, toOutcomeMeasureResponse(measure))
}

// GetPatientMeasures retrieves all outcome measures for a patient.
// @Summary Get patient outcome measures
// @Description Retrieves all outcome measure records for a patient
// @Tags outcome-measures
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID"
// @Success 200 {array} OutcomeMeasureResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/outcome-measures [get]
func (h *OutcomeMeasuresHandler) GetPatientMeasures(c echo.Context) error {
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

	measures, err := h.svc.OutcomeMeasures().GetPatientMeasures(c.Request().Context(), patientID)
	if err != nil {
		if isCircuitBreakerOpen(c, err) {
			return nil
		}
		log.Error().Err(err).Str("patient_id", patientID).Msg("failed to get patient outcome measures")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve outcome measures",
		})
	}

	results := make([]OutcomeMeasureResponse, len(measures))
	for i, m := range measures {
		results[i] = toOutcomeMeasureResponse(m)
	}

	return c.JSON(http.StatusOK, results)
}

// CalculateProgress calculates progress for a patient on a specific measure type.
// @Summary Calculate outcome measure progress
// @Description Calculates progress comparing baseline to current score for a measure type
// @Tags outcome-measures
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID"
// @Param measureType query string true "Measure type" Enums(vas, nrs, ndi, odi, dash, lefs, koos, womac, sf36, bbs, tug, fim, mmt, rom, custom)
// @Success 200 {object} ProgressCalculationResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/outcome-measures/progress [get]
func (h *OutcomeMeasuresHandler) CalculateProgress(c echo.Context) error {
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

	measureType := c.QueryParam("measureType")
	if measureType == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Query parameter 'measureType' is required",
		})
	}

	progress, err := h.svc.OutcomeMeasures().CalculateProgress(c.Request().Context(), patientID, model.MeasureType(measureType))
	if err != nil {
		if isCircuitBreakerOpen(c, err) {
			return nil
		}
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "No measures found for this patient and type",
			})
		}
		log.Error().Err(err).
			Str("patient_id", patientID).
			Str("measure_type", measureType).
			Msg("failed to calculate progress")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to calculate progress",
		})
	}

	return c.JSON(http.StatusOK, toProgressCalculationResponse(progress))
}

// GetTrending retrieves trending data for a patient and measure type.
// @Summary Get outcome measure trending data
// @Description Retrieves time-series data points for charting trends
// @Tags outcome-measures
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID"
// @Param measureType query string true "Measure type" Enums(vas, nrs, ndi, odi, dash, lefs, koos, womac, sf36, bbs, tug, fim, mmt, rom, custom)
// @Success 200 {object} TrendingDataResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/outcome-measures/trending [get]
func (h *OutcomeMeasuresHandler) GetTrending(c echo.Context) error {
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

	measureType := c.QueryParam("measureType")
	if measureType == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Query parameter 'measureType' is required",
		})
	}

	trending, err := h.svc.OutcomeMeasures().GetTrending(c.Request().Context(), patientID, model.MeasureType(measureType))
	if err != nil {
		if isCircuitBreakerOpen(c, err) {
			return nil
		}
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "No trending data found for this patient and measure type",
			})
		}
		log.Error().Err(err).
			Str("patient_id", patientID).
			Str("measure_type", measureType).
			Msg("failed to get trending data")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve trending data",
		})
	}

	return c.JSON(http.StatusOK, toTrendingDataResponse(trending))
}

// GetMeasureLibrary retrieves all available outcome measure definitions.
// @Summary Get outcome measure library
// @Description Retrieves all standardized outcome measure definitions
// @Tags outcome-measures
// @Accept json
// @Produce json
// @Success 200 {array} OutcomeMeasureLibraryResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/outcome-measures/library [get]
func (h *OutcomeMeasuresHandler) GetMeasureLibrary(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	library, err := h.svc.OutcomeMeasures().GetMeasureLibrary(c.Request().Context())
	if err != nil {
		if isCircuitBreakerOpen(c, err) {
			return nil
		}
		log.Error().Err(err).Msg("failed to get outcome measure library")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve outcome measure library",
		})
	}

	results := make([]OutcomeMeasureLibraryResponse, len(library))
	for i, lib := range library {
		results[i] = toOutcomeMeasureLibraryResponse(lib)
	}

	return c.JSON(http.StatusOK, results)
}

// toOutcomeMeasureResponse converts an OutcomeMeasure model to OutcomeMeasureResponse.
func toOutcomeMeasureResponse(m *model.OutcomeMeasure) OutcomeMeasureResponse {
	resp := OutcomeMeasureResponse{
		ID:             m.ID,
		PatientID:      m.PatientID,
		ClinicID:       m.ClinicID,
		TherapistID:    m.TherapistID,
		LibraryID:      m.LibraryID,
		MeasureType:    string(m.MeasureType),
		SessionID:      m.SessionID,
		Score:          m.Score,
		MaxPossible:    m.MaxPossible,
		Percentage:     m.Percentage,
		Responses:      m.Responses,
		Interpretation: m.Interpretation,
		Notes:          m.Notes,
		MeasuredAt:     m.MeasuredAt.Format(time.RFC3339),
		CreatedAt:      m.CreatedAt.Format(time.RFC3339),
		UpdatedAt:      m.UpdatedAt.Format(time.RFC3339),
		Version:        m.Version,
	}

	if m.Library != nil {
		libResp := toOutcomeMeasureLibraryResponse(m.Library)
		resp.Library = &libResp
	}

	return resp
}

// toOutcomeMeasureLibraryResponse converts an OutcomeMeasureLibrary model to response.
func toOutcomeMeasureLibraryResponse(lib *model.OutcomeMeasureLibrary) OutcomeMeasureLibraryResponse {
	return OutcomeMeasureLibraryResponse{
		ID:             lib.ID,
		ClinicID:       lib.ClinicID,
		Code:           lib.Code,
		MeasureType:    string(lib.MeasureType),
		Category:       string(lib.Category),
		Name:           lib.Name,
		NameVi:         lib.NameVi,
		Description:    lib.Description,
		DescriptionVi:  lib.DescriptionVi,
		Instructions:   lib.Instructions,
		InstructionsVi: lib.InstructionsVi,
		MinScore:       lib.MinScore,
		MaxScore:       lib.MaxScore,
		HigherIsBetter: lib.HigherIsBetter,
		MCID:           lib.MCID,
		MDC:            lib.MDC,
		Questions:      lib.Questions,
		ScoringMethod:  lib.ScoringMethod,
		BodyRegion:     lib.BodyRegion,
		IsGlobal:       lib.IsGlobal,
		IsActive:       lib.IsActive,
		CreatedAt:      lib.CreatedAt.Format(time.RFC3339),
		UpdatedAt:      lib.UpdatedAt.Format(time.RFC3339),
	}
}

// toProgressCalculationResponse converts a ProgressCalculation model to response.
func toProgressCalculationResponse(p *model.ProgressCalculation) ProgressCalculationResponse {
	return ProgressCalculationResponse{
		PatientID:         p.PatientID,
		MeasureType:       string(p.MeasureType),
		LibraryID:         p.LibraryID,
		CurrentScore:      p.CurrentScore,
		PreviousScore:     p.PreviousScore,
		BaselineScore:     p.BaselineScore,
		Change:            p.Change,
		ChangePercent:     p.ChangePercent,
		MeetsMinChange:    p.MeetsMinChange,
		Trend:             string(p.Trend),
		TotalMeasurements: p.TotalMeasurements,
		CalculatedAt:      p.CalculatedAt.Format(time.RFC3339),
	}
}

// UpdateMeasure updates an existing outcome measure.
// @Summary Update outcome measure
// @Description Updates an existing outcome measure record for a patient
// @Tags outcome-measures
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID"
// @Param measureId path string true "Measure ID"
// @Param measure body model.UpdateOutcomeMeasureRequest true "Updated outcome measure data"
// @Success 200 {object} OutcomeMeasureResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/outcome-measures/{measureId} [put]
func (h *OutcomeMeasuresHandler) UpdateMeasure(c echo.Context) error {
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

	measureID := c.Param("measureId")
	if measureID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Measure ID is required",
		})
	}

	var req model.UpdateOutcomeMeasureRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Failed to parse request body",
		})
	}

	// Set IDs from URL path
	req.MeasureID = measureID
	req.PatientID = patientID

	if err := validator.Validate(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, ErrorResponse{
			Error:   "validation_failed",
			Message: "Request validation failed",
			Details: validator.FormatErrors(err),
		})
	}

	measure, err := h.svc.OutcomeMeasures().UpdateMeasure(c.Request().Context(), user.ClinicID, user.UserID, &req)
	if err != nil {
		if isCircuitBreakerOpen(c, err) {
			return nil
		}
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Outcome measure not found",
			})
		}
		if errors.Is(err, repository.ErrVersionConflict) {
			return c.JSON(http.StatusConflict, ErrorResponse{
				Error:   "version_conflict",
				Message: "This record was modified by another request. Please reload and try again.",
			})
		}
		log.Error().Err(err).Str("measure_id", measureID).Msg("failed to update outcome measure")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to update outcome measure",
		})
	}

	return c.JSON(http.StatusOK, toOutcomeMeasureResponse(measure))
}

// DeleteMeasure deletes an existing outcome measure.
// @Summary Delete outcome measure
// @Description Deletes an outcome measure record
// @Tags outcome-measures
// @Produce json
// @Param patientId path string true "Patient ID"
// @Param measureId path string true "Measure ID"
// @Success 204 "No Content"
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/outcome-measures/{measureId} [delete]
func (h *OutcomeMeasuresHandler) DeleteMeasure(c echo.Context) error {
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

	measureID := c.Param("measureId")
	if measureID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Measure ID is required",
		})
	}

	err := h.svc.OutcomeMeasures().DeleteMeasure(c.Request().Context(), patientID, measureID, user.UserID)
	if err != nil {
		if isCircuitBreakerOpen(c, err) {
			return nil
		}
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Outcome measure not found",
			})
		}
		log.Error().Err(err).Str("measure_id", measureID).Msg("failed to delete outcome measure")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to delete outcome measure",
		})
	}

	return c.NoContent(http.StatusNoContent)
}

// toTrendingDataResponse converts TrendingData model to response.
func toTrendingDataResponse(t *model.TrendingData) TrendingDataResponse {
	dataPoints := make([]TrendDataPointResponse, len(t.DataPoints))
	for i, dp := range t.DataPoints {
		dataPoints[i] = TrendDataPointResponse{
			Score:      dp.Score,
			Percentage: dp.Percentage,
			MeasuredAt: dp.MeasuredAt.Format(time.RFC3339),
			SessionID:  dp.SessionID,
			Notes:      dp.Notes,
		}
	}

	return TrendingDataResponse{
		PatientID:     t.PatientID,
		MeasureType:   string(t.MeasureType),
		LibraryID:     t.LibraryID,
		MeasureName:   t.MeasureName,
		MeasureNameVi: t.MeasureNameVi,
		DataPoints:    dataPoints,
		Baseline:      t.Baseline,
		Goal:          t.Goal,
		MCID:          t.MCID,
		Trend:         string(t.Trend),
	}
}
