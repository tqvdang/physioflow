-- Migration: 008_clinical_protocols_tables.sql
-- Description: Clinical protocol templates and patient protocol assignments
-- Created: 2026-02-11
-- Depends on: 001_initial_schema.sql, 002_clinical_schema.sql

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE protocol_status AS ENUM (
    'draft',
    'active',
    'completed',
    'on_hold',
    'discontinued'
);

-- =============================================================================
-- CLINICAL PROTOCOLS (templates)
-- =============================================================================

CREATE TABLE clinical_protocols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id),  -- NULL for system-wide protocols

    -- Bilingual naming
    protocol_name VARCHAR(255) NOT NULL,
    protocol_name_vi VARCHAR(255),
    description TEXT,
    description_vi TEXT,

    -- Protocol details (JSONB for complex nested structures)
    goals JSONB NOT NULL DEFAULT '[]',
    /*
    goals structure:
    [
        {
            "type": "short_term" | "long_term",
            "description": "text",
            "description_vi": "text",
            "measurable_criteria": "text",
            "target_timeframe_weeks": number
        }
    ]
    */

    exercises JSONB NOT NULL DEFAULT '[]',
    /*
    exercises structure:
    [
        {
            "name": "text",
            "name_vi": "text",
            "description": "text",
            "description_vi": "text",
            "sets": number,
            "reps": number,
            "duration_seconds": number,
            "frequency_per_day": number,
            "phase": "initial" | "intermediate" | "advanced",
            "precautions": ["text"]
        }
    ]
    */

    -- Schedule
    frequency_per_week INTEGER NOT NULL DEFAULT 2,
    duration_weeks INTEGER NOT NULL DEFAULT 8,
    session_duration_minutes INTEGER NOT NULL DEFAULT 60,

    -- Progression
    progression_criteria JSONB NOT NULL DEFAULT '{}',
    /*
    {
        "phase_transitions": [
            {
                "from_phase": "initial",
                "to_phase": "intermediate",
                "criteria": "text",
                "criteria_vi": "text",
                "typical_week": number
            }
        ],
        "discharge_criteria": "text",
        "discharge_criteria_vi": "text"
    }
    */

    -- Categorization
    category VARCHAR(100),
    applicable_diagnoses TEXT[],  -- ICD-10 codes
    body_regions TEXT[],

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    version INTEGER NOT NULL DEFAULT 1,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_protocols_clinic_id ON clinical_protocols (clinic_id);
CREATE INDEX idx_protocols_category ON clinical_protocols (category);
CREATE INDEX idx_protocols_is_active ON clinical_protocols (is_active);
CREATE INDEX idx_protocols_diagnoses ON clinical_protocols USING GIN (applicable_diagnoses);
CREATE INDEX idx_protocols_body_regions ON clinical_protocols USING GIN (body_regions);

COMMENT ON TABLE clinical_protocols IS 'Clinical protocol templates with bilingual goals and exercises';
COMMENT ON COLUMN clinical_protocols.goals IS 'Protocol goals as JSONB array (complex nested structure)';
COMMENT ON COLUMN clinical_protocols.exercises IS 'Protocol exercises as JSONB array (complex nested structure)';
COMMENT ON COLUMN clinical_protocols.progression_criteria IS 'Criteria for phase transitions and discharge';

-- =============================================================================
-- PATIENT PROTOCOLS (instances assigned to patients)
-- =============================================================================

CREATE TABLE patient_protocols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    protocol_id UUID NOT NULL REFERENCES clinical_protocols(id),
    therapist_id UUID NOT NULL REFERENCES users(id),
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    treatment_plan_id UUID REFERENCES treatment_plans(id),

    -- Assignment
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_date DATE,
    target_end_date DATE,
    actual_end_date DATE,

    -- Progress
    progress_status protocol_status NOT NULL DEFAULT 'active',
    current_phase VARCHAR(50) DEFAULT 'initial',
    sessions_completed INTEGER NOT NULL DEFAULT 0,

    -- Customizations (overrides from protocol template)
    custom_goals JSONB,
    custom_exercises JSONB,
    custom_frequency_per_week INTEGER,
    custom_duration_weeks INTEGER,

    -- Progress notes
    progress_notes JSONB NOT NULL DEFAULT '[]',
    /*
    [
        {
            "date": "ISO date",
            "note": "text",
            "note_vi": "text",
            "phase": "text",
            "therapist_id": "UUID"
        }
    ]
    */

    -- Optimistic locking
    version INTEGER NOT NULL DEFAULT 1,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_patient_protocols_patient_id ON patient_protocols (patient_id);
CREATE INDEX idx_patient_protocols_protocol_id ON patient_protocols (protocol_id);
CREATE INDEX idx_patient_protocols_therapist_id ON patient_protocols (therapist_id);
CREATE INDEX idx_patient_protocols_clinic_id ON patient_protocols (clinic_id);
CREATE INDEX idx_patient_protocols_progress_status ON patient_protocols (progress_status);
CREATE INDEX idx_patient_protocols_assigned_date ON patient_protocols (assigned_date);
CREATE INDEX idx_patient_protocols_treatment_plan ON patient_protocols (treatment_plan_id);

COMMENT ON TABLE patient_protocols IS 'Protocols assigned to patients with progress tracking';
COMMENT ON COLUMN patient_protocols.version IS 'Optimistic locking version counter';

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER trg_clinical_protocols_updated_at
    BEFORE UPDATE ON clinical_protocols
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_patient_protocols_updated_at
    BEFORE UPDATE ON patient_protocols
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE clinical_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_protocols ENABLE ROW LEVEL SECURITY;
