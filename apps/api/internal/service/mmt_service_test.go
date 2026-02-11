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

// MockMMTRepository is a mock implementation of repository.MMTRepository.
type MockMMTRepository struct {
	mock.Mock
}

func (m *MockMMTRepository) Create(ctx context.Context, assessment *model.MMTAssessment) error {
	args := m.Called(ctx, assessment)
	return args.Error(0)
}

func (m *MockMMTRepository) GetByID(ctx context.Context, id string) (*model.MMTAssessment, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.MMTAssessment), args.Error(1)
}

func (m *MockMMTRepository) GetByPatientID(ctx context.Context, patientID string) ([]*model.MMTAssessment, error) {
	args := m.Called(ctx, patientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.MMTAssessment), args.Error(1)
}

func (m *MockMMTRepository) GetByVisitID(ctx context.Context, visitID string) ([]*model.MMTAssessment, error) {
	args := m.Called(ctx, visitID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.MMTAssessment), args.Error(1)
}

func (m *MockMMTRepository) GetHistory(ctx context.Context, patientID string, muscleGroup string, side model.MMTSide) ([]*model.MMTAssessment, error) {
	args := m.Called(ctx, patientID, muscleGroup, side)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.MMTAssessment), args.Error(1)
}

// TestIsValidMMTGrade tests the grade validation function.
func TestIsValidMMTGrade(t *testing.T) {
	validGrades := []float64{0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5}
	for _, grade := range validGrades {
		assert.True(t, isValidMMTGrade(grade), "Grade %.1f should be valid", grade)
	}

	invalidGrades := []float64{-1, 0.3, 0.7, 1.2, 2.3, 3.1, 4.2, 5.5, 6, 10}
	for _, grade := range invalidGrades {
		assert.False(t, isValidMMTGrade(grade), "Grade %.1f should be invalid", grade)
	}
}

// TestRecordMMTAssessment tests MMT assessment recording with various inputs.
func TestRecordMMTAssessment(t *testing.T) {
	tests := []struct {
		name        string
		req         *model.CreateMMTAssessmentRequest
		expectError bool
		errorMsg    string
	}{
		{
			name: "Valid MMT assessment - grade 4",
			req: &model.CreateMMTAssessmentRequest{
				PatientID:   "patient-123",
				MuscleGroup: "Quadriceps",
				Side:        "left",
				Grade:       4.0,
				Notes:       "Good strength against resistance",
			},
			expectError: false,
		},
		{
			name: "Valid MMT assessment - half grade 3.5",
			req: &model.CreateMMTAssessmentRequest{
				PatientID:   "patient-123",
				MuscleGroup: "Biceps",
				Side:        "right",
				Grade:       3.5,
			},
			expectError: false,
		},
		{
			name: "Valid MMT assessment - grade 0 (no contraction)",
			req: &model.CreateMMTAssessmentRequest{
				PatientID:   "patient-123",
				MuscleGroup: "Deltoid",
				Side:        "left",
				Grade:       0,
			},
			expectError: false,
		},
		{
			name: "Valid MMT assessment - grade 5 (normal)",
			req: &model.CreateMMTAssessmentRequest{
				PatientID:   "patient-123",
				MuscleGroup: "Hamstrings",
				Side:        "bilateral",
				Grade:       5.0,
			},
			expectError: false,
		},
		{
			name: "Invalid grade: 3.2 (not on 0.5 increment)",
			req: &model.CreateMMTAssessmentRequest{
				PatientID:   "patient-123",
				MuscleGroup: "Quadriceps",
				Side:        "left",
				Grade:       3.2,
			},
			expectError: true,
			errorMsg:    "invalid MMT grade",
		},
		{
			name: "Invalid grade: 5.5 (exceeds max)",
			req: &model.CreateMMTAssessmentRequest{
				PatientID:   "patient-123",
				MuscleGroup: "Quadriceps",
				Side:        "left",
				Grade:       5.5,
			},
			expectError: true,
			errorMsg:    "invalid MMT grade",
		},
		{
			name: "Invalid grade: -1 (negative)",
			req: &model.CreateMMTAssessmentRequest{
				PatientID:   "patient-123",
				MuscleGroup: "Quadriceps",
				Side:        "left",
				Grade:       -1.0,
			},
			expectError: true,
			errorMsg:    "invalid MMT grade",
		},
		{
			name: "Invalid assessed_at format",
			req: &model.CreateMMTAssessmentRequest{
				PatientID:   "patient-123",
				MuscleGroup: "Biceps",
				Side:        "right",
				Grade:       4.0,
				AssessedAt:  "2024-01-15",
			},
			expectError: true,
			errorMsg:    "invalid assessed_at format",
		},
		{
			name: "Valid assessed_at in RFC3339",
			req: &model.CreateMMTAssessmentRequest{
				PatientID:   "patient-123",
				MuscleGroup: "Triceps",
				Side:        "left",
				Grade:       3.0,
				AssessedAt:  "2024-06-15T14:00:00Z",
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockMMTRepository)
			service := NewMMTService(mockRepo)

			if !tt.expectError {
				mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*model.MMTAssessment")).Return(nil)
			}

			result, err := service.RecordAssessment(context.Background(), "clinic-123", "therapist-123", tt.req)

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
				assert.Equal(t, tt.req.MuscleGroup, result.MuscleGroup)
				assert.Equal(t, model.MMTSide(tt.req.Side), result.Side)
				assert.Equal(t, tt.req.Grade, result.Grade)
				assert.Equal(t, "clinic-123", result.ClinicID)
				assert.Equal(t, "therapist-123", result.TherapistID)
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

// TestRecordMMTAssessment_VisitID tests that visit ID is properly handled.
func TestRecordMMTAssessment_VisitID(t *testing.T) {
	mockRepo := new(MockMMTRepository)
	service := NewMMTService(mockRepo)
	mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*model.MMTAssessment")).Return(nil)

	// With visit ID
	req := &model.CreateMMTAssessmentRequest{
		PatientID:   "patient-123",
		VisitID:     "visit-456",
		MuscleGroup: "Quadriceps",
		Side:        "left",
		Grade:       4.0,
	}

	result, err := service.RecordAssessment(context.Background(), "clinic-123", "therapist-123", req)
	assert.NoError(t, err)
	assert.NotNil(t, result.VisitID)
	assert.Equal(t, "visit-456", *result.VisitID)

	// Without visit ID
	req2 := &model.CreateMMTAssessmentRequest{
		PatientID:   "patient-123",
		MuscleGroup: "Quadriceps",
		Side:        "left",
		Grade:       4.0,
	}

	result2, err := service.RecordAssessment(context.Background(), "clinic-123", "therapist-123", req2)
	assert.NoError(t, err)
	assert.Nil(t, result2.VisitID)

	mockRepo.AssertExpectations(t)
}

// TestGetMMTTrending tests trending calculation for MMT measurements.
func TestGetMMTTrending(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name           string
		assessments    []*model.MMTAssessment
		expectedTrend  model.TrendDirection
		expectedChange float64
		expectError    bool
	}{
		{
			name: "Improved: grade increased over time",
			assessments: []*model.MMTAssessment{
				{ID: "a1", PatientID: "p1", MuscleGroup: "Quadriceps", Side: model.MMTSideLeft, Grade: 2.0, AssessedAt: now.AddDate(0, 0, -14)},
				{ID: "a2", PatientID: "p1", MuscleGroup: "Quadriceps", Side: model.MMTSideLeft, Grade: 3.0, AssessedAt: now.AddDate(0, 0, -7)},
				{ID: "a3", PatientID: "p1", MuscleGroup: "Quadriceps", Side: model.MMTSideLeft, Grade: 4.0, AssessedAt: now},
			},
			expectedTrend:  model.TrendImproved,
			expectedChange: 2.0, // 4 - 2
		},
		{
			name: "Declined: grade decreased over time",
			assessments: []*model.MMTAssessment{
				{ID: "a1", PatientID: "p1", MuscleGroup: "Biceps", Side: model.MMTSideRight, Grade: 4.5, AssessedAt: now.AddDate(0, 0, -7)},
				{ID: "a2", PatientID: "p1", MuscleGroup: "Biceps", Side: model.MMTSideRight, Grade: 3.0, AssessedAt: now},
			},
			expectedTrend:  model.TrendDeclined,
			expectedChange: -1.5, // 3 - 4.5
		},
		{
			name: "Stable: no change in grade",
			assessments: []*model.MMTAssessment{
				{ID: "a1", PatientID: "p1", MuscleGroup: "Deltoid", Side: model.MMTSideBilateral, Grade: 3.5, AssessedAt: now.AddDate(0, 0, -7)},
				{ID: "a2", PatientID: "p1", MuscleGroup: "Deltoid", Side: model.MMTSideBilateral, Grade: 3.5, AssessedAt: now},
			},
			expectedTrend:  model.TrendStable,
			expectedChange: 0.0,
		},
		{
			name: "Insufficient data: single measurement",
			assessments: []*model.MMTAssessment{
				{ID: "a1", PatientID: "p1", MuscleGroup: "Quadriceps", Side: model.MMTSideLeft, Grade: 3.0, AssessedAt: now},
			},
			expectedTrend:  model.TrendInsuffData,
			expectedChange: 0.0,
		},
		{
			name:        "No data: returns error",
			assessments: []*model.MMTAssessment{},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockMMTRepository)
			service := NewMMTService(mockRepo)

			var muscleGroup string
			var side model.MMTSide
			if len(tt.assessments) > 0 {
				muscleGroup = tt.assessments[0].MuscleGroup
				side = tt.assessments[0].Side
			} else {
				muscleGroup = "Quadriceps"
				side = model.MMTSideLeft
			}

			mockRepo.On("GetHistory", mock.Anything, "p1", muscleGroup, side).
				Return(tt.assessments, nil)

			result, err := service.GetTrending(context.Background(), "p1", muscleGroup, side)

			if tt.expectError {
				assert.Error(t, err)
				assert.Equal(t, repository.ErrNotFound, err)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, tt.expectedTrend, result.Trend)
				assert.Equal(t, len(tt.assessments), len(result.DataPoints))
				assert.Equal(t, muscleGroup, result.MuscleGroup)
				assert.Equal(t, side, result.Side)

				if tt.expectedTrend != model.TrendInsuffData {
					assert.NotNil(t, result.Change)
					assert.InDelta(t, tt.expectedChange, *result.Change, 0.01)
				}

				if len(tt.assessments) > 0 {
					assert.NotNil(t, result.Baseline)
					assert.NotNil(t, result.Current)
					assert.Equal(t, tt.assessments[0].Grade, *result.Baseline)
					assert.Equal(t, tt.assessments[len(tt.assessments)-1].Grade, *result.Current)
				}
			}
		})
	}
}

// TestGetMMTByPatientID tests patient MMT retrieval delegation.
func TestGetMMTByPatientID(t *testing.T) {
	mockRepo := new(MockMMTRepository)
	service := NewMMTService(mockRepo)

	expected := []*model.MMTAssessment{
		{ID: "a1", PatientID: "p1", MuscleGroup: "Quadriceps", Grade: 3.0},
		{ID: "a2", PatientID: "p1", MuscleGroup: "Biceps", Grade: 4.5},
	}

	mockRepo.On("GetByPatientID", mock.Anything, "p1").Return(expected, nil)

	result, err := service.GetByPatientID(context.Background(), "p1")
	assert.NoError(t, err)
	assert.Equal(t, 2, len(result))
	assert.Equal(t, "Quadriceps", result[0].MuscleGroup)

	mockRepo.AssertExpectations(t)
}

// TestGetMMTByVisitID tests visit MMT retrieval delegation.
func TestGetMMTByVisitID(t *testing.T) {
	mockRepo := new(MockMMTRepository)
	service := NewMMTService(mockRepo)

	expected := []*model.MMTAssessment{
		{ID: "a1", PatientID: "p1", MuscleGroup: "Hamstrings", Grade: 3.5},
	}

	mockRepo.On("GetByVisitID", mock.Anything, "v1").Return(expected, nil)

	result, err := service.GetByVisitID(context.Background(), "v1")
	assert.NoError(t, err)
	assert.Equal(t, 1, len(result))

	mockRepo.AssertExpectations(t)
}

// TestMMTGradeDescriptions verifies all integer grades have descriptions.
func TestMMTGradeDescriptions(t *testing.T) {
	integerGrades := []float64{0, 1, 2, 3, 4, 5}
	for _, grade := range integerGrades {
		desc, ok := model.MMTGradeDescriptions[grade]
		assert.True(t, ok, "Grade %.0f should have a description", grade)
		assert.NotEmpty(t, desc.Name, "Grade %.0f should have an English name", grade)
		assert.NotEmpty(t, desc.NameVi, "Grade %.0f should have a Vietnamese name", grade)
		assert.NotEmpty(t, desc.Desc, "Grade %.0f should have an English description", grade)
		assert.NotEmpty(t, desc.DescVi, "Grade %.0f should have a Vietnamese description", grade)
	}
}
