package model

import "time"

// ROMJoint represents the joint being measured.
type ROMJoint string

const (
	ROMJointShoulder      ROMJoint = "shoulder"
	ROMJointElbow         ROMJoint = "elbow"
	ROMJointWrist         ROMJoint = "wrist"
	ROMJointHip           ROMJoint = "hip"
	ROMJointKnee          ROMJoint = "knee"
	ROMJointAnkle         ROMJoint = "ankle"
	ROMJointCervicalSpine ROMJoint = "cervical_spine"
	ROMJointThoracicSpine ROMJoint = "thoracic_spine"
	ROMJointLumbarSpine   ROMJoint = "lumbar_spine"
)

// ValidROMJoints returns all valid joint values.
func ValidROMJoints() []ROMJoint {
	return []ROMJoint{
		ROMJointShoulder, ROMJointElbow, ROMJointWrist,
		ROMJointHip, ROMJointKnee, ROMJointAnkle,
		ROMJointCervicalSpine, ROMJointThoracicSpine, ROMJointLumbarSpine,
	}
}

// IsValidROMJoint checks whether the given string is a valid joint value.
func IsValidROMJoint(j string) bool {
	for _, v := range ValidROMJoints() {
		if string(v) == j {
			return true
		}
	}
	return false
}

// ROMSide represents the side of the body.
type ROMSide string

const (
	ROMSideLeft      ROMSide = "left"
	ROMSideRight     ROMSide = "right"
	ROMSideBilateral ROMSide = "bilateral"
)

// ROMMovementType represents the type of ROM measurement.
type ROMMovementType string

const (
	ROMMovementActive  ROMMovementType = "active"
	ROMMovementPassive ROMMovementType = "passive"
)

// ROMAssessment represents a single ROM measurement for a patient.
type ROMAssessment struct {
	ID           string          `json:"id" db:"id"`
	PatientID    string          `json:"patient_id" db:"patient_id" validate:"required,uuid"`
	VisitID      *string         `json:"visit_id,omitempty" db:"visit_id"`
	ClinicID     string          `json:"clinic_id" db:"clinic_id" validate:"required,uuid"`
	TherapistID  string          `json:"therapist_id" db:"therapist_id" validate:"required,uuid"`
	Joint        ROMJoint        `json:"joint" db:"joint" validate:"required"`
	Side         ROMSide         `json:"side" db:"side" validate:"required"`
	MovementType ROMMovementType `json:"movement_type" db:"movement_type" validate:"required"`
	Degree       float64         `json:"degree" db:"degree" validate:"gte=0,lte=360"`
	Notes        string          `json:"notes,omitempty" db:"notes"`
	AssessedAt   time.Time       `json:"assessed_at" db:"assessed_at"`
	CreatedAt    time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at" db:"updated_at"`
}

// CreateROMAssessmentRequest represents the request body for recording a ROM measurement.
type CreateROMAssessmentRequest struct {
	PatientID    string `json:"patient_id" validate:"required,uuid"`
	VisitID      string `json:"visit_id" validate:"omitempty,uuid"`
	Joint        string `json:"joint" validate:"required,oneof=shoulder elbow wrist hip knee ankle cervical_spine thoracic_spine lumbar_spine"`
	Side         string `json:"side" validate:"required,oneof=left right bilateral"`
	MovementType string `json:"movement_type" validate:"required,oneof=active passive"`
	Degree       float64 `json:"degree" validate:"gte=0,lte=360"`
	Notes        string `json:"notes" validate:"max=2000"`
	AssessedAt   string `json:"assessed_at" validate:"omitempty,datetime=2006-01-02T15:04:05Z07:00"`
}

// ROMTrendingData represents ROM measurement history over time for a specific joint.
type ROMTrendingData struct {
	PatientID    string              `json:"patient_id"`
	Joint        ROMJoint            `json:"joint"`
	Side         ROMSide             `json:"side"`
	MovementType ROMMovementType     `json:"movement_type"`
	DataPoints   []ROMTrendDataPoint `json:"data_points"`
	Baseline     *float64            `json:"baseline,omitempty"`
	Current      *float64            `json:"current,omitempty"`
	Change       *float64            `json:"change,omitempty"`
	Trend        TrendDirection      `json:"trend"`
}

// ROMTrendDataPoint represents a single data point in a ROM trend.
type ROMTrendDataPoint struct {
	Degree     float64   `json:"degree"`
	AssessedAt time.Time `json:"assessed_at"`
	Notes      string    `json:"notes,omitempty"`
}

// NormalROMRanges returns the expected normal ROM range (in degrees) for each joint.
// These are approximate clinical norms for reference; actual values vary by movement.
var NormalROMRanges = map[ROMJoint]float64{
	ROMJointShoulder:      180,
	ROMJointElbow:         150,
	ROMJointWrist:         80,
	ROMJointHip:           120,
	ROMJointKnee:          135,
	ROMJointAnkle:         50,
	ROMJointCervicalSpine: 80,
	ROMJointThoracicSpine: 40,
	ROMJointLumbarSpine:   60,
}
