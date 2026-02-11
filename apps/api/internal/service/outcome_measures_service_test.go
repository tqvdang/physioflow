package service

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// MockOutcomeMeasuresRepository is a mock implementation
type MockOutcomeMeasuresRepository struct {
	mock.Mock
}

func (m *MockOutcomeMeasuresRepository) Create(ctx context.Context, measure *model.OutcomeMeasure) error {
	args := m.Called(ctx, measure)
	return args.Error(0)
}

func (m *MockOutcomeMeasuresRepository) GetByPatientID(ctx context.Context, patientID string) ([]*model.OutcomeMeasure, error) {
	args := m.Called(ctx, patientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.OutcomeMeasure), args.Error(1)
}

func (m *MockOutcomeMeasuresRepository) GetByPatientAndType(ctx context.Context, patientID string, measureType model.MeasureType) ([]*model.OutcomeMeasure, error) {
	args := m.Called(ctx, patientID, measureType)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.OutcomeMeasure), args.Error(1)
}

func (m *MockOutcomeMeasuresRepository) GetTrending(ctx context.Context, patientID string, measureType model.MeasureType) (*model.TrendingData, error) {
	args := m.Called(ctx, patientID, measureType)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.TrendingData), args.Error(1)
}

func (m *MockOutcomeMeasuresRepository) GetLibrary(ctx context.Context) ([]*model.OutcomeMeasureLibrary, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.OutcomeMeasureLibrary), args.Error(1)
}

func (m *MockOutcomeMeasuresRepository) GetLibraryByID(ctx context.Context, id string) (*model.OutcomeMeasureLibrary, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.OutcomeMeasureLibrary), args.Error(1)
}

func (m *MockOutcomeMeasuresRepository) GetByID(ctx context.Context, id string) (*model.OutcomeMeasure, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.OutcomeMeasure), args.Error(1)
}

func (m *MockOutcomeMeasuresRepository) Update(ctx context.Context, measure *model.OutcomeMeasure) error {
	args := m.Called(ctx, measure)
	return args.Error(0)
}

func (m *MockOutcomeMeasuresRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockOutcomeMeasuresRepository) GetLibraryByType(ctx context.Context, measureType model.MeasureType) (*model.OutcomeMeasureLibrary, error) {
	args := m.Called(ctx, measureType)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.OutcomeMeasureLibrary), args.Error(1)
}

// TestCalculateProgress tests progress calculation formula
func TestCalculateProgress(t *testing.T) {
	now := time.Now()
	mcid := 2.0

	tests := []struct {
		name                  string
		measures              []*model.OutcomeMeasure
		expectedProgress      float64
		expectedChange        float64
		expectedMeetsMCID     bool
		expectedTrend         model.TrendDirection
	}{
		{
			name: "Standard progress: baseline=5, current=7, target=10 → 40%",
			measures: []*model.OutcomeMeasure{
				{
					ID:         "m1",
					PatientID:  "patient-123",
					Score:      5.0,
					MeasuredAt: now.AddDate(0, 0, -7),
					Library: &model.OutcomeMeasureLibrary{
						ID:             "lib-1",
						MinScore:       0,
						MaxScore:       10,
						HigherIsBetter: true,
						MCID:           &mcid,
					},
				},
				{
					ID:         "m2",
					PatientID:  "patient-123",
					Score:      7.0,
					MeasuredAt: now,
					Library: &model.OutcomeMeasureLibrary{
						ID:             "lib-1",
						MinScore:       0,
						MaxScore:       10,
						HigherIsBetter: true,
						MCID:           &mcid,
					},
				},
			},
			expectedProgress:  40.0, // (7-5)/(10-5) * 100 = 40%
			expectedChange:    2.0,
			expectedMeetsMCID: true, // change (2.0) >= mcid (2.0)
			expectedTrend:     model.TrendImproved,
		},
		{
			name: "Division by zero: target == baseline → 0%",
			measures: []*model.OutcomeMeasure{
				{
					ID:         "m1",
					PatientID:  "patient-123",
					Score:      5.0,
					MeasuredAt: now.AddDate(0, 0, -7),
					Library: &model.OutcomeMeasureLibrary{
						ID:             "lib-1",
						MinScore:       0,
						MaxScore:       5, // target = baseline
						HigherIsBetter: true,
						MCID:           &mcid,
					},
				},
				{
					ID:         "m2",
					PatientID:  "patient-123",
					Score:      5.0,
					MeasuredAt: now,
					Library: &model.OutcomeMeasureLibrary{
						ID:             "lib-1",
						MinScore:       0,
						MaxScore:       5,
						HigherIsBetter: true,
						MCID:           &mcid,
					},
				},
			},
			expectedProgress:  0.0,
			expectedChange:    0.0,
			expectedMeetsMCID: false,
			expectedTrend:     model.TrendStable,
		},
		{
			name: "Negative progress: current < baseline",
			measures: []*model.OutcomeMeasure{
				{
					ID:         "m1",
					PatientID:  "patient-123",
					Score:      7.0,
					MeasuredAt: now.AddDate(0, 0, -7),
					Library: &model.OutcomeMeasureLibrary{
						ID:             "lib-1",
						MinScore:       0,
						MaxScore:       10,
						HigherIsBetter: true,
						MCID:           &mcid,
					},
				},
				{
					ID:         "m2",
					PatientID:  "patient-123",
					Score:      5.0,
					MeasuredAt: now,
					Library: &model.OutcomeMeasureLibrary{
						ID:             "lib-1",
						MinScore:       0,
						MaxScore:       10,
						HigherIsBetter: true,
						MCID:           &mcid,
					},
				},
			},
			expectedProgress:  -66.67, // (5-7)/(10-7) * 100 = -66.67%
			expectedChange:    -2.0,
			expectedMeetsMCID: false,
			expectedTrend:     model.TrendDeclined,
		},
		{
			name: "Over 100% progress: current > target",
			measures: []*model.OutcomeMeasure{
				{
					ID:         "m1",
					PatientID:  "patient-123",
					Score:      5.0,
					MeasuredAt: now.AddDate(0, 0, -7),
					Library: &model.OutcomeMeasureLibrary{
						ID:             "lib-1",
						MinScore:       0,
						MaxScore:       10,
						HigherIsBetter: true,
						MCID:           &mcid,
					},
				},
				{
					ID:         "m2",
					PatientID:  "patient-123",
					Score:      12.0,
					MeasuredAt: now,
					Library: &model.OutcomeMeasureLibrary{
						ID:             "lib-1",
						MinScore:       0,
						MaxScore:       10,
						HigherIsBetter: true,
						MCID:           &mcid,
					},
				},
			},
			expectedProgress:  140.0, // (12-5)/(10-5) * 100 = 140%
			expectedChange:    7.0,
			expectedMeetsMCID: true,
			expectedTrend:     model.TrendImproved,
		},
		{
			name: "Lower is better (pain scale): improvement when score decreases",
			measures: []*model.OutcomeMeasure{
				{
					ID:         "m1",
					PatientID:  "patient-123",
					Score:      8.0, // high pain
					MeasuredAt: now.AddDate(0, 0, -7),
					Library: &model.OutcomeMeasureLibrary{
						ID:             "lib-1",
						MinScore:       0,
						MaxScore:       10,
						HigherIsBetter: false, // lower score is better
						MCID:           &mcid,
					},
				},
				{
					ID:         "m2",
					PatientID:  "patient-123",
					Score:      4.0, // reduced pain
					MeasuredAt: now,
					Library: &model.OutcomeMeasureLibrary{
						ID:             "lib-1",
						MinScore:       0,
						MaxScore:       10,
						HigherIsBetter: false,
						MCID:           &mcid,
					},
				},
			},
			expectedProgress:  50.0, // (4-8)/(0-8) * 100 = 50%
			expectedChange:    -4.0,
			expectedMeetsMCID: true, // abs(-4.0) >= 2.0
			expectedTrend:     model.TrendImproved,
		},
		{
			name: "Change < MCID threshold",
			measures: []*model.OutcomeMeasure{
				{
					ID:         "m1",
					PatientID:  "patient-123",
					Score:      5.0,
					MeasuredAt: now.AddDate(0, 0, -7),
					Library: &model.OutcomeMeasureLibrary{
						ID:             "lib-1",
						MinScore:       0,
						MaxScore:       10,
						HigherIsBetter: true,
						MCID:           &mcid,
					},
				},
				{
					ID:         "m2",
					PatientID:  "patient-123",
					Score:      6.0, // change of 1.0 < MCID of 2.0
					MeasuredAt: now,
					Library: &model.OutcomeMeasureLibrary{
						ID:             "lib-1",
						MinScore:       0,
						MaxScore:       10,
						HigherIsBetter: true,
						MCID:           &mcid,
					},
				},
			},
			expectedProgress:  20.0, // (6-5)/(10-5) * 100 = 20%
			expectedChange:    1.0,
			expectedMeetsMCID: false,
			expectedTrend:     model.TrendImproved,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockOutcomeMeasuresRepository)
			service := NewOutcomeMeasuresService(mockRepo)

			mockRepo.On("GetByPatientAndType", mock.Anything, "patient-123", model.MeasureTypeVAS).
				Return(tt.measures, nil)

			result, err := service.CalculateProgress(context.Background(), "patient-123", model.MeasureTypeVAS)

			assert.NoError(t, err)
			assert.NotNil(t, result)

			if tt.expectedProgress != 0 {
				assert.InDelta(t, tt.expectedProgress, *result.ChangePercent, 0.01, "Progress percentage mismatch")
			}

			assert.Equal(t, tt.expectedChange, *result.Change, "Change value mismatch")

			if result.MeetsMinChange != nil {
				assert.Equal(t, tt.expectedMeetsMCID, *result.MeetsMinChange, "MCID detection mismatch")
			}

			assert.Equal(t, tt.expectedTrend, result.Trend, "Trend direction mismatch")

			mockRepo.AssertExpectations(t)
		})
	}
}

// TestCalculateScore tests scoring calculation methods
func TestCalculateScore(t *testing.T) {
	service := &outcomeMeasuresService{}

	tests := []struct {
		name           string
		responses      []model.MeasureResponse
		library        *model.OutcomeMeasureLibrary
		expectedScore  float64
	}{
		{
			name: "Sum method",
			responses: []model.MeasureResponse{
				{QuestionID: "q1", Value: 3.0},
				{QuestionID: "q2", Value: 4.0},
				{QuestionID: "q3", Value: 5.0},
			},
			library: &model.OutcomeMeasureLibrary{
				ScoringMethod: &model.ScoringMethod{
					Method: "sum",
				},
			},
			expectedScore: 12.0,
		},
		{
			name: "Average method",
			responses: []model.MeasureResponse{
				{QuestionID: "q1", Value: 3.0},
				{QuestionID: "q2", Value: 4.0},
				{QuestionID: "q3", Value: 5.0},
			},
			library: &model.OutcomeMeasureLibrary{
				ScoringMethod: &model.ScoringMethod{
					Method: "average",
				},
			},
			expectedScore: 4.0,
		},
		{
			name: "Default to sum when method is nil",
			responses: []model.MeasureResponse{
				{QuestionID: "q1", Value: 2.0},
				{QuestionID: "q2", Value: 3.0},
			},
			library: &model.OutcomeMeasureLibrary{
				ScoringMethod: nil,
			},
			expectedScore: 5.0,
		},
		{
			name:      "Empty responses",
			responses: []model.MeasureResponse{},
			library: &model.OutcomeMeasureLibrary{
				ScoringMethod: &model.ScoringMethod{Method: "sum"},
			},
			expectedScore: 0.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := service.calculateScore(tt.responses, tt.library)
			assert.Equal(t, tt.expectedScore, score)
		})
	}
}

// TestInterpretScore tests clinical interpretation generation
func TestInterpretScore(t *testing.T) {
	service := &outcomeMeasuresService{}

	tests := []struct {
		name               string
		score              float64
		library            *model.OutcomeMeasureLibrary
		expectedSeverity   string
		expectedSeverityVi string
	}{
		{
			name:  "High score on higher-is-better scale: minimal impairment",
			score: 9.0,
			library: &model.OutcomeMeasureLibrary{
				MinScore:       0,
				MaxScore:       10,
				HigherIsBetter: true,
			},
			expectedSeverity:   "minimal",
			expectedSeverityVi: "Toi thieu",
		},
		{
			name:  "Mid-high score: mild impairment",
			score: 6.5,
			library: &model.OutcomeMeasureLibrary{
				MinScore:       0,
				MaxScore:       10,
				HigherIsBetter: true,
			},
			expectedSeverity:   "mild",
			expectedSeverityVi: "Nhe",
		},
		{
			name:  "Mid-low score: moderate impairment",
			score: 4.0,
			library: &model.OutcomeMeasureLibrary{
				MinScore:       0,
				MaxScore:       10,
				HigherIsBetter: true,
			},
			expectedSeverity:   "moderate",
			expectedSeverityVi: "Trung binh",
		},
		{
			name:  "Low score: severe impairment",
			score: 1.0,
			library: &model.OutcomeMeasureLibrary{
				MinScore:       0,
				MaxScore:       10,
				HigherIsBetter: true,
			},
			expectedSeverity:   "severe",
			expectedSeverityVi: "Nang",
		},
		{
			name:  "Low score on lower-is-better scale (pain): minimal impairment",
			score: 1.0,
			library: &model.OutcomeMeasureLibrary{
				MinScore:       0,
				MaxScore:       10,
				HigherIsBetter: false, // lower is better
			},
			expectedSeverity:   "minimal",
			expectedSeverityVi: "Toi thieu",
		},
		{
			name:  "High score on lower-is-better scale: severe impairment",
			score: 9.0,
			library: &model.OutcomeMeasureLibrary{
				MinScore:       0,
				MaxScore:       10,
				HigherIsBetter: false,
			},
			expectedSeverity:   "severe",
			expectedSeverityVi: "Nang",
		},
		{
			name:  "Zero range returns nil",
			score: 5.0,
			library: &model.OutcomeMeasureLibrary{
				MinScore:       5,
				MaxScore:       5, // no range
				HigherIsBetter: true,
			},
			expectedSeverity:   "",
			expectedSeverityVi: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.interpretScore(tt.score, tt.library)

			if tt.expectedSeverity == "" {
				assert.Nil(t, result)
			} else {
				assert.NotNil(t, result)
				assert.Equal(t, tt.expectedSeverity, result.Severity)
				assert.Equal(t, tt.expectedSeverityVi, result.SeverityVi)
			}
		})
	}
}

// TestRecordMeasure tests outcome measure recording
func TestRecordMeasure(t *testing.T) {
	library := &model.OutcomeMeasureLibrary{
		ID:             "lib-1",
		MeasureType:    model.MeasureTypeVAS,
		Name:           "Visual Analog Scale",
		MinScore:       0,
		MaxScore:       10,
		HigherIsBetter: false,
		ScoringMethod:  &model.ScoringMethod{Method: "sum"},
	}

	request := &model.CreateOutcomeMeasureRequest{
		PatientID: "patient-123",
		LibraryID: "lib-1",
		Responses: []model.MeasureResponse{
			{QuestionID: "q1", Value: 7.0},
		},
		Notes:      "Patient reports moderate pain",
		MeasuredAt: time.Now().Format(time.RFC3339),
	}

	mockRepo := new(MockOutcomeMeasuresRepository)
	service := NewOutcomeMeasuresService(mockRepo)

	mockRepo.On("GetLibraryByID", mock.Anything, "lib-1").Return(library, nil)
	mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*model.OutcomeMeasure")).Return(nil)

	result, err := service.RecordMeasure(context.Background(), "clinic-123", "therapist-123", request)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 7.0, result.Score)
	assert.Equal(t, model.MeasureTypeVAS, result.MeasureType)
	assert.NotNil(t, result.Percentage)
	assert.Equal(t, 70.0, *result.Percentage) // (7-0)/(10-0) * 100
	assert.NotNil(t, result.Interpretation)

	mockRepo.AssertExpectations(t)
}

// TestOutcomeMeasuresService_UpdateMeasure tests the UpdateMeasure method
func TestOutcomeMeasuresService_UpdateMeasure(t *testing.T) {
	now := time.Now()
	clinicID := "clinic-123"
	therapistID := "therapist-123"
	patientID := "patient-123"
	measureID := "measure-123"
	libraryID := "lib-vas"

	library := &model.OutcomeMeasureLibrary{
		ID:             libraryID,
		MeasureType:    model.MeasureTypeVAS,
		Name:           "Visual Analog Scale",
		MinScore:       0,
		MaxScore:       10,
		HigherIsBetter: false,
		ScoringMethod:  &model.ScoringMethod{Method: "sum"},
	}

	tests := []struct {
		name    string
		req     *model.UpdateOutcomeMeasureRequest
		setup   func(*MockOutcomeMeasuresRepository)
		wantErr bool
		errMsg  string
	}{
		{
			name: "successful update with new responses",
			req: &model.UpdateOutcomeMeasureRequest{
				MeasureID: measureID,
				PatientID: patientID,
				Responses: &[]model.MeasureResponse{
					{QuestionID: "q1", Value: 8.0},
				},
			},
			setup: func(m *MockOutcomeMeasuresRepository) {
				existingMeasure := &model.OutcomeMeasure{
					ID:          measureID,
					PatientID:   patientID,
					ClinicID:    clinicID,
					TherapistID: therapistID,
					LibraryID:   libraryID,
					Score:       5.0,
					Responses:   []model.MeasureResponse{{QuestionID: "q1", Value: 5.0}},
					MeasuredAt:  now,
				}
				m.On("GetByID", mock.Anything, measureID).Return(existingMeasure, nil)
				m.On("GetLibraryByID", mock.Anything, libraryID).Return(library, nil)
				m.On("Update", mock.Anything, mock.AnythingOfType("*model.OutcomeMeasure")).Return(nil)
			},
			wantErr: false,
		},
		{
			name: "update notes only",
			req: &model.UpdateOutcomeMeasureRequest{
				MeasureID: measureID,
				PatientID: patientID,
				Notes:     stringPtr("Updated notes"),
			},
			setup: func(m *MockOutcomeMeasuresRepository) {
				existingMeasure := &model.OutcomeMeasure{
					ID:          measureID,
					PatientID:   patientID,
					ClinicID:    clinicID,
					TherapistID: therapistID,
					LibraryID:   libraryID,
					Score:       5.0,
					Responses:   []model.MeasureResponse{{QuestionID: "q1", Value: 5.0}},
					Notes:       "Original notes",
					MeasuredAt:  now,
				}
				m.On("GetByID", mock.Anything, measureID).Return(existingMeasure, nil)
				m.On("Update", mock.Anything, mock.AnythingOfType("*model.OutcomeMeasure")).Return(nil)
			},
			wantErr: false,
		},
		{
			name: "update measured_at only",
			req: &model.UpdateOutcomeMeasureRequest{
				MeasureID: measureID,
				PatientID: patientID,
				MeasuredAt: stringPtr(now.Add(24 * time.Hour).Format(time.RFC3339)),
			},
			setup: func(m *MockOutcomeMeasuresRepository) {
				existingMeasure := &model.OutcomeMeasure{
					ID:          measureID,
					PatientID:   patientID,
					ClinicID:    clinicID,
					TherapistID: therapistID,
					LibraryID:   libraryID,
					Score:       5.0,
					MeasuredAt:  now,
				}
				m.On("GetByID", mock.Anything, measureID).Return(existingMeasure, nil)
				m.On("Update", mock.Anything, mock.AnythingOfType("*model.OutcomeMeasure")).Return(nil)
			},
			wantErr: false,
		},
		{
			name: "patient mismatch",
			req: &model.UpdateOutcomeMeasureRequest{
				MeasureID: measureID,
				PatientID: "wrong-patient",
			},
			setup: func(m *MockOutcomeMeasuresRepository) {
				existingMeasure := &model.OutcomeMeasure{
					ID:        measureID,
					PatientID: patientID,
					ClinicID:  clinicID,
				}
				m.On("GetByID", mock.Anything, measureID).Return(existingMeasure, nil)
			},
			wantErr: true,
			errMsg:  "does not belong to patient",
		},
		{
			name: "clinic mismatch",
			req: &model.UpdateOutcomeMeasureRequest{
				MeasureID: measureID,
				PatientID: patientID,
			},
			setup: func(m *MockOutcomeMeasuresRepository) {
				existingMeasure := &model.OutcomeMeasure{
					ID:        measureID,
					PatientID: patientID,
					ClinicID:  "different-clinic",
				}
				m.On("GetByID", mock.Anything, measureID).Return(existingMeasure, nil)
			},
			wantErr: true,
			errMsg:  "does not belong to clinic",
		},
		{
			name: "measure not found",
			req: &model.UpdateOutcomeMeasureRequest{
				MeasureID: "non-existent",
				PatientID: patientID,
			},
			setup: func(m *MockOutcomeMeasuresRepository) {
				m.On("GetByID", mock.Anything, "non-existent").Return(nil, fmt.Errorf("not found"))
			},
			wantErr: true,
		},
		{
			name: "invalid measured_at format",
			req: &model.UpdateOutcomeMeasureRequest{
				MeasureID:  measureID,
				PatientID:  patientID,
				MeasuredAt: stringPtr("invalid-date"),
			},
			setup: func(m *MockOutcomeMeasuresRepository) {
				existingMeasure := &model.OutcomeMeasure{
					ID:        measureID,
					PatientID: patientID,
					ClinicID:  clinicID,
				}
				m.On("GetByID", mock.Anything, measureID).Return(existingMeasure, nil)
			},
			wantErr: true,
			errMsg:  "invalid measured_at format",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockOutcomeMeasuresRepository)
			service := NewOutcomeMeasuresService(mockRepo)

			if tt.setup != nil {
				tt.setup(mockRepo)
			}

			result, err := service.UpdateMeasure(context.Background(), clinicID, therapistID, tt.req)

			if tt.wantErr {
				assert.Error(t, err)
				if tt.errMsg != "" {
					assert.Contains(t, err.Error(), tt.errMsg)
				}
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)

				if tt.req.Responses != nil {
					// Score should be recalculated
					assert.Equal(t, 8.0, result.Score)
				}
				if tt.req.Notes != nil {
					assert.Equal(t, *tt.req.Notes, result.Notes)
				}
				if tt.req.MeasuredAt != nil {
					expected, _ := time.Parse(time.RFC3339, *tt.req.MeasuredAt)
					assert.Equal(t, expected.Unix(), result.MeasuredAt.Unix())
				}
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

// TestOutcomeMeasuresService_DeleteMeasure tests the DeleteMeasure method
func TestOutcomeMeasuresService_DeleteMeasure(t *testing.T) {
	patientID := "patient-123"
	measureID := "measure-123"
	userID := "user-123"

	tests := []struct {
		name    string
		patientID string
		measureID string
		setup   func(*MockOutcomeMeasuresRepository)
		wantErr bool
		errMsg  string
	}{
		{
			name:      "successful delete",
			patientID: patientID,
			measureID: measureID,
			setup: func(m *MockOutcomeMeasuresRepository) {
				existingMeasure := &model.OutcomeMeasure{
					ID:        measureID,
					PatientID: patientID,
				}
				m.On("GetByID", mock.Anything, measureID).Return(existingMeasure, nil)
				m.On("Delete", mock.Anything, measureID).Return(nil)
			},
			wantErr: false,
		},
		{
			name:      "patient mismatch",
			patientID: "wrong-patient",
			measureID: measureID,
			setup: func(m *MockOutcomeMeasuresRepository) {
				existingMeasure := &model.OutcomeMeasure{
					ID:        measureID,
					PatientID: patientID,
				}
				m.On("GetByID", mock.Anything, measureID).Return(existingMeasure, nil)
			},
			wantErr: true,
			errMsg:  "does not belong to patient",
		},
		{
			name:      "measure not found",
			patientID: patientID,
			measureID: "non-existent",
			setup: func(m *MockOutcomeMeasuresRepository) {
				m.On("GetByID", mock.Anything, "non-existent").Return(nil, fmt.Errorf("not found"))
			},
			wantErr: true,
		},
		{
			name:      "delete operation fails",
			patientID: patientID,
			measureID: measureID,
			setup: func(m *MockOutcomeMeasuresRepository) {
				existingMeasure := &model.OutcomeMeasure{
					ID:        measureID,
					PatientID: patientID,
				}
				m.On("GetByID", mock.Anything, measureID).Return(existingMeasure, nil)
				m.On("Delete", mock.Anything, measureID).Return(fmt.Errorf("database error"))
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockOutcomeMeasuresRepository)
			service := NewOutcomeMeasuresService(mockRepo)

			if tt.setup != nil {
				tt.setup(mockRepo)
			}

			err := service.DeleteMeasure(context.Background(), tt.patientID, tt.measureID, userID)

			if tt.wantErr {
				assert.Error(t, err)
				if tt.errMsg != "" {
					assert.Contains(t, err.Error(), tt.errMsg)
				}
			} else {
				assert.NoError(t, err)
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

// Helper function to create string pointers
func stringPtr(s string) *string {
	return &s
}

// TestTrendDirection tests trend calculation for different scenarios
func TestTrendDirection(t *testing.T) {
	now := time.Now()
	mcid := 2.0

	tests := []struct {
		name          string
		measures      []*model.OutcomeMeasure
		expectedTrend model.TrendDirection
	}{
		{
			name: "Single measure: insufficient data",
			measures: []*model.OutcomeMeasure{
				{
					ID:         "m1",
					Score:      5.0,
					MeasuredAt: now,
					Library: &model.OutcomeMeasureLibrary{
						HigherIsBetter: true,
						MCID:           &mcid,
					},
				},
			},
			expectedTrend: model.TrendInsuffData,
		},
		{
			name: "Higher is better with improvement",
			measures: []*model.OutcomeMeasure{
				{ID: "m1", Score: 5.0, MeasuredAt: now.AddDate(0, 0, -7), Library: &model.OutcomeMeasureLibrary{HigherIsBetter: true, MinScore: 0, MaxScore: 10, MCID: &mcid}},
				{ID: "m2", Score: 7.0, MeasuredAt: now, Library: &model.OutcomeMeasureLibrary{HigherIsBetter: true, MinScore: 0, MaxScore: 10, MCID: &mcid}},
			},
			expectedTrend: model.TrendImproved,
		},
		{
			name: "Higher is better with decline",
			measures: []*model.OutcomeMeasure{
				{ID: "m1", Score: 7.0, MeasuredAt: now.AddDate(0, 0, -7), Library: &model.OutcomeMeasureLibrary{HigherIsBetter: true, MinScore: 0, MaxScore: 10, MCID: &mcid}},
				{ID: "m2", Score: 5.0, MeasuredAt: now, Library: &model.OutcomeMeasureLibrary{HigherIsBetter: true, MinScore: 0, MaxScore: 10, MCID: &mcid}},
			},
			expectedTrend: model.TrendDeclined,
		},
		{
			name: "No change: stable",
			measures: []*model.OutcomeMeasure{
				{ID: "m1", Score: 5.0, MeasuredAt: now.AddDate(0, 0, -7), Library: &model.OutcomeMeasureLibrary{HigherIsBetter: true, MinScore: 0, MaxScore: 10, MCID: &mcid}},
				{ID: "m2", Score: 5.0, MeasuredAt: now, Library: &model.OutcomeMeasureLibrary{HigherIsBetter: true, MinScore: 0, MaxScore: 10, MCID: &mcid}},
			},
			expectedTrend: model.TrendStable,
		},
		{
			name: "Lower is better with improvement (score decreased)",
			measures: []*model.OutcomeMeasure{
				{ID: "m1", Score: 8.0, MeasuredAt: now.AddDate(0, 0, -7), Library: &model.OutcomeMeasureLibrary{HigherIsBetter: false, MinScore: 0, MaxScore: 10, MCID: &mcid}},
				{ID: "m2", Score: 4.0, MeasuredAt: now, Library: &model.OutcomeMeasureLibrary{HigherIsBetter: false, MinScore: 0, MaxScore: 10, MCID: &mcid}},
			},
			expectedTrend: model.TrendImproved,
		},
		{
			name: "Lower is better with decline (score increased)",
			measures: []*model.OutcomeMeasure{
				{ID: "m1", Score: 4.0, MeasuredAt: now.AddDate(0, 0, -7), Library: &model.OutcomeMeasureLibrary{HigherIsBetter: false, MinScore: 0, MaxScore: 10, MCID: &mcid}},
				{ID: "m2", Score: 8.0, MeasuredAt: now, Library: &model.OutcomeMeasureLibrary{HigherIsBetter: false, MinScore: 0, MaxScore: 10, MCID: &mcid}},
			},
			expectedTrend: model.TrendDeclined,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockOutcomeMeasuresRepository)
			service := NewOutcomeMeasuresService(mockRepo)

			mockRepo.On("GetByPatientAndType", mock.Anything, "patient-123", model.MeasureTypeVAS).
				Return(tt.measures, nil)

			result, err := service.CalculateProgress(context.Background(), "patient-123", model.MeasureTypeVAS)

			if len(tt.measures) == 0 {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedTrend, result.Trend)
			}

			mockRepo.AssertExpectations(t)
		})
	}
}
