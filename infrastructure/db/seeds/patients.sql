-- =============================================================================
-- PhysioFlow - Patient Seed Data
-- =============================================================================
-- Sample patients for development and testing
-- Must have organization and clinic first
-- =============================================================================

-- First create a sample organization and clinic if they don't exist
INSERT INTO organizations (id, name, name_vi, settings)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'PhysioFlow Demo Organization',
    'Tổ chức Demo PhysioFlow',
    '{"theme": "default", "locale": "vi"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO clinics (id, organization_id, name, name_vi, address, address_vi, phone, email, timezone, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'PhysioFlow Main Clinic',
    'Phòng Khám Chính PhysioFlow',
    '123 Nguyen Hue Street, District 1, Ho Chi Minh City',
    '123 Đường Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
    '028-1234-5678',
    'clinic@physioflow.vn',
    'Asia/Ho_Chi_Minh',
    TRUE
) ON CONFLICT (id) DO NOTHING;

-- Insert sample patients
INSERT INTO patients (
    id, clinic_id, mrn, first_name, last_name, first_name_vi, last_name_vi,
    date_of_birth, gender, phone, email, address, address_vi,
    language_preference, emergency_contact, medical_alerts, notes, is_active,
    created_at, updated_at
) VALUES
-- Patient 1: Active treatment
(
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'MRN-2024-0001',
    'Minh',
    'Nguyen',
    'Minh',
    'Nguyễn',
    '1985-03-15',
    'male',
    '0901234567',
    'minh.nguyen@email.com',
    '123 Le Loi Street, District 1, Ho Chi Minh City',
    '123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh',
    'vi',
    '{"name": "Nguyen Van A", "phone": "0909876543", "relationship": "spouse"}',
    ARRAY['Penicillin allergy'],
    'Active patient with lower back pain',
    TRUE,
    NOW(),
    NOW()
),
-- Patient 2: Active treatment
(
    '00000000-0000-0000-0001-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'MRN-2024-0002',
    'Lan',
    'Tran',
    'Lan',
    'Trần',
    '1990-07-22',
    'female',
    '0912345678',
    'lan.tran@email.com',
    '456 Nguyen Hue Street, District 1, Ho Chi Minh City',
    '456 Đường Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
    'vi',
    '{"name": "Tran Van B", "phone": "0918765432", "relationship": "parent"}',
    ARRAY['Hypertension - on medication'],
    'Active patient with rotator cuff syndrome',
    TRUE,
    NOW(),
    NOW()
),
-- Patient 3: Active treatment (English preference)
(
    '00000000-0000-0000-0001-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'MRN-2024-0003',
    'John',
    'Smith',
    NULL,
    NULL,
    '1978-11-30',
    'male',
    '0923456789',
    'john.smith@email.com',
    '789 Hai Ba Trung Street, District 3, Ho Chi Minh City',
    '789 Đường Hai Bà Trưng, Quận 3, TP. Hồ Chí Minh',
    'en',
    '{"name": "Jane Smith", "phone": "0927654321", "relationship": "spouse"}',
    ARRAY['Latex allergy'],
    'English-speaking expat patient',
    TRUE,
    NOW(),
    NOW()
),
-- Patient 4: Inactive
(
    '00000000-0000-0000-0001-000000000004',
    '00000000-0000-0000-0000-000000000001',
    'MRN-2024-0004',
    'Hoa',
    'Le',
    'Hoa',
    'Lê',
    '1995-05-10',
    'female',
    '0934567890',
    'hoa.le@email.com',
    '321 Vo Van Tan Street, District 3, Ho Chi Minh City',
    '321 Đường Võ Văn Tần, Quận 3, TP. Hồ Chí Minh',
    'vi',
    '{"name": "Le Van C", "phone": "0936543210", "relationship": "sibling"}',
    ARRAY['Diabetes Type 2'],
    'Completed treatment, now inactive',
    FALSE,
    NOW() - INTERVAL '30 days',
    NOW()
),
-- Patient 5: Discharged
(
    '00000000-0000-0000-0001-000000000005',
    '00000000-0000-0000-0000-000000000001',
    'MRN-2024-0005',
    'Tung',
    'Pham',
    'Tùng',
    'Phạm',
    '1982-09-25',
    'male',
    '0945678901',
    'tung.pham@email.com',
    '654 Cach Mang Thang 8, District 10, Ho Chi Minh City',
    '654 Đường Cách Mạng Tháng 8, Quận 10, TP. Hồ Chí Minh',
    'vi',
    '{"name": "Pham Thi D", "phone": "0945432109", "relationship": "spouse"}',
    NULL,
    'Discharged after successful treatment',
    FALSE,
    NOW() - INTERVAL '60 days',
    NOW() - INTERVAL '7 days'
)
ON CONFLICT (id) DO NOTHING;

-- Insert sample insurance information
INSERT INTO insurance_info (
    id, patient_id, provider, provider_type, policy_number, coverage_percentage,
    valid_from, valid_to, is_primary, is_active, verification_status
) VALUES
(
    '00000000-0000-0000-0002-000000000001',
    '00000000-0000-0000-0001-000000000001',
    'Bao Viet Insurance',
    'private',
    'BV-2024-001234',
    80.00,
    NOW() - INTERVAL '1 year',
    NOW() + INTERVAL '1 year',
    TRUE,
    TRUE,
    'verified'
),
(
    '00000000-0000-0000-0002-000000000002',
    '00000000-0000-0000-0001-000000000002',
    'PVI Insurance',
    'private',
    'PVI-2024-005678',
    60.00,
    NOW() - INTERVAL '6 months',
    NOW() + INTERVAL '6 months',
    TRUE,
    TRUE,
    'verified'
),
(
    '00000000-0000-0000-0002-000000000003',
    '00000000-0000-0000-0001-000000000003',
    'International SOS',
    'corporate',
    'ISOS-2024-009012',
    100.00,
    NOW() - INTERVAL '3 months',
    NOW() + INTERVAL '9 months',
    TRUE,
    TRUE,
    'verified'
)
ON CONFLICT (id) DO NOTHING;

-- Insert sample diagnoses (ICD-10 codes)
INSERT INTO diagnoses (id, code, description, description_vi, category, is_active)
VALUES
('00000000-0000-0000-0003-000000000001', 'M54.5', 'Low back pain', 'Đau thắt lưng', 'Musculoskeletal', TRUE),
('00000000-0000-0000-0003-000000000002', 'M75.1', 'Rotator cuff syndrome', 'Hội chứng chóp xoay', 'Musculoskeletal', TRUE),
('00000000-0000-0000-0003-000000000003', 'S83.5', 'Sprain of knee', 'Bong gân đầu gối', 'Injury', TRUE),
('00000000-0000-0000-0003-000000000004', 'M79.3', 'Panniculitis', 'Viêm mô mỡ dưới da', 'Musculoskeletal', TRUE),
('00000000-0000-0000-0003-000000000005', 'M54.2', 'Cervicalgia', 'Đau cổ', 'Musculoskeletal', TRUE),
('00000000-0000-0000-0003-000000000006', 'M25.5', 'Pain in joint', 'Đau khớp', 'Musculoskeletal', TRUE),
('00000000-0000-0000-0003-000000000007', 'M62.8', 'Other specified disorders of muscle', 'Các rối loạn cơ cụ thể khác', 'Musculoskeletal', TRUE),
('00000000-0000-0000-0003-000000000008', 'G57.1', 'Meralgia paresthetica', 'Chứng dị cảm đùi', 'Neurological', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Output completion message
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Patient seed data inserted successfully';
    RAISE NOTICE 'Organizations: 1';
    RAISE NOTICE 'Clinics: 1';
    RAISE NOTICE 'Patients: 5';
    RAISE NOTICE 'Insurance records: 3';
    RAISE NOTICE 'Diagnoses: 8';
    RAISE NOTICE '==============================================';
END $$;
