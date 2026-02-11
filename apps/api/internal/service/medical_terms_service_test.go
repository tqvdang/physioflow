package service

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// MockMedicalTermsRepository is a mock implementation
type MockMedicalTermsRepository struct {
	mock.Mock
}

func (m *MockMedicalTermsRepository) Search(ctx context.Context, query, category string) ([]*model.TermSearchResult, error) {
	args := m.Called(ctx, query, category)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.TermSearchResult), args.Error(1)
}

func (m *MockMedicalTermsRepository) GetByID(ctx context.Context, id string) (*model.MedicalTerm, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.MedicalTerm), args.Error(1)
}

func (m *MockMedicalTermsRepository) Create(ctx context.Context, term *model.MedicalTerm) error {
	args := m.Called(ctx, term)
	return args.Error(0)
}

func (m *MockMedicalTermsRepository) GetByCategory(ctx context.Context, category string) ([]*model.MedicalTerm, error) {
	args := m.Called(ctx, category)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.MedicalTerm), args.Error(1)
}

func (m *MockMedicalTermsRepository) GetByICD10(ctx context.Context, code string) (*model.MedicalTerm, error) {
	args := m.Called(ctx, code)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.MedicalTerm), args.Error(1)
}

// TestSearchTerms tests search query validation
func TestSearchTerms(t *testing.T) {
	tests := []struct {
		name        string
		query       string
		category    string
		expectError bool
		errorMsg    string
		setupMock   bool
		mockResults []*model.TermSearchResult
	}{
		{
			name:        "Valid search with 2 characters",
			query:       "kn",
			category:    "",
			expectError: false,
			setupMock:   true,
			mockResults: []*model.TermSearchResult{
				{
					Term: model.MedicalTerm{
						ID:     "term-1",
						TermEn: "Knee",
						TermVi: "Gối",
					},
					Score:      0.95,
					MatchField: "term_en",
				},
			},
		},
		{
			name:        "Valid search with longer query",
			query:       "shoulder",
			category:    "anatomy",
			expectError: false,
			setupMock:   true,
			mockResults: []*model.TermSearchResult{
				{
					Term: model.MedicalTerm{
						ID:     "term-2",
						TermEn: "Shoulder joint",
						TermVi: "Khớp vai",
					},
					Score:      0.98,
					MatchField: "term_en",
				},
			},
		},
		{
			name:        "Query too short (1 character)",
			query:       "k",
			category:    "",
			expectError: true,
			errorMsg:    "search query must be at least 2 characters",
			setupMock:   false,
		},
		{
			name:        "Empty query",
			query:       "",
			category:    "",
			expectError: true,
			errorMsg:    "search query must be at least 2 characters",
			setupMock:   false,
		},
		{
			name:        "Whitespace only query",
			query:       "   ",
			category:    "",
			expectError: true,
			errorMsg:    "search query must be at least 2 characters",
			setupMock:   false,
		},
		{
			name:        "Invalid category",
			query:       "test",
			category:    "invalid_category",
			expectError: true,
			errorMsg:    "invalid category",
			setupMock:   false,
		},
		{
			name:        "Valid category: anatomy",
			query:       "shoulder",
			category:    "anatomy",
			expectError: false,
			setupMock:   true,
			mockResults: []*model.TermSearchResult{},
		},
		{
			name:        "Valid category: symptom",
			query:       "pain",
			category:    "symptom",
			expectError: false,
			setupMock:   true,
			mockResults: []*model.TermSearchResult{},
		},
		{
			name:        "Valid category: condition",
			query:       "arthritis",
			category:    "condition",
			expectError: false,
			setupMock:   true,
			mockResults: []*model.TermSearchResult{},
		},
		{
			name:        "Valid category: treatment",
			query:       "massage",
			category:    "treatment",
			expectError: false,
			setupMock:   true,
			mockResults: []*model.TermSearchResult{},
		},
		{
			name:        "Valid category: assessment",
			query:       "rom",
			category:    "assessment",
			expectError: false,
			setupMock:   true,
			mockResults: []*model.TermSearchResult{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockMedicalTermsRepository)
			service := NewMedicalTermsService(mockRepo)

			if tt.setupMock {
				mockRepo.On("Search", mock.Anything, mock.Anything, tt.category).Return(tt.mockResults, nil)
			}

			result, err := service.SearchTerms(context.Background(), tt.query, tt.category)

			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				if tt.mockResults != nil {
					assert.Len(t, result, len(tt.mockResults))
				}
				mockRepo.AssertExpectations(t)
			}
		})
	}
}

// TestIsValidCategory tests category validation
func TestIsValidCategory(t *testing.T) {
	tests := []struct {
		category string
		expected bool
	}{
		{"anatomy", true},
		{"symptom", true},
		{"condition", true},
		{"treatment", true},
		{"assessment", true},
		{"invalid", false},
		{"", false},
		{"ANATOMY", false}, // Case-sensitive
		{"anatomy ", false}, // No trimming in validation
	}

	for _, tt := range tests {
		t.Run(tt.category, func(t *testing.T) {
			result := isValidCategory(tt.category)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// TestCreateCustomTerm tests custom term creation
func TestCreateCustomTerm(t *testing.T) {
	tests := []struct {
		name        string
		request     *model.CreateMedicalTermRequest
		expectError bool
	}{
		{
			name: "Valid custom term",
			request: &model.CreateMedicalTermRequest{
				TermEn:       "Rotator cuff",
				TermVi:       "Bắp thịt vòng xoay",
				DefinitionEn: "Group of four muscles in the shoulder",
				DefinitionVi: "Nhóm bốn cơ ở vai",
				Category:     "anatomy",
				Subcategory:  "shoulder",
				AliasesEn:    []string{"rotator muscles"},
				AliasesVi:    []string{"cơ vòng xoay vai"},
			},
			expectError: false,
		},
		{
			name: "Term with ICD-10 code",
			request: &model.CreateMedicalTermRequest{
				TermEn:       "Frozen shoulder",
				TermVi:       "Vai đóng băng",
				DefinitionEn: "Adhesive capsulitis",
				Category:     "condition",
				ICD10Code:    "M75.0",
			},
			expectError: false,
		},
		{
			name: "Commonly used term",
			request: &model.CreateMedicalTermRequest{
				TermEn:       "Range of motion",
				TermVi:       "Biên độ chuyển động",
				Category:     "assessment",
				CommonlyUsed: boolPtr(true),
			},
			expectError: false,
		},
		{
			name: "Not commonly used (explicit false)",
			request: &model.CreateMedicalTermRequest{
				TermEn:       "Rare condition",
				TermVi:       "Bệnh hiếm gặp",
				Category:     "condition",
				CommonlyUsed: boolPtr(false),
			},
			expectError: false,
		},
		{
			name: "Default commonly used (nil → true)",
			request: &model.CreateMedicalTermRequest{
				TermEn:       "Pain",
				TermVi:       "Đau",
				Category:     "symptom",
				CommonlyUsed: nil, // Should default to true
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockMedicalTermsRepository)
			service := NewMedicalTermsService(mockRepo)

			mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*model.MedicalTerm")).
				Run(func(args mock.Arguments) {
					term := args.Get(1).(*model.MedicalTerm)
					assert.Equal(t, tt.request.TermEn, term.TermEn)
					assert.Equal(t, tt.request.TermVi, term.TermVi)
					assert.Equal(t, tt.request.Category, term.Category)
					assert.True(t, term.IsActive)

					// Check default value for CommonlyUsed
					if tt.request.CommonlyUsed == nil {
						assert.True(t, term.CommonlyUsed)
					} else {
						assert.Equal(t, *tt.request.CommonlyUsed, term.CommonlyUsed)
					}
				}).
				Return(nil)

			result, err := service.CreateCustomTerm(context.Background(), tt.request)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				mockRepo.AssertExpectations(t)
			}
		})
	}
}

// TestGetTermsByCategory tests category-based retrieval
func TestGetTermsByCategory(t *testing.T) {
	tests := []struct {
		name        string
		category    string
		expectError bool
		errorMsg    string
		mockTerms   []*model.MedicalTerm
	}{
		{
			name:        "Valid category: anatomy",
			category:    "anatomy",
			expectError: false,
			mockTerms: []*model.MedicalTerm{
				{ID: "term-1", TermEn: "Knee", TermVi: "Gối", Category: "anatomy"},
				{ID: "term-2", TermEn: "Shoulder", TermVi: "Vai", Category: "anatomy"},
			},
		},
		{
			name:        "Valid category: symptom",
			category:    "symptom",
			expectError: false,
			mockTerms: []*model.MedicalTerm{
				{ID: "term-3", TermEn: "Pain", TermVi: "Đau", Category: "symptom"},
			},
		},
		{
			name:        "Invalid category",
			category:    "invalid_category",
			expectError: true,
			errorMsg:    "invalid category",
		},
		{
			name:        "Empty category",
			category:    "",
			expectError: true,
			errorMsg:    "invalid category",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockMedicalTermsRepository)
			service := NewMedicalTermsService(mockRepo)

			if !tt.expectError {
				mockRepo.On("GetByCategory", mock.Anything, tt.category).Return(tt.mockTerms, nil)
			}

			result, err := service.GetTermsByCategory(context.Background(), tt.category)

			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Len(t, result, len(tt.mockTerms))
				mockRepo.AssertExpectations(t)
			}
		})
	}
}

// TestGetTermByICD10 tests ICD-10 code lookup
func TestGetTermByICD10(t *testing.T) {
	tests := []struct {
		name        string
		code        string
		expectError bool
		errorMsg    string
		mockTerm    *model.MedicalTerm
	}{
		{
			name:        "Valid ICD-10 code",
			code:        "M75.0",
			expectError: false,
			mockTerm: &model.MedicalTerm{
				ID:        "term-1",
				TermEn:    "Adhesive capsulitis",
				TermVi:    "Viêm bao khớp dính",
				ICD10Code: "M75.0",
			},
		},
		{
			name:        "ICD-10 code with whitespace (should trim)",
			code:        " M75.0 ",
			expectError: false,
			mockTerm: &model.MedicalTerm{
				ID:        "term-1",
				TermEn:    "Adhesive capsulitis",
				ICD10Code: "M75.0",
			},
		},
		{
			name:        "Empty code",
			code:        "",
			expectError: true,
			errorMsg:    "ICD-10 code is required",
		},
		{
			name:        "Whitespace only code",
			code:        "   ",
			expectError: true,
			errorMsg:    "ICD-10 code is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockMedicalTermsRepository)
			service := NewMedicalTermsService(mockRepo)

			if !tt.expectError {
				// The service trims the code before passing to repo
				trimmedCode := "M75.0"
				mockRepo.On("GetByICD10", mock.Anything, trimmedCode).Return(tt.mockTerm, nil)
			}

			result, err := service.GetTermByICD10(context.Background(), tt.code)

			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				mockRepo.AssertExpectations(t)
			}
		})
	}
}

// TestGetTermByID tests term retrieval by ID
func TestGetTermByID(t *testing.T) {
	term := &model.MedicalTerm{
		ID:           "term-1",
		TermEn:       "Knee",
		TermVi:       "Gối",
		Category:     "anatomy",
		CommonlyUsed: true,
		IsActive:     true,
	}

	mockRepo := new(MockMedicalTermsRepository)
	service := NewMedicalTermsService(mockRepo)

	mockRepo.On("GetByID", mock.Anything, "term-1").Return(term, nil)

	result, err := service.GetTermByID(context.Background(), "term-1")

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "term-1", result.ID)
	assert.Equal(t, "Knee", result.TermEn)

	mockRepo.AssertExpectations(t)
}

// TestSearchTermsRepositoryError tests error handling from repository
func TestSearchTermsRepositoryError(t *testing.T) {
	mockRepo := new(MockMedicalTermsRepository)
	service := NewMedicalTermsService(mockRepo)

	repoError := errors.New("database connection failed")
	mockRepo.On("Search", mock.Anything, "knee", "").Return(nil, repoError)

	result, err := service.SearchTerms(context.Background(), "knee", "")

	assert.Error(t, err)
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

// TestAllValidCategories ensures all valid categories are properly recognized
func TestAllValidCategories(t *testing.T) {
	expectedCategories := []string{
		"anatomy",
		"symptom",
		"condition",
		"treatment",
		"assessment",
	}

	for _, category := range expectedCategories {
		t.Run(category, func(t *testing.T) {
			assert.True(t, isValidCategory(category), "Category %s should be valid", category)
		})
	}

	// Ensure the count matches
	assert.Equal(t, len(expectedCategories), len(model.ValidTermCategories))
}

// TestSearchWithVariousQueryLengths tests minimum character requirement
func TestSearchWithVariousQueryLengths(t *testing.T) {
	mockRepo := new(MockMedicalTermsRepository)
	service := NewMedicalTermsService(mockRepo)

	tests := []struct {
		query       string
		shouldError bool
	}{
		{"a", true},        // 1 char - too short
		{"ab", false},      // 2 chars - minimum
		{"abc", false},     // 3 chars - ok
		{"shoulder", false}, // Long query - ok
		{"", true},         // Empty - too short
		{" a ", true},      // 1 char with whitespace - too short after trim
		{" ab ", false},    // 2 chars with whitespace - ok after trim
	}

	for _, tt := range tests {
		t.Run(tt.query, func(t *testing.T) {
			if !tt.shouldError {
				mockRepo.On("Search", mock.Anything, mock.Anything, "").
					Return([]*model.TermSearchResult{}, nil).Once()
			}

			_, err := service.SearchTerms(context.Background(), tt.query, "")

			if tt.shouldError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// Helper function
func boolPtr(b bool) *bool {
	return &b
}
