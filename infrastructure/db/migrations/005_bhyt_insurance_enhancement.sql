-- Migration: 005_bhyt_insurance_enhancement.sql
-- Description: Extend insurance_info table with BHYT (Vietnamese national health insurance) fields
-- Created: 2026-02-11
-- Depends on: 001_initial_schema.sql

-- =============================================================================
-- EXTEND insurance_info TABLE FOR BHYT SUPPORT
-- =============================================================================

-- BHYT card number (format: 2-letter prefix + 1 digit + 12 digits, e.g. DN1234567890123)
ALTER TABLE insurance_info
    ADD COLUMN bhyt_card_number VARCHAR(15);

-- BHYT prefix code (e.g. HC1, DN1, TE1) identifies insurance category
ALTER TABLE insurance_info
    ADD COLUMN bhyt_prefix_code VARCHAR(5);

-- BHYT coverage percent (80% standard, 95% or 100% for special groups)
ALTER TABLE insurance_info
    ADD COLUMN bhyt_coverage_percent DECIMAL(5,2);

-- Copay rate (patient's share, typically 5-20%)
ALTER TABLE insurance_info
    ADD COLUMN bhyt_copay_rate DECIMAL(5,2);

-- Optimistic locking
ALTER TABLE insurance_info
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- =============================================================================
-- CONSTRAINTS
-- =============================================================================

-- BHYT card number format: 2 uppercase letters + 1 digit + 12 digits = 15 chars
-- e.g. DN1234567890123, HC4012345678901
ALTER TABLE insurance_info
    ADD CONSTRAINT chk_bhyt_card_format
    CHECK (
        bhyt_card_number IS NULL
        OR bhyt_card_number ~ '^[A-Z]{2}[0-9]{13}$'
    );

-- BHYT prefix code format: 2 uppercase letters + 1-2 digits
ALTER TABLE insurance_info
    ADD CONSTRAINT chk_bhyt_prefix_format
    CHECK (
        bhyt_prefix_code IS NULL
        OR bhyt_prefix_code ~ '^[A-Z]{2}[0-9]{1,2}$'
    );

-- Coverage percent must be 0-100
ALTER TABLE insurance_info
    ADD CONSTRAINT chk_bhyt_coverage_range
    CHECK (
        bhyt_coverage_percent IS NULL
        OR (bhyt_coverage_percent >= 0 AND bhyt_coverage_percent <= 100)
    );

-- Copay rate must be 0-100
ALTER TABLE insurance_info
    ADD CONSTRAINT chk_bhyt_copay_range
    CHECK (
        bhyt_copay_rate IS NULL
        OR (bhyt_copay_rate >= 0 AND bhyt_copay_rate <= 100)
    );

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_insurance_bhyt_card_number ON insurance_info (bhyt_card_number)
    WHERE bhyt_card_number IS NOT NULL;

CREATE INDEX idx_insurance_bhyt_prefix ON insurance_info (bhyt_prefix_code)
    WHERE bhyt_prefix_code IS NOT NULL;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN insurance_info.bhyt_card_number IS 'BHYT card number (15 chars: 2 letters + 13 digits)';
COMMENT ON COLUMN insurance_info.bhyt_prefix_code IS 'BHYT prefix code indicating insurance category (e.g. HC1, DN1, TE1)';
COMMENT ON COLUMN insurance_info.bhyt_coverage_percent IS 'BHYT coverage percentage (80% standard, 95-100% for priority groups)';
COMMENT ON COLUMN insurance_info.bhyt_copay_rate IS 'Patient copay rate as percentage (typically 5-20%)';
COMMENT ON COLUMN insurance_info.version IS 'Optimistic locking version counter';
