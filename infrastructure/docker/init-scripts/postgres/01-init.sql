-- =============================================================================
-- EMR PostgreSQL Initialization Script
-- =============================================================================
-- This script runs automatically when the PostgreSQL container is first created
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Create Vietnamese collation for proper sorting
-- -----------------------------------------------------------------------------
-- Note: The locale must be available in the container
-- Alpine-based images may need additional locale setup

DO $$
BEGIN
    -- Check if collation exists before creating
    IF NOT EXISTS (
        SELECT 1 FROM pg_collation WHERE collname = 'vi_VN_utf8'
    ) THEN
        -- Try to create Vietnamese collation
        -- This may fail if locale is not available, which is OK for development
        BEGIN
            CREATE COLLATION IF NOT EXISTS "vi_VN_utf8" (
                LOCALE = 'vi_VN.utf8'
            );
            RAISE NOTICE 'Vietnamese collation created successfully';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not create Vietnamese collation: %. Using default collation.', SQLERRM;
        END;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Enable required extensions for physioflow database
-- -----------------------------------------------------------------------------

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
COMMENT ON EXTENSION "uuid-ossp" IS 'Functions to generate universally unique identifiers (UUIDs)';

-- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
COMMENT ON EXTENSION "pgcrypto" IS 'Cryptographic functions for encryption and hashing';

-- Trigram matching for fuzzy text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
COMMENT ON EXTENSION "pg_trgm" IS 'Text similarity measurement and index searching using trigrams';

-- -----------------------------------------------------------------------------
-- Create Keycloak database
-- -----------------------------------------------------------------------------

-- Keycloak requires its own database
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'keycloak') THEN
        CREATE DATABASE keycloak;
        RAISE NOTICE 'Keycloak database created';
    END IF;
END $$;

-- Grant privileges to the main user
GRANT ALL PRIVILEGES ON DATABASE keycloak TO emr;

-- -----------------------------------------------------------------------------
-- Create schemas for application organization
-- -----------------------------------------------------------------------------

-- Core EMR schema
CREATE SCHEMA IF NOT EXISTS emr;
COMMENT ON SCHEMA emr IS 'Core EMR entities: patients, encounters, clinical data';

-- Audit schema for tracking changes
CREATE SCHEMA IF NOT EXISTS audit;
COMMENT ON SCHEMA audit IS 'Audit trail and change tracking';

-- Integration schema for external systems
CREATE SCHEMA IF NOT EXISTS integration;
COMMENT ON SCHEMA integration IS 'External system integrations and mappings';

-- -----------------------------------------------------------------------------
-- Set default search path
-- -----------------------------------------------------------------------------

ALTER DATABASE physioflow SET search_path TO emr, public;

-- -----------------------------------------------------------------------------
-- Create utility functions
-- -----------------------------------------------------------------------------

-- Function to generate short UUIDs for human-readable IDs
CREATE OR REPLACE FUNCTION generate_short_uid(prefix TEXT DEFAULT '')
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := prefix;
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$;

COMMENT ON FUNCTION generate_short_uid IS 'Generates a short, human-readable unique identifier';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_updated_at_column IS 'Trigger function to auto-update updated_at column';

-- -----------------------------------------------------------------------------
-- Grant schema permissions
-- -----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA emr TO emr;
GRANT USAGE ON SCHEMA audit TO emr;
GRANT USAGE ON SCHEMA integration TO emr;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA emr TO emr;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA audit TO emr;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA integration TO emr;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA emr TO emr;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA audit TO emr;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA integration TO emr;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA emr GRANT ALL ON TABLES TO emr;
ALTER DEFAULT PRIVILEGES IN SCHEMA emr GRANT ALL ON SEQUENCES TO emr;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT ALL ON TABLES TO emr;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT ALL ON SEQUENCES TO emr;
ALTER DEFAULT PRIVILEGES IN SCHEMA integration GRANT ALL ON TABLES TO emr;
ALTER DEFAULT PRIVILEGES IN SCHEMA integration GRANT ALL ON SEQUENCES TO emr;

-- -----------------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------------

DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'EMR Database Initialization Complete';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Database: physioflow';
    RAISE NOTICE 'Extensions: uuid-ossp, pgcrypto, pg_trgm';
    RAISE NOTICE 'Schemas: emr, audit, integration';
    RAISE NOTICE '==============================================';
END $$;
