package model

import "time"

// MMTGrade represents the Manual Muscle Testing grade (0-5 scale).
// Half grades (e.g. 3.5 for 3+) are supported.
type MMTGrade float64

const (
	MMTGrade0   MMTGrade = 0   // No contraction (zero)
	MMTGrade1   MMTGrade = 1   // Trace contraction (trace)
	MMTGrade1P  MMTGrade = 1.5 // Trace+ (between trace and poor)
	MMTGrade2M  MMTGrade = 1.5 // Poor- (alias)
	MMTGrade2   MMTGrade = 2   // Full ROM, gravity eliminated (poor)
	MMTGrade2P  MMTGrade = 2.5 // Poor+ (between poor and fair)
	MMTGrade3M  MMTGrade = 2.5 // Fair- (alias)
	MMTGrade3   MMTGrade = 3   // Full ROM against gravity (fair)
	MMTGrade3P  MMTGrade = 3.5 // Fair+ (between fair and good)
	MMTGrade4M  MMTGrade = 3.5 // Good- (alias)
	MMTGrade4   MMTGrade = 4   // Full ROM against moderate resistance (good)
	MMTGrade4P  MMTGrade = 4.5 // Good+ (between good and normal)
	MMTGrade5M  MMTGrade = 4.5 // Normal- (alias)
	MMTGrade5   MMTGrade = 5   // Full ROM against maximum resistance (normal)
)

// MMTGradeDescriptions provides clinical descriptions for each grade.
var MMTGradeDescriptions = map[float64]struct {
	Name   string
	NameVi string
	Desc   string
	DescVi string
}{
	0:   {Name: "Zero", NameVi: "Khong", Desc: "No contraction", DescVi: "Khong co co"},
	1:   {Name: "Trace", NameVi: "Vet", Desc: "Palpable contraction, no movement", DescVi: "Co co nhe, khong cu dong"},
	2:   {Name: "Poor", NameVi: "Kem", Desc: "Full ROM, gravity eliminated", DescVi: "Tam van dong day du, loai bo trong luc"},
	3:   {Name: "Fair", NameVi: "Trung binh", Desc: "Full ROM against gravity", DescVi: "Tam van dong day du chong trong luc"},
	4:   {Name: "Good", NameVi: "Tot", Desc: "Full ROM against moderate resistance", DescVi: "Tam van dong day du chong luc trung binh"},
	5:   {Name: "Normal", NameVi: "Binh thuong", Desc: "Full ROM against maximum resistance", DescVi: "Tam van dong day du chong luc toi da"},
}

// MMTSide represents the side of the body for MMT testing.
type MMTSide string

const (
	MMTSideLeft      MMTSide = "left"
	MMTSideRight     MMTSide = "right"
	MMTSideBilateral MMTSide = "bilateral"
)

// MMTAssessment represents a single MMT measurement for a patient.
type MMTAssessment struct {
	ID          string    `json:"id" db:"id"`
	PatientID   string    `json:"patient_id" db:"patient_id" validate:"required,uuid"`
	VisitID     *string   `json:"visit_id,omitempty" db:"visit_id"`
	ClinicID    string    `json:"clinic_id" db:"clinic_id" validate:"required,uuid"`
	TherapistID string    `json:"therapist_id" db:"therapist_id" validate:"required,uuid"`
	MuscleGroup string    `json:"muscle_group" db:"muscle_group" validate:"required"`
	Side        MMTSide   `json:"side" db:"side" validate:"required"`
	Grade       float64   `json:"grade" db:"grade" validate:"gte=0,lte=5"`
	Notes       string    `json:"notes,omitempty" db:"notes"`
	AssessedAt  time.Time `json:"assessed_at" db:"assessed_at"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// CreateMMTAssessmentRequest represents the request body for recording a MMT measurement.
type CreateMMTAssessmentRequest struct {
	PatientID   string  `json:"patient_id" validate:"required,uuid"`
	VisitID     string  `json:"visit_id" validate:"omitempty,uuid"`
	MuscleGroup string  `json:"muscle_group" validate:"required,max=80"`
	Side        string  `json:"side" validate:"required,oneof=left right bilateral"`
	Grade       float64 `json:"grade" validate:"gte=0,lte=5"`
	Notes       string  `json:"notes" validate:"max=2000"`
	AssessedAt  string  `json:"assessed_at" validate:"omitempty,datetime=2006-01-02T15:04:05Z07:00"`
}

// MMTTrendingData represents MMT measurement history over time for a specific muscle group.
type MMTTrendingData struct {
	PatientID   string              `json:"patient_id"`
	MuscleGroup string              `json:"muscle_group"`
	Side        MMTSide             `json:"side"`
	DataPoints  []MMTTrendDataPoint `json:"data_points"`
	Baseline    *float64            `json:"baseline,omitempty"`
	Current     *float64            `json:"current,omitempty"`
	Change      *float64            `json:"change,omitempty"`
	Trend       TrendDirection      `json:"trend"`
}

// MMTTrendDataPoint represents a single data point in a MMT trend.
type MMTTrendDataPoint struct {
	Grade      float64   `json:"grade"`
	AssessedAt time.Time `json:"assessed_at"`
	Notes      string    `json:"notes,omitempty"`
}

// CommonMuscleGroups provides a reference list of common muscle groups for MMT testing.
var CommonMuscleGroups = []struct {
	Name   string
	NameVi string
	Region string
}{
	// Upper extremity
	{Name: "Deltoid", NameVi: "Co delta", Region: "shoulder"},
	{Name: "Biceps", NameVi: "Co nhi dau canh tay", Region: "arm"},
	{Name: "Triceps", NameVi: "Co tam dau canh tay", Region: "arm"},
	{Name: "Wrist Extensors", NameVi: "Co duoi co tay", Region: "forearm"},
	{Name: "Wrist Flexors", NameVi: "Co gap co tay", Region: "forearm"},
	{Name: "Grip", NameVi: "Luc nam", Region: "hand"},
	{Name: "Rotator Cuff", NameVi: "Chung quay vai", Region: "shoulder"},
	{Name: "Pectoralis Major", NameVi: "Co nguc lon", Region: "chest"},
	{Name: "Latissimus Dorsi", NameVi: "Co lung rong", Region: "back"},
	{Name: "Rhomboids", NameVi: "Co hinh thoi", Region: "back"},
	{Name: "Trapezius", NameVi: "Co thang", Region: "neck"},
	// Lower extremity
	{Name: "Hip Flexors", NameVi: "Co gap hong", Region: "hip"},
	{Name: "Hip Extensors", NameVi: "Co duoi hong", Region: "hip"},
	{Name: "Hip Abductors", NameVi: "Co dang hong", Region: "hip"},
	{Name: "Hip Adductors", NameVi: "Co khep hong", Region: "hip"},
	{Name: "Quadriceps", NameVi: "Co tu dau dui", Region: "thigh"},
	{Name: "Hamstrings", NameVi: "Co gap goi", Region: "thigh"},
	{Name: "Gastrocnemius", NameVi: "Co bap chan", Region: "calf"},
	{Name: "Tibialis Anterior", NameVi: "Co chay truoc", Region: "shin"},
	{Name: "Gluteus Maximus", NameVi: "Co mong lon", Region: "hip"},
	{Name: "Gluteus Medius", NameVi: "Co mong giua", Region: "hip"},
	// Core
	{Name: "Abdominals", NameVi: "Co bung", Region: "core"},
	{Name: "Erector Spinae", NameVi: "Co dung song", Region: "back"},
}
