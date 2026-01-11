package model

import (
	"time"
)

// ExerciseCategory represents the category of an exercise.
type ExerciseCategory string

const (
	ExerciseCategoryStretching     ExerciseCategory = "stretching"
	ExerciseCategoryStrengthening  ExerciseCategory = "strengthening"
	ExerciseCategoryBalance        ExerciseCategory = "balance"
	ExerciseCategoryCardiovascular ExerciseCategory = "cardiovascular"
	ExerciseCategoryMobility       ExerciseCategory = "mobility"
	ExerciseCategoryPostural       ExerciseCategory = "postural"
)

// ExerciseDifficulty represents the difficulty level of an exercise.
type ExerciseDifficulty string

const (
	ExerciseDifficultyBeginner     ExerciseDifficulty = "beginner"
	ExerciseDifficultyIntermediate ExerciseDifficulty = "intermediate"
	ExerciseDifficultyAdvanced     ExerciseDifficulty = "advanced"
)

// MuscleGroup represents targeted muscle groups.
type MuscleGroup string

const (
	MuscleGroupNeck          MuscleGroup = "neck"
	MuscleGroupShoulder      MuscleGroup = "shoulder"
	MuscleGroupUpperBack     MuscleGroup = "upper_back"
	MuscleGroupLowerBack     MuscleGroup = "lower_back"
	MuscleGroupChest         MuscleGroup = "chest"
	MuscleGroupCore          MuscleGroup = "core"
	MuscleGroupHip           MuscleGroup = "hip"
	MuscleGroupGlutes        MuscleGroup = "glutes"
	MuscleGroupQuadriceps    MuscleGroup = "quadriceps"
	MuscleGroupHamstrings    MuscleGroup = "hamstrings"
	MuscleGroupCalves        MuscleGroup = "calves"
	MuscleGroupAnkle         MuscleGroup = "ankle"
	MuscleGroupWristForearm  MuscleGroup = "wrist_forearm"
	MuscleGroupElbow         MuscleGroup = "elbow"
	MuscleGroupFullBody      MuscleGroup = "full_body"
)

// PrescriptionStatus represents the status of an exercise prescription.
type PrescriptionStatus string

const (
	PrescriptionStatusActive    PrescriptionStatus = "active"
	PrescriptionStatusCompleted PrescriptionStatus = "completed"
	PrescriptionStatusPaused    PrescriptionStatus = "paused"
	PrescriptionStatusCancelled PrescriptionStatus = "cancelled"
)

// Exercise represents an exercise in the library.
type Exercise struct {
	ID              string             `json:"id" db:"id"`
	ClinicID        *string            `json:"clinic_id,omitempty" db:"clinic_id"`
	Name            string             `json:"name" db:"name"`
	NameVi          string             `json:"name_vi" db:"name_vi"`
	Description     string             `json:"description" db:"description"`
	DescriptionVi   string             `json:"description_vi" db:"description_vi"`
	Instructions    string             `json:"instructions" db:"instructions"`
	InstructionsVi  string             `json:"instructions_vi" db:"instructions_vi"`
	Category        ExerciseCategory   `json:"category" db:"category"`
	Difficulty      ExerciseDifficulty `json:"difficulty" db:"difficulty"`
	Equipment       []string           `json:"equipment" db:"equipment"`
	MuscleGroups    []MuscleGroup      `json:"muscle_groups" db:"muscle_groups"`
	ImageURL        string             `json:"image_url,omitempty" db:"image_url"`
	VideoURL        string             `json:"video_url,omitempty" db:"video_url"`
	ThumbnailURL    string             `json:"thumbnail_url,omitempty" db:"thumbnail_url"`
	DefaultSets     int                `json:"default_sets" db:"default_sets"`
	DefaultReps     int                `json:"default_reps" db:"default_reps"`
	DefaultHoldSecs int                `json:"default_hold_secs" db:"default_hold_secs"`
	DefaultDuration int                `json:"default_duration_mins" db:"default_duration_mins"`
	Precautions     string             `json:"precautions,omitempty" db:"precautions"`
	PrecautionsVi   string             `json:"precautions_vi,omitempty" db:"precautions_vi"`
	IsGlobal        bool               `json:"is_global" db:"is_global"`
	IsActive        bool               `json:"is_active" db:"is_active"`
	CreatedAt       time.Time          `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time          `json:"updated_at" db:"updated_at"`
	CreatedBy       *string            `json:"created_by,omitempty" db:"created_by"`
}

// ExercisePrescription represents an exercise prescribed to a patient.
type ExercisePrescription struct {
	ID                 string             `json:"id" db:"id"`
	PatientID          string             `json:"patient_id" db:"patient_id"`
	ExerciseID         string             `json:"exercise_id" db:"exercise_id"`
	ClinicID           string             `json:"clinic_id" db:"clinic_id"`
	PrescribedBy       string             `json:"prescribed_by" db:"prescribed_by"`
	ProgramID          *string            `json:"program_id,omitempty" db:"program_id"`
	Sets               int                `json:"sets" db:"sets"`
	Reps               int                `json:"reps" db:"reps"`
	HoldSeconds        int                `json:"hold_seconds" db:"hold_seconds"`
	Frequency          string             `json:"frequency" db:"frequency"`
	DurationWeeks      int                `json:"duration_weeks" db:"duration_weeks"`
	CustomInstructions string             `json:"custom_instructions,omitempty" db:"custom_instructions"`
	Notes              string             `json:"notes,omitempty" db:"notes"`
	Status             PrescriptionStatus `json:"status" db:"status"`
	StartDate          time.Time          `json:"start_date" db:"start_date"`
	EndDate            *time.Time         `json:"end_date,omitempty" db:"end_date"`
	CreatedAt          time.Time          `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time          `json:"updated_at" db:"updated_at"`

	// Joined fields for response
	Exercise *Exercise `json:"exercise,omitempty" db:"-"`
}

// HomeExerciseProgram represents a collection of exercises for a patient.
type HomeExerciseProgram struct {
	ID            string    `json:"id" db:"id"`
	PatientID     string    `json:"patient_id" db:"patient_id"`
	ClinicID      string    `json:"clinic_id" db:"clinic_id"`
	CreatedBy     string    `json:"created_by" db:"created_by"`
	Name          string    `json:"name" db:"name"`
	NameVi        string    `json:"name_vi,omitempty" db:"name_vi"`
	Description   string    `json:"description,omitempty" db:"description"`
	DescriptionVi string    `json:"description_vi,omitempty" db:"description_vi"`
	Frequency     string    `json:"frequency" db:"frequency"`
	DurationWeeks int       `json:"duration_weeks" db:"duration_weeks"`
	StartDate     time.Time `json:"start_date" db:"start_date"`
	EndDate       *time.Time `json:"end_date,omitempty" db:"end_date"`
	IsActive      bool      `json:"is_active" db:"is_active"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`

	// Joined fields
	Exercises []ExercisePrescription `json:"exercises,omitempty" db:"-"`
}

// ExerciseComplianceLog tracks patient exercise completion.
type ExerciseComplianceLog struct {
	ID             string    `json:"id" db:"id"`
	PrescriptionID string    `json:"prescription_id" db:"prescription_id"`
	PatientID      string    `json:"patient_id" db:"patient_id"`
	CompletedAt    time.Time `json:"completed_at" db:"completed_at"`
	SetsCompleted  int       `json:"sets_completed" db:"sets_completed"`
	RepsCompleted  int       `json:"reps_completed" db:"reps_completed"`
	PainLevel      *int      `json:"pain_level,omitempty" db:"pain_level"`
	Difficulty     string    `json:"difficulty,omitempty" db:"difficulty"`
	Notes          string    `json:"notes,omitempty" db:"notes"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}

// ExerciseSearchParams represents search and filter parameters for exercises.
type ExerciseSearchParams struct {
	ClinicID     string             `query:"clinic_id"`
	Search       string             `query:"search"`
	Category     ExerciseCategory   `query:"category"`
	Difficulty   ExerciseDifficulty `query:"difficulty"`
	MuscleGroups []MuscleGroup      `query:"muscle_groups"`
	Equipment    []string           `query:"equipment"`
	IsActive     *bool              `query:"is_active"`
	SortBy       string             `query:"sort_by"`
	SortOrder    string             `query:"sort_order"`
	Page         int                `query:"page"`
	PerPage      int                `query:"per_page"`
}

// NewExerciseSearchParams creates ExerciseSearchParams with default values.
func NewExerciseSearchParams() ExerciseSearchParams {
	isActive := true
	return ExerciseSearchParams{
		IsActive:  &isActive,
		SortBy:    "name",
		SortOrder: "asc",
		Page:      1,
		PerPage:   20,
	}
}

// Offset calculates the offset for pagination.
func (p ExerciseSearchParams) Offset() int {
	return (p.Page - 1) * p.Limit()
}

// Limit returns the number of items per page.
func (p ExerciseSearchParams) Limit() int {
	if p.PerPage <= 0 {
		return 20
	}
	if p.PerPage > 100 {
		return 100
	}
	return p.PerPage
}

// ExerciseListResponse represents a paginated list of exercises.
type ExerciseListResponse struct {
	Data       []Exercise `json:"data"`
	Total      int64      `json:"total"`
	Page       int        `json:"page"`
	PerPage    int        `json:"per_page"`
	TotalPages int        `json:"total_pages"`
}

// CreateExerciseRequest represents the request body for creating an exercise.
type CreateExerciseRequest struct {
	Name            string   `json:"name" validate:"required,max=200"`
	NameVi          string   `json:"name_vi" validate:"required,max=200"`
	Description     string   `json:"description" validate:"max=2000"`
	DescriptionVi   string   `json:"description_vi" validate:"max=2000"`
	Instructions    string   `json:"instructions" validate:"max=5000"`
	InstructionsVi  string   `json:"instructions_vi" validate:"max=5000"`
	Category        string   `json:"category" validate:"required,oneof=stretching strengthening balance cardiovascular mobility postural"`
	Difficulty      string   `json:"difficulty" validate:"required,oneof=beginner intermediate advanced"`
	Equipment       []string `json:"equipment" validate:"dive,max=100"`
	MuscleGroups    []string `json:"muscle_groups" validate:"required,dive,max=50"`
	ImageURL        string   `json:"image_url" validate:"omitempty,url,max=500"`
	VideoURL        string   `json:"video_url" validate:"omitempty,url,max=500"`
	DefaultSets     int      `json:"default_sets" validate:"min=0,max=20"`
	DefaultReps     int      `json:"default_reps" validate:"min=0,max=100"`
	DefaultHoldSecs int      `json:"default_hold_secs" validate:"min=0,max=300"`
	Precautions     string   `json:"precautions" validate:"max=2000"`
	PrecautionsVi   string   `json:"precautions_vi" validate:"max=2000"`
}

// UpdateExerciseRequest represents the request body for updating an exercise.
type UpdateExerciseRequest struct {
	Name            *string  `json:"name" validate:"omitempty,max=200"`
	NameVi          *string  `json:"name_vi" validate:"omitempty,max=200"`
	Description     *string  `json:"description" validate:"omitempty,max=2000"`
	DescriptionVi   *string  `json:"description_vi" validate:"omitempty,max=2000"`
	Instructions    *string  `json:"instructions" validate:"omitempty,max=5000"`
	InstructionsVi  *string  `json:"instructions_vi" validate:"omitempty,max=5000"`
	Category        *string  `json:"category" validate:"omitempty,oneof=stretching strengthening balance cardiovascular mobility postural"`
	Difficulty      *string  `json:"difficulty" validate:"omitempty,oneof=beginner intermediate advanced"`
	Equipment       []string `json:"equipment" validate:"omitempty,dive,max=100"`
	MuscleGroups    []string `json:"muscle_groups" validate:"omitempty,dive,max=50"`
	ImageURL        *string  `json:"image_url" validate:"omitempty,url,max=500"`
	VideoURL        *string  `json:"video_url" validate:"omitempty,url,max=500"`
	DefaultSets     *int     `json:"default_sets" validate:"omitempty,min=0,max=20"`
	DefaultReps     *int     `json:"default_reps" validate:"omitempty,min=0,max=100"`
	DefaultHoldSecs *int     `json:"default_hold_secs" validate:"omitempty,min=0,max=300"`
	Precautions     *string  `json:"precautions" validate:"omitempty,max=2000"`
	PrecautionsVi   *string  `json:"precautions_vi" validate:"omitempty,max=2000"`
	IsActive        *bool    `json:"is_active"`
}

// PrescribeExerciseRequest represents the request to prescribe an exercise.
type PrescribeExerciseRequest struct {
	ExerciseID         string `json:"exercise_id" validate:"required,uuid"`
	ProgramID          string `json:"program_id" validate:"omitempty,uuid"`
	Sets               int    `json:"sets" validate:"min=1,max=20"`
	Reps               int    `json:"reps" validate:"min=1,max=100"`
	HoldSeconds        int    `json:"hold_seconds" validate:"min=0,max=300"`
	Frequency          string `json:"frequency" validate:"required,max=50"`
	DurationWeeks      int    `json:"duration_weeks" validate:"min=1,max=52"`
	CustomInstructions string `json:"custom_instructions" validate:"max=2000"`
	Notes              string `json:"notes" validate:"max=1000"`
	StartDate          string `json:"start_date" validate:"omitempty,datetime=2006-01-02"`
}

// UpdatePrescriptionRequest represents the request to update a prescription.
type UpdatePrescriptionRequest struct {
	Sets               *int    `json:"sets" validate:"omitempty,min=1,max=20"`
	Reps               *int    `json:"reps" validate:"omitempty,min=1,max=100"`
	HoldSeconds        *int    `json:"hold_seconds" validate:"omitempty,min=0,max=300"`
	Frequency          *string `json:"frequency" validate:"omitempty,max=50"`
	DurationWeeks      *int    `json:"duration_weeks" validate:"omitempty,min=1,max=52"`
	CustomInstructions *string `json:"custom_instructions" validate:"omitempty,max=2000"`
	Notes              *string `json:"notes" validate:"omitempty,max=1000"`
	Status             *string `json:"status" validate:"omitempty,oneof=active completed paused cancelled"`
}

// CreateProgramRequest represents the request to create a home exercise program.
type CreateProgramRequest struct {
	Name          string   `json:"name" validate:"required,max=200"`
	NameVi        string   `json:"name_vi" validate:"max=200"`
	Description   string   `json:"description" validate:"max=2000"`
	DescriptionVi string   `json:"description_vi" validate:"max=2000"`
	Frequency     string   `json:"frequency" validate:"required,max=50"`
	DurationWeeks int      `json:"duration_weeks" validate:"min=1,max=52"`
	ExerciseIDs   []string `json:"exercise_ids" validate:"required,min=1,dive,uuid"`
	StartDate     string   `json:"start_date" validate:"omitempty,datetime=2006-01-02"`
}

// LogComplianceRequest represents a request to log exercise completion.
type LogComplianceRequest struct {
	SetsCompleted int    `json:"sets_completed" validate:"min=0,max=20"`
	RepsCompleted int    `json:"reps_completed" validate:"min=0,max=100"`
	PainLevel     *int   `json:"pain_level" validate:"omitempty,min=0,max=10"`
	Difficulty    string `json:"difficulty" validate:"omitempty,oneof=easy moderate hard"`
	Notes         string `json:"notes" validate:"max=500"`
}

// PatientExerciseSummary provides a summary of patient exercise activity.
type PatientExerciseSummary struct {
	PatientID              string  `json:"patient_id"`
	TotalPrescriptions     int     `json:"total_prescriptions"`
	ActivePrescriptions    int     `json:"active_prescriptions"`
	CompletedPrescriptions int     `json:"completed_prescriptions"`
	TotalComplianceLogs    int     `json:"total_compliance_logs"`
	ComplianceRate         float64 `json:"compliance_rate"`
	LastActivityDate       *time.Time `json:"last_activity_date,omitempty"`
}
