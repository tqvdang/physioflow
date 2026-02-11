package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	valerr "github.com/tqvdang/physioflow/apps/api/internal/errors"
	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
)

// Protocol duration and frequency validation constants.
const (
	minProtocolDurationWeeks = 4
	maxProtocolDurationWeeks = 12
	minSessionFrequency      = 2
	maxSessionFrequency      = 5
	minHEPExercises          = 3
	maxHEPExercises          = 5
)

// exerciseContraindications maps conditions to exercises that are contraindicated.
var exerciseContraindications = map[string][]string{
	"acute_rotator_cuff_tear":    {"shoulder_abduction", "shoulder_flexion_above_90", "overhead_press"},
	"acute_disc_herniation":      {"trunk_flexion", "sit_ups", "toe_touch"},
	"post_acl_reconstruction":    {"open_chain_knee_extension", "deep_squat", "plyometrics"},
	"acute_ankle_sprain":         {"ankle_inversion", "lateral_hop", "single_leg_balance"},
	"cervical_radiculopathy":     {"cervical_extension", "overhead_lifting"},
	"total_knee_replacement":     {"deep_squat", "kneeling", "high_impact_running"},
	"total_hip_replacement":      {"hip_adduction_past_midline", "hip_flexion_past_90", "internal_rotation"},
	"frozen_shoulder":            {"forced_abduction", "forced_external_rotation"},
}

// ProtocolService defines the interface for clinical protocol business logic.
type ProtocolService interface {
	// Protocol templates
	GetProtocols(ctx context.Context) ([]*model.ClinicalProtocolDB, error)
	GetProtocolByID(ctx context.Context, id string) (*model.ClinicalProtocolDB, error)

	// Patient protocol assignments
	AssignProtocol(ctx context.Context, patientID, therapistID, clinicID string, req *model.AssignProtocolRequestDB) (*model.PatientProtocolDB, error)
	GetPatientProtocols(ctx context.Context, patientID string) ([]*model.PatientProtocolDB, error)
	UpdateProtocolProgress(ctx context.Context, id, therapistID string, req *model.UpdateProgressRequest) (*model.PatientProtocolDB, error)
}

// protocolService implements ProtocolService.
type protocolService struct {
	repo repository.ProtocolRepository
}

// NewProtocolService creates a new protocol service.
func NewProtocolService(repo repository.ProtocolRepository) ProtocolService {
	return &protocolService{repo: repo}
}

// GetProtocols returns all active clinical protocol templates.
func (s *protocolService) GetProtocols(ctx context.Context) ([]*model.ClinicalProtocolDB, error) {
	return s.repo.GetProtocols(ctx)
}

// GetProtocolByID returns a single clinical protocol by ID.
func (s *protocolService) GetProtocolByID(ctx context.Context, id string) (*model.ClinicalProtocolDB, error) {
	return s.repo.GetProtocolByID(ctx, id)
}

// AssignProtocol assigns a clinical protocol to a patient.
func (s *protocolService) AssignProtocol(ctx context.Context, patientID, therapistID, clinicID string, req *model.AssignProtocolRequestDB) (*model.PatientProtocolDB, error) {
	// Validate protocol exists and is active
	protocol, err := s.repo.GetProtocolByID(ctx, req.ProtocolID)
	if err != nil {
		return nil, fmt.Errorf("protocol not found: %w", err)
	}

	if !protocol.IsActive {
		return nil, fmt.Errorf("protocol is not active")
	}

	// Validate protocol duration (4-12 weeks typical)
	if protocol.DurationWeeks < minProtocolDurationWeeks || protocol.DurationWeeks > maxProtocolDurationWeeks {
		log.Warn().
			Int("duration_weeks", protocol.DurationWeeks).
			Str("protocol_id", protocol.ID).
			Msgf("protocol duration %d weeks is outside typical range (%d-%d weeks)",
				protocol.DurationWeeks, minProtocolDurationWeeks, maxProtocolDurationWeeks)
	}

	// Validate session frequency (2-5x/week typical)
	if protocol.FrequencyPerWeek < minSessionFrequency || protocol.FrequencyPerWeek > maxSessionFrequency {
		log.Warn().
			Int("frequency", protocol.FrequencyPerWeek).
			Str("protocol_id", protocol.ID).
			Msgf("session frequency %d/week is outside typical range (%d-%d/week)",
				protocol.FrequencyPerWeek, minSessionFrequency, maxSessionFrequency)
	}

	// Validate protocol eligibility based on diagnosis (if applicable diagnoses are defined)
	if len(protocol.ApplicableDiagnoses) > 0 {
		log.Info().
			Strs("applicable_diagnoses", protocol.ApplicableDiagnoses).
			Str("protocol_id", protocol.ID).
			Msg("protocol has diagnosis eligibility criteria")
		// Note: actual patient diagnosis check requires patient diagnosis data
		// which would be passed in the request or looked up separately
	}

	// Validate home exercise program exercise count
	if len(protocol.Exercises) > 0 {
		// Count exercises marked for the home program phase
		homeExCount := 0
		for _, ex := range protocol.Exercises {
			if ex.Phase == "maintenance" || ex.Phase == "home" {
				homeExCount++
			}
		}
		if homeExCount > 0 && (homeExCount < minHEPExercises || homeExCount > maxHEPExercises) {
			log.Warn().
				Int("hep_count", homeExCount).
				Str("protocol_id", protocol.ID).
				Msgf("home exercise program has %d exercises (recommended: %d-%d)",
					homeExCount, minHEPExercises, maxHEPExercises)
		}
	}

	// Check exercise contraindications
	if len(protocol.Exercises) > 0 {
		for condition, contraindicated := range exerciseContraindications {
			for _, ex := range protocol.Exercises {
				exNameLower := strings.ToLower(ex.Name)
				for _, contra := range contraindicated {
					if strings.Contains(exNameLower, strings.ToLower(contra)) {
						log.Warn().
							Str("exercise", ex.Name).
							Str("condition", condition).
							Str("contraindication", contra).
							Msg("potential exercise contraindication detected")
					}
				}
			}
			_ = condition // used in inner loop
		}
	}

	// Parse optional start date
	now := time.Now()
	assignedDate := now
	var startDate *time.Time
	if req.StartDate != "" {
		parsed, err := time.Parse("2006-01-02", req.StartDate)
		if err != nil {
			return nil, fmt.Errorf("invalid start date format: %w", err)
		}
		startDate = &parsed
	} else {
		startDate = &assignedDate
	}

	// Calculate target end date
	var targetEndDate *time.Time
	if startDate != nil {
		end := startDate.AddDate(0, 0, protocol.DurationWeeks*7)
		targetEndDate = &end
	}

	// Build initial progress notes
	var progressNotes []model.ProgressNote
	if req.Notes != "" {
		progressNotes = append(progressNotes, model.ProgressNote{
			Date:        now.Format(time.RFC3339),
			Note:        req.Notes,
			Phase:       "initial",
			TherapistID: therapistID,
		})
	}

	pp := &model.PatientProtocolDB{
		ID:                patientID, // Will be overwritten below
		PatientID:         patientID,
		ProtocolID:        req.ProtocolID,
		TherapistID:       therapistID,
		ClinicID:          clinicID,
		AssignedDate:      assignedDate,
		StartDate:         startDate,
		TargetEndDate:     targetEndDate,
		ProgressStatus:    "active",
		CurrentPhase:      "initial",
		SessionsCompleted: 0,
		ProgressNotes:     progressNotes,
		Version:           1,
		CreatedBy:         &therapistID,
	}
	pp.ID = uuid.New().String()

	if err := s.repo.AssignProtocol(ctx, pp); err != nil {
		return nil, err
	}

	// Attach protocol summary for the response
	pp.Protocol = &model.ClinicalProtocolSummary{
		ID:               protocol.ID,
		ProtocolName:     protocol.ProtocolName,
		ProtocolNameVi:   protocol.ProtocolNameVi,
		Category:         protocol.Category,
		DurationWeeks:    protocol.DurationWeeks,
		FrequencyPerWeek: protocol.FrequencyPerWeek,
	}

	log.Info().
		Str("patient_protocol_id", pp.ID).
		Str("patient_id", patientID).
		Str("protocol_id", req.ProtocolID).
		Str("therapist_id", therapistID).
		Msg("protocol assigned to patient")

	return pp, nil
}

// GetPatientProtocols returns all protocols assigned to a patient.
func (s *protocolService) GetPatientProtocols(ctx context.Context, patientID string) ([]*model.PatientProtocolDB, error) {
	return s.repo.GetPatientProtocols(ctx, patientID)
}

// UpdateProtocolProgress updates a patient protocol's progress with optimistic locking.
func (s *protocolService) UpdateProtocolProgress(ctx context.Context, id, therapistID string, req *model.UpdateProgressRequest) (*model.PatientProtocolDB, error) {
	// Get current patient protocol
	pp, err := s.repo.GetPatientProtocolByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Version check: the request must carry the version the client last saw
	if pp.Version != req.Version {
		return nil, repository.ErrVersionConflict
	}

	// Apply updates
	if req.ProgressStatus != nil {
		pp.ProgressStatus = *req.ProgressStatus

		// Set actual end date when completing or discontinuing
		if *req.ProgressStatus == "completed" || *req.ProgressStatus == "discontinued" {
			now := time.Now()
			pp.ActualEndDate = &now
		}
	}
	if req.CurrentPhase != nil {
		// Validate progression criteria met before advancing protocol phase
		if pp.CurrentPhase != *req.CurrentPhase {
			newPhase := *req.CurrentPhase
			// Get the protocol to check progression criteria
			protocol, protErr := s.repo.GetProtocolByID(ctx, pp.ProtocolID)
			if protErr == nil && protocol != nil {
				if !s.isPhaseProgressionValid(pp.CurrentPhase, newPhase, pp.SessionsCompleted, protocol) {
					log.Warn().
						Str("current_phase", pp.CurrentPhase).
						Str("new_phase", newPhase).
						Int("sessions_completed", pp.SessionsCompleted).
						Msg("phase progression criteria may not be met")
				}
			}
		}
		pp.CurrentPhase = *req.CurrentPhase
	}
	if req.SessionsCompleted != nil {
		pp.SessionsCompleted = *req.SessionsCompleted
	}

	// Append progress note if provided
	if req.Note != nil && *req.Note != "" {
		note := model.ProgressNote{
			Date:        time.Now().Format(time.RFC3339),
			Note:        *req.Note,
			Phase:       pp.CurrentPhase,
			TherapistID: therapistID,
		}
		if req.NoteVi != nil {
			note.NoteVi = *req.NoteVi
		}
		pp.ProgressNotes = append(pp.ProgressNotes, note)
	}

	// Increment version for optimistic locking
	pp.Version++

	if err := s.repo.UpdateProgress(ctx, pp); err != nil {
		return nil, err
	}

	log.Info().
		Str("patient_protocol_id", id).
		Str("status", pp.ProgressStatus).
		Str("phase", pp.CurrentPhase).
		Int("sessions", pp.SessionsCompleted).
		Int("version", pp.Version).
		Msg("protocol progress updated")

	return pp, nil
}

// phaseOrder defines the expected sequential order of protocol phases.
var phaseOrder = map[string]int{
	"initial":      0,
	"acute":        0,
	"intermediate": 1,
	"subacute":     1,
	"advanced":     2,
	"strengthening": 2,
	"return_to_activity": 3,
	"maintenance":  4,
}

// isPhaseProgressionValid checks if transitioning from currentPhase to newPhase is valid
// based on the protocol's progression criteria and session counts.
func (s *protocolService) isPhaseProgressionValid(currentPhase, newPhase string, sessionsCompleted int, protocol *model.ClinicalProtocolDB) bool {
	currentOrder, currentOK := phaseOrder[currentPhase]
	newOrder, newOK := phaseOrder[newPhase]

	if !currentOK || !newOK {
		return true // Unknown phases, allow progression
	}

	// Cannot skip more than one phase forward
	if newOrder > currentOrder+1 {
		return false
	}

	// Check if protocol has specific phase transition criteria
	if protocol.ProgressionCriteria.PhaseTransitions != nil {
		for _, transition := range protocol.ProgressionCriteria.PhaseTransitions {
			if transition.FromPhase == currentPhase && transition.ToPhase == newPhase {
				// Found a matching transition - check typical week against sessions
				if transition.TypicalWeek > 0 && protocol.FrequencyPerWeek > 0 {
					expectedSessions := transition.TypicalWeek * protocol.FrequencyPerWeek
					if sessionsCompleted < expectedSessions/2 {
						// Less than half expected sessions completed
						return false
					}
				}
				return true
			}
		}
	}

	// Default: require at least some sessions before progressing
	if sessionsCompleted == 0 && newOrder > currentOrder {
		return false
	}

	return true
}

// ValidateProtocolEligibility checks if a patient's diagnosis matches the protocol's applicable diagnoses.
func ValidateProtocolEligibility(protocol *model.ClinicalProtocolDB, patientDiagnosis string) bool {
	if len(protocol.ApplicableDiagnoses) == 0 {
		return true // No restrictions
	}
	diagLower := strings.ToLower(patientDiagnosis)
	for _, d := range protocol.ApplicableDiagnoses {
		if strings.Contains(diagLower, strings.ToLower(d)) {
			return true
		}
	}
	return false
}

// CheckExerciseContraindications checks if any exercises are contraindicated for a condition.
func CheckExerciseContraindications(condition string, exerciseNames []string) []string {
	condLower := strings.ToLower(condition)
	var warnings []string
	for cond, contraindicated := range exerciseContraindications {
		if !strings.Contains(condLower, strings.ReplaceAll(cond, "_", " ")) {
			continue
		}
		for _, exName := range exerciseNames {
			exLower := strings.ToLower(exName)
			for _, contra := range contraindicated {
				if strings.Contains(exLower, strings.ReplaceAll(contra, "_", " ")) {
					warnings = append(warnings, fmt.Sprintf("exercise %q is contraindicated for %s", exName, cond))
				}
			}
		}
	}
	return warnings
}

// Ensure valerr import is used
var _ = valerr.ErrProtocolDurationInvalid
