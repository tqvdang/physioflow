-- Migration 026: Add version column to outcome_measures for optimistic locking.
-- This prevents lost updates when concurrent requests modify the same record.

BEGIN;

-- Add version column with default 1 for existing rows.
ALTER TABLE outcome_measures
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Create an index on (id, version) for efficient version-check updates.
CREATE INDEX IF NOT EXISTS idx_outcome_measures_id_version
    ON outcome_measures (id, version);

-- Add a comment explaining the column purpose.
COMMENT ON COLUMN outcome_measures.version IS 'Optimistic locking version counter; incremented on each update';

COMMIT;
