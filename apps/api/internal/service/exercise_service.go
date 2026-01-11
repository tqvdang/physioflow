package service

import (
	"bytes"
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
)

// ExerciseService defines the interface for exercise business logic.
type ExerciseService interface {
	// Exercise library
	CreateExercise(ctx context.Context, clinicID, userID string, req *model.CreateExerciseRequest) (*model.Exercise, error)
	GetExercise(ctx context.Context, id string) (*model.Exercise, error)
	UpdateExercise(ctx context.Context, id, userID string, req *model.UpdateExerciseRequest) (*model.Exercise, error)
	DeleteExercise(ctx context.Context, id string) error
	ListExercises(ctx context.Context, params model.ExerciseSearchParams) (*model.ExerciseListResponse, error)
	SearchExercises(ctx context.Context, clinicID, query string, limit int) ([]model.Exercise, error)

	// Prescriptions
	PrescribeExercise(ctx context.Context, clinicID, patientID, userID string, req *model.PrescribeExerciseRequest) (*model.ExercisePrescription, error)
	GetPrescription(ctx context.Context, id string) (*model.ExercisePrescription, error)
	UpdatePrescription(ctx context.Context, id string, req *model.UpdatePrescriptionRequest) (*model.ExercisePrescription, error)
	DeletePrescription(ctx context.Context, id string) error
	GetPatientPrescriptions(ctx context.Context, patientID string, activeOnly bool) ([]model.ExercisePrescription, error)

	// Home Exercise Programs
	CreateProgram(ctx context.Context, clinicID, patientID, userID string, req *model.CreateProgramRequest) (*model.HomeExerciseProgram, error)
	GetProgram(ctx context.Context, id string) (*model.HomeExerciseProgram, error)
	GetPatientPrograms(ctx context.Context, patientID string) ([]model.HomeExerciseProgram, error)

	// Compliance tracking
	LogCompliance(ctx context.Context, prescriptionID, patientID string, req *model.LogComplianceRequest) (*model.ExerciseComplianceLog, error)
	GetComplianceLogs(ctx context.Context, prescriptionID string, limit int) ([]model.ExerciseComplianceLog, error)
	GetPatientComplianceSummary(ctx context.Context, patientID string) (*model.PatientExerciseSummary, error)

	// PDF generation
	GenerateHandoutPDF(ctx context.Context, patientID, language string) ([]byte, error)
}

// exerciseService implements ExerciseService.
type exerciseService struct {
	repo        repository.ExerciseRepository
	patientRepo repository.PatientRepository
}

// NewExerciseService creates a new exercise service.
func NewExerciseService(repo repository.ExerciseRepository, patientRepo repository.PatientRepository) ExerciseService {
	return &exerciseService{
		repo:        repo,
		patientRepo: patientRepo,
	}
}

// CreateExercise creates a new exercise in the library.
func (s *exerciseService) CreateExercise(ctx context.Context, clinicID, userID string, req *model.CreateExerciseRequest) (*model.Exercise, error) {
	muscleGroups := make([]model.MuscleGroup, len(req.MuscleGroups))
	for i, mg := range req.MuscleGroups {
		muscleGroups[i] = model.MuscleGroup(mg)
	}

	exercise := &model.Exercise{
		ID:             uuid.New().String(),
		ClinicID:       &clinicID,
		Name:           strings.TrimSpace(req.Name),
		NameVi:         strings.TrimSpace(req.NameVi),
		Description:    strings.TrimSpace(req.Description),
		DescriptionVi:  strings.TrimSpace(req.DescriptionVi),
		Instructions:   strings.TrimSpace(req.Instructions),
		InstructionsVi: strings.TrimSpace(req.InstructionsVi),
		Category:       model.ExerciseCategory(req.Category),
		Difficulty:     model.ExerciseDifficulty(req.Difficulty),
		Equipment:      req.Equipment,
		MuscleGroups:   muscleGroups,
		ImageURL:       strings.TrimSpace(req.ImageURL),
		VideoURL:       strings.TrimSpace(req.VideoURL),
		DefaultSets:    req.DefaultSets,
		DefaultReps:    req.DefaultReps,
		DefaultHoldSecs: req.DefaultHoldSecs,
		Precautions:    strings.TrimSpace(req.Precautions),
		PrecautionsVi:  strings.TrimSpace(req.PrecautionsVi),
		IsGlobal:       false, // Clinic-specific exercises are not global
		IsActive:       true,
		CreatedBy:      &userID,
	}

	// Set defaults if not provided
	if exercise.DefaultSets == 0 {
		exercise.DefaultSets = 3
	}
	if exercise.DefaultReps == 0 {
		exercise.DefaultReps = 10
	}

	if err := s.repo.Create(ctx, exercise); err != nil {
		return nil, err
	}

	log.Info().
		Str("exercise_id", exercise.ID).
		Str("name", exercise.Name).
		Str("clinic_id", clinicID).
		Str("created_by", userID).
		Msg("exercise created")

	return exercise, nil
}

// GetExercise retrieves an exercise by ID.
func (s *exerciseService) GetExercise(ctx context.Context, id string) (*model.Exercise, error) {
	return s.repo.GetByID(ctx, id)
}

// UpdateExercise updates an existing exercise.
func (s *exerciseService) UpdateExercise(ctx context.Context, id, userID string, req *model.UpdateExerciseRequest) (*model.Exercise, error) {
	exercise, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Apply updates
	if req.Name != nil {
		exercise.Name = strings.TrimSpace(*req.Name)
	}
	if req.NameVi != nil {
		exercise.NameVi = strings.TrimSpace(*req.NameVi)
	}
	if req.Description != nil {
		exercise.Description = strings.TrimSpace(*req.Description)
	}
	if req.DescriptionVi != nil {
		exercise.DescriptionVi = strings.TrimSpace(*req.DescriptionVi)
	}
	if req.Instructions != nil {
		exercise.Instructions = strings.TrimSpace(*req.Instructions)
	}
	if req.InstructionsVi != nil {
		exercise.InstructionsVi = strings.TrimSpace(*req.InstructionsVi)
	}
	if req.Category != nil {
		exercise.Category = model.ExerciseCategory(*req.Category)
	}
	if req.Difficulty != nil {
		exercise.Difficulty = model.ExerciseDifficulty(*req.Difficulty)
	}
	if req.Equipment != nil {
		exercise.Equipment = req.Equipment
	}
	if req.MuscleGroups != nil {
		muscleGroups := make([]model.MuscleGroup, len(req.MuscleGroups))
		for i, mg := range req.MuscleGroups {
			muscleGroups[i] = model.MuscleGroup(mg)
		}
		exercise.MuscleGroups = muscleGroups
	}
	if req.ImageURL != nil {
		exercise.ImageURL = strings.TrimSpace(*req.ImageURL)
	}
	if req.VideoURL != nil {
		exercise.VideoURL = strings.TrimSpace(*req.VideoURL)
	}
	if req.DefaultSets != nil {
		exercise.DefaultSets = *req.DefaultSets
	}
	if req.DefaultReps != nil {
		exercise.DefaultReps = *req.DefaultReps
	}
	if req.DefaultHoldSecs != nil {
		exercise.DefaultHoldSecs = *req.DefaultHoldSecs
	}
	if req.Precautions != nil {
		exercise.Precautions = strings.TrimSpace(*req.Precautions)
	}
	if req.PrecautionsVi != nil {
		exercise.PrecautionsVi = strings.TrimSpace(*req.PrecautionsVi)
	}
	if req.IsActive != nil {
		exercise.IsActive = *req.IsActive
	}

	if err := s.repo.Update(ctx, exercise); err != nil {
		return nil, err
	}

	log.Info().
		Str("exercise_id", exercise.ID).
		Str("updated_by", userID).
		Msg("exercise updated")

	return exercise, nil
}

// DeleteExercise soft-deletes an exercise.
func (s *exerciseService) DeleteExercise(ctx context.Context, id string) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}

	log.Info().
		Str("exercise_id", id).
		Msg("exercise deleted")

	return nil
}

// ListExercises returns a paginated list of exercises.
func (s *exerciseService) ListExercises(ctx context.Context, params model.ExerciseSearchParams) (*model.ExerciseListResponse, error) {
	exercises, total, err := s.repo.List(ctx, params)
	if err != nil {
		return nil, err
	}

	perPage := params.Limit()
	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}

	return &model.ExerciseListResponse{
		Data:       exercises,
		Total:      total,
		Page:       params.Page,
		PerPage:    perPage,
		TotalPages: totalPages,
	}, nil
}

// SearchExercises performs a quick search for exercises.
func (s *exerciseService) SearchExercises(ctx context.Context, clinicID, query string, limit int) ([]model.Exercise, error) {
	return s.repo.Search(ctx, clinicID, query, limit)
}

// PrescribeExercise prescribes an exercise to a patient.
func (s *exerciseService) PrescribeExercise(ctx context.Context, clinicID, patientID, userID string, req *model.PrescribeExerciseRequest) (*model.ExercisePrescription, error) {
	// Verify exercise exists
	exercise, err := s.repo.GetByID(ctx, req.ExerciseID)
	if err != nil {
		return nil, fmt.Errorf("exercise not found: %w", err)
	}

	// Parse start date
	startDate := time.Now()
	if req.StartDate != "" {
		parsed, err := time.Parse("2006-01-02", req.StartDate)
		if err != nil {
			return nil, fmt.Errorf("invalid start date format: %w", err)
		}
		startDate = parsed
	}

	// Calculate end date
	endDate := startDate.AddDate(0, 0, req.DurationWeeks*7)

	// Use defaults from exercise if not specified
	sets := req.Sets
	if sets == 0 {
		sets = exercise.DefaultSets
	}
	reps := req.Reps
	if reps == 0 {
		reps = exercise.DefaultReps
	}
	holdSeconds := req.HoldSeconds
	if holdSeconds == 0 {
		holdSeconds = exercise.DefaultHoldSecs
	}

	prescription := &model.ExercisePrescription{
		ID:                 uuid.New().String(),
		PatientID:          patientID,
		ExerciseID:         req.ExerciseID,
		ClinicID:           clinicID,
		PrescribedBy:       userID,
		Sets:               sets,
		Reps:               reps,
		HoldSeconds:        holdSeconds,
		Frequency:          req.Frequency,
		DurationWeeks:      req.DurationWeeks,
		CustomInstructions: strings.TrimSpace(req.CustomInstructions),
		Notes:              strings.TrimSpace(req.Notes),
		Status:             model.PrescriptionStatusActive,
		StartDate:          startDate,
		EndDate:            &endDate,
	}

	if req.ProgramID != "" {
		prescription.ProgramID = &req.ProgramID
	}

	if err := s.repo.CreatePrescription(ctx, prescription); err != nil {
		return nil, err
	}

	// Attach exercise details
	prescription.Exercise = exercise

	log.Info().
		Str("prescription_id", prescription.ID).
		Str("patient_id", patientID).
		Str("exercise_id", req.ExerciseID).
		Str("prescribed_by", userID).
		Msg("exercise prescribed")

	return prescription, nil
}

// GetPrescription retrieves a prescription by ID.
func (s *exerciseService) GetPrescription(ctx context.Context, id string) (*model.ExercisePrescription, error) {
	return s.repo.GetPrescriptionByID(ctx, id)
}

// UpdatePrescription updates an existing prescription.
func (s *exerciseService) UpdatePrescription(ctx context.Context, id string, req *model.UpdatePrescriptionRequest) (*model.ExercisePrescription, error) {
	prescription, err := s.repo.GetPrescriptionByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if req.Sets != nil {
		prescription.Sets = *req.Sets
	}
	if req.Reps != nil {
		prescription.Reps = *req.Reps
	}
	if req.HoldSeconds != nil {
		prescription.HoldSeconds = *req.HoldSeconds
	}
	if req.Frequency != nil {
		prescription.Frequency = *req.Frequency
	}
	if req.DurationWeeks != nil {
		prescription.DurationWeeks = *req.DurationWeeks
		// Recalculate end date
		endDate := prescription.StartDate.AddDate(0, 0, *req.DurationWeeks*7)
		prescription.EndDate = &endDate
	}
	if req.CustomInstructions != nil {
		prescription.CustomInstructions = strings.TrimSpace(*req.CustomInstructions)
	}
	if req.Notes != nil {
		prescription.Notes = strings.TrimSpace(*req.Notes)
	}
	if req.Status != nil {
		prescription.Status = model.PrescriptionStatus(*req.Status)
		if prescription.Status == model.PrescriptionStatusCompleted {
			now := time.Now()
			prescription.EndDate = &now
		}
	}

	if err := s.repo.UpdatePrescription(ctx, prescription); err != nil {
		return nil, err
	}

	log.Info().
		Str("prescription_id", prescription.ID).
		Msg("prescription updated")

	return prescription, nil
}

// DeletePrescription deletes a prescription.
func (s *exerciseService) DeletePrescription(ctx context.Context, id string) error {
	if err := s.repo.DeletePrescription(ctx, id); err != nil {
		return err
	}

	log.Info().
		Str("prescription_id", id).
		Msg("prescription deleted")

	return nil
}

// GetPatientPrescriptions retrieves all prescriptions for a patient.
func (s *exerciseService) GetPatientPrescriptions(ctx context.Context, patientID string, activeOnly bool) ([]model.ExercisePrescription, error) {
	return s.repo.ListPatientPrescriptions(ctx, patientID, activeOnly)
}

// CreateProgram creates a new home exercise program.
func (s *exerciseService) CreateProgram(ctx context.Context, clinicID, patientID, userID string, req *model.CreateProgramRequest) (*model.HomeExerciseProgram, error) {
	// Parse start date
	startDate := time.Now()
	if req.StartDate != "" {
		parsed, err := time.Parse("2006-01-02", req.StartDate)
		if err != nil {
			return nil, fmt.Errorf("invalid start date format: %w", err)
		}
		startDate = parsed
	}

	// Calculate end date
	endDate := startDate.AddDate(0, 0, req.DurationWeeks*7)

	program := &model.HomeExerciseProgram{
		ID:            uuid.New().String(),
		PatientID:     patientID,
		ClinicID:      clinicID,
		CreatedBy:     userID,
		Name:          strings.TrimSpace(req.Name),
		NameVi:        strings.TrimSpace(req.NameVi),
		Description:   strings.TrimSpace(req.Description),
		DescriptionVi: strings.TrimSpace(req.DescriptionVi),
		Frequency:     req.Frequency,
		DurationWeeks: req.DurationWeeks,
		StartDate:     startDate,
		EndDate:       &endDate,
		IsActive:      true,
	}

	if err := s.repo.CreateProgram(ctx, program); err != nil {
		return nil, err
	}

	// Create prescriptions for each exercise
	for _, exerciseID := range req.ExerciseIDs {
		exercise, err := s.repo.GetByID(ctx, exerciseID)
		if err != nil {
			log.Warn().Err(err).Str("exercise_id", exerciseID).Msg("failed to get exercise for program")
			continue
		}

		prescription := &model.ExercisePrescription{
			ID:            uuid.New().String(),
			PatientID:     patientID,
			ExerciseID:    exerciseID,
			ClinicID:      clinicID,
			PrescribedBy:  userID,
			ProgramID:     &program.ID,
			Sets:          exercise.DefaultSets,
			Reps:          exercise.DefaultReps,
			HoldSeconds:   exercise.DefaultHoldSecs,
			Frequency:     req.Frequency,
			DurationWeeks: req.DurationWeeks,
			Status:        model.PrescriptionStatusActive,
			StartDate:     startDate,
			EndDate:       &endDate,
		}

		if err := s.repo.CreatePrescription(ctx, prescription); err != nil {
			log.Warn().Err(err).Str("exercise_id", exerciseID).Msg("failed to create prescription for program")
			continue
		}

		prescription.Exercise = exercise
		program.Exercises = append(program.Exercises, *prescription)
	}

	log.Info().
		Str("program_id", program.ID).
		Str("patient_id", patientID).
		Int("exercise_count", len(program.Exercises)).
		Str("created_by", userID).
		Msg("home exercise program created")

	return program, nil
}

// GetProgram retrieves a program by ID.
func (s *exerciseService) GetProgram(ctx context.Context, id string) (*model.HomeExerciseProgram, error) {
	return s.repo.GetProgramByID(ctx, id)
}

// GetPatientPrograms retrieves all programs for a patient.
func (s *exerciseService) GetPatientPrograms(ctx context.Context, patientID string) ([]model.HomeExerciseProgram, error) {
	return s.repo.ListPatientPrograms(ctx, patientID)
}

// LogCompliance logs an exercise completion.
func (s *exerciseService) LogCompliance(ctx context.Context, prescriptionID, patientID string, req *model.LogComplianceRequest) (*model.ExerciseComplianceLog, error) {
	// Verify prescription exists
	_, err := s.repo.GetPrescriptionByID(ctx, prescriptionID)
	if err != nil {
		return nil, fmt.Errorf("prescription not found: %w", err)
	}

	complianceLog := &model.ExerciseComplianceLog{
		ID:             uuid.New().String(),
		PrescriptionID: prescriptionID,
		PatientID:      patientID,
		CompletedAt:    time.Now(),
		SetsCompleted:  req.SetsCompleted,
		RepsCompleted:  req.RepsCompleted,
		PainLevel:      req.PainLevel,
		Difficulty:     req.Difficulty,
		Notes:          strings.TrimSpace(req.Notes),
	}

	if err := s.repo.LogCompliance(ctx, complianceLog); err != nil {
		return nil, err
	}

	log.Info().
		Str("prescription_id", prescriptionID).
		Str("patient_id", patientID).
		Int("sets_completed", req.SetsCompleted).
		Msg("exercise compliance logged")

	return complianceLog, nil
}

// GetComplianceLogs retrieves compliance logs for a prescription.
func (s *exerciseService) GetComplianceLogs(ctx context.Context, prescriptionID string, limit int) ([]model.ExerciseComplianceLog, error) {
	return s.repo.GetComplianceLogs(ctx, prescriptionID, limit)
}

// GetPatientComplianceSummary retrieves a compliance summary for a patient.
func (s *exerciseService) GetPatientComplianceSummary(ctx context.Context, patientID string) (*model.PatientExerciseSummary, error) {
	return s.repo.GetPatientComplianceSummary(ctx, patientID)
}

// GenerateHandoutPDF generates a PDF handout of prescribed exercises.
func (s *exerciseService) GenerateHandoutPDF(ctx context.Context, patientID, language string) ([]byte, error) {
	// Get active prescriptions
	prescriptions, err := s.repo.ListPatientPrescriptions(ctx, patientID, true)
	if err != nil {
		return nil, fmt.Errorf("failed to get prescriptions: %w", err)
	}

	if len(prescriptions) == 0 {
		return nil, fmt.Errorf("no active prescriptions found")
	}

	// Generate simple text-based PDF content
	// In a real implementation, you would use a PDF library like gopdf or gofpdf
	var buf bytes.Buffer

	// Header
	if language == "vi" {
		buf.WriteString("CHUONG TRINH BAI TAP TAI NHA\n")
		buf.WriteString("========================================\n\n")
	} else {
		buf.WriteString("HOME EXERCISE PROGRAM\n")
		buf.WriteString("========================================\n\n")
	}

	// Patient info
	patient, _ := s.patientRepo.GetByID(ctx, "", patientID)
	if patient != nil {
		if language == "vi" {
			buf.WriteString(fmt.Sprintf("Benh nhan: %s\n", patient.FullNameVi()))
		} else {
			buf.WriteString(fmt.Sprintf("Patient: %s\n", patient.FullName()))
		}
		buf.WriteString(fmt.Sprintf("MRN: %s\n", patient.MRN))
	}

	buf.WriteString(fmt.Sprintf("Date: %s\n\n", time.Now().Format("2006-01-02")))
	buf.WriteString("----------------------------------------\n\n")

	// Exercises
	for i, p := range prescriptions {
		if p.Exercise == nil {
			continue
		}

		exercise := p.Exercise
		buf.WriteString(fmt.Sprintf("%d. ", i+1))

		if language == "vi" {
			buf.WriteString(fmt.Sprintf("%s\n", exercise.NameVi))
			buf.WriteString(fmt.Sprintf("   Loai: %s | Do kho: %s\n", exercise.Category, exercise.Difficulty))
			buf.WriteString(fmt.Sprintf("   So bo: %d | So lan: %d", p.Sets, p.Reps))
			if p.HoldSeconds > 0 {
				buf.WriteString(fmt.Sprintf(" | Giu: %d giay", p.HoldSeconds))
			}
			buf.WriteString(fmt.Sprintf("\n   Tan suat: %s\n", p.Frequency))
			if exercise.InstructionsVi != "" {
				buf.WriteString(fmt.Sprintf("\n   Huong dan:\n   %s\n", exercise.InstructionsVi))
			}
			if p.CustomInstructions != "" {
				buf.WriteString(fmt.Sprintf("\n   Ghi chu dac biet:\n   %s\n", p.CustomInstructions))
			}
			if exercise.PrecautionsVi != "" {
				buf.WriteString(fmt.Sprintf("\n   Chu y: %s\n", exercise.PrecautionsVi))
			}
		} else {
			buf.WriteString(fmt.Sprintf("%s\n", exercise.Name))
			buf.WriteString(fmt.Sprintf("   Category: %s | Difficulty: %s\n", exercise.Category, exercise.Difficulty))
			buf.WriteString(fmt.Sprintf("   Sets: %d | Reps: %d", p.Sets, p.Reps))
			if p.HoldSeconds > 0 {
				buf.WriteString(fmt.Sprintf(" | Hold: %d seconds", p.HoldSeconds))
			}
			buf.WriteString(fmt.Sprintf("\n   Frequency: %s\n", p.Frequency))
			if exercise.Instructions != "" {
				buf.WriteString(fmt.Sprintf("\n   Instructions:\n   %s\n", exercise.Instructions))
			}
			if p.CustomInstructions != "" {
				buf.WriteString(fmt.Sprintf("\n   Special notes:\n   %s\n", p.CustomInstructions))
			}
			if exercise.Precautions != "" {
				buf.WriteString(fmt.Sprintf("\n   Precautions: %s\n", exercise.Precautions))
			}
		}

		buf.WriteString("\n----------------------------------------\n\n")
	}

	// Footer
	if language == "vi" {
		buf.WriteString("Luu y quan trong:\n")
		buf.WriteString("- Dung lai neu cam thay dau tang len\n")
		buf.WriteString("- Thuc hien cham va dung ky thuat\n")
		buf.WriteString("- Lien he bac si neu co bat ky van de nao\n")
	} else {
		buf.WriteString("Important notes:\n")
		buf.WriteString("- Stop if you experience increased pain\n")
		buf.WriteString("- Perform exercises slowly with proper form\n")
		buf.WriteString("- Contact your therapist if you have any concerns\n")
	}

	log.Info().
		Str("patient_id", patientID).
		Int("exercise_count", len(prescriptions)).
		Str("language", language).
		Msg("exercise handout generated")

	return buf.Bytes(), nil
}
