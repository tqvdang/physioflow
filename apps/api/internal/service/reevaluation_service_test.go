package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
)

// MockReevaluationRepository is a mock implementation of repository.ReevaluationRepository.
type MockReevaluationRepository struct {
	mock.Mock
}

func (m *MockReevaluationRepository) Create(ctx context.Context, assessment *model.ReevaluationAssessment) error {
	args := m.Called(ctx, assessment)
	return args.Error(0)
}

func (m *MockReevaluationRepository) CreateBatch(ctx context.Context, assessments []*model.ReevaluationAssessment) error {
	args := m.Called(ctx, assessments)
	return args.Error(0)
}

func (m *MockReevaluationRepository) GetByID(ctx context.Context, id string) (*model.ReevaluationAssessment, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.ReevaluationAssessment), args.Error(1)
}

func (m *MockReevaluationRepository) GetByPatientID(ctx context.Context, patientID string) ([]*model.ReevaluationAssessment, error) {
	args := m.Called(ctx, patientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.ReevaluationAssessment), args.Error(1)
}

func (m *MockReevaluationRepository) GetByBaselineID(ctx context.Context, baselineAssessmentID string) ([]*model.ReevaluationAssessment, error) {
	args := m.Called(ctx, baselineAssessmentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.ReevaluationAssessment), args.Error(1)
}

func (m *MockReevaluationRepository) GetComparisonData(ctx context.Context, id string) ([]*model.ReevaluationAssessment, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.ReevaluationAssessment), args.Error(1)
}

// TestPerformReevaluation_ROMImprovement tests re-evaluation with improved ROM values.
func TestPerformReevaluation_ROMImprovement(t *testing.T) {
	mockRepo := new(MockReevaluationRepository)
	svc := NewReevaluationService(mockRepo)

	mcid := 10.0

	req := &model.CreateReevaluationRequest{
		PatientID: "patient-123",
		Assessments: []model.CreateReevaluationItemRequest{
			{
				AssessmentType: model.AssessmentTypeROM,
				MeasureLabel:   "Shoulder Flexion Left Active",
				CurrentValue:   150.0,
				BaselineValue:  90.0,
				HigherIsBetter: true,
				MCIDThreshold:  &mcid,
			},
		},
	}

	mockRepo.On("CreateBatch", mock.Anything, mock.AnythingOfType("[]*model.ReevaluationAssessment")).Return(nil)

	summary, err := svc.PerformReevaluation(context.Background(), "clinic-123", "therapist-123", req)
	assert.NoError(t, err)
	assert.NotNil(t, summary)
	assert.Equal(t, 1, summary.TotalItems)
	assert.Equal(t, 1, summary.Improved)
	assert.Equal(t, 0, summary.Declined)
	assert.Equal(t, 0, summary.Stable)
	assert.Equal(t, 1, summary.MCIDAchieved)

	// Verify the comparison details
	assert.Equal(t, 1, len(summary.Comparisons))
	comp := summary.Comparisons[0]
	assert.Equal(t, model.InterpretationImproved, comp.Interpretation)
	assert.InDelta(t, 60.0, comp.Change, 0.01)
	assert.True(t, comp.MCIDAchieved)
	assert.Equal(t, "Shoulder Flexion Left Active", comp.MeasureLabel)

	mockRepo.AssertExpectations(t)
}

// TestPerformReevaluation_PainDecline tests re-evaluation where pain scale went up (declined).
func TestPerformReevaluation_PainDecline(t *testing.T) {
	mockRepo := new(MockReevaluationRepository)
	svc := NewReevaluationService(mockRepo)

	mcid := 2.0

	req := &model.CreateReevaluationRequest{
		PatientID: "patient-123",
		Assessments: []model.CreateReevaluationItemRequest{
			{
				AssessmentType: model.AssessmentTypeOutcomeMeasure,
				MeasureLabel:   "VAS Pain Scale",
				CurrentValue:   7.0,
				BaselineValue:  5.0,
				HigherIsBetter: false, // Lower pain is better
				MCIDThreshold:  &mcid,
			},
		},
	}

	mockRepo.On("CreateBatch", mock.Anything, mock.AnythingOfType("[]*model.ReevaluationAssessment")).Return(nil)

	summary, err := svc.PerformReevaluation(context.Background(), "clinic-123", "therapist-123", req)
	assert.NoError(t, err)
	assert.Equal(t, 1, summary.Declined)
	assert.Equal(t, 0, summary.Improved)
	assert.True(t, summary.Comparisons[0].MCIDAchieved) // Absolute change (2) >= MCID (2)
	assert.Equal(t, model.InterpretationDeclined, summary.Comparisons[0].Interpretation)

	mockRepo.AssertExpectations(t)
}

// TestPerformReevaluation_PainImprovement tests re-evaluation where pain decreased (improved).
func TestPerformReevaluation_PainImprovement(t *testing.T) {
	mockRepo := new(MockReevaluationRepository)
	svc := NewReevaluationService(mockRepo)

	mcid := 2.0

	req := &model.CreateReevaluationRequest{
		PatientID: "patient-123",
		Assessments: []model.CreateReevaluationItemRequest{
			{
				AssessmentType: model.AssessmentTypeOutcomeMeasure,
				MeasureLabel:   "VAS Pain Scale",
				CurrentValue:   3.0,
				BaselineValue:  8.0,
				HigherIsBetter: false,
				MCIDThreshold:  &mcid,
			},
		},
	}

	mockRepo.On("CreateBatch", mock.Anything, mock.AnythingOfType("[]*model.ReevaluationAssessment")).Return(nil)

	summary, err := svc.PerformReevaluation(context.Background(), "clinic-123", "therapist-123", req)
	assert.NoError(t, err)
	assert.Equal(t, 1, summary.Improved)
	assert.True(t, summary.Comparisons[0].MCIDAchieved)
	assert.Equal(t, model.InterpretationImproved, summary.Comparisons[0].Interpretation)

	mockRepo.AssertExpectations(t)
}

// TestPerformReevaluation_Stable tests re-evaluation with change below MCID threshold.
func TestPerformReevaluation_Stable(t *testing.T) {
	mockRepo := new(MockReevaluationRepository)
	svc := NewReevaluationService(mockRepo)

	mcid := 10.0

	req := &model.CreateReevaluationRequest{
		PatientID: "patient-123",
		Assessments: []model.CreateReevaluationItemRequest{
			{
				AssessmentType: model.AssessmentTypeMMT,
				MeasureLabel:   "Quadriceps Left",
				CurrentValue:   3.5,
				BaselineValue:  3.0,
				HigherIsBetter: true,
				MCIDThreshold:  &mcid,
			},
		},
	}

	mockRepo.On("CreateBatch", mock.Anything, mock.AnythingOfType("[]*model.ReevaluationAssessment")).Return(nil)

	summary, err := svc.PerformReevaluation(context.Background(), "clinic-123", "therapist-123", req)
	assert.NoError(t, err)
	assert.Equal(t, 1, summary.Stable)
	assert.Equal(t, 0, summary.Improved)
	assert.Equal(t, 0, summary.Declined)
	assert.False(t, summary.Comparisons[0].MCIDAchieved)
	assert.Equal(t, model.InterpretationStable, summary.Comparisons[0].Interpretation)

	mockRepo.AssertExpectations(t)
}

// TestPerformReevaluation_MultipleMeasures tests batch re-evaluation with mixed results.
func TestPerformReevaluation_MultipleMeasures(t *testing.T) {
	mockRepo := new(MockReevaluationRepository)
	svc := NewReevaluationService(mockRepo)

	mcidROM := 10.0
	mcidPain := 2.0

	req := &model.CreateReevaluationRequest{
		PatientID: "patient-123",
		Assessments: []model.CreateReevaluationItemRequest{
			{
				AssessmentType: model.AssessmentTypeROM,
				MeasureLabel:   "Knee Flexion Right Active",
				CurrentValue:   130.0,
				BaselineValue:  90.0,
				HigherIsBetter: true,
				MCIDThreshold:  &mcidROM,
			},
			{
				AssessmentType: model.AssessmentTypeOutcomeMeasure,
				MeasureLabel:   "VAS Pain Scale",
				CurrentValue:   7.0,
				BaselineValue:  4.0,
				HigherIsBetter: false,
				MCIDThreshold:  &mcidPain,
			},
			{
				AssessmentType: model.AssessmentTypeMMT,
				MeasureLabel:   "Hip Flexors Left",
				CurrentValue:   4.0,
				BaselineValue:  4.0,
				HigherIsBetter: true,
				MCIDThreshold:  nil, // no MCID
			},
		},
		Notes: "Follow-up evaluation after 4 weeks",
	}

	mockRepo.On("CreateBatch", mock.Anything, mock.AnythingOfType("[]*model.ReevaluationAssessment")).Return(nil)

	summary, err := svc.PerformReevaluation(context.Background(), "clinic-123", "therapist-123", req)
	assert.NoError(t, err)
	assert.Equal(t, 3, summary.TotalItems)
	assert.Equal(t, 1, summary.Improved)  // ROM improved
	assert.Equal(t, 1, summary.Declined)  // Pain declined
	assert.Equal(t, 1, summary.Stable)    // MMT stable (no change)
	assert.Equal(t, 2, summary.MCIDAchieved) // ROM and Pain both exceeded MCID

	mockRepo.AssertExpectations(t)
}

// TestPerformReevaluation_EmptyAssessments tests that empty assessments are rejected.
func TestPerformReevaluation_EmptyAssessments(t *testing.T) {
	mockRepo := new(MockReevaluationRepository)
	svc := NewReevaluationService(mockRepo)

	req := &model.CreateReevaluationRequest{
		PatientID:   "patient-123",
		Assessments: []model.CreateReevaluationItemRequest{},
	}

	summary, err := svc.PerformReevaluation(context.Background(), "clinic-123", "therapist-123", req)
	assert.Error(t, err)
	assert.Nil(t, summary)
	assert.Contains(t, err.Error(), "at least one assessment item is required")
}

// TestGetReevaluationHistory tests history retrieval delegation.
func TestGetReevaluationHistory(t *testing.T) {
	mockRepo := new(MockReevaluationRepository)
	svc := NewReevaluationService(mockRepo)

	expected := []*model.ReevaluationAssessment{
		{ID: "r1", PatientID: "p1", MeasureLabel: "Shoulder Flexion", Interpretation: model.InterpretationImproved},
		{ID: "r2", PatientID: "p1", MeasureLabel: "VAS Pain", Interpretation: model.InterpretationDeclined},
	}

	mockRepo.On("GetByPatientID", mock.Anything, "p1").Return(expected, nil)

	result, err := svc.GetReevaluationHistory(context.Background(), "p1")
	assert.NoError(t, err)
	assert.Equal(t, 2, len(result))
	assert.Equal(t, "r1", result[0].ID)

	mockRepo.AssertExpectations(t)
}

// TestGetComparison tests comparison data retrieval delegation.
func TestGetComparison(t *testing.T) {
	mockRepo := new(MockReevaluationRepository)
	svc := NewReevaluationService(mockRepo)

	expected := []*model.ReevaluationAssessment{
		{ID: "r1", MeasureLabel: "Knee Flexion", Interpretation: model.InterpretationImproved},
	}

	mockRepo.On("GetComparisonData", mock.Anything, "r1").Return(expected, nil)

	result, err := svc.GetComparison(context.Background(), "r1")
	assert.NoError(t, err)
	assert.Equal(t, 1, len(result))

	mockRepo.AssertExpectations(t)
}

// TestGetComparison_NotFound tests comparison retrieval when record does not exist.
func TestGetComparison_NotFound(t *testing.T) {
	mockRepo := new(MockReevaluationRepository)
	svc := NewReevaluationService(mockRepo)

	mockRepo.On("GetComparisonData", mock.Anything, "nonexistent").
		Return(nil, repository.ErrNotFound)

	result, err := svc.GetComparison(context.Background(), "nonexistent")
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Equal(t, repository.ErrNotFound, err)

	mockRepo.AssertExpectations(t)
}

// TestPerformReevaluation_WithTimestamp tests re-evaluation with explicit assessed_at.
func TestPerformReevaluation_WithTimestamp(t *testing.T) {
	mockRepo := new(MockReevaluationRepository)
	svc := NewReevaluationService(mockRepo)

	req := &model.CreateReevaluationRequest{
		PatientID: "patient-123",
		Assessments: []model.CreateReevaluationItemRequest{
			{
				AssessmentType: model.AssessmentTypeROM,
				MeasureLabel:   "Elbow Flexion Right Active",
				CurrentValue:   140.0,
				BaselineValue:  100.0,
				HigherIsBetter: true,
			},
		},
		AssessedAt: "2026-02-11T10:30:00Z",
	}

	mockRepo.On("CreateBatch", mock.Anything, mock.AnythingOfType("[]*model.ReevaluationAssessment")).Return(nil)

	summary, err := svc.PerformReevaluation(context.Background(), "clinic-123", "therapist-123", req)
	assert.NoError(t, err)
	assert.Equal(t, "2026-02-11T10:30:00Z", summary.AssessedAt.Format("2006-01-02T15:04:05Z"))

	mockRepo.AssertExpectations(t)
}

// TestPerformReevaluation_InvalidTimestamp tests re-evaluation with bad assessed_at format.
func TestPerformReevaluation_InvalidTimestamp(t *testing.T) {
	mockRepo := new(MockReevaluationRepository)
	svc := NewReevaluationService(mockRepo)

	req := &model.CreateReevaluationRequest{
		PatientID: "patient-123",
		Assessments: []model.CreateReevaluationItemRequest{
			{
				AssessmentType: model.AssessmentTypeROM,
				MeasureLabel:   "Knee",
				CurrentValue:   100.0,
				BaselineValue:  80.0,
				HigherIsBetter: true,
			},
		},
		AssessedAt: "2026-02-11",
	}

	summary, err := svc.PerformReevaluation(context.Background(), "clinic-123", "therapist-123", req)
	assert.Error(t, err)
	assert.Nil(t, summary)
	assert.Contains(t, err.Error(), "invalid assessed_at format")
}
