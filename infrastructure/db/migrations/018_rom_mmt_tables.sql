-- Migration: 018_rom_mmt_tables.sql
-- Description: Create ROM (Range of Motion) and MMT (Manual Muscle Testing) assessment tables
-- Created: 2026-02-11
-- Sprint: 1B - Assessment Forms
--
-- ROM assessments store structured joint range of motion measurements.
-- MMT assessments store manual muscle testing grades (0-5 scale).
-- Both support trending and baseline comparison for progress tracking.

-- =============================================================================
-- ROM Assessments Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS rom_assessments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    visit_id        UUID,
    clinic_id       UUID NOT NULL,
    therapist_id    UUID NOT NULL,

    -- Joint and measurement details
    joint           VARCHAR(50) NOT NULL,
    side            VARCHAR(10) NOT NULL,
    movement_type   VARCHAR(10) NOT NULL,  -- active or passive
    degree          NUMERIC(5,1) NOT NULL,

    -- Optional context
    notes           TEXT,

    -- Timestamps
    assessed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT rom_joint_check CHECK (
        joint IN ('shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle',
                  'cervical_spine', 'thoracic_spine', 'lumbar_spine')
    ),
    CONSTRAINT rom_side_check CHECK (
        side IN ('left', 'right', 'bilateral')
    ),
    CONSTRAINT rom_movement_type_check CHECK (
        movement_type IN ('active', 'passive')
    ),
    CONSTRAINT rom_degree_check CHECK (
        degree BETWEEN 0 AND 360
    )
);

-- Indexes for common queries
CREATE INDEX idx_rom_patient_assessed ON rom_assessments (patient_id, assessed_at DESC);
CREATE INDEX idx_rom_visit ON rom_assessments (visit_id) WHERE visit_id IS NOT NULL;
CREATE INDEX idx_rom_patient_joint ON rom_assessments (patient_id, joint, side, assessed_at DESC);

-- =============================================================================
-- MMT Assessments Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS mmt_assessments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    visit_id        UUID,
    clinic_id       UUID NOT NULL,
    therapist_id    UUID NOT NULL,

    -- Muscle group and grading
    muscle_group    VARCHAR(80) NOT NULL,
    side            VARCHAR(10) NOT NULL,
    grade           NUMERIC(2,1) NOT NULL,

    -- Optional context
    notes           TEXT,

    -- Timestamps
    assessed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT mmt_side_check CHECK (
        side IN ('left', 'right', 'bilateral')
    ),
    CONSTRAINT mmt_grade_check CHECK (
        grade BETWEEN 0 AND 5
    )
);

-- Indexes for common queries
CREATE INDEX idx_mmt_patient_assessed ON mmt_assessments (patient_id, assessed_at DESC);
CREATE INDEX idx_mmt_visit ON mmt_assessments (visit_id) WHERE visit_id IS NOT NULL;
CREATE INDEX idx_mmt_patient_muscle ON mmt_assessments (patient_id, muscle_group, side, assessed_at DESC);

-- =============================================================================
-- Trigger for updated_at
-- =============================================================================

-- Reuse existing update_updated_at_column function if it exists,
-- otherwise create it.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rom_assessments_updated_at
    BEFORE UPDATE ON rom_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mmt_assessments_updated_at
    BEFORE UPDATE ON mmt_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE rom_assessments IS 'Range of Motion assessments for patient joints';
COMMENT ON COLUMN rom_assessments.joint IS 'Joint being measured: shoulder, elbow, wrist, hip, knee, ankle, cervical_spine, thoracic_spine, lumbar_spine';
COMMENT ON COLUMN rom_assessments.side IS 'Side of body: left, right, or bilateral';
COMMENT ON COLUMN rom_assessments.movement_type IS 'Type of ROM: active (patient moves) or passive (therapist moves)';
COMMENT ON COLUMN rom_assessments.degree IS 'Measured range in degrees (0-360)';

COMMENT ON TABLE mmt_assessments IS 'Manual Muscle Testing assessments with 0-5 grading scale';
COMMENT ON COLUMN mmt_assessments.muscle_group IS 'Muscle group being tested (e.g., deltoid, biceps, quadriceps)';
COMMENT ON COLUMN mmt_assessments.grade IS 'MMT grade: 0=no contraction, 1=trace, 2=poor, 3=fair, 4=good, 5=normal. Half grades (e.g. 3.5) are allowed.';
