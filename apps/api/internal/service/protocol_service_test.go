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

// MockProtocolRepository is a mock implementation
type MockProtocolRepository struct {
	mock.Mock
}

func (m *MockProtocolRepository) GetProtocols(ctx context.Context) ([]*model.ClinicalProtocolDB, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.ClinicalProtocolDB), args.Error(1)
}

func (m *MockProtocolRepository) GetProtocolByID(ctx context.Context, id string) (*model.ClinicalProtocolDB, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.ClinicalProtocolDB), args.Error(1)
}

func (m *MockProtocolRepository) AssignProtocol(ctx context.Context, pp *model.PatientProtocolDB) error {
	args := m.Called(ctx, pp)
	return args.Error(0)
}

func (m *MockProtocolRepository) GetPatientProtocols(ctx context.Context, patientID string) ([]*model.PatientProtocolDB, error) {
	args := m.Called(ctx, patientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.PatientProtocolDB), args.Error(1)
}

func (m *MockProtocolRepository) GetPatientProtocolByID(ctx context.Context, id string) (*model.PatientProtocolDB, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.PatientProtocolDB), args.Error(1)
}

func (m *MockProtocolRepository) UpdateProgress(ctx context.Context, pp *model.PatientProtocolDB) error {
	args := m.Called(ctx, pp)
	return args.Error(0)
}

// TestAssignProtocol tests protocol assignment validation
func TestAssignProtocol(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name                string
		protocol            *model.ClinicalProtocolDB
		request             *model.AssignProtocolRequestDB
		expectError         bool
		errorMsg            string
		expectedDuration    int
	}{
		{
			name: "Valid protocol assignment",
			protocol: &model.ClinicalProtocolDB{
				ID:               "protocol-1",
				ProtocolName:     "ACL Reconstruction Rehab",
				ProtocolNameVi:   "Phục hồi chức năng sau phẫu thuật ACL",
				DurationWeeks:    12,
				FrequencyPerWeek: 3,
				IsActive:         true,
			},
			request: &model.AssignProtocolRequestDB{
				ProtocolID: "protocol-1",
				StartDate:  now.Format("2006-01-02"),
				Notes:      "Patient motivated",
			},
			expectError:      false,
			expectedDuration: 84, // 12 weeks * 7 days
		},
		{
			name: "Inactive protocol should fail",
			protocol: &model.ClinicalProtocolDB{
				ID:               "protocol-2",
				ProtocolName:     "Inactive Protocol",
				DurationWeeks:    8,
				FrequencyPerWeek: 2,
				IsActive:         false,
			},
			request: &model.AssignProtocolRequestDB{
				ProtocolID: "protocol-2",
			},
			expectError: true,
			errorMsg:    "protocol is not active",
		},
		{
			name: "Assignment with default start date",
			protocol: &model.ClinicalProtocolDB{
				ID:               "protocol-3",
				ProtocolName:     "General PT",
				DurationWeeks:    6,
				FrequencyPerWeek: 2,
				IsActive:         true,
			},
			request: &model.AssignProtocolRequestDB{
				ProtocolID: "protocol-3",
				StartDate:  "", // Should default to now
			},
			expectError:      false,
			expectedDuration: 42, // 6 weeks * 7 days
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockProtocolRepository)
			service := NewProtocolService(mockRepo)

			mockRepo.On("GetProtocolByID", mock.Anything, tt.protocol.ID).Return(tt.protocol, nil)

			if !tt.expectError {
				mockRepo.On("AssignProtocol", mock.Anything, mock.AnythingOfType("*model.PatientProtocolDB")).
					Run(func(args mock.Arguments) {
						pp := args.Get(1).(*model.PatientProtocolDB)
						assert.Equal(t, "patient-123", pp.PatientID)
						assert.Equal(t, "therapist-123", pp.TherapistID)
						assert.Equal(t, tt.protocol.ID, pp.ProtocolID)
						assert.Equal(t, "active", pp.ProgressStatus)
						assert.Equal(t, 1, pp.Version)
						assert.NotNil(t, pp.StartDate)
						assert.NotNil(t, pp.TargetEndDate)

						// Check duration calculation
						if pp.StartDate != nil && pp.TargetEndDate != nil {
							duration := pp.TargetEndDate.Sub(*pp.StartDate)
							assert.Equal(t, tt.expectedDuration, int(duration.Hours()/24))
						}
					}).
					Return(nil)
			}

			result, err := service.AssignProtocol(
				context.Background(),
				"patient-123",
				"therapist-123",
				"clinic-123",
				tt.request,
			)

			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, tt.protocol.ID, result.ProtocolID)
				mockRepo.AssertExpectations(t)
			}
		})
	}
}

// TestUpdateProtocolProgress tests progress update with optimistic locking
func TestUpdateProtocolProgress(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name                   string
		existingProtocol       *model.PatientProtocolDB
		request                *model.UpdateProgressRequest
		expectError            bool
		errorMsg               string
		expectedVersion        int
		expectedStatus         string
		expectedPhase          string
		expectedSessions       int
		expectedActualEndDate  bool
	}{
		{
			name: "Successful progress update",
			existingProtocol: &model.PatientProtocolDB{
				ID:                "pp-1",
				PatientID:         "patient-123",
				ProtocolID:        "protocol-1",
				ProgressStatus:    "active",
				CurrentPhase:      "initial",
				SessionsCompleted: 5,
				Version:           1,
			},
			request: &model.UpdateProgressRequest{
				ProgressStatus:    stringPtr("active"),
				CurrentPhase:      stringPtr("intermediate"),
				SessionsCompleted: intPtr(10),
				Note:              stringPtr("Good progress"),
				Version:           1,
			},
			expectError:      false,
			expectedVersion:  2,
			expectedStatus:   "active",
			expectedPhase:    "intermediate",
			expectedSessions: 10,
		},
		{
			name: "Version conflict detection",
			existingProtocol: &model.PatientProtocolDB{
				ID:                "pp-2",
				PatientID:         "patient-123",
				ProtocolID:        "protocol-1",
				ProgressStatus:    "active",
				CurrentPhase:      "initial",
				SessionsCompleted: 5,
				Version:           2, // Current version is 2
			},
			request: &model.UpdateProgressRequest{
				ProgressStatus:    stringPtr("active"),
				SessionsCompleted: intPtr(10),
				Version:           1, // Client has stale version 1
			},
			expectError: true,
			errorMsg:    "version conflict",
		},
		{
			name: "Complete protocol sets actual end date",
			existingProtocol: &model.PatientProtocolDB{
				ID:                "pp-3",
				PatientID:         "patient-123",
				ProtocolID:        "protocol-1",
				ProgressStatus:    "active",
				CurrentPhase:      "advanced",
				SessionsCompleted: 20,
				Version:           1,
			},
			request: &model.UpdateProgressRequest{
				ProgressStatus: stringPtr("completed"),
				Version:        1,
			},
			expectError:           false,
			expectedVersion:       2,
			expectedStatus:        "completed",
			expectedActualEndDate: true,
		},
		{
			name: "Discontinue protocol sets actual end date",
			existingProtocol: &model.PatientProtocolDB{
				ID:                "pp-4",
				PatientID:         "patient-123",
				ProtocolID:        "protocol-1",
				ProgressStatus:    "active",
				CurrentPhase:      "initial",
				SessionsCompleted: 3,
				Version:           1,
			},
			request: &model.UpdateProgressRequest{
				ProgressStatus: stringPtr("discontinued"),
				Version:        1,
			},
			expectError:           false,
			expectedVersion:       2,
			expectedStatus:        "discontinued",
			expectedActualEndDate: true,
		},
		{
			name: "Add progress note",
			existingProtocol: &model.PatientProtocolDB{
				ID:                "pp-5",
				PatientID:         "patient-123",
				ProtocolID:        "protocol-1",
				ProgressStatus:    "active",
				CurrentPhase:      "intermediate",
				SessionsCompleted: 10,
				ProgressNotes:     []model.ProgressNote{},
				Version:           1,
			},
			request: &model.UpdateProgressRequest{
				Note:    stringPtr("Patient showing excellent progress"),
				NoteVi:  stringPtr("Bệnh nhân tiến triển tốt"),
				Version: 1,
			},
			expectError:      false,
			expectedVersion:  2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockProtocolRepository)
			service := NewProtocolService(mockRepo)

			mockRepo.On("GetPatientProtocolByID", mock.Anything, tt.existingProtocol.ID).
				Return(tt.existingProtocol, nil)

			if !tt.expectError {
				mockRepo.On("UpdateProgress", mock.Anything, mock.AnythingOfType("*model.PatientProtocolDB")).
					Run(func(args mock.Arguments) {
						pp := args.Get(1).(*model.PatientProtocolDB)
						assert.Equal(t, tt.expectedVersion, pp.Version)

						if tt.expectedStatus != "" {
							assert.Equal(t, tt.expectedStatus, pp.ProgressStatus)
						}

						if tt.expectedPhase != "" {
							assert.Equal(t, tt.expectedPhase, pp.CurrentPhase)
						}

						if tt.expectedSessions != 0 {
							assert.Equal(t, tt.expectedSessions, pp.SessionsCompleted)
						}

						if tt.expectedActualEndDate {
							assert.NotNil(t, pp.ActualEndDate)
							assert.WithinDuration(t, now, *pp.ActualEndDate, 1*time.Second)
						}

						// Check progress notes were added
						if tt.request.Note != nil && *tt.request.Note != "" {
							assert.NotEmpty(t, pp.ProgressNotes)
							lastNote := pp.ProgressNotes[len(pp.ProgressNotes)-1]
							assert.Equal(t, *tt.request.Note, lastNote.Note)
							if tt.request.NoteVi != nil {
								assert.Equal(t, *tt.request.NoteVi, lastNote.NoteVi)
							}
						}
					}).
					Return(nil)
			}

			result, err := service.UpdateProtocolProgress(
				context.Background(),
				tt.existingProtocol.ID,
				"therapist-123",
				tt.request,
			)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorMsg != "" {
					assert.Equal(t, repository.ErrVersionConflict, err)
				}
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				mockRepo.AssertExpectations(t)
			}
		})
	}
}

// TestVersionIncrement ensures version increments correctly
func TestVersionIncrement(t *testing.T) {
	existingProtocol := &model.PatientProtocolDB{
		ID:                "pp-1",
		PatientID:         "patient-123",
		ProtocolID:        "protocol-1",
		ProgressStatus:    "active",
		CurrentPhase:      "initial",
		SessionsCompleted: 5,
		Version:           1,
	}

	request := &model.UpdateProgressRequest{
		SessionsCompleted: intPtr(6),
		Version:           1,
	}

	mockRepo := new(MockProtocolRepository)
	service := NewProtocolService(mockRepo)

	mockRepo.On("GetPatientProtocolByID", mock.Anything, "pp-1").Return(existingProtocol, nil)
	mockRepo.On("UpdateProgress", mock.Anything, mock.AnythingOfType("*model.PatientProtocolDB")).
		Run(func(args mock.Arguments) {
			pp := args.Get(1).(*model.PatientProtocolDB)
			assert.Equal(t, 2, pp.Version) // Version should increment from 1 to 2
		}).
		Return(nil)

	result, err := service.UpdateProtocolProgress(context.Background(), "pp-1", "therapist-123", request)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 2, result.Version)

	mockRepo.AssertExpectations(t)
}

// TestGetProtocols tests protocol retrieval
func TestGetProtocols(t *testing.T) {
	protocols := []*model.ClinicalProtocolDB{
		{
			ID:               "protocol-1",
			ProtocolName:     "ACL Reconstruction",
			DurationWeeks:    12,
			FrequencyPerWeek: 3,
			IsActive:         true,
		},
		{
			ID:               "protocol-2",
			ProtocolName:     "Total Knee Replacement",
			DurationWeeks:    8,
			FrequencyPerWeek: 2,
			IsActive:         true,
		},
	}

	mockRepo := new(MockProtocolRepository)
	service := NewProtocolService(mockRepo)

	mockRepo.On("GetProtocols", mock.Anything).Return(protocols, nil)

	result, err := service.GetProtocols(context.Background())

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 2)
	assert.Equal(t, "ACL Reconstruction", result[0].ProtocolName)

	mockRepo.AssertExpectations(t)
}

// TestGetPatientProtocols tests retrieval of patient's assigned protocols
func TestGetPatientProtocols(t *testing.T) {
	now := time.Now()
	patientProtocols := []*model.PatientProtocolDB{
		{
			ID:                "pp-1",
			PatientID:         "patient-123",
			ProtocolID:        "protocol-1",
			ProgressStatus:    "active",
			SessionsCompleted: 10,
			AssignedDate:      now,
		},
		{
			ID:                "pp-2",
			PatientID:         "patient-123",
			ProtocolID:        "protocol-2",
			ProgressStatus:    "completed",
			SessionsCompleted: 24,
			AssignedDate:      now.AddDate(0, -3, 0),
		},
	}

	mockRepo := new(MockProtocolRepository)
	service := NewProtocolService(mockRepo)

	mockRepo.On("GetPatientProtocols", mock.Anything, "patient-123").Return(patientProtocols, nil)

	result, err := service.GetPatientProtocols(context.Background(), "patient-123")

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 2)
	assert.Equal(t, "active", result[0].ProgressStatus)
	assert.Equal(t, "completed", result[1].ProgressStatus)

	mockRepo.AssertExpectations(t)
}

// Helper functions
func stringPtr(s string) *string {
	return &s
}

func intPtr(i int) *int {
	return &i
}
