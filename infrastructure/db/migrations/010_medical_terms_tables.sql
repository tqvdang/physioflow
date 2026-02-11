-- Migration: 010_medical_terms_tables.sql
-- Description: Vietnamese medical terms dictionary with trigram search for autocomplete
-- Created: 2026-02-11
-- Depends on: 001_initial_schema.sql (pg_trgm already enabled)

-- =============================================================================
-- Ensure pg_trgm extension is available (idempotent)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================================
-- VIETNAMESE MEDICAL TERMS
-- =============================================================================

CREATE TABLE vietnamese_medical_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Bilingual terms
    term_en VARCHAR(255) NOT NULL,
    term_vi VARCHAR(255) NOT NULL,

    -- Bilingual definitions
    definition_en TEXT,
    definition_vi TEXT,

    -- Categorization
    category VARCHAR(100) NOT NULL,  -- anatomy, symptom, condition, treatment, equipment, etc.
    subcategory VARCHAR(100),

    -- Clinical coding
    icd10_code VARCHAR(20),

    -- Aliases and synonyms
    aliases_en TEXT[],
    aliases_vi TEXT[],

    -- Usage context
    commonly_used BOOLEAN NOT NULL DEFAULT TRUE,
    usage_notes TEXT,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_medical_term UNIQUE (term_en, category)
);

-- =============================================================================
-- B-TREE INDEXES (standard lookups)
-- =============================================================================

CREATE INDEX idx_medical_terms_category ON vietnamese_medical_terms (category);
CREATE INDEX idx_medical_terms_subcategory ON vietnamese_medical_terms (subcategory);
CREATE INDEX idx_medical_terms_icd10 ON vietnamese_medical_terms (icd10_code) WHERE icd10_code IS NOT NULL;
CREATE INDEX idx_medical_terms_is_active ON vietnamese_medical_terms (is_active);

-- =============================================================================
-- GIN TRIGRAM INDEXES (for autocomplete text search)
-- =============================================================================

CREATE INDEX idx_medical_terms_en_trgm ON vietnamese_medical_terms USING GIN (term_en gin_trgm_ops);
CREATE INDEX idx_medical_terms_vi_trgm ON vietnamese_medical_terms USING GIN (term_vi gin_trgm_ops);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER trg_medical_terms_updated_at
    BEFORE UPDATE ON vietnamese_medical_terms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE vietnamese_medical_terms ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE vietnamese_medical_terms IS 'Bilingual medical terminology dictionary for Vietnamese PT practice';
COMMENT ON COLUMN vietnamese_medical_terms.term_en IS 'English medical term';
COMMENT ON COLUMN vietnamese_medical_terms.term_vi IS 'Vietnamese medical term';
COMMENT ON COLUMN vietnamese_medical_terms.icd10_code IS 'ICD-10 code where applicable';
COMMENT ON COLUMN vietnamese_medical_terms.aliases_en IS 'Alternative English terms/spellings';
COMMENT ON COLUMN vietnamese_medical_terms.aliases_vi IS 'Alternative Vietnamese terms/spellings';
