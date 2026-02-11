-- Migration: 006_outcome_measures_tables.sql
-- Description: Outcome measures with partitioning by year and a reference library
-- Created: 2026-02-11
-- Depends on: 001_initial_schema.sql

-- =============================================================================
-- OUTCOME MEASURES LIBRARY (reference table of standardized measures)
-- =============================================================================

CREATE TABLE outcome_measures_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Bilingual fields
    measure_type VARCHAR(100) NOT NULL UNIQUE,
    measure_type_vi VARCHAR(100),
    description TEXT,
    description_vi TEXT,

    -- Scoring info
    scale_min DECIMAL(10,2),
    scale_max DECIMAL(10,2),
    higher_is_better BOOLEAN NOT NULL DEFAULT TRUE,
    mcid_threshold DECIMAL(10,2),  -- Minimal Clinically Important Difference

    -- Metadata
    category VARCHAR(100),
    applicable_body_regions TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outcome_library_measure_type ON outcome_measures_library (measure_type);
CREATE INDEX idx_outcome_library_category ON outcome_measures_library (category);

COMMENT ON TABLE outcome_measures_library IS 'Reference library of standardized outcome measures (NPRS, ODI, DASH, etc.)';
COMMENT ON COLUMN outcome_measures_library.mcid_threshold IS 'Minimal Clinically Important Difference for this measure';

-- =============================================================================
-- OUTCOME MEASURES (partitioned by year on measurement_date)
-- =============================================================================

CREATE TABLE outcome_measures (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL,
    library_id UUID REFERENCES outcome_measures_library(id),

    -- Bilingual fields
    measure_type VARCHAR(100) NOT NULL,
    measure_type_vi VARCHAR(100),
    description TEXT,
    description_vi TEXT,

    -- Scores
    baseline_score DECIMAL(10,2),
    current_score DECIMAL(10,2),
    target_score DECIMAL(10,2),

    -- Measurement context
    measurement_date DATE NOT NULL,
    assessed_by UUID,
    assessment_id UUID,
    treatment_session_id UUID,

    -- MCID tracking
    mcid_threshold DECIMAL(10,2),
    mcid_met BOOLEAN GENERATED ALWAYS AS (
        CASE
            WHEN baseline_score IS NOT NULL AND current_score IS NOT NULL AND mcid_threshold IS NOT NULL
            THEN ABS(current_score - baseline_score) >= mcid_threshold
            ELSE NULL
        END
    ) STORED,

    -- Notes
    notes TEXT,

    -- Optimistic locking
    version INTEGER NOT NULL DEFAULT 1,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,

    PRIMARY KEY (id, measurement_date)
) PARTITION BY RANGE (measurement_date);

-- =============================================================================
-- YEAR PARTITIONS (2024-2030)
-- =============================================================================

CREATE TABLE outcome_measures_2024 PARTITION OF outcome_measures
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE outcome_measures_2025 PARTITION OF outcome_measures
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE outcome_measures_2026 PARTITION OF outcome_measures
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE outcome_measures_2027 PARTITION OF outcome_measures
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

CREATE TABLE outcome_measures_2028 PARTITION OF outcome_measures
    FOR VALUES FROM ('2028-01-01') TO ('2029-01-01');

CREATE TABLE outcome_measures_2029 PARTITION OF outcome_measures
    FOR VALUES FROM ('2029-01-01') TO ('2030-01-01');

CREATE TABLE outcome_measures_2030 PARTITION OF outcome_measures
    FOR VALUES FROM ('2030-01-01') TO ('2031-01-01');

-- =============================================================================
-- INDEXES (created on parent, applied to all partitions)
-- =============================================================================

CREATE INDEX idx_outcome_measures_patient_id ON outcome_measures (patient_id);
CREATE INDEX idx_outcome_measures_measure_type ON outcome_measures (measure_type);
CREATE INDEX idx_outcome_measures_measurement_date ON outcome_measures (measurement_date);
CREATE INDEX idx_outcome_measures_library_id ON outcome_measures (library_id);
CREATE INDEX idx_outcome_measures_patient_type_date ON outcome_measures (patient_id, measure_type, measurement_date);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER trg_outcome_measures_library_updated_at
    BEFORE UPDATE ON outcome_measures_library
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: Triggers on partitioned tables require per-partition triggers in PG < 13,
-- but PG 13+ supports triggers on partitioned tables directly.
CREATE TRIGGER trg_outcome_measures_updated_at
    BEFORE UPDATE ON outcome_measures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE outcome_measures_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_measures ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE outcome_measures IS 'Patient outcome measure scores, partitioned by year on measurement_date';
COMMENT ON COLUMN outcome_measures.mcid_met IS 'Auto-calculated: whether change from baseline meets MCID threshold';
COMMENT ON COLUMN outcome_measures.version IS 'Optimistic locking version counter';
