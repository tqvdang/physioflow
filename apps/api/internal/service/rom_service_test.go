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

// MockROMRepository is a mock implementation of repository.ROMRepository.
type MockROMRepository struct {
	mock.Mock
}

func (m *MockROMRepository) Create(ctx context.Context, assessment *model.ROMAssessment) error {
	args := m.Called(ctx, assessment)
	return args.Error(0)
}

func (m *MockROMRepository) GetByID(ctx context.Context, id string) (*model.ROMAssessment, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.ROMAssessment), args.Error(1)
}

func (m *MockROMRepository) GetByPatientID(ctx context.Context, patientID string) ([]*model.ROMAssessment, error) {
	args := m.Called(ctx, patientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.ROMAssessment), args.Error(1)
}

func (m *MockROMRepository) GetByVisitID(ctx context.Context, visitID string) ([]*model.ROMAssessment, error) {
	args := m.Called(ctx, visitID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.ROMAssessment), args.Error(1)
}

func (m *MockROMRepository) GetHistory(ctx context.Context, patientID string, joint model.ROMJoint, side model.ROMSide, movementType model.ROMMovementType) ([]*model.ROMAssessment, error) {
	args := m.Called(ctx, patientID, joint, side, movementType)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.ROMAssessment), args.Error(1)
}

// TestRecordROMAssessment tests ROM assessment recording with various inputs.
func TestRecordROMAssessment(t *testing.T) {
	tests := []struct {
		name        string
		req         *model.CreateROMAssessmentRequest
		expectError bool
		errorMsg    string
	}{
		{
			name: "Valid shoulder assessment",
			req: &model.CreateROMAssessmentRequest{
				PatientID:    "patient-123",
				Joint:        "shoulder",
				Side:         "left",
				MovementType: "active",
				Degree:       120.5,
				Notes:        "Limited flexion",
			},
			expectError: false,
		},
		{
			name: "Valid knee assessment with visit ID",
			req: &model.CreateROMAssessmentRequest{
				PatientID:    "patient-123",
				VisitID:      "visit-456",
				Joint:        "knee",
				Side:         "right",
				MovementType: "passive",
				Degree:       135.0,
			},
			expectError: false,
		},
		{
			name: "Valid cervical spine assessment",
			req: &model.CreateROMAssessmentRequest{
				PatientID:    "patient-123",
				Joint:        "cervical_spine",
				Side:         "bilateral",
				MovementType: "active",
				Degree:       60.0,
			},
			expectError: false,
		},
		{
			name: "Degree exceeds 2x normal range for shoulder (normal=180, limit=360)",
			req: &model.CreateROMAssessmentRequest{
				PatientID:    "patient-123",
				Joint:        "shoulder",
				Side:         "left",
				MovementType: "active",
				Degree:       361.0,
			},
			expectError: true,
			errorMsg:    "exceeds maximum expected range",
		},
		{
			name: "Degree exceeds 2x normal range for ankle (normal=50, limit=100)",
			req: &model.CreateROMAssessmentRequest{
				PatientID:    "patient-123",
				Joint:        "ankle",
				Side:         "right",
				MovementType: "passive",
				Degree:       101.0,
			},
			expectError: true,
			errorMsg:    "exceeds maximum expected range",
		},
		{
			name: "Invalid assessed_at format",
			req: &model.CreateROMAssessmentRequest{
				PatientID:    "patient-123",
				Joint:        "knee",
				Side:         "left",
				MovementType: "active",
				Degree:       90.0,
				AssessedAt:   "2024-01-15",
			},
			expectError: true,
			errorMsg:    "invalid assessed_at format",
		},
		{
			name: "Valid assessed_at in RFC3339",
			req: &model.CreateROMAssessmentRequest{
				PatientID:    "patient-123",
				Joint:        "elbow",
				Side:         "right",
				MovementType: "active",
				Degree:       140.0,
				AssessedAt:   "2024-06-15T10:30:00Z",
			},
			expectError: false,
		},
		{
			name: "Zero degree is valid",
			req: &model.CreateROMAssessmentRequest{
				PatientID:    "patient-123",
				Joint:        "wrist",
				Side:         "left",
				MovementType: "passive",
				Degree:       0.0,
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockROMRepository)
			service := NewROMService(mockRepo)

			if !tt.expectError {
				mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*model.ROMAssessment")).Return(nil)
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
				assert.Equal(t, model.ROMJoint(tt.req.Joint), result.Joint)
				assert.Equal(t, model.ROMSide(tt.req.Side), result.Side)
				assert.Equal(t, model.ROMMovementType(tt.req.MovementType), result.MovementType)
				assert.Equal(t, tt.req.Degree, result.Degree)
				assert.Equal(t, "clinic-123", result.ClinicID)
				assert.Equal(t, "therapist-123", result.TherapistID)
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

// TestRecordROMAssessment_VisitID tests that visit ID is properly handled.
func TestRecordROMAssessment_VisitID(t *testing.T) {
	mockRepo := new(MockROMRepository)
	service := NewROMService(mockRepo)
	mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*model.ROMAssessment")).Return(nil)

	// With visit ID
	req := &model.CreateROMAssessmentRequest{
		PatientID:    "patient-123",
		VisitID:      "visit-456",
		Joint:        "knee",
		Side:         "left",
		MovementType: "active",
		Degree:       90.0,
	}

	result, err := service.RecordAssessment(context.Background(), "clinic-123", "therapist-123", req)
	assert.NoError(t, err)
	assert.NotNil(t, result.VisitID)
	assert.Equal(t, "visit-456", *result.VisitID)

	// Without visit ID
	req2 := &model.CreateROMAssessmentRequest{
		PatientID:    "patient-123",
		Joint:        "knee",
		Side:         "left",
		MovementType: "active",
		Degree:       90.0,
	}

	result2, err := service.RecordAssessment(context.Background(), "clinic-123", "therapist-123", req2)
	assert.NoError(t, err)
	assert.Nil(t, result2.VisitID)

	mockRepo.AssertExpectations(t)
}

// TestGetROMTrending tests trending calculation for ROM measurements.
func TestGetROMTrending(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name           string
		assessments    []*model.ROMAssessment
		expectedTrend  model.TrendDirection
		expectedChange float64
		expectError    bool
	}{
		{
			name: "Improved: degree increased over time",
			assessments: []*model.ROMAssessment{
				{ID: "a1", PatientID: "p1", Joint: model.ROMJointKnee, Side: model.ROMSideLeft, MovementType: model.ROMMovementActive, Degree: 90.0, AssessedAt: now.AddDate(0, 0, -14)},
				{ID: "a2", PatientID: "p1", Joint: model.ROMJointKnee, Side: model.ROMSideLeft, MovementType: model.ROMMovementActive, Degree: 110.0, AssessedAt: now.AddDate(0, 0, -7)},
				{ID: "a3", PatientID: "p1", Joint: model.ROMJointKnee, Side: model.ROMSideLeft, MovementType: model.ROMMovementActive, Degree: 125.0, AssessedAt: now},
			},
			expectedTrend:  model.TrendImproved,
			expectedChange: 35.0, // 125 - 90
		},
		{
			name: "Declined: degree decreased over time",
			assessments: []*model.ROMAssessment{
				{ID: "a1", PatientID: "p1", Joint: model.ROMJointShoulder, Side: model.ROMSideRight, MovementType: model.ROMMovementPassive, Degree: 160.0, AssessedAt: now.AddDate(0, 0, -7)},
				{ID: "a2", PatientID: "p1", Joint: model.ROMJointShoulder, Side: model.ROMSideRight, MovementType: model.ROMMovementPassive, Degree: 140.0, AssessedAt: now},
			},
			expectedTrend:  model.TrendDeclined,
			expectedChange: -20.0, // 140 - 160
		},
		{
			name: "Stable: no change in degree",
			assessments: []*model.ROMAssessment{
				{ID: "a1", PatientID: "p1", Joint: model.ROMJointElbow, Side: model.ROMSideLeft, MovementType: model.ROMMovementActive, Degree: 140.0, AssessedAt: now.AddDate(0, 0, -7)},
				{ID: "a2", PatientID: "p1", Joint: model.ROMJointElbow, Side: model.ROMSideLeft, MovementType: model.ROMMovementActive, Degree: 140.0, AssessedAt: now},
			},
			expectedTrend:  model.TrendStable,
			expectedChange: 0.0,
		},
		{
			name: "Insufficient data: single measurement",
			assessments: []*model.ROMAssessment{
				{ID: "a1", PatientID: "p1", Joint: model.ROMJointKnee, Side: model.ROMSideLeft, MovementType: model.ROMMovementActive, Degree: 100.0, AssessedAt: now},
			},
			expectedTrend:  model.TrendInsuffData,
			expectedChange: 0.0,
		},
		{
			name:        "No data: returns error",
			assessments: []*model.ROMAssessment{},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockROMRepository)
			service := NewROMService(mockRepo)

			mockRepo.On("GetHistory", mock.Anything, "p1", model.ROMJointKnee, model.ROMSideLeft, model.ROMMovementActive).
				Return(tt.assessments, nil).Maybe()
			mockRepo.On("GetHistory", mock.Anything, "p1", model.ROMJointShoulder, model.ROMSideRight, model.ROMMovementPassive).
				Return(tt.assessments, nil).Maybe()
			mockRepo.On("GetHistory", mock.Anything, "p1", model.ROMJointElbow, model.ROMSideLeft, model.ROMMovementActive).
				Return(tt.assessments, nil).Maybe()

			var joint model.ROMJoint
			var side model.ROMSide
			var movementType model.ROMMovementType
			if len(tt.assessments) > 0 {
				joint = tt.assessments[0].Joint
				side = tt.assessments[0].Side
				movementType = tt.assessments[0].MovementType
			} else {
				joint = model.ROMJointKnee
				side = model.ROMSideLeft
				movementType = model.ROMMovementActive
			}

			result, err := service.GetTrending(context.Background(), "p1", joint, side, movementType)

			if tt.expectError {
				assert.Error(t, err)
				assert.Equal(t, repository.ErrNotFound, err)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, tt.expectedTrend, result.Trend)
				assert.Equal(t, len(tt.assessments), len(result.DataPoints))

				if tt.expectedTrend != model.TrendInsuffData {
					assert.NotNil(t, result.Change)
					assert.InDelta(t, tt.expectedChange, *result.Change, 0.01)
				}

				if len(tt.assessments) > 0 {
					assert.NotNil(t, result.Baseline)
					assert.NotNil(t, result.Current)
					assert.Equal(t, tt.assessments[0].Degree, *result.Baseline)
					assert.Equal(t, tt.assessments[len(tt.assessments)-1].Degree, *result.Current)
				}
			}
		})
	}
}

// TestGetROMByPatientID tests patient ROM retrieval delegation.
func TestGetROMByPatientID(t *testing.T) {
	mockRepo := new(MockROMRepository)
	service := NewROMService(mockRepo)

	expected := []*model.ROMAssessment{
		{ID: "a1", PatientID: "p1", Degree: 90.0},
		{ID: "a2", PatientID: "p1", Degree: 100.0},
	}

	mockRepo.On("GetByPatientID", mock.Anything, "p1").Return(expected, nil)

	result, err := service.GetByPatientID(context.Background(), "p1")
	assert.NoError(t, err)
	assert.Equal(t, 2, len(result))
	assert.Equal(t, "a1", result[0].ID)

	mockRepo.AssertExpectations(t)
}

// TestGetROMByVisitID tests visit ROM retrieval delegation.
func TestGetROMByVisitID(t *testing.T) {
	mockRepo := new(MockROMRepository)
	service := NewROMService(mockRepo)

	expected := []*model.ROMAssessment{
		{ID: "a1", PatientID: "p1", Degree: 120.0},
	}

	mockRepo.On("GetByVisitID", mock.Anything, "v1").Return(expected, nil)

	result, err := service.GetByVisitID(context.Background(), "v1")
	assert.NoError(t, err)
	assert.Equal(t, 1, len(result))

	mockRepo.AssertExpectations(t)
}
