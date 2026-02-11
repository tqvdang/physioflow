-- Migration: 022_reevaluation_assessments.sql
-- Description: Create reevaluation_assessments table for baseline comparison workflow
-- Created: 2026-02-11
-- Sprint: 2A - Re-evaluation Workflow with Baseline Comparison
--
-- Re-evaluation assessments compare current values to baseline (initial assessment)
-- values for ROM, MMT, and outcome measures. Tracks MCID achievement and
-- interprets changes as improved/declined/stable.

-- =============================================================================
-- Reevaluation Assessments Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS reevaluation_assessments (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id              UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    visit_id                UUID,
    clinic_id               UUID NOT NULL,
    baseline_assessment_id  UUID,  -- FK to the initial assessment (outcome_measures, rom_assessments, or mmt_assessments)

    -- Assessment details
    assessment_type         VARCHAR(30) NOT NULL,  -- rom, mmt, outcome_measure
    measure_label           VARCHAR(120) NOT NULL,  -- e.g. "Shoulder Flexion Left Active", "VAS Pain", "Quadriceps Left"
    current_value           NUMERIC(10,2) NOT NULL,
    baseline_value          NUMERIC(10,2) NOT NULL,
    change                  NUMERIC(10,2) NOT NULL,  -- current - baseline
    change_percentage       NUMERIC(8,2),            -- percentage change from baseline
    higher_is_better        BOOLEAN NOT NULL DEFAULT true,

    -- MCID tracking
    mcid_threshold          NUMERIC(10,2),
    mcid_achieved           BOOLEAN NOT NULL DEFAULT false,

    -- Interpretation
    interpretation          VARCHAR(20) NOT NULL DEFAULT 'stable',

    -- Who performed the re-evaluation
    therapist_id            UUID NOT NULL,
    notes                   TEXT,

    -- Timestamps
    assessed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT reeval_assessment_type_check CHECK (
        assessment_type IN ('rom', 'mmt', 'outcome_measure')
    ),
    CONSTRAINT reeval_interpretation_check CHECK (
        interpretation IN ('improved', 'declined', 'stable')
    )
);

-- Indexes for common queries
CREATE INDEX idx_reeval_patient_id ON reevaluation_assessments (patient_id, assessed_at DESC);
CREATE INDEX idx_reeval_baseline_id ON reevaluation_assessments (baseline_assessment_id) WHERE baseline_assessment_id IS NOT NULL;
CREATE INDEX idx_reeval_patient_type ON reevaluation_assessments (patient_id, assessment_type, assessed_at DESC);
CREATE INDEX idx_reeval_therapist ON reevaluation_assessments (therapist_id, assessed_at DESC);

-- =============================================================================
-- Trigger for updated_at
-- =============================================================================

CREATE TRIGGER update_reevaluation_assessments_updated_at
    BEFORE UPDATE ON reevaluation_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE reevaluation_assessments IS 'Re-evaluation assessments comparing current values to baseline for tracking patient progress';
COMMENT ON COLUMN reevaluation_assessments.assessment_type IS 'Type of assessment: rom, mmt, or outcome_measure';
COMMENT ON COLUMN reevaluation_assessments.measure_label IS 'Human-readable label for the measurement (e.g. Shoulder Flexion Left Active)';
COMMENT ON COLUMN reevaluation_assessments.baseline_assessment_id IS 'Reference to the original baseline assessment record';
COMMENT ON COLUMN reevaluation_assessments.change IS 'Absolute change: current_value - baseline_value';
COMMENT ON COLUMN reevaluation_assessments.change_percentage IS 'Percentage change from baseline';
COMMENT ON COLUMN reevaluation_assessments.mcid_threshold IS 'Minimal Clinically Important Difference threshold for this measure';
COMMENT ON COLUMN reevaluation_assessments.mcid_achieved IS 'Whether the change exceeds the MCID threshold';
COMMENT ON COLUMN reevaluation_assessments.interpretation IS 'Clinical interpretation: improved, declined, or stable';
