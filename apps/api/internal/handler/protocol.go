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

// ProtocolHandler handles clinical protocol HTTP requests.
type ProtocolHandler struct {
	svc *service.Service
}

// NewProtocolHandler creates a new ProtocolHandler.
func NewProtocolHandler(svc *service.Service) *ProtocolHandler {
	return &ProtocolHandler{svc: svc}
}

// --- Response types ---

// ProtocolResponse represents a clinical protocol template in API responses.
type ProtocolResponse struct {
	ID                     string                          `json:"id"`
	ClinicID               *string                         `json:"clinic_id,omitempty"`
	ProtocolName           string                          `json:"protocol_name"`
	ProtocolNameVi         string                          `json:"protocol_name_vi"`
	Description            string                          `json:"description,omitempty"`
	DescriptionVi          string                          `json:"description_vi,omitempty"`
	Goals                  []model.ProtocolGoalJSON        `json:"goals"`
	Exercises              []model.ProtocolExerciseJSON    `json:"exercises"`
	FrequencyPerWeek       int                             `json:"frequency_per_week"`
	DurationWeeks          int                             `json:"duration_weeks"`
	SessionDurationMinutes int                             `json:"session_duration_minutes"`
	ProgressionCriteria    model.ProgressionCriteriaJSON   `json:"progression_criteria"`
	Category               string                          `json:"category,omitempty"`
	ApplicableDiagnoses    []string                        `json:"applicable_diagnoses,omitempty"`
	BodyRegions            []string                        `json:"body_regions,omitempty"`
	Version                int                             `json:"version"`
	CreatedAt              string                          `json:"created_at"`
	UpdatedAt              string                          `json:"updated_at"`
}

// PatientProtocolResponse represents a patient protocol assignment in API responses.
type PatientProtocolResponse struct {
	ID                     string                           `json:"id"`
	PatientID              string                           `json:"patient_id"`
	ProtocolID             string                           `json:"protocol_id"`
	TherapistID            string                           `json:"therapist_id"`
	ClinicID               string                           `json:"clinic_id"`
	AssignedDate           string                           `json:"assigned_date"`
	StartDate              *string                          `json:"start_date,omitempty"`
	TargetEndDate          *string                          `json:"target_end_date,omitempty"`
	ActualEndDate          *string                          `json:"actual_end_date,omitempty"`
	ProgressStatus         string                           `json:"progress_status"`
	CurrentPhase           string                           `json:"current_phase"`
	SessionsCompleted      int                              `json:"sessions_completed"`
	CustomFrequencyPerWeek *int                             `json:"custom_frequency_per_week,omitempty"`
	CustomDurationWeeks    *int                             `json:"custom_duration_weeks,omitempty"`
	ProgressNotes          []model.ProgressNote             `json:"progress_notes,omitempty"`
	Version                int                              `json:"version"`
	CreatedAt              string                           `json:"created_at"`
	UpdatedAt              string                           `json:"updated_at"`
	Protocol               *model.ClinicalProtocolSummary   `json:"protocol,omitempty"`
}

// --- Handlers ---

// GetProtocols returns all active clinical protocol templates.
// @Summary List clinical protocols
// @Description Returns all active clinical protocol templates
// @Tags protocols
// @Produce json
// @Success 200 {array} ProtocolResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/protocols [get]
func (h *ProtocolHandler) GetProtocols(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	protocols, err := h.svc.Protocol().GetProtocols(c.Request().Context())
	if err != nil {
		log.Error().Err(err).Msg("failed to list protocols")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve protocols",
		})
	}

	results := make([]ProtocolResponse, len(protocols))
	for i, p := range protocols {
		results[i] = toProtocolResponse(p)
	}

	return c.JSON(http.StatusOK, results)
}

// GetProtocolByID returns a single clinical protocol by ID.
// @Summary Get clinical protocol
// @Description Returns a clinical protocol template by ID
// @Tags protocols
// @Produce json
// @Param id path string true "Protocol ID"
// @Success 200 {object} ProtocolResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/protocols/{id} [get]
func (h *ProtocolHandler) GetProtocolByID(c echo.Context) error {
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
			Message: "Protocol ID is required",
		})
	}

	protocol, err := h.svc.Protocol().GetProtocolByID(c.Request().Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Protocol not found",
			})
		}
		log.Error().Err(err).Str("protocol_id", id).Msg("failed to get protocol")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve protocol",
		})
	}

	return c.JSON(http.StatusOK, toProtocolResponse(protocol))
}

// AssignProtocol assigns a clinical protocol to a patient.
// @Summary Assign protocol to patient
// @Description Assigns a clinical protocol to a patient with initial progress tracking
// @Tags protocols
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID"
// @Param body body model.AssignProtocolRequestDB true "Assignment data"
// @Success 201 {object} PatientProtocolResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/protocols/assign [post]
func (h *ProtocolHandler) AssignProtocol(c echo.Context) error {
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

	var req model.AssignProtocolRequestDB
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

	pp, err := h.svc.Protocol().AssignProtocol(
		c.Request().Context(),
		patientID,
		user.UserID,
		user.ClinicID,
		&req,
	)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Protocol not found",
			})
		}
		log.Error().Err(err).
			Str("patient_id", patientID).
			Str("protocol_id", req.ProtocolID).
			Msg("failed to assign protocol")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to assign protocol",
		})
	}

	return c.JSON(http.StatusCreated, toPatientProtocolResponse(pp))
}

// GetPatientProtocols returns all protocols assigned to a patient.
// @Summary Get patient protocols
// @Description Returns all protocols assigned to a patient
// @Tags protocols
// @Produce json
// @Param patientId path string true "Patient ID"
// @Success 200 {array} PatientProtocolResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/protocols [get]
func (h *ProtocolHandler) GetPatientProtocols(c echo.Context) error {
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

	protocols, err := h.svc.Protocol().GetPatientProtocols(c.Request().Context(), patientID)
	if err != nil {
		log.Error().Err(err).Str("patient_id", patientID).Msg("failed to get patient protocols")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve patient protocols",
		})
	}

	results := make([]PatientProtocolResponse, len(protocols))
	for i, pp := range protocols {
		results[i] = toPatientProtocolResponse(pp)
	}

	return c.JSON(http.StatusOK, results)
}

// UpdateProtocolProgress updates the progress of a patient protocol.
// @Summary Update protocol progress
// @Description Updates the progress of a patient protocol with optimistic locking
// @Tags protocols
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID"
// @Param id path string true "Patient Protocol ID"
// @Param body body model.UpdateProgressRequest true "Progress data"
// @Success 200 {object} PatientProtocolResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/protocols/{id}/progress [put]
func (h *ProtocolHandler) UpdateProtocolProgress(c echo.Context) error {
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
			Message: "Patient Protocol ID is required",
		})
	}

	var req model.UpdateProgressRequest
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

	pp, err := h.svc.Protocol().UpdateProtocolProgress(
		c.Request().Context(),
		id,
		user.UserID,
		&req,
	)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Patient protocol not found",
			})
		}
		if errors.Is(err, repository.ErrVersionConflict) {
			return c.JSON(http.StatusConflict, ErrorResponse{
				Error:   "version_conflict",
				Message: "This record has been modified by another user. Please refresh and try again.",
			})
		}
		log.Error().Err(err).Str("patient_protocol_id", id).Msg("failed to update protocol progress")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to update protocol progress",
		})
	}

	return c.JSON(http.StatusOK, toPatientProtocolResponse(pp))
}

// --- Response converters ---

func toProtocolResponse(p *model.ClinicalProtocolDB) ProtocolResponse {
	goals := p.Goals
	if goals == nil {
		goals = []model.ProtocolGoalJSON{}
	}
	exercises := p.Exercises
	if exercises == nil {
		exercises = []model.ProtocolExerciseJSON{}
	}
	diagnoses := p.ApplicableDiagnoses
	if diagnoses == nil {
		diagnoses = []string{}
	}
	bodyRegions := p.BodyRegions
	if bodyRegions == nil {
		bodyRegions = []string{}
	}

	return ProtocolResponse{
		ID:                     p.ID,
		ClinicID:               p.ClinicID,
		ProtocolName:           p.ProtocolName,
		ProtocolNameVi:         p.ProtocolNameVi,
		Description:            p.Description,
		DescriptionVi:          p.DescriptionVi,
		Goals:                  goals,
		Exercises:              exercises,
		FrequencyPerWeek:       p.FrequencyPerWeek,
		DurationWeeks:          p.DurationWeeks,
		SessionDurationMinutes: p.SessionDurationMinutes,
		ProgressionCriteria:    p.ProgressionCriteria,
		Category:               p.Category,
		ApplicableDiagnoses:    diagnoses,
		BodyRegions:            bodyRegions,
		Version:                p.Version,
		CreatedAt:              p.CreatedAt.Format(time.RFC3339),
		UpdatedAt:              p.UpdatedAt.Format(time.RFC3339),
	}
}

func toPatientProtocolResponse(pp *model.PatientProtocolDB) PatientProtocolResponse {
	resp := PatientProtocolResponse{
		ID:                pp.ID,
		PatientID:         pp.PatientID,
		ProtocolID:        pp.ProtocolID,
		TherapistID:       pp.TherapistID,
		ClinicID:          pp.ClinicID,
		AssignedDate:      pp.AssignedDate.Format("2006-01-02"),
		ProgressStatus:    pp.ProgressStatus,
		CurrentPhase:      pp.CurrentPhase,
		SessionsCompleted: pp.SessionsCompleted,
		CustomFrequencyPerWeek: pp.CustomFrequencyPerWeek,
		CustomDurationWeeks:    pp.CustomDurationWeeks,
		ProgressNotes:     pp.ProgressNotes,
		Version:           pp.Version,
		CreatedAt:         pp.CreatedAt.Format(time.RFC3339),
		UpdatedAt:         pp.UpdatedAt.Format(time.RFC3339),
		Protocol:          pp.Protocol,
	}

	if pp.StartDate != nil {
		formatted := pp.StartDate.Format("2006-01-02")
		resp.StartDate = &formatted
	}
	if pp.TargetEndDate != nil {
		formatted := pp.TargetEndDate.Format("2006-01-02")
		resp.TargetEndDate = &formatted
	}
	if pp.ActualEndDate != nil {
		formatted := pp.ActualEndDate.Format("2006-01-02")
		resp.ActualEndDate = &formatted
	}
	if resp.ProgressNotes == nil {
		resp.ProgressNotes = []model.ProgressNote{}
	}

	return resp
}
