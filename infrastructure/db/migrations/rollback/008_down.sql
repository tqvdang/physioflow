-- Rollback: 008_clinical_protocols_tables.sql
-- Description: Rollback clinical protocol tables
-- Created: 2026-02-11

-- =============================================================================
-- DROP TABLES (in reverse order of dependencies)
-- =============================================================================

DROP TABLE IF EXISTS patient_protocol_exercises CASCADE;
DROP TABLE IF EXISTS patient_protocols CASCADE;
DROP TABLE IF EXISTS clinical_protocols CASCADE;

-- =============================================================================
-- DROP ENUMS
-- =============================================================================

DROP TYPE IF EXISTS protocol_status CASCADE;
