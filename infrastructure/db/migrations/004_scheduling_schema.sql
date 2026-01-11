-- Migration: 004_scheduling_schema.sql
-- Description: Scheduling and appointments system
-- Created: 2026-01-10

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE appointment_status AS ENUM (
    'scheduled',
    'confirmed',
    'checked_in',
    'in_progress',
    'completed',
    'cancelled',
    'no_show',
    'rescheduled'
);

CREATE TYPE appointment_type AS ENUM (
    'initial_evaluation',
    'follow_up',
    'discharge',
    're_evaluation',
    'consultation',
    'group_session'
);

CREATE TYPE recurrence_pattern AS ENUM (
    'daily',
    'weekly',
    'biweekly',
    'monthly',
    'custom'
);

CREATE TYPE day_of_week AS ENUM (
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
);

-- =============================================================================
-- THERAPIST SCHEDULES
-- =============================================================================

CREATE TABLE therapist_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

    -- Schedule period
    effective_from DATE NOT NULL,
    effective_to DATE,  -- NULL for ongoing

    -- Weekly schedule
    weekly_schedule JSONB NOT NULL DEFAULT '{}',
    /*
    weekly_schedule structure:
    {
        "monday": [
            { "start": "09:00", "end": "12:00" },
            { "start": "14:00", "end": "18:00" }
        ],
        "tuesday": [...],
        ...
    }
    */

    -- Slot configuration
    default_slot_duration_minutes INTEGER NOT NULL DEFAULT 60,
    buffer_between_slots_minutes INTEGER NOT NULL DEFAULT 0,
    max_patients_per_slot INTEGER NOT NULL DEFAULT 1,

    -- Settings
    is_accepting_new_patients BOOLEAN NOT NULL DEFAULT TRUE,
    settings JSONB NOT NULL DEFAULT '{}',

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_therapist_schedules_therapist_id ON therapist_schedules (therapist_id);
CREATE INDEX idx_therapist_schedules_clinic_id ON therapist_schedules (clinic_id);
CREATE INDEX idx_therapist_schedules_effective_dates ON therapist_schedules (effective_from, effective_to);
CREATE INDEX idx_therapist_schedules_is_active ON therapist_schedules (is_active);

COMMENT ON TABLE therapist_schedules IS 'Regular working schedules for therapists';
COMMENT ON COLUMN therapist_schedules.weekly_schedule IS 'Working hours for each day of the week';

-- =============================================================================
-- SCHEDULE EXCEPTIONS (Vacation, sick days, special hours)
-- =============================================================================

CREATE TABLE schedule_exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    therapist_id UUID REFERENCES users(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,

    -- Exception period
    exception_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,

    -- Type
    exception_type VARCHAR(50) NOT NULL,  -- vacation, sick, training, special_hours, holiday
    is_available BOOLEAN NOT NULL DEFAULT FALSE,

    -- Details
    reason TEXT,
    notes TEXT,

    -- For special hours (when is_available = TRUE)
    special_hours JSONB,  -- Same format as weekly_schedule time slots

    -- Approval
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_schedule_exceptions_therapist_id ON schedule_exceptions (therapist_id);
CREATE INDEX idx_schedule_exceptions_clinic_id ON schedule_exceptions (clinic_id);
CREATE INDEX idx_schedule_exceptions_date ON schedule_exceptions (exception_date);
CREATE INDEX idx_schedule_exceptions_type ON schedule_exceptions (exception_type);

COMMENT ON TABLE schedule_exceptions IS 'Exceptions to regular schedules (time off, special hours)';

-- =============================================================================
-- APPOINTMENT TYPES (Configurable per clinic)
-- =============================================================================

CREATE TABLE appointment_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

    -- Type info
    name VARCHAR(255) NOT NULL,
    name_vi VARCHAR(255),
    code VARCHAR(50),
    description TEXT,
    description_vi TEXT,

    -- Defaults
    default_duration_minutes INTEGER NOT NULL DEFAULT 60,
    color VARCHAR(20),  -- Hex color for calendar display
    icon VARCHAR(50),

    -- Behavior
    requires_evaluation BOOLEAN NOT NULL DEFAULT FALSE,
    allows_group BOOLEAN NOT NULL DEFAULT FALSE,
    max_group_size INTEGER DEFAULT 1,

    -- Billing
    default_billing_codes TEXT[],

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointment_types_clinic_id ON appointment_types (clinic_id);
CREATE INDEX idx_appointment_types_code ON appointment_types (clinic_id, code);
CREATE INDEX idx_appointment_types_is_active ON appointment_types (is_active);

COMMENT ON TABLE appointment_types IS 'Configurable appointment types per clinic';

-- =============================================================================
-- APPOINTMENTS
-- =============================================================================

CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES users(id),
    appointment_type_id UUID REFERENCES appointment_types(id),
    treatment_plan_id UUID REFERENCES treatment_plans(id),

    -- Scheduling
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,

    -- Type and status
    appointment_type appointment_type NOT NULL DEFAULT 'follow_up',
    status appointment_status NOT NULL DEFAULT 'scheduled',

    -- Recurrence (for series)
    recurrence_id UUID,  -- Links appointments in a series
    recurrence_pattern recurrence_pattern,
    recurrence_config JSONB,
    /*
    recurrence_config structure:
    {
        "days_of_week": ["monday", "wednesday", "friday"],
        "interval": 1,  -- Every N weeks/days
        "end_date": "ISO date",
        "occurrences": number,
        "exceptions": ["ISO date", ...]
    }
    */
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_index INTEGER,  -- Position in series (1, 2, 3, ...)

    -- Room/Resource
    room VARCHAR(100),
    equipment_needed TEXT[],

    -- Notes
    notes TEXT,
    notes_vi TEXT,
    patient_instructions TEXT,
    patient_instructions_vi TEXT,

    -- Reminders
    reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
    reminder_sent_at TIMESTAMPTZ,
    confirmation_status VARCHAR(50),  -- pending, confirmed, declined
    confirmed_at TIMESTAMPTZ,

    -- Check-in/out
    checked_in_at TIMESTAMPTZ,
    checked_in_by UUID REFERENCES users(id),
    checked_out_at TIMESTAMPTZ,
    checked_out_by UUID REFERENCES users(id),

    -- Cancellation/Reschedule
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES users(id),
    rescheduled_from_id UUID REFERENCES appointments(id),
    rescheduled_to_id UUID REFERENCES appointments(id),

    -- Billing
    billing_status VARCHAR(50),  -- pending, billed, paid, cancelled
    billing_codes TEXT[],

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_appointments_clinic_id ON appointments (clinic_id);
CREATE INDEX idx_appointments_patient_id ON appointments (patient_id);
CREATE INDEX idx_appointments_therapist_id ON appointments (therapist_id);
CREATE INDEX idx_appointments_treatment_plan_id ON appointments (treatment_plan_id);
CREATE INDEX idx_appointments_date ON appointments (appointment_date);
CREATE INDEX idx_appointments_datetime ON appointments (appointment_date, start_time);
CREATE INDEX idx_appointments_status ON appointments (status);
CREATE INDEX idx_appointments_type ON appointments (appointment_type);
CREATE INDEX idx_appointments_recurrence_id ON appointments (recurrence_id);
CREATE INDEX idx_appointments_billing_status ON appointments (billing_status);

-- Composite index for common calendar queries
CREATE INDEX idx_appointments_calendar ON appointments (clinic_id, appointment_date, therapist_id, status);

-- Index for finding available slots
CREATE INDEX idx_appointments_available_slots ON appointments (
    clinic_id,
    therapist_id,
    appointment_date,
    start_time,
    end_time
) WHERE status NOT IN ('cancelled', 'rescheduled');

COMMENT ON TABLE appointments IS 'Patient appointment scheduling with recurring support';
COMMENT ON COLUMN appointments.recurrence_id IS 'Groups recurring appointment series';
COMMENT ON COLUMN appointments.recurrence_config IS 'Configuration for recurring patterns';

-- =============================================================================
-- WAITLIST
-- =============================================================================

CREATE TABLE waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    therapist_id UUID REFERENCES users(id),  -- Preferred therapist, NULL for any

    -- Request details
    appointment_type appointment_type NOT NULL,
    preferred_days day_of_week[],
    preferred_time_start TIME,
    preferred_time_end TIME,

    -- Urgency
    priority INTEGER NOT NULL DEFAULT 5,  -- 1 = highest, 10 = lowest
    reason TEXT,

    -- Date constraints
    earliest_date DATE NOT NULL DEFAULT CURRENT_DATE,
    latest_date DATE,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'waiting',  -- waiting, offered, scheduled, cancelled, expired
    offered_appointment_id UUID REFERENCES appointments(id),
    offered_at TIMESTAMPTZ,
    offer_expires_at TIMESTAMPTZ,

    -- Contact preferences
    contact_method VARCHAR(50),  -- phone, sms, email
    contact_notes TEXT,

    -- Outcome
    scheduled_appointment_id UUID REFERENCES appointments(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_waitlist_clinic_id ON waitlist (clinic_id);
CREATE INDEX idx_waitlist_patient_id ON waitlist (patient_id);
CREATE INDEX idx_waitlist_therapist_id ON waitlist (therapist_id);
CREATE INDEX idx_waitlist_status ON waitlist (status);
CREATE INDEX idx_waitlist_priority ON waitlist (priority);
CREATE INDEX idx_waitlist_dates ON waitlist (earliest_date, latest_date);

COMMENT ON TABLE waitlist IS 'Patients waiting for appointment slots';
COMMENT ON COLUMN waitlist.priority IS 'Priority level 1-10 (1 = highest)';

-- =============================================================================
-- APPOINTMENT REMINDERS
-- =============================================================================

CREATE TABLE appointment_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,

    -- Reminder config
    reminder_type VARCHAR(50) NOT NULL,  -- email, sms, push, phone_call
    scheduled_for TIMESTAMPTZ NOT NULL,
    hours_before INTEGER NOT NULL,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, sent, failed, cancelled
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,

    -- Content
    message_template VARCHAR(100),
    message_content TEXT,
    message_content_vi TEXT,

    -- Response
    response_received BOOLEAN NOT NULL DEFAULT FALSE,
    response_type VARCHAR(50),  -- confirmed, declined, rescheduled
    response_at TIMESTAMPTZ,

    -- Error handling
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reminders_appointment_id ON appointment_reminders (appointment_id);
CREATE INDEX idx_reminders_scheduled_for ON appointment_reminders (scheduled_for);
CREATE INDEX idx_reminders_status ON appointment_reminders (status);
CREATE INDEX idx_reminders_type ON appointment_reminders (reminder_type);

COMMENT ON TABLE appointment_reminders IS 'Scheduled and sent appointment reminders';

-- =============================================================================
-- HELPER FUNCTION: Check appointment conflicts
-- =============================================================================

CREATE OR REPLACE FUNCTION check_appointment_conflict(
    p_therapist_id UUID,
    p_appointment_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    conflict_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO conflict_count
    FROM appointments
    WHERE therapist_id = p_therapist_id
    AND appointment_date = p_appointment_date
    AND status NOT IN ('cancelled', 'rescheduled')
    AND id != COALESCE(p_exclude_appointment_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND (
        (start_time < p_end_time AND end_time > p_start_time)
    );

    RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_appointment_conflict IS 'Check if a time slot conflicts with existing appointments';

-- =============================================================================
-- HELPER FUNCTION: Get available slots
-- =============================================================================

CREATE OR REPLACE FUNCTION get_available_slots(
    p_therapist_id UUID,
    p_date DATE,
    p_duration_minutes INTEGER DEFAULT 60
)
RETURNS TABLE (
    slot_start TIME,
    slot_end TIME
) AS $$
DECLARE
    v_schedule JSONB;
    v_day_name TEXT;
    v_slot JSONB;
BEGIN
    -- Get day of week
    v_day_name := LOWER(TO_CHAR(p_date, 'Day'));
    v_day_name := TRIM(v_day_name);

    -- Get therapist's schedule for this day
    SELECT weekly_schedule->v_day_name
    INTO v_schedule
    FROM therapist_schedules
    WHERE therapist_id = p_therapist_id
    AND is_active = TRUE
    AND effective_from <= p_date
    AND (effective_to IS NULL OR effective_to >= p_date);

    IF v_schedule IS NULL THEN
        RETURN;
    END IF;

    -- Check for exceptions
    IF EXISTS (
        SELECT 1 FROM schedule_exceptions
        WHERE therapist_id = p_therapist_id
        AND exception_date = p_date
        AND is_available = FALSE
    ) THEN
        RETURN;
    END IF;

    -- Return available time slots (simplified - actual implementation would be more complex)
    FOR v_slot IN SELECT * FROM jsonb_array_elements(v_schedule)
    LOOP
        slot_start := (v_slot->>'start')::TIME;
        slot_end := (v_slot->>'end')::TIME;
        RETURN NEXT;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_available_slots IS 'Get available time slots for a therapist on a given date';

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER trg_therapist_schedules_updated_at
    BEFORE UPDATE ON therapist_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_schedule_exceptions_updated_at
    BEFORE UPDATE ON schedule_exceptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_appointment_types_updated_at
    BEFORE UPDATE ON appointment_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_waitlist_updated_at
    BEFORE UPDATE ON waitlist
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_reminders_updated_at
    BEFORE UPDATE ON appointment_reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- LINK APPOINTMENTS TO TREATMENT SESSIONS
-- =============================================================================

-- Add foreign key constraint now that appointments table exists
ALTER TABLE treatment_sessions
    ADD CONSTRAINT fk_sessions_appointment
    FOREIGN KEY (appointment_id) REFERENCES appointments(id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE therapist_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_reminders ENABLE ROW LEVEL SECURITY;
