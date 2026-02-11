-- Migration: 015_bhyt_validation_rules.sql
-- Description: BHYT validation rules table with valid prefix codes
-- Created: 2026-02-11
-- Depends on: 005_bhyt_insurance_enhancement.sql

-- =============================================================================
-- BHYT VALIDATION RULES TABLE
-- =============================================================================

CREATE TABLE bhyt_validation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Rule identification
    rule_name VARCHAR(255) NOT NULL,
    rule_name_vi VARCHAR(255),
    description TEXT,
    description_vi TEXT,

    -- Prefix codes this rule applies to (JSONB array)
    prefix_codes JSONB NOT NULL DEFAULT '[]',

    -- Validation pattern
    regex_pattern VARCHAR(255),

    -- Validity period
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,

    -- Coverage details
    coverage_percent DECIMAL(5,2),
    copay_rate DECIMAL(5,2),

    -- Beneficiary category
    beneficiary_category VARCHAR(100),
    beneficiary_category_vi VARCHAR(100),

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_bhyt_rules_is_active ON bhyt_validation_rules (is_active);
CREATE INDEX idx_bhyt_rules_effective ON bhyt_validation_rules (effective_from, effective_to);
CREATE INDEX idx_bhyt_rules_prefix_codes ON bhyt_validation_rules USING GIN (prefix_codes);
CREATE INDEX idx_bhyt_rules_category ON bhyt_validation_rules (beneficiary_category);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER trg_bhyt_rules_updated_at
    BEFORE UPDATE ON bhyt_validation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE bhyt_validation_rules ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- SEED BHYT PREFIX CODES (18 valid prefixes across 8 categories)
-- =============================================================================

-- HC: Healthcare workers / Civil servants
INSERT INTO bhyt_validation_rules (
    rule_name, rule_name_vi,
    description, description_vi,
    prefix_codes, regex_pattern,
    coverage_percent, copay_rate,
    beneficiary_category, beneficiary_category_vi
)
VALUES
    (
        'Healthcare Workers - Category 1',
        'Cán bộ y tế - Loại 1',
        'Active healthcare workers and civil servants with full employment',
        'Cán bộ y tế và công chức đang làm việc toàn thời gian',
        '["HC1"]'::JSONB,
        '^HC1[0-9]{12}$',
        80.00, 20.00,
        'civil_servant', 'Công chức'
    ),
    (
        'Healthcare Workers - Category 2',
        'Cán bộ y tế - Loại 2',
        'Retired healthcare workers and civil servants',
        'Cán bộ y tế và công chức đã nghỉ hưu',
        '["HC2"]'::JSONB,
        '^HC2[0-9]{12}$',
        95.00, 5.00,
        'retired_civil_servant', 'Công chức nghỉ hưu'
    ),
    (
        'Healthcare Workers - Category 3',
        'Cán bộ y tế - Loại 3',
        'Healthcare worker dependents',
        'Người phụ thuộc của cán bộ y tế',
        '["HC3"]'::JSONB,
        '^HC3[0-9]{12}$',
        80.00, 20.00,
        'civil_servant_dependent', 'Người phụ thuộc công chức'
    ),
    (
        'Healthcare Workers - Category 4',
        'Cán bộ y tế - Loại 4',
        'Military and public security healthcare workers',
        'Cán bộ y tế quân đội và an ninh',
        '["HC4"]'::JSONB,
        '^HC4[0-9]{12}$',
        100.00, 0.00,
        'military_health', 'Y tế quân đội'
    );

-- DN: Enterprise / Company employees
INSERT INTO bhyt_validation_rules (
    rule_name, rule_name_vi,
    description, description_vi,
    prefix_codes, regex_pattern,
    coverage_percent, copay_rate,
    beneficiary_category, beneficiary_category_vi
)
VALUES
    (
        'Enterprise Workers - Category 1',
        'Lao động doanh nghiệp - Loại 1',
        'Full-time enterprise employees',
        'Lao động doanh nghiệp toàn thời gian',
        '["DN1"]'::JSONB,
        '^DN1[0-9]{12}$',
        80.00, 20.00,
        'enterprise_worker', 'Lao động doanh nghiệp'
    ),
    (
        'Enterprise Workers - Category 2',
        'Lao động doanh nghiệp - Loại 2',
        'Part-time or contract enterprise workers',
        'Lao động doanh nghiệp bán thời gian hoặc hợp đồng',
        '["DN2"]'::JSONB,
        '^DN2[0-9]{12}$',
        80.00, 20.00,
        'enterprise_contract', 'Lao động hợp đồng'
    ),
    (
        'Enterprise Workers - Category 3',
        'Lao động doanh nghiệp - Loại 3',
        'Enterprise worker dependents',
        'Người phụ thuộc lao động doanh nghiệp',
        '["DN3"]'::JSONB,
        '^DN3[0-9]{12}$',
        80.00, 20.00,
        'enterprise_dependent', 'Người phụ thuộc doanh nghiệp'
    );

-- TE: Children under 6
INSERT INTO bhyt_validation_rules (
    rule_name, rule_name_vi,
    description, description_vi,
    prefix_codes, regex_pattern,
    coverage_percent, copay_rate,
    beneficiary_category, beneficiary_category_vi
)
VALUES
    (
        'Children - Category 1',
        'Trẻ em - Loại 1',
        'Children under 6 years old',
        'Trẻ em dưới 6 tuổi',
        '["TE1"]'::JSONB,
        '^TE1[0-9]{12}$',
        100.00, 0.00,
        'children_under_6', 'Trẻ em dưới 6 tuổi'
    ),
    (
        'Children - Category 2',
        'Trẻ em - Loại 2',
        'Children aged 6-18 from poor households',
        'Trẻ em 6-18 tuổi thuộc hộ nghèo',
        '["TE2"]'::JSONB,
        '^TE2[0-9]{12}$',
        100.00, 0.00,
        'children_poor', 'Trẻ em hộ nghèo'
    ),
    (
        'Children - Category 3',
        'Trẻ em - Loại 3',
        'Students and school-age children',
        'Học sinh và trẻ em trong độ tuổi đi học',
        '["TE3"]'::JSONB,
        '^TE3[0-9]{12}$',
        80.00, 20.00,
        'students', 'Học sinh'
    );

-- CB: War veterans and meritorious persons
INSERT INTO bhyt_validation_rules (
    rule_name, rule_name_vi,
    description, description_vi,
    prefix_codes, regex_pattern,
    coverage_percent, copay_rate,
    beneficiary_category, beneficiary_category_vi
)
VALUES
    (
        'War Veterans - Category 1',
        'Thương binh - Loại 1',
        'War veterans and revolutionary contributors',
        'Thương binh và người có công cách mạng',
        '["CB1"]'::JSONB,
        '^CB1[0-9]{12}$',
        100.00, 0.00,
        'war_veteran', 'Thương binh'
    ),
    (
        'War Veterans - Category 2',
        'Thương binh - Loại 2',
        'War veteran dependents',
        'Người phụ thuộc thương binh',
        '["CB2"]'::JSONB,
        '^CB2[0-9]{12}$',
        95.00, 5.00,
        'war_veteran_dependent', 'Người phụ thuộc thương binh'
    );

-- XK: Poor and near-poor households
INSERT INTO bhyt_validation_rules (
    rule_name, rule_name_vi,
    description, description_vi,
    prefix_codes, regex_pattern,
    coverage_percent, copay_rate,
    beneficiary_category, beneficiary_category_vi
)
VALUES
    (
        'Poor Household - Category 1',
        'Hộ nghèo - Loại 1',
        'Members of poor households',
        'Thành viên hộ nghèo',
        '["XK1"]'::JSONB,
        '^XK1[0-9]{12}$',
        100.00, 0.00,
        'poor_household', 'Hộ nghèo'
    ),
    (
        'Near-Poor Household - Category 2',
        'Hộ cận nghèo - Loại 2',
        'Members of near-poor households',
        'Thành viên hộ cận nghèo',
        '["XK2"]'::JSONB,
        '^XK2[0-9]{12}$',
        95.00, 5.00,
        'near_poor_household', 'Hộ cận nghèo'
    );

-- NN: Self-employed and farmers
INSERT INTO bhyt_validation_rules (
    rule_name, rule_name_vi,
    description, description_vi,
    prefix_codes, regex_pattern,
    coverage_percent, copay_rate,
    beneficiary_category, beneficiary_category_vi
)
VALUES
    (
        'Farmers - Category 1',
        'Nông dân - Loại 1',
        'Agricultural workers and farmers',
        'Người lao động nông nghiệp và nông dân',
        '["NN1"]'::JSONB,
        '^NN1[0-9]{12}$',
        80.00, 20.00,
        'farmer', 'Nông dân'
    ),
    (
        'Self-Employed - Category 2',
        'Tự kinh doanh - Loại 2',
        'Self-employed individuals and freelancers',
        'Người tự kinh doanh và lao động tự do',
        '["NN2"]'::JSONB,
        '^NN2[0-9]{12}$',
        80.00, 20.00,
        'self_employed', 'Tự kinh doanh'
    ),
    (
        'Household Business - Category 3',
        'Hộ kinh doanh - Loại 3',
        'Household business members',
        'Thành viên hộ kinh doanh',
        '["NN3"]'::JSONB,
        '^NN3[0-9]{12}$',
        80.00, 20.00,
        'household_business', 'Hộ kinh doanh'
    );

-- TN: Voluntary participants
INSERT INTO bhyt_validation_rules (
    rule_name, rule_name_vi,
    description, description_vi,
    prefix_codes, regex_pattern,
    coverage_percent, copay_rate,
    beneficiary_category, beneficiary_category_vi
)
VALUES
    (
        'Voluntary - New Participant',
        'Tự nguyện - Người tham gia mới',
        'New voluntary BHYT participants (first year)',
        'Người tham gia BHYT tự nguyện mới (năm đầu)',
        '["TN1"]'::JSONB,
        '^TN1[0-9]{12}$',
        80.00, 20.00,
        'voluntary_new', 'Tự nguyện mới'
    ),
    (
        'Voluntary - Continuous Participant',
        'Tự nguyện - Người tham gia liên tục',
        'Continuous voluntary BHYT participants (2+ years)',
        'Người tham gia BHYT tự nguyện liên tục (2+ năm)',
        '["TN2"]'::JSONB,
        '^TN2[0-9]{12}$',
        80.00, 20.00,
        'voluntary_continuous', 'Tự nguyện liên tục'
    );

-- TX: Social insurance recipients
INSERT INTO bhyt_validation_rules (
    rule_name, rule_name_vi,
    description, description_vi,
    prefix_codes, regex_pattern,
    coverage_percent, copay_rate,
    beneficiary_category, beneficiary_category_vi
)
VALUES
    (
        'Social Insurance - Pension',
        'Bảo hiểm xã hội - Lương hưu',
        'Pension recipients through social insurance',
        'Người hưởng lương hưu qua bảo hiểm xã hội',
        '["TX1"]'::JSONB,
        '^TX1[0-9]{12}$',
        95.00, 5.00,
        'pension', 'Lương hưu'
    ),
    (
        'Social Insurance - Allowance',
        'Bảo hiểm xã hội - Trợ cấp',
        'Social allowance recipients',
        'Người hưởng trợ cấp xã hội',
        '["TX2"]'::JSONB,
        '^TX2[0-9]{12}$',
        95.00, 5.00,
        'social_allowance', 'Trợ cấp xã hội'
    );

-- =============================================================================
-- HELPER FUNCTION: Validate BHYT card against rules
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_bhyt_card(p_card_number VARCHAR(15))
RETURNS TABLE (
    is_valid BOOLEAN,
    prefix_code VARCHAR(5),
    coverage_percent DECIMAL(5,2),
    copay_rate DECIMAL(5,2),
    beneficiary_category VARCHAR(100),
    beneficiary_category_vi VARCHAR(100),
    rule_name VARCHAR(255)
) AS $$
DECLARE
    v_prefix VARCHAR(3);
BEGIN
    -- Extract prefix (first 3 characters)
    v_prefix := LEFT(p_card_number, 3);

    RETURN QUERY
    SELECT
        TRUE AS is_valid,
        v_prefix AS prefix_code,
        r.coverage_percent,
        r.copay_rate,
        r.beneficiary_category,
        r.beneficiary_category_vi,
        r.rule_name
    FROM bhyt_validation_rules r
    WHERE r.is_active = TRUE
    AND r.prefix_codes @> to_jsonb(v_prefix)
    AND (r.effective_to IS NULL OR r.effective_to >= CURRENT_DATE)
    AND r.effective_from <= CURRENT_DATE
    AND p_card_number ~ r.regex_pattern
    LIMIT 1;

    -- If no rows returned, return invalid
    IF NOT FOUND THEN
        RETURN QUERY SELECT
            FALSE AS is_valid,
            v_prefix AS prefix_code,
            NULL::DECIMAL(5,2),
            NULL::DECIMAL(5,2),
            NULL::VARCHAR(100),
            NULL::VARCHAR(100),
            NULL::VARCHAR(255);
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_bhyt_card IS 'Validate a BHYT card number and return coverage details';

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE bhyt_validation_rules IS 'BHYT prefix validation rules with coverage rates per beneficiary category';
COMMENT ON COLUMN bhyt_validation_rules.prefix_codes IS 'JSONB array of BHYT prefix codes this rule applies to';
COMMENT ON COLUMN bhyt_validation_rules.regex_pattern IS 'Regex pattern for validating full card number format';
