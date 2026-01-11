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

// PatientHandler handles patient-related HTTP requests.
type PatientHandler struct {
	svc *service.Service
}

// NewPatientHandler creates a new PatientHandler.
func NewPatientHandler(svc *service.Service) *PatientHandler {
	return &PatientHandler{svc: svc}
}

// PatientResponse represents a patient in API responses.
type PatientResponse struct {
	ID                 string                  `json:"id"`
	ClinicID           string                  `json:"clinic_id"`
	MRN                string                  `json:"mrn"`
	FirstName          string                  `json:"first_name"`
	LastName           string                  `json:"last_name"`
	FirstNameVi        string                  `json:"first_name_vi,omitempty"`
	LastNameVi         string                  `json:"last_name_vi,omitempty"`
	FullName           string                  `json:"full_name"`
	FullNameVi         string                  `json:"full_name_vi,omitempty"`
	DateOfBirth        string                  `json:"date_of_birth"`
	Age                int                     `json:"age"`
	Gender             string                  `json:"gender"`
	Phone              string                  `json:"phone,omitempty"`
	Email              string                  `json:"email,omitempty"`
	Address            string                  `json:"address,omitempty"`
	AddressVi          string                  `json:"address_vi,omitempty"`
	LanguagePreference string                  `json:"language_preference"`
	EmergencyContact   *model.EmergencyContact `json:"emergency_contact,omitempty"`
	MedicalAlerts      []string                `json:"medical_alerts,omitempty"`
	Notes              string                  `json:"notes,omitempty"`
	IsActive           bool                    `json:"is_active"`
	CreatedAt          string                  `json:"created_at"`
	UpdatedAt          string                  `json:"updated_at"`
}

// PatientListResponse represents a paginated list of patients.
type PatientListResponse struct {
	Data       []PatientResponse `json:"data"`
	Total      int64             `json:"total"`
	Page       int               `json:"page"`
	PerPage    int               `json:"per_page"`
	TotalPages int               `json:"total_pages"`
}

// PatientDashboardResponse represents aggregated patient dashboard data.
type PatientDashboardResponse struct {
	Patient              PatientResponse          `json:"patient"`
	TotalAppointments    int                      `json:"total_appointments"`
	UpcomingAppointments int                      `json:"upcoming_appointments"`
	CompletedSessions    int                      `json:"completed_sessions"`
	ActiveTreatmentPlans int                      `json:"active_treatment_plans"`
	LastVisit            *string                  `json:"last_visit,omitempty"`
	NextAppointment      *string                  `json:"next_appointment,omitempty"`
	InsuranceInfo        []model.PatientInsurance `json:"insurance_info,omitempty"`
}

// DuplicateCheckResponse represents potential duplicate patients.
type DuplicateCheckResponse struct {
	Duplicates []DuplicateMatch `json:"duplicates"`
	Count      int              `json:"count"`
}

// DuplicateMatch represents a potential duplicate patient match.
type DuplicateMatch struct {
	Patient    PatientResponse `json:"patient"`
	MatchScore float64         `json:"match_score"`
	MatchType  string          `json:"match_type"`
}

// ErrorResponse represents an error response.
type ErrorResponse struct {
	Error   string            `json:"error"`
	Message string            `json:"message"`
	Details map[string]string `json:"details,omitempty"`
}

// List returns a paginated list of patients.
// @Summary List patients
// @Description Returns a paginated list of patients with filtering and search
// @Tags patients
// @Accept json
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param per_page query int false "Items per page" default(20) maximum(100)
// @Param search query string false "Search term (name, MRN, phone, email)"
// @Param gender query string false "Filter by gender" Enums(male, female, other, prefer_not_to_say)
// @Param is_active query bool false "Filter by active status" default(true)
// @Param min_age query int false "Filter by minimum age"
// @Param max_age query int false "Filter by maximum age"
// @Param sort_by query string false "Sort field" Enums(created_at, updated_at, first_name, last_name, date_of_birth, mrn)
// @Param sort_order query string false "Sort order" Enums(asc, desc) default(desc)
// @Success 200 {object} PatientListResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients [get]
func (h *PatientHandler) List(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	// Build search params from query
	params := model.NewPatientSearchParams()
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
	params.Gender = c.QueryParam("gender")
	params.SortBy = c.QueryParam("sort_by")
	params.SortOrder = c.QueryParam("sort_order")

	if isActive := c.QueryParam("is_active"); isActive != "" {
		if active, err := strconv.ParseBool(isActive); err == nil {
			params.IsActive = &active
		}
	}

	if minAge := c.QueryParam("min_age"); minAge != "" {
		if age, err := strconv.Atoi(minAge); err == nil {
			params.MinAge = &age
		}
	}

	if maxAge := c.QueryParam("max_age"); maxAge != "" {
		if age, err := strconv.Atoi(maxAge); err == nil {
			params.MaxAge = &age
		}
	}

	result, err := h.svc.Patient().List(c.Request().Context(), params)
	if err != nil {
		log.Error().Err(err).Msg("failed to list patients")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve patients",
		})
	}

	// Convert to response format
	data := make([]PatientResponse, len(result.Data))
	for i, p := range result.Data {
		data[i] = toPatientResponse(p)
	}

	return c.JSON(http.StatusOK, PatientListResponse{
		Data:       data,
		Total:      result.Total,
		Page:       result.Page,
		PerPage:    result.PerPage,
		TotalPages: result.TotalPages,
	})
}

// Create creates a new patient.
// @Summary Create patient
// @Description Creates a new patient record
// @Tags patients
// @Accept json
// @Produce json
// @Param patient body model.CreatePatientRequest true "Patient data"
// @Success 201 {object} PatientResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse "Duplicate detected"
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients [post]
func (h *PatientHandler) Create(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	var req model.CreatePatientRequest
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

	patient, err := h.svc.Patient().Create(c.Request().Context(), user.ClinicID, user.UserID, &req)
	if err != nil {
		if errors.Is(err, repository.ErrAlreadyExists) {
			return c.JSON(http.StatusConflict, ErrorResponse{
				Error:   "duplicate",
				Message: "A patient with this information already exists",
			})
		}
		log.Error().Err(err).Msg("failed to create patient")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to create patient",
		})
	}

	return c.JSON(http.StatusCreated, toPatientResponse(*patient))
}

// Get retrieves a patient by ID.
// @Summary Get patient
// @Description Retrieves a patient by their ID
// @Tags patients
// @Accept json
// @Produce json
// @Param id path string true "Patient ID (UUID)"
// @Success 200 {object} PatientResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{id} [get]
func (h *PatientHandler) Get(c echo.Context) error {
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
			Message: "Patient ID is required",
		})
	}

	patient, err := h.svc.Patient().GetByID(c.Request().Context(), user.ClinicID, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Patient not found",
			})
		}
		log.Error().Err(err).Str("patient_id", id).Msg("failed to get patient")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve patient",
		})
	}

	return c.JSON(http.StatusOK, toPatientResponse(*patient))
}

// Update updates an existing patient.
// @Summary Update patient
// @Description Updates an existing patient record
// @Tags patients
// @Accept json
// @Produce json
// @Param id path string true "Patient ID (UUID)"
// @Param patient body model.UpdatePatientRequest true "Patient data"
// @Success 200 {object} PatientResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{id} [put]
func (h *PatientHandler) Update(c echo.Context) error {
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
			Message: "Patient ID is required",
		})
	}

	var req model.UpdatePatientRequest
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

	patient, err := h.svc.Patient().Update(c.Request().Context(), user.ClinicID, id, user.UserID, &req)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Patient not found",
			})
		}
		log.Error().Err(err).Str("patient_id", id).Msg("failed to update patient")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to update patient",
		})
	}

	return c.JSON(http.StatusOK, toPatientResponse(*patient))
}

// Delete removes a patient.
// @Summary Delete patient
// @Description Soft deletes a patient record
// @Tags patients
// @Accept json
// @Produce json
// @Param id path string true "Patient ID (UUID)"
// @Success 204 "No Content"
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{id} [delete]
func (h *PatientHandler) Delete(c echo.Context) error {
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
			Message: "Patient ID is required",
		})
	}

	err := h.svc.Patient().Delete(c.Request().Context(), user.ClinicID, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Patient not found",
			})
		}
		log.Error().Err(err).Str("patient_id", id).Msg("failed to delete patient")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to delete patient",
		})
	}

	return c.NoContent(http.StatusNoContent)
}

// Search performs a quick search for patients.
// @Summary Search patients
// @Description Quick search for patients by name, MRN, or phone
// @Tags patients
// @Accept json
// @Produce json
// @Param q query string true "Search query"
// @Param limit query int false "Maximum results" default(10) maximum(50)
// @Success 200 {array} PatientResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/search [get]
func (h *PatientHandler) Search(c echo.Context) error {
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

	patients, err := h.svc.Patient().Search(c.Request().Context(), user.ClinicID, query, limit)
	if err != nil {
		log.Error().Err(err).Str("query", query).Msg("failed to search patients")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to search patients",
		})
	}

	results := make([]PatientResponse, len(patients))
	for i, p := range patients {
		results[i] = toPatientResponse(p)
	}

	return c.JSON(http.StatusOK, results)
}

// Dashboard retrieves aggregated patient dashboard data.
// @Summary Get patient dashboard
// @Description Retrieves aggregated patient data including appointments, treatments, and insurance
// @Tags patients
// @Accept json
// @Produce json
// @Param id path string true "Patient ID (UUID)"
// @Success 200 {object} PatientDashboardResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{id}/dashboard [get]
func (h *PatientHandler) Dashboard(c echo.Context) error {
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
			Message: "Patient ID is required",
		})
	}

	dashboard, err := h.svc.Patient().GetDashboard(c.Request().Context(), user.ClinicID, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Patient not found",
			})
		}
		log.Error().Err(err).Str("patient_id", id).Msg("failed to get patient dashboard")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve patient dashboard",
		})
	}

	response := PatientDashboardResponse{
		Patient:              toPatientResponse(dashboard.Patient),
		TotalAppointments:    dashboard.TotalAppointments,
		UpcomingAppointments: dashboard.UpcomingAppointments,
		CompletedSessions:    dashboard.CompletedSessions,
		ActiveTreatmentPlans: dashboard.ActiveTreatmentPlans,
		InsuranceInfo:        dashboard.InsuranceInfo,
	}

	if dashboard.LastVisit != nil {
		formatted := dashboard.LastVisit.Format(time.RFC3339)
		response.LastVisit = &formatted
	}
	if dashboard.NextAppointment != nil {
		formatted := dashboard.NextAppointment.Format(time.RFC3339)
		response.NextAppointment = &formatted
	}

	return c.JSON(http.StatusOK, response)
}

// CheckDuplicates checks for potential duplicate patients.
// @Summary Check for duplicate patients
// @Description Checks if a patient with similar information already exists
// @Tags patients
// @Accept json
// @Produce json
// @Param phone query string false "Phone number"
// @Param first_name query string true "First name"
// @Param last_name query string true "Last name"
// @Success 200 {object} DuplicateCheckResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/check-duplicates [get]
func (h *PatientHandler) CheckDuplicates(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	firstName := c.QueryParam("first_name")
	lastName := c.QueryParam("last_name")
	phone := c.QueryParam("phone")

	if firstName == "" || lastName == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "First name and last name are required",
		})
	}

	duplicates, err := h.svc.Patient().CheckDuplicates(c.Request().Context(), user.ClinicID, phone, firstName, lastName)
	if err != nil {
		log.Error().Err(err).Msg("failed to check duplicates")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to check for duplicates",
		})
	}

	matches := make([]DuplicateMatch, len(duplicates))
	for i, d := range duplicates {
		matches[i] = DuplicateMatch{
			Patient:    toPatientResponse(d.Patient),
			MatchScore: d.MatchScore,
			MatchType:  d.MatchType,
		}
	}

	return c.JSON(http.StatusOK, DuplicateCheckResponse{
		Duplicates: matches,
		Count:      len(matches),
	})
}

// toPatientResponse converts a Patient model to PatientResponse.
func toPatientResponse(p model.Patient) PatientResponse {
	resp := PatientResponse{
		ID:                 p.ID,
		ClinicID:           p.ClinicID,
		MRN:                p.MRN,
		FirstName:          p.FirstName,
		LastName:           p.LastName,
		FirstNameVi:        p.FirstNameVi,
		LastNameVi:         p.LastNameVi,
		FullName:           p.FullName(),
		DateOfBirth:        p.DateOfBirth.Format("2006-01-02"),
		Age:                p.Age(),
		Gender:             string(p.Gender),
		Phone:              p.Phone,
		Email:              p.Email,
		Address:            p.Address,
		AddressVi:          p.AddressVi,
		LanguagePreference: string(p.LanguagePreference),
		MedicalAlerts:      p.MedicalAlerts,
		Notes:              p.Notes,
		IsActive:           p.IsActive,
		CreatedAt:          p.CreatedAt.Format(time.RFC3339),
		UpdatedAt:          p.UpdatedAt.Format(time.RFC3339),
	}

	// Set Vietnamese full name if available
	if p.FirstNameVi != "" || p.LastNameVi != "" {
		resp.FullNameVi = p.FullNameVi()
	}

	// Include emergency contact if not empty
	if p.EmergencyContact.Name != "" || p.EmergencyContact.Phone != "" {
		resp.EmergencyContact = &p.EmergencyContact
	}

	return resp
}
