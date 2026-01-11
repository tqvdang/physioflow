-- Migration: 003_checklist_schema.sql
-- Description: Checklist system for structured visit documentation
-- Created: 2026-01-10

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE checklist_item_type AS ENUM (
    'checkbox',
    'radio',
    'text',
    'number',
    'scale',
    'multi_select',
    'date',
    'time',
    'duration',
    'body_diagram',
    'signature'
);

CREATE TYPE checklist_status AS ENUM (
    'not_started',
    'in_progress',
    'completed',
    'reviewed',
    'locked'
);

-- =============================================================================
-- CHECKLIST TEMPLATES
-- =============================================================================

CREATE TABLE checklist_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id),  -- NULL for global templates

    -- Template info
    name VARCHAR(255) NOT NULL,
    name_vi VARCHAR(255),
    description TEXT,
    description_vi TEXT,
    code VARCHAR(50),  -- Short code for quick reference

    -- Template type and usage
    template_type VARCHAR(50) NOT NULL,  -- initial_eval, follow_up, discharge, daily_note, etc.
    body_region body_region,
    applicable_diagnoses TEXT[],  -- ICD codes this applies to

    -- Versioning
    version INTEGER NOT NULL DEFAULT 1,
    is_current_version BOOLEAN NOT NULL DEFAULT TRUE,
    previous_version_id UUID REFERENCES checklist_templates(id),

    -- Behavior settings
    settings JSONB NOT NULL DEFAULT '{}',
    /*
    settings structure:
    {
        "allow_skip": boolean,
        "require_all_sections": boolean,
        "auto_save_interval_seconds": number,
        "show_progress_bar": boolean,
        "enable_quick_phrases": boolean,
        "default_language": "en" | "vi"
    }
    */

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_checklist_templates_clinic_id ON checklist_templates (clinic_id);
CREATE INDEX idx_checklist_templates_type ON checklist_templates (template_type);
CREATE INDEX idx_checklist_templates_body_region ON checklist_templates (body_region);
CREATE INDEX idx_checklist_templates_code ON checklist_templates (code);
CREATE INDEX idx_checklist_templates_is_active ON checklist_templates (is_active);
CREATE INDEX idx_checklist_templates_is_current ON checklist_templates (is_current_version);

COMMENT ON TABLE checklist_templates IS 'Configurable checklist templates for various visit types';
COMMENT ON COLUMN checklist_templates.clinic_id IS 'NULL for system-wide templates';

-- =============================================================================
-- CHECKLIST SECTIONS
-- =============================================================================

CREATE TABLE checklist_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,

    -- Section info
    title VARCHAR(255) NOT NULL,
    title_vi VARCHAR(255),
    description TEXT,
    description_vi TEXT,

    -- Ordering
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Behavior
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_collapsible BOOLEAN NOT NULL DEFAULT TRUE,
    default_collapsed BOOLEAN NOT NULL DEFAULT FALSE,

    -- Conditional display
    display_conditions JSONB NOT NULL DEFAULT '{}',
    /*
    display_conditions structure:
    {
        "rules": [
            {
                "item_id": "UUID",
                "operator": "equals" | "not_equals" | "contains" | "greater_than",
                "value": any,
                "logic": "AND" | "OR"
            }
        ]
    }
    */

    -- Settings
    settings JSONB NOT NULL DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checklist_sections_template_id ON checklist_sections (template_id);
CREATE INDEX idx_checklist_sections_sort_order ON checklist_sections (template_id, sort_order);

COMMENT ON TABLE checklist_sections IS 'Sections within a checklist template';

-- =============================================================================
-- CHECKLIST ITEMS
-- =============================================================================

CREATE TABLE checklist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES checklist_sections(id) ON DELETE CASCADE,

    -- Item info
    label VARCHAR(500) NOT NULL,
    label_vi VARCHAR(500),
    help_text TEXT,
    help_text_vi TEXT,

    -- Item type and configuration
    item_type checklist_item_type NOT NULL,
    item_config JSONB NOT NULL DEFAULT '{}',
    /*
    item_config structure varies by type:

    For checkbox:
    { "default_checked": boolean }

    For radio/multi_select:
    {
        "options": [
            { "value": "string", "label": "string", "label_vi": "string" }
        ],
        "other_option": boolean
    }

    For scale:
    {
        "min": number,
        "max": number,
        "step": number,
        "labels": { "min": "string", "max": "string" }
    }

    For number:
    {
        "min": number,
        "max": number,
        "unit": "string",
        "unit_vi": "string"
    }

    For body_diagram:
    {
        "view": "anterior" | "posterior" | "both",
        "allow_multiple": boolean
    }
    */

    -- Ordering
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Validation
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    validation_rules JSONB NOT NULL DEFAULT '{}',
    /*
    validation_rules structure:
    {
        "pattern": "regex",
        "min_length": number,
        "max_length": number,
        "custom_message": "string",
        "custom_message_vi": "string"
    }
    */

    -- Conditional display
    display_conditions JSONB NOT NULL DEFAULT '{}',

    -- Quick phrases for text fields
    quick_phrases JSONB NOT NULL DEFAULT '[]',
    /*
    [
        { "phrase": "string", "phrase_vi": "string" }
    ]
    */

    -- Data mapping (for auto-population and extraction)
    data_mapping JSONB NOT NULL DEFAULT '{}',
    /*
    {
        "source_field": "patient.name" | "assessment.pain_data",
        "target_field": "soap.subjective",
        "transform": "text" | "json_path"
    }
    */

    -- Clinical decision support
    cds_rules JSONB NOT NULL DEFAULT '[]',
    /*
    [
        {
            "condition": { "operator": "greater_than", "value": 7 },
            "alert_type": "warning" | "info" | "critical",
            "message": "string",
            "message_vi": "string"
        }
    ]
    */

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checklist_items_section_id ON checklist_items (section_id);
CREATE INDEX idx_checklist_items_sort_order ON checklist_items (section_id, sort_order);
CREATE INDEX idx_checklist_items_type ON checklist_items (item_type);
CREATE INDEX idx_checklist_items_is_required ON checklist_items (is_required);

COMMENT ON TABLE checklist_items IS 'Individual items within a checklist section';
COMMENT ON COLUMN checklist_items.quick_phrases IS 'Pre-defined phrases for quick text entry';
COMMENT ON COLUMN checklist_items.cds_rules IS 'Clinical decision support rules and alerts';

-- =============================================================================
-- VISIT CHECKLISTS (Instances)
-- =============================================================================

CREATE TABLE visit_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES checklist_templates(id),
    template_version INTEGER NOT NULL,

    -- Context
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    treatment_session_id UUID REFERENCES treatment_sessions(id),
    assessment_id UUID REFERENCES assessments(id),
    therapist_id UUID NOT NULL REFERENCES users(id),
    clinic_id UUID NOT NULL REFERENCES clinics(id),

    -- Status
    status checklist_status NOT NULL DEFAULT 'not_started',
    progress_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,

    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,
    locked_by UUID REFERENCES users(id),

    -- Auto-save data
    last_auto_save_at TIMESTAMPTZ,
    auto_save_data JSONB NOT NULL DEFAULT '{}',

    -- Generated outputs
    generated_note TEXT,
    generated_note_vi TEXT,
    note_generation_status VARCHAR(50),  -- pending, generating, completed, failed

    -- Review
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_visit_checklists_template_id ON visit_checklists (template_id);
CREATE INDEX idx_visit_checklists_patient_id ON visit_checklists (patient_id);
CREATE INDEX idx_visit_checklists_session_id ON visit_checklists (treatment_session_id);
CREATE INDEX idx_visit_checklists_therapist_id ON visit_checklists (therapist_id);
CREATE INDEX idx_visit_checklists_clinic_id ON visit_checklists (clinic_id);
CREATE INDEX idx_visit_checklists_status ON visit_checklists (status);
CREATE INDEX idx_visit_checklists_created_at ON visit_checklists (created_at);

COMMENT ON TABLE visit_checklists IS 'Completed checklist instances for patient visits';
COMMENT ON COLUMN visit_checklists.auto_save_data IS 'Temporary auto-saved data before completion';

-- =============================================================================
-- VISIT CHECKLIST RESPONSES
-- =============================================================================

CREATE TABLE visit_checklist_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_checklist_id UUID NOT NULL REFERENCES visit_checklists(id) ON DELETE CASCADE,
    checklist_item_id UUID NOT NULL REFERENCES checklist_items(id),

    -- Response data
    response_value JSONB NOT NULL,
    /*
    response_value structure varies by item_type:

    checkbox: { "checked": boolean }
    radio: { "selected": "option_value" }
    multi_select: { "selected": ["option_value1", "option_value2"] }
    text: { "text": "string" }
    number: { "value": number }
    scale: { "value": number }
    date: { "date": "ISO date" }
    time: { "time": "HH:MM" }
    duration: { "minutes": number }
    body_diagram: { "points": [{ "x": number, "y": number, "label": "string" }] }
    signature: { "signature_data": "base64", "signed_at": "ISO timestamp" }
    */

    -- Response metadata
    is_skipped BOOLEAN NOT NULL DEFAULT FALSE,
    skip_reason TEXT,

    -- CDS alerts triggered
    triggered_alerts JSONB NOT NULL DEFAULT '[]',

    -- History (for tracking changes within session)
    response_history JSONB NOT NULL DEFAULT '[]',
    /*
    [
        {
            "value": {...},
            "changed_at": "ISO timestamp",
            "changed_by": "UUID"
        }
    ]
    */

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),

    CONSTRAINT uq_visit_response_item UNIQUE (visit_checklist_id, checklist_item_id)
);

CREATE INDEX idx_visit_responses_checklist_id ON visit_checklist_responses (visit_checklist_id);
CREATE INDEX idx_visit_responses_item_id ON visit_checklist_responses (checklist_item_id);
CREATE INDEX idx_visit_responses_value ON visit_checklist_responses USING GIN (response_value);

COMMENT ON TABLE visit_checklist_responses IS 'Individual responses to checklist items';
COMMENT ON COLUMN visit_checklist_responses.response_history IS 'Track of all changes during the session';

-- =============================================================================
-- QUICK PHRASE LIBRARY
-- =============================================================================

CREATE TABLE quick_phrases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id),  -- NULL for global
    user_id UUID REFERENCES users(id),  -- NULL for clinic-wide, set for personal

    -- Phrase content
    phrase TEXT NOT NULL,
    phrase_vi TEXT,
    shortcut VARCHAR(50),  -- Keyboard shortcut or abbreviation

    -- Categorization
    category VARCHAR(100) NOT NULL,  -- subjective, objective, assessment, plan, etc.
    subcategory VARCHAR(100),
    tags TEXT[],

    -- Usage tracking
    usage_count INTEGER NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_quick_phrases_clinic_id ON quick_phrases (clinic_id);
CREATE INDEX idx_quick_phrases_user_id ON quick_phrases (user_id);
CREATE INDEX idx_quick_phrases_category ON quick_phrases (category);
CREATE INDEX idx_quick_phrases_shortcut ON quick_phrases (shortcut);
CREATE INDEX idx_quick_phrases_tags ON quick_phrases USING GIN (tags);
CREATE INDEX idx_quick_phrases_phrase_trgm ON quick_phrases USING GIN (phrase gin_trgm_ops);

COMMENT ON TABLE quick_phrases IS 'Reusable text snippets for quick documentation';
COMMENT ON COLUMN quick_phrases.shortcut IS 'Short code to trigger phrase insertion';

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER trg_checklist_templates_updated_at
    BEFORE UPDATE ON checklist_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_checklist_sections_updated_at
    BEFORE UPDATE ON checklist_sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_checklist_items_updated_at
    BEFORE UPDATE ON checklist_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_visit_checklists_updated_at
    BEFORE UPDATE ON visit_checklists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_visit_checklist_responses_updated_at
    BEFORE UPDATE ON visit_checklist_responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_quick_phrases_updated_at
    BEFORE UPDATE ON quick_phrases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- HELPER FUNCTION: Calculate checklist progress
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_checklist_progress(p_visit_checklist_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_required INTEGER;
    completed_required INTEGER;
    progress DECIMAL(5,2);
BEGIN
    -- Count required items
    SELECT COUNT(*)
    INTO total_required
    FROM checklist_items ci
    JOIN checklist_sections cs ON cs.id = ci.section_id
    JOIN visit_checklists vc ON vc.template_id = cs.template_id
    WHERE vc.id = p_visit_checklist_id
    AND ci.is_required = TRUE;

    IF total_required = 0 THEN
        RETURN 100.00;
    END IF;

    -- Count completed required items
    SELECT COUNT(*)
    INTO completed_required
    FROM visit_checklist_responses vcr
    JOIN checklist_items ci ON ci.id = vcr.checklist_item_id
    WHERE vcr.visit_checklist_id = p_visit_checklist_id
    AND ci.is_required = TRUE
    AND vcr.is_skipped = FALSE;

    progress := (completed_required::DECIMAL / total_required::DECIMAL) * 100;
    RETURN ROUND(progress, 2);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_checklist_progress IS 'Calculate completion percentage for a visit checklist';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_checklist_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_phrases ENABLE ROW LEVEL SECURITY;
