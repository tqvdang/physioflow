-- Migration: 027_feature_flags_table.sql
-- Description: Add feature flags table for gradual feature rollout
-- Version: 027
-- Date: 2026-02-11

BEGIN;

-- Create feature_flags table
CREATE TABLE IF NOT EXISTS feature_flags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT false,
    rollout_percentage INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    environment VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for faster lookups
CREATE INDEX idx_feature_flags_name ON feature_flags(name);
CREATE INDEX idx_feature_flags_enabled ON feature_flags(enabled);
CREATE INDEX idx_feature_flags_environment ON feature_flags(environment);

-- Add comment
COMMENT ON TABLE feature_flags IS 'Feature flags for gradual rollout and A/B testing';
COMMENT ON COLUMN feature_flags.rollout_percentage IS 'Percentage of users who should see this feature (0-100)';
COMMENT ON COLUMN feature_flags.environment IS 'Restrict flag to specific environment (dev, staging, prod, or NULL for all)';

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_feature_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_feature_flags_updated_at
    BEFORE UPDATE ON feature_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_feature_flags_updated_at();

-- Insert default feature flags
INSERT INTO feature_flags (name, description, enabled, rollout_percentage, environment) VALUES
    ('bhyt_insurance_validation', 'BHYT insurance card validation and eligibility checking', true, 100, NULL),
    ('outcome_measures_tracking', 'Track patient outcomes using standardized measures', true, 100, NULL),
    ('billing_integration', 'Billing and invoicing with BHYT service codes', true, 100, NULL),
    ('clinical_protocols', 'Clinical protocols and treatment guidelines', true, 100, NULL),
    ('discharge_planning', 'Discharge planning and care coordination', true, 100, NULL),
    ('vietnamese_medical_terms', 'Vietnamese medical terminology search and translation', true, 100, NULL),
    ('advanced_reporting', 'Advanced analytics and custom reports', false, 0, NULL),
    ('telehealth', 'Telehealth video consultations', false, 0, NULL),
    ('mobile_app_sync', 'Mobile app offline sync', false, 0, 'dev'),
    ('ai_treatment_suggestions', 'AI-powered treatment suggestions', false, 0, 'dev')
ON CONFLICT (name) DO NOTHING;

-- Create audit log for feature flag changes
CREATE TABLE IF NOT EXISTS feature_flag_audit_log (
    id SERIAL PRIMARY KEY,
    feature_flag_id INTEGER REFERENCES feature_flags(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'enabled', 'disabled')),
    old_value JSONB,
    new_value JSONB,
    changed_by VARCHAR(100),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_feature_flag_audit_log_feature_flag_id ON feature_flag_audit_log(feature_flag_id);
CREATE INDEX idx_feature_flag_audit_log_changed_at ON feature_flag_audit_log(changed_at);

COMMENT ON TABLE feature_flag_audit_log IS 'Audit trail for feature flag changes';

-- Update schema version
INSERT INTO schema_migrations (version, applied_at)
VALUES ('027', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;

COMMIT;
