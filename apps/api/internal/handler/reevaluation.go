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

// ReevaluationHandler handles re-evaluation related HTTP requests.
type ReevaluationHandler struct {
	svc *service.Service
}

// NewReevaluationHandler creates a new ReevaluationHandler.
func NewReevaluationHandler(svc *service.Service) *ReevaluationHandler {
	return &ReevaluationHandler{svc: svc}
}

// ReevaluationAssessmentResponse represents a re-evaluation assessment in API responses.
type ReevaluationAssessmentResponse struct {
	ID                   string   `json:"id"`
	PatientID            string   `json:"patient_id"`
	VisitID              *string  `json:"visit_id,omitempty"`
	ClinicID             string   `json:"clinic_id"`
	BaselineAssessmentID *string  `json:"baseline_assessment_id,omitempty"`
	AssessmentType       string   `json:"assessment_type"`
	MeasureLabel         string   `json:"measure_label"`
	CurrentValue         float64  `json:"current_value"`
	BaselineValue        float64  `json:"baseline_value"`
	Change               float64  `json:"change"`
	ChangePercentage     *float64 `json:"change_percentage,omitempty"`
	HigherIsBetter       bool     `json:"higher_is_better"`
	MCIDThreshold        *float64 `json:"mcid_threshold,omitempty"`
	MCIDAchieved         bool     `json:"mcid_achieved"`
	Interpretation       string   `json:"interpretation"`
	TherapistID          string   `json:"therapist_id"`
	Notes                string   `json:"notes,omitempty"`
	AssessedAt           string   `json:"assessed_at"`
	CreatedAt            string   `json:"created_at"`
	UpdatedAt            string   `json:"updated_at"`
}

// ReevaluationSummaryResponse represents a re-evaluation summary in API responses.
type ReevaluationSummaryResponse struct {
	PatientID    string                           `json:"patient_id"`
	VisitID      *string                          `json:"visit_id,omitempty"`
	TherapistID  string                           `json:"therapist_id"`
	AssessedAt   string                           `json:"assessed_at"`
	Comparisons  []ReevaluationAssessmentResponse `json:"comparisons"`
	TotalItems   int                              `json:"total_items"`
	Improved     int                              `json:"improved"`
	Declined     int                              `json:"declined"`
	Stable       int                              `json:"stable"`
	MCIDAchieved int                              `json:"mcid_achieved"`
}

// CreateReevaluation creates a new re-evaluation with baseline comparison.
// @Summary Create re-evaluation
// @Description Creates a re-evaluation assessment comparing current values to baseline
// @Tags reevaluation
// @Accept json
// @Produce json
// @Param reevaluation body model.CreateReevaluationRequest true "Re-evaluation data"
// @Success 201 {object} ReevaluationSummaryResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/assessments/reevaluation [post]
func (h *ReevaluationHandler) CreateReevaluation(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	var req model.CreateReevaluationRequest
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

	summary, err := h.svc.Reevaluation().PerformReevaluation(c.Request().Context(), user.ClinicID, user.UserID, &req)
	if err != nil {
		log.Error().Err(err).
			Str("patient_id", req.PatientID).
			Msg("failed to perform reevaluation")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to perform re-evaluation",
		})
	}

	return c.JSON(http.StatusCreated, toReevaluationSummaryResponse(summary))
}

// GetPatientReevaluations retrieves all re-evaluation history for a patient.
// @Summary Get patient re-evaluation history
// @Description Retrieves all re-evaluation assessments for a patient
// @Tags reevaluation
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID"
// @Success 200 {array} ReevaluationAssessmentResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/assessments/reevaluation/patient/{patientId} [get]
func (h *ReevaluationHandler) GetPatientReevaluations(c echo.Context) error {
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

	assessments, err := h.svc.Reevaluation().GetReevaluationHistory(c.Request().Context(), patientID)
	if err != nil {
		log.Error().Err(err).
			Str("patient_id", patientID).
			Msg("failed to get reevaluation history")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve re-evaluation history",
		})
	}

	results := make([]ReevaluationAssessmentResponse, len(assessments))
	for i, a := range assessments {
		results[i] = toReevaluationAssessmentResponse(a)
	}

	return c.JSON(http.StatusOK, results)
}

// GetComparison retrieves detailed comparison data for a specific re-evaluation session.
// @Summary Get re-evaluation comparison
// @Description Retrieves all comparison items for a specific re-evaluation session
// @Tags reevaluation
// @Accept json
// @Produce json
// @Param id path string true "Re-evaluation ID"
// @Success 200 {array} ReevaluationAssessmentResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/assessments/reevaluation/{id}/comparison [get]
func (h *ReevaluationHandler) GetComparison(c echo.Context) error {
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
			Message: "Re-evaluation ID is required",
		})
	}

	assessments, err := h.svc.Reevaluation().GetComparison(c.Request().Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Re-evaluation not found",
			})
		}
		log.Error().Err(err).
			Str("id", id).
			Msg("failed to get reevaluation comparison")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve re-evaluation comparison",
		})
	}

	results := make([]ReevaluationAssessmentResponse, len(assessments))
	for i, a := range assessments {
		results[i] = toReevaluationAssessmentResponse(a)
	}

	return c.JSON(http.StatusOK, results)
}

// toReevaluationAssessmentResponse converts a ReevaluationAssessment model to response.
func toReevaluationAssessmentResponse(a *model.ReevaluationAssessment) ReevaluationAssessmentResponse {
	return ReevaluationAssessmentResponse{
		ID:                   a.ID,
		PatientID:            a.PatientID,
		VisitID:              a.VisitID,
		ClinicID:             a.ClinicID,
		BaselineAssessmentID: a.BaselineAssessmentID,
		AssessmentType:       string(a.AssessmentType),
		MeasureLabel:         a.MeasureLabel,
		CurrentValue:         a.CurrentValue,
		BaselineValue:        a.BaselineValue,
		Change:               a.Change,
		ChangePercentage:     a.ChangePercentage,
		HigherIsBetter:       a.HigherIsBetter,
		MCIDThreshold:        a.MCIDThreshold,
		MCIDAchieved:         a.MCIDAchieved,
		Interpretation:       string(a.Interpretation),
		TherapistID:          a.TherapistID,
		Notes:                a.Notes,
		AssessedAt:           a.AssessedAt.Format(time.RFC3339),
		CreatedAt:            a.CreatedAt.Format(time.RFC3339),
		UpdatedAt:            a.UpdatedAt.Format(time.RFC3339),
	}
}

// toReevaluationSummaryResponse converts a ReevaluationSummary model to response.
func toReevaluationSummaryResponse(s *model.ReevaluationSummary) ReevaluationSummaryResponse {
	comparisons := make([]ReevaluationAssessmentResponse, len(s.Comparisons))
	for i := range s.Comparisons {
		comparisons[i] = toReevaluationAssessmentResponse(&s.Comparisons[i])
	}

	return ReevaluationSummaryResponse{
		PatientID:    s.PatientID,
		VisitID:      s.VisitID,
		TherapistID:  s.TherapistID,
		AssessedAt:   s.AssessedAt.Format(time.RFC3339),
		Comparisons:  comparisons,
		TotalItems:   s.TotalItems,
		Improved:     s.Improved,
		Declined:     s.Declined,
		Stable:       s.Stable,
		MCIDAchieved: s.MCIDAchieved,
	}
}
