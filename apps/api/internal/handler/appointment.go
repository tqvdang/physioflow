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

// AppointmentHandler handles appointment-related HTTP requests.
type AppointmentHandler struct {
	svc *service.Service
}

// NewAppointmentHandler creates a new AppointmentHandler.
func NewAppointmentHandler(svc *service.Service) *AppointmentHandler {
	return &AppointmentHandler{svc: svc}
}

// AppointmentResponse represents an appointment in API responses.
type AppointmentResponse struct {
	ID                 string `json:"id"`
	ClinicID           string `json:"clinic_id"`
	PatientID          string `json:"patient_id"`
	TherapistID        string `json:"therapist_id"`
	StartTime          string `json:"start_time"`
	EndTime            string `json:"end_time"`
	Duration           int    `json:"duration"`
	Type               string `json:"type"`
	Status             string `json:"status"`
	Room               string `json:"room,omitempty"`
	Notes              string `json:"notes,omitempty"`
	CancellationReason string `json:"cancellation_reason,omitempty"`
	RecurrenceID       string `json:"recurrence_id,omitempty"`
	PatientName        string `json:"patient_name,omitempty"`
	PatientMRN         string `json:"patient_mrn,omitempty"`
	PatientPhone       string `json:"patient_phone,omitempty"`
	TherapistName      string `json:"therapist_name,omitempty"`
	CreatedAt          string `json:"created_at"`
	UpdatedAt          string `json:"updated_at"`
}

// AppointmentListResponse represents a paginated list of appointments.
type AppointmentListResponse struct {
	Data       []AppointmentResponse `json:"data"`
	Total      int64                 `json:"total"`
	Page       int                   `json:"page"`
	PerPage    int                   `json:"per_page"`
	TotalPages int                   `json:"total_pages"`
}

// AvailabilitySlotResponse represents an available time slot.
type AvailabilitySlotResponse struct {
	StartTime     string `json:"start_time"`
	EndTime       string `json:"end_time"`
	TherapistID   string `json:"therapist_id"`
	TherapistName string `json:"therapist_name,omitempty"`
	Duration      int    `json:"duration"`
}

// TherapistResponse represents a therapist in API responses.
type TherapistResponse struct {
	ID        string `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	FullName  string `json:"full_name"`
	Email     string `json:"email,omitempty"`
	Specialty string `json:"specialty,omitempty"`
	AvatarURL string `json:"avatar_url,omitempty"`
	IsActive  bool   `json:"is_active"`
}

// DayScheduleResponse represents a day's schedule.
type DayScheduleResponse struct {
	Date         string                `json:"date"`
	Appointments []AppointmentResponse `json:"appointments"`
	TotalCount   int                   `json:"total_count"`
}

// List returns a paginated list of appointments.
// @Summary List appointments
// @Description Returns a paginated list of appointments with filtering
// @Tags appointments
// @Accept json
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param per_page query int false "Items per page" default(50) maximum(200)
// @Param patient_id query string false "Filter by patient ID"
// @Param therapist_id query string false "Filter by therapist ID"
// @Param start_date query string false "Filter by start date (YYYY-MM-DD)"
// @Param end_date query string false "Filter by end date (YYYY-MM-DD)"
// @Param status query string false "Filter by status" Enums(scheduled, confirmed, in_progress, completed, cancelled, no_show)
// @Param type query string false "Filter by type" Enums(assessment, treatment, followup, consultation, other)
// @Success 200 {object} AppointmentListResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/appointments [get]
func (h *AppointmentHandler) List(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	params := model.NewAppointmentSearchParams()
	params.ClinicID = user.ClinicID

	if page := c.QueryParam("page"); page != "" {
		if p, err := strconv.Atoi(page); err == nil && p > 0 {
			params.Page = p
		}
	}

	if perPage := c.QueryParam("per_page"); perPage != "" {
		if pp, err := strconv.Atoi(perPage); err == nil && pp > 0 {
			params.PerPage = pp
		}
	}

	params.PatientID = c.QueryParam("patient_id")
	params.TherapistID = c.QueryParam("therapist_id")
	params.Room = c.QueryParam("room")

	if status := c.QueryParam("status"); status != "" {
		params.Status = model.AppointmentStatus(status)
	}

	if apptType := c.QueryParam("type"); apptType != "" {
		params.Type = model.AppointmentType(apptType)
	}

	if startDate := c.QueryParam("start_date"); startDate != "" {
		if t, err := time.Parse("2006-01-02", startDate); err == nil {
			params.StartDate = &t
		}
	}

	if endDate := c.QueryParam("end_date"); endDate != "" {
		if t, err := time.Parse("2006-01-02", endDate); err == nil {
			// End of day
			endOfDay := t.AddDate(0, 0, 1)
			params.EndDate = &endOfDay
		}
	}

	params.SortBy = c.QueryParam("sort_by")
	params.SortOrder = c.QueryParam("sort_order")

	result, err := h.svc.Appointment().List(c.Request().Context(), params)
	if err != nil {
		log.Error().Err(err).Msg("failed to list appointments")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve appointments",
		})
	}

	data := make([]AppointmentResponse, len(result.Data))
	for i, a := range result.Data {
		data[i] = toAppointmentResponse(a)
	}

	return c.JSON(http.StatusOK, AppointmentListResponse{
		Data:       data,
		Total:      result.Total,
		Page:       result.Page,
		PerPage:    result.PerPage,
		TotalPages: result.TotalPages,
	})
}

// Create creates a new appointment.
// @Summary Create appointment
// @Description Creates a new appointment with optional recurrence
// @Tags appointments
// @Accept json
// @Produce json
// @Param appointment body model.CreateAppointmentRequest true "Appointment data"
// @Success 201 {object} AppointmentResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse "Scheduling conflict"
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/appointments [post]
func (h *AppointmentHandler) Create(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	var req model.CreateAppointmentRequest
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

	appointment, err := h.svc.Appointment().Create(c.Request().Context(), user.ClinicID, user.UserID, &req)
	if err != nil {
		if errors.Is(err, repository.ErrInvalidInput) {
			return c.JSON(http.StatusBadRequest, ErrorResponse{
				Error:   "invalid_input",
				Message: err.Error(),
			})
		}
		// Check for conflict error
		if errMsg := err.Error(); len(errMsg) > 20 && errMsg[:19] == "scheduling conflict" {
			return c.JSON(http.StatusConflict, ErrorResponse{
				Error:   "conflict",
				Message: err.Error(),
			})
		}
		log.Error().Err(err).Msg("failed to create appointment")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to create appointment",
		})
	}

	return c.JSON(http.StatusCreated, toAppointmentResponse(*appointment))
}

// Get retrieves an appointment by ID.
// @Summary Get appointment
// @Description Retrieves an appointment by its ID
// @Tags appointments
// @Accept json
// @Produce json
// @Param id path string true "Appointment ID (UUID)"
// @Success 200 {object} AppointmentResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/appointments/{id} [get]
func (h *AppointmentHandler) Get(c echo.Context) error {
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
			Message: "Appointment ID is required",
		})
	}

	appointment, err := h.svc.Appointment().GetByID(c.Request().Context(), user.ClinicID, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Appointment not found",
			})
		}
		log.Error().Err(err).Str("appointment_id", id).Msg("failed to get appointment")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve appointment",
		})
	}

	return c.JSON(http.StatusOK, toAppointmentResponse(*appointment))
}

// Update updates an existing appointment.
// @Summary Update appointment
// @Description Updates an existing appointment
// @Tags appointments
// @Accept json
// @Produce json
// @Param id path string true "Appointment ID (UUID)"
// @Param appointment body model.UpdateAppointmentRequest true "Appointment data"
// @Success 200 {object} AppointmentResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse "Scheduling conflict"
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/appointments/{id} [put]
func (h *AppointmentHandler) Update(c echo.Context) error {
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
			Message: "Appointment ID is required",
		})
	}

	var req model.UpdateAppointmentRequest
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

	appointment, err := h.svc.Appointment().Update(c.Request().Context(), user.ClinicID, id, user.UserID, &req)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Appointment not found",
			})
		}
		// Check for conflict error
		if errMsg := err.Error(); len(errMsg) > 20 && errMsg[:19] == "scheduling conflict" {
			return c.JSON(http.StatusConflict, ErrorResponse{
				Error:   "conflict",
				Message: err.Error(),
			})
		}
		log.Error().Err(err).Str("appointment_id", id).Msg("failed to update appointment")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to update appointment",
		})
	}

	return c.JSON(http.StatusOK, toAppointmentResponse(*appointment))
}

// Cancel cancels an appointment.
// @Summary Cancel appointment
// @Description Cancels an appointment with optional reason
// @Tags appointments
// @Accept json
// @Produce json
// @Param id path string true "Appointment ID (UUID)"
// @Param body body model.CancelAppointmentRequest false "Cancellation details"
// @Success 200 {object} map[string]string
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/appointments/{id}/cancel [post]
func (h *AppointmentHandler) Cancel(c echo.Context) error {
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
			Message: "Appointment ID is required",
		})
	}

	var req model.CancelAppointmentRequest
	if err := c.Bind(&req); err != nil {
		// Allow empty body
		req = model.CancelAppointmentRequest{}
	}

	err := h.svc.Appointment().Cancel(c.Request().Context(), user.ClinicID, id, user.UserID, &req)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Appointment not found",
			})
		}
		log.Error().Err(err).Str("appointment_id", id).Msg("failed to cancel appointment")
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "bad_request",
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Appointment cancelled successfully",
	})
}

// Delete deletes an appointment.
// @Summary Delete appointment
// @Description Permanently deletes an appointment
// @Tags appointments
// @Accept json
// @Produce json
// @Param id path string true "Appointment ID (UUID)"
// @Success 204 "No Content"
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/appointments/{id} [delete]
func (h *AppointmentHandler) Delete(c echo.Context) error {
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
			Message: "Appointment ID is required",
		})
	}

	err := h.svc.Appointment().Delete(c.Request().Context(), user.ClinicID, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Appointment not found",
			})
		}
		log.Error().Err(err).Str("appointment_id", id).Msg("failed to delete appointment")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to delete appointment",
		})
	}

	return c.NoContent(http.StatusNoContent)
}

// GetDaySchedule retrieves all appointments for a specific day.
// @Summary Get day schedule
// @Description Retrieves all appointments for a specific date
// @Tags appointments
// @Accept json
// @Produce json
// @Param date path string true "Date (YYYY-MM-DD)"
// @Success 200 {object} DayScheduleResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/appointments/day/{date} [get]
func (h *AppointmentHandler) GetDaySchedule(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	dateStr := c.Param("date")
	if dateStr == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Date is required",
		})
	}

	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Invalid date format. Use YYYY-MM-DD",
		})
	}

	schedule, err := h.svc.Appointment().GetDaySchedule(c.Request().Context(), user.ClinicID, date)
	if err != nil {
		log.Error().Err(err).Str("date", dateStr).Msg("failed to get day schedule")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve schedule",
		})
	}

	appointments := make([]AppointmentResponse, len(schedule.Appointments))
	for i, a := range schedule.Appointments {
		appointments[i] = toAppointmentResponse(a)
	}

	return c.JSON(http.StatusOK, DayScheduleResponse{
		Date:         schedule.Date,
		Appointments: appointments,
		TotalCount:   schedule.TotalCount,
	})
}

// GetTherapistAvailability retrieves available time slots for a therapist.
// @Summary Get therapist availability
// @Description Retrieves available time slots for a therapist on a specific date
// @Tags therapists
// @Accept json
// @Produce json
// @Param id path string true "Therapist ID (UUID)"
// @Param date query string true "Date (YYYY-MM-DD)"
// @Param duration query int false "Duration in minutes" default(30)
// @Success 200 {array} AvailabilitySlotResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/therapists/{id}/availability [get]
func (h *AppointmentHandler) GetTherapistAvailability(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	therapistID := c.Param("id")
	if therapistID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Therapist ID is required",
		})
	}

	dateStr := c.QueryParam("date")
	if dateStr == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Date is required",
		})
	}

	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Invalid date format. Use YYYY-MM-DD",
		})
	}

	duration := 30
	if durationStr := c.QueryParam("duration"); durationStr != "" {
		if d, err := strconv.Atoi(durationStr); err == nil && d > 0 {
			duration = d
		}
	}

	slots, err := h.svc.Appointment().GetAvailableSlots(c.Request().Context(), user.ClinicID, therapistID, date, duration)
	if err != nil {
		log.Error().Err(err).Str("therapist_id", therapistID).Str("date", dateStr).Msg("failed to get availability")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve availability",
		})
	}

	response := make([]AvailabilitySlotResponse, len(slots))
	for i, slot := range slots {
		response[i] = AvailabilitySlotResponse{
			StartTime:     slot.StartTime.Format(time.RFC3339),
			EndTime:       slot.EndTime.Format(time.RFC3339),
			TherapistID:   slot.TherapistID,
			TherapistName: slot.TherapistName,
			Duration:      slot.Duration,
		}
	}

	return c.JSON(http.StatusOK, response)
}

// GetTherapists retrieves all active therapists.
// @Summary Get therapists
// @Description Retrieves all active therapists for the clinic
// @Tags therapists
// @Accept json
// @Produce json
// @Success 200 {array} TherapistResponse
// @Failure 401 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/therapists [get]
func (h *AppointmentHandler) GetTherapists(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	therapists, err := h.svc.Appointment().GetTherapists(c.Request().Context(), user.ClinicID)
	if err != nil {
		log.Error().Err(err).Msg("failed to get therapists")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve therapists",
		})
	}

	response := make([]TherapistResponse, len(therapists))
	for i, t := range therapists {
		response[i] = TherapistResponse{
			ID:        t.ID,
			FirstName: t.FirstName,
			LastName:  t.LastName,
			FullName:  t.FullName,
			Email:     t.Email,
			Specialty: t.Specialty,
			AvatarURL: t.AvatarURL,
			IsActive:  t.IsActive,
		}
	}

	return c.JSON(http.StatusOK, response)
}

// toAppointmentResponse converts an AppointmentWithDetails to AppointmentResponse.
func toAppointmentResponse(a model.AppointmentWithDetails) AppointmentResponse {
	resp := AppointmentResponse{
		ID:                 a.ID,
		ClinicID:           a.ClinicID,
		PatientID:          a.PatientID,
		TherapistID:        a.TherapistID,
		StartTime:          a.StartTime.Format(time.RFC3339),
		EndTime:            a.EndTime.Format(time.RFC3339),
		Duration:           a.Duration,
		Type:               string(a.Type),
		Status:             string(a.Status),
		Room:               a.Room,
		Notes:              a.Notes,
		CancellationReason: a.CancellationReason,
		PatientName:        a.PatientName,
		PatientMRN:         a.PatientMRN,
		PatientPhone:       a.PatientPhone,
		TherapistName:      a.TherapistName,
		CreatedAt:          a.CreatedAt.Format(time.RFC3339),
		UpdatedAt:          a.UpdatedAt.Format(time.RFC3339),
	}

	if a.RecurrenceID != nil {
		resp.RecurrenceID = *a.RecurrenceID
	}

	return resp
}
