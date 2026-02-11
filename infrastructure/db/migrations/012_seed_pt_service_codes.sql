-- Migration: 012_seed_pt_service_codes.sql
-- Description: Seed PT service codes with bilingual names and VND pricing
-- Created: 2026-02-11
-- Depends on: 007_billing_tables.sql

INSERT INTO pt_service_codes (code, service_name, service_name_vi, description, description_vi, unit_price, currency, duration_minutes, category, is_bhyt_covered, bhyt_reimbursement_rate)
VALUES
    (
        'PT001',
        'Therapeutic Exercise',
        'Tập luyện trị liệu',
        'Therapeutic exercises to improve strength, flexibility, and endurance including stretching, strengthening, and functional training',
        'Bài tập trị liệu nhằm cải thiện sức mạnh, độ linh hoạt và sức bền bao gồm kéo giãn, tăng cường sức mạnh và tập luyện chức năng',
        250000.00,
        'VND',
        30,
        'treatment',
        TRUE,
        80.00
    ),
    (
        'PT002',
        'Manual Therapy',
        'Liệu pháp thủ công',
        'Skilled hands-on techniques including joint mobilization, soft tissue mobilization, and manipulation',
        'Kỹ thuật trị liệu bằng tay bao gồm vận động khớp, vận động mô mềm và nắn chỉnh',
        300000.00,
        'VND',
        30,
        'treatment',
        TRUE,
        80.00
    ),
    (
        'PT003',
        'Modalities',
        'Vật lý trị liệu',
        'Physical agents and modalities including electrical stimulation, ultrasound, heat/cold therapy, and laser therapy',
        'Các phương pháp vật lý trị liệu bao gồm kích thích điện, siêu âm, nhiệt/lạnh trị liệu và laser trị liệu',
        200000.00,
        'VND',
        20,
        'treatment',
        TRUE,
        80.00
    ),
    (
        'PT004',
        'Gait Training',
        'Tập đi',
        'Gait training and balance activities to improve walking ability, safety, and independence',
        'Tập đi và các hoạt động thăng bằng nhằm cải thiện khả năng đi lại, an toàn và độc lập',
        250000.00,
        'VND',
        30,
        'treatment',
        TRUE,
        80.00
    ),
    (
        'PT105',
        'Initial Evaluation',
        'Đánh giá ban đầu',
        'Comprehensive initial physical therapy evaluation including history, examination, assessment, and plan of care',
        'Đánh giá vật lý trị liệu ban đầu toàn diện bao gồm tiền sử, khám, đánh giá và kế hoạch điều trị',
        500000.00,
        'VND',
        60,
        'evaluation',
        TRUE,
        80.00
    ),
    (
        'PT106',
        'Re-evaluation',
        'Đánh giá lại',
        'Re-evaluation of patient progress, update of treatment plan and goals based on clinical findings',
        'Đánh giá lại tiến triển của bệnh nhân, cập nhật kế hoạch điều trị và mục tiêu dựa trên kết quả lâm sàng',
        350000.00,
        'VND',
        45,
        'evaluation',
        TRUE,
        80.00
    ),
    (
        'PT201',
        'Group Therapy',
        'Liệu pháp nhóm',
        'Group therapeutic exercises and activities with 2-4 patients under direct supervision',
        'Bài tập và hoạt động trị liệu nhóm với 2-4 bệnh nhân dưới sự giám sát trực tiếp',
        150000.00,
        'VND',
        45,
        'treatment',
        TRUE,
        70.00
    ),
    (
        'PT301',
        'Home Visit',
        'Thăm khám tại nhà',
        'Physical therapy evaluation and treatment provided at patient home for those unable to travel to clinic',
        'Đánh giá và điều trị vật lý trị liệu tại nhà cho bệnh nhân không thể đến phòng khám',
        600000.00,
        'VND',
        60,
        'home_care',
        TRUE,
        70.00
    );

COMMENT ON TABLE pt_service_codes IS 'PT service codes with bilingual names and VND pricing. Seeded with standard Vietnamese PT services.';
