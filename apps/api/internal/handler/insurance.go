package handler

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/middleware"
	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
	"github.com/tqvdang/physioflow/apps/api/internal/service"
	"github.com/tqvdang/physioflow/apps/api/pkg/validator"
)

// InsuranceHandler handles BHYT insurance HTTP requests.
type InsuranceHandler struct {
	svc *service.Service
}

// NewInsuranceHandler creates a new InsuranceHandler.
func NewInsuranceHandler(svc *service.Service) *InsuranceHandler {
	return &InsuranceHandler{svc: svc}
}

// CreateInsurance registers a new BHYT card for a patient.
// @Summary Create insurance card
// @Description Registers a new BHYT insurance card for a patient
// @Tags insurance
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID (UUID)"
// @Param card body model.CreateBHYTCardRequest true "BHYT card data"
// @Success 201 {object} model.BHYTCard
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/insurance [post]
func (h *InsuranceHandler) CreateInsurance(c echo.Context) error {
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

	var req model.CreateBHYTCardRequest
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

	card, err := h.svc.Insurance().CreateInsurance(c.Request().Context(), patientID, user.ClinicID, user.UserID, &req)
	if err != nil {
		if errors.Is(err, repository.ErrInvalidInput) {
			return c.JSON(http.StatusBadRequest, ErrorResponse{
				Error:   "invalid_input",
				Message: err.Error(),
			})
		}
		log.Error().Err(err).Str("patient_id", patientID).Msg("failed to create insurance card")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to create insurance card",
		})
	}

	return c.JSON(http.StatusCreated, card)
}

// GetPatientInsurance retrieves the active BHYT card for a patient.
// @Summary Get patient insurance
// @Description Retrieves the active BHYT insurance card for a patient
// @Tags insurance
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID (UUID)"
// @Success 200 {object} model.BHYTCard
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/insurance [get]
func (h *InsuranceHandler) GetPatientInsurance(c echo.Context) error {
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

	card, err := h.svc.Insurance().GetPatientInsurance(c.Request().Context(), patientID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "No active insurance card found for this patient",
			})
		}
		log.Error().Err(err).Str("patient_id", patientID).Msg("failed to get patient insurance")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve patient insurance",
		})
	}

	return c.JSON(http.StatusOK, card)
}

// UpdateInsurance updates an existing BHYT card.
// @Summary Update insurance card
// @Description Updates an existing BHYT insurance card
// @Tags insurance
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID (UUID)"
// @Param id path string true "Insurance card ID (UUID)"
// @Param card body model.UpdateBHYTCardRequest true "BHYT card update data"
// @Success 200 {object} model.BHYTCard
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/insurance/{id} [put]
func (h *InsuranceHandler) UpdateInsurance(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	id := c.Param("id")
	if id == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Insurance card ID is required",
		})
	}

	var req model.UpdateBHYTCardRequest
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

	card, err := h.svc.Insurance().UpdateInsurance(c.Request().Context(), id, user.UserID, &req)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Insurance card not found",
			})
		}
		if errors.Is(err, repository.ErrVersionConflict) {
			return c.JSON(http.StatusConflict, ErrorResponse{
				Error:   "conflict",
				Message: "Insurance card has been modified by another request. Please retry.",
			})
		}
		if errors.Is(err, repository.ErrInvalidInput) {
			return c.JSON(http.StatusBadRequest, ErrorResponse{
				Error:   "invalid_input",
				Message: err.Error(),
			})
		}
		log.Error().Err(err).Str("card_id", id).Msg("failed to update insurance card")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to update insurance card",
		})
	}

	return c.JSON(http.StatusOK, card)
}

// ValidateBHYTCard validates a BHYT card number.
// @Summary Validate BHYT card
// @Description Validates a BHYT card number format, prefix, and expiration
// @Tags insurance
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID (UUID)"
// @Param request body model.ValidateBHYTCardRequest true "Card number to validate"
// @Success 200 {object} model.BHYTValidationResult
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/insurance/validate [post]
func (h *InsuranceHandler) ValidateBHYTCard(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	var req model.ValidateBHYTCardRequest
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

	result, err := h.svc.Insurance().ValidateBHYTCard(c.Request().Context(), req.CardNumber, user.UserID)
	if err != nil {
		log.Error().Err(err).Str("card_number", req.CardNumber).Msg("failed to validate BHYT card")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to validate BHYT card",
		})
	}

	return c.JSON(http.StatusOK, result)
}

// CalculateCoverage calculates the BHYT coverage for a patient.
// @Summary Calculate BHYT coverage
// @Description Computes the insurance coverage amount for a patient's treatment
// @Tags insurance
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID (UUID)"
// @Param request body model.CalculateCoverageRequest true "Coverage calculation input"
// @Success 200 {object} model.CoverageCalculation
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/insurance/calculate-coverage [post]
func (h *InsuranceHandler) CalculateCoverage(c echo.Context) error {
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

	var req model.CalculateCoverageRequest
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

	calculation, err := h.svc.Insurance().CalculateCoverage(c.Request().Context(), patientID, &req)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "No active insurance card found for this patient",
			})
		}
		if errors.Is(err, service.ErrCardExpired) {
			return c.JSON(http.StatusBadRequest, ErrorResponse{
				Error:   "card_expired",
				Message: err.Error(),
			})
		}
		if errors.Is(err, service.ErrFacilityMismatch) {
			return c.JSON(http.StatusForbidden, ErrorResponse{
				Error:   "facility_mismatch",
				Message: err.Error(),
			})
		}
		if errors.Is(err, repository.ErrInvalidInput) {
			return c.JSON(http.StatusBadRequest, ErrorResponse{
				Error:   "invalid_input",
				Message: err.Error(),
			})
		}
		log.Error().Err(err).Str("patient_id", patientID).Msg("failed to calculate coverage")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to calculate coverage",
		})
	}

	return c.JSON(http.StatusOK, calculation)
}
