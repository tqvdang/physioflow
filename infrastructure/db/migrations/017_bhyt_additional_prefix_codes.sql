-- Migration: 017_bhyt_additional_prefix_codes.sql
-- Description: Add 4 missing BHYT prefix code categories (HS, CA, GD, NO) to bhyt_validation_rules
-- Created: 2026-02-11
-- Depends on: 015_bhyt_validation_rules.sql
-- Sprint: 1A - BHYT Completion
--
-- This brings the total from 14 prefix codes (existing) to 18 prefix codes:
--   Existing: HC1-4, DN1-3, TE1-3, CB1-2, XK1-2, NN1-3, TN1-2, TX1-2
--   New:      HS1-2 (students), CA1-2 (veterans/police), GD1-2 (martyrs' families), NO1 (elderly 80+)

-- =============================================================================
-- HS: Hoc sinh (Students) - 5% copay, 80% coverage
-- =============================================================================

INSERT INTO bhyt_validation_rules (
    rule_name, rule_name_vi,
    description, description_vi,
    prefix_codes, regex_pattern,
    coverage_percent, copay_rate,
    beneficiary_category, beneficiary_category_vi
)
VALUES
    (
        'Students - Category 1',
        'Hoc sinh - Loai 1',
        'Primary and secondary school students',
        'Hoc sinh tieu hoc va trung hoc co so',
        '["HS1"]'::JSONB,
        '^HS1[0-9]{12}$',
        80.00, 5.00,
        'student', 'Hoc sinh'
    ),
    (
        'Students - Category 2',
        'Hoc sinh - Loai 2',
        'High school and vocational school students',
        'Hoc sinh trung hoc pho thong va trung cap nghe',
        '["HS2"]'::JSONB,
        '^HS2[0-9]{12}$',
        80.00, 5.00,
        'student_vocational', 'Hoc sinh nghe'
    );

-- =============================================================================
-- CA: Cuu chien binh (Veterans / Police) - 0% copay, 95% coverage
-- =============================================================================

INSERT INTO bhyt_validation_rules (
    rule_name, rule_name_vi,
    description, description_vi,
    prefix_codes, regex_pattern,
    coverage_percent, copay_rate,
    beneficiary_category, beneficiary_category_vi
)
VALUES
    (
        'Veterans - Category 1',
        'Cuu chien binh - Loai 1',
        'Military veterans with service record',
        'Cuu chien binh co ho so phuc vu',
        '["CA1"]'::JSONB,
        '^CA1[0-9]{12}$',
        95.00, 0.00,
        'veteran', 'Cuu chien binh'
    ),
    (
        'Veterans - Category 2',
        'Cuu chien binh - Loai 2',
        'Police and public security veterans',
        'Cuu chien binh cong an va an ninh',
        '["CA2"]'::JSONB,
        '^CA2[0-9]{12}$',
        95.00, 0.00,
        'veteran_police', 'Cuu chien binh cong an'
    );

-- =============================================================================
-- GD: Gia dinh liet si (Martyrs' families) - 0% copay, 100% coverage
-- =============================================================================

INSERT INTO bhyt_validation_rules (
    rule_name, rule_name_vi,
    description, description_vi,
    prefix_codes, regex_pattern,
    coverage_percent, copay_rate,
    beneficiary_category, beneficiary_category_vi
)
VALUES
    (
        'Martyrs Families - Category 1',
        'Gia dinh liet si - Loai 1',
        'Direct family members of war martyrs',
        'Thanh vien truc tiep gia dinh liet si',
        '["GD1"]'::JSONB,
        '^GD1[0-9]{12}$',
        100.00, 0.00,
        'martyr_family', 'Gia dinh liet si'
    ),
    (
        'Martyrs Families - Category 2',
        'Gia dinh liet si - Loai 2',
        'Extended family members of war martyrs',
        'Nguoi than gia dinh liet si',
        '["GD2"]'::JSONB,
        '^GD2[0-9]{12}$',
        100.00, 0.00,
        'martyr_family_extended', 'Nguoi than liet si'
    );

-- =============================================================================
-- NO: Nguoi cao tuoi (Elderly 80+) - 0% copay, 100% coverage
-- =============================================================================

INSERT INTO bhyt_validation_rules (
    rule_name, rule_name_vi,
    description, description_vi,
    prefix_codes, regex_pattern,
    coverage_percent, copay_rate,
    beneficiary_category, beneficiary_category_vi
)
VALUES
    (
        'Elderly 80+ - Category 1',
        'Nguoi cao tuoi 80+ - Loai 1',
        'Elderly citizens aged 80 and above',
        'Cong dan cao tuoi tu 80 tuoi tro len',
        '["NO1"]'::JSONB,
        '^NO1[0-9]{12}$',
        100.00, 0.00,
        'elderly_80_plus', 'Nguoi cao tuoi 80+'
    );

-- =============================================================================
-- UPDATE validate_bhyt_card FUNCTION
-- No changes needed - the function dynamically queries bhyt_validation_rules,
-- so new prefix codes are automatically recognized.
-- =============================================================================

-- Verify: total should now be 21 rules (14 existing + 7 new)
-- SELECT COUNT(*) FROM bhyt_validation_rules WHERE is_active = TRUE;
