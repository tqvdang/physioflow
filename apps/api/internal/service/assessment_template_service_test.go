package service

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
)

// MockAssessmentTemplateRepository is a mock implementation of repository.AssessmentTemplateRepository.
type MockAssessmentTemplateRepository struct {
	mock.Mock
}

func (m *MockAssessmentTemplateRepository) GetAll(ctx context.Context) ([]*model.AssessmentTemplate, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.AssessmentTemplate), args.Error(1)
}

func (m *MockAssessmentTemplateRepository) GetByID(ctx context.Context, id string) (*model.AssessmentTemplate, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.AssessmentTemplate), args.Error(1)
}

func (m *MockAssessmentTemplateRepository) GetByCondition(ctx context.Context, condition string) (*model.AssessmentTemplate, error) {
	args := m.Called(ctx, condition)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.AssessmentTemplate), args.Error(1)
}

func (m *MockAssessmentTemplateRepository) GetByCategory(ctx context.Context, category string) ([]*model.AssessmentTemplate, error) {
	args := m.Called(ctx, category)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.AssessmentTemplate), args.Error(1)
}

func (m *MockAssessmentTemplateRepository) CreateResult(ctx context.Context, result *model.PatientAssessmentResult) error {
	args := m.Called(ctx, result)
	return args.Error(0)
}

func (m *MockAssessmentTemplateRepository) GetPatientResults(ctx context.Context, patientID string) ([]*model.PatientAssessmentResult, error) {
	args := m.Called(ctx, patientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.PatientAssessmentResult), args.Error(1)
}

func (m *MockAssessmentTemplateRepository) GetResultByID(ctx context.Context, id string) (*model.PatientAssessmentResult, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.PatientAssessmentResult), args.Error(1)
}

// sampleTemplate returns a test assessment template.
func sampleTemplate() *model.AssessmentTemplate {
	return &model.AssessmentTemplate{
		ID:        "template-001",
		Name:      "Lower Back Pain Assessment",
		NameVi:    "Danh gia Dau lung duoi",
		Condition: "lower_back_pain",
		Category:  model.TemplateCategoryMusculoskeletal,
		ChecklistItems: []model.AssessmentChecklistItem{
			{
				Item:     "Posture Assessment",
				ItemVi:   "Danh gia tu the",
				Type:     "select",
				Options:  []string{"Normal", "Kyphotic", "Lordotic", "Scoliotic"},
				Required: true,
				Order:    1,
			},
			{
				Item:     "Pain Severity (VAS)",
				ItemVi:   "Muc do dau (VAS)",
				Type:     "number",
				Unit:     "score",
				Range:    []int{0, 10},
				Required: true,
				Order:    2,
			},
			{
				Item:     "Additional Notes",
				ItemVi:   "Ghi chu them",
				Type:     "text",
				Required: false,
				Order:    3,
			},
		},
		IsActive: true,
	}
}

// TestGetTemplates tests listing all templates.
func TestGetTemplates(t *testing.T) {
	mockRepo := new(MockAssessmentTemplateRepository)
	svc := NewAssessmentTemplateService(mockRepo)

	expected := []*model.AssessmentTemplate{sampleTemplate()}
	mockRepo.On("GetAll", mock.Anything).Return(expected, nil)

	result, err := svc.GetTemplates(context.Background())
	assert.NoError(t, err)
	assert.Len(t, result, 1)
	assert.Equal(t, "Lower Back Pain Assessment", result[0].Name)

	mockRepo.AssertExpectations(t)
}

// TestGetTemplateByID tests fetching a template by ID.
func TestGetTemplateByID(t *testing.T) {
	mockRepo := new(MockAssessmentTemplateRepository)
	svc := NewAssessmentTemplateService(mockRepo)

	tmpl := sampleTemplate()
	mockRepo.On("GetByID", mock.Anything, "template-001").Return(tmpl, nil)
	mockRepo.On("GetByID", mock.Anything, "nonexistent").Return(nil, repository.ErrNotFound)

	// Found
	result, err := svc.GetTemplateByID(context.Background(), "template-001")
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "lower_back_pain", result.Condition)

	// Not found
	result, err = svc.GetTemplateByID(context.Background(), "nonexistent")
	assert.Error(t, err)
	assert.Nil(t, result)

	mockRepo.AssertExpectations(t)
}

// TestGetTemplatesByCategory tests category filtering with valid and invalid categories.
func TestGetTemplatesByCategory(t *testing.T) {
	mockRepo := new(MockAssessmentTemplateRepository)
	svc := NewAssessmentTemplateService(mockRepo)

	expected := []*model.AssessmentTemplate{sampleTemplate()}
	mockRepo.On("GetByCategory", mock.Anything, "musculoskeletal").Return(expected, nil)

	// Valid category
	result, err := svc.GetTemplatesByCategory(context.Background(), "musculoskeletal")
	assert.NoError(t, err)
	assert.Len(t, result, 1)

	// Invalid category
	result, err = svc.GetTemplatesByCategory(context.Background(), "invalid_category")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid category")
	assert.Nil(t, result)

	mockRepo.AssertExpectations(t)
}

// TestSaveAssessmentResult tests saving assessment results with various inputs.
func TestSaveAssessmentResult(t *testing.T) {
	tests := []struct {
		name        string
		results     map[string]interface{}
		expectError bool
		errorMsg    string
	}{
		{
			name: "Valid results with all required fields",
			results: map[string]interface{}{
				"Posture Assessment":  "Normal",
				"Pain Severity (VAS)": 7,
			},
			expectError: false,
		},
		{
			name: "Valid results with optional field included",
			results: map[string]interface{}{
				"Posture Assessment":  "Kyphotic",
				"Pain Severity (VAS)": 5,
				"Additional Notes":    "Patient reports improvement",
			},
			expectError: false,
		},
		{
			name: "Missing required field",
			results: map[string]interface{}{
				"Posture Assessment": "Normal",
				// Missing Pain Severity
			},
			expectError: true,
			errorMsg:    "required field missing",
		},
		{
			name: "Empty required string field",
			results: map[string]interface{}{
				"Posture Assessment":  "",
				"Pain Severity (VAS)": 5,
			},
			expectError: true,
			errorMsg:    "required field is empty",
		},
		{
			name: "Null required field",
			results: map[string]interface{}{
				"Posture Assessment":  nil,
				"Pain Severity (VAS)": 5,
			},
			expectError: true,
			errorMsg:    "required field is null",
		},
		{
			name: "Zero is a valid number",
			results: map[string]interface{}{
				"Posture Assessment":  "Normal",
				"Pain Severity (VAS)": 0,
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockAssessmentTemplateRepository)
			svc := NewAssessmentTemplateService(mockRepo)

			tmpl := sampleTemplate()
			mockRepo.On("GetByID", mock.Anything, "template-001").Return(tmpl, nil)

			if !tt.expectError {
				mockRepo.On("CreateResult", mock.Anything, mock.AnythingOfType("*model.PatientAssessmentResult")).Return(nil)
			}

			resultsJSON, _ := json.Marshal(tt.results)

			req := &model.CreateAssessmentResultRequest{
				PatientID:  "patient-123",
				TemplateID: "template-001",
				Results:    resultsJSON,
			}

			result, err := svc.SaveAssessmentResult(context.Background(), "clinic-123", "therapist-123", req)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorMsg != "" {
					assert.Contains(t, err.Error(), tt.errorMsg)
				}
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.NotEmpty(t, result.ID)
				assert.Equal(t, "patient-123", result.PatientID)
				assert.Equal(t, "template-001", result.TemplateID)
				assert.Equal(t, "clinic-123", result.ClinicID)
				assert.Equal(t, "therapist-123", result.TherapistID)
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

// TestSaveAssessmentResult_InvalidJSON tests that invalid JSON results are rejected.
func TestSaveAssessmentResult_InvalidJSON(t *testing.T) {
	mockRepo := new(MockAssessmentTemplateRepository)
	svc := NewAssessmentTemplateService(mockRepo)

	tmpl := sampleTemplate()
	mockRepo.On("GetByID", mock.Anything, "template-001").Return(tmpl, nil)

	req := &model.CreateAssessmentResultRequest{
		PatientID:  "patient-123",
		TemplateID: "template-001",
		Results:    json.RawMessage(`not valid json`),
	}

	result, err := svc.SaveAssessmentResult(context.Background(), "clinic-123", "therapist-123", req)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "valid JSON object")
	assert.Nil(t, result)

	mockRepo.AssertExpectations(t)
}

// TestSaveAssessmentResult_TemplateNotFound tests saving with a nonexistent template.
func TestSaveAssessmentResult_TemplateNotFound(t *testing.T) {
	mockRepo := new(MockAssessmentTemplateRepository)
	svc := NewAssessmentTemplateService(mockRepo)

	mockRepo.On("GetByID", mock.Anything, "nonexistent").Return(nil, repository.ErrNotFound)

	req := &model.CreateAssessmentResultRequest{
		PatientID:  "patient-123",
		TemplateID: "nonexistent",
		Results:    json.RawMessage(`{}`),
	}

	result, err := svc.SaveAssessmentResult(context.Background(), "clinic-123", "therapist-123", req)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "template not found")
	assert.Nil(t, result)

	mockRepo.AssertExpectations(t)
}

// TestSaveAssessmentResult_WithAssessedAt tests custom assessed_at parsing.
func TestSaveAssessmentResult_WithAssessedAt(t *testing.T) {
	mockRepo := new(MockAssessmentTemplateRepository)
	svc := NewAssessmentTemplateService(mockRepo)

	tmpl := sampleTemplate()
	mockRepo.On("GetByID", mock.Anything, "template-001").Return(tmpl, nil)
	mockRepo.On("CreateResult", mock.Anything, mock.AnythingOfType("*model.PatientAssessmentResult")).Return(nil)

	results := map[string]interface{}{
		"Posture Assessment":  "Normal",
		"Pain Severity (VAS)": 3,
	}
	resultsJSON, _ := json.Marshal(results)

	// Valid RFC3339
	req := &model.CreateAssessmentResultRequest{
		PatientID:  "patient-123",
		TemplateID: "template-001",
		Results:    resultsJSON,
		AssessedAt: "2025-06-15T10:30:00Z",
	}

	result, err := svc.SaveAssessmentResult(context.Background(), "clinic-123", "therapist-123", req)
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "2025-06-15T10:30:00Z", result.AssessedAt.Format("2006-01-02T15:04:05Z"))

	// Invalid format
	req2 := &model.CreateAssessmentResultRequest{
		PatientID:  "patient-123",
		TemplateID: "template-001",
		Results:    resultsJSON,
		AssessedAt: "2025-06-15",
	}

	result2, err := svc.SaveAssessmentResult(context.Background(), "clinic-123", "therapist-123", req2)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid assessed_at format")
	assert.Nil(t, result2)

	mockRepo.AssertExpectations(t)
}

// TestGetPatientResults tests fetching results for a patient.
func TestGetPatientResults(t *testing.T) {
	mockRepo := new(MockAssessmentTemplateRepository)
	svc := NewAssessmentTemplateService(mockRepo)

	expected := []*model.PatientAssessmentResult{
		{ID: "result-1", PatientID: "p1", TemplateID: "t1"},
		{ID: "result-2", PatientID: "p1", TemplateID: "t2"},
	}
	mockRepo.On("GetPatientResults", mock.Anything, "p1").Return(expected, nil)

	result, err := svc.GetPatientResults(context.Background(), "p1")
	assert.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Equal(t, "result-1", result[0].ID)

	mockRepo.AssertExpectations(t)
}

// TestValidateResults_CheckboxEmpty tests that empty checkbox arrays are rejected.
func TestValidateResults_CheckboxEmpty(t *testing.T) {
	items := []model.ChecklistItem{
		{
			Item:     "Pain Location",
			ItemVi:   "Vi tri dau",
			Type:     "checkbox",
			Options:  []string{"Central", "Left", "Right"},
			Required: true,
			Order:    1,
		},
	}

	// Empty array should fail
	emptyResults := json.RawMessage(`{"Pain Location": []}`)
	err := validateResults(items, emptyResults)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no selections")

	// Non-empty array should pass
	validResults := json.RawMessage(`{"Pain Location": ["Central"]}`)
	err = validateResults(items, validResults)
	assert.NoError(t, err)
}
