-- Rollback: 026_add_version_column.sql
-- Description: Remove version column from outcome_measures table
-- Created: 2026-02-11

BEGIN;

-- Drop the index on (id, version)
DROP INDEX IF EXISTS idx_outcome_measures_id_version;

-- Remove the version column
ALTER TABLE outcome_measures
    DROP COLUMN IF EXISTS version;

COMMIT;
