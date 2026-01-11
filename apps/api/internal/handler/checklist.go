package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	"github.com/tqvdang/physioflow/apps/api/internal/middleware"
	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/service"
	"github.com/tqvdang/physioflow/apps/api/pkg/validator"
)

// ChecklistHandler handles checklist-related HTTP requests.
type ChecklistHandler struct {
	svc *service.Service
}

// NewChecklistHandler creates a new ChecklistHandler.
func NewChecklistHandler(svc *service.Service) *ChecklistHandler {
	return &ChecklistHandler{svc: svc}
}

// =============================================================================
// REQUEST/RESPONSE TYPES
// =============================================================================

// TemplateListResponse represents a paginated list of templates.
type TemplateListResponse struct {
	Data       []TemplateResponse `json:"data"`
	Total      int64              `json:"total"`
	Page       int                `json:"page"`
	PerPage    int                `json:"per_page"`
	TotalPages int                `json:"total_pages"`
}

// TemplateResponse represents a template in API responses.
type TemplateResponse struct {
	ID           string                   `json:"id"`
	Name         string                   `json:"name"`
	NameVi       string                   `json:"name_vi,omitempty"`
	Description  string                   `json:"description,omitempty"`
	DescriptionVi string                  `json:"description_vi,omitempty"`
	Code         string                   `json:"code,omitempty"`
	TemplateType string                   `json:"template_type"`
	BodyRegion   *string                  `json:"body_region,omitempty"`
	Version      int                      `json:"version"`
	IsActive     bool                     `json:"is_active"`
	Settings     *model.TemplateSettings  `json:"settings,omitempty"`
	Sections     []SectionResponse        `json:"sections,omitempty"`
	CreatedAt    string                   `json:"created_at"`
	UpdatedAt    string                   `json:"updated_at"`
}

// SectionResponse represents a section in API responses.
type SectionResponse struct {
	ID               string                    `json:"id"`
	Title            string                    `json:"title"`
	TitleVi          string                    `json:"title_vi,omitempty"`
	Description      string                    `json:"description,omitempty"`
	SortOrder        int                       `json:"sort_order"`
	IsRequired       bool                      `json:"is_required"`
	IsCollapsible    bool                      `json:"is_collapsible"`
	DefaultCollapsed bool                      `json:"default_collapsed"`
	DisplayConditions *model.DisplayConditions `json:"display_conditions,omitempty"`
	Items            []ItemResponse            `json:"items,omitempty"`
}

// ItemResponse represents a checklist item in API responses.
type ItemResponse struct {
	ID                string                    `json:"id"`
	Label             string                    `json:"label"`
	LabelVi           string                    `json:"label_vi,omitempty"`
	HelpText          string                    `json:"help_text,omitempty"`
	ItemType          string                    `json:"item_type"`
	ItemConfig        json.RawMessage           `json:"item_config"`
	SortOrder         int                       `json:"sort_order"`
	IsRequired        bool                      `json:"is_required"`
	ValidationRules   *model.ValidationRules    `json:"validation_rules,omitempty"`
	DisplayConditions *model.DisplayConditions  `json:"display_conditions,omitempty"`
	QuickPhrases      []model.QuickPhrase       `json:"quick_phrases,omitempty"`
	DataMapping       *model.DataMapping        `json:"data_mapping,omitempty"`
	CDSRules          []model.CDSRule           `json:"cds_rules,omitempty"`
}

// StartChecklistRequest represents the request body for starting a checklist.
type StartChecklistRequest struct {
	TemplateID         string  `json:"template_id" validate:"required,uuid"`
	TreatmentSessionID *string `json:"treatment_session_id,omitempty" validate:"omitempty,uuid"`
	AssessmentID       *string `json:"assessment_id,omitempty" validate:"omitempty,uuid"`
	AutoPopulate       bool    `json:"auto_populate"`
}

// VisitChecklistResponse represents a visit checklist in API responses.
type VisitChecklistResponse struct {
	ID                   string                  `json:"id"`
	TemplateID           string                  `json:"template_id"`
	TemplateVersion      int                     `json:"template_version"`
	PatientID            string                  `json:"patient_id"`
	TherapistID          string                  `json:"therapist_id"`
	ClinicID             string                  `json:"clinic_id"`
	Status               string                  `json:"status"`
	ProgressPercentage   float64                 `json:"progress_percentage"`
	StartedAt            *string                 `json:"started_at,omitempty"`
	CompletedAt          *string                 `json:"completed_at,omitempty"`
	GeneratedNote        string                  `json:"generated_note,omitempty"`
	GeneratedNoteVi      string                  `json:"generated_note_vi,omitempty"`
	NoteGenerationStatus string                  `json:"note_generation_status,omitempty"`
	Template             *TemplateResponse       `json:"template,omitempty"`
	Responses            []ResponseItemResponse  `json:"responses,omitempty"`
	CreatedAt            string                  `json:"created_at"`
	UpdatedAt            string                  `json:"updated_at"`
}

// ResponseItemResponse represents a checklist response in API responses.
type ResponseItemResponse struct {
	ID              string          `json:"id"`
	ItemID          string          `json:"item_id"`
	ResponseValue   json.RawMessage `json:"response_value"`
	IsSkipped       bool            `json:"is_skipped"`
	SkipReason      string          `json:"skip_reason,omitempty"`
	TriggeredAlerts json.RawMessage `json:"triggered_alerts,omitempty"`
	UpdatedAt       string          `json:"updated_at"`
}

// UpdateResponseRequest represents the request body for updating a single response.
type UpdateResponseRequest struct {
	ResponseValue json.RawMessage `json:"response_value" validate:"required"`
	IsSkipped     bool            `json:"is_skipped"`
	SkipReason    string          `json:"skip_reason,omitempty"`
}

// BulkUpdateResponsesRequest represents the request body for bulk updating responses.
type BulkUpdateResponsesRequest struct {
	Responses []BulkResponseItem `json:"responses" validate:"required,dive"`
}

// BulkResponseItem represents a single item in a bulk update.
type BulkResponseItem struct {
	ItemID        string          `json:"item_id" validate:"required,uuid"`
	ResponseValue json.RawMessage `json:"response_value" validate:"required"`
	IsSkipped     bool            `json:"is_skipped"`
	SkipReason    string          `json:"skip_reason,omitempty"`
}

// GeneratedNoteResponse represents a generated note in API responses.
type GeneratedNoteResponse struct {
	Subjective   string `json:"subjective"`
	Objective    string `json:"objective"`
	Assessment   string `json:"assessment"`
	Plan         string `json:"plan"`
	SubjectiveVi string `json:"subjective_vi,omitempty"`
	ObjectiveVi  string `json:"objective_vi,omitempty"`
	AssessmentVi string `json:"assessment_vi,omitempty"`
	PlanVi       string `json:"plan_vi,omitempty"`
	FullNote     string `json:"full_note"`
	FullNoteVi   string `json:"full_note_vi,omitempty"`
	GeneratedAt  string `json:"generated_at"`
}

// VisitChecklistListResponse represents a paginated list of visit checklists.
type VisitChecklistListResponse struct {
	Data       []VisitChecklistResponse `json:"data"`
	Total      int64                    `json:"total"`
	Page       int                      `json:"page"`
	PerPage    int                      `json:"per_page"`
	TotalPages int                      `json:"total_pages"`
}

// =============================================================================
// TEMPLATE HANDLERS
// =============================================================================

// ListTemplates returns a paginated list of checklist templates.
// @Summary List checklist templates
// @Description Returns a paginated list of checklist templates
// @Tags checklists
// @Accept json
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param per_page query int false "Items per page" default(20)
// @Param template_type query string false "Filter by template type"
// @Param body_region query string false "Filter by body region"
// @Param search query string false "Search term"
// @Success 200 {object} TemplateListResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/checklist-templates [get]
func (h *ChecklistHandler) ListTemplates(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	filter := model.NewChecklistTemplateFilter()
	filter.ClinicID = user.ClinicID

	if page, err := strconv.Atoi(c.QueryParam("page")); err == nil && page > 0 {
		filter.Page = page
	}
	if perPage, err := strconv.Atoi(c.QueryParam("per_page")); err == nil && perPage > 0 {
		filter.PerPage = perPage
	}
	if t := c.QueryParam("template_type"); t != "" {
		filter.TemplateType = t
	}
	if br := c.QueryParam("body_region"); br != "" {
		filter.BodyRegion = br
	}
	if s := c.QueryParam("search"); s != "" {
		filter.Search = s
	}

	templates, total, err := h.svc.Checklist().ListTemplates(c.Request().Context(), filter)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to list templates",
		})
	}

	var responses []TemplateResponse
	for _, t := range templates {
		responses = append(responses, toTemplateResponse(t))
	}

	totalPages := int(total) / filter.Limit()
	if int(total)%filter.Limit() > 0 {
		totalPages++
	}

	return c.JSON(http.StatusOK, TemplateListResponse{
		Data:       responses,
		Total:      total,
		Page:       filter.Page,
		PerPage:    filter.Limit(),
		TotalPages: totalPages,
	})
}

// GetTemplate retrieves a template with all sections and items.
// @Summary Get checklist template
// @Description Retrieves a checklist template by ID with all sections and items
// @Tags checklists
// @Accept json
// @Produce json
// @Param id path string true "Template ID"
// @Success 200 {object} TemplateResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/checklist-templates/{id} [get]
func (h *ChecklistHandler) GetTemplate(c echo.Context) error {
	id := c.Param("id")
	if id == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Template ID is required",
		})
	}

	template, err := h.svc.Checklist().GetTemplateWithItems(c.Request().Context(), id)
	if err != nil {
		return c.JSON(http.StatusNotFound, ErrorResponse{
			Error:   "not_found",
			Message: "Template not found",
		})
	}

	return c.JSON(http.StatusOK, toTemplateResponseFull(template))
}

// =============================================================================
// VISIT CHECKLIST HANDLERS
// =============================================================================

// StartChecklist starts a new visit checklist from a template.
// @Summary Start new visit checklist
// @Description Creates a new visit checklist from a template for a patient
// @Tags checklists
// @Accept json
// @Produce json
// @Param pid path string true "Patient ID"
// @Param request body StartChecklistRequest true "Start checklist request"
// @Success 201 {object} VisitChecklistResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/patients/{pid}/visit-checklists [post]
func (h *ChecklistHandler) StartChecklist(c echo.Context) error {
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

	var req StartChecklistRequest
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

	input := service.StartChecklistInput{
		TemplateID:         req.TemplateID,
		PatientID:          patientID,
		ClinicID:           user.ClinicID,
		TherapistID:        user.UserID,
		TreatmentSessionID: req.TreatmentSessionID,
		AssessmentID:       req.AssessmentID,
		AutoPopulate:       req.AutoPopulate,
	}

	checklist, err := h.svc.Checklist().StartChecklist(c.Request().Context(), input)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to start checklist: " + err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, toVisitChecklistResponse(checklist))
}

// GetChecklist retrieves a visit checklist with all responses.
// @Summary Get visit checklist
// @Description Retrieves a visit checklist by ID with all responses
// @Tags checklists
// @Accept json
// @Produce json
// @Param id path string true "Checklist ID"
// @Success 200 {object} VisitChecklistResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/visit-checklists/{id} [get]
func (h *ChecklistHandler) GetChecklist(c echo.Context) error {
	id := c.Param("id")
	if id == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Checklist ID is required",
		})
	}

	checklist, err := h.svc.Checklist().GetChecklistWithResponses(c.Request().Context(), id)
	if err != nil {
		return c.JSON(http.StatusNotFound, ErrorResponse{
			Error:   "not_found",
			Message: "Checklist not found",
		})
	}

	return c.JSON(http.StatusOK, toVisitChecklistResponseFull(checklist))
}

// UpdateResponses updates multiple responses at once.
// @Summary Bulk update checklist responses
// @Description Updates multiple checklist responses at once
// @Tags checklists
// @Accept json
// @Produce json
// @Param id path string true "Checklist ID"
// @Param request body BulkUpdateResponsesRequest true "Responses to update"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/visit-checklists/{id}/responses [patch]
func (h *ChecklistHandler) UpdateResponses(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	checklistID := c.Param("id")
	if checklistID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Checklist ID is required",
		})
	}

	var req BulkUpdateResponsesRequest
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

	var inputs []service.UpdateResponseInput
	for _, r := range req.Responses {
		inputs = append(inputs, service.UpdateResponseInput{
			ItemID:        r.ItemID,
			ResponseValue: r.ResponseValue,
			IsSkipped:     r.IsSkipped,
			SkipReason:    r.SkipReason,
		})
	}

	if err := h.svc.Checklist().UpdateResponses(c.Request().Context(), checklistID, inputs); err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to update responses: " + err.Error(),
		})
	}

	// Get updated progress
	progress, _ := h.svc.Checklist().GetProgress(c.Request().Context(), checklistID)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success":             true,
		"responses_updated":   len(inputs),
		"progress_percentage": progress,
	})
}

// UpdateResponse updates a single response.
// @Summary Update single checklist response
// @Description Updates a single checklist response
// @Tags checklists
// @Accept json
// @Produce json
// @Param id path string true "Checklist ID"
// @Param itemId path string true "Item ID"
// @Param request body UpdateResponseRequest true "Response to update"
// @Success 200 {object} ResponseItemResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/visit-checklists/{id}/responses/{itemId} [patch]
func (h *ChecklistHandler) UpdateResponse(c echo.Context) error {
	user := middleware.GetUser(c)
	if user == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
	}

	checklistID := c.Param("id")
	itemID := c.Param("itemId")
	if checklistID == "" || itemID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Checklist ID and Item ID are required",
		})
	}

	var req UpdateResponseRequest
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

	input := service.UpdateResponseInput{
		ItemID:        itemID,
		ResponseValue: req.ResponseValue,
		IsSkipped:     req.IsSkipped,
		SkipReason:    req.SkipReason,
	}

	response, err := h.svc.Checklist().UpdateResponse(c.Request().Context(), checklistID, input)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to update response: " + err.Error(),
		})
	}

	return c.JSON(http.StatusOK, toResponseItemResponse(response))
}

// CompleteChecklist completes a checklist and generates the SOAP note.
// @Summary Complete checklist
// @Description Marks the checklist as complete and generates the SOAP note
// @Tags checklists
// @Accept json
// @Produce json
// @Param id path string true "Checklist ID"
// @Success 200 {object} VisitChecklistResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/visit-checklists/{id}/complete [post]
func (h *ChecklistHandler) CompleteChecklist(c echo.Context) error {
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
			Message: "Checklist ID is required",
		})
	}

	checklist, err := h.svc.Checklist().CompleteChecklist(c.Request().Context(), id, user.UserID)
	if err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "completion_failed",
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, toVisitChecklistResponse(checklist))
}

// PreviewNote generates a preview of the auto-generated note.
// @Summary Preview auto-generated note
// @Description Generates a preview of the SOAP note without saving
// @Tags checklists
// @Accept json
// @Produce json
// @Param id path string true "Checklist ID"
// @Success 200 {object} GeneratedNoteResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Security BearerAuth
// @Router /api/v1/visit-checklists/{id}/auto-note [get]
func (h *ChecklistHandler) PreviewNote(c echo.Context) error {
	id := c.Param("id")
	if id == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "Checklist ID is required",
		})
	}

	note, err := h.svc.Checklist().PreviewNote(c.Request().Context(), id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "generation_failed",
			Message: "Failed to generate note: " + err.Error(),
		})
	}

	return c.JSON(http.StatusOK, GeneratedNoteResponse{
		Subjective:   note.Subjective,
		Objective:    note.Objective,
		Assessment:   note.Assessment,
		Plan:         note.Plan,
		SubjectiveVi: note.SubjectiveVi,
		ObjectiveVi:  note.ObjectiveVi,
		AssessmentVi: note.AssessmentVi,
		PlanVi:       note.PlanVi,
		FullNote:     note.FullNote,
		FullNoteVi:   note.FullNoteVi,
		GeneratedAt:  note.GeneratedAt.Format("2006-01-02T15:04:05Z07:00"),
	})
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

func toTemplateResponse(t model.ChecklistTemplate) TemplateResponse {
	return TemplateResponse{
		ID:           t.ID,
		Name:         t.Name,
		NameVi:       t.NameVi,
		Description:  t.Description,
		DescriptionVi: t.DescriptionVi,
		Code:         t.Code,
		TemplateType: t.TemplateType,
		BodyRegion:   t.BodyRegion,
		Version:      t.Version,
		IsActive:     t.IsActive,
		Settings:     t.Settings,
		CreatedAt:    t.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:    t.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

func toTemplateResponseFull(t *model.ChecklistTemplate) TemplateResponse {
	resp := toTemplateResponse(*t)

	var sections []SectionResponse
	for _, s := range t.Sections {
		sections = append(sections, toSectionResponse(s))
	}
	resp.Sections = sections

	return resp
}

func toSectionResponse(s model.ChecklistSection) SectionResponse {
	resp := SectionResponse{
		ID:               s.ID,
		Title:            s.Title,
		TitleVi:          s.TitleVi,
		Description:      s.Description,
		SortOrder:        s.SortOrder,
		IsRequired:       s.IsRequired,
		IsCollapsible:    s.IsCollapsible,
		DefaultCollapsed: s.DefaultCollapsed,
		DisplayConditions: s.DisplayConditions,
	}

	var items []ItemResponse
	for _, i := range s.Items {
		items = append(items, toItemResponse(i))
	}
	resp.Items = items

	return resp
}

func toItemResponse(i model.ChecklistItem) ItemResponse {
	return ItemResponse{
		ID:                i.ID,
		Label:             i.Label,
		LabelVi:           i.LabelVi,
		HelpText:          i.HelpText,
		ItemType:          string(i.ItemType),
		ItemConfig:        i.ItemConfig,
		SortOrder:         i.SortOrder,
		IsRequired:        i.IsRequired,
		ValidationRules:   i.ValidationRules,
		DisplayConditions: i.DisplayConditions,
		QuickPhrases:      i.QuickPhrases,
		DataMapping:       i.DataMapping,
		CDSRules:          i.CDSRules,
	}
}

func toVisitChecklistResponse(vc *model.VisitChecklist) VisitChecklistResponse {
	resp := VisitChecklistResponse{
		ID:                   vc.ID,
		TemplateID:           vc.TemplateID,
		TemplateVersion:      vc.TemplateVersion,
		PatientID:            vc.PatientID,
		TherapistID:          vc.TherapistID,
		ClinicID:             vc.ClinicID,
		Status:               string(vc.Status),
		ProgressPercentage:   vc.ProgressPercentage,
		GeneratedNote:        vc.GeneratedNote,
		GeneratedNoteVi:      vc.GeneratedNoteVi,
		NoteGenerationStatus: vc.NoteGenerationStatus,
		CreatedAt:            vc.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:            vc.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if vc.StartedAt != nil {
		s := vc.StartedAt.Format("2006-01-02T15:04:05Z07:00")
		resp.StartedAt = &s
	}
	if vc.CompletedAt != nil {
		s := vc.CompletedAt.Format("2006-01-02T15:04:05Z07:00")
		resp.CompletedAt = &s
	}

	return resp
}

func toVisitChecklistResponseFull(vc *model.VisitChecklist) VisitChecklistResponse {
	resp := toVisitChecklistResponse(vc)

	if vc.Template != nil {
		t := toTemplateResponseFull(vc.Template)
		resp.Template = &t
	}

	var responses []ResponseItemResponse
	for _, r := range vc.Responses {
		responses = append(responses, toResponseItemResponse(&r))
	}
	resp.Responses = responses

	return resp
}

func toResponseItemResponse(r *model.ChecklistResponse) ResponseItemResponse {
	return ResponseItemResponse{
		ID:              r.ID,
		ItemID:          r.ChecklistItemID,
		ResponseValue:   r.ResponseValue,
		IsSkipped:       r.IsSkipped,
		SkipReason:      r.SkipReason,
		TriggeredAlerts: r.TriggeredAlerts,
		UpdatedAt:       r.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}
