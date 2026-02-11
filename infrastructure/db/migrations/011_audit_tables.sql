-- Migration: 011_audit_tables.sql
-- Description: Audit log table partitioned by month for compliance (HIPAA, Vietnamese regulations)
-- Created: 2026-02-11
-- Depends on: 001_initial_schema.sql

-- =============================================================================
-- AUDIT LOG TABLE (partitioned by month on timestamp)
-- =============================================================================

CREATE TABLE audit_logs (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),

    -- Who
    user_id UUID,
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    ip_address INET,
    user_agent TEXT,

    -- What
    action VARCHAR(100) NOT NULL,  -- create, read, update, delete, login, logout, export, print
    table_name VARCHAR(100),
    record_id UUID,

    -- Change details
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],

    -- Context
    clinic_id UUID,
    patient_id UUID,  -- For PHI access tracking
    request_id UUID,  -- Correlation ID for request tracing
    endpoint VARCHAR(500),
    http_method VARCHAR(10),

    -- Timestamp (partition key)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- =============================================================================
-- MONTHLY PARTITIONS (2026 H1 + future months)
-- =============================================================================

CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE audit_logs_2026_02 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE audit_logs_2026_03 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE audit_logs_2026_04 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE audit_logs_2026_05 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE audit_logs_2026_06 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE audit_logs_2026_07 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE audit_logs_2026_08 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE TABLE audit_logs_2026_09 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE TABLE audit_logs_2026_10 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE TABLE audit_logs_2026_11 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE TABLE audit_logs_2026_12 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs (action);
CREATE INDEX idx_audit_logs_table_name ON audit_logs (table_name);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);
CREATE INDEX idx_audit_logs_record_id ON audit_logs (record_id);
CREATE INDEX idx_audit_logs_clinic_id ON audit_logs (clinic_id);
CREATE INDEX idx_audit_logs_patient_id ON audit_logs (patient_id);
CREATE INDEX idx_audit_logs_request_id ON audit_logs (request_id);

-- Composite index for common audit queries
CREATE INDEX idx_audit_logs_table_action ON audit_logs (table_name, action, created_at);
CREATE INDEX idx_audit_logs_user_action ON audit_logs (user_id, action, created_at);
CREATE INDEX idx_audit_logs_patient_access ON audit_logs (patient_id, created_at)
    WHERE patient_id IS NOT NULL;

-- =============================================================================
-- HELPER FUNCTION: Insert audit log entry
-- =============================================================================

CREATE OR REPLACE FUNCTION audit_log_insert(
    p_user_id UUID,
    p_action VARCHAR(100),
    p_table_name VARCHAR(100),
    p_record_id UUID,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_clinic_id UUID DEFAULT NULL,
    p_patient_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_changed_fields TEXT[];
BEGIN
    -- Compute changed fields from old/new values
    IF p_old_values IS NOT NULL AND p_new_values IS NOT NULL THEN
        SELECT ARRAY_AGG(key)
        INTO v_changed_fields
        FROM (
            SELECT key
            FROM jsonb_each(p_new_values)
            WHERE p_old_values->key IS DISTINCT FROM p_new_values->key
        ) changed;
    END IF;

    INSERT INTO audit_logs (
        user_id, action, table_name, record_id,
        old_values, new_values, changed_fields,
        ip_address, clinic_id, patient_id
    ) VALUES (
        p_user_id, p_action, p_table_name, p_record_id,
        p_old_values, p_new_values, v_changed_fields,
        p_ip_address, p_clinic_id, p_patient_id
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION audit_log_insert IS 'Helper to insert audit log entries with auto-detected changed fields';

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE audit_logs IS 'Compliance audit logs partitioned by month (HIPAA + Vietnamese regulations)';
COMMENT ON COLUMN audit_logs.old_values IS 'Previous values before change (JSONB)';
COMMENT ON COLUMN audit_logs.new_values IS 'New values after change (JSONB)';
COMMENT ON COLUMN audit_logs.changed_fields IS 'List of field names that were modified';
COMMENT ON COLUMN audit_logs.patient_id IS 'Patient ID for tracking PHI access';
COMMENT ON COLUMN audit_logs.request_id IS 'Correlation ID for request tracing';
