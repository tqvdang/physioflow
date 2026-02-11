-- Migration: 021_claim_submission.sql
-- Description: BHYT claim submission tables for VSS (Vietnam Social Security)
-- Format: XML per Decision 5937/QD-BHXH

BEGIN;

-- BHYT Claims table: tracks generated claim files
CREATE TABLE IF NOT EXISTS bhyt_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    facility_code VARCHAR(20) NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
    file_path TEXT,
    file_name VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'submitted', 'approved', 'rejected')),
    total_amount NUMERIC(15, 0) NOT NULL DEFAULT 0,
    total_insurance_amount NUMERIC(15, 0) NOT NULL DEFAULT 0,
    total_patient_amount NUMERIC(15, 0) NOT NULL DEFAULT 0,
    line_item_count INTEGER NOT NULL DEFAULT 0,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),

    -- Unique constraint: one claim per facility per month per year
    CONSTRAINT uq_bhyt_claims_facility_period UNIQUE (clinic_id, facility_code, month, year)
);

-- Indexes for bhyt_claims
CREATE INDEX IF NOT EXISTS idx_bhyt_claims_clinic_id ON bhyt_claims(clinic_id);
CREATE INDEX IF NOT EXISTS idx_bhyt_claims_status ON bhyt_claims(status);
CREATE INDEX IF NOT EXISTS idx_bhyt_claims_period ON bhyt_claims(year, month);
CREATE INDEX IF NOT EXISTS idx_bhyt_claims_facility ON bhyt_claims(facility_code);

-- BHYT Claim Line Items: individual service records within a claim
CREATE TABLE IF NOT EXISTS bhyt_claim_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES bhyt_claims(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    patient_name VARCHAR(200) NOT NULL,
    bhyt_card_number VARCHAR(15) NOT NULL,
    service_code VARCHAR(20) NOT NULL,
    service_name_vi VARCHAR(200) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(15, 0) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(15, 0) NOT NULL CHECK (total_price >= 0),
    insurance_paid NUMERIC(15, 0) NOT NULL DEFAULT 0 CHECK (insurance_paid >= 0),
    patient_paid NUMERIC(15, 0) NOT NULL DEFAULT 0 CHECK (patient_paid >= 0),
    service_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for bhyt_claim_line_items
CREATE INDEX IF NOT EXISTS idx_bhyt_claim_line_items_claim_id ON bhyt_claim_line_items(claim_id);
CREATE INDEX IF NOT EXISTS idx_bhyt_claim_line_items_patient_id ON bhyt_claim_line_items(patient_id);
CREATE INDEX IF NOT EXISTS idx_bhyt_claim_line_items_invoice_id ON bhyt_claim_line_items(invoice_id);

-- Trigger to update updated_at on bhyt_claims
CREATE OR REPLACE FUNCTION update_bhyt_claims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bhyt_claims_updated_at
    BEFORE UPDATE ON bhyt_claims
    FOR EACH ROW
    EXECUTE FUNCTION update_bhyt_claims_updated_at();

COMMIT;
