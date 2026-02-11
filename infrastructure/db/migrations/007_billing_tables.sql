-- Migration: 007_billing_tables.sql
-- Description: Billing tables - PT service codes, invoices, and payments
-- Created: 2026-02-11
-- Depends on: 001_initial_schema.sql

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE invoice_status AS ENUM (
    'draft',
    'pending',
    'submitted',
    'approved',
    'rejected',
    'paid',
    'partially_paid',
    'cancelled',
    'void'
);

CREATE TYPE payment_method AS ENUM (
    'cash',
    'bank_transfer',
    'credit_card',
    'debit_card',
    'momo',
    'zalopay',
    'vnpay',
    'bhyt',
    'other'
);

-- =============================================================================
-- PT SERVICE CODES
-- =============================================================================

CREATE TABLE pt_service_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id),  -- NULL for system-wide codes

    -- Code and naming (bilingual)
    code VARCHAR(20) NOT NULL,
    service_name VARCHAR(255) NOT NULL,
    service_name_vi VARCHAR(255),
    description TEXT,
    description_vi TEXT,

    -- Pricing (VND)
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'VND',

    -- Duration
    duration_minutes INTEGER,

    -- Categorization
    category VARCHAR(100),
    is_bhyt_covered BOOLEAN NOT NULL DEFAULT FALSE,
    bhyt_reimbursement_rate DECIMAL(5,2),

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    CONSTRAINT uq_service_code_per_clinic UNIQUE (clinic_id, code)
);

CREATE INDEX idx_service_codes_code ON pt_service_codes (code);
CREATE INDEX idx_service_codes_clinic_id ON pt_service_codes (clinic_id);
CREATE INDEX idx_service_codes_category ON pt_service_codes (category);
CREATE INDEX idx_service_codes_is_active ON pt_service_codes (is_active);
CREATE INDEX idx_service_codes_bhyt ON pt_service_codes (is_bhyt_covered) WHERE is_bhyt_covered = TRUE;

COMMENT ON TABLE pt_service_codes IS 'PT service codes with bilingual names and VND pricing';
COMMENT ON COLUMN pt_service_codes.unit_price IS 'Price per unit in VND';
COMMENT ON COLUMN pt_service_codes.is_bhyt_covered IS 'Whether this service is covered by BHYT insurance';

-- =============================================================================
-- INVOICES
-- =============================================================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    treatment_session_id UUID REFERENCES treatment_sessions(id),

    -- Invoice details
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Amounts (VND)
    subtotal_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    insurance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    copay_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    balance_due DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'VND',

    -- Status
    status invoice_status NOT NULL DEFAULT 'draft',

    -- BHYT claim info
    bhyt_claim_number VARCHAR(50),
    bhyt_claim_status VARCHAR(50),
    bhyt_claim_submitted_at TIMESTAMPTZ,

    -- Notes
    notes TEXT,

    -- Optimistic locking
    version INTEGER NOT NULL DEFAULT 1,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),

    CONSTRAINT uq_invoice_number UNIQUE (clinic_id, invoice_number)
);

CREATE INDEX idx_invoices_clinic_id ON invoices (clinic_id);
CREATE INDEX idx_invoices_patient_id ON invoices (patient_id);
CREATE INDEX idx_invoices_status ON invoices (status);
CREATE INDEX idx_invoices_invoice_date ON invoices (invoice_date);
CREATE INDEX idx_invoices_invoice_number ON invoices (invoice_number);
CREATE INDEX idx_invoices_session_id ON invoices (treatment_session_id);
CREATE INDEX idx_invoices_bhyt_claim ON invoices (bhyt_claim_number) WHERE bhyt_claim_number IS NOT NULL;

COMMENT ON TABLE invoices IS 'Patient invoices with BHYT insurance claim support';
COMMENT ON COLUMN invoices.version IS 'Optimistic locking version counter';

-- =============================================================================
-- INVOICE LINE ITEMS
-- =============================================================================

CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    service_code_id UUID REFERENCES pt_service_codes(id),

    -- Line item details
    description VARCHAR(500) NOT NULL,
    description_vi VARCHAR(500),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,

    -- Insurance
    is_bhyt_covered BOOLEAN NOT NULL DEFAULT FALSE,
    insurance_covered_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

    -- Ordering
    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice_id ON invoice_line_items (invoice_id);
CREATE INDEX idx_invoice_items_service_code ON invoice_line_items (service_code_id);

COMMENT ON TABLE invoice_line_items IS 'Individual line items within an invoice';

-- =============================================================================
-- PAYMENTS
-- =============================================================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    clinic_id UUID NOT NULL REFERENCES clinics(id),

    -- Payment details
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'VND',
    payment_method payment_method NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Reference
    transaction_reference VARCHAR(100),
    receipt_number VARCHAR(50),

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'completed',  -- completed, refunded, failed
    refund_amount DECIMAL(12,2),
    refunded_at TIMESTAMPTZ,

    -- Notes
    notes TEXT,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_payments_invoice_id ON payments (invoice_id);
CREATE INDEX idx_payments_clinic_id ON payments (clinic_id);
CREATE INDEX idx_payments_payment_date ON payments (payment_date);
CREATE INDEX idx_payments_payment_method ON payments (payment_method);
CREATE INDEX idx_payments_status ON payments (status);
CREATE INDEX idx_payments_receipt_number ON payments (receipt_number);

COMMENT ON TABLE payments IS 'Payment records for invoices';

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER trg_service_codes_updated_at
    BEFORE UPDATE ON pt_service_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE pt_service_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
