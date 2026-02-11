package service

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
)

// MockSpecialTestRepository is a mock implementation of repository.SpecialTestRepository.
type MockSpecialTestRepository struct {
	mock.Mock
}

func (m *MockSpecialTestRepository) GetAll(ctx context.Context) ([]*model.SpecialTest, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.SpecialTest), args.Error(1)
}

func (m *MockSpecialTestRepository) GetByCategory(ctx context.Context, category model.TestCategory) ([]*model.SpecialTest, error) {
	args := m.Called(ctx, category)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.SpecialTest), args.Error(1)
}

func (m *MockSpecialTestRepository) GetByID(ctx context.Context, id string) (*model.SpecialTest, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.SpecialTest), args.Error(1)
}

func (m *MockSpecialTestRepository) Search(ctx context.Context, query string, limit int) ([]*model.SpecialTest, error) {
	args := m.Called(ctx, query, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.SpecialTest), args.Error(1)
}

func (m *MockSpecialTestRepository) CreateResult(ctx context.Context, result *model.PatientSpecialTestResult) error {
	args := m.Called(ctx, result)
	return args.Error(0)
}

func (m *MockSpecialTestRepository) GetPatientResults(ctx context.Context, patientID string) ([]*model.PatientSpecialTestResult, error) {
	args := m.Called(ctx, patientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.PatientSpecialTestResult), args.Error(1)
}

func (m *MockSpecialTestRepository) GetResultsByVisit(ctx context.Context, visitID string) ([]*model.PatientSpecialTestResult, error) {
	args := m.Called(ctx, visitID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.PatientSpecialTestResult), args.Error(1)
}

// TestGetTestsByCategory tests category filtering with valid and invalid categories.
func TestGetTestsByCategory(t *testing.T) {
	tests := []struct {
		name        string
		category    string
		mockTests   []*model.SpecialTest
		expectError bool
		errorMsg    string
	}{
		{
			name:     "Valid category: shoulder",
			category: "shoulder",
			mockTests: []*model.SpecialTest{
				{ID: "t1", Name: "Neer's Test", Category: model.TestCategoryShoulder},
				{ID: "t2", Name: "Hawkins-Kennedy Test", Category: model.TestCategoryShoulder},
			},
			expectError: false,
		},
		{
			name:     "Valid category: knee",
			category: "knee",
			mockTests: []*model.SpecialTest{
				{ID: "t3", Name: "Lachman Test", Category: model.TestCategoryKnee},
			},
			expectError: false,
		},
		{
			name:        "Invalid category",
			category:    "invalid_body_part",
			expectError: true,
			errorMsg:    "invalid test category",
		},
		{
			name:      "Valid category with no tests",
			category:  "elbow",
			mockTests: []*model.SpecialTest{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockSpecialTestRepository)
			svc := NewSpecialTestService(mockRepo)

			if !tt.expectError {
				mockRepo.On("GetByCategory", mock.Anything, model.TestCategory(tt.category)).Return(tt.mockTests, nil)
			}

			result, err := svc.GetTestsByCategory(context.Background(), tt.category)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorMsg != "" {
					assert.Contains(t, err.Error(), tt.errorMsg)
				}
			} else {
				assert.NoError(t, err)
				assert.Equal(t, len(tt.mockTests), len(result))
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

// TestSearchTests tests search functionality.
func TestSearchTests(t *testing.T) {
	tests := []struct {
		name        string
		query       string
		limit       int
		mockTests   []*model.SpecialTest
		expectEmpty bool
	}{
		{
			name:  "Search by English name",
			query: "Lachman",
			limit: 20,
			mockTests: []*model.SpecialTest{
				{ID: "t1", Name: "Lachman Test", NameVi: "Test Lachman", Category: model.TestCategoryKnee},
			},
		},
		{
			name:  "Search by Vietnamese name",
			query: "Neer",
			limit: 20,
			mockTests: []*model.SpecialTest{
				{ID: "t2", Name: "Neer's Test", NameVi: "Test Neer", Category: model.TestCategoryShoulder},
			},
		},
		{
			name:        "Empty query returns empty result",
			query:       "",
			limit:       20,
			expectEmpty: true,
		},
		{
			name:      "No match returns empty list",
			query:     "nonexistent",
			limit:     20,
			mockTests: []*model.SpecialTest{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockSpecialTestRepository)
			svc := NewSpecialTestService(mockRepo)

			if !tt.expectEmpty && tt.query != "" {
				mockRepo.On("Search", mock.Anything, tt.query, tt.limit).Return(tt.mockTests, nil)
			}

			result, err := svc.SearchTests(context.Background(), tt.query, tt.limit)
			assert.NoError(t, err)

			if tt.expectEmpty {
				assert.Empty(t, result)
			} else {
				assert.Equal(t, len(tt.mockTests), len(result))
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

// TestRecordTestResult tests recording special test results.
func TestRecordTestResult(t *testing.T) {
	sensitivity := 85
	specificity := 94
	existingTest := &model.SpecialTest{
		ID:          "test-uuid-1",
		Name:        "Lachman Test",
		NameVi:      "Test Lachman",
		Category:    model.TestCategoryKnee,
		Sensitivity: &sensitivity,
		Specificity: &specificity,
	}

	tests := []struct {
		name          string
		req           *model.CreateSpecialTestResultRequest
		testExists    bool
		expectError   bool
		errorMsg      string
		expectedResult model.TestResult
	}{
		{
			name: "Valid positive result",
			req: &model.CreateSpecialTestResultRequest{
				PatientID:     "patient-123",
				SpecialTestID: "test-uuid-1",
				Result:        "positive",
				Notes:         "Significant anterior translation noted",
			},
			testExists:     true,
			expectError:    false,
			expectedResult: model.TestResultPositive,
		},
		{
			name: "Valid negative result",
			req: &model.CreateSpecialTestResultRequest{
				PatientID:     "patient-123",
				SpecialTestID: "test-uuid-1",
				Result:        "negative",
			},
			testExists:     true,
			expectError:    false,
			expectedResult: model.TestResultNegative,
		},
		{
			name: "Valid inconclusive result with visit ID",
			req: &model.CreateSpecialTestResultRequest{
				PatientID:     "patient-123",
				VisitID:       "visit-456",
				SpecialTestID: "test-uuid-1",
				Result:        "inconclusive",
				Notes:         "Patient unable to relax",
			},
			testExists:     true,
			expectError:    false,
			expectedResult: model.TestResultInconclusive,
		},
		{
			name: "Non-existent special test returns error",
			req: &model.CreateSpecialTestResultRequest{
				PatientID:     "patient-123",
				SpecialTestID: "nonexistent-uuid",
				Result:        "positive",
			},
			testExists:  false,
			expectError: true,
			errorMsg:    "special test not found",
		},
		{
			name: "Invalid assessed_at format",
			req: &model.CreateSpecialTestResultRequest{
				PatientID:     "patient-123",
				SpecialTestID: "test-uuid-1",
				Result:        "positive",
				AssessedAt:    "2024-01-15",
			},
			testExists:  true,
			expectError: true,
			errorMsg:    "invalid assessed_at format",
		},
		{
			name: "Valid assessed_at in RFC3339",
			req: &model.CreateSpecialTestResultRequest{
				PatientID:     "patient-123",
				SpecialTestID: "test-uuid-1",
				Result:        "positive",
				AssessedAt:    "2024-06-15T10:30:00Z",
			},
			testExists:     true,
			expectError:    false,
			expectedResult: model.TestResultPositive,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockSpecialTestRepository)
			svc := NewSpecialTestService(mockRepo)

			if tt.testExists {
				mockRepo.On("GetByID", mock.Anything, tt.req.SpecialTestID).Return(existingTest, nil)
			} else {
				mockRepo.On("GetByID", mock.Anything, tt.req.SpecialTestID).Return(nil, repository.ErrNotFound)
			}

			if tt.testExists && !tt.expectError {
				mockRepo.On("CreateResult", mock.Anything, mock.AnythingOfType("*model.PatientSpecialTestResult")).Return(nil)
			}

			result, err := svc.RecordTestResult(context.Background(), "therapist-123", tt.req)

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
				assert.Equal(t, tt.req.PatientID, result.PatientID)
				assert.Equal(t, tt.req.SpecialTestID, result.SpecialTestID)
				assert.Equal(t, tt.expectedResult, result.Result)
				assert.Equal(t, "therapist-123", result.TherapistID)

				if tt.req.VisitID != "" {
					assert.NotNil(t, result.VisitID)
					assert.Equal(t, tt.req.VisitID, *result.VisitID)
				} else {
					assert.Nil(t, result.VisitID)
				}
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

// TestRecordTestResult_VisitID tests visit ID handling.
func TestRecordTestResult_VisitID(t *testing.T) {
	mockRepo := new(MockSpecialTestRepository)
	svc := NewSpecialTestService(mockRepo)
	existingTest := &model.SpecialTest{ID: "test-uuid-1", Name: "Lachman Test"}

	mockRepo.On("GetByID", mock.Anything, "test-uuid-1").Return(existingTest, nil)
	mockRepo.On("CreateResult", mock.Anything, mock.AnythingOfType("*model.PatientSpecialTestResult")).Return(nil)

	// With visit ID
	req := &model.CreateSpecialTestResultRequest{
		PatientID:     "patient-123",
		VisitID:       "visit-456",
		SpecialTestID: "test-uuid-1",
		Result:        "positive",
	}

	result, err := svc.RecordTestResult(context.Background(), "therapist-123", req)
	assert.NoError(t, err)
	assert.NotNil(t, result.VisitID)
	assert.Equal(t, "visit-456", *result.VisitID)

	// Without visit ID
	req2 := &model.CreateSpecialTestResultRequest{
		PatientID:     "patient-123",
		SpecialTestID: "test-uuid-1",
		Result:        "negative",
	}

	result2, err := svc.RecordTestResult(context.Background(), "therapist-123", req2)
	assert.NoError(t, err)
	assert.Nil(t, result2.VisitID)

	mockRepo.AssertExpectations(t)
}

// TestGetPatientTestHistory tests delegation to repository.
func TestGetPatientTestHistory(t *testing.T) {
	mockRepo := new(MockSpecialTestRepository)
	svc := NewSpecialTestService(mockRepo)

	now := time.Now()
	expected := []*model.PatientSpecialTestResult{
		{ID: "r1", PatientID: "p1", SpecialTestID: "t1", Result: model.TestResultPositive, AssessedAt: now},
		{ID: "r2", PatientID: "p1", SpecialTestID: "t2", Result: model.TestResultNegative, AssessedAt: now},
	}

	mockRepo.On("GetPatientResults", mock.Anything, "p1").Return(expected, nil)

	result, err := svc.GetPatientTestHistory(context.Background(), "p1")
	assert.NoError(t, err)
	assert.Equal(t, 2, len(result))
	assert.Equal(t, "r1", result[0].ID)
	assert.Equal(t, model.TestResultPositive, result[0].Result)

	mockRepo.AssertExpectations(t)
}

// TestGetResultsByVisit tests visit-based result retrieval.
func TestGetResultsByVisit(t *testing.T) {
	mockRepo := new(MockSpecialTestRepository)
	svc := NewSpecialTestService(mockRepo)

	visitID := "visit-123"
	expected := []*model.PatientSpecialTestResult{
		{ID: "r1", PatientID: "p1", SpecialTestID: "t1", Result: model.TestResultPositive},
	}

	mockRepo.On("GetResultsByVisit", mock.Anything, visitID).Return(expected, nil)

	result, err := svc.GetResultsByVisit(context.Background(), visitID)
	assert.NoError(t, err)
	assert.Equal(t, 1, len(result))

	mockRepo.AssertExpectations(t)
}

// TestGetAllTests tests retrieval of the entire test library.
func TestGetAllTests(t *testing.T) {
	mockRepo := new(MockSpecialTestRepository)
	svc := NewSpecialTestService(mockRepo)

	expected := []*model.SpecialTest{
		{ID: "t1", Name: "Neer's Test", Category: model.TestCategoryShoulder},
		{ID: "t2", Name: "Lachman Test", Category: model.TestCategoryKnee},
		{ID: "t3", Name: "Straight Leg Raise", Category: model.TestCategorySpine},
	}

	mockRepo.On("GetAll", mock.Anything).Return(expected, nil)

	result, err := svc.GetAllTests(context.Background())
	assert.NoError(t, err)
	assert.Equal(t, 3, len(result))

	mockRepo.AssertExpectations(t)
}

// TestIsValidTestCategory validates category checking.
func TestIsValidTestCategory(t *testing.T) {
	assert.True(t, model.IsValidTestCategory("shoulder"))
	assert.True(t, model.IsValidTestCategory("knee"))
	assert.True(t, model.IsValidTestCategory("spine"))
	assert.True(t, model.IsValidTestCategory("hip"))
	assert.True(t, model.IsValidTestCategory("ankle"))
	assert.True(t, model.IsValidTestCategory("elbow"))
	assert.False(t, model.IsValidTestCategory(""))
	assert.False(t, model.IsValidTestCategory("invalid"))
	assert.False(t, model.IsValidTestCategory("SHOULDER"))
}

// TestIsValidTestResult validates test result checking.
func TestIsValidTestResult(t *testing.T) {
	assert.True(t, model.IsValidTestResult("positive"))
	assert.True(t, model.IsValidTestResult("negative"))
	assert.True(t, model.IsValidTestResult("inconclusive"))
	assert.False(t, model.IsValidTestResult(""))
	assert.False(t, model.IsValidTestResult("unknown"))
	assert.False(t, model.IsValidTestResult("POSITIVE"))
}
