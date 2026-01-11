-- Seed file: checklists.sql
-- Description: Initial checklist templates for PhysioFlow
-- Created: 2026-01-10

-- =============================================================================
-- INITIAL EVALUATION TEMPLATE
-- =============================================================================

INSERT INTO checklist_templates (
    id, clinic_id, name, name_vi, description, description_vi,
    code, template_type, version, is_current_version, settings, is_active
) VALUES (
    '11111111-1111-1111-1111-111111111101',
    NULL,  -- Global template
    'Initial Evaluation',
    'Danh gia ban dau',
    'Comprehensive initial patient evaluation checklist',
    'Danh sach kiem tra danh gia benh nhan ban dau toan dien',
    'INIT-EVAL',
    'initial_eval',
    1,
    TRUE,
    '{"allow_skip": false, "require_all_sections": true, "auto_save_interval_seconds": 30, "show_progress_bar": true, "enable_quick_phrases": true, "default_language": "en"}',
    TRUE
);

-- Section 1: Chief Complaint
INSERT INTO checklist_sections (
    id, template_id, title, title_vi, description, description_vi,
    sort_order, is_required, is_collapsible, default_collapsed
) VALUES (
    '22222222-2222-2222-2222-222222222201',
    '11111111-1111-1111-1111-111111111101',
    'Chief Complaint',
    'Ly do kham',
    'Patient''s primary reason for seeking treatment',
    'Ly do chinh benh nhan tim kiem dieu tri',
    1, TRUE, TRUE, FALSE
);

INSERT INTO checklist_items (section_id, label, label_vi, help_text, item_type, item_config, sort_order, is_required, data_mapping) VALUES
('22222222-2222-2222-2222-222222222201', 'Chief Complaint', 'Ly do kham chinh', 'Describe the patient''s main problem in their own words', 'text', '{"multiline": true, "max_length": 1000}', 1, TRUE, '{"target_field": "soap.subjective"}'),
('22222222-2222-2222-2222-222222222201', 'Onset Date', 'Ngay bat dau', 'When did the symptoms first appear?', 'date', '{}', 2, TRUE, '{}'),
('22222222-2222-2222-2222-222222222201', 'Onset Type', 'Loai khoi phat', '', 'radio', '{"options": [{"value": "sudden", "label": "Sudden", "label_vi": "Dot ngot"}, {"value": "gradual", "label": "Gradual", "label_vi": "Tu tu"}, {"value": "traumatic", "label": "Traumatic", "label_vi": "Chan thuong"}]}', 3, TRUE, '{}'),
('22222222-2222-2222-2222-222222222201', 'Mechanism of Injury', 'Co che chan thuong', 'Describe how the injury occurred', 'text', '{"multiline": true}', 4, FALSE, '{}');

-- Section 2: Pain Assessment
INSERT INTO checklist_sections (
    id, template_id, title, title_vi, description,
    sort_order, is_required, is_collapsible, default_collapsed
) VALUES (
    '22222222-2222-2222-2222-222222222202',
    '11111111-1111-1111-1111-111111111101',
    'Pain Assessment',
    'Danh gia dau',
    'Comprehensive pain evaluation',
    2, TRUE, TRUE, FALSE
);

INSERT INTO checklist_items (section_id, label, label_vi, help_text, item_type, item_config, sort_order, is_required, cds_rules) VALUES
('22222222-2222-2222-2222-222222222202', 'Current Pain Level', 'Muc do dau hien tai', 'Rate current pain on a 0-10 scale', 'scale', '{"min": 0, "max": 10, "step": 1, "labels": {"min": "No pain", "max": "Worst pain", "min_vi": "Khong dau", "max_vi": "Dau nhat"}}', 1, TRUE, '[{"condition": {"operator": "greater_than", "value": 7}, "alert_type": "warning", "message": "High pain level - consider pain management consultation", "message_vi": "Muc do dau cao - can hoi y kien quan ly dau"}]'),
('22222222-2222-2222-2222-222222222202', 'Worst Pain (24h)', 'Dau nhat (24h)', 'Worst pain level in the past 24 hours', 'scale', '{"min": 0, "max": 10, "step": 1}', 2, TRUE, '[]'),
('22222222-2222-2222-2222-222222222202', 'Best Pain (24h)', 'Dau it nhat (24h)', 'Lowest pain level in the past 24 hours', 'scale', '{"min": 0, "max": 10, "step": 1}', 3, TRUE, '[]'),
('22222222-2222-2222-2222-222222222202', 'Pain Location', 'Vi tri dau', 'Mark pain locations on the body diagram', 'body_diagram', '{"view": "both", "allow_multiple": true}', 4, TRUE, '[]'),
('22222222-2222-2222-2222-222222222202', 'Pain Type', 'Loai dau', '', 'multi_select', '{"options": [{"value": "sharp", "label": "Sharp", "label_vi": "Nhoi"}, {"value": "dull", "label": "Dull", "label_vi": "Am i"}, {"value": "aching", "label": "Aching", "label_vi": "Nhuc"}, {"value": "burning", "label": "Burning", "label_vi": "Nong rat"}, {"value": "throbbing", "label": "Throbbing", "label_vi": "Dap theo nhip"}, {"value": "radiating", "label": "Radiating", "label_vi": "Lan toa"}]}', 5, FALSE, '[]'),
('22222222-2222-2222-2222-222222222202', 'Aggravating Factors', 'Yeu to tang dau', 'What makes the pain worse?', 'text', '{"multiline": true}', 6, FALSE, '[]'),
('22222222-2222-2222-2222-222222222202', 'Relieving Factors', 'Yeu to giam dau', 'What makes the pain better?', 'text', '{"multiline": true}', 7, FALSE, '[]');

-- Section 3: Medical History
INSERT INTO checklist_sections (
    id, template_id, title, title_vi, description,
    sort_order, is_required, is_collapsible, default_collapsed
) VALUES (
    '22222222-2222-2222-2222-222222222203',
    '11111111-1111-1111-1111-111111111101',
    'Medical History',
    'Tien su benh',
    'Relevant past medical history',
    3, TRUE, TRUE, FALSE
);

INSERT INTO checklist_items (section_id, label, label_vi, help_text, item_type, item_config, sort_order, is_required) VALUES
('22222222-2222-2222-2222-222222222203', 'Past Medical History', 'Tien su benh ly', 'List relevant past medical conditions', 'text', '{"multiline": true}', 1, FALSE),
('22222222-2222-2222-2222-222222222203', 'Previous Surgeries', 'Tien su phau thuat', 'List previous surgeries related to current condition', 'text', '{"multiline": true}', 2, FALSE),
('22222222-2222-2222-2222-222222222203', 'Current Medications', 'Thuoc dang dung', 'List all current medications', 'text', '{"multiline": true}', 3, FALSE),
('22222222-2222-2222-2222-222222222203', 'Red Flags Present', 'Dau hieu nguy hiem', 'Check if any red flags are present', 'multi_select', '{"options": [{"value": "fever", "label": "Fever/infection signs", "label_vi": "Sot/dau hieu nhiem trung"}, {"value": "weight_loss", "label": "Unexplained weight loss", "label_vi": "Sut can khong ro nguyen nhan"}, {"value": "night_pain", "label": "Night pain/sweats", "label_vi": "Dau dem/do mo hoi"}, {"value": "bowel_bladder", "label": "Bowel/bladder dysfunction", "label_vi": "Roi loan dai tieu tien"}, {"value": "saddle", "label": "Saddle anesthesia", "label_vi": "Te vung yen ngua"}, {"value": "none", "label": "None", "label_vi": "Khong co"}]}', 4, TRUE);

-- Section 4: Objective Findings
INSERT INTO checklist_sections (
    id, template_id, title, title_vi, description,
    sort_order, is_required, is_collapsible, default_collapsed
) VALUES (
    '22222222-2222-2222-2222-222222222204',
    '11111111-1111-1111-1111-111111111101',
    'Objective Findings',
    'Kham khach quan',
    'Physical examination findings',
    4, TRUE, TRUE, FALSE
);

INSERT INTO checklist_items (section_id, label, label_vi, help_text, item_type, item_config, sort_order, is_required) VALUES
('22222222-2222-2222-2222-222222222204', 'Posture Assessment', 'Danh gia tu the', 'Describe postural abnormalities', 'text', '{"multiline": true}', 1, FALSE),
('22222222-2222-2222-2222-222222222204', 'Gait Analysis', 'Phan tich di', 'Describe gait pattern', 'text', '{"multiline": true}', 2, FALSE),
('22222222-2222-2222-2222-222222222204', 'ROM Limitations', 'Han che ROM', 'Document range of motion limitations', 'text', '{"multiline": true}', 3, TRUE),
('22222222-2222-2222-2222-222222222204', 'Strength Deficits', 'Giam suc co', 'Document muscle strength deficits', 'text', '{"multiline": true}', 4, TRUE),
('22222222-2222-2222-2222-222222222204', 'Special Tests Performed', 'Nghiem phap dac biet', 'Document special tests and results', 'text', '{"multiline": true}', 5, FALSE),
('22222222-2222-2222-2222-222222222204', 'Palpation Findings', 'Kham so', 'Document palpation findings', 'text', '{"multiline": true}', 6, FALSE);

-- Section 5: Assessment & Plan
INSERT INTO checklist_sections (
    id, template_id, title, title_vi, description,
    sort_order, is_required, is_collapsible, default_collapsed
) VALUES (
    '22222222-2222-2222-2222-222222222205',
    '11111111-1111-1111-1111-111111111101',
    'Assessment & Plan',
    'Danh gia & Ke hoach',
    'Clinical impression and treatment plan',
    5, TRUE, TRUE, FALSE
);

INSERT INTO checklist_items (section_id, label, label_vi, help_text, item_type, item_config, sort_order, is_required) VALUES
('22222222-2222-2222-2222-222222222205', 'Clinical Impression', 'Nhan dinh lam sang', 'Summarize clinical findings and impression', 'text', '{"multiline": true}', 1, TRUE),
('22222222-2222-2222-2222-222222222205', 'Prognosis', 'Tien luong', '', 'radio', '{"options": [{"value": "excellent", "label": "Excellent", "label_vi": "Rat tot"}, {"value": "good", "label": "Good", "label_vi": "Tot"}, {"value": "fair", "label": "Fair", "label_vi": "Kha"}, {"value": "guarded", "label": "Guarded", "label_vi": "De dat"}, {"value": "poor", "label": "Poor", "label_vi": "Xau"}]}', 2, TRUE),
('22222222-2222-2222-2222-222222222205', 'Short-term Goals', 'Muc tieu ngan han', 'Goals to achieve in 2-4 weeks', 'text', '{"multiline": true}', 3, TRUE),
('22222222-2222-2222-2222-222222222205', 'Long-term Goals', 'Muc tieu dai han', 'Goals to achieve in 6-12 weeks', 'text', '{"multiline": true}', 4, TRUE),
('22222222-2222-2222-2222-222222222205', 'Recommended Frequency', 'Tan suat de nghi', '', 'radio', '{"options": [{"value": "1x", "label": "1x/week", "label_vi": "1 lan/tuan"}, {"value": "2x", "label": "2x/week", "label_vi": "2 lan/tuan"}, {"value": "3x", "label": "3x/week", "label_vi": "3 lan/tuan"}, {"value": "prn", "label": "As needed", "label_vi": "Khi can"}]}', 5, TRUE),
('22222222-2222-2222-2222-222222222205', 'Estimated Duration', 'Thoi gian uoc tinh', 'Estimated treatment duration', 'radio', '{"options": [{"value": "2-4w", "label": "2-4 weeks", "label_vi": "2-4 tuan"}, {"value": "4-6w", "label": "4-6 weeks", "label_vi": "4-6 tuan"}, {"value": "6-8w", "label": "6-8 weeks", "label_vi": "6-8 tuan"}, {"value": "8-12w", "label": "8-12 weeks", "label_vi": "8-12 tuan"}, {"value": ">12w", "label": ">12 weeks", "label_vi": ">12 tuan"}]}', 6, TRUE);

-- =============================================================================
-- FOLLOW-UP VISIT TEMPLATE
-- =============================================================================

INSERT INTO checklist_templates (
    id, clinic_id, name, name_vi, description, description_vi,
    code, template_type, version, is_current_version, settings, is_active
) VALUES (
    '11111111-1111-1111-1111-111111111102',
    NULL,
    'Follow-up Visit',
    'Tai kham',
    'Standard follow-up visit documentation checklist',
    'Danh sach kiem tra tai kham tieu chuan',
    'FOLLOW-UP',
    'follow_up',
    1,
    TRUE,
    '{"allow_skip": true, "require_all_sections": false, "auto_save_interval_seconds": 30, "show_progress_bar": true, "enable_quick_phrases": true, "default_language": "en"}',
    TRUE
);

-- Section 1: Subjective
INSERT INTO checklist_sections (
    id, template_id, title, title_vi, description,
    sort_order, is_required, is_collapsible, default_collapsed
) VALUES (
    '22222222-2222-2222-2222-222222222211',
    '11111111-1111-1111-1111-111111111102',
    'Subjective',
    'Chu quan',
    'Patient-reported status since last visit',
    1, TRUE, TRUE, FALSE
);

INSERT INTO checklist_items (section_id, label, label_vi, help_text, item_type, item_config, sort_order, is_required, quick_phrases, data_mapping) VALUES
('22222222-2222-2222-2222-222222222211', 'Patient Report', 'Bao cao benh nhan', 'How has the patient been since last visit?', 'text', '{"multiline": true}', 1, TRUE, '[{"phrase": "Patient reports improvement since last visit", "phrase_vi": "Benh nhan bao cao cai thien ke tu lan kham truoc"}, {"phrase": "Patient reports no change since last visit", "phrase_vi": "Benh nhan bao cao khong thay doi"}, {"phrase": "Patient reports worsening symptoms", "phrase_vi": "Benh nhan bao cao trieu chung toi te hon"}]', '{"target_field": "soap.subjective", "source_field": "last_visit.patient_report"}'),
('22222222-2222-2222-2222-222222222211', 'Current Pain Level', 'Muc do dau hien tai', '', 'scale', '{"min": 0, "max": 10, "step": 1}', 2, TRUE, '[]', '{"source_field": "last_visit.pain_level"}'),
('22222222-2222-2222-2222-222222222211', 'Home Exercise Compliance', 'Tuan thu bai tap nha', '', 'radio', '{"options": [{"value": "excellent", "label": "Excellent (>90%)", "label_vi": "Rat tot (>90%)"}, {"value": "good", "label": "Good (75-90%)", "label_vi": "Tot (75-90%)"}, {"value": "fair", "label": "Fair (50-75%)", "label_vi": "Kha (50-75%)"}, {"value": "poor", "label": "Poor (<50%)", "label_vi": "Kem (<50%)"}]}', 3, FALSE, '[]', '{}'),
('22222222-2222-2222-2222-222222222211', 'Functional Changes', 'Thay doi chuc nang', 'Changes in daily activities', 'text', '{"multiline": true}', 4, FALSE, '[]', '{}');

-- Section 2: Objective
INSERT INTO checklist_sections (
    id, template_id, title, title_vi, description,
    sort_order, is_required, is_collapsible, default_collapsed
) VALUES (
    '22222222-2222-2222-2222-222222222212',
    '11111111-1111-1111-1111-111111111102',
    'Objective',
    'Khach quan',
    'Clinical findings today',
    2, TRUE, TRUE, FALSE
);

INSERT INTO checklist_items (section_id, label, label_vi, help_text, item_type, item_config, sort_order, is_required) VALUES
('22222222-2222-2222-2222-222222222212', 'Observation', 'Quan sat', 'General observations', 'text', '{"multiline": true}', 1, FALSE),
('22222222-2222-2222-2222-222222222212', 'ROM Changes', 'Thay doi ROM', 'Changes in range of motion', 'text', '{"multiline": true}', 2, FALSE),
('22222222-2222-2222-2222-222222222212', 'Strength Changes', 'Thay doi suc co', 'Changes in strength', 'text', '{"multiline": true}', 3, FALSE);

-- Section 3: Interventions
INSERT INTO checklist_sections (
    id, template_id, title, title_vi, description,
    sort_order, is_required, is_collapsible, default_collapsed
) VALUES (
    '22222222-2222-2222-2222-222222222213',
    '11111111-1111-1111-1111-111111111102',
    'Interventions Performed',
    'Can thiep thuc hien',
    'Treatment provided today',
    3, TRUE, TRUE, FALSE
);

INSERT INTO checklist_items (section_id, label, label_vi, help_text, item_type, item_config, sort_order, is_required) VALUES
('22222222-2222-2222-2222-222222222213', 'Manual Therapy', 'Tri lieu tay', '', 'checkbox', '{"default_checked": false}', 1, FALSE),
('22222222-2222-2222-2222-222222222213', 'Manual Therapy Details', 'Chi tiet tri lieu tay', '', 'text', '{"multiline": true}', 2, FALSE),
('22222222-2222-2222-2222-222222222213', 'Therapeutic Exercise', 'Bai tap dieu tri', '', 'checkbox', '{"default_checked": true}', 3, FALSE),
('22222222-2222-2222-2222-222222222213', 'Exercise Details', 'Chi tiet bai tap', '', 'text', '{"multiline": true}', 4, FALSE),
('22222222-2222-2222-2222-222222222213', 'Modalities Used', 'Phuong thuc su dung', '', 'multi_select', '{"options": [{"value": "heat", "label": "Heat", "label_vi": "Nhiet"}, {"value": "ice", "label": "Ice", "label_vi": "Da lanh"}, {"value": "estim", "label": "E-Stim", "label_vi": "Kich dien"}, {"value": "ultrasound", "label": "Ultrasound", "label_vi": "Sieu am"}, {"value": "taping", "label": "Taping", "label_vi": "Bang dinh"}, {"value": "dry_needling", "label": "Dry Needling", "label_vi": "Chau kho"}]}', 5, FALSE),
('22222222-2222-2222-2222-222222222213', 'Patient Education', 'Giao duc benh nhan', '', 'checkbox', '{"default_checked": false}', 6, FALSE),
('22222222-2222-2222-2222-222222222213', 'Education Topics', 'Chu de giao duc', '', 'text', '{"multiline": true}', 7, FALSE);

-- Section 4: Assessment
INSERT INTO checklist_sections (
    id, template_id, title, title_vi, description,
    sort_order, is_required, is_collapsible, default_collapsed
) VALUES (
    '22222222-2222-2222-2222-222222222214',
    '11111111-1111-1111-1111-111111111102',
    'Assessment',
    'Danh gia',
    'Response to treatment and progress',
    4, TRUE, TRUE, FALSE
);

INSERT INTO checklist_items (section_id, label, label_vi, help_text, item_type, item_config, sort_order, is_required, quick_phrases) VALUES
('22222222-2222-2222-2222-222222222214', 'Response to Treatment', 'Dap ung dieu tri', '', 'radio', '{"options": [{"value": "excellent", "label": "Excellent", "label_vi": "Rat tot"}, {"value": "good", "label": "Good", "label_vi": "Tot"}, {"value": "fair", "label": "Fair", "label_vi": "Kha"}, {"value": "poor", "label": "Poor", "label_vi": "Kem"}]}', 1, TRUE, '[]'),
('22222222-2222-2222-2222-222222222214', 'Pain After Treatment', 'Dau sau dieu tri', '', 'scale', '{"min": 0, "max": 10, "step": 1}', 2, TRUE, '[]'),
('22222222-2222-2222-2222-222222222214', 'Progress Notes', 'Ghi chu tien trien', 'Overall progress assessment', 'text', '{"multiline": true}', 3, TRUE, '[{"phrase": "Patient making good progress toward goals", "phrase_vi": "Benh nhan tien trien tot huong toi muc tieu"}, {"phrase": "Progress slower than expected", "phrase_vi": "Tien trien cham hon du kien"}, {"phrase": "Goals may need to be modified", "phrase_vi": "Muc tieu co the can dieu chinh"}]');

-- Section 5: Plan
INSERT INTO checklist_sections (
    id, template_id, title, title_vi, description,
    sort_order, is_required, is_collapsible, default_collapsed
) VALUES (
    '22222222-2222-2222-2222-222222222215',
    '11111111-1111-1111-1111-111111111102',
    'Plan',
    'Ke hoach',
    'Plan for next session',
    5, TRUE, TRUE, FALSE
);

INSERT INTO checklist_items (section_id, label, label_vi, help_text, item_type, item_config, sort_order, is_required) VALUES
('22222222-2222-2222-2222-222222222215', 'Continue Current Plan', 'Tiep tuc ke hoach hien tai', '', 'checkbox', '{"default_checked": true}', 1, FALSE),
('22222222-2222-2222-2222-222222222215', 'Plan Modifications', 'Dieu chinh ke hoach', 'Any changes to the treatment plan', 'text', '{"multiline": true}', 2, FALSE),
('22222222-2222-2222-2222-222222222215', 'HEP Updates', 'Cap nhat bai tap nha', 'Updates to home exercise program', 'text', '{"multiline": true}', 3, FALSE),
('22222222-2222-2222-2222-222222222215', 'Next Visit Focus', 'Trong tam lan sau', 'Focus areas for next session', 'text', '{"multiline": true}', 4, FALSE);

-- =============================================================================
-- DISCHARGE TEMPLATE
-- =============================================================================

INSERT INTO checklist_templates (
    id, clinic_id, name, name_vi, description, description_vi,
    code, template_type, version, is_current_version, settings, is_active
) VALUES (
    '11111111-1111-1111-1111-111111111103',
    NULL,
    'Discharge Summary',
    'Tom tat xuat vien',
    'Patient discharge documentation checklist',
    'Danh sach kiem tra tai lieu xuat vien benh nhan',
    'DISCHARGE',
    'discharge',
    1,
    TRUE,
    '{"allow_skip": false, "require_all_sections": true, "auto_save_interval_seconds": 30, "show_progress_bar": true, "enable_quick_phrases": true, "default_language": "en"}',
    TRUE
);

-- Section 1: Final Status
INSERT INTO checklist_sections (
    id, template_id, title, title_vi, description,
    sort_order, is_required, is_collapsible, default_collapsed
) VALUES (
    '22222222-2222-2222-2222-222222222221',
    '11111111-1111-1111-1111-111111111103',
    'Final Status',
    'Tinh trang cuoi',
    'Patient status at discharge',
    1, TRUE, TRUE, FALSE
);

INSERT INTO checklist_items (section_id, label, label_vi, help_text, item_type, item_config, sort_order, is_required) VALUES
('22222222-2222-2222-2222-222222222221', 'Discharge Reason', 'Ly do xuat vien', '', 'radio', '{"options": [{"value": "goals_met", "label": "Goals Met", "label_vi": "Dat muc tieu"}, {"value": "plateau", "label": "Plateau Reached", "label_vi": "Dat cao nguyen"}, {"value": "patient_request", "label": "Patient Request", "label_vi": "Yeu cau benh nhan"}, {"value": "insurance", "label": "Insurance/Authorization", "label_vi": "Bao hiem"}, {"value": "other", "label": "Other", "label_vi": "Khac"}]}', 1, TRUE),
('22222222-2222-2222-2222-222222222221', 'Final Pain Level', 'Muc do dau cuoi', '', 'scale', '{"min": 0, "max": 10, "step": 1}', 2, TRUE),
('22222222-2222-2222-2222-222222222221', 'Total Sessions', 'Tong so buoi', '', 'number', '{"min": 1, "max": 100}', 3, TRUE),
('22222222-2222-2222-2222-222222222221', 'Treatment Duration', 'Thoi gian dieu tri', 'Total duration in weeks', 'number', '{"min": 1, "max": 52, "unit": "weeks", "unit_vi": "tuan"}', 4, TRUE);

-- Section 2: Goals Achievement
INSERT INTO checklist_sections (
    id, template_id, title, title_vi, description,
    sort_order, is_required, is_collapsible, default_collapsed
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111103',
    'Goals Achievement',
    'Dat muc tieu',
    'Status of established goals',
    2, TRUE, TRUE, FALSE
);

INSERT INTO checklist_items (section_id, label, label_vi, help_text, item_type, item_config, sort_order, is_required) VALUES
('22222222-2222-2222-2222-222222222222', 'Short-term Goals Status', 'Tinh trang muc tieu ngan han', '', 'radio', '{"options": [{"value": "met", "label": "Met", "label_vi": "Dat"}, {"value": "partially_met", "label": "Partially Met", "label_vi": "Dat mot phan"}, {"value": "not_met", "label": "Not Met", "label_vi": "Khong dat"}]}', 1, TRUE),
('22222222-2222-2222-2222-222222222222', 'Short-term Goals Details', 'Chi tiet muc tieu ngan han', '', 'text', '{"multiline": true}', 2, FALSE),
('22222222-2222-2222-2222-222222222222', 'Long-term Goals Status', 'Tinh trang muc tieu dai han', '', 'radio', '{"options": [{"value": "met", "label": "Met", "label_vi": "Dat"}, {"value": "partially_met", "label": "Partially Met", "label_vi": "Dat mot phan"}, {"value": "not_met", "label": "Not Met", "label_vi": "Khong dat"}]}', 3, TRUE),
('22222222-2222-2222-2222-222222222222', 'Long-term Goals Details', 'Chi tiet muc tieu dai han', '', 'text', '{"multiline": true}', 4, FALSE);

-- Section 3: Outcome Measures
INSERT INTO checklist_sections (
    id, template_id, title, title_vi, description,
    sort_order, is_required, is_collapsible, default_collapsed
) VALUES (
    '22222222-2222-2222-2222-222222222223',
    '11111111-1111-1111-1111-111111111103',
    'Outcome Measures',
    'Do luong ket qua',
    'Standardized outcome measure results',
    3, TRUE, TRUE, FALSE
);

INSERT INTO checklist_items (section_id, label, label_vi, help_text, item_type, item_config, sort_order, is_required) VALUES
('22222222-2222-2222-2222-222222222223', 'Initial NPRS', 'NPRS ban dau', 'Initial pain score', 'number', '{"min": 0, "max": 10}', 1, FALSE),
('22222222-2222-2222-2222-222222222223', 'Final NPRS', 'NPRS cuoi', 'Final pain score', 'number', '{"min": 0, "max": 10}', 2, FALSE),
('22222222-2222-2222-2222-222222222223', 'NPRS Change', 'Thay doi NPRS', 'Point change in NPRS', 'number', '{"min": -10, "max": 10}', 3, FALSE),
('22222222-2222-2222-2222-222222222223', 'Functional Outcome Measure Used', 'Do luong chuc nang su dung', '', 'radio', '{"options": [{"value": "odi", "label": "ODI", "label_vi": "ODI"}, {"value": "ndi", "label": "NDI", "label_vi": "NDI"}, {"value": "dash", "label": "DASH", "label_vi": "DASH"}, {"value": "lefs", "label": "LEFS", "label_vi": "LEFS"}, {"value": "other", "label": "Other", "label_vi": "Khac"}, {"value": "none", "label": "None", "label_vi": "Khong"}]}', 4, FALSE),
('22222222-2222-2222-2222-222222222223', 'Initial Score', 'Diem ban dau', '', 'number', '{}', 5, FALSE),
('22222222-2222-2222-2222-222222222223', 'Final Score', 'Diem cuoi', '', 'number', '{}', 6, FALSE);

-- Section 4: Recommendations
INSERT INTO checklist_sections (
    id, template_id, title, title_vi, description,
    sort_order, is_required, is_collapsible, default_collapsed
) VALUES (
    '22222222-2222-2222-2222-222222222224',
    '11111111-1111-1111-1111-111111111103',
    'Recommendations',
    'Khuyen nghi',
    'Post-discharge recommendations',
    4, TRUE, TRUE, FALSE
);

INSERT INTO checklist_items (section_id, label, label_vi, help_text, item_type, item_config, sort_order, is_required, quick_phrases) VALUES
('22222222-2222-2222-2222-222222222224', 'Home Exercise Program', 'Chuong trinh bai tap nha', 'Final HEP recommendations', 'text', '{"multiline": true}', 1, TRUE, '[{"phrase": "Continue current HEP indefinitely", "phrase_vi": "Tiep tuc HEP hien tai vo thoi han"}, {"phrase": "Transition to independent exercise program", "phrase_vi": "Chuyen sang chuong trinh tap tu do"}, {"phrase": "Progress to gym-based program", "phrase_vi": "Tien den chuong trinh tap gym"}]'),
('22222222-2222-2222-2222-222222222224', 'Activity Modifications', 'Dieu chinh hoat dong', 'Permanent activity modifications if any', 'text', '{"multiline": true}', 2, FALSE, '[]'),
('22222222-2222-2222-2222-222222222224', 'Return Precautions', 'Luu y khi quay lai', 'When to return for treatment', 'text', '{"multiline": true}', 3, TRUE, '[{"phrase": "Return if symptoms recur or worsen", "phrase_vi": "Quay lai neu trieu chung tai phat hoac toi te hon"}, {"phrase": "Follow up with physician as scheduled", "phrase_vi": "Tai kham bac si theo lich hen"}, {"phrase": "No restrictions, cleared for full activity", "phrase_vi": "Khong han che, duoc phep hoat dong day du"}]'),
('22222222-2222-2222-2222-222222222224', 'Referral Recommendations', 'Khuyen nghi chuyen', 'Any recommended referrals', 'text', '{"multiline": true}', 4, FALSE, '[]');

-- Section 5: Summary
INSERT INTO checklist_sections (
    id, template_id, title, title_vi, description,
    sort_order, is_required, is_collapsible, default_collapsed
) VALUES (
    '22222222-2222-2222-2222-222222222225',
    '11111111-1111-1111-1111-111111111103',
    'Discharge Summary',
    'Tom tat xuat vien',
    'Overall discharge summary',
    5, TRUE, TRUE, FALSE
);

INSERT INTO checklist_items (section_id, label, label_vi, help_text, item_type, item_config, sort_order, is_required) VALUES
('22222222-2222-2222-2222-222222222225', 'Summary Notes', 'Ghi chu tom tat', 'Brief summary of treatment course and outcomes', 'text', '{"multiline": true}', 1, TRUE),
('22222222-2222-2222-2222-222222222225', 'Patient Satisfaction', 'Su hai long benh nhan', '', 'scale', '{"min": 1, "max": 5, "step": 1, "labels": {"min": "Very Unsatisfied", "max": "Very Satisfied", "min_vi": "Rat khong hai long", "max_vi": "Rat hai long"}}', 2, FALSE),
('22222222-2222-2222-2222-222222222225', 'Patient Signature Obtained', 'Da lay chu ky benh nhan', '', 'checkbox', '{"default_checked": false}', 3, FALSE),
('22222222-2222-2222-2222-222222222225', 'Copy Provided to Patient', 'Da cung cap ban sao cho benh nhan', '', 'checkbox', '{"default_checked": false}', 4, FALSE);

-- =============================================================================
-- QUICK RECORDS TABLES (if not already created in migrations)
-- =============================================================================

-- Create quick_pain_records table for tracking pain measurements
CREATE TABLE IF NOT EXISTS quick_pain_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    therapist_id UUID NOT NULL REFERENCES users(id),
    level INTEGER NOT NULL CHECK (level >= 0 AND level <= 10),
    location VARCHAR(255),
    body_region body_region,
    notes TEXT,
    context VARCHAR(50),  -- pre_session, post_session, follow_up
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quick_pain_patient_id ON quick_pain_records (patient_id);
CREATE INDEX IF NOT EXISTS idx_quick_pain_recorded_at ON quick_pain_records (recorded_at);

-- Create quick_rom_records table for tracking ROM measurements
CREATE TABLE IF NOT EXISTS quick_rom_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    therapist_id UUID NOT NULL REFERENCES users(id),
    joint VARCHAR(100) NOT NULL,
    movement VARCHAR(100) NOT NULL,
    side VARCHAR(20),  -- left, right, bilateral
    active_rom DECIMAL(5,1),
    passive_rom DECIMAL(5,1),
    is_painful BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quick_rom_patient_id ON quick_rom_records (patient_id);
CREATE INDEX IF NOT EXISTS idx_quick_rom_joint ON quick_rom_records (joint);
CREATE INDEX IF NOT EXISTS idx_quick_rom_recorded_at ON quick_rom_records (recorded_at);

COMMENT ON TABLE quick_pain_records IS 'Quick pain level recordings for tracking progress';
COMMENT ON TABLE quick_rom_records IS 'Quick ROM measurements for tracking progress';
