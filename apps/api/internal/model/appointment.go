package model

import "time"

// AppointmentStatus represents the status of an appointment.
type AppointmentStatus string

const (
	AppointmentStatusScheduled  AppointmentStatus = "scheduled"
	AppointmentStatusConfirmed  AppointmentStatus = "confirmed"
	AppointmentStatusInProgress AppointmentStatus = "in_progress"
	AppointmentStatusCompleted  AppointmentStatus = "completed"
	AppointmentStatusCancelled  AppointmentStatus = "cancelled"
	AppointmentStatusNoShow     AppointmentStatus = "no_show"
)

// AppointmentType represents the type of appointment.
type AppointmentType string

const (
	AppointmentTypeAssessment   AppointmentType = "assessment"
	AppointmentTypeTreatment    AppointmentType = "treatment"
	AppointmentTypeFollowUp     AppointmentType = "followup"
	AppointmentTypeConsultation AppointmentType = "consultation"
	AppointmentTypeOther        AppointmentType = "other"
)

// RecurrencePattern represents the recurrence pattern for recurring appointments.
type RecurrencePattern string

const (
	RecurrenceNone    RecurrencePattern = "none"
	RecurrenceDaily   RecurrencePattern = "daily"
	RecurrenceWeekly  RecurrencePattern = "weekly"
	RecurrenceBiweekly RecurrencePattern = "biweekly"
	RecurrenceMonthly RecurrencePattern = "monthly"
)

// Appointment represents an appointment in the system.
type Appointment struct {
	ID                 string            `json:"id" db:"id"`
	ClinicID           string            `json:"clinic_id" db:"clinic_id"`
	PatientID          string            `json:"patient_id" db:"patient_id"`
	TherapistID        string            `json:"therapist_id" db:"therapist_id"`
	StartTime          time.Time         `json:"start_time" db:"start_time"`
	EndTime            time.Time         `json:"end_time" db:"end_time"`
	Duration           int               `json:"duration" db:"duration"` // minutes
	Type               AppointmentType   `json:"type" db:"type"`
	Status             AppointmentStatus `json:"status" db:"status"`
	Room               string            `json:"room,omitempty" db:"room"`
	Notes              string            `json:"notes,omitempty" db:"notes"`
	CancellationReason string            `json:"cancellation_reason,omitempty" db:"cancellation_reason"`
	RecurrenceID       *string           `json:"recurrence_id,omitempty" db:"recurrence_id"`
	CreatedAt          time.Time         `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time         `json:"updated_at" db:"updated_at"`
	CreatedBy          *string           `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy          *string           `json:"updated_by,omitempty" db:"updated_by"`
}

// AppointmentWithDetails includes patient and therapist information.
type AppointmentWithDetails struct {
	Appointment
	PatientName    string `json:"patient_name" db:"patient_name"`
	PatientMRN     string `json:"patient_mrn" db:"patient_mrn"`
	PatientPhone   string `json:"patient_phone,omitempty" db:"patient_phone"`
	TherapistName  string `json:"therapist_name" db:"therapist_name"`
}

// TherapistSchedule represents a therapist's regular working schedule.
type TherapistSchedule struct {
	ID          string    `json:"id" db:"id"`
	ClinicID    string    `json:"clinic_id" db:"clinic_id"`
	TherapistID string    `json:"therapist_id" db:"therapist_id"`
	DayOfWeek   int       `json:"day_of_week" db:"day_of_week"` // 0=Sunday, 6=Saturday
	StartTime   string    `json:"start_time" db:"start_time"`   // "HH:MM" format
	EndTime     string    `json:"end_time" db:"end_time"`       // "HH:MM" format
	IsActive    bool      `json:"is_active" db:"is_active"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// ScheduleException represents a one-time exception to a therapist's schedule.
type ScheduleException struct {
	ID          string     `json:"id" db:"id"`
	ClinicID    string     `json:"clinic_id" db:"clinic_id"`
	TherapistID string     `json:"therapist_id" db:"therapist_id"`
	Date        time.Time  `json:"date" db:"date"`
	StartTime   *string    `json:"start_time,omitempty" db:"start_time"` // nil means entire day off
	EndTime     *string    `json:"end_time,omitempty" db:"end_time"`
	IsAvailable bool       `json:"is_available" db:"is_available"` // false = blocked, true = extra availability
	Reason      string     `json:"reason,omitempty" db:"reason"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
}

// TimeRange represents a time range.
type TimeRange struct {
	Start time.Time `json:"start"`
	End   time.Time `json:"end"`
}

// AvailabilitySlot represents an available time slot for booking.
type AvailabilitySlot struct {
	StartTime    time.Time `json:"start_time"`
	EndTime      time.Time `json:"end_time"`
	TherapistID  string    `json:"therapist_id"`
	TherapistName string   `json:"therapist_name,omitempty"`
	Duration     int       `json:"duration"` // available duration in minutes
}

// CreateAppointmentRequest represents the request body for creating an appointment.
type CreateAppointmentRequest struct {
	PatientID         string            `json:"patient_id" validate:"required,uuid"`
	TherapistID       string            `json:"therapist_id" validate:"required,uuid"`
	StartTime         string            `json:"start_time" validate:"required,datetime=2006-01-02T15:04:05Z07:00"`
	Duration          int               `json:"duration" validate:"required,min=15,max=240"`
	Type              string            `json:"type" validate:"required,oneof=assessment treatment followup consultation other"`
	Room              string            `json:"room" validate:"max=100"`
	Notes             string            `json:"notes" validate:"max=1000"`
	RecurrencePattern string            `json:"recurrence_pattern" validate:"omitempty,oneof=none daily weekly biweekly monthly"`
	RecurrenceEndDate *string           `json:"recurrence_end_date" validate:"omitempty,datetime=2006-01-02"`
	RecurrenceCount   *int              `json:"recurrence_count" validate:"omitempty,min=1,max=52"`
}

// UpdateAppointmentRequest represents the request body for updating an appointment.
type UpdateAppointmentRequest struct {
	StartTime  *string `json:"start_time" validate:"omitempty,datetime=2006-01-02T15:04:05Z07:00"`
	Duration   *int    `json:"duration" validate:"omitempty,min=15,max=240"`
	Type       *string `json:"type" validate:"omitempty,oneof=assessment treatment followup consultation other"`
	Status     *string `json:"status" validate:"omitempty,oneof=scheduled confirmed in_progress completed cancelled no_show"`
	Room       *string `json:"room" validate:"omitempty,max=100"`
	Notes      *string `json:"notes" validate:"omitempty,max=1000"`
	TherapistID *string `json:"therapist_id" validate:"omitempty,uuid"`
}

// CancelAppointmentRequest represents the request body for canceling an appointment.
type CancelAppointmentRequest struct {
	Reason       string `json:"reason" validate:"max=500"`
	CancelSeries bool   `json:"cancel_series"` // If true, cancel all future recurring appointments
}

// AppointmentSearchParams represents search and filter parameters for appointments.
type AppointmentSearchParams struct {
	ClinicID    string            `query:"clinic_id"`
	PatientID   string            `query:"patient_id"`
	TherapistID string            `query:"therapist_id"`
	StartDate   *time.Time        `query:"start_date"`
	EndDate     *time.Time        `query:"end_date"`
	Status      AppointmentStatus `query:"status"`
	Type        AppointmentType   `query:"type"`
	Room        string            `query:"room"`
	SortBy      string            `query:"sort_by"`
	SortOrder   string            `query:"sort_order"`
	Page        int               `query:"page"`
	PerPage     int               `query:"per_page"`
}

// NewAppointmentSearchParams creates AppointmentSearchParams with default values.
func NewAppointmentSearchParams() AppointmentSearchParams {
	return AppointmentSearchParams{
		SortBy:    "start_time",
		SortOrder: "asc",
		Page:      1,
		PerPage:   50,
	}
}

// Offset calculates the offset for pagination.
func (p AppointmentSearchParams) Offset() int {
	return (p.Page - 1) * p.Limit()
}

// Limit returns the number of items per page.
func (p AppointmentSearchParams) Limit() int {
	if p.PerPage <= 0 {
		return 50
	}
	if p.PerPage > 200 {
		return 200
	}
	return p.PerPage
}

// AppointmentListResponse represents a paginated list of appointments.
type AppointmentListResponse struct {
	Data       []AppointmentWithDetails `json:"data"`
	Total      int64                    `json:"total"`
	Page       int                      `json:"page"`
	PerPage    int                      `json:"per_page"`
	TotalPages int                      `json:"total_pages"`
}

// AvailabilityRequest represents the request for getting therapist availability.
type AvailabilityRequest struct {
	TherapistID string    `query:"therapist_id" validate:"required,uuid"`
	Date        time.Time `query:"date" validate:"required"`
	Duration    int       `query:"duration" validate:"required,min=15,max=240"`
}

// DaySchedule represents all appointments for a specific day.
type DaySchedule struct {
	Date         string                    `json:"date"`
	Appointments []AppointmentWithDetails  `json:"appointments"`
	TotalCount   int                       `json:"total_count"`
}

// Therapist represents a therapist for selection purposes.
type Therapist struct {
	ID        string `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	FullName  string `json:"full_name"`
	Email     string `json:"email,omitempty"`
	Specialty string `json:"specialty,omitempty"`
	AvatarURL string `json:"avatar_url,omitempty"`
	IsActive  bool   `json:"is_active"`
}

// ConflictInfo represents information about a scheduling conflict.
type ConflictInfo struct {
	ConflictType string      `json:"conflict_type"` // "overlap", "outside_hours", "exception"
	Message      string      `json:"message"`
	Appointment  *Appointment `json:"appointment,omitempty"`
}
