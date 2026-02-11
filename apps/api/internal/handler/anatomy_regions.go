package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/tqvdang/physioflow/apps/api/internal/middleware"
	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// AnatomyRegionsHandler handles anatomy regions HTTP requests.
type AnatomyRegionsHandler struct{}

// NewAnatomyRegionsHandler creates a new AnatomyRegionsHandler.
func NewAnatomyRegionsHandler() *AnatomyRegionsHandler {
	return &AnatomyRegionsHandler{}
}

// AnatomyRegionResponse represents an anatomy region in API responses.
type AnatomyRegionResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	NameVi      string `json:"name_vi"`
	Category    string `json:"category"`
	View        string `json:"view"` // "front" or "back"
	Side        string `json:"side,omitempty"` // "left", "right", or "bilateral"
	Description string `json:"description,omitempty"`
}

// ListRegions retrieves all available anatomy regions.
// @Summary List anatomy regions
// @Description Retrieves all available anatomy regions for pain location marking
// @Tags anatomy
// @Produce json
// @Success 200 {array} AnatomyRegionResponse
// @Failure 401 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/anatomy/regions [get]
func (h *AnatomyRegionsHandler) ListRegions(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	regions := model.GetAllAnatomyRegions()
	responses := make([]AnatomyRegionResponse, len(regions))
	for i, region := range regions {
		responses[i] = toAnatomyRegionResponse(region)
	}

	return c.JSON(http.StatusOK, responses)
}

// GetRegion retrieves details for a specific anatomy region.
// @Summary Get anatomy region
// @Description Retrieves details for a specific anatomy region by ID
// @Tags anatomy
// @Produce json
// @Param id path string true "Region ID"
// @Success 200 {object} AnatomyRegionResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/anatomy/regions/{id} [get]
func (h *AnatomyRegionsHandler) GetRegion(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	regionID := c.Param("id")
	if regionID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Region ID is required",
		})
	}

	region, exists := model.GetAnatomyRegion(regionID)
	if !exists {
		return c.JSON(http.StatusNotFound, ErrorResponse{
			Error:   "not_found",
			Message: "Anatomy region not found",
		})
	}

	return c.JSON(http.StatusOK, toAnatomyRegionResponse(region))
}

// toAnatomyRegionResponse converts an AnatomyRegion model to response.
func toAnatomyRegionResponse(region model.AnatomyRegion) AnatomyRegionResponse {
	return AnatomyRegionResponse{
		ID:          region.ID,
		Name:        region.Name,
		NameVi:      region.NameVi,
		Category:    region.Category,
		View:        region.View,
		Side:        region.Side,
		Description: region.Description,
	}
}
