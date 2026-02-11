-- Migration: 016_bhyt_hospital_registration.sql
-- Description: Add hospital registration code (ma_kcb_bd) and expiration date to insurance_info
-- Created: 2026-02-11
-- Depends on: 005_bhyt_insurance_enhancement.sql
-- Sprint: 1A - BHYT Completion

-- =============================================================================
-- ADD HOSPITAL REGISTRATION CODE (ma_kcb_bd)
-- The hospital registration code identifies the facility where the patient
-- is registered for BHYT coverage. It must be exactly 5 characters.
-- =============================================================================

ALTER TABLE insurance_info
    ADD COLUMN hospital_registration_code VARCHAR(5);

-- CHECK constraint: must be exactly 5 characters when provided
ALTER TABLE insurance_info
    ADD CONSTRAINT chk_hospital_registration_code_length
    CHECK (
        hospital_registration_code IS NULL
        OR length(hospital_registration_code) = 5
    );

-- Index for facility-based lookups and claim generation queries
CREATE INDEX idx_insurance_hospital_registration_code
    ON insurance_info (hospital_registration_code)
    WHERE hospital_registration_code IS NOT NULL;

COMMENT ON COLUMN insurance_info.hospital_registration_code IS
    'BHYT hospital registration code (ma_kcb_bd), 5-character facility identifier for claim eligibility';

-- =============================================================================
-- ADD EXPIRATION DATE
-- Explicit expiration date for the BHYT card. While valid_to already exists,
-- expiration_date is the canonical field used for BHYT-specific validation
-- (e.g., card must not be expired on the date of the visit).
-- =============================================================================

ALTER TABLE insurance_info
    ADD COLUMN expiration_date DATE;

-- Index for expiration-based queries (e.g., find expiring cards)
CREATE INDEX idx_insurance_expiration_date
    ON insurance_info (expiration_date)
    WHERE expiration_date IS NOT NULL;

COMMENT ON COLUMN insurance_info.expiration_date IS
    'BHYT card expiration date, used for visit-date validation (card must be valid on date of service)';
