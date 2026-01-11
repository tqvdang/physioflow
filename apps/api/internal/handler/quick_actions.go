package handler

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/tqvdang/physioflow/apps/api/internal/middleware"
	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/service"
	"github.com/tqvdang/physioflow/apps/api/pkg/validator"
)

// QuickActionsHandler handles quick action HTTP requests.
type QuickActionsHandler struct {
	svc *service.Service
}

// NewQuickActionsHandler creates a new QuickActionsHandler.
func NewQuickActionsHandler(svc *service.Service) *QuickActionsHandler {
	return &QuickActionsHandler{svc: svc}
}

// =============================================================================
// REQUEST/RESPONSE TYPES
// =============================================================================

// QuickPainRequest represents the request body for quick pain recording.
type QuickPainRequest struct {
	Level      int    `json:"level" validate:"required,min=0,max=10"`
	Location   string `json:"location,omitempty"`
	BodyRegion string `json:"body_region,omitempty"`
	Notes      string `json:"notes,omitempty"`
	Context    string `json:"context,omitempty"` // pre_session, post_session, follow_up
}

// QuickPainResponse represents the response for quick pain recording.
type QuickPainResponse struct {
	ID            string  `json:"id"`
	Level         int     `json:"level"`
	Location      string  `json:"location,omitempty"`
	BodyRegion    string  `json:"body_region,omitempty"`
	RecordedAt    string  `json:"recorded_at"`
	Delta         *PainDeltaResponse `json:"delta,omitempty"`
}

// PainDeltaResponse represents the pain level change.
type PainDeltaResponse struct {
	CurrentLevel  int      `json:"current_level"`
	PreviousLevel *int     `json:"previous_level,omitempty"`
	Delta         *int     `json:"delta,omitempty"`
	DeltaPercent  *float64 `json:"delta_percent,omitempty"`
	Trend         string   `json:"trend"` // improved, worsened, stable, first_record
}

// QuickROMRequest represents the request body for quick ROM recording.
type QuickROMRequest struct {
	Joint      string   `json:"joint" validate:"required"`
	Movement   string   `json:"movement" validate:"required"`
	Side       string   `json:"side,omitempty"` // left, right, bilateral
	ActiveROM  *float64 `json:"active_rom,omitempty"`
	PassiveROM *float64 `json:"passive_rom,omitempty"`
	IsPainful  bool     `json:"is_painful"`
	Notes      string   `json:"notes,omitempty"`
}

// QuickROMResponse represents the response for quick ROM recording.
type QuickROMResponse struct {
	ID         string   `json:"id"`
	Joint      string   `json:"joint"`
	Movement   string   `json:"movement"`
	Side       string   `json:"side,omitempty"`
	ActiveROM  *float64 `json:"active_rom,omitempty"`
	PassiveROM *float64 `json:"passive_rom,omitempty"`
	IsPainful  bool     `json:"is_painful"`
	RecordedAt string   `json:"recorded_at"`
	Delta      *ROMDeltaResponse `json:"delta,omitempty"`
}

// ROMDeltaResponse represents the ROM change from previous measurement.
type ROMDeltaResponse struct {
	CurrentActive   *float64 `json:"current_active,omitempty"`
	PreviousActive  *float64 `json:"previous_active,omitempty"`
	DeltaActive     *float64 `json:"delta_active,omitempty"`
	CurrentPassive  *float64 `json:"current_passive,omitempty"`
	PreviousPassive *float64 `json:"previous_passive,omitempty"`
	DeltaPassive    *float64 `json:"delta_passive,omitempty"`
	Trend           string   `json:"trend"` // improved, worsened, stable, first_record
}

// QuickScheduleRequest represents the request body for quick scheduling.
type QuickScheduleRequest struct {
	Date     string `json:"date" validate:"required"`      // ISO date
	TimeSlot string `json:"time_slot" validate:"required"` // HH:MM
	Duration int    `json:"duration" validate:"required,min=15,max=180"`
	Notes    string `json:"notes,omitempty"`
}

// QuickScheduleResponse represents the response for quick scheduling.
type QuickScheduleResponse struct {
	ID           string `json:"id"`
	PatientID    string `json:"patient_id"`
	TherapistID  string `json:"therapist_id"`
	Date         string `json:"date"`
	TimeSlot     string `json:"time_slot"`
	Duration     int    `json:"duration"`
	Status       string `json:"status"`
	Notes        string `json:"notes,omitempty"`
	CreatedAt    string `json:"created_at"`
}

// =============================================================================
// HANDLERS
// =============================================================================

// RecordQuickPain records a quick pain measurement.
// @Summary Quick record pain level
// @Description Records a pain level measurement with delta from previous
// @Tags quick-actions
// @Accept json
// @Produce json
// @Param pid path string true "Patient ID"
// @Param request body QuickPainRequest true "Pain data"
// @Success 201 {object} QuickPainResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{pid}/quick-pain [post]
func (h *QuickActionsHandler) RecordQuickPain(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	patientID := c.Param("pid")
	if patientID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Patient ID is required",
		})
	}

	var req QuickPainRequest
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

	record := model.QuickPainRecord{
		PatientID:   patientID,
		ClinicID:    user.ClinicID,
		TherapistID: user.UserID,
		Level:       req.Level,
		Location:    req.Location,
		BodyRegion:  req.BodyRegion,
		Notes:       req.Notes,
		Context:     req.Context,
		RecordedAt:  time.Now(),
	}

	// Record the pain level
	id, delta, err := h.svc.QuickActions().RecordPain(c.Request().Context(), record)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to record pain: " + err.Error(),
		})
	}

	response := QuickPainResponse{
		ID:         id,
		Level:      req.Level,
		Location:   req.Location,
		BodyRegion: req.BodyRegion,
		RecordedAt: record.RecordedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if delta != nil {
		response.Delta = &PainDeltaResponse{
			CurrentLevel:  delta.CurrentLevel,
			PreviousLevel: delta.PreviousLevel,
			Delta:         delta.Delta,
			DeltaPercent:  delta.DeltaPercent,
			Trend:         delta.Trend,
		}
	}

	return c.JSON(http.StatusCreated, response)
}

// RecordQuickROM records a quick ROM measurement.
// @Summary Quick record ROM measurement
// @Description Records a range of motion measurement with delta from previous
// @Tags quick-actions
// @Accept json
// @Produce json
// @Param pid path string true "Patient ID"
// @Param request body QuickROMRequest true "ROM data"
// @Success 201 {object} QuickROMResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{pid}/quick-rom [post]
func (h *QuickActionsHandler) RecordQuickROM(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	patientID := c.Param("pid")
	if patientID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Patient ID is required",
		})
	}

	var req QuickROMRequest
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

	// Require at least one ROM value
	if req.ActiveROM == nil && req.PassiveROM == nil {
		return c.JSON(http.StatusUnprocessableEntity, ErrorResponse{
			Error:   "validation_failed",
			Message: "At least one of active_rom or passive_rom is required",
		})
	}

	record := model.QuickROMRecord{
		PatientID:   patientID,
		ClinicID:    user.ClinicID,
		TherapistID: user.UserID,
		Joint:       req.Joint,
		Movement:    req.Movement,
		Side:        req.Side,
		ActiveROM:   req.ActiveROM,
		PassiveROM:  req.PassiveROM,
		IsPainful:   req.IsPainful,
		Notes:       req.Notes,
		RecordedAt:  time.Now(),
	}

	// Record the ROM measurement
	id, delta, err := h.svc.QuickActions().RecordROM(c.Request().Context(), record)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to record ROM: " + err.Error(),
		})
	}

	response := QuickROMResponse{
		ID:         id,
		Joint:      req.Joint,
		Movement:   req.Movement,
		Side:       req.Side,
		ActiveROM:  req.ActiveROM,
		PassiveROM: req.PassiveROM,
		IsPainful:  req.IsPainful,
		RecordedAt: record.RecordedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if delta != nil {
		response.Delta = &ROMDeltaResponse{
			CurrentActive:   delta.CurrentActive,
			PreviousActive:  delta.PreviousActive,
			DeltaActive:     delta.DeltaActive,
			CurrentPassive:  delta.CurrentPassive,
			PreviousPassive: delta.PreviousPassive,
			DeltaPassive:    delta.DeltaPassive,
			Trend:           delta.Trend,
		}
	}

	return c.JSON(http.StatusCreated, response)
}

// QuickSchedule quickly schedules the next visit.
// @Summary Quick schedule next visit
// @Description Quickly schedules the next visit for a patient
// @Tags quick-actions
// @Accept json
// @Produce json
// @Param pid path string true "Patient ID"
// @Param request body QuickScheduleRequest true "Schedule data"
// @Success 201 {object} QuickScheduleResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{pid}/quick-schedule [post]
func (h *QuickActionsHandler) QuickSchedule(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	patientID := c.Param("pid")
	if patientID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Patient ID is required",
		})
	}

	var req QuickScheduleRequest
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

	scheduleReq := model.QuickScheduleRequest{
		PatientID:   patientID,
		ClinicID:    user.ClinicID,
		TherapistID: user.UserID,
		Date:        req.Date,
		TimeSlot:    req.TimeSlot,
		Duration:    req.Duration,
		Notes:       req.Notes,
	}

	// Create the appointment
	result, err := h.svc.QuickActions().QuickSchedule(c.Request().Context(), scheduleReq)
	if err != nil {
		// Check for scheduling conflicts
		if err.Error() == "time slot not available" {
			return c.JSON(http.StatusConflict, ErrorResponse{
				Error:   "conflict",
				Message: "The requested time slot is not available",
			})
		}
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to schedule appointment: " + err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, QuickScheduleResponse{
		ID:          result.ID,
		PatientID:   result.PatientID,
		TherapistID: result.TherapistID,
		Date:        result.Date,
		TimeSlot:    result.TimeSlot,
		Duration:    result.Duration,
		Status:      result.Status,
		Notes:       result.Notes,
		CreatedAt:   result.CreatedAt,
	})
}

// GetPainHistory retrieves recent pain history for a patient.
// @Summary Get pain history
// @Description Retrieves recent pain level history for delta calculation
// @Tags quick-actions
// @Accept json
// @Produce json
// @Param pid path string true "Patient ID"
// @Param limit query int false "Number of records" default(10)
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{pid}/pain-history [get]
func (h *QuickActionsHandler) GetPainHistory(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	patientID := c.Param("pid")
	if patientID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Patient ID is required",
		})
	}

	history, err := h.svc.QuickActions().GetPainHistory(c.Request().Context(), patientID, 10)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to get pain history",
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"data": history,
	})
}

// GetROMHistory retrieves recent ROM history for a patient.
// @Summary Get ROM history
// @Description Retrieves recent ROM measurement history
// @Tags quick-actions
// @Accept json
// @Produce json
// @Param pid path string true "Patient ID"
// @Param joint query string false "Filter by joint"
// @Param limit query int false "Number of records" default(10)
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{pid}/rom-history [get]
func (h *QuickActionsHandler) GetROMHistory(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	patientID := c.Param("pid")
	if patientID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Patient ID is required",
		})
	}

	joint := c.QueryParam("joint")

	history, err := h.svc.QuickActions().GetROMHistory(c.Request().Context(), patientID, joint, 10)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to get ROM history",
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"data": history,
	})
}
