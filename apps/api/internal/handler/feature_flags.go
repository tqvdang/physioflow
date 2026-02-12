package handler

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"physioflow/apps/api/internal/model"
)

// FeatureFlagHandler handles feature flag HTTP requests
type FeatureFlagHandler struct {
	repo model.FeatureFlagRepository
}

// NewFeatureFlagHandler creates a new feature flag handler
func NewFeatureFlagHandler(repo model.FeatureFlagRepository) *FeatureFlagHandler {
	return &FeatureFlagHandler{repo: repo}
}

// GetAll godoc
// @Summary Get all feature flags
// @Description Get all feature flags, optionally filtered by environment
// @Tags feature-flags
// @Accept json
// @Produce json
// @Param environment query string false "Filter by environment (dev, staging, prod)"
// @Success 200 {array} model.FeatureFlag
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/feature-flags [get]
func (h *FeatureFlagHandler) GetAll(c echo.Context) error {
	environment := c.QueryParam("environment")

	flags, err := h.repo.GetAll(environment)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Message: "Failed to fetch feature flags",
			Error:   err.Error(),
		})
	}

	return c.JSON(http.StatusOK, flags)
}

// GetByName godoc
// @Summary Get feature flag by name
// @Description Get a specific feature flag by its name
// @Tags feature-flags
// @Accept json
// @Produce json
// @Param name path string true "Feature flag name"
// @Success 200 {object} model.FeatureFlag
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/feature-flags/{name} [get]
func (h *FeatureFlagHandler) GetByName(c echo.Context) error {
	name := c.Param("name")

	flag, err := h.repo.GetByName(name)
	if err != nil {
		return c.JSON(http.StatusNotFound, ErrorResponse{
			Message: "Feature flag not found",
			Error:   err.Error(),
		})
	}

	return c.JSON(http.StatusOK, flag)
}

// Update godoc
// @Summary Update feature flag
// @Description Update an existing feature flag
// @Tags feature-flags
// @Accept json
// @Produce json
// @Param id path int true "Feature flag ID"
// @Param feature_flag body model.FeatureFlagUpdate true "Feature flag update data"
// @Success 200 {object} model.FeatureFlag
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/feature-flags/{id} [patch]
func (h *FeatureFlagHandler) Update(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Message: "Invalid feature flag ID",
			Error:   err.Error(),
		})
	}

	var update model.FeatureFlagUpdate
	if err := c.Bind(&update); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Message: "Invalid request body",
			Error:   err.Error(),
		})
	}

	// Get user from context (assumes auth middleware sets this)
	userID := c.Get("user_id")
	if userID != nil {
		if uid, ok := userID.(string); ok {
			update.UpdatedBy = uid
		}
	}

	// Get old value for audit log
	oldFlag, err := h.repo.GetByName("")
	if err == nil && oldFlag != nil {
		oldValue := model.Metadata{
			"enabled":            oldFlag.Enabled,
			"rollout_percentage": oldFlag.RolloutPercentage,
			"environment":        oldFlag.Environment,
		}

		flag, err := h.repo.Update(id, update)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, ErrorResponse{
				Message: "Failed to update feature flag",
				Error:   err.Error(),
			})
		}

		// Log the change
		newValue := model.Metadata{
			"enabled":            flag.Enabled,
			"rollout_percentage": flag.RolloutPercentage,
			"environment":        flag.Environment,
		}

		action := "updated"
		if update.Enabled != nil {
			if *update.Enabled {
				action = "enabled"
			} else {
				action = "disabled"
			}
		}

		ipAddress := c.RealIP()
		userAgent := c.Request().UserAgent()
		_ = h.repo.LogChange(id, action, &oldValue, &newValue, update.UpdatedBy, ipAddress, userAgent)

		return c.JSON(http.StatusOK, flag)
	}

	flag, err := h.repo.Update(id, update)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Message: "Failed to update feature flag",
			Error:   err.Error(),
		})
	}

	return c.JSON(http.StatusOK, flag)
}

// Create godoc
// @Summary Create feature flag
// @Description Create a new feature flag
// @Tags feature-flags
// @Accept json
// @Produce json
// @Param feature_flag body model.FeatureFlag true "Feature flag data"
// @Success 201 {object} model.FeatureFlag
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/feature-flags [post]
func (h *FeatureFlagHandler) Create(c echo.Context) error {
	var flag model.FeatureFlag
	if err := c.Bind(&flag); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Message: "Invalid request body",
			Error:   err.Error(),
		})
	}

	// Get user from context
	userID := c.Get("user_id")
	if userID != nil {
		if uid, ok := userID.(string); ok {
			flag.CreatedBy = &uid
		}
	}

	createdFlag, err := h.repo.Create(flag)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Message: "Failed to create feature flag",
			Error:   err.Error(),
		})
	}

	// Log creation
	newValue := model.Metadata{
		"name":               createdFlag.Name,
		"enabled":            createdFlag.Enabled,
		"rollout_percentage": createdFlag.RolloutPercentage,
	}
	ipAddress := c.RealIP()
	userAgent := c.Request().UserAgent()
	createdBy := ""
	if flag.CreatedBy != nil {
		createdBy = *flag.CreatedBy
	}
	_ = h.repo.LogChange(createdFlag.ID, "created", nil, &newValue, createdBy, ipAddress, userAgent)

	return c.JSON(http.StatusCreated, createdFlag)
}

// Delete godoc
// @Summary Delete feature flag
// @Description Delete a feature flag
// @Tags feature-flags
// @Accept json
// @Produce json
// @Param id path int true "Feature flag ID"
// @Success 204
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/feature-flags/{id} [delete]
func (h *FeatureFlagHandler) Delete(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Message: "Invalid feature flag ID",
			Error:   err.Error(),
		})
	}

	// Get user for audit log
	userID := ""
	if uid := c.Get("user_id"); uid != nil {
		if uidStr, ok := uid.(string); ok {
			userID = uidStr
		}
	}

	ipAddress := c.RealIP()
	userAgent := c.Request().UserAgent()
	_ = h.repo.LogChange(id, "deleted", nil, nil, userID, ipAddress, userAgent)

	if err := h.repo.Delete(id); err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Message: "Failed to delete feature flag",
			Error:   err.Error(),
		})
	}

	return c.NoContent(http.StatusNoContent)
}

// GetAuditLog godoc
// @Summary Get feature flag audit log
// @Description Get audit log for a specific feature flag
// @Tags feature-flags
// @Accept json
// @Produce json
// @Param id path int true "Feature flag ID"
// @Param limit query int false "Limit number of results" default(50)
// @Success 200 {array} model.FeatureFlagAuditLog
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/feature-flags/{id}/audit-log [get]
func (h *FeatureFlagHandler) GetAuditLog(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Message: "Invalid feature flag ID",
			Error:   err.Error(),
		})
	}

	limit := 50
	if limitParam := c.QueryParam("limit"); limitParam != "" {
		if l, err := strconv.Atoi(limitParam); err == nil && l > 0 {
			limit = l
		}
	}

	logs, err := h.repo.GetAuditLog(id, limit)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Message: "Failed to fetch audit log",
			Error:   err.Error(),
		})
	}

	return c.JSON(http.StatusOK, logs)
}

// CheckEnabled godoc
// @Summary Check if feature is enabled for user
// @Description Check if a specific feature flag is enabled for the current user
// @Tags feature-flags
// @Accept json
// @Produce json
// @Param name path string true "Feature flag name"
// @Success 200 {object} map[string]bool
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/feature-flags/{name}/check [get]
func (h *FeatureFlagHandler) CheckEnabled(c echo.Context) error {
	name := c.Param("name")

	flag, err := h.repo.GetByName(name)
	if err != nil {
		return c.JSON(http.StatusNotFound, ErrorResponse{
			Message: "Feature flag not found",
			Error:   err.Error(),
		})
	}

	// Get user ID from context
	userID := ""
	if uid := c.Get("user_id"); uid != nil {
		if uidStr, ok := uid.(string); ok {
			userID = uidStr
		}
	}

	enabled := flag.IsEnabledForUser(userID)

	return c.JSON(http.StatusOK, map[string]bool{
		"enabled": enabled,
	})
}
