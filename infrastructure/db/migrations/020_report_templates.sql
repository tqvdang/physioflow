-- Migration 020: Report templates for PDF generation
-- Creates report_templates table and seeds bilingual templates for discharge summaries and invoices

BEGIN;

-- Report templates table
CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    locale VARCHAR(5) NOT NULL DEFAULT 'vi' CHECK (locale IN ('vi', 'en')),
    template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('discharge_summary', 'invoice', 'treatment_plan', 'custom')),
    content_html TEXT NOT NULL,
    header_html TEXT,
    footer_html TEXT,
    css TEXT,
    page_size VARCHAR(10) DEFAULT 'A4' CHECK (page_size IN ('A4', 'A5', 'Letter')),
    orientation VARCHAR(10) DEFAULT 'portrait' CHECK (orientation IN ('portrait', 'landscape')),
    margin_top_mm INTEGER DEFAULT 15,
    margin_bottom_mm INTEGER DEFAULT 15,
    margin_left_mm INTEGER DEFAULT 15,
    margin_right_mm INTEGER DEFAULT 15,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Indexes
CREATE INDEX idx_report_templates_type_locale ON report_templates(template_type, locale);
CREATE INDEX idx_report_templates_slug ON report_templates(slug);
CREATE INDEX idx_report_templates_active ON report_templates(is_active) WHERE is_active = TRUE;

-- Unique constraint: one default template per type+locale combination
CREATE UNIQUE INDEX idx_report_templates_default ON report_templates(template_type, locale)
    WHERE is_default = TRUE;

-- Generated reports tracking table
CREATE TABLE IF NOT EXISTS generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES report_templates(id),
    report_type VARCHAR(50) NOT NULL,
    source_id UUID NOT NULL,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('discharge_summary', 'invoice')),
    locale VARCHAR(5) NOT NULL DEFAULT 'vi',
    file_path TEXT,
    file_size_bytes BIGINT,
    mime_type VARCHAR(50) DEFAULT 'application/pdf',
    generated_by UUID,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_generated_reports_source ON generated_reports(source_type, source_id);
CREATE INDEX idx_generated_reports_generated_at ON generated_reports(generated_at DESC);

-- Seed default discharge summary template (Vietnamese)
INSERT INTO report_templates (slug, name, description, locale, template_type, content_html, css, is_default)
VALUES (
    'discharge-summary-vi',
    'Tom tat xuat vien',
    'Mau bao cao tom tat xuat vien tieng Viet',
    'vi',
    'discharge_summary',
    '',
    '',
    TRUE
);

-- Seed default discharge summary template (English)
INSERT INTO report_templates (slug, name, description, locale, template_type, content_html, css, is_default)
VALUES (
    'discharge-summary-en',
    'Discharge Summary',
    'English discharge summary report template',
    'en',
    'discharge_summary',
    '',
    '',
    TRUE
);

-- Seed default invoice template (Vietnamese)
INSERT INTO report_templates (slug, name, description, locale, template_type, content_html, css, is_default)
VALUES (
    'invoice-vi',
    'Hoa don dich vu',
    'Mau hoa don dich vu tieng Viet',
    'vi',
    'invoice',
    '',
    '',
    TRUE
);

-- Seed default invoice template (English)
INSERT INTO report_templates (slug, name, description, locale, template_type, content_html, css, is_default)
VALUES (
    'invoice-en',
    'Service Invoice',
    'English service invoice report template',
    'en',
    'invoice',
    '',
    '',
    TRUE
);

COMMIT;
