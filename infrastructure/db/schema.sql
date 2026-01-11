-- =============================================================================
-- PhysioFlow EMR Database Schema
-- Combined reference schema (generated from migrations)
-- Version: 1.0.0
-- Created: 2026-01-10
-- =============================================================================
--
-- This file combines all migrations for reference purposes.
-- For actual database setup, run migrations in order:
--   1. migrations/001_initial_schema.sql
--   2. migrations/002_clinical_schema.sql
--   3. migrations/003_checklist_schema.sql
--   4. migrations/004_scheduling_schema.sql
--
-- =============================================================================

-- #############################################################################
-- EXTENSIONS
-- #############################################################################

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- #############################################################################
-- ENUMS
-- #############################################################################

-- Core enums
CREATE TYPE user_role AS ENUM (
    'super_admin',
    'clinic_admin',
    'therapist',
    'assistant',
    'front_desk'
);

CREATE TYPE gender_type AS ENUM (
    'male',
    'female',
    'other',
    'prefer_not_to_say'
);

CREATE TYPE language_preference AS ENUM (
    'vi',
    'en'
);

-- Clinical enums
CREATE TYPE assessment_status AS ENUM (
    'draft',
    'in_progress',
    'completed',
    'reviewed',
    'amended'
);

CREATE TYPE treatment_plan_status AS ENUM (
    'draft',
    'active',
    'on_hold',
    'completed',
    'discontinued'
);

CREATE TYPE session_status AS ENUM (
    'scheduled',
    'checked_in',
    'in_progress',
    'completed',
    'cancelled',
    'no_show'
);

CREATE TYPE pain_type AS ENUM (
    'sharp',
    'dull',
    'aching',
    'burning',
    'throbbing',
    'stabbing',
    'radiating',
    'cramping',
    'other'
);

CREATE TYPE body_region AS ENUM (
    'head_neck',
    'cervical_spine',
    'thoracic_spine',
    'lumbar_spine',
    'shoulder_left',
    'shoulder_right',
    'elbow_left',
    'elbow_right',
    'wrist_hand_left',
    'wrist_hand_right',
    'hip_left',
    'hip_right',
    'knee_left',
    'knee_right',
    'ankle_foot_left',
    'ankle_foot_right',
    'chest',
    'abdomen',
    'pelvis',
    'other'
);

-- Checklist enums
CREATE TYPE checklist_item_type AS ENUM (
    'checkbox',
    'radio',
    'text',
    'number',
    'scale',
    'multi_select',
    'date',
    'time',
    'duration',
    'body_diagram',
    'signature'
);

CREATE TYPE checklist_status AS ENUM (
    'not_started',
    'in_progress',
    'completed',
    'reviewed',
    'locked'
);

-- Scheduling enums
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

-- #############################################################################
-- CORE TABLES
-- #############################################################################

-- Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    name_vi VARCHAR(255),
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Clinics
CREATE TABLE clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    name_vi VARCHAR(255),
    address TEXT,
    address_vi TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    settings JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Users (Staff)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    keycloak_id UUID UNIQUE,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    first_name_vi VARCHAR(100),
    last_name_vi VARCHAR(100),
    role user_role NOT NULL,
    license_number VARCHAR(100),
    specializations TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    CONSTRAINT uq_users_clinic_email UNIQUE (clinic_id, email)
);

-- Patients
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    mrn VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    first_name_vi VARCHAR(100),
    last_name_vi VARCHAR(100),
    date_of_birth DATE NOT NULL,
    gender gender_type NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    address_vi TEXT,
    language_preference language_preference NOT NULL DEFAULT 'vi',
    emergency_contact JSONB NOT NULL DEFAULT '{}',
    medical_alerts TEXT[],
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    CONSTRAINT uq_patients_clinic_mrn UNIQUE (clinic_id, mrn)
);

-- Insurance Information
CREATE TABLE insurance_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    provider VARCHAR(255) NOT NULL,
    provider_type VARCHAR(50) NOT NULL DEFAULT 'private',
    policy_number VARCHAR(100) NOT NULL,
    group_number VARCHAR(100),
    coverage_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    copay_amount DECIMAL(12,2),
    valid_from DATE NOT NULL,
    valid_to DATE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    verification_status VARCHAR(50) DEFAULT 'pending',
    verification_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- #############################################################################
-- CLINICAL TABLES
-- #############################################################################

-- Diagnoses (ICD-10)
CREATE TABLE diagnoses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    description_vi TEXT,
    category VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assessments
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES users(id),
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    assessment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assessment_type VARCHAR(50) NOT NULL DEFAULT 'initial',
    status assessment_status NOT NULL DEFAULT 'draft',
    chief_complaint TEXT,
    chief_complaint_vi TEXT,
    onset_date DATE,
    mechanism_of_injury TEXT,
    mechanism_of_injury_vi TEXT,
    medical_history JSONB NOT NULL DEFAULT '{}',
    surgical_history JSONB NOT NULL DEFAULT '[]',
    medications JSONB NOT NULL DEFAULT '[]',
    allergies TEXT[],
    pain_data JSONB NOT NULL DEFAULT '{}',
    rom_measurements JSONB NOT NULL DEFAULT '{}',
    strength_measurements JSONB NOT NULL DEFAULT '{}',
    special_tests JSONB NOT NULL DEFAULT '[]',
    functional_assessment JSONB NOT NULL DEFAULT '{}',
    gait_analysis TEXT,
    gait_analysis_vi TEXT,
    balance_assessment TEXT,
    posture_assessment TEXT,
    outcome_measures JSONB NOT NULL DEFAULT '{}',
    clinical_impression TEXT,
    clinical_impression_vi TEXT,
    primary_diagnosis_id UUID REFERENCES diagnoses(id),
    secondary_diagnoses UUID[],
    goals JSONB NOT NULL DEFAULT '[]',
    prognosis VARCHAR(50),
    prognosis_notes TEXT,
    therapist_signature_at TIMESTAMPTZ,
    supervisor_id UUID REFERENCES users(id),
    supervisor_signature_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Treatment Plans
CREATE TABLE treatment_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessments(id),
    therapist_id UUID NOT NULL REFERENCES users(id),
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    plan_name VARCHAR(255),
    status treatment_plan_status NOT NULL DEFAULT 'draft',
    start_date DATE NOT NULL,
    end_date DATE,
    primary_diagnosis_id UUID REFERENCES diagnoses(id),
    diagnosis_description TEXT,
    diagnosis_description_vi TEXT,
    short_term_goals JSONB NOT NULL DEFAULT '[]',
    long_term_goals JSONB NOT NULL DEFAULT '[]',
    interventions JSONB NOT NULL DEFAULT '[]',
    frequency_per_week INTEGER NOT NULL DEFAULT 2,
    session_duration_minutes INTEGER NOT NULL DEFAULT 60,
    total_sessions_planned INTEGER,
    sessions_completed INTEGER NOT NULL DEFAULT 0,
    precautions TEXT[],
    contraindications TEXT[],
    patient_education JSONB NOT NULL DEFAULT '[]',
    home_exercise_program JSONB NOT NULL DEFAULT '[]',
    progress_notes TEXT,
    progress_notes_vi TEXT,
    insurance_authorization_number VARCHAR(100),
    authorized_sessions INTEGER,
    authorization_valid_until DATE,
    therapist_signature_at TIMESTAMPTZ,
    patient_consent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Treatment Sessions
CREATE TABLE treatment_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    treatment_plan_id UUID REFERENCES treatment_plans(id),
    therapist_id UUID NOT NULL REFERENCES users(id),
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    appointment_id UUID,
    session_date DATE NOT NULL,
    scheduled_start_time TIME,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    status session_status NOT NULL DEFAULT 'scheduled',
    timer_data JSONB NOT NULL DEFAULT '{}',
    patient_report TEXT,
    patient_report_vi TEXT,
    pain_level_pre INTEGER CHECK (pain_level_pre >= 0 AND pain_level_pre <= 10),
    pain_level_post INTEGER CHECK (pain_level_post >= 0 AND pain_level_post <= 10),
    objective_findings JSONB NOT NULL DEFAULT '{}',
    vitals JSONB NOT NULL DEFAULT '{}',
    interventions_performed JSONB NOT NULL DEFAULT '[]',
    patient_response TEXT,
    patient_response_vi TEXT,
    tolerance VARCHAR(50),
    plan_for_next TEXT,
    plan_for_next_vi TEXT,
    auto_generated_notes JSONB NOT NULL DEFAULT '{}',
    final_notes TEXT,
    final_notes_vi TEXT,
    billing_codes TEXT[],
    units_billed JSONB NOT NULL DEFAULT '{}',
    therapist_signature_at TIMESTAMPTZ,
    patient_signature_at TIMESTAMPTZ,
    cosigner_id UUID REFERENCES users(id),
    cosigner_signature_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Exercise Library
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id),
    name VARCHAR(255) NOT NULL,
    name_vi VARCHAR(255),
    description TEXT,
    description_vi TEXT,
    instructions TEXT,
    instructions_vi TEXT,
    category VARCHAR(100) NOT NULL,
    body_regions body_region[],
    image_urls TEXT[],
    video_url TEXT,
    default_sets INTEGER,
    default_reps INTEGER,
    default_duration_seconds INTEGER,
    difficulty_level VARCHAR(50),
    equipment_needed TEXT[],
    precautions TEXT,
    precautions_vi TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- #############################################################################
-- CHECKLIST TABLES
-- #############################################################################

-- Checklist Templates
CREATE TABLE checklist_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id),
    name VARCHAR(255) NOT NULL,
    name_vi VARCHAR(255),
    description TEXT,
    description_vi TEXT,
    code VARCHAR(50),
    template_type VARCHAR(50) NOT NULL,
    body_region body_region,
    applicable_diagnoses TEXT[],
    version INTEGER NOT NULL DEFAULT 1,
    is_current_version BOOLEAN NOT NULL DEFAULT TRUE,
    previous_version_id UUID REFERENCES checklist_templates(id),
    settings JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Checklist Sections
CREATE TABLE checklist_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    title_vi VARCHAR(255),
    description TEXT,
    description_vi TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_collapsible BOOLEAN NOT NULL DEFAULT TRUE,
    default_collapsed BOOLEAN NOT NULL DEFAULT FALSE,
    display_conditions JSONB NOT NULL DEFAULT '{}',
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Checklist Items
CREATE TABLE checklist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES checklist_sections(id) ON DELETE CASCADE,
    label VARCHAR(500) NOT NULL,
    label_vi VARCHAR(500),
    help_text TEXT,
    help_text_vi TEXT,
    item_type checklist_item_type NOT NULL,
    item_config JSONB NOT NULL DEFAULT '{}',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    validation_rules JSONB NOT NULL DEFAULT '{}',
    display_conditions JSONB NOT NULL DEFAULT '{}',
    quick_phrases JSONB NOT NULL DEFAULT '[]',
    data_mapping JSONB NOT NULL DEFAULT '{}',
    cds_rules JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Visit Checklists (Instances)
CREATE TABLE visit_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES checklist_templates(id),
    template_version INTEGER NOT NULL,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    treatment_session_id UUID REFERENCES treatment_sessions(id),
    assessment_id UUID REFERENCES assessments(id),
    therapist_id UUID NOT NULL REFERENCES users(id),
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    status checklist_status NOT NULL DEFAULT 'not_started',
    progress_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,
    locked_by UUID REFERENCES users(id),
    last_auto_save_at TIMESTAMPTZ,
    auto_save_data JSONB NOT NULL DEFAULT '{}',
    generated_note TEXT,
    generated_note_vi TEXT,
    note_generation_status VARCHAR(50),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Visit Checklist Responses
CREATE TABLE visit_checklist_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_checklist_id UUID NOT NULL REFERENCES visit_checklists(id) ON DELETE CASCADE,
    checklist_item_id UUID NOT NULL REFERENCES checklist_items(id),
    response_value JSONB NOT NULL,
    is_skipped BOOLEAN NOT NULL DEFAULT FALSE,
    skip_reason TEXT,
    triggered_alerts JSONB NOT NULL DEFAULT '[]',
    response_history JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    CONSTRAINT uq_visit_response_item UNIQUE (visit_checklist_id, checklist_item_id)
);

-- Quick Phrase Library
CREATE TABLE quick_phrases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id),
    user_id UUID REFERENCES users(id),
    phrase TEXT NOT NULL,
    phrase_vi TEXT,
    shortcut VARCHAR(50),
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    tags TEXT[],
    usage_count INTEGER NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- #############################################################################
-- SCHEDULING TABLES
-- #############################################################################

-- Therapist Schedules
CREATE TABLE therapist_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    effective_from DATE NOT NULL,
    effective_to DATE,
    weekly_schedule JSONB NOT NULL DEFAULT '{}',
    default_slot_duration_minutes INTEGER NOT NULL DEFAULT 60,
    buffer_between_slots_minutes INTEGER NOT NULL DEFAULT 0,
    max_patients_per_slot INTEGER NOT NULL DEFAULT 1,
    is_accepting_new_patients BOOLEAN NOT NULL DEFAULT TRUE,
    settings JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Schedule Exceptions
CREATE TABLE schedule_exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    therapist_id UUID REFERENCES users(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    exception_type VARCHAR(50) NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT FALSE,
    reason TEXT,
    notes TEXT,
    special_hours JSONB,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Appointment Types
CREATE TABLE appointment_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    name_vi VARCHAR(255),
    code VARCHAR(50),
    description TEXT,
    description_vi TEXT,
    default_duration_minutes INTEGER NOT NULL DEFAULT 60,
    color VARCHAR(20),
    icon VARCHAR(50),
    requires_evaluation BOOLEAN NOT NULL DEFAULT FALSE,
    allows_group BOOLEAN NOT NULL DEFAULT FALSE,
    max_group_size INTEGER DEFAULT 1,
    default_billing_codes TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Appointments
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES users(id),
    appointment_type_id UUID REFERENCES appointment_types(id),
    treatment_plan_id UUID REFERENCES treatment_plans(id),
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    appointment_type appointment_type NOT NULL DEFAULT 'follow_up',
    status appointment_status NOT NULL DEFAULT 'scheduled',
    recurrence_id UUID,
    recurrence_pattern recurrence_pattern,
    recurrence_config JSONB,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_index INTEGER,
    room VARCHAR(100),
    equipment_needed TEXT[],
    notes TEXT,
    notes_vi TEXT,
    patient_instructions TEXT,
    patient_instructions_vi TEXT,
    reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
    reminder_sent_at TIMESTAMPTZ,
    confirmation_status VARCHAR(50),
    confirmed_at TIMESTAMPTZ,
    checked_in_at TIMESTAMPTZ,
    checked_in_by UUID REFERENCES users(id),
    checked_out_at TIMESTAMPTZ,
    checked_out_by UUID REFERENCES users(id),
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES users(id),
    rescheduled_from_id UUID REFERENCES appointments(id),
    rescheduled_to_id UUID REFERENCES appointments(id),
    billing_status VARCHAR(50),
    billing_codes TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Add FK from treatment_sessions to appointments
ALTER TABLE treatment_sessions
    ADD CONSTRAINT fk_sessions_appointment
    FOREIGN KEY (appointment_id) REFERENCES appointments(id);

-- Waitlist
CREATE TABLE waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    therapist_id UUID REFERENCES users(id),
    appointment_type appointment_type NOT NULL,
    preferred_days day_of_week[],
    preferred_time_start TIME,
    preferred_time_end TIME,
    priority INTEGER NOT NULL DEFAULT 5,
    reason TEXT,
    earliest_date DATE NOT NULL DEFAULT CURRENT_DATE,
    latest_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'waiting',
    offered_appointment_id UUID REFERENCES appointments(id),
    offered_at TIMESTAMPTZ,
    offer_expires_at TIMESTAMPTZ,
    contact_method VARCHAR(50),
    contact_notes TEXT,
    scheduled_appointment_id UUID REFERENCES appointments(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Appointment Reminders
CREATE TABLE appointment_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    reminder_type VARCHAR(50) NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    hours_before INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    message_template VARCHAR(100),
    message_content TEXT,
    message_content_vi TEXT,
    response_received BOOLEAN NOT NULL DEFAULT FALSE,
    response_type VARCHAR(50),
    response_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- #############################################################################
-- FUNCTIONS
-- #############################################################################

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Calculate checklist progress
CREATE OR REPLACE FUNCTION calculate_checklist_progress(p_visit_checklist_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_required INTEGER;
    completed_required INTEGER;
    progress DECIMAL(5,2);
BEGIN
    SELECT COUNT(*)
    INTO total_required
    FROM checklist_items ci
    JOIN checklist_sections cs ON cs.id = ci.section_id
    JOIN visit_checklists vc ON vc.template_id = cs.template_id
    WHERE vc.id = p_visit_checklist_id
    AND ci.is_required = TRUE;

    IF total_required = 0 THEN
        RETURN 100.00;
    END IF;

    SELECT COUNT(*)
    INTO completed_required
    FROM visit_checklist_responses vcr
    JOIN checklist_items ci ON ci.id = vcr.checklist_item_id
    WHERE vcr.visit_checklist_id = p_visit_checklist_id
    AND ci.is_required = TRUE
    AND vcr.is_skipped = FALSE;

    progress := (completed_required::DECIMAL / total_required::DECIMAL) * 100;
    RETURN ROUND(progress, 2);
END;
$$ LANGUAGE plpgsql;

-- Check appointment conflicts
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
    AND (start_time < p_end_time AND end_time > p_start_time);

    RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Get available slots
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
    v_day_name := LOWER(TO_CHAR(p_date, 'Day'));
    v_day_name := TRIM(v_day_name);

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

    IF EXISTS (
        SELECT 1 FROM schedule_exceptions
        WHERE therapist_id = p_therapist_id
        AND exception_date = p_date
        AND is_available = FALSE
    ) THEN
        RETURN;
    END IF;

    FOR v_slot IN SELECT * FROM jsonb_array_elements(v_schedule)
    LOOP
        slot_start := (v_slot->>'start')::TIME;
        slot_end := (v_slot->>'end')::TIME;
        RETURN NEXT;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- #############################################################################
-- INDEXES
-- Note: All indexes are created in individual migration files
-- #############################################################################

-- #############################################################################
-- TRIGGERS
-- Note: All triggers are created in individual migration files
-- #############################################################################

-- #############################################################################
-- ROW LEVEL SECURITY
-- Note: RLS is enabled on all tables in migration files
-- Policies should be created based on application requirements
-- #############################################################################
