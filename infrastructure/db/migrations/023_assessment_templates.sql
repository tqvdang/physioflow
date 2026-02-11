-- Migration 023: Condition-Specific Assessment Templates
-- Creates tables for structured assessment templates and patient assessment results.
-- Supports bilingual (Vietnamese/English) checklist-driven assessments.

BEGIN;

-- Assessment templates for common conditions
CREATE TABLE IF NOT EXISTS assessment_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    name_vi         VARCHAR(200) NOT NULL,
    condition       VARCHAR(100) NOT NULL UNIQUE,
    category        VARCHAR(50) NOT NULL CHECK (category IN ('musculoskeletal', 'neurological', 'pediatric')),
    description     TEXT,
    description_vi  TEXT,
    checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assessment_templates_category ON assessment_templates (category);
CREATE INDEX idx_assessment_templates_condition ON assessment_templates (condition);
CREATE INDEX idx_assessment_templates_active ON assessment_templates (is_active) WHERE is_active = true;

-- Patient assessment results
CREATE TABLE IF NOT EXISTS patient_assessment_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      UUID NOT NULL,
    template_id     UUID NOT NULL REFERENCES assessment_templates(id),
    clinic_id       UUID NOT NULL,
    therapist_id    UUID NOT NULL,
    results         JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes           TEXT,
    assessed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_assessment_results_patient ON patient_assessment_results (patient_id, assessed_at DESC);
CREATE INDEX idx_patient_assessment_results_template ON patient_assessment_results (template_id);
CREATE INDEX idx_patient_assessment_results_therapist ON patient_assessment_results (therapist_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_assessment_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assessment_templates_updated_at
    BEFORE UPDATE ON assessment_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_assessment_templates_updated_at();

CREATE TRIGGER trg_patient_assessment_results_updated_at
    BEFORE UPDATE ON patient_assessment_results
    FOR EACH ROW
    EXECUTE FUNCTION update_assessment_templates_updated_at();

-- Seed 5 condition-specific assessment templates

-- 1. Lower Back Pain Assessment (15 items)
INSERT INTO assessment_templates (name, name_vi, condition, category, description, description_vi, checklist_items)
VALUES (
    'Lower Back Pain Assessment',
    'Danh gia Dau lung duoi',
    'lower_back_pain',
    'musculoskeletal',
    'Comprehensive assessment for patients presenting with lower back pain, including posture, ROM, palpation, special tests, and neurological screening.',
    'Danh gia toan dien cho benh nhan dau lung duoi, bao gom tu the, tam van dong, so nan, nghiem phap dac biet va sang loc than kinh.',
    '[
        {
            "item": "Posture Assessment",
            "item_vi": "Danh gia tu the",
            "type": "select",
            "options": ["Normal", "Kyphotic", "Lordotic", "Scoliotic", "Flat back"],
            "options_vi": ["Binh thuong", "Gu lung", "Uon cot song", "Ven cot song", "Lung phang"],
            "required": true,
            "order": 1
        },
        {
            "item": "Pain Location",
            "item_vi": "Vi tri dau",
            "type": "checkbox",
            "options": ["Central", "Left paravertebral", "Right paravertebral", "Sacroiliac", "Buttock", "Radiating to leg"],
            "options_vi": ["Trung tam", "Canh cot song trai", "Canh cot song phai", "Khop cung chau", "Mong", "Lan xuong chan"],
            "required": true,
            "order": 2
        },
        {
            "item": "Pain Severity (VAS)",
            "item_vi": "Muc do dau (VAS)",
            "type": "number",
            "unit": "score",
            "range": [0, 10],
            "required": true,
            "order": 3
        },
        {
            "item": "Palpation Findings",
            "item_vi": "Ket qua so nan",
            "type": "checkbox",
            "options": ["Muscle spasm", "Tenderness L1-L2", "Tenderness L3-L4", "Tenderness L4-L5", "Tenderness L5-S1", "Trigger points"],
            "options_vi": ["Co that co", "An dau L1-L2", "An dau L3-L4", "An dau L4-L5", "An dau L5-S1", "Diem kich hoat"],
            "required": true,
            "order": 4
        },
        {
            "item": "Lumbar ROM Flexion",
            "item_vi": "ROM gap cot song that lung",
            "type": "number",
            "unit": "degrees",
            "range": [0, 90],
            "required": true,
            "order": 5
        },
        {
            "item": "Lumbar ROM Extension",
            "item_vi": "ROM duoi cot song that lung",
            "type": "number",
            "unit": "degrees",
            "range": [0, 30],
            "required": true,
            "order": 6
        },
        {
            "item": "Lumbar ROM Lateral Flexion (Left)",
            "item_vi": "ROM nghieng ben trai",
            "type": "number",
            "unit": "degrees",
            "range": [0, 30],
            "required": true,
            "order": 7
        },
        {
            "item": "Lumbar ROM Lateral Flexion (Right)",
            "item_vi": "ROM nghieng ben phai",
            "type": "number",
            "unit": "degrees",
            "range": [0, 30],
            "required": true,
            "order": 8
        },
        {
            "item": "Straight Leg Raise Test",
            "item_vi": "Test nang chan thang",
            "type": "radio",
            "options": ["Positive", "Negative"],
            "options_vi": ["Duong tinh", "Am tinh"],
            "required": true,
            "order": 9
        },
        {
            "item": "Slump Test",
            "item_vi": "Test ngoi guc",
            "type": "radio",
            "options": ["Positive", "Negative"],
            "options_vi": ["Duong tinh", "Am tinh"],
            "required": true,
            "order": 10
        },
        {
            "item": "Lower Extremity Reflexes",
            "item_vi": "Phan xa chi duoi",
            "type": "select",
            "options": ["Normal bilateral", "Diminished left", "Diminished right", "Absent left", "Absent right", "Hyperactive"],
            "options_vi": ["Binh thuong hai ben", "Giam trai", "Giam phai", "Mat trai", "Mat phai", "Tang"],
            "required": true,
            "order": 11
        },
        {
            "item": "Dermatomal Sensation",
            "item_vi": "Cam giac theo vung da",
            "type": "select",
            "options": ["Intact", "Decreased L4", "Decreased L5", "Decreased S1", "Multiple dermatomes affected"],
            "options_vi": ["Nguyen ven", "Giam L4", "Giam L5", "Giam S1", "Nhieu vung da bi anh huong"],
            "required": true,
            "order": 12
        },
        {
            "item": "Muscle Strength Lower Extremities",
            "item_vi": "Suc co chi duoi",
            "type": "select",
            "options": ["5/5 bilateral", "4/5 left", "4/5 right", "3/5 or below - specify"],
            "options_vi": ["5/5 hai ben", "4/5 trai", "4/5 phai", "3/5 hoac thap hon - ghi ro"],
            "required": true,
            "order": 13
        },
        {
            "item": "Functional Limitation",
            "item_vi": "Han che chuc nang",
            "type": "checkbox",
            "options": ["Sitting > 30 min", "Standing > 15 min", "Walking > 10 min", "Bending", "Lifting", "Sleeping"],
            "options_vi": ["Ngoi > 30 phut", "Dung > 15 phut", "Di > 10 phut", "Cui nguoi", "Nang do vat", "Ngu"],
            "required": true,
            "order": 14
        },
        {
            "item": "Additional Notes",
            "item_vi": "Ghi chu them",
            "type": "text",
            "required": false,
            "order": 15
        }
    ]'::jsonb
);

-- 2. Shoulder Pain Assessment (12 items)
INSERT INTO assessment_templates (name, name_vi, condition, category, description, description_vi, checklist_items)
VALUES (
    'Shoulder Pain Assessment',
    'Danh gia Dau vai',
    'shoulder_pain',
    'musculoskeletal',
    'Structured assessment for shoulder pain including inspection, ROM, strength testing, and special tests for rotator cuff and instability.',
    'Danh gia co cau truc cho dau vai bao gom quan sat, tam van dong, test suc co, va nghiem phap dac biet cho chung quay vai va mat vung.',
    '[
        {
            "item": "Inspection",
            "item_vi": "Quan sat",
            "type": "checkbox",
            "options": ["Swelling", "Atrophy", "Deformity", "Bruising", "Asymmetry", "Normal"],
            "options_vi": ["Sung", "Teo co", "Bien dang", "Bam tim", "Bat doi xung", "Binh thuong"],
            "required": true,
            "order": 1
        },
        {
            "item": "Shoulder Flexion ROM",
            "item_vi": "ROM gap vai",
            "type": "number",
            "unit": "degrees",
            "range": [0, 180],
            "required": true,
            "order": 2
        },
        {
            "item": "Shoulder Abduction ROM",
            "item_vi": "ROM dang vai",
            "type": "number",
            "unit": "degrees",
            "range": [0, 180],
            "required": true,
            "order": 3
        },
        {
            "item": "Shoulder External Rotation ROM",
            "item_vi": "ROM xoay ngoai vai",
            "type": "number",
            "unit": "degrees",
            "range": [0, 90],
            "required": true,
            "order": 4
        },
        {
            "item": "Shoulder Internal Rotation ROM",
            "item_vi": "ROM xoay trong vai",
            "type": "number",
            "unit": "degrees",
            "range": [0, 90],
            "required": true,
            "order": 5
        },
        {
            "item": "Rotator Cuff Strength",
            "item_vi": "Suc co chung quay vai",
            "type": "select",
            "options": ["5/5 Normal", "4/5 Good", "3/5 Fair", "2/5 Poor", "1/5 Trace", "0/5 Zero"],
            "options_vi": ["5/5 Binh thuong", "4/5 Tot", "3/5 Trung binh", "2/5 Kem", "1/5 Vet", "0/5 Khong"],
            "required": true,
            "order": 6
        },
        {
            "item": "Neer Impingement Test",
            "item_vi": "Test Neer",
            "type": "radio",
            "options": ["Positive", "Negative"],
            "options_vi": ["Duong tinh", "Am tinh"],
            "required": true,
            "order": 7
        },
        {
            "item": "Hawkins-Kennedy Test",
            "item_vi": "Test Hawkins-Kennedy",
            "type": "radio",
            "options": ["Positive", "Negative"],
            "options_vi": ["Duong tinh", "Am tinh"],
            "required": true,
            "order": 8
        },
        {
            "item": "Empty Can Test (Supraspinatus)",
            "item_vi": "Test lon rong (co tren gai)",
            "type": "radio",
            "options": ["Positive", "Negative"],
            "options_vi": ["Duong tinh", "Am tinh"],
            "required": true,
            "order": 9
        },
        {
            "item": "Apprehension Test",
            "item_vi": "Test lo lang trat khop",
            "type": "radio",
            "options": ["Positive", "Negative"],
            "options_vi": ["Duong tinh", "Am tinh"],
            "required": true,
            "order": 10
        },
        {
            "item": "Painful Arc",
            "item_vi": "Cung dau",
            "type": "select",
            "options": ["None", "60-120 degrees (subacromial)", "120-180 degrees (AC joint)", "Full range painful"],
            "options_vi": ["Khong", "60-120 do (duoi mom cung vai)", "120-180 do (khop cung don)", "Dau toan bo tam van dong"],
            "required": true,
            "order": 11
        },
        {
            "item": "Additional Notes",
            "item_vi": "Ghi chu them",
            "type": "text",
            "required": false,
            "order": 12
        }
    ]'::jsonb
);

-- 3. Knee Osteoarthritis Assessment (10 items)
INSERT INTO assessment_templates (name, name_vi, condition, category, description, description_vi, checklist_items)
VALUES (
    'Knee Osteoarthritis Assessment',
    'Danh gia Thoai hoa khop goi',
    'knee_oa',
    'musculoskeletal',
    'Assessment for knee osteoarthritis covering gait, alignment, ROM, strength, and functional tests.',
    'Danh gia thoai hoa khop goi bao gom dang di, truc chi, tam van dong, suc co va test chuc nang.',
    '[
        {
            "item": "Gait Assessment",
            "item_vi": "Danh gia dang di",
            "type": "select",
            "options": ["Normal", "Antalgic", "Trendelenburg", "Vaulting", "Circumduction"],
            "options_vi": ["Binh thuong", "Di khap khieng", "Trendelenburg", "Nhan nguoi", "Di vong"],
            "required": true,
            "order": 1
        },
        {
            "item": "Knee Alignment",
            "item_vi": "Truc khop goi",
            "type": "select",
            "options": ["Normal", "Valgus (knock-knee)", "Varus (bow-leg)", "Recurvatum"],
            "options_vi": ["Binh thuong", "Valgus (chan chu X)", "Varus (chan chu O)", "Qua duoi goi"],
            "required": true,
            "order": 2
        },
        {
            "item": "Knee Flexion ROM",
            "item_vi": "ROM gap goi",
            "type": "number",
            "unit": "degrees",
            "range": [0, 150],
            "required": true,
            "order": 3
        },
        {
            "item": "Knee Extension ROM",
            "item_vi": "ROM duoi goi",
            "type": "number",
            "unit": "degrees",
            "range": [-10, 10],
            "required": true,
            "order": 4
        },
        {
            "item": "Quadriceps Strength",
            "item_vi": "Suc co tu dau dui",
            "type": "select",
            "options": ["5/5 Normal", "4/5 Good", "3/5 Fair", "2/5 Poor", "1/5 Trace"],
            "options_vi": ["5/5 Binh thuong", "4/5 Tot", "3/5 Trung binh", "2/5 Kem", "1/5 Vet"],
            "required": true,
            "order": 5
        },
        {
            "item": "Hamstring Strength",
            "item_vi": "Suc co gap goi",
            "type": "select",
            "options": ["5/5 Normal", "4/5 Good", "3/5 Fair", "2/5 Poor", "1/5 Trace"],
            "options_vi": ["5/5 Binh thuong", "4/5 Tot", "3/5 Trung binh", "2/5 Kem", "1/5 Vet"],
            "required": true,
            "order": 6
        },
        {
            "item": "Joint Effusion",
            "item_vi": "Tran dich khop",
            "type": "select",
            "options": ["None", "Mild", "Moderate", "Severe"],
            "options_vi": ["Khong", "Nhe", "Trung binh", "Nang"],
            "required": true,
            "order": 7
        },
        {
            "item": "Crepitus",
            "item_vi": "Tieng ket",
            "type": "radio",
            "options": ["Present", "Absent"],
            "options_vi": ["Co", "Khong"],
            "required": true,
            "order": 8
        },
        {
            "item": "Timed Up and Go (TUG)",
            "item_vi": "Test dung di ve (TUG)",
            "type": "number",
            "unit": "seconds",
            "range": [0, 120],
            "required": true,
            "order": 9
        },
        {
            "item": "Additional Notes",
            "item_vi": "Ghi chu them",
            "type": "text",
            "required": false,
            "order": 10
        }
    ]'::jsonb
);

-- 4. Post-Stroke Assessment (12 items)
INSERT INTO assessment_templates (name, name_vi, condition, category, description, description_vi, checklist_items)
VALUES (
    'Post-Stroke Rehabilitation Assessment',
    'Danh gia Phuc hoi sau dot quy',
    'post_stroke',
    'neurological',
    'Neurological assessment for post-stroke patients including tone, coordination, balance, and ADL evaluation.',
    'Danh gia than kinh cho benh nhan sau dot quy bao gom truong luc co, phoi hop van dong, thang bang va hoat dong sinh hoat hang ngay.',
    '[
        {
            "item": "Modified Ashworth Scale (Upper Extremity)",
            "item_vi": "Thang Ashworth cai tien (chi tren)",
            "type": "select",
            "options": ["0 - No increase in tone", "1 - Slight increase", "1+ - Slight increase with catch", "2 - More marked increase", "3 - Considerable increase", "4 - Rigid"],
            "options_vi": ["0 - Khong tang truong luc", "1 - Tang nhe", "1+ - Tang nhe co diem ket", "2 - Tang ro ret", "3 - Tang dang ke", "4 - Cung"],
            "required": true,
            "order": 1
        },
        {
            "item": "Modified Ashworth Scale (Lower Extremity)",
            "item_vi": "Thang Ashworth cai tien (chi duoi)",
            "type": "select",
            "options": ["0 - No increase in tone", "1 - Slight increase", "1+ - Slight increase with catch", "2 - More marked increase", "3 - Considerable increase", "4 - Rigid"],
            "options_vi": ["0 - Khong tang truong luc", "1 - Tang nhe", "1+ - Tang nhe co diem ket", "2 - Tang ro ret", "3 - Tang dang ke", "4 - Cung"],
            "required": true,
            "order": 2
        },
        {
            "item": "Finger-to-Nose Test",
            "item_vi": "Test ngon tay cham mui",
            "type": "select",
            "options": ["Accurate", "Mild dysmetria", "Moderate dysmetria", "Severe dysmetria", "Unable to perform"],
            "options_vi": ["Chinh xac", "Roi loan nhe", "Roi loan trung binh", "Roi loan nang", "Khong thuc hien duoc"],
            "required": true,
            "order": 3
        },
        {
            "item": "Heel-to-Shin Test",
            "item_vi": "Test got chan tren ong chan",
            "type": "select",
            "options": ["Accurate", "Mild dysmetria", "Moderate dysmetria", "Severe dysmetria", "Unable to perform"],
            "options_vi": ["Chinh xac", "Roi loan nhe", "Roi loan trung binh", "Roi loan nang", "Khong thuc hien duoc"],
            "required": true,
            "order": 4
        },
        {
            "item": "Berg Balance Scale Score",
            "item_vi": "Diem thang bang Berg",
            "type": "number",
            "unit": "score",
            "range": [0, 56],
            "required": true,
            "order": 5
        },
        {
            "item": "Sitting Balance",
            "item_vi": "Thang bang ngoi",
            "type": "select",
            "options": ["Independent", "Supervised", "Minimal assist", "Moderate assist", "Unable"],
            "options_vi": ["Doc lap", "Giam sat", "Ho tro toi thieu", "Ho tro trung binh", "Khong the"],
            "required": true,
            "order": 6
        },
        {
            "item": "Standing Balance",
            "item_vi": "Thang bang dung",
            "type": "select",
            "options": ["Independent", "Supervised", "Minimal assist", "Moderate assist", "Unable"],
            "options_vi": ["Doc lap", "Giam sat", "Ho tro toi thieu", "Ho tro trung binh", "Khong the"],
            "required": true,
            "order": 7
        },
        {
            "item": "Gait Pattern",
            "item_vi": "Kieu dang di",
            "type": "select",
            "options": ["Independent", "With assistive device", "With supervision", "With minimal assist", "Non-ambulatory"],
            "options_vi": ["Doc lap", "Dung dung cu ho tro", "Co giam sat", "Ho tro toi thieu", "Khong di duoc"],
            "required": true,
            "order": 8
        },
        {
            "item": "Barthel Index Score",
            "item_vi": "Diem Barthel",
            "type": "number",
            "unit": "score",
            "range": [0, 100],
            "required": true,
            "order": 9
        },
        {
            "item": "Affected Side Upper Extremity Function",
            "item_vi": "Chuc nang chi tren ben liet",
            "type": "select",
            "options": ["Functional grasp", "Gross grasp only", "Minimal movement", "No active movement"],
            "options_vi": ["Nam chuc nang", "Chi nam tho", "Van dong toi thieu", "Khong van dong"],
            "required": true,
            "order": 10
        },
        {
            "item": "Speech and Swallowing",
            "item_vi": "Ngon ngu va nuot",
            "type": "checkbox",
            "options": ["Normal speech", "Dysarthria", "Aphasia", "Normal swallowing", "Dysphagia"],
            "options_vi": ["Noi binh thuong", "Kho phat am", "Mat ngon ngu", "Nuot binh thuong", "Kho nuot"],
            "required": true,
            "order": 11
        },
        {
            "item": "Additional Notes",
            "item_vi": "Ghi chu them",
            "type": "text",
            "required": false,
            "order": 12
        }
    ]'::jsonb
);

-- 5. Pediatric Development Assessment (15 items)
INSERT INTO assessment_templates (name, name_vi, condition, category, description, description_vi, checklist_items)
VALUES (
    'Pediatric Developmental Assessment',
    'Danh gia Phat trien tre em',
    'pediatric_development',
    'pediatric',
    'Developmental milestone assessment for pediatric patients covering gross motor, fine motor, and cognitive domains.',
    'Danh gia cac moc phat trien cho benh nhi bao gom van dong tho, van dong tinh va nhan thuc.',
    '[
        {
            "item": "Head Control",
            "item_vi": "Kiem soat dau",
            "type": "select",
            "options": ["Age-appropriate", "Mildly delayed", "Moderately delayed", "Severely delayed", "Not achieved"],
            "options_vi": ["Phu hop lua tuoi", "Cham nhe", "Cham trung binh", "Cham nang", "Chua dat"],
            "required": true,
            "order": 1
        },
        {
            "item": "Rolling",
            "item_vi": "Lat nguoi",
            "type": "select",
            "options": ["Both directions", "One direction only", "With assistance", "Not achieved"],
            "options_vi": ["Ca hai huong", "Mot huong", "Can ho tro", "Chua dat"],
            "required": true,
            "order": 2
        },
        {
            "item": "Sitting",
            "item_vi": "Ngoi",
            "type": "select",
            "options": ["Independent", "With hand support", "Propped sitting", "Unable"],
            "options_vi": ["Doc lap", "Chong tay", "Ngoi co do", "Khong the"],
            "required": true,
            "order": 3
        },
        {
            "item": "Crawling",
            "item_vi": "Bo",
            "type": "select",
            "options": ["Reciprocal crawling", "Commando crawling", "Bottom shuffling", "Not achieved"],
            "options_vi": ["Bo xen ke", "Bo truon", "Truot mong", "Chua dat"],
            "required": true,
            "order": 4
        },
        {
            "item": "Pull to Stand",
            "item_vi": "Keo dung",
            "type": "select",
            "options": ["Independent", "With support", "With assistance", "Not achieved"],
            "options_vi": ["Doc lap", "Co cho bam", "Can ho tro", "Chua dat"],
            "required": true,
            "order": 5
        },
        {
            "item": "Walking",
            "item_vi": "Di",
            "type": "select",
            "options": ["Independent", "Cruising (furniture)", "With hand-held assist", "Not achieved"],
            "options_vi": ["Doc lap", "Vinh do vat", "Dat tay di", "Chua dat"],
            "required": true,
            "order": 6
        },
        {
            "item": "Running and Jumping",
            "item_vi": "Chay va nhay",
            "type": "select",
            "options": ["Age-appropriate", "Mildly delayed", "Moderately delayed", "Not achieved"],
            "options_vi": ["Phu hop lua tuoi", "Cham nhe", "Cham trung binh", "Chua dat"],
            "required": true,
            "order": 7
        },
        {
            "item": "Stair Navigation",
            "item_vi": "Leo cau thang",
            "type": "select",
            "options": ["Alternating feet", "Two feet per step", "With railing", "Crawling", "Not achieved"],
            "options_vi": ["Xen ke chan", "Hai chan moi bac", "Bam tay vin", "Bo", "Chua dat"],
            "required": true,
            "order": 8
        },
        {
            "item": "Grasp Pattern",
            "item_vi": "Kieu nam",
            "type": "select",
            "options": ["Pincer grasp", "Palmar grasp", "Raking grasp", "Reflexive only"],
            "options_vi": ["Nam kep", "Nam long ban tay", "Nam quet", "Chi phan xa"],
            "required": true,
            "order": 9
        },
        {
            "item": "Fine Motor - Drawing/Writing",
            "item_vi": "Van dong tinh - Ve/Viet",
            "type": "select",
            "options": ["Age-appropriate", "Mildly delayed", "Moderately delayed", "Severely delayed"],
            "options_vi": ["Phu hop lua tuoi", "Cham nhe", "Cham trung binh", "Cham nang"],
            "required": true,
            "order": 10
        },
        {
            "item": "Fine Motor - Object Manipulation",
            "item_vi": "Van dong tinh - Thao tac do vat",
            "type": "select",
            "options": ["Age-appropriate", "Mildly delayed", "Moderately delayed", "Severely delayed"],
            "options_vi": ["Phu hop lua tuoi", "Cham nhe", "Cham trung binh", "Cham nang"],
            "required": true,
            "order": 11
        },
        {
            "item": "Cognitive - Follows Commands",
            "item_vi": "Nhan thuc - Lam theo lenh",
            "type": "select",
            "options": ["Multi-step commands", "Simple commands", "Inconsistent", "No response"],
            "options_vi": ["Lenh nhieu buoc", "Lenh don gian", "Khong nhat quan", "Khong dap ung"],
            "required": true,
            "order": 12
        },
        {
            "item": "Cognitive - Attention Span",
            "item_vi": "Nhan thuc - Kha nang tap trung",
            "type": "select",
            "options": ["Age-appropriate", "Short attention span", "Very short attention span", "Unable to focus"],
            "options_vi": ["Phu hop lua tuoi", "Tap trung ngan", "Tap trung rat ngan", "Khong the tap trung"],
            "required": true,
            "order": 13
        },
        {
            "item": "Social Interaction",
            "item_vi": "Tuong tac xa hoi",
            "type": "select",
            "options": ["Age-appropriate", "Mildly delayed", "Moderately delayed", "Severely delayed"],
            "options_vi": ["Phu hop lua tuoi", "Cham nhe", "Cham trung binh", "Cham nang"],
            "required": true,
            "order": 14
        },
        {
            "item": "Additional Notes",
            "item_vi": "Ghi chu them",
            "type": "text",
            "required": false,
            "order": 15
        }
    ]'::jsonb
);

COMMIT;
