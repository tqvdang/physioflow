-- Migration: 001_initial_schema.sql
-- Description: Core tables for PhysioFlow EMR - organizations, clinics, users, patients
-- Created: 2026-01-10

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM (
    'super_admin',
    'clinic_admin',
    'therapist',
    'assistant',
    'front_desk'
);

CREATE TYPE gender_type AS ENUM (
    'male',
    'female',
    'other',
    'prefer_not_to_say'
);

CREATE TYPE language_preference AS ENUM (
    'vi',
    'en'
);

-- =============================================================================
-- ORGANIZATIONS
-- =============================================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    name_vi VARCHAR(255),
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX idx_organizations_name ON organizations (name);
CREATE INDEX idx_organizations_name_vi ON organizations (name_vi);
CREATE INDEX idx_organizations_settings ON organizations USING GIN (settings);

COMMENT ON TABLE organizations IS 'Top-level organization entities that own clinics';
COMMENT ON COLUMN organizations.settings IS 'Organization-wide settings as JSON (branding, defaults, etc.)';

-- =============================================================================
-- CLINICS
-- =============================================================================

CREATE TABLE clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    name_vi VARCHAR(255),
    address TEXT,
    address_vi TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    settings JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX idx_clinics_organization_id ON clinics (organization_id);
CREATE INDEX idx_clinics_name ON clinics (name);
CREATE INDEX idx_clinics_is_active ON clinics (is_active);
CREATE INDEX idx_clinics_settings ON clinics USING GIN (settings);

COMMENT ON TABLE clinics IS 'Physical clinic locations belonging to organizations';
COMMENT ON COLUMN clinics.timezone IS 'Timezone for scheduling (default: Vietnam)';
COMMENT ON COLUMN clinics.settings IS 'Clinic-specific settings (hours, services, etc.)';

-- =============================================================================
-- USERS
-- =============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    keycloak_id UUID UNIQUE,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    first_name_vi VARCHAR(100),
    last_name_vi VARCHAR(100),
    role user_role NOT NULL,
    license_number VARCHAR(100),
    specializations TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,

    CONSTRAINT uq_users_clinic_email UNIQUE (clinic_id, email)
);

CREATE INDEX idx_users_clinic_id ON users (clinic_id);
CREATE INDEX idx_users_keycloak_id ON users (keycloak_id);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_is_active ON users (is_active);
CREATE INDEX idx_users_name ON users (last_name, first_name);
CREATE INDEX idx_users_name_vi ON users (last_name_vi, first_name_vi);

COMMENT ON TABLE users IS 'System users (staff) with role-based access';
COMMENT ON COLUMN users.keycloak_id IS 'External ID from Keycloak for authentication';
COMMENT ON COLUMN users.license_number IS 'Professional license number for therapists';
COMMENT ON COLUMN users.specializations IS 'Array of specialization areas';

-- =============================================================================
-- PATIENTS
-- =============================================================================

CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    mrn VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    first_name_vi VARCHAR(100),
    last_name_vi VARCHAR(100),
    date_of_birth DATE NOT NULL,
    gender gender_type NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    address_vi TEXT,
    language_preference language_preference NOT NULL DEFAULT 'vi',
    emergency_contact JSONB NOT NULL DEFAULT '{}',
    medical_alerts TEXT[],
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),

    CONSTRAINT uq_patients_clinic_mrn UNIQUE (clinic_id, mrn)
);

CREATE INDEX idx_patients_clinic_id ON patients (clinic_id);
CREATE INDEX idx_patients_mrn ON patients (mrn);
CREATE INDEX idx_patients_name ON patients (last_name, first_name);
CREATE INDEX idx_patients_name_vi ON patients (last_name_vi, first_name_vi);
CREATE INDEX idx_patients_dob ON patients (date_of_birth);
CREATE INDEX idx_patients_phone ON patients (phone);
CREATE INDEX idx_patients_email ON patients (email);
CREATE INDEX idx_patients_is_active ON patients (is_active);
CREATE INDEX idx_patients_emergency_contact ON patients USING GIN (emergency_contact);

-- Trigram index for fuzzy name search
CREATE INDEX idx_patients_name_trgm ON patients USING GIN (
    (first_name || ' ' || last_name) gin_trgm_ops
);

COMMENT ON TABLE patients IS 'Patient demographic and contact information';
COMMENT ON COLUMN patients.mrn IS 'Medical Record Number - unique per clinic';
COMMENT ON COLUMN patients.emergency_contact IS 'Emergency contact info as JSON (name, phone, relationship)';
COMMENT ON COLUMN patients.medical_alerts IS 'Array of medical alerts/allergies';

-- =============================================================================
-- INSURANCE INFO
-- =============================================================================

CREATE TABLE insurance_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    provider VARCHAR(255) NOT NULL,
    provider_type VARCHAR(50) NOT NULL DEFAULT 'private',  -- BHYT, private, corporate
    policy_number VARCHAR(100) NOT NULL,
    group_number VARCHAR(100),
    coverage_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    copay_amount DECIMAL(12,2),
    valid_from DATE NOT NULL,
    valid_to DATE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    verification_status VARCHAR(50) DEFAULT 'pending',
    verification_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_insurance_patient_id ON insurance_info (patient_id);
CREATE INDEX idx_insurance_provider ON insurance_info (provider);
CREATE INDEX idx_insurance_policy_number ON insurance_info (policy_number);
CREATE INDEX idx_insurance_valid_dates ON insurance_info (valid_from, valid_to);
CREATE INDEX idx_insurance_is_active ON insurance_info (is_active);
CREATE INDEX idx_insurance_is_primary ON insurance_info (patient_id, is_primary) WHERE is_primary = TRUE;

COMMENT ON TABLE insurance_info IS 'Patient insurance policies and coverage information';
COMMENT ON COLUMN insurance_info.provider_type IS 'Type: BHYT (government), private, corporate';
COMMENT ON COLUMN insurance_info.coverage_percentage IS 'Percentage of costs covered (0-100)';

-- =============================================================================
-- AUDIT TRIGGER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_clinics_updated_at
    BEFORE UPDATE ON clinics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_insurance_info_updated_at
    BEFORE UPDATE ON insurance_info
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (Prepared for multi-tenant isolation)
-- =============================================================================

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_info ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies will be created based on application authentication context
