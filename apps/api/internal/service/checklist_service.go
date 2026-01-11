package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
)

// ChecklistService defines the interface for checklist business logic.
type ChecklistService interface {
	// Template operations
	GetTemplate(ctx context.Context, id string) (*model.ChecklistTemplate, error)
	GetTemplateWithItems(ctx context.Context, id string) (*model.ChecklistTemplate, error)
	ListTemplates(ctx context.Context, filter model.ChecklistTemplateFilter) ([]model.ChecklistTemplate, int64, error)

	// Visit checklist operations
	StartChecklist(ctx context.Context, input StartChecklistInput) (*model.VisitChecklist, error)
	GetChecklist(ctx context.Context, id string) (*model.VisitChecklist, error)
	GetChecklistWithResponses(ctx context.Context, id string) (*model.VisitChecklist, error)
	ListChecklists(ctx context.Context, filter model.VisitChecklistFilter) ([]model.VisitChecklist, int64, error)

	// Response operations
	UpdateResponse(ctx context.Context, checklistID string, input UpdateResponseInput) (*model.ChecklistResponse, error)
	UpdateResponses(ctx context.Context, checklistID string, inputs []UpdateResponseInput) error
	GetProgress(ctx context.Context, checklistID string) (float64, error)

	// Completion operations
	CompleteChecklist(ctx context.Context, id, userID string) (*model.VisitChecklist, error)
	GenerateNote(ctx context.Context, checklistID string) (*GeneratedNote, error)
	PreviewNote(ctx context.Context, checklistID string) (*GeneratedNote, error)

	// Auto-save operations
	AutoSave(ctx context.Context, checklistID string, data json.RawMessage) error
	GetAutoSaveData(ctx context.Context, checklistID string) (json.RawMessage, error)

	// Auto-populate from previous visit
	GetAutoPopulatedResponses(ctx context.Context, patientID, templateID string) ([]model.ChecklistResponse, error)
}

// StartChecklistInput holds input for starting a new checklist.
type StartChecklistInput struct {
	TemplateID         string  `json:"template_id" validate:"required,uuid"`
	PatientID          string  `json:"patient_id" validate:"required,uuid"`
	ClinicID           string  `json:"clinic_id" validate:"required,uuid"`
	TherapistID        string  `json:"therapist_id" validate:"required,uuid"`
	TreatmentSessionID *string `json:"treatment_session_id,omitempty" validate:"omitempty,uuid"`
	AssessmentID       *string `json:"assessment_id,omitempty" validate:"omitempty,uuid"`
	AutoPopulate       bool    `json:"auto_populate"`
}

// UpdateResponseInput holds input for updating a response.
type UpdateResponseInput struct {
	ItemID        string          `json:"item_id" validate:"required,uuid"`
	ResponseValue json.RawMessage `json:"response_value" validate:"required"`
	IsSkipped     bool            `json:"is_skipped"`
	SkipReason    string          `json:"skip_reason,omitempty"`
}

// GeneratedNote holds the generated SOAP note.
type GeneratedNote struct {
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
	GeneratedAt  time.Time `json:"generated_at"`
}

// checklistService implements ChecklistService.
type checklistService struct {
	repo          *repository.Repository
	soapGenerator *SOAPGenerator
}

// newChecklistService creates a new ChecklistService.
func newChecklistService(repo *repository.Repository) *checklistService {
	return &checklistService{
		repo:          repo,
		soapGenerator: NewSOAPGenerator(),
	}
}

// GetTemplate retrieves a template by ID.
func (s *checklistService) GetTemplate(ctx context.Context, id string) (*model.ChecklistTemplate, error) {
	return s.repo.ChecklistTemplate().GetByID(ctx, id)
}

// GetTemplateWithItems retrieves a template with all sections and items.
func (s *checklistService) GetTemplateWithItems(ctx context.Context, id string) (*model.ChecklistTemplate, error) {
	return s.repo.ChecklistTemplate().GetTemplateWithSectionsAndItems(ctx, id)
}

// ListTemplates retrieves templates with filtering.
func (s *checklistService) ListTemplates(ctx context.Context, filter model.ChecklistTemplateFilter) ([]model.ChecklistTemplate, int64, error) {
	return s.repo.ChecklistTemplate().List(ctx, filter)
}

// StartChecklist creates a new visit checklist from a template.
func (s *checklistService) StartChecklist(ctx context.Context, input StartChecklistInput) (*model.VisitChecklist, error) {
	// Get the template
	template, err := s.repo.ChecklistTemplate().GetByID(ctx, input.TemplateID)
	if err != nil {
		return nil, fmt.Errorf("template not found: %w", err)
	}

	now := time.Now()
	checklist := &model.VisitChecklist{
		TemplateID:         input.TemplateID,
		TemplateVersion:    template.Version,
		PatientID:          input.PatientID,
		ClinicID:           input.ClinicID,
		TherapistID:        input.TherapistID,
		TreatmentSessionID: input.TreatmentSessionID,
		AssessmentID:       input.AssessmentID,
		Status:             model.ChecklistStatusInProgress,
		ProgressPercentage: 0,
		StartedAt:          &now,
		CreatedBy:          &input.TherapistID,
		UpdatedBy:          &input.TherapistID,
	}

	if err := s.repo.VisitChecklist().Create(ctx, checklist); err != nil {
		return nil, fmt.Errorf("failed to create checklist: %w", err)
	}

	// Auto-populate from previous visit if requested
	if input.AutoPopulate {
		if err := s.autoPopulateFromLastVisit(ctx, checklist, template.TemplateType); err != nil {
			// Log but don't fail
			fmt.Printf("Warning: auto-populate failed: %v\n", err)
		}
	}

	return checklist, nil
}

// autoPopulateFromLastVisit copies responses from the last completed checklist.
func (s *checklistService) autoPopulateFromLastVisit(ctx context.Context, checklist *model.VisitChecklist, templateType string) error {
	lastChecklist, err := s.repo.VisitChecklist().GetLastCompletedChecklist(ctx, checklist.PatientID, templateType)
	if err != nil {
		if err == repository.ErrNotFound {
			return nil // No previous checklist, nothing to populate
		}
		return err
	}

	// Get all items for the current template to filter by data mapping
	items, err := s.repo.ChecklistTemplate().GetItemsByTemplateID(ctx, checklist.TemplateID)
	if err != nil {
		return err
	}

	// Create a map of item IDs that support auto-populate
	autoPopulateItems := make(map[string]bool)
	for _, item := range items {
		if item.DataMapping != nil && item.DataMapping.SourceField != "" {
			autoPopulateItems[item.ID] = true
		}
	}

	// Copy responses from last checklist
	var newResponses []model.ChecklistResponse
	for _, resp := range lastChecklist.Responses {
		// Only copy if item supports auto-populate
		if autoPopulateItems[resp.ChecklistItemID] {
			newResponses = append(newResponses, model.ChecklistResponse{
				VisitChecklistID: checklist.ID,
				ChecklistItemID:  resp.ChecklistItemID,
				ResponseValue:    resp.ResponseValue,
				IsSkipped:        false,
				CreatedBy:        checklist.CreatedBy,
				UpdatedBy:        checklist.UpdatedBy,
			})
		}
	}

	if len(newResponses) > 0 {
		if err := s.repo.VisitChecklist().UpsertResponses(ctx, newResponses); err != nil {
			return err
		}
	}

	return nil
}

// GetChecklist retrieves a checklist by ID.
func (s *checklistService) GetChecklist(ctx context.Context, id string) (*model.VisitChecklist, error) {
	return s.repo.VisitChecklist().GetByID(ctx, id)
}

// GetChecklistWithResponses retrieves a checklist with all responses.
func (s *checklistService) GetChecklistWithResponses(ctx context.Context, id string) (*model.VisitChecklist, error) {
	checklist, err := s.repo.VisitChecklist().GetByIDWithResponses(ctx, id)
	if err != nil {
		return nil, err
	}

	// Also fetch the template with items for context
	template, err := s.repo.ChecklistTemplate().GetTemplateWithSectionsAndItems(ctx, checklist.TemplateID)
	if err != nil {
		return nil, err
	}
	checklist.Template = template

	return checklist, nil
}

// ListChecklists retrieves checklists with filtering.
func (s *checklistService) ListChecklists(ctx context.Context, filter model.VisitChecklistFilter) ([]model.VisitChecklist, int64, error) {
	return s.repo.VisitChecklist().List(ctx, filter)
}

// UpdateResponse updates a single response.
func (s *checklistService) UpdateResponse(ctx context.Context, checklistID string, input UpdateResponseInput) (*model.ChecklistResponse, error) {
	// Verify checklist exists and is editable
	checklist, err := s.repo.VisitChecklist().GetByID(ctx, checklistID)
	if err != nil {
		return nil, err
	}

	if checklist.Status == model.ChecklistStatusLocked {
		return nil, fmt.Errorf("checklist is locked and cannot be modified")
	}

	// Get existing response to build history
	existingResp, _ := s.repo.VisitChecklist().GetResponseByItemID(ctx, checklistID, input.ItemID)

	var history []model.ResponseHistoryEntry
	if existingResp != nil && len(existingResp.ResponseHistory) > 0 {
		json.Unmarshal(existingResp.ResponseHistory, &history)
	}

	// Add current value to history if it exists
	if existingResp != nil && len(existingResp.ResponseValue) > 0 {
		history = append(history, model.ResponseHistoryEntry{
			Value:     existingResp.ResponseValue,
			ChangedAt: existingResp.UpdatedAt,
			ChangedBy: *existingResp.UpdatedBy,
		})
	}

	historyJSON, _ := json.Marshal(history)

	// Evaluate CDS rules
	triggeredAlerts, err := s.evaluateCDSRules(ctx, checklistID, input.ItemID, input.ResponseValue)
	if err != nil {
		// Log but don't fail
		fmt.Printf("Warning: CDS evaluation failed: %v\n", err)
	}
	alertsJSON, _ := json.Marshal(triggeredAlerts)

	response := &model.ChecklistResponse{
		VisitChecklistID: checklistID,
		ChecklistItemID:  input.ItemID,
		ResponseValue:    input.ResponseValue,
		IsSkipped:        input.IsSkipped,
		SkipReason:       input.SkipReason,
		TriggeredAlerts:  alertsJSON,
		ResponseHistory:  historyJSON,
		CreatedBy:        checklist.UpdatedBy,
		UpdatedBy:        checklist.UpdatedBy,
	}

	if err := s.repo.VisitChecklist().UpsertResponse(ctx, response); err != nil {
		return nil, err
	}

	// Update progress
	if err := s.updateProgress(ctx, checklistID); err != nil {
		fmt.Printf("Warning: failed to update progress: %v\n", err)
	}

	return response, nil
}

// UpdateResponses updates multiple responses at once.
func (s *checklistService) UpdateResponses(ctx context.Context, checklistID string, inputs []UpdateResponseInput) error {
	// Verify checklist exists and is editable
	checklist, err := s.repo.VisitChecklist().GetByID(ctx, checklistID)
	if err != nil {
		return err
	}

	if checklist.Status == model.ChecklistStatusLocked {
		return fmt.Errorf("checklist is locked and cannot be modified")
	}

	var responses []model.ChecklistResponse
	for _, input := range inputs {
		responses = append(responses, model.ChecklistResponse{
			VisitChecklistID: checklistID,
			ChecklistItemID:  input.ItemID,
			ResponseValue:    input.ResponseValue,
			IsSkipped:        input.IsSkipped,
			SkipReason:       input.SkipReason,
			CreatedBy:        checklist.UpdatedBy,
			UpdatedBy:        checklist.UpdatedBy,
		})
	}

	if err := s.repo.VisitChecklist().UpsertResponses(ctx, responses); err != nil {
		return err
	}

	// Update checklist status to in_progress if not started
	if checklist.Status == model.ChecklistStatusNotStarted {
		s.repo.VisitChecklist().UpdateStatus(ctx, checklistID, model.ChecklistStatusInProgress, *checklist.UpdatedBy)
	}

	// Update progress
	return s.updateProgress(ctx, checklistID)
}

// GetProgress retrieves the current progress percentage.
func (s *checklistService) GetProgress(ctx context.Context, checklistID string) (float64, error) {
	return s.repo.VisitChecklist().CalculateProgress(ctx, checklistID)
}

// updateProgress updates the progress in the database.
func (s *checklistService) updateProgress(ctx context.Context, checklistID string) error {
	progress, err := s.repo.VisitChecklist().CalculateProgress(ctx, checklistID)
	if err != nil {
		return err
	}
	return s.repo.VisitChecklist().UpdateProgress(ctx, checklistID, progress)
}

// CompleteChecklist marks a checklist as complete and generates the note.
func (s *checklistService) CompleteChecklist(ctx context.Context, id, userID string) (*model.VisitChecklist, error) {
	checklist, err := s.repo.VisitChecklist().GetByIDWithResponses(ctx, id)
	if err != nil {
		return nil, err
	}

	if checklist.Status == model.ChecklistStatusLocked {
		return nil, fmt.Errorf("checklist is already locked")
	}

	// Validate all required items are completed
	template, err := s.repo.ChecklistTemplate().GetTemplateWithSectionsAndItems(ctx, checklist.TemplateID)
	if err != nil {
		return nil, err
	}

	responseMap := make(map[string]model.ChecklistResponse)
	for _, resp := range checklist.Responses {
		responseMap[resp.ChecklistItemID] = resp
	}

	var missingItems []string
	for _, section := range template.Sections {
		for _, item := range section.Items {
			if item.IsRequired {
				resp, exists := responseMap[item.ID]
				if !exists || (len(resp.ResponseValue) == 0 && !resp.IsSkipped) {
					missingItems = append(missingItems, item.Label)
				}
			}
		}
	}

	if len(missingItems) > 0 {
		return nil, fmt.Errorf("missing required items: %v", missingItems)
	}

	// Generate SOAP note
	note, err := s.GenerateNote(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to generate note: %w", err)
	}

	now := time.Now()
	checklist.Status = model.ChecklistStatusCompleted
	checklist.CompletedAt = &now
	checklist.ProgressPercentage = 100
	checklist.GeneratedNote = note.FullNote
	checklist.GeneratedNoteVi = note.FullNoteVi
	checklist.NoteGenerationStatus = "completed"
	checklist.UpdatedBy = &userID

	if err := s.repo.VisitChecklist().Update(ctx, checklist); err != nil {
		return nil, err
	}

	return checklist, nil
}

// GenerateNote generates a SOAP note from checklist responses.
func (s *checklistService) GenerateNote(ctx context.Context, checklistID string) (*GeneratedNote, error) {
	checklist, err := s.repo.VisitChecklist().GetByIDWithResponses(ctx, checklistID)
	if err != nil {
		return nil, err
	}

	template, err := s.repo.ChecklistTemplate().GetTemplateWithSectionsAndItems(ctx, checklist.TemplateID)
	if err != nil {
		return nil, err
	}

	return s.soapGenerator.Generate(template, checklist.Responses)
}

// PreviewNote generates a preview of the SOAP note without saving.
func (s *checklistService) PreviewNote(ctx context.Context, checklistID string) (*GeneratedNote, error) {
	return s.GenerateNote(ctx, checklistID)
}

// AutoSave saves auto-save data.
func (s *checklistService) AutoSave(ctx context.Context, checklistID string, data json.RawMessage) error {
	return s.repo.VisitChecklist().SaveAutoSaveData(ctx, checklistID, data)
}

// GetAutoSaveData retrieves auto-save data.
func (s *checklistService) GetAutoSaveData(ctx context.Context, checklistID string) (json.RawMessage, error) {
	return s.repo.VisitChecklist().GetAutoSaveData(ctx, checklistID)
}

// GetAutoPopulatedResponses returns responses pre-filled from the last visit.
func (s *checklistService) GetAutoPopulatedResponses(ctx context.Context, patientID, templateID string) ([]model.ChecklistResponse, error) {
	template, err := s.repo.ChecklistTemplate().GetByID(ctx, templateID)
	if err != nil {
		return nil, err
	}

	lastChecklist, err := s.repo.VisitChecklist().GetLastCompletedChecklist(ctx, patientID, template.TemplateType)
	if err != nil {
		if err == repository.ErrNotFound {
			return nil, nil
		}
		return nil, err
	}

	return lastChecklist.Responses, nil
}

// evaluateCDSRules evaluates clinical decision support rules for an item.
func (s *checklistService) evaluateCDSRules(ctx context.Context, checklistID, itemID string, value json.RawMessage) ([]map[string]interface{}, error) {
	// Get the template and find the item
	checklist, err := s.repo.VisitChecklist().GetByID(ctx, checklistID)
	if err != nil {
		return nil, err
	}

	items, err := s.repo.ChecklistTemplate().GetItemsByTemplateID(ctx, checklist.TemplateID)
	if err != nil {
		return nil, err
	}

	var item *model.ChecklistItem
	for i := range items {
		if items[i].ID == itemID {
			item = &items[i]
			break
		}
	}

	if item == nil || len(item.CDSRules) == 0 {
		return nil, nil
	}

	var alerts []map[string]interface{}
	for _, rule := range item.CDSRules {
		triggered := s.evaluateCDSCondition(rule.Condition, value)
		if triggered {
			alerts = append(alerts, map[string]interface{}{
				"alert_type": rule.AlertType,
				"message":    rule.Message,
				"message_vi": rule.MessageVi,
			})
		}
	}

	return alerts, nil
}

// evaluateCDSCondition evaluates a single CDS condition.
func (s *checklistService) evaluateCDSCondition(condition model.CDSCondition, value json.RawMessage) bool {
	// Parse the value based on type
	var numValue float64
	if err := json.Unmarshal(value, &map[string]float64{"value": numValue}); err == nil {
		// Numeric comparison
		switch condition.Operator {
		case "greater_than":
			if v, ok := condition.Value.(float64); ok {
				return numValue > v
			}
		case "less_than":
			if v, ok := condition.Value.(float64); ok {
				return numValue < v
			}
		case "equals":
			if v, ok := condition.Value.(float64); ok {
				return numValue == v
			}
		}
	}

	return false
}
