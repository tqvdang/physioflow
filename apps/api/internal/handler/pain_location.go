package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/middleware"
	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/service"
	"github.com/tqvdang/physioflow/apps/api/pkg/validator"
)

// PainLocationHandler handles pain location HTTP requests.
type PainLocationHandler struct {
	svc *service.Service
}

// NewPainLocationHandler creates a new PainLocationHandler.
func NewPainLocationHandler(svc *service.Service) *PainLocationHandler {
	return &PainLocationHandler{svc: svc}
}

// UpdatePainLocations updates pain locations for a treatment session.
// @Summary Update pain locations
// @Description Updates the pain locations marked on the anatomy diagram for a visit/session
// @Tags pain-locations
// @Accept json
// @Produce json
// @Param sessionId path string true "Session ID"
// @Param body body model.UpdatePainLocationsRequest true "Pain location data"
// @Success 200 {object} model.PainLocationsResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/sessions/{sessionId}/pain-locations [put]
func (h *PainLocationHandler) UpdatePainLocations(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	sessionID := c.Param("sessionId")
	if sessionID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Session ID is required",
		})
	}

	var req model.UpdatePainLocationsRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Failed to parse request body",
		})
	}

	req.SessionID = sessionID

	if err := validator.Validate(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, ErrorResponse{
			Error:   "validation_failed",
			Message: "Request validation failed",
			Details: validator.FormatErrors(err),
		})
	}

	// Validate region IDs
	for _, region := range req.Regions {
		if !model.ValidateRegionID(region.ID) {
			return c.JSON(http.StatusUnprocessableEntity, ErrorResponse{
				Error:   "validation_failed",
				Message: "Invalid anatomy region ID: " + region.ID,
			})
		}
		if region.Severity < 0 || region.Severity > 10 {
			return c.JSON(http.StatusUnprocessableEntity, ErrorResponse{
				Error:   "validation_failed",
				Message: "Severity must be between 0 and 10",
			})
		}
	}

	result, err := h.svc.PainLocation().UpdatePainLocations(c.Request().Context(), user.ClinicID, &req)
	if err != nil {
		log.Error().Err(err).Str("session_id", sessionID).Msg("failed to update pain locations")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to update pain locations",
		})
	}

	return c.JSON(http.StatusOK, result)
}

// GetPainLocations retrieves pain locations for a treatment session.
// @Summary Get pain locations
// @Description Retrieves the pain locations marked for a visit/session
// @Tags pain-locations
// @Produce json
// @Param sessionId path string true "Session ID"
// @Success 200 {object} model.PainLocationsResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/sessions/{sessionId}/pain-locations [get]
func (h *PainLocationHandler) GetPainLocations(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	sessionID := c.Param("sessionId")
	if sessionID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Session ID is required",
		})
	}

	result, err := h.svc.PainLocation().GetPainLocations(c.Request().Context(), sessionID)
	if err != nil {
		log.Error().Err(err).Str("session_id", sessionID).Msg("failed to get pain locations")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve pain locations",
		})
	}

	return c.JSON(http.StatusOK, result)
}
