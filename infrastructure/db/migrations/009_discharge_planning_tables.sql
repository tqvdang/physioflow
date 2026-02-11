-- Migration: 009_discharge_planning_tables.sql
-- Description: Discharge plans and discharge summaries
-- Created: 2026-02-11
-- Depends on: 001_initial_schema.sql, 002_clinical_schema.sql

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE discharge_status AS ENUM (
    'planned',
    'in_progress',
    'pending_review',
    'completed',
    'cancelled'
);

CREATE TYPE discharge_reason AS ENUM (
    'goals_met',
    'goals_partially_met',
    'patient_request',
    'non_compliance',
    'insurance_exhausted',
    'transferred',
    'medical_change',
    'other'
);

-- =============================================================================
-- DISCHARGE PLANS
-- =============================================================================

CREATE TABLE discharge_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    treatment_plan_id UUID REFERENCES treatment_plans(id),
    therapist_id UUID NOT NULL REFERENCES users(id),
    clinic_id UUID NOT NULL REFERENCES clinics(id),

    -- Planning
    planned_discharge_date DATE,
    actual_discharge_date DATE,
    status discharge_status NOT NULL DEFAULT 'planned',
    discharge_reason discharge_reason,

    -- Baseline comparison (JSONB for complex structure)
    baseline_comparison JSONB NOT NULL DEFAULT '{}',
    /*
    {
        "measures": [
            {
                "name": "text",
                "name_vi": "text",
                "baseline_score": number,
                "discharge_score": number,
                "target_score": number,
                "improvement_percent": number,
                "mcid_met": boolean
            }
        ],
        "functional_gains": "text",
        "functional_gains_vi": "text"
    }
    */

    -- Outcome trending (JSONB for chart data)
    outcome_trending JSONB NOT NULL DEFAULT '{}',
    /*
    {
        "measures": {
            "measure_name": [
                { "date": "ISO date", "score": number }
            ]
        },
        "pain_levels": [
            { "date": "ISO date", "score": number }
        ]
    }
    */

    -- Home Exercise Program at discharge (JSONB)
    hep_exercises JSONB NOT NULL DEFAULT '[]',
    /*
    [
        {
            "name": "text",
            "name_vi": "text",
            "instructions": "text",
            "instructions_vi": "text",
            "sets": number,
            "reps": number,
            "frequency": "text",
            "frequency_vi": "text",
            "image_url": "text",
            "video_url": "text"
        }
    ]
    */

    -- Follow-up
    follow_up_date DATE,
    follow_up_instructions TEXT,
    follow_up_instructions_vi TEXT,
    referral_info TEXT,

    -- Optimistic locking
    version INTEGER NOT NULL DEFAULT 1,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_discharge_plans_patient_id ON discharge_plans (patient_id);
CREATE INDEX idx_discharge_plans_treatment_plan ON discharge_plans (treatment_plan_id);
CREATE INDEX idx_discharge_plans_therapist_id ON discharge_plans (therapist_id);
CREATE INDEX idx_discharge_plans_clinic_id ON discharge_plans (clinic_id);
CREATE INDEX idx_discharge_plans_discharge_date ON discharge_plans (actual_discharge_date);
CREATE INDEX idx_discharge_plans_status ON discharge_plans (status);

COMMENT ON TABLE discharge_plans IS 'Discharge planning with baseline comparison and outcome trending';
COMMENT ON COLUMN discharge_plans.baseline_comparison IS 'Before/after comparison of outcome measures';
COMMENT ON COLUMN discharge_plans.outcome_trending IS 'Longitudinal outcome data for trending charts';
COMMENT ON COLUMN discharge_plans.hep_exercises IS 'Home exercise program prescribed at discharge';
COMMENT ON COLUMN discharge_plans.version IS 'Optimistic locking version counter';

-- =============================================================================
-- DISCHARGE SUMMARIES
-- =============================================================================

CREATE TABLE discharge_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discharge_plan_id UUID NOT NULL REFERENCES discharge_plans(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    therapist_id UUID NOT NULL REFERENCES users(id),

    -- Bilingual summary
    summary_text TEXT,
    summary_text_vi TEXT,

    -- Bilingual recommendations
    recommendations TEXT,
    recommendations_vi TEXT,

    -- Clinical details
    diagnosis_at_discharge TEXT,
    diagnosis_at_discharge_vi TEXT,
    treatment_provided TEXT,
    treatment_provided_vi TEXT,
    patient_response TEXT,
    patient_response_vi TEXT,

    -- Goals status
    goals_status JSONB NOT NULL DEFAULT '[]',
    /*
    [
        {
            "goal": "text",
            "goal_vi": "text",
            "status": "achieved" | "partially_achieved" | "not_achieved",
            "notes": "text"
        }
    ]
    */

    -- Signatures
    therapist_signature_at TIMESTAMPTZ,
    supervisor_id UUID REFERENCES users(id),
    supervisor_signature_at TIMESTAMPTZ,
    patient_acknowledged_at TIMESTAMPTZ,

    -- Optimistic locking
    version INTEGER NOT NULL DEFAULT 1,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_discharge_summaries_plan_id ON discharge_summaries (discharge_plan_id);
CREATE INDEX idx_discharge_summaries_patient_id ON discharge_summaries (patient_id);
CREATE INDEX idx_discharge_summaries_therapist_id ON discharge_summaries (therapist_id);

COMMENT ON TABLE discharge_summaries IS 'Discharge summaries with bilingual text and goal outcomes';
COMMENT ON COLUMN discharge_summaries.version IS 'Optimistic locking version counter';

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER trg_discharge_plans_updated_at
    BEFORE UPDATE ON discharge_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_discharge_summaries_updated_at
    BEFORE UPDATE ON discharge_summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE discharge_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE discharge_summaries ENABLE ROW LEVEL SECURITY;
