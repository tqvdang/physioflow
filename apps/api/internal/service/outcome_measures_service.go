package service

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
)

// OutcomeMeasuresService defines the interface for outcome measures business logic.
type OutcomeMeasuresService interface {
	RecordMeasure(ctx context.Context, clinicID, therapistID string, req *model.CreateOutcomeMeasureRequest) (*model.OutcomeMeasure, error)
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

	// Calculate percentage
	var percentage *float64
	if lib.MaxScore != lib.MinScore {
		pct := ((score - lib.MinScore) / (lib.MaxScore - lib.MinScore)) * 100
		percentage = &pct
	}

	// Generate interpretation
	interpretation := s.interpretScore(score, lib)

	// Parse measured_at or default to now
	measuredAt := time.Now()
	if req.MeasuredAt != "" {
		parsed, err := time.Parse(time.RFC3339, req.MeasuredAt)
		if err != nil {
			return nil, fmt.Errorf("invalid measured_at format: %w", err)
		}
		measuredAt = parsed
	}

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
