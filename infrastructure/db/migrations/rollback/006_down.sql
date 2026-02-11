-- Rollback: 006_outcome_measures_tables.sql
-- Description: Rollback outcome measures tables and library
-- Created: 2026-02-11

-- =============================================================================
-- DROP PARTITIONS
-- =============================================================================

DROP TABLE IF EXISTS outcome_measures_2024 CASCADE;
DROP TABLE IF EXISTS outcome_measures_2025 CASCADE;
DROP TABLE IF EXISTS outcome_measures_2026 CASCADE;
DROP TABLE IF EXISTS outcome_measures_2027 CASCADE;
DROP TABLE IF EXISTS outcome_measures_2028 CASCADE;
DROP TABLE IF EXISTS outcome_measures_2029 CASCADE;
DROP TABLE IF EXISTS outcome_measures_2030 CASCADE;

-- =============================================================================
-- DROP PARTITIONED TABLE
-- =============================================================================

DROP TABLE IF EXISTS outcome_measures CASCADE;

-- =============================================================================
-- DROP LIBRARY TABLE
-- =============================================================================

DROP TABLE IF EXISTS outcome_measures_library CASCADE;
