-- Rollback: 009_discharge_planning_tables.sql
-- Description: Rollback discharge planning and documentation tables
-- Created: 2026-02-11

-- =============================================================================
-- DROP TABLES (in reverse order of dependencies)
-- =============================================================================

DROP TABLE IF EXISTS discharge_summaries CASCADE;
DROP TABLE IF EXISTS discharge_plans CASCADE;

-- =============================================================================
-- DROP ENUMS
-- =============================================================================

DROP TYPE IF EXISTS discharge_status CASCADE;
DROP TYPE IF EXISTS discharge_reason CASCADE;
DROP TYPE IF EXISTS discharge_disposition CASCADE;
