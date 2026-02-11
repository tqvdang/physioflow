package service

import (
	"context"
	"fmt"
	"math"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
)

// DischargeService defines the interface for discharge planning business logic.
type DischargeService interface {
	CreateDischargePlan(ctx context.Context, clinicID, therapistID string, req *model.CreateDischargePlanRequest) (*model.DischargePlan, error)
	GetDischargePlan(ctx context.Context, patientID string) (*model.DischargePlan, error)
	GenerateDischargeSummary(ctx context.Context, clinicID, therapistID, patientID string) (*model.DischargeSummary, error)
	GetDischargeSummary(ctx context.Context, id string) (*model.DischargeSummary, error)
	CompleteDischarge(ctx context.Context, patientID string, dischargeDate time.Time) error
}

// dischargeService implements DischargeService.
type dischargeService struct {
	repo            repository.DischargeRepository
	outcomeMeasures OutcomeMeasuresService
	exercise        ExerciseService
}

// NewDischargeService creates a new discharge service.
func NewDischargeService(
	repo repository.DischargeRepository,
	outcomeMeasures OutcomeMeasuresService,
	exercise ExerciseService,
) DischargeService {
	return &dischargeService{
		repo:            repo,
		outcomeMeasures: outcomeMeasures,
		exercise:        exercise,
	}
}

// CreateDischargePlan creates a new discharge plan for a patient.
func (s *dischargeService) CreateDischargePlan(ctx context.Context, clinicID, therapistID string, req *model.CreateDischargePlanRequest) (*model.DischargePlan, error) {
	var plannedDate *time.Time
	if req.PlannedDate != "" {
		parsed, err := time.Parse("2006-01-02", req.PlannedDate)
		if err != nil {
			return nil, fmt.Errorf("invalid planned_date format: %w", err)
		}
		plannedDate = &parsed
	}

	var protocolID *string
	if req.ProtocolID != "" {
		protocolID = &req.ProtocolID
	}

	// Build the HEP from active prescriptions
	homeProgram, err := s.buildHomeProgram(ctx, req.PatientID)
	if err != nil {
		log.Warn().Err(err).Str("patient_id", req.PatientID).Msg("failed to build home program for discharge plan")
		// Non-fatal: continue without HEP
	}

	plan := &model.DischargePlan{
		ID:              uuid.New().String(),
		PatientID:       req.PatientID,
		ClinicID:        clinicID,
		TherapistID:     therapistID,
		ProtocolID:      protocolID,
		Status:          model.DischargeStatusPlanning,
		Reason:          model.DischargeReason(req.Reason),
		ReasonDetails:   req.ReasonDetails,
		ReasonDetailsVi: req.ReasonDetailsVi,
		PlannedDate:     plannedDate,
		GoalOutcomes:    req.GoalOutcomes,
		HomeProgram:     homeProgram,
		Recommendations: req.Recommendations,
		Notes:           req.Notes,
		NotesVi:         req.NotesVi,
		CreatedBy:       &therapistID,
		UpdatedBy:       &therapistID,
	}

	if plan.GoalOutcomes == nil {
		plan.GoalOutcomes = []model.GoalOutcome{}
	}
	if plan.Recommendations == nil {
		plan.Recommendations = []model.DischargeRecommendation{}
	}

	if err := s.repo.CreatePlan(ctx, plan); err != nil {
		return nil, fmt.Errorf("failed to create discharge plan: %w", err)
	}

	log.Info().
		Str("plan_id", plan.ID).
		Str("patient_id", plan.PatientID).
		Str("reason", string(plan.Reason)).
		Str("therapist_id", therapistID).
		Msg("discharge plan created")

	return plan, nil
}

// GetDischargePlan retrieves the most recent discharge plan for a patient.
func (s *dischargeService) GetDischargePlan(ctx context.Context, patientID string) (*model.DischargePlan, error) {
	return s.repo.GetPlanByPatientID(ctx, patientID)
}

// GenerateDischargeSummary generates a discharge summary with baseline comparisons.
func (s *dischargeService) GenerateDischargeSummary(ctx context.Context, clinicID, therapistID, patientID string) (*model.DischargeSummary, error) {
	// Get the discharge plan
	plan, err := s.repo.GetPlanByPatientID(ctx, patientID)
	if err != nil {
		return nil, fmt.Errorf("discharge plan not found: %w", err)
	}

	// Get all outcome measures for patient
	measures, err := s.outcomeMeasures.GetPatientMeasures(ctx, patientID)
	if err != nil {
		return nil, fmt.Errorf("failed to get patient measures: %w", err)
	}

	// Calculate baseline comparisons
	comparisons := s.calculateBaselineComparisons(measures)

	// Determine treatment dates and session count from measures
	var firstVisitDate, lastVisitDate time.Time
	totalSessions := len(measures)
	if totalSessions > 0 {
		// Sort by measured_at ascending to find first and last
		sortedMeasures := make([]*model.OutcomeMeasure, len(measures))
		copy(sortedMeasures, measures)
		sort.Slice(sortedMeasures, func(i, j int) bool {
			return sortedMeasures[i].MeasuredAt.Before(sortedMeasures[j].MeasuredAt)
		})
		firstVisitDate = sortedMeasures[0].MeasuredAt
		lastVisitDate = sortedMeasures[len(sortedMeasures)-1].MeasuredAt
	} else {
		firstVisitDate = plan.CreatedAt
		lastVisitDate = time.Now()
	}

	treatmentDuration := int(lastVisitDate.Sub(firstVisitDate).Hours() / 24)
	if treatmentDuration < 0 {
		treatmentDuration = 0
	}

	// Generate bilingual functional status and prognosis
	functionalStatus, functionalStatusVi := s.generateFunctionalStatus(comparisons)
	prognosis, prognosisVi := s.generatePrognosis(plan.Reason, comparisons)

	summary := &model.DischargeSummary{
		ID:                 uuid.New().String(),
		DischargePlanID:    plan.ID,
		PatientID:          patientID,
		ClinicID:           clinicID,
		TherapistID:        therapistID,
		TotalSessions:      totalSessions,
		TreatmentDuration:  treatmentDuration,
		FirstVisitDate:     firstVisitDate,
		LastVisitDate:      lastVisitDate,
		BaselineComparison: comparisons,
		FunctionalStatus:   functionalStatus,
		FunctionalStatusVi: functionalStatusVi,
		DischargeReason:    plan.Reason,
		Prognosis:          prognosis,
		PrognosisVi:        prognosisVi,
		CreatedBy:          &therapistID,
		UpdatedBy:          &therapistID,
		Plan:               plan,
	}

	if err := s.repo.CreateSummary(ctx, summary); err != nil {
		return nil, fmt.Errorf("failed to create discharge summary: %w", err)
	}

	log.Info().
		Str("summary_id", summary.ID).
		Str("patient_id", patientID).
		Int("total_sessions", totalSessions).
		Int("comparisons", len(comparisons)).
		Msg("discharge summary generated")

	return summary, nil
}

// GetDischargeSummary retrieves a discharge summary by ID.
func (s *dischargeService) GetDischargeSummary(ctx context.Context, id string) (*model.DischargeSummary, error) {
	return s.repo.GetSummaryByID(ctx, id)
}

// CompleteDischarge marks a patient as discharged.
func (s *dischargeService) CompleteDischarge(ctx context.Context, patientID string, dischargeDate time.Time) error {
	if err := s.repo.CompleteDischarge(ctx, patientID, dischargeDate); err != nil {
		return fmt.Errorf("failed to complete discharge: %w", err)
	}

	log.Info().
		Str("patient_id", patientID).
		Time("discharge_date", dischargeDate).
		Msg("patient discharge completed")

	return nil
}

// calculateBaselineComparisons groups measures by type and computes baseline vs discharge comparisons.
func (s *dischargeService) calculateBaselineComparisons(measures []*model.OutcomeMeasure) []model.BaselineComparison {
	// Group by measure type
	measuresByType := make(map[string][]*model.OutcomeMeasure)
	for _, m := range measures {
		key := string(m.MeasureType)
		measuresByType[key] = append(measuresByType[key], m)
	}

	var comparisons []model.BaselineComparison
	for measureType, measurements := range measuresByType {
		if len(measurements) < 2 {
			continue // Need at least baseline and discharge measurement
		}

		// Sort by date ascending
		sort.Slice(measurements, func(i, j int) bool {
			return measurements[i].MeasuredAt.Before(measurements[j].MeasuredAt)
		})

		baseline := measurements[0]
		discharge := measurements[len(measurements)-1]

		change := discharge.Score - baseline.Score
		var changePercent float64
		if math.Abs(baseline.Score) > 0.0001 {
			changePercent = (change / baseline.Score) * 100
		}

		// Determine MCID achievement
		meetsMCID := false
		higherIsBetter := true
		if baseline.Library != nil {
			higherIsBetter = baseline.Library.HigherIsBetter
			if baseline.Library.MCID != nil {
				mcid := *baseline.Library.MCID
				if higherIsBetter {
					meetsMCID = change >= mcid
				} else {
					meetsMCID = -change >= mcid
				}
			}
		}

		// Generate bilingual interpretation
		interpretation, interpretationVi := s.generateComparisonInterpretation(change, changePercent, higherIsBetter)

		// Get measure name from library
		measureName := measureType
		measureNameVi := measureType
		if baseline.Library != nil {
			if baseline.Library.Name != "" {
				measureName = baseline.Library.Name
			}
			if baseline.Library.NameVi != "" {
				measureNameVi = baseline.Library.NameVi
			}
		}

		comparisons = append(comparisons, model.BaselineComparison{
			MeasureName:      measureName,
			MeasureNameVi:    measureNameVi,
			MeasureType:      measureType,
			BaselineValue:    baseline.Score,
			FinalValue:       discharge.Score,
			Change:           change,
			ChangePercent:    changePercent,
			MeetsMCID:        meetsMCID,
			Interpretation:   interpretation,
			InterpretationVi: interpretationVi,
		})
	}

	// Sort comparisons by measure type for consistent ordering
	sort.Slice(comparisons, func(i, j int) bool {
		return comparisons[i].MeasureType < comparisons[j].MeasureType
	})

	return comparisons
}

// generateComparisonInterpretation generates bilingual interpretation for a baseline comparison.
func (s *dischargeService) generateComparisonInterpretation(change, changePercent float64, higherIsBetter bool) (string, string) {
	improved := (higherIsBetter && change > 0) || (!higherIsBetter && change < 0)
	declined := (higherIsBetter && change < 0) || (!higherIsBetter && change > 0)

	absPercent := math.Abs(changePercent)

	if improved {
		if absPercent >= 50 {
			return "Significant improvement", "Cai thien dang ke"
		}
		if absPercent >= 25 {
			return "Moderate improvement", "Cai thien trung binh"
		}
		return "Mild improvement", "Cai thien nhe"
	}

	if declined {
		if absPercent >= 50 {
			return "Significant decline", "Suy giam dang ke"
		}
		if absPercent >= 25 {
			return "Moderate decline", "Suy giam trung binh"
		}
		return "Mild decline", "Suy giam nhe"
	}

	return "No significant change", "Khong thay doi dang ke"
}

// generateFunctionalStatus generates bilingual functional status summary from comparisons.
func (s *dischargeService) generateFunctionalStatus(comparisons []model.BaselineComparison) (string, string) {
	if len(comparisons) == 0 {
		return "Insufficient data for functional status assessment",
			"Khong du du lieu de danh gia tinh trang chuc nang"
	}

	improvedCount := 0
	mcidMetCount := 0
	for _, c := range comparisons {
		if c.Change != 0 {
			// Determine if this is an improvement based on the interpretation field
			if c.Interpretation == "Significant improvement" ||
				c.Interpretation == "Moderate improvement" ||
				c.Interpretation == "Mild improvement" {
				improvedCount++
			}
		}
		if c.MeetsMCID {
			mcidMetCount++
		}
	}

	total := len(comparisons)
	if improvedCount == total {
		return fmt.Sprintf("Patient showed improvement across all %d measured outcomes. %d/%d met clinically meaningful change thresholds.",
				improvedCount, mcidMetCount, total),
			fmt.Sprintf("Benh nhan cho thay su cai thien tren tat ca %d chi so do luong. %d/%d dat nguong thay doi co y nghia lam sang.",
				improvedCount, mcidMetCount, total)
	}

	if improvedCount > 0 {
		return fmt.Sprintf("Patient showed improvement in %d of %d measured outcomes. %d/%d met clinically meaningful change thresholds.",
				improvedCount, total, mcidMetCount, total),
			fmt.Sprintf("Benh nhan cho thay su cai thien trong %d tren %d chi so do luong. %d/%d dat nguong thay doi co y nghia lam sang.",
				improvedCount, total, mcidMetCount, total)
	}

	return "Patient did not show measurable improvement in tracked outcomes.",
		"Benh nhan khong cho thay su cai thien co the do luong trong cac chi so theo doi."
}

// generatePrognosis generates bilingual prognosis based on discharge reason and comparisons.
func (s *dischargeService) generatePrognosis(reason model.DischargeReason, comparisons []model.BaselineComparison) (string, string) {
	switch reason {
	case model.DischargeReasonGoalsMet:
		return "Good prognosis. Treatment goals achieved. Continue home exercise program for maintenance.",
			"Tien luong tot. Dat muc tieu dieu tri. Tiep tuc chuong trinh tap tai nha de duy tri."
	case model.DischargeReasonPlateau:
		return "Fair prognosis. Patient has reached a functional plateau. Home program prescribed for maintenance of current status.",
			"Tien luong kha. Benh nhan da dat dinh chuc nang. Chuong trinh tai nha duoc chi dinh de duy tri tinh trang hien tai."
	case model.DischargeReasonPatientChoice:
		return "Prognosis dependent on continued self-management and adherence to home exercise program.",
			"Tien luong phu thuoc vao viec tu quan ly va tuan thu chuong trinh tap tai nha."
	case model.DischargeReasonReferral:
		return "Prognosis dependent on continued care with receiving provider.",
			"Tien luong phu thuoc vao viec tiep tuc dieu tri voi bac si tiep nhan."
	case model.DischargeReasonNonCompliance:
		return "Guarded prognosis due to non-compliance with treatment plan. Patient educated on importance of follow-through.",
			"Tien luong than trong do khong tuan thu ke hoach dieu tri. Benh nhan da duoc giao duc ve tam quan trong cua viec thuc hien."
	default:
		return "Prognosis to be determined based on ongoing status.",
			"Tien luong can xac dinh dua tren tinh trang dien tien."
	}
}

// buildHomeProgram extracts HEP exercises from the patient's active prescriptions.
func (s *dischargeService) buildHomeProgram(ctx context.Context, patientID string) (*model.DischargeHomeProgram, error) {
	prescriptions, err := s.exercise.GetPatientPrescriptions(ctx, patientID, true)
	if err != nil {
		return nil, fmt.Errorf("failed to get patient prescriptions: %w", err)
	}

	if len(prescriptions) == 0 {
		return nil, nil
	}

	exercises := make([]model.DischargeExercise, 0, len(prescriptions))
	for _, p := range prescriptions {
		ex := model.DischargeExercise{
			ExerciseID: p.ExerciseID,
			Sets:       p.Sets,
			Reps:       p.Reps,
			HoldSeconds: p.HoldSeconds,
		}

		if p.Exercise != nil {
			ex.Name = p.Exercise.Name
			ex.NameVi = p.Exercise.NameVi
			ex.Instructions = p.Exercise.Instructions
			ex.InstructionsVi = p.Exercise.InstructionsVi
		}

		if p.CustomInstructions != "" {
			ex.Instructions = p.CustomInstructions
		}

		exercises = append(exercises, ex)
	}

	return &model.DischargeHomeProgram{
		Exercises:      exercises,
		Frequency:      "Daily / Hang ngay",
		FrequencyVi:    "Hang ngay",
		Duration:       "Ongoing / Lien tuc",
		DurationVi:     "Lien tuc",
		Instructions:   "Perform exercises as prescribed. Stop if pain increases significantly.",
		InstructionsVi: "Thuc hien bai tap theo chi dinh. Dung lai neu dau tang dang ke.",
	}, nil
}
