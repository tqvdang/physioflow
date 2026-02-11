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

// DischargeHandler handles discharge planning HTTP requests.
type DischargeHandler struct {
	svc *service.Service
}

// NewDischargeHandler creates a new DischargeHandler.
func NewDischargeHandler(svc *service.Service) *DischargeHandler {
	return &DischargeHandler{svc: svc}
}

// --- Response types ---

// DischargePlanResponse represents a discharge plan in API responses.
type DischargePlanResponse struct {
	ID              string                           `json:"id"`
	PatientID       string                           `json:"patient_id"`
	ClinicID        string                           `json:"clinic_id"`
	TherapistID     string                           `json:"therapist_id"`
	ProtocolID      *string                          `json:"protocol_id,omitempty"`
	Status          string                           `json:"status"`
	Reason          string                           `json:"reason"`
	ReasonDetails   string                           `json:"reason_details,omitempty"`
	ReasonDetailsVi string                           `json:"reason_details_vi,omitempty"`
	PlannedDate     *string                          `json:"planned_date,omitempty"`
	ActualDate      *string                          `json:"actual_date,omitempty"`
	GoalOutcomes    []model.GoalOutcome              `json:"goal_outcomes"`
	HomeProgram     *model.DischargeHomeProgram       `json:"home_program,omitempty"`
	Recommendations []model.DischargeRecommendation  `json:"recommendations"`
	FollowUp        *model.FollowUpPlan              `json:"follow_up,omitempty"`
	PatientEducation []model.EducationItem           `json:"patient_education,omitempty"`
	Notes           string                           `json:"notes,omitempty"`
	NotesVi         string                           `json:"notes_vi,omitempty"`
	CreatedAt       string                           `json:"created_at"`
	UpdatedAt       string                           `json:"updated_at"`
}

// DischargeSummaryResponse represents a discharge summary in API responses.
type DischargeSummaryResponse struct {
	ID                 string                          `json:"id"`
	DischargePlanID    string                          `json:"discharge_plan_id"`
	PatientID          string                          `json:"patient_id"`
	ClinicID           string                          `json:"clinic_id"`
	TherapistID        string                          `json:"therapist_id"`
	Diagnosis          string                          `json:"diagnosis,omitempty"`
	DiagnosisVi        string                          `json:"diagnosis_vi,omitempty"`
	TreatmentSummary   string                          `json:"treatment_summary,omitempty"`
	TreatmentSummaryVi string                          `json:"treatment_summary_vi,omitempty"`
	TotalSessions      int                             `json:"total_sessions"`
	TreatmentDuration  int                             `json:"treatment_duration_days"`
	FirstVisitDate     string                          `json:"first_visit_date"`
	LastVisitDate      string                          `json:"last_visit_date"`
	BaselineComparison []BaselineComparisonResponse    `json:"baseline_comparison"`
	FunctionalStatus   string                          `json:"functional_status,omitempty"`
	FunctionalStatusVi string                          `json:"functional_status_vi,omitempty"`
	DischargeReason    string                          `json:"discharge_reason"`
	Prognosis          string                          `json:"prognosis,omitempty"`
	PrognosisVi        string                          `json:"prognosis_vi,omitempty"`
	SignedBy           *string                         `json:"signed_by,omitempty"`
	SignedAt           *string                         `json:"signed_at,omitempty"`
	CreatedAt          string                          `json:"created_at"`
	UpdatedAt          string                          `json:"updated_at"`
	Plan               *DischargePlanResponse          `json:"plan,omitempty"`
}

// BaselineComparisonResponse represents a baseline comparison in API responses.
type BaselineComparisonResponse struct {
	MeasureName      string  `json:"measure_name"`
	MeasureNameVi    string  `json:"measure_name_vi,omitempty"`
	MeasureType      string  `json:"measure_type"`
	BaselineValue    float64 `json:"baseline_value"`
	FinalValue       float64 `json:"final_value"`
	Change           float64 `json:"change"`
	ChangePercent    float64 `json:"change_percent"`
	MeetsMCID        bool    `json:"meets_mcid"`
	Interpretation   string  `json:"interpretation,omitempty"`
	InterpretationVi string  `json:"interpretation_vi,omitempty"`
}

// CompleteDischargeRequest represents the request body for completing a discharge.
type CompleteDischargeRequest struct {
	DischargeDate string `json:"discharge_date" validate:"omitempty,datetime=2006-01-02"`
}

// --- Handlers ---

// CreateDischargePlan creates a new discharge plan for a patient.
// @Summary Create discharge plan
// @Description Creates a new discharge plan for a patient with goals, recommendations, and HEP
// @Tags discharge
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID"
// @Param plan body model.CreateDischargePlanRequest true "Discharge plan data"
// @Success 201 {object} DischargePlanResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/discharge/plan [post]
func (h *DischargeHandler) CreateDischargePlan(c echo.Context) error {
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

	var req model.CreateDischargePlanRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Failed to parse request body",
		})
	}

	// Override patient_id from path param
	req.PatientID = patientID

	if err := validator.Validate(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, ErrorResponse{
			Error:   "validation_failed",
			Message: "Request validation failed",
			Details: validator.FormatErrors(err),
		})
	}

	plan, err := h.svc.Discharge().CreateDischargePlan(c.Request().Context(), user.ClinicID, user.UserID, &req)
	if err != nil {
		log.Error().Err(err).Str("patient_id", patientID).Msg("failed to create discharge plan")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to create discharge plan",
		})
	}

	return c.JSON(http.StatusCreated, toDischargePlanResponse(plan))
}

// GetDischargePlan retrieves the discharge plan for a patient.
// @Summary Get discharge plan
// @Description Retrieves the most recent discharge plan for a patient
// @Tags discharge
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID"
// @Success 200 {object} DischargePlanResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/discharge/plan [get]
func (h *DischargeHandler) GetDischargePlan(c echo.Context) error {
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

	plan, err := h.svc.Discharge().GetDischargePlan(c.Request().Context(), patientID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "No discharge plan found for this patient",
			})
		}
		log.Error().Err(err).Str("patient_id", patientID).Msg("failed to get discharge plan")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve discharge plan",
		})
	}

	return c.JSON(http.StatusOK, toDischargePlanResponse(plan))
}

// GenerateDischargeSummary generates a discharge summary with baseline comparisons.
// @Summary Generate discharge summary
// @Description Generates a discharge summary with baseline vs discharge comparisons and bilingual content
// @Tags discharge
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID"
// @Success 201 {object} DischargeSummaryResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/discharge/summary [post]
func (h *DischargeHandler) GenerateDischargeSummary(c echo.Context) error {
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

	summary, err := h.svc.Discharge().GenerateDischargeSummary(c.Request().Context(), user.ClinicID, user.UserID, patientID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Discharge plan not found. Create a discharge plan first.",
			})
		}
		log.Error().Err(err).Str("patient_id", patientID).Msg("failed to generate discharge summary")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to generate discharge summary",
		})
	}

	return c.JSON(http.StatusCreated, toDischargeSummaryResponse(summary))
}

// GetDischargeSummary retrieves a discharge summary by ID.
// @Summary Get discharge summary
// @Description Retrieves a discharge summary by ID
// @Tags discharge
// @Accept json
// @Produce json
// @Param id path string true "Summary ID"
// @Success 200 {object} DischargeSummaryResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/discharge/summary/{id} [get]
func (h *DischargeHandler) GetDischargeSummary(c echo.Context) error {
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
			Message: "Summary ID is required",
		})
	}

	summary, err := h.svc.Discharge().GetDischargeSummary(c.Request().Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "Discharge summary not found",
			})
		}
		log.Error().Err(err).Str("summary_id", id).Msg("failed to get discharge summary")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve discharge summary",
		})
	}

	return c.JSON(http.StatusOK, toDischargeSummaryResponse(summary))
}

// CompleteDischarge marks a patient's discharge as complete.
// @Summary Complete discharge
// @Description Marks the patient's discharge plan as completed with the actual discharge date
// @Tags discharge
// @Accept json
// @Produce json
// @Param patientId path string true "Patient ID"
// @Param body body CompleteDischargeRequest false "Discharge completion data"
// @Success 200 {object} map[string]string
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{patientId}/discharge/complete [post]
func (h *DischargeHandler) CompleteDischarge(c echo.Context) error {
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

	var req CompleteDischargeRequest
	if err := c.Bind(&req); err != nil {
		// Bind failure is non-fatal here; use default date
		req = CompleteDischargeRequest{}
	}

	dischargeDate := time.Now()
	if req.DischargeDate != "" {
		parsed, err := time.Parse("2006-01-02", req.DischargeDate)
		if err != nil {
			return c.JSON(http.StatusBadRequest, ErrorResponse{
				Error:   "invalid_request",
				Message: "Invalid discharge_date format. Use YYYY-MM-DD.",
			})
		}
		dischargeDate = parsed
	}

	if err := h.svc.Discharge().CompleteDischarge(c.Request().Context(), patientID, dischargeDate); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "No active discharge plan found for this patient",
			})
		}
		log.Error().Err(err).Str("patient_id", patientID).Msg("failed to complete discharge")
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to complete discharge",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"status":  "completed",
		"message": "Patient discharge completed successfully",
	})
}

// --- Response converters ---

func toDischargePlanResponse(plan *model.DischargePlan) DischargePlanResponse {
	resp := DischargePlanResponse{
		ID:              plan.ID,
		PatientID:       plan.PatientID,
		ClinicID:        plan.ClinicID,
		TherapistID:     plan.TherapistID,
		ProtocolID:      plan.ProtocolID,
		Status:          string(plan.Status),
		Reason:          string(plan.Reason),
		ReasonDetails:   plan.ReasonDetails,
		ReasonDetailsVi: plan.ReasonDetailsVi,
		GoalOutcomes:    plan.GoalOutcomes,
		HomeProgram:     plan.HomeProgram,
		Recommendations: plan.Recommendations,
		FollowUp:        plan.FollowUp,
		PatientEducation: plan.PatientEducation,
		Notes:           plan.Notes,
		NotesVi:         plan.NotesVi,
		CreatedAt:       plan.CreatedAt.Format(time.RFC3339),
		UpdatedAt:       plan.UpdatedAt.Format(time.RFC3339),
	}

	if plan.PlannedDate != nil {
		formatted := plan.PlannedDate.Format("2006-01-02")
		resp.PlannedDate = &formatted
	}
	if plan.ActualDate != nil {
		formatted := plan.ActualDate.Format("2006-01-02")
		resp.ActualDate = &formatted
	}

	if resp.GoalOutcomes == nil {
		resp.GoalOutcomes = []model.GoalOutcome{}
	}
	if resp.Recommendations == nil {
		resp.Recommendations = []model.DischargeRecommendation{}
	}

	return resp
}

func toDischargeSummaryResponse(summary *model.DischargeSummary) DischargeSummaryResponse {
	resp := DischargeSummaryResponse{
		ID:                 summary.ID,
		DischargePlanID:    summary.DischargePlanID,
		PatientID:          summary.PatientID,
		ClinicID:           summary.ClinicID,
		TherapistID:        summary.TherapistID,
		Diagnosis:          summary.Diagnosis,
		DiagnosisVi:        summary.DiagnosisVi,
		TreatmentSummary:   summary.TreatmentSummary,
		TreatmentSummaryVi: summary.TreatmentSummaryVi,
		TotalSessions:      summary.TotalSessions,
		TreatmentDuration:  summary.TreatmentDuration,
		FirstVisitDate:     summary.FirstVisitDate.Format("2006-01-02"),
		LastVisitDate:      summary.LastVisitDate.Format("2006-01-02"),
		FunctionalStatus:   summary.FunctionalStatus,
		FunctionalStatusVi: summary.FunctionalStatusVi,
		DischargeReason:    string(summary.DischargeReason),
		Prognosis:          summary.Prognosis,
		PrognosisVi:        summary.PrognosisVi,
		SignedBy:           summary.SignedBy,
		CreatedAt:          summary.CreatedAt.Format(time.RFC3339),
		UpdatedAt:          summary.UpdatedAt.Format(time.RFC3339),
	}

	if summary.SignedAt != nil {
		formatted := summary.SignedAt.Format(time.RFC3339)
		resp.SignedAt = &formatted
	}

	// Convert baseline comparisons
	resp.BaselineComparison = make([]BaselineComparisonResponse, len(summary.BaselineComparison))
	for i, bc := range summary.BaselineComparison {
		resp.BaselineComparison[i] = BaselineComparisonResponse{
			MeasureName:      bc.MeasureName,
			MeasureNameVi:    bc.MeasureNameVi,
			MeasureType:      bc.MeasureType,
			BaselineValue:    bc.BaselineValue,
			FinalValue:       bc.FinalValue,
			Change:           bc.Change,
			ChangePercent:    bc.ChangePercent,
			MeetsMCID:        bc.MeetsMCID,
			Interpretation:   bc.Interpretation,
			InterpretationVi: bc.InterpretationVi,
		}
	}

	// Include plan if joined
	if summary.Plan != nil {
		planResp := toDischargePlanResponse(summary.Plan)
		resp.Plan = &planResp
	}

	return resp
}
