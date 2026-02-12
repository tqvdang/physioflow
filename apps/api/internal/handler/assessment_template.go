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

// AssessmentTemplateHandler handles assessment template HTTP requests.
type AssessmentTemplateHandler struct {
	svc *service.Service
}

// NewAssessmentTemplateHandler creates a new AssessmentTemplateHandler.
func NewAssessmentTemplateHandler(svc *service.Service) *AssessmentTemplateHandler {
	return &AssessmentTemplateHandler{svc: svc}
}

// AssessmentTemplateResponse represents an assessment template in API responses.
type AssessmentTemplateResponse struct {
	ID             string                           `json:"id"`
	Name           string                           `json:"name"`
	NameVi         string                           `json:"name_vi"`
	Condition      string                           `json:"condition"`
	Category       string                           `json:"category"`
	Description    string                           `json:"description,omitempty"`
	DescriptionVi  string                           `json:"description_vi,omitempty"`
	ChecklistItems []model.AssessmentChecklistItem  `json:"checklist_items"`
	ItemCount      int                              `json:"item_count"`
	IsActive       bool                             `json:"is_active"`
	CreatedAt      string                           `json:"created_at"`
	UpdatedAt      string                           `json:"updated_at"`
}

// AssessmentResultResponse represents a patient assessment result in API responses.
type AssessmentResultResponse struct {
	ID                string `json:"id"`
	PatientID         string `json:"patient_id"`
	TemplateID        string `json:"template_id"`
	ClinicID          string `json:"clinic_id"`
	TherapistID       string `json:"therapist_id"`
	Results           any    `json:"results"`
	Notes             string `json:"notes,omitempty"`
	AssessedAt        string `json:"assessed_at"`
	CreatedAt         string `json:"created_at"`
	UpdatedAt         string `json:"updated_at"`
	TemplateName      string `json:"template_name,omitempty"`
	TemplateNameVi    string `json:"template_name_vi,omitempty"`
	TemplateCondition string `json:"template_condition,omitempty"`
}

// ListTemplates retrieves all assessment templates.
// @Summary List assessment templates
// @Description Retrieves all active condition-specific assessment templates
// @Tags assessment-templates
// @Produce json
// @Param category query string false "Filter by category" Enums(musculoskeletal, neurological, pediatric)
// @Success 200 {array} TemplateResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/assessment-templates [get]
func (h *AssessmentTemplateHandler) ListTemplates(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	category := c.QueryParam("category")

	var templates []*model.AssessmentTemplate
	var err error

	if category != "" {
		templates, err = h.svc.AssessmentTemplate().GetTemplatesByCategory(c.Request().Context(), category)
	} else {
		templates, err = h.svc.AssessmentTemplate().GetTemplates(c.Request().Context())
	}

	if err != nil {
		log.Error().Err(err).Msg("failed to list assessment templates")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve assessment templates",
		})
	}

	results := make([]AssessmentTemplateResponse, len(templates))
	for i, t := range templates {
		results[i] = toAssessmentTemplateResponse(t)
	}

	return c.JSON(http.StatusOK, results)
}

// GetTemplate retrieves a single assessment template by ID.
// @Summary Get assessment template
// @Description Retrieves a condition-specific assessment template with its checklist items
// @Tags assessment-templates
// @Produce json
// @Param id path string true "Template ID"
// @Success 200 {object} TemplateResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/assessment-templates/{id} [get]
func (h *AssessmentTemplateHandler) GetTemplate(c echo.Context) error {
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
			Message: "Template ID is required",
		})
	}

	template, err := h.svc.AssessmentTemplate().GetTemplateByID(c.Request().Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Assessment template not found",
			})
		}
		log.Error().Err(err).Str("template_id", id).Msg("failed to get assessment template")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve assessment template",
		})
	}

	return c.JSON(http.StatusOK, toAssessmentTemplateResponse(template))
}

// SaveResult saves a patient assessment result.
// @Summary Save assessment result
// @Description Saves a patient's completed assessment based on a template
// @Tags assessment-templates
// @Accept json
// @Produce json
// @Param result body model.CreateAssessmentResultRequest true "Assessment result data"
// @Success 201 {object} AssessmentResultResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/assessment-templates/results [post]
func (h *AssessmentTemplateHandler) SaveResult(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	var req model.CreateAssessmentResultRequest
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

	result, err := h.svc.AssessmentTemplate().SaveAssessmentResult(c.Request().Context(), user.ClinicID, user.UserID, &req)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Assessment template not found",
			})
		}
		log.Error().Err(err).
			Str("patient_id", req.PatientID).
			Str("template_id", req.TemplateID).
			Msg("failed to save assessment result")
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "validation_failed",
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, toAssessmentResultResponse(result))
}

// GetPatientResults retrieves all assessment results for a patient.
// @Summary Get patient assessment results
// @Description Retrieves all completed assessment results for a patient
// @Tags assessment-templates
// @Produce json
// @Param patientId path string true "Patient ID"
// @Success 200 {array} AssessmentResultResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/assessment-templates/results/patient/{patientId} [get]
func (h *AssessmentTemplateHandler) GetPatientResults(c echo.Context) error {
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

	results, err := h.svc.AssessmentTemplate().GetPatientResults(c.Request().Context(), patientID)
	if err != nil {
		log.Error().Err(err).Str("patient_id", patientID).Msg("failed to get patient assessment results")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve patient assessment results",
		})
	}

	responses := make([]AssessmentResultResponse, len(results))
	for i, r := range results {
		responses[i] = toAssessmentResultResponse(r)
	}

	return c.JSON(http.StatusOK, responses)
}

// toAssessmentTemplateResponse converts an AssessmentTemplate model to a response.
func toAssessmentTemplateResponse(t *model.AssessmentTemplate) AssessmentTemplateResponse {
	return AssessmentTemplateResponse{
		ID:             t.ID,
		Name:           t.Name,
		NameVi:         t.NameVi,
		Condition:      t.Condition,
		Category:       string(t.Category),
		Description:    t.Description,
		DescriptionVi:  t.DescriptionVi,
		ChecklistItems: t.ChecklistItems,
		ItemCount:      len(t.ChecklistItems),
		IsActive:       t.IsActive,
		CreatedAt:      t.CreatedAt.Format(time.RFC3339),
		UpdatedAt:      t.UpdatedAt.Format(time.RFC3339),
	}
}

// toAssessmentResultResponse converts a PatientAssessmentResult model to a response.
func toAssessmentResultResponse(r *model.PatientAssessmentResult) AssessmentResultResponse {
	return AssessmentResultResponse{
		ID:                r.ID,
		PatientID:         r.PatientID,
		TemplateID:        r.TemplateID,
		ClinicID:          r.ClinicID,
		TherapistID:       r.TherapistID,
		Results:           r.Results,
		Notes:             r.Notes,
		AssessedAt:        r.AssessedAt.Format(time.RFC3339),
		CreatedAt:         r.CreatedAt.Format(time.RFC3339),
		UpdatedAt:         r.UpdatedAt.Format(time.RFC3339),
		TemplateName:      r.TemplateName,
		TemplateNameVi:    r.TemplateNameVi,
		TemplateCondition: r.TemplateCondition,
	}
}
