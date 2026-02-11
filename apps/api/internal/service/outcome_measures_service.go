package service

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	valerr "github.com/tqvdang/physioflow/apps/api/internal/errors"
	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
)

// mcidThresholds maps measure types to their Minimal Clinically Important Difference values.
var mcidThresholds = map[model.MeasureType]float64{
	model.MeasureTypeVAS:  2.0,
	model.MeasureTypeNRS:  2.0,
	model.MeasureTypeNDI:  10.0,
	model.MeasureTypeODI:  10.0,
	model.MeasureTypeLEFS: 9.0,
	model.MeasureTypeDASH: 10.0,
	model.MeasureTypeKOOS: 10.0,
	model.MeasureTypeWOMAC: 10.0,
	model.MeasureTypeBBS:  6.0,
	model.MeasureTypeFIM:  22.0,
}

// scoreRanges maps measure types to their valid (min, max) score ranges.
var scoreRanges = map[model.MeasureType][2]float64{
	model.MeasureTypeVAS:  {0, 10},
	model.MeasureTypeNRS:  {0, 10},
	model.MeasureTypeNDI:  {0, 100},
	model.MeasureTypeODI:  {0, 100},
	model.MeasureTypeDASH: {0, 100},
	model.MeasureTypeLEFS: {0, 80},
	model.MeasureTypeKOOS: {0, 100},
	model.MeasureTypeWOMAC: {0, 100},
	model.MeasureTypeBBS:  {0, 56},
	model.MeasureTypeSF36: {0, 100},
	model.MeasureTypeFIM:  {18, 126},
	model.MeasureTypeMMT:  {0, 5},
	model.MeasureTypeROM:  {0, 360},
}

// measureBodyRegions maps measure types to their applicable body regions for condition matching.
var measureBodyRegions = map[model.MeasureType][]string{
	model.MeasureTypeNDI:  {"cervical_spine", "neck"},
	model.MeasureTypeODI:  {"lumbar_spine", "lower_back"},
	model.MeasureTypeDASH: {"shoulder", "elbow", "wrist", "hand", "upper_extremity"},
	model.MeasureTypeLEFS: {"hip", "knee", "ankle", "foot", "lower_extremity"},
	model.MeasureTypeKOOS: {"knee"},
	model.MeasureTypeWOMAC: {"hip", "knee"},
}

// minReassessmentInterval is the minimum duration between measurements of the same type.
const minReassessmentInterval = 14 * 24 * time.Hour // 2 weeks

// ValidateMCIDThreshold checks if a score change meets the MCID for the given measure type.
func ValidateMCIDThreshold(measureType model.MeasureType, change float64) (bool, error) {
	mcid, exists := mcidThresholds[measureType]
	if !exists {
		return false, fmt.Errorf("unknown measure type for MCID: %s", measureType)
	}
	return math.Abs(change) >= mcid, nil
}

// ValidateScoreRange checks if a score falls within the valid range for its measure type.
func ValidateScoreRange(measureType model.MeasureType, score float64) error {
	r, exists := scoreRanges[measureType]
	if !exists {
		// Unknown measure type - allow any score (custom measures)
		return nil
	}
	if score < r[0] || score > r[1] {
		return valerr.NewValidationErrorf(
			"OUTCOME_INVALID_SCORE_RANGE",
			"score %.1f is outside valid range [%.0f-%.0f] for %s",
			"Diem %.1f nam ngoai pham vi hop le [%.0f-%.0f] cho %s",
			score, r[0], r[1], measureType,
		)
	}
	return nil
}

// ValidateMeasureTypeForCondition checks if the chosen measure type is appropriate
// for the patient's body region.
func ValidateMeasureTypeForCondition(measureType model.MeasureType, bodyRegion string) bool {
	regions, exists := measureBodyRegions[measureType]
	if !exists {
		// Global measures (VAS, NRS, SF36, BBS, FIM) apply to all conditions
		return true
	}
	if bodyRegion == "" {
		return true // No body region specified, allow
	}
	for _, r := range regions {
		if r == bodyRegion {
			return true
		}
	}
	return false
}

// OutcomeMeasuresService defines the interface for outcome measures business logic.
type OutcomeMeasuresService interface {
	RecordMeasure(ctx context.Context, clinicID, therapistID string, req *model.CreateOutcomeMeasureRequest) (*model.OutcomeMeasure, error)
	UpdateMeasure(ctx context.Context, clinicID, therapistID string, req *model.UpdateOutcomeMeasureRequest) (*model.OutcomeMeasure, error)
	DeleteMeasure(ctx context.Context, patientID, measureID, userID string) error
	GetPatientMeasures(ctx context.Context, patientID string) ([]*model.OutcomeMeasure, error)
	CalculateProgress(ctx context.Context, patientID string, measureType model.MeasureType) (*model.ProgressCalculation, error)
	GetTrending(ctx context.Context, patientID string, measureType model.MeasureType) (*model.TrendingData, error)
	GetMeasureLibrary(ctx context.Context) ([]*model.OutcomeMeasureLibrary, error)
}

// outcomeMeasuresService implements OutcomeMeasuresService.
type outcomeMeasuresService struct {
	repo repository.OutcomeMeasuresRepository
}

// NewOutcomeMeasuresService creates a new outcome measures service.
func NewOutcomeMeasuresService(repo repository.OutcomeMeasuresRepository) OutcomeMeasuresService {
	return &outcomeMeasuresService{repo: repo}
}

// RecordMeasure records a new outcome measure for a patient.
func (s *outcomeMeasuresService) RecordMeasure(ctx context.Context, clinicID, therapistID string, req *model.CreateOutcomeMeasureRequest) (*model.OutcomeMeasure, error) {
	// Look up the library entry to get scoring details
	lib, err := s.repo.GetLibraryByID(ctx, req.LibraryID)
	if err != nil {
		return nil, fmt.Errorf("outcome measure library entry not found: %w", err)
	}

	// Calculate the total score from responses
	score := s.calculateScore(req.Responses, lib)

	// Validate score within valid range for this measure type
	if err := ValidateScoreRange(lib.MeasureType, score); err != nil {
		return nil, err
	}

	// Also validate the score against the library-defined range
	if score < lib.MinScore || score > lib.MaxScore {
		return nil, valerr.NewValidationErrorf(
			"OUTCOME_INVALID_SCORE_RANGE",
			"score %.1f is outside library range [%.0f-%.0f]",
			"Diem %.1f nam ngoai pham vi thu vien [%.0f-%.0f]",
			score, lib.MinScore, lib.MaxScore,
		)
	}

	// Parse measured_at or default to now
	measuredAt := time.Now()
	if req.MeasuredAt != "" {
		parsed, err := time.Parse(time.RFC3339, req.MeasuredAt)
		if err != nil {
			return nil, fmt.Errorf("invalid measured_at format: %w", err)
		}
		measuredAt = parsed
	}

	// Get existing measures for this patient and type to validate sequencing
	existingMeasures, err := s.repo.GetByPatientAndType(ctx, req.PatientID, lib.MeasureType)
	if err != nil {
		log.Warn().Err(err).Msg("failed to fetch existing measures for validation")
		// Non-fatal: continue with recording
	}

	if existingMeasures != nil && len(existingMeasures) > 0 {
		// Validate re-assessment interval minimum (2 weeks between measurements)
		lastMeasure := existingMeasures[len(existingMeasures)-1]
		if measuredAt.Sub(lastMeasure.MeasuredAt) < minReassessmentInterval {
			return nil, valerr.NewValidationErrorf(
				"OUTCOME_REASSESSMENT_TOO_SOON",
				"last %s measurement was on %s; minimum 2 weeks between re-assessments",
				"Lan do %s cuoi cung vao %s; can toi thieu 2 tuan giua cac lan tai danh gia",
				lib.MeasureType, lastMeasure.MeasuredAt.Format("2006-01-02"),
			)
		}
	}

	// Validate target score is realistic (not > maximum possible score)
	// This is checked against the library max score which is already defined

	// Validate measure type matches patient condition (body region)
	if lib.BodyRegion != nil && *lib.BodyRegion != "" {
		if !ValidateMeasureTypeForCondition(lib.MeasureType, *lib.BodyRegion) {
			log.Warn().
				Str("measure_type", string(lib.MeasureType)).
				Str("body_region", *lib.BodyRegion).
				Msg("measure type may not match patient body region")
		}
	}

	// Calculate percentage
	var percentage *float64
	if lib.MaxScore != lib.MinScore {
		pct := ((score - lib.MinScore) / (lib.MaxScore - lib.MinScore)) * 100
		percentage = &pct
	}

	// Generate interpretation
	interpretation := s.interpretScore(score, lib)

	var sessionID *string
	if req.SessionID != "" {
		sessionID = &req.SessionID
	}

	measure := &model.OutcomeMeasure{
		ID:             uuid.New().String(),
		PatientID:      req.PatientID,
		ClinicID:       clinicID,
		TherapistID:    therapistID,
		LibraryID:      req.LibraryID,
		MeasureType:    lib.MeasureType,
		SessionID:      sessionID,
		Score:          score,
		MaxPossible:    lib.MaxScore,
		Percentage:     percentage,
		Responses:      req.Responses,
		Interpretation: interpretation,
		Notes:          req.Notes,
		MeasuredAt:     measuredAt,
		CreatedBy:      &therapistID,
		UpdatedBy:      &therapistID,
	}

	if err := s.repo.Create(ctx, measure); err != nil {
		return nil, err
	}

	// Attach library info for the response
	measure.Library = lib

	log.Info().
		Str("measure_id", measure.ID).
		Str("patient_id", measure.PatientID).
		Str("measure_type", string(measure.MeasureType)).
		Float64("score", measure.Score).
		Str("therapist_id", therapistID).
		Msg("outcome measure recorded")

	return measure, nil
}

// UpdateMeasure updates an existing outcome measure.
func (s *outcomeMeasuresService) UpdateMeasure(ctx context.Context, clinicID, therapistID string, req *model.UpdateOutcomeMeasureRequest) (*model.OutcomeMeasure, error) {
	// Get existing measure
	measure, err := s.repo.GetByID(ctx, req.MeasureID)
	if err != nil {
		return nil, err
	}

	// Verify patient ownership
	if measure.PatientID != req.PatientID {
		return nil, fmt.Errorf("measure does not belong to patient")
	}

	// Verify clinic ownership
	if measure.ClinicID != clinicID {
		return nil, fmt.Errorf("measure does not belong to clinic")
	}

	// Update fields if provided
	if req.Responses != nil {
		// Recalculate score with new responses
		lib, err := s.repo.GetLibraryByID(ctx, measure.LibraryID)
		if err != nil {
			return nil, fmt.Errorf("failed to get library entry: %w", err)
		}

		score := s.calculateScore(*req.Responses, lib)
		measure.Score = score
		measure.Responses = *req.Responses

		// Recalculate percentage
		if lib.MaxScore != lib.MinScore {
			pct := ((score - lib.MinScore) / (lib.MaxScore - lib.MinScore)) * 100
			measure.Percentage = &pct
		}

		// Regenerate interpretation
		measure.Interpretation = s.interpretScore(score, lib)
	}

	if req.Notes != nil {
		measure.Notes = *req.Notes
	}

	if req.MeasuredAt != nil {
		measuredAt, err := time.Parse(time.RFC3339, *req.MeasuredAt)
		if err != nil {
			return nil, fmt.Errorf("invalid measured_at format: %w", err)
		}
		measure.MeasuredAt = measuredAt
	}

	measure.UpdatedBy = &therapistID

	if err := s.repo.Update(ctx, measure); err != nil {
		return nil, err
	}

	// Attach library info for the response
	lib, _ := s.repo.GetLibraryByID(ctx, measure.LibraryID)
	measure.Library = lib

	log.Info().
		Str("measure_id", measure.ID).
		Str("patient_id", measure.PatientID).
		Str("updated_by", therapistID).
		Msg("outcome measure updated")

	return measure, nil
}

// DeleteMeasure deletes an outcome measure.
func (s *outcomeMeasuresService) DeleteMeasure(ctx context.Context, patientID, measureID, userID string) error {
	// Get existing measure to verify ownership
	measure, err := s.repo.GetByID(ctx, measureID)
	if err != nil {
		return err
	}

	// Verify patient ownership
	if measure.PatientID != patientID {
		return fmt.Errorf("measure does not belong to patient")
	}

	if err := s.repo.Delete(ctx, measureID); err != nil {
		return err
	}

	log.Info().
		Str("measure_id", measureID).
		Str("patient_id", patientID).
		Str("deleted_by", userID).
		Msg("outcome measure deleted")

	return nil
}

// calculateScore calculates the total score from individual responses.
func (s *outcomeMeasuresService) calculateScore(responses []model.MeasureResponse, lib *model.OutcomeMeasureLibrary) float64 {
	if len(responses) == 0 {
		return 0
	}

	method := "sum"
	if lib.ScoringMethod != nil {
		method = lib.ScoringMethod.Method
	}

	var total float64
	for _, r := range responses {
		total += r.Value
	}

	switch method {
	case "average":
		return total / float64(len(responses))
	case "sum":
		return total
	default:
		return total
	}
}

// interpretScore generates a clinical interpretation based on the score and library definition.
func (s *outcomeMeasuresService) interpretScore(score float64, lib *model.OutcomeMeasureLibrary) *model.MeasureInterpretation {
	scoreRange := lib.MaxScore - lib.MinScore
	if scoreRange <= 0 {
		return nil
	}

	// Normalize score to a 0-100 scale for interpretation
	normalizedPct := ((score - lib.MinScore) / scoreRange) * 100

	// For measures where lower is better (e.g. pain scales), invert
	if !lib.HigherIsBetter {
		normalizedPct = 100 - normalizedPct
	}

	var severity, severityVi, desc, descVi string

	switch {
	case normalizedPct >= 75:
		severity = "minimal"
		severityVi = "Toi thieu"
		desc = "Minimal impairment"
		descVi = "Suy giam toi thieu"
	case normalizedPct >= 50:
		severity = "mild"
		severityVi = "Nhe"
		desc = "Mild impairment"
		descVi = "Suy giam nhe"
	case normalizedPct >= 25:
		severity = "moderate"
		severityVi = "Trung binh"
		desc = "Moderate impairment"
		descVi = "Suy giam trung binh"
	default:
		severity = "severe"
		severityVi = "Nang"
		desc = "Severe impairment"
		descVi = "Suy giam nang"
	}

	return &model.MeasureInterpretation{
		Severity:      severity,
		SeverityVi:    severityVi,
		Description:   desc,
		DescriptionVi: descVi,
	}
}

// GetPatientMeasures retrieves all outcome measures for a patient.
func (s *outcomeMeasuresService) GetPatientMeasures(ctx context.Context, patientID string) ([]*model.OutcomeMeasure, error) {
	return s.repo.GetByPatientID(ctx, patientID)
}

// CalculateProgress calculates the progress for a patient on a specific measure type.
// Formula: progressPercent = ((currentScore - baselineScore) / (targetScore - baselineScore)) * 100
// MCID detection: changeFromBaseline >= mcidThreshold
func (s *outcomeMeasuresService) CalculateProgress(ctx context.Context, patientID string, measureType model.MeasureType) (*model.ProgressCalculation, error) {
	measures, err := s.repo.GetByPatientAndType(ctx, patientID, measureType)
	if err != nil {
		return nil, err
	}

	if len(measures) == 0 {
		return nil, fmt.Errorf("no measures found for patient %s with type %s", patientID, measureType)
	}

	// Measures are ordered ASC by measured_at from the repository
	baseline := measures[0]
	current := measures[len(measures)-1]

	// Determine the library info
	var libraryID string
	var mcidThreshold float64
	var higherIsBetter bool
	var targetScore float64

	if baseline.Library != nil {
		libraryID = baseline.Library.ID
		higherIsBetter = baseline.Library.HigherIsBetter
		if baseline.Library.MCID != nil {
			mcidThreshold = *baseline.Library.MCID
		}
		// Target is the best possible score
		if higherIsBetter {
			targetScore = baseline.Library.MaxScore
		} else {
			targetScore = baseline.Library.MinScore
		}
	}

	calc := &model.ProgressCalculation{
		PatientID:         patientID,
		MeasureType:       measureType,
		LibraryID:         libraryID,
		CurrentScore:      current.Score,
		TotalMeasurements: len(measures),
		CalculatedAt:      time.Now(),
	}

	// Set baseline
	baselineScore := baseline.Score
	calc.BaselineScore = &baselineScore

	// Set previous score (second to last if more than one measure)
	if len(measures) >= 2 {
		prevScore := measures[len(measures)-2].Score
		calc.PreviousScore = &prevScore
	}

	// Calculate change from baseline
	changeFromBaseline := current.Score - baselineScore
	calc.Change = &changeFromBaseline

	// Calculate progress percentage: ((current - baseline) / (target - baseline)) * 100
	denominator := targetScore - baselineScore
	if math.Abs(denominator) < 0.0001 {
		// Avoid division by zero: target equals baseline
		zeroProgress := 0.0
		calc.ChangePercent = &zeroProgress
	} else {
		progressPercent := (changeFromBaseline / denominator) * 100
		calc.ChangePercent = &progressPercent
	}

	// Determine MCID achievement
	if mcidThreshold > 0 {
		var metMCID bool
		if higherIsBetter {
			metMCID = changeFromBaseline >= mcidThreshold
		} else {
			// For pain scales, improvement means the score decreased
			metMCID = -changeFromBaseline >= mcidThreshold
		}
		calc.MeetsMinChange = &metMCID
	}

	// Determine trend direction
	if len(measures) < 2 {
		calc.Trend = model.TrendInsuffData
	} else {
		if higherIsBetter {
			if changeFromBaseline > 0 {
				calc.Trend = model.TrendImproved
			} else if changeFromBaseline < 0 {
				calc.Trend = model.TrendDeclined
			} else {
				calc.Trend = model.TrendStable
			}
		} else {
			if changeFromBaseline < 0 {
				calc.Trend = model.TrendImproved
			} else if changeFromBaseline > 0 {
				calc.Trend = model.TrendDeclined
			} else {
				calc.Trend = model.TrendStable
			}
		}
	}

	return calc, nil
}

// GetTrending retrieves trending data for a patient and measure type.
func (s *outcomeMeasuresService) GetTrending(ctx context.Context, patientID string, measureType model.MeasureType) (*model.TrendingData, error) {
	return s.repo.GetTrending(ctx, patientID, measureType)
}

// GetMeasureLibrary retrieves all available outcome measure definitions.
func (s *outcomeMeasuresService) GetMeasureLibrary(ctx context.Context) ([]*model.OutcomeMeasureLibrary, error) {
	return s.repo.GetLibrary(ctx)
}
