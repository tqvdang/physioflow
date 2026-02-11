-- Migration: 019_pain_locations.sql
-- Description: Add pain_locations JSONB column to visits (treatment_sessions) table
-- for interactive anatomy diagram pain marking
--
-- Structure: { "regions": [{ "id": "shoulder_left", "severity": 8, "description": "Sharp pain" }] }

-- Add pain_locations JSONB column to treatment_sessions table
ALTER TABLE treatment_sessions
    ADD COLUMN IF NOT EXISTS pain_locations JSONB DEFAULT '{"regions": []}';

-- Add a comment for documentation
COMMENT ON COLUMN treatment_sessions.pain_locations IS
    'Pain locations marked on anatomy diagram. Structure: { "regions": [{ "id": "region_id", "severity": 0-10, "description": "text" }] }';

-- Create a GIN index for efficient JSONB querying
CREATE INDEX IF NOT EXISTS idx_treatment_sessions_pain_locations
    ON treatment_sessions USING GIN (pain_locations jsonb_path_ops);

-- Add a check constraint to validate severity is 0-10 when regions are present
ALTER TABLE treatment_sessions
    ADD CONSTRAINT chk_pain_locations_valid CHECK (
        pain_locations IS NULL
        OR pain_locations = '{"regions": []}'::jsonb
        OR (
            jsonb_typeof(pain_locations->'regions') = 'array'
        )
    );
