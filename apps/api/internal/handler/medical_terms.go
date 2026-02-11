package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
	"github.com/tqvdang/physioflow/apps/api/internal/service"
	"github.com/tqvdang/physioflow/apps/api/pkg/validator"
)

// MedicalTermsHandler handles medical terms HTTP requests.
type MedicalTermsHandler struct {
	svc *service.Service
}

// NewMedicalTermsHandler creates a new MedicalTermsHandler.
func NewMedicalTermsHandler(svc *service.Service) *MedicalTermsHandler {
	return &MedicalTermsHandler{svc: svc}
}

// MedicalTermResponse represents a medical term in API responses.
type MedicalTermResponse struct {
	ID           string   `json:"id"`
	TermEn       string   `json:"term_en"`
	TermVi       string   `json:"term_vi"`
	DefinitionEn string   `json:"definition_en,omitempty"`
	DefinitionVi string   `json:"definition_vi,omitempty"`
	Category     string   `json:"category"`
	Subcategory  string   `json:"subcategory,omitempty"`
	ICD10Code    string   `json:"icd10_code,omitempty"`
	AliasesEn    []string `json:"aliases_en,omitempty"`
	AliasesVi    []string `json:"aliases_vi,omitempty"`
	CommonlyUsed bool     `json:"commonly_used"`
	UsageNotes   string   `json:"usage_notes,omitempty"`
	IsActive     bool     `json:"is_active"`
	CreatedAt    string   `json:"created_at"`
	UpdatedAt    string   `json:"updated_at"`
}

// TermSearchResultResponse represents a search result in API responses.
type TermSearchResultResponse struct {
	Term       MedicalTermResponse `json:"term"`
	Score      float64             `json:"score"`
	MatchField string              `json:"match_field"`
}

// SearchTerms performs trigram-based autocomplete search on medical terms.
// @Summary Search medical terms
// @Description Performs trigram-based autocomplete search on Vietnamese and English medical terms
// @Tags medical-terms
// @Accept json
// @Produce json
// @Param q query string true "Search query (min 2 characters)"
// @Param category query string false "Filter by category" Enums(anatomy, symptom, condition, treatment, assessment)
// @Success 200 {array} TermSearchResultResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/medical-terms/search [get]
func (h *MedicalTermsHandler) SearchTerms(c echo.Context) error {
	query := c.QueryParam("q")
	if query == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Search query parameter 'q' is required",
		})
	}

	category := c.QueryParam("category")

	results, err := h.svc.MedicalTerms().SearchTerms(c.Request().Context(), query, category)
	if err != nil {
		if err.Error() == "search query must be at least 2 characters" || err.Error() == "invalid category" {
			return c.JSON(http.StatusBadRequest, ErrorResponse{
				Error:   "invalid_request",
				Message: err.Error(),
			})
		}
		log.Error().Err(err).Str("query", query).Msg("failed to search medical terms")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to search medical terms",
		})
	}

	response := make([]TermSearchResultResponse, len(results))
	for i, r := range results {
		response[i] = toTermSearchResultResponse(r)
	}

	return c.JSON(http.StatusOK, response)
}

// GetTermByID retrieves a medical term by ID.
// @Summary Get medical term
// @Description Retrieves a medical term by ID
// @Tags medical-terms
// @Accept json
// @Produce json
// @Param id path string true "Term ID"
// @Success 200 {object} MedicalTermResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/medical-terms/{id} [get]
func (h *MedicalTermsHandler) GetTermByID(c echo.Context) error {
	id := c.Param("id")
	if id == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Term ID is required",
		})
	}

	term, err := h.svc.MedicalTerms().GetTermByID(c.Request().Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Medical term not found",
			})
		}
		log.Error().Err(err).Str("term_id", id).Msg("failed to get medical term")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve medical term",
		})
	}

	return c.JSON(http.StatusOK, toMedicalTermResponse(term))
}

// CreateCustomTerm adds a custom medical term.
// @Summary Create medical term
// @Description Creates a custom medical term
// @Tags medical-terms
// @Accept json
// @Produce json
// @Param term body model.CreateMedicalTermRequest true "Term data"
// @Success 201 {object} MedicalTermResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/medical-terms [post]
func (h *MedicalTermsHandler) CreateCustomTerm(c echo.Context) error {
	var req model.CreateMedicalTermRequest
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

	term, err := h.svc.MedicalTerms().CreateCustomTerm(c.Request().Context(), &req)
	if err != nil {
		log.Error().Err(err).Msg("failed to create medical term")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to create medical term",
		})
	}

	return c.JSON(http.StatusCreated, toMedicalTermResponse(term))
}

// GetTermsByCategory retrieves all medical terms for a given category.
// @Summary Get terms by category
// @Description Retrieves all active medical terms for a given category
// @Tags medical-terms
// @Accept json
// @Produce json
// @Param category path string true "Category" Enums(anatomy, symptom, condition, treatment, assessment)
// @Success 200 {array} MedicalTermResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/medical-terms/category/{category} [get]
func (h *MedicalTermsHandler) GetTermsByCategory(c echo.Context) error {
	category := c.Param("category")
	if category == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Category is required",
		})
	}

	terms, err := h.svc.MedicalTerms().GetTermsByCategory(c.Request().Context(), category)
	if err != nil {
		if err.Error() == "invalid category" {
			return c.JSON(http.StatusBadRequest, ErrorResponse{
				Error:   "invalid_request",
				Message: "Invalid category. Valid categories: anatomy, symptom, condition, treatment, assessment",
			})
		}
		log.Error().Err(err).Str("category", category).Msg("failed to get medical terms by category")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve medical terms",
		})
	}

	response := make([]MedicalTermResponse, len(terms))
	for i, t := range terms {
		response[i] = toMedicalTermResponse(t)
	}

	return c.JSON(http.StatusOK, response)
}

// GetTermByICD10 retrieves a medical term by ICD-10 code.
// @Summary Get term by ICD-10 code
// @Description Retrieves a medical term by its ICD-10 code
// @Tags medical-terms
// @Accept json
// @Produce json
// @Param code path string true "ICD-10 code"
// @Success 200 {object} MedicalTermResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/medical-terms/icd10/{code} [get]
func (h *MedicalTermsHandler) GetTermByICD10(c echo.Context) error {
	code := c.Param("code")
	if code == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "ICD-10 code is required",
		})
	}

	term, err := h.svc.MedicalTerms().GetTermByICD10(c.Request().Context(), code)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Medical term not found for the given ICD-10 code",
			})
		}
		log.Error().Err(err).Str("icd10_code", code).Msg("failed to get medical term by ICD-10")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve medical term",
		})
	}

	return c.JSON(http.StatusOK, toMedicalTermResponse(term))
}

// toMedicalTermResponse converts a MedicalTerm model to MedicalTermResponse.
func toMedicalTermResponse(t *model.MedicalTerm) MedicalTermResponse {
	return MedicalTermResponse{
		ID:           t.ID,
		TermEn:       t.TermEn,
		TermVi:       t.TermVi,
		DefinitionEn: t.DefinitionEn,
		DefinitionVi: t.DefinitionVi,
		Category:     t.Category,
		Subcategory:  t.Subcategory,
		ICD10Code:    t.ICD10Code,
		AliasesEn:    t.AliasesEn,
		AliasesVi:    t.AliasesVi,
		CommonlyUsed: t.CommonlyUsed,
		UsageNotes:   t.UsageNotes,
		IsActive:     t.IsActive,
		CreatedAt:    t.CreatedAt.Format(time.RFC3339),
		UpdatedAt:    t.UpdatedAt.Format(time.RFC3339),
	}
}

// toTermSearchResultResponse converts a TermSearchResult to TermSearchResultResponse.
func toTermSearchResultResponse(r *model.TermSearchResult) TermSearchResultResponse {
	return TermSearchResultResponse{
		Term:       toMedicalTermResponse(&r.Term),
		Score:      r.Score,
		MatchField: r.MatchField,
	}
}
