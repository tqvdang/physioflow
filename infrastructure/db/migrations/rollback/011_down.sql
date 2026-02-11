-- Rollback: 011_audit_tables.sql
-- Description: Rollback audit logging tables
-- Created: 2026-02-11

-- =============================================================================
-- DROP PARTITIONS
-- =============================================================================

DROP TABLE IF EXISTS audit_logs_2024 CASCADE;
DROP TABLE IF EXISTS audit_logs_2025 CASCADE;
DROP TABLE IF EXISTS audit_logs_2026 CASCADE;
DROP TABLE IF EXISTS audit_logs_2027 CASCADE;
DROP TABLE IF EXISTS audit_logs_2028 CASCADE;
DROP TABLE IF EXISTS audit_logs_2029 CASCADE;
DROP TABLE IF EXISTS audit_logs_2030 CASCADE;

-- =============================================================================
-- DROP PARTITIONED TABLE
-- =============================================================================

DROP TABLE IF EXISTS audit_logs CASCADE;

-- =============================================================================
-- DROP ENUMS
-- =============================================================================

DROP TYPE IF EXISTS audit_action CASCADE;
