-- Rollback: 005_bhyt_insurance_enhancement.sql
-- Description: Rollback BHYT insurance fields from insurance_info table
-- Created: 2026-02-11

-- =============================================================================
-- DROP INDEXES
-- =============================================================================

DROP INDEX IF EXISTS idx_insurance_bhyt_card_number;
DROP INDEX IF EXISTS idx_insurance_bhyt_prefix;

-- =============================================================================
-- DROP CONSTRAINTS
-- =============================================================================

ALTER TABLE insurance_info DROP CONSTRAINT IF EXISTS chk_bhyt_card_format;
ALTER TABLE insurance_info DROP CONSTRAINT IF EXISTS chk_bhyt_prefix_format;
ALTER TABLE insurance_info DROP CONSTRAINT IF EXISTS chk_bhyt_coverage_range;
ALTER TABLE insurance_info DROP CONSTRAINT IF EXISTS chk_bhyt_copay_range;

-- =============================================================================
-- DROP COLUMNS
-- =============================================================================

ALTER TABLE insurance_info DROP COLUMN IF EXISTS bhyt_card_number;
ALTER TABLE insurance_info DROP COLUMN IF EXISTS bhyt_prefix_code;
ALTER TABLE insurance_info DROP COLUMN IF EXISTS bhyt_coverage_percent;
ALTER TABLE insurance_info DROP COLUMN IF EXISTS bhyt_copay_rate;
ALTER TABLE insurance_info DROP COLUMN IF EXISTS version;
