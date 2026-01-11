-- Migration: 002_clinical_schema.sql
-- Description: Clinical tables - assessments, treatment plans, treatment sessions
-- Created: 2026-01-10

-- =============================================================================
-- ENUMS
-- =============================================================================

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

-- =============================================================================
-- DIAGNOSES (ICD-10 based)
-- =============================================================================

CREATE TABLE diagnoses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    description_vi TEXT,
    category VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diagnoses_code ON diagnoses (code);
CREATE INDEX idx_diagnoses_category ON diagnoses (category);
CREATE INDEX idx_diagnoses_description_trgm ON diagnoses USING GIN (description gin_trgm_ops);

COMMENT ON TABLE diagnoses IS 'ICD-10 diagnosis codes with Vietnamese translations';

-- =============================================================================
-- ASSESSMENTS
-- =============================================================================

CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES users(id),
    clinic_id UUID NOT NULL REFERENCES clinics(id),

    -- Assessment metadata
    assessment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assessment_type VARCHAR(50) NOT NULL DEFAULT 'initial',  -- initial, follow_up, discharge
    status assessment_status NOT NULL DEFAULT 'draft',

    -- Chief complaint
    chief_complaint TEXT,
    chief_complaint_vi TEXT,
    onset_date DATE,
    mechanism_of_injury TEXT,
    mechanism_of_injury_vi TEXT,

    -- Medical history
    medical_history JSONB NOT NULL DEFAULT '{}',
    surgical_history JSONB NOT NULL DEFAULT '[]',
    medications JSONB NOT NULL DEFAULT '[]',
    allergies TEXT[],

    -- Pain assessment
    pain_data JSONB NOT NULL DEFAULT '{}',
    /*
    pain_data structure:
    {
        "locations": [
            {
                "region": "body_region",
                "current_level": 0-10,
                "worst_level": 0-10,
                "best_level": 0-10,
                "pain_type": "pain_type",
                "aggravating_factors": ["text"],
                "relieving_factors": ["text"],
                "24hr_pattern": "text"
            }
        ],
        "vas_score": 0-10,
        "nprs_score": 0-10
    }
    */

    -- Range of Motion measurements
    rom_measurements JSONB NOT NULL DEFAULT '{}',
    /*
    rom_measurements structure:
    {
        "joint_name": {
            "movement": {
                "active": { "value": number, "wn": boolean, "painful": boolean },
                "passive": { "value": number, "wn": boolean, "painful": boolean },
                "notes": "text"
            }
        }
    }
    */

    -- Strength testing
    strength_measurements JSONB NOT NULL DEFAULT '{}',
    /*
    strength_measurements structure:
    {
        "muscle_group": {
            "left": "0-5 or NT",
            "right": "0-5 or NT",
            "notes": "text"
        }
    }
    */

    -- Special tests
    special_tests JSONB NOT NULL DEFAULT '[]',
    /*
    special_tests structure:
    [
        {
            "test_name": "text",
            "result": "positive/negative/inconclusive",
            "side": "left/right/bilateral",
            "notes": "text"
        }
    ]
    */

    -- Functional assessment
    functional_assessment JSONB NOT NULL DEFAULT '{}',
    gait_analysis TEXT,
    gait_analysis_vi TEXT,
    balance_assessment TEXT,
    posture_assessment TEXT,

    -- Objective measurements
    outcome_measures JSONB NOT NULL DEFAULT '{}',
    /*
    outcome_measures structure:
    {
        "measure_name": {
            "score": number,
            "date": "ISO date",
            "interpretation": "text"
        }
    }
    Examples: NPRS, ODI, DASH, LEFS, etc.
    */

    -- Clinical impression
    clinical_impression TEXT,
    clinical_impression_vi TEXT,

    -- Diagnosis
    primary_diagnosis_id UUID REFERENCES diagnoses(id),
    secondary_diagnoses UUID[],

    -- Goals
    goals JSONB NOT NULL DEFAULT '[]',
    /*
    goals structure:
    [
        {
            "type": "short_term/long_term",
            "description": "text",
            "description_vi": "text",
            "target_date": "ISO date",
            "measurable_outcome": "text",
            "status": "active/achieved/modified/discontinued"
        }
    ]
    */

    -- Prognosis
    prognosis VARCHAR(50),  -- excellent, good, fair, guarded, poor
    prognosis_notes TEXT,

    -- Signatures
    therapist_signature_at TIMESTAMPTZ,
    supervisor_id UUID REFERENCES users(id),
    supervisor_signature_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_assessments_patient_id ON assessments (patient_id);
CREATE INDEX idx_assessments_therapist_id ON assessments (therapist_id);
CREATE INDEX idx_assessments_clinic_id ON assessments (clinic_id);
CREATE INDEX idx_assessments_date ON assessments (assessment_date);
CREATE INDEX idx_assessments_status ON assessments (status);
CREATE INDEX idx_assessments_type ON assessments (assessment_type);
CREATE INDEX idx_assessments_diagnosis ON assessments (primary_diagnosis_id);
CREATE INDEX idx_assessments_pain_data ON assessments USING GIN (pain_data);
CREATE INDEX idx_assessments_rom ON assessments USING GIN (rom_measurements);

COMMENT ON TABLE assessments IS 'Physical therapy assessments with bilingual support';
COMMENT ON COLUMN assessments.pain_data IS 'Structured pain assessment data as JSON';
COMMENT ON COLUMN assessments.rom_measurements IS 'Range of motion measurements as JSON';
COMMENT ON COLUMN assessments.outcome_measures IS 'Standardized outcome measures (NPRS, ODI, etc.)';

-- =============================================================================
-- TREATMENT PLANS
-- =============================================================================

CREATE TABLE treatment_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessments(id),
    therapist_id UUID NOT NULL REFERENCES users(id),
    clinic_id UUID NOT NULL REFERENCES clinics(id),

    -- Plan metadata
    plan_name VARCHAR(255),
    status treatment_plan_status NOT NULL DEFAULT 'draft',
    start_date DATE NOT NULL,
    end_date DATE,

    -- Diagnosis reference
    primary_diagnosis_id UUID REFERENCES diagnoses(id),
    diagnosis_description TEXT,
    diagnosis_description_vi TEXT,

    -- Goals (bilingual)
    short_term_goals JSONB NOT NULL DEFAULT '[]',
    /*
    [
        {
            "goal": "text",
            "goal_vi": "text",
            "target_date": "ISO date",
            "measurable_criteria": "text",
            "status": "active/achieved/modified"
        }
    ]
    */
    long_term_goals JSONB NOT NULL DEFAULT '[]',

    -- Interventions
    interventions JSONB NOT NULL DEFAULT '[]',
    /*
    [
        {
            "type": "manual_therapy/therapeutic_exercise/modality/education",
            "name": "text",
            "name_vi": "text",
            "description": "text",
            "parameters": {
                "sets": number,
                "reps": number,
                "duration": "text",
                "frequency": "text",
                "intensity": "text"
            },
            "precautions": ["text"],
            "is_active": boolean
        }
    ]
    */

    -- Frequency and duration
    frequency_per_week INTEGER NOT NULL DEFAULT 2,
    session_duration_minutes INTEGER NOT NULL DEFAULT 60,
    total_sessions_planned INTEGER,
    sessions_completed INTEGER NOT NULL DEFAULT 0,

    -- Precautions and contraindications
    precautions TEXT[],
    contraindications TEXT[],

    -- Patient education
    patient_education JSONB NOT NULL DEFAULT '[]',
    home_exercise_program JSONB NOT NULL DEFAULT '[]',

    -- Progress notes
    progress_notes TEXT,
    progress_notes_vi TEXT,

    -- Authorization
    insurance_authorization_number VARCHAR(100),
    authorized_sessions INTEGER,
    authorization_valid_until DATE,

    -- Signatures
    therapist_signature_at TIMESTAMPTZ,
    patient_consent_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_treatment_plans_patient_id ON treatment_plans (patient_id);
CREATE INDEX idx_treatment_plans_therapist_id ON treatment_plans (therapist_id);
CREATE INDEX idx_treatment_plans_clinic_id ON treatment_plans (clinic_id);
CREATE INDEX idx_treatment_plans_assessment_id ON treatment_plans (assessment_id);
CREATE INDEX idx_treatment_plans_status ON treatment_plans (status);
CREATE INDEX idx_treatment_plans_dates ON treatment_plans (start_date, end_date);
CREATE INDEX idx_treatment_plans_interventions ON treatment_plans USING GIN (interventions);

COMMENT ON TABLE treatment_plans IS 'Treatment plans with goals, interventions, and tracking';
COMMENT ON COLUMN treatment_plans.interventions IS 'Planned interventions with parameters as JSON';
COMMENT ON COLUMN treatment_plans.home_exercise_program IS 'HEP exercises prescribed to patient';

-- =============================================================================
-- TREATMENT SESSIONS
-- =============================================================================

CREATE TABLE treatment_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    treatment_plan_id UUID REFERENCES treatment_plans(id),
    therapist_id UUID NOT NULL REFERENCES users(id),
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    appointment_id UUID,  -- Will reference appointments table

    -- Session timing
    session_date DATE NOT NULL,
    scheduled_start_time TIME,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    status session_status NOT NULL DEFAULT 'scheduled',

    -- Session timer data (for real-time tracking)
    timer_data JSONB NOT NULL DEFAULT '{}',
    /*
    timer_data structure:
    {
        "activities": [
            {
                "name": "text",
                "start_time": "ISO timestamp",
                "end_time": "ISO timestamp",
                "duration_seconds": number,
                "category": "evaluation/treatment/documentation"
            }
        ],
        "total_treatment_time": number,
        "total_documentation_time": number
    }
    */

    -- Subjective
    patient_report TEXT,
    patient_report_vi TEXT,
    pain_level_pre INTEGER CHECK (pain_level_pre >= 0 AND pain_level_pre <= 10),
    pain_level_post INTEGER CHECK (pain_level_post >= 0 AND pain_level_post <= 10),

    -- Objective
    objective_findings JSONB NOT NULL DEFAULT '{}',
    vitals JSONB NOT NULL DEFAULT '{}',

    -- Interventions performed
    interventions_performed JSONB NOT NULL DEFAULT '[]',
    /*
    [
        {
            "intervention_type": "text",
            "name": "text",
            "parameters": {
                "sets": number,
                "reps": number,
                "duration": "text",
                "resistance": "text"
            },
            "patient_response": "text",
            "duration_minutes": number
        }
    ]
    */

    -- Assessment/Response
    patient_response TEXT,
    patient_response_vi TEXT,
    tolerance VARCHAR(50),  -- good, fair, poor

    -- Plan for next session
    plan_for_next TEXT,
    plan_for_next_vi TEXT,

    -- Auto-generated notes
    auto_generated_notes JSONB NOT NULL DEFAULT '{}',
    /*
    auto_generated_notes structure:
    {
        "soap_note": {
            "subjective": "text",
            "objective": "text",
            "assessment": "text",
            "plan": "text"
        },
        "soap_note_vi": {...},
        "generated_at": "ISO timestamp",
        "generation_version": "1.0"
    }
    */

    -- Final notes (therapist-edited)
    final_notes TEXT,
    final_notes_vi TEXT,

    -- Billing
    billing_codes TEXT[],
    units_billed JSONB NOT NULL DEFAULT '{}',

    -- Signatures
    therapist_signature_at TIMESTAMPTZ,
    patient_signature_at TIMESTAMPTZ,
    cosigner_id UUID REFERENCES users(id),
    cosigner_signature_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_sessions_patient_id ON treatment_sessions (patient_id);
CREATE INDEX idx_sessions_treatment_plan_id ON treatment_sessions (treatment_plan_id);
CREATE INDEX idx_sessions_therapist_id ON treatment_sessions (therapist_id);
CREATE INDEX idx_sessions_clinic_id ON treatment_sessions (clinic_id);
CREATE INDEX idx_sessions_date ON treatment_sessions (session_date);
CREATE INDEX idx_sessions_status ON treatment_sessions (status);
CREATE INDEX idx_sessions_appointment_id ON treatment_sessions (appointment_id);
CREATE INDEX idx_sessions_interventions ON treatment_sessions USING GIN (interventions_performed);

COMMENT ON TABLE treatment_sessions IS 'Individual treatment session documentation';
COMMENT ON COLUMN treatment_sessions.timer_data IS 'Real-time session timer tracking data';
COMMENT ON COLUMN treatment_sessions.auto_generated_notes IS 'AI-generated SOAP notes for review';

-- =============================================================================
-- EXERCISE LIBRARY
-- =============================================================================

CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id),  -- NULL for global exercises

    name VARCHAR(255) NOT NULL,
    name_vi VARCHAR(255),
    description TEXT,
    description_vi TEXT,
    instructions TEXT,
    instructions_vi TEXT,

    category VARCHAR(100) NOT NULL,
    body_regions body_region[],

    -- Media
    image_urls TEXT[],
    video_url TEXT,

    -- Parameters
    default_sets INTEGER,
    default_reps INTEGER,
    default_duration_seconds INTEGER,

    -- Metadata
    difficulty_level VARCHAR(50),  -- beginner, intermediate, advanced
    equipment_needed TEXT[],
    precautions TEXT,
    precautions_vi TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_exercises_clinic_id ON exercises (clinic_id);
CREATE INDEX idx_exercises_category ON exercises (category);
CREATE INDEX idx_exercises_body_regions ON exercises USING GIN (body_regions);
CREATE INDEX idx_exercises_name_trgm ON exercises USING GIN (name gin_trgm_ops);

COMMENT ON TABLE exercises IS 'Exercise library for treatment and HEP';
COMMENT ON COLUMN exercises.clinic_id IS 'NULL for global exercises, set for clinic-specific';

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER trg_assessments_updated_at
    BEFORE UPDATE ON assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_treatment_plans_updated_at
    BEFORE UPDATE ON treatment_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_treatment_sessions_updated_at
    BEFORE UPDATE ON treatment_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_exercises_updated_at
    BEFORE UPDATE ON exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
