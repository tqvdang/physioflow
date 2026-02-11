-- Rollback: 010_medical_terms_tables.sql
-- Description: Rollback medical terms translation table
-- Created: 2026-02-11

-- =============================================================================
-- DROP INDEXES
-- =============================================================================

DROP INDEX IF EXISTS idx_medical_terms_search_en CASCADE;
DROP INDEX IF EXISTS idx_medical_terms_search_vi CASCADE;
DROP INDEX IF EXISTS idx_medical_terms_category CASCADE;
DROP INDEX IF EXISTS idx_medical_terms_specialty CASCADE;

-- =============================================================================
-- DROP TABLE
-- =============================================================================

DROP TABLE IF EXISTS medical_terms CASCADE;
