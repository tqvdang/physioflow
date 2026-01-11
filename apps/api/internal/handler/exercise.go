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

// ExerciseHandler handles exercise-related HTTP requests.
type ExerciseHandler struct {
	svc *service.Service
}

// NewExerciseHandler creates a new ExerciseHandler.
func NewExerciseHandler(svc *service.Service) *ExerciseHandler {
	return &ExerciseHandler{svc: svc}
}

// ExerciseResponse represents an exercise in API responses.
type ExerciseResponse struct {
	ID              string   `json:"id"`
	ClinicID        *string  `json:"clinic_id,omitempty"`
	Name            string   `json:"name"`
	NameVi          string   `json:"name_vi"`
	Description     string   `json:"description"`
	DescriptionVi   string   `json:"description_vi"`
	Instructions    string   `json:"instructions"`
	InstructionsVi  string   `json:"instructions_vi"`
	Category        string   `json:"category"`
	Difficulty      string   `json:"difficulty"`
	Equipment       []string `json:"equipment"`
	MuscleGroups    []string `json:"muscle_groups"`
	ImageURL        string   `json:"image_url,omitempty"`
	VideoURL        string   `json:"video_url,omitempty"`
	ThumbnailURL    string   `json:"thumbnail_url,omitempty"`
	DefaultSets     int      `json:"default_sets"`
	DefaultReps     int      `json:"default_reps"`
	DefaultHoldSecs int      `json:"default_hold_secs"`
	Precautions     string   `json:"precautions,omitempty"`
	PrecautionsVi   string   `json:"precautions_vi,omitempty"`
	IsGlobal        bool     `json:"is_global"`
	IsActive        bool     `json:"is_active"`
	CreatedAt       string   `json:"created_at"`
	UpdatedAt       string   `json:"updated_at"`
}

// ExerciseListResponse represents a paginated list of exercises.
type ExerciseListResponse struct {
	Data       []ExerciseResponse `json:"data"`
	Total      int64              `json:"total"`
	Page       int                `json:"page"`
	PerPage    int                `json:"per_page"`
	TotalPages int                `json:"total_pages"`
}

// PrescriptionResponse represents a prescription in API responses.
type PrescriptionResponse struct {
	ID                 string            `json:"id"`
	PatientID          string            `json:"patient_id"`
	ExerciseID         string            `json:"exercise_id"`
	ProgramID          *string           `json:"program_id,omitempty"`
	Sets               int               `json:"sets"`
	Reps               int               `json:"reps"`
	HoldSeconds        int               `json:"hold_seconds"`
	Frequency          string            `json:"frequency"`
	DurationWeeks      int               `json:"duration_weeks"`
	CustomInstructions string            `json:"custom_instructions,omitempty"`
	Notes              string            `json:"notes,omitempty"`
	Status             string            `json:"status"`
	StartDate          string            `json:"start_date"`
	EndDate            *string           `json:"end_date,omitempty"`
	CreatedAt          string            `json:"created_at"`
	UpdatedAt          string            `json:"updated_at"`
	Exercise           *ExerciseResponse `json:"exercise,omitempty"`
}

// ProgramResponse represents a home exercise program in API responses.
type ProgramResponse struct {
	ID            string                 `json:"id"`
	PatientID     string                 `json:"patient_id"`
	Name          string                 `json:"name"`
	NameVi        string                 `json:"name_vi,omitempty"`
	Description   string                 `json:"description,omitempty"`
	DescriptionVi string                 `json:"description_vi,omitempty"`
	Frequency     string                 `json:"frequency"`
	DurationWeeks int                    `json:"duration_weeks"`
	StartDate     string                 `json:"start_date"`
	EndDate       *string                `json:"end_date,omitempty"`
	IsActive      bool                   `json:"is_active"`
	CreatedAt     string                 `json:"created_at"`
	Exercises     []PrescriptionResponse `json:"exercises,omitempty"`
}

// ComplianceLogResponse represents a compliance log in API responses.
type ComplianceLogResponse struct {
	ID             string  `json:"id"`
	PrescriptionID string  `json:"prescription_id"`
	CompletedAt    string  `json:"completed_at"`
	SetsCompleted  int     `json:"sets_completed"`
	RepsCompleted  int     `json:"reps_completed"`
	PainLevel      *int    `json:"pain_level,omitempty"`
	Difficulty     string  `json:"difficulty,omitempty"`
	Notes          string  `json:"notes,omitempty"`
}

// ComplianceSummaryResponse represents a patient's compliance summary.
type ComplianceSummaryResponse struct {
	TotalPrescriptions     int      `json:"total_prescriptions"`
	ActivePrescriptions    int      `json:"active_prescriptions"`
	CompletedPrescriptions int      `json:"completed_prescriptions"`
	TotalComplianceLogs    int      `json:"total_compliance_logs"`
	ComplianceRate         float64  `json:"compliance_rate"`
	LastActivityDate       *string  `json:"last_activity_date,omitempty"`
}

// List returns a paginated list of exercises.
// @Summary List exercises
// @Description Returns a paginated list of exercises from the library
// @Tags exercises
// @Accept json
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param per_page query int false "Items per page" default(20) maximum(100)
// @Param search query string false "Search term"
// @Param category query string false "Filter by category" Enums(stretching, strengthening, balance, cardiovascular, mobility, postural)
// @Param difficulty query string false "Filter by difficulty" Enums(beginner, intermediate, advanced)
// @Param muscle_groups query []string false "Filter by muscle groups"
// @Param sort_by query string false "Sort field" Enums(name, name_vi, category, difficulty, created_at)
// @Param sort_order query string false "Sort order" Enums(asc, desc) default(asc)
// @Success 200 {object} ExerciseListResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/exercises [get]
func (h *ExerciseHandler) List(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	params := model.NewExerciseSearchParams()
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

	params.Search = c.QueryParam("search")

	if category := c.QueryParam("category"); category != "" {
		params.Category = model.ExerciseCategory(category)
	}

	if difficulty := c.QueryParam("difficulty"); difficulty != "" {
		params.Difficulty = model.ExerciseDifficulty(difficulty)
	}

	if muscleGroups := c.QueryParams()["muscle_groups"]; len(muscleGroups) > 0 {
		for _, mg := range muscleGroups {
			params.MuscleGroups = append(params.MuscleGroups, model.MuscleGroup(mg))
		}
	}

	params.SortBy = c.QueryParam("sort_by")
	params.SortOrder = c.QueryParam("sort_order")

	result, err := h.svc.Exercise().ListExercises(c.Request().Context(), params)
	if err != nil {
		log.Error().Err(err).Msg("failed to list exercises")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve exercises",
		})
	}

	data := make([]ExerciseResponse, len(result.Data))
	for i, e := range result.Data {
		data[i] = toExerciseResponse(e)
	}

	return c.JSON(http.StatusOK, ExerciseListResponse{
		Data:       data,
		Total:      result.Total,
		Page:       result.Page,
		PerPage:    result.PerPage,
		TotalPages: result.TotalPages,
	})
}

// Get retrieves a single exercise by ID.
// @Summary Get exercise
// @Description Retrieves an exercise by ID
// @Tags exercises
// @Accept json
// @Produce json
// @Param id path string true "Exercise ID"
// @Success 200 {object} ExerciseResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/exercises/{id} [get]
func (h *ExerciseHandler) Get(c echo.Context) error {
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
			Message: "Exercise ID is required",
		})
	}

	exercise, err := h.svc.Exercise().GetExercise(c.Request().Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Exercise not found",
			})
		}
		log.Error().Err(err).Str("exercise_id", id).Msg("failed to get exercise")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve exercise",
		})
	}

	return c.JSON(http.StatusOK, toExerciseResponse(*exercise))
}

// Create creates a new exercise in the library.
// @Summary Create exercise
// @Description Creates a new exercise in the library
// @Tags exercises
// @Accept json
// @Produce json
// @Param exercise body model.CreateExerciseRequest true "Exercise data"
// @Success 201 {object} ExerciseResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/exercises [post]
func (h *ExerciseHandler) Create(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	var req model.CreateExerciseRequest
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

	exercise, err := h.svc.Exercise().CreateExercise(c.Request().Context(), user.ClinicID, user.UserID, &req)
	if err != nil {
		log.Error().Err(err).Msg("failed to create exercise")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to create exercise",
		})
	}

	return c.JSON(http.StatusCreated, toExerciseResponse(*exercise))
}

// Update updates an existing exercise.
// @Summary Update exercise
// @Description Updates an existing exercise
// @Tags exercises
// @Accept json
// @Produce json
// @Param id path string true "Exercise ID"
// @Param exercise body model.UpdateExerciseRequest true "Exercise data"
// @Success 200 {object} ExerciseResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/exercises/{id} [put]
func (h *ExerciseHandler) Update(c echo.Context) error {
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
			Message: "Exercise ID is required",
		})
	}

	var req model.UpdateExerciseRequest
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

	exercise, err := h.svc.Exercise().UpdateExercise(c.Request().Context(), id, user.UserID, &req)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Exercise not found",
			})
		}
		log.Error().Err(err).Str("exercise_id", id).Msg("failed to update exercise")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to update exercise",
		})
	}

	return c.JSON(http.StatusOK, toExerciseResponse(*exercise))
}

// Delete deletes an exercise.
// @Summary Delete exercise
// @Description Soft deletes an exercise
// @Tags exercises
// @Accept json
// @Produce json
// @Param id path string true "Exercise ID"
// @Success 204 "No Content"
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/exercises/{id} [delete]
func (h *ExerciseHandler) Delete(c echo.Context) error {
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
			Message: "Exercise ID is required",
		})
	}

	err := h.svc.Exercise().DeleteExercise(c.Request().Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Exercise not found",
			})
		}
		log.Error().Err(err).Str("exercise_id", id).Msg("failed to delete exercise")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to delete exercise",
		})
	}

	return c.NoContent(http.StatusNoContent)
}

// Search performs a quick search for exercises.
// @Summary Search exercises
// @Description Quick search for exercises by name or description
// @Tags exercises
// @Accept json
// @Produce json
// @Param q query string true "Search query"
// @Param limit query int false "Maximum results" default(10) maximum(50)
// @Success 200 {array} ExerciseResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/exercises/search [get]
func (h *ExerciseHandler) Search(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	query := c.QueryParam("q")
	if query == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Search query is required",
		})
	}

	limit := 10
	if limitStr := c.QueryParam("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	exercises, err := h.svc.Exercise().SearchExercises(c.Request().Context(), user.ClinicID, query, limit)
	if err != nil {
		log.Error().Err(err).Str("query", query).Msg("failed to search exercises")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to search exercises",
		})
	}

	results := make([]ExerciseResponse, len(exercises))
	for i, e := range exercises {
		results[i] = toExerciseResponse(e)
	}

	return c.JSON(http.StatusOK, results)
}

// GetPatientExercises retrieves all prescriptions for a patient.
// @Summary Get patient exercises
// @Description Retrieves all exercise prescriptions for a patient
// @Tags exercises
// @Accept json
// @Produce json
// @Param pid path string true "Patient ID"
// @Param active_only query bool false "Only return active prescriptions" default(false)
// @Success 200 {array} PrescriptionResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{pid}/exercises [get]
func (h *ExerciseHandler) GetPatientExercises(c echo.Context) error {
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

	activeOnly := false
	if active := c.QueryParam("active_only"); active == "true" {
		activeOnly = true
	}

	prescriptions, err := h.svc.Exercise().GetPatientPrescriptions(c.Request().Context(), patientID, activeOnly)
	if err != nil {
		log.Error().Err(err).Str("patient_id", patientID).Msg("failed to get patient exercises")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve patient exercises",
		})
	}

	results := make([]PrescriptionResponse, len(prescriptions))
	for i, p := range prescriptions {
		results[i] = toPrescriptionResponse(p)
	}

	return c.JSON(http.StatusOK, results)
}

// PrescribeExercise prescribes an exercise to a patient.
// @Summary Prescribe exercise
// @Description Prescribes an exercise to a patient
// @Tags exercises
// @Accept json
// @Produce json
// @Param pid path string true "Patient ID"
// @Param prescription body model.PrescribeExerciseRequest true "Prescription data"
// @Success 201 {object} PrescriptionResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{pid}/exercises [post]
func (h *ExerciseHandler) PrescribeExercise(c echo.Context) error {
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

	var req model.PrescribeExerciseRequest
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

	prescription, err := h.svc.Exercise().PrescribeExercise(c.Request().Context(), user.ClinicID, patientID, user.UserID, &req)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Exercise not found",
			})
		}
		log.Error().Err(err).Str("patient_id", patientID).Msg("failed to prescribe exercise")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to prescribe exercise",
		})
	}

	return c.JSON(http.StatusCreated, toPrescriptionResponse(*prescription))
}

// UpdatePrescription updates an existing prescription.
// @Summary Update prescription
// @Description Updates an existing exercise prescription
// @Tags exercises
// @Accept json
// @Produce json
// @Param pid path string true "Patient ID"
// @Param id path string true "Prescription ID"
// @Param prescription body model.UpdatePrescriptionRequest true "Prescription data"
// @Success 200 {object} PrescriptionResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{pid}/exercises/{id} [put]
func (h *ExerciseHandler) UpdatePrescription(c echo.Context) error {
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
			Message: "Prescription ID is required",
		})
	}

	var req model.UpdatePrescriptionRequest
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

	prescription, err := h.svc.Exercise().UpdatePrescription(c.Request().Context(), id, &req)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Prescription not found",
			})
		}
		log.Error().Err(err).Str("prescription_id", id).Msg("failed to update prescription")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to update prescription",
		})
	}

	return c.JSON(http.StatusOK, toPrescriptionResponse(*prescription))
}

// DeletePrescription deletes a prescription.
// @Summary Delete prescription
// @Description Deletes an exercise prescription
// @Tags exercises
// @Accept json
// @Produce json
// @Param pid path string true "Patient ID"
// @Param id path string true "Prescription ID"
// @Success 204 "No Content"
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{pid}/exercises/{id} [delete]
func (h *ExerciseHandler) DeletePrescription(c echo.Context) error {
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
			Message: "Prescription ID is required",
		})
	}

	err := h.svc.Exercise().DeletePrescription(c.Request().Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Prescription not found",
			})
		}
		log.Error().Err(err).Str("prescription_id", id).Msg("failed to delete prescription")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to delete prescription",
		})
	}

	return c.NoContent(http.StatusNoContent)
}

// GetHandout generates a PDF handout of patient exercises.
// @Summary Get exercise handout
// @Description Generates a PDF handout of prescribed exercises for a patient
// @Tags exercises
// @Accept json
// @Produce application/pdf
// @Param pid path string true "Patient ID"
// @Param lang query string false "Language (en or vi)" default(vi)
// @Success 200 {file} file "PDF document"
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{pid}/exercises/handout [get]
func (h *ExerciseHandler) GetHandout(c echo.Context) error {
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

	language := c.QueryParam("lang")
	if language == "" {
		language = "vi"
	}

	pdfData, err := h.svc.Exercise().GenerateHandoutPDF(c.Request().Context(), patientID, language)
	if err != nil {
		log.Error().Err(err).Str("patient_id", patientID).Msg("failed to generate handout")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to generate exercise handout",
		})
	}

	// For now, return as plain text since we don't have a PDF library
	// In production, use proper PDF generation
	c.Response().Header().Set("Content-Type", "text/plain; charset=utf-8")
	c.Response().Header().Set("Content-Disposition", "attachment; filename=exercise_handout.txt")

	return c.Blob(http.StatusOK, "text/plain", pdfData)
}

// GetComplianceSummary retrieves a patient's exercise compliance summary.
// @Summary Get compliance summary
// @Description Retrieves exercise compliance summary for a patient
// @Tags exercises
// @Accept json
// @Produce json
// @Param pid path string true "Patient ID"
// @Success 200 {object} ComplianceSummaryResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{pid}/exercises/compliance [get]
func (h *ExerciseHandler) GetComplianceSummary(c echo.Context) error {
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

	summary, err := h.svc.Exercise().GetPatientComplianceSummary(c.Request().Context(), patientID)
	if err != nil {
		log.Error().Err(err).Str("patient_id", patientID).Msg("failed to get compliance summary")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve compliance summary",
		})
	}

	response := ComplianceSummaryResponse{
		TotalPrescriptions:     summary.TotalPrescriptions,
		ActivePrescriptions:    summary.ActivePrescriptions,
		CompletedPrescriptions: summary.CompletedPrescriptions,
		TotalComplianceLogs:    summary.TotalComplianceLogs,
		ComplianceRate:         summary.ComplianceRate,
	}

	if summary.LastActivityDate != nil {
		formatted := summary.LastActivityDate.Format(time.RFC3339)
		response.LastActivityDate = &formatted
	}

	return c.JSON(http.StatusOK, response)
}

// LogCompliance logs exercise completion.
// @Summary Log exercise completion
// @Description Logs that a patient completed an exercise
// @Tags exercises
// @Accept json
// @Produce json
// @Param pid path string true "Patient ID"
// @Param id path string true "Prescription ID"
// @Param log body model.LogComplianceRequest true "Compliance data"
// @Success 201 {object} ComplianceLogResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{pid}/exercises/{id}/log [post]
func (h *ExerciseHandler) LogCompliance(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	patientID := c.Param("pid")
	prescriptionID := c.Param("id")
	if patientID == "" || prescriptionID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Patient ID and Prescription ID are required",
		})
	}

	var req model.LogComplianceRequest
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

	complianceLog, err := h.svc.Exercise().LogCompliance(c.Request().Context(), prescriptionID, patientID, &req)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Prescription not found",
			})
		}
		log.Error().Err(err).Str("prescription_id", prescriptionID).Msg("failed to log compliance")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to log exercise completion",
		})
	}

	return c.JSON(http.StatusCreated, toComplianceLogResponse(*complianceLog))
}

// toExerciseResponse converts an Exercise model to ExerciseResponse.
func toExerciseResponse(e model.Exercise) ExerciseResponse {
	muscleGroups := make([]string, len(e.MuscleGroups))
	for i, mg := range e.MuscleGroups {
		muscleGroups[i] = string(mg)
	}

	return ExerciseResponse{
		ID:              e.ID,
		ClinicID:        e.ClinicID,
		Name:            e.Name,
		NameVi:          e.NameVi,
		Description:     e.Description,
		DescriptionVi:   e.DescriptionVi,
		Instructions:    e.Instructions,
		InstructionsVi:  e.InstructionsVi,
		Category:        string(e.Category),
		Difficulty:      string(e.Difficulty),
		Equipment:       e.Equipment,
		MuscleGroups:    muscleGroups,
		ImageURL:        e.ImageURL,
		VideoURL:        e.VideoURL,
		ThumbnailURL:    e.ThumbnailURL,
		DefaultSets:     e.DefaultSets,
		DefaultReps:     e.DefaultReps,
		DefaultHoldSecs: e.DefaultHoldSecs,
		Precautions:     e.Precautions,
		PrecautionsVi:   e.PrecautionsVi,
		IsGlobal:        e.IsGlobal,
		IsActive:        e.IsActive,
		CreatedAt:       e.CreatedAt.Format(time.RFC3339),
		UpdatedAt:       e.UpdatedAt.Format(time.RFC3339),
	}
}

// toPrescriptionResponse converts an ExercisePrescription model to PrescriptionResponse.
func toPrescriptionResponse(p model.ExercisePrescription) PrescriptionResponse {
	resp := PrescriptionResponse{
		ID:                 p.ID,
		PatientID:          p.PatientID,
		ExerciseID:         p.ExerciseID,
		ProgramID:          p.ProgramID,
		Sets:               p.Sets,
		Reps:               p.Reps,
		HoldSeconds:        p.HoldSeconds,
		Frequency:          p.Frequency,
		DurationWeeks:      p.DurationWeeks,
		CustomInstructions: p.CustomInstructions,
		Notes:              p.Notes,
		Status:             string(p.Status),
		StartDate:          p.StartDate.Format("2006-01-02"),
		CreatedAt:          p.CreatedAt.Format(time.RFC3339),
		UpdatedAt:          p.UpdatedAt.Format(time.RFC3339),
	}

	if p.EndDate != nil {
		formatted := p.EndDate.Format("2006-01-02")
		resp.EndDate = &formatted
	}

	if p.Exercise != nil {
		exerciseResp := toExerciseResponse(*p.Exercise)
		resp.Exercise = &exerciseResp
	}

	return resp
}

// toComplianceLogResponse converts an ExerciseComplianceLog model to ComplianceLogResponse.
func toComplianceLogResponse(l model.ExerciseComplianceLog) ComplianceLogResponse {
	return ComplianceLogResponse{
		ID:             l.ID,
		PrescriptionID: l.PrescriptionID,
		CompletedAt:    l.CompletedAt.Format(time.RFC3339),
		SetsCompleted:  l.SetsCompleted,
		RepsCompleted:  l.RepsCompleted,
		PainLevel:      l.PainLevel,
		Difficulty:     l.Difficulty,
		Notes:          l.Notes,
	}
}
