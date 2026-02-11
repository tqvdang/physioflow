package service

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// MockDischargeRepository is a mock implementation
type MockDischargeRepository struct {
	mock.Mock
}

func (m *MockDischargeRepository) CreatePlan(ctx context.Context, plan *model.DischargePlan) error {
	args := m.Called(ctx, plan)
	return args.Error(0)
}

func (m *MockDischargeRepository) GetPlanByPatientID(ctx context.Context, patientID string) (*model.DischargePlan, error) {
	args := m.Called(ctx, patientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.DischargePlan), args.Error(1)
}

func (m *MockDischargeRepository) CreateSummary(ctx context.Context, summary *model.DischargeSummary) error {
	args := m.Called(ctx, summary)
	return args.Error(0)
}

func (m *MockDischargeRepository) GetSummaryByID(ctx context.Context, id string) (*model.DischargeSummary, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.DischargeSummary), args.Error(1)
}

func (m *MockDischargeRepository) CompleteDischarge(ctx context.Context, patientID string, dischargeDate time.Time) error {
	args := m.Called(ctx, patientID, dischargeDate)
	return args.Error(0)
}

// MockExerciseService is a mock implementation
type MockExerciseService struct {
	mock.Mock
}

func (m *MockExerciseService) GetPatientPrescriptions(ctx context.Context, patientID string, activeOnly bool) ([]interface{}, error) {
	args := m.Called(ctx, patientID, activeOnly)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]interface{}), args.Error(1)
}

// TestCalculateBaselineComparisons tests baseline vs discharge comparison calculation
func TestCalculateBaselineComparisons(t *testing.T) {
	now := time.Now()
	mcid := 2.0

	tests := []struct {
		name                   string
		measures               []*model.OutcomeMeasure
		expectedComparisons    int
		expectedChange         float64
		expectedChangePercent  float64
		expectedMeetsMCID      bool
		expectedInterpretation string
	}{
		{
			name: "Standard improvement: baseline=5, discharge=8",
			measures: []*model.OutcomeMeasure{
				{
					ID:          "m1",
					MeasureType: model.MeasureTypeVAS,
					Score:       5.0,
					MeasuredAt:  now.AddDate(0, -1, 0),
					Library: &model.OutcomeMeasureLibrary{
						ID:             "lib-1",
						Name:           "VAS",
						NameVi:         "Thang đo VAS",
						MinScore:       0,
						MaxScore:       10,
						HigherIsBetter: true,
						MCID:           &mcid,
					},
				},
				{
					ID:          "m2",
					MeasureType: model.MeasureTypeVAS,
					Score:       8.0,
					MeasuredAt:  now,
					Library: &model.OutcomeMeasureLibrary{
						ID:             "lib-1",
						Name:           "VAS",
						NameVi:         "Thang đo VAS",
						MinScore:       0,
						MaxScore:       10,
						HigherIsBetter: true,
						MCID:           &mcid,
					},
				},
			},
			expectedComparisons:    1,
			expectedChange:         3.0,
			expectedChangePercent:  60.0, // (8-5)/5 * 100
			expectedMeetsMCID:      true,
			expectedInterpretation: "Significant improvement",
		},
		{
			name: "Pain scale improvement: baseline=8, discharge=3 (lower is better)",
			measures: []*model.OutcomeMeasure{
				{
					ID:          "m1",
					MeasureType: model.MeasureTypeNRS,
					Score:       8.0,
					MeasuredAt:  now.AddDate(0, -1, 0),
					Library: &model.OutcomeMeasureLibrary{
						ID:             "lib-2",
						Name:           "NRS",
						NameVi:         "Thang đo đau",
						MinScore:       0,
						MaxScore:       10,
						HigherIsBetter: false, // Lower is better
						MCID:           &mcid,
					},
				},
				{
					ID:          "m2",
					MeasureType: model.MeasureTypeNRS,
					Score:       3.0,
					MeasuredAt:  now,
					Library: &model.OutcomeMeasureLibrary{
						ID:             "lib-2",
						Name:           "NRS",
						NameVi:         "Thang đo đau",
						MinScore:       0,
						MaxScore:       10,
						HigherIsBetter: false,
						MCID:           &mcid,
					},
				},
			},
			expectedComparisons:    1,
			expectedChange:         -5.0, // 3 - 8
			expectedChangePercent:  -62.5,
			expectedMeetsMCID:      true, // abs(-5) >= 2
			expectedInterpretation: "Significant improvement",
		},
		{
			name: "No change",
			measures: []*model.OutcomeMeasure{
				{
					ID:          "m1",
					MeasureType: model.MeasureTypeVAS,
					Score:       5.0,
					MeasuredAt:  now.AddDate(0, -1, 0),
					Library: &model.OutcomeMeasureLibrary{
						ID:             "lib-1",
						MinScore:       0,
						MaxScore:       10,
						HigherIsBetter: true,
						MCID:           &mcid,
					},
				},
				{
					ID:          "m2",
					MeasureType: model.MeasureTypeVAS,
					Score:       5.0,
					MeasuredAt:  now,
					Library: &model.OutcomeMeasureLibrary{
						ID:             "lib-1",
						MinScore:       0,
						MaxScore:       10,
						HigherIsBetter: true,
						MCID:           &mcid,
					},
				},
			},
			expectedComparisons:    1,
			expectedChange:         0.0,
			expectedChangePercent:  0.0,
			expectedMeetsMCID:      false,
			expectedInterpretation: "No significant change",
		},
		{
			name: "Decline in function",
			measures: []*model.OutcomeMeasure{
				{
					ID:          "m1",
					MeasureType: model.MeasureTypeVAS,
					Score:       8.0,
					MeasuredAt:  now.AddDate(0, -1, 0),
					Library: &model.OutcomeMeasureLibrary{
						ID:             "lib-1",
						MinScore:       0,
						MaxScore:       10,
						HigherIsBetter: true,
						MCID:           &mcid,
					},
				},
				{
					ID:          "m2",
					MeasureType: model.MeasureTypeVAS,
					Score:       5.0,
					MeasuredAt:  now,
					Library: &model.OutcomeMeasureLibrary{
						ID:             "lib-1",
						MinScore:       0,
						MaxScore:       10,
						HigherIsBetter: true,
						MCID:           &mcid,
					},
				},
			},
			expectedComparisons:    1,
			expectedChange:         -3.0,
			expectedChangePercent:  -37.5,
			expectedMeetsMCID:      false,
			expectedInterpretation: "Moderate decline",
		},
		{
			name: "Single measure: no comparison",
			measures: []*model.OutcomeMeasure{
				{
					ID:          "m1",
					MeasureType: model.MeasureTypeVAS,
					Score:       5.0,
					MeasuredAt:  now,
					Library: &model.OutcomeMeasureLibrary{
						ID:             "lib-1",
						MinScore:       0,
						MaxScore:       10,
						HigherIsBetter: true,
						MCID:           &mcid,
					},
				},
			},
			expectedComparisons: 0, // Need at least 2 measures
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := &dischargeService{}

			comparisons := service.calculateBaselineComparisons(tt.measures)

			assert.Len(t, comparisons, tt.expectedComparisons)

			if tt.expectedComparisons > 0 {
				comp := comparisons[0]
				assert.Equal(t, tt.expectedChange, comp.Change)
				assert.InDelta(t, tt.expectedChangePercent, comp.ChangePercent, 0.1)
				assert.Equal(t, tt.expectedMeetsMCID, comp.MeetsMCID)
				assert.Equal(t, tt.expectedInterpretation, comp.Interpretation)
			}
		})
	}
}

// TestGenerateComparisonInterpretation tests interpretation text generation
func TestGenerateComparisonInterpretation(t *testing.T) {
	service := &dischargeService{}

	tests := []struct {
		name               string
		change             float64
		changePercent      float64
		higherIsBetter     bool
		expectedEn         string
		expectedVi         string
	}{
		{
			name:           "Significant improvement (higher is better)",
			change:         5.0,
			changePercent:  100.0,
			higherIsBetter: true,
			expectedEn:     "Significant improvement",
			expectedVi:     "Cai thien dang ke",
		},
		{
			name:           "Moderate improvement",
			change:         3.0,
			changePercent:  40.0,
			higherIsBetter: true,
			expectedEn:     "Moderate improvement",
			expectedVi:     "Cai thien trung binh",
		},
		{
			name:           "Mild improvement",
			change:         1.0,
			changePercent:  15.0,
			higherIsBetter: true,
			expectedEn:     "Mild improvement",
			expectedVi:     "Cai thien nhe",
		},
		{
			name:           "Significant decline",
			change:         -5.0,
			changePercent:  -60.0,
			higherIsBetter: true,
			expectedEn:     "Significant decline",
			expectedVi:     "Suy giam dang ke",
		},
		{
			name:           "No change",
			change:         0.0,
			changePercent:  0.0,
			higherIsBetter: true,
			expectedEn:     "No significant change",
			expectedVi:     "Khong thay doi dang ke",
		},
		{
			name:           "Pain reduction (lower is better): improvement",
			change:         -5.0,
			changePercent:  -62.5,
			higherIsBetter: false,
			expectedEn:     "Significant improvement",
			expectedVi:     "Cai thien dang ke",
		},
		{
			name:           "Pain increase (lower is better): decline",
			change:         5.0,
			changePercent:  62.5,
			higherIsBetter: false,
			expectedEn:     "Significant decline",
			expectedVi:     "Suy giam dang ke",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			en, vi := service.generateComparisonInterpretation(tt.change, tt.changePercent, tt.higherIsBetter)
			assert.Equal(t, tt.expectedEn, en)
			assert.Equal(t, tt.expectedVi, vi)
		})
	}
}

// TestGenerateFunctionalStatus tests functional status summary generation
func TestGenerateFunctionalStatus(t *testing.T) {
	service := &dischargeService{}

	tests := []struct {
		name           string
		comparisons    []model.BaselineComparison
		expectedEnContains string
		expectedViContains string
	}{
		{
			name:           "No data",
			comparisons:    []model.BaselineComparison{},
			expectedEnContains: "Insufficient data",
			expectedViContains: "Khong du du lieu",
		},
		{
			name: "All improved with MCID",
			comparisons: []model.BaselineComparison{
				{MeasureName: "VAS", Change: 3.0, MeetsMCID: true, Interpretation: "Significant improvement"},
				{MeasureName: "ROM", Change: 20.0, MeetsMCID: true, Interpretation: "Moderate improvement"},
			},
			expectedEnContains: "improvement across all 2 measured outcomes",
			expectedViContains: "cai thien tren tat ca 2",
		},
		{
			name: "Partial improvement",
			comparisons: []model.BaselineComparison{
				{MeasureName: "VAS", Change: 3.0, MeetsMCID: true, Interpretation: "Significant improvement"},
				{MeasureName: "ROM", Change: -5.0, MeetsMCID: false, Interpretation: "Mild decline"},
			},
			expectedEnContains: "improvement in 1 of 2",
			expectedViContains: "cai thien trong 1 tren 2",
		},
		{
			name: "No improvement",
			comparisons: []model.BaselineComparison{
				{MeasureName: "VAS", Change: -1.0, MeetsMCID: false, Interpretation: "Mild decline"},
				{MeasureName: "ROM", Change: 0.0, MeetsMCID: false, Interpretation: "No significant change"},
			},
			expectedEnContains: "did not show measurable improvement",
			expectedViContains: "khong cho thay su cai thien",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			en, vi := service.generateFunctionalStatus(tt.comparisons)
			assert.Contains(t, en, tt.expectedEnContains)
			assert.Contains(t, vi, tt.expectedViContains)
		})
	}
}

// TestGeneratePrognosis tests prognosis generation based on discharge reason
func TestGeneratePrognosis(t *testing.T) {
	service := &dischargeService{}

	tests := []struct {
		reason      model.DischargeReason
		expectedEn  string
		expectedVi  string
	}{
		{
			reason:     model.DischargeReasonGoalsMet,
			expectedEn: "Good prognosis",
			expectedVi: "Tien luong tot",
		},
		{
			reason:     model.DischargeReasonPlateau,
			expectedEn: "Fair prognosis",
			expectedVi: "Tien luong kha",
		},
		{
			reason:     model.DischargeReasonPatientChoice,
			expectedEn: "Prognosis dependent on continued self-management",
			expectedVi: "Tien luong phu thuoc vao viec tu quan ly",
		},
		{
			reason:     model.DischargeReasonReferral,
			expectedEn: "Prognosis dependent on continued care",
			expectedVi: "Tien luong phu thuoc vao viec tiep tuc dieu tri",
		},
		{
			reason:     model.DischargeReasonNonCompliance,
			expectedEn: "Guarded prognosis due to non-compliance",
			expectedVi: "Tien luong than trong do khong tuan thu",
		},
	}

	for _, tt := range tests {
		t.Run(string(tt.reason), func(t *testing.T) {
			en, vi := service.generatePrognosis(tt.reason, []model.BaselineComparison{})
			assert.Contains(t, en, tt.expectedEn)
			assert.Contains(t, vi, tt.expectedVi)
		})
	}
}

// TestGenerateDischargeSummary tests discharge summary generation with calculations
func TestGenerateDischargeSummary(t *testing.T) {
	now := time.Now()
	mcid := 2.0

	plan := &model.DischargePlan{
		ID:        "plan-1",
		PatientID: "patient-123",
		Reason:    model.DischargeReasonGoalsMet,
		CreatedAt: now.AddDate(0, -2, 0),
	}

	measures := []*model.OutcomeMeasure{
		{
			ID:          "m1",
			MeasureType: model.MeasureTypeVAS,
			Score:       5.0,
			MeasuredAt:  now.AddDate(0, -2, 0),
			Library: &model.OutcomeMeasureLibrary{
				ID:             "lib-1",
				Name:           "VAS",
				NameVi:         "Thang đo VAS",
				MinScore:       0,
				MaxScore:       10,
				HigherIsBetter: true,
				MCID:           &mcid,
			},
		},
		{
			ID:          "m2",
			MeasureType: model.MeasureTypeVAS,
			Score:       8.0,
			MeasuredAt:  now,
			Library: &model.OutcomeMeasureLibrary{
				ID:             "lib-1",
				Name:           "VAS",
				NameVi:         "Thang đo VAS",
				MinScore:       0,
				MaxScore:       10,
				HigherIsBetter: true,
				MCID:           &mcid,
			},
		},
	}

	mockDischarge := new(MockDischargeRepository)
	mockOutcome := new(MockOutcomeMeasuresRepository)
	mockExercise := new(MockExerciseService)

	outcomeService := NewOutcomeMeasuresService(mockOutcome)
	service := NewDischargeService(mockDischarge, outcomeService, mockExercise)

	mockDischarge.On("GetPlanByPatientID", mock.Anything, "patient-123").Return(plan, nil)
	mockOutcome.On("GetByPatientID", mock.Anything, "patient-123").Return(measures, nil)
	mockDischarge.On("CreateSummary", mock.Anything, mock.AnythingOfType("*model.DischargeSummary")).
		Run(func(args mock.Arguments) {
			summary := args.Get(1).(*model.DischargeSummary)
			assert.Equal(t, "patient-123", summary.PatientID)
			assert.Equal(t, 2, summary.TotalSessions)
			assert.NotEmpty(t, summary.BaselineComparison)
			assert.NotEmpty(t, summary.FunctionalStatus)
			assert.NotEmpty(t, summary.Prognosis)
			assert.Contains(t, summary.FunctionalStatus, "improvement")
			assert.Contains(t, summary.Prognosis, "Good prognosis")
		}).
		Return(nil)

	result, err := service.GenerateDischargeSummary(context.Background(), "clinic-123", "therapist-123", "patient-123")

	assert.NoError(t, err)
	assert.NotNil(t, result)
	mockDischarge.AssertExpectations(t)
	mockOutcome.AssertExpectations(t)
}

// TestCreateDischargePlan tests discharge plan creation
func TestCreateDischargePlan(t *testing.T) {
	request := &model.CreateDischargePlanRequest{
		PatientID:     "patient-123",
		Reason:        "goals_met",
		ReasonDetails: "All treatment goals achieved",
		PlannedDate:   time.Now().AddDate(0, 0, 7).Format("2006-01-02"),
		GoalOutcomes: []model.GoalOutcome{
			{
				GoalID:      "goal-1",
				Description: "Increase ROM",
				Status:      "achieved",
			},
		},
	}

	mockDischarge := new(MockDischargeRepository)
	mockOutcome := new(MockOutcomeMeasuresRepository)
	mockExercise := new(MockExerciseService)

	outcomeService := NewOutcomeMeasuresService(mockOutcome)
	service := NewDischargeService(mockDischarge, outcomeService, mockExercise)

	mockExercise.On("GetPatientPrescriptions", mock.Anything, "patient-123", true).Return([]interface{}{}, nil)
	mockDischarge.On("CreatePlan", mock.Anything, mock.AnythingOfType("*model.DischargePlan")).
		Run(func(args mock.Arguments) {
			plan := args.Get(1).(*model.DischargePlan)
			assert.Equal(t, "patient-123", plan.PatientID)
			assert.Equal(t, model.DischargeReasonGoalsMet, plan.Reason)
			assert.Equal(t, model.DischargeStatusPlanning, plan.Status)
		}).
		Return(nil)

	result, err := service.CreateDischargePlan(context.Background(), "clinic-123", "therapist-123", request)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	mockDischarge.AssertExpectations(t)
	mockExercise.AssertExpectations(t)
}
