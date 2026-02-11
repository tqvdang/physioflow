-- Migration: 013_seed_medical_terms.sql
-- Description: Seed Vietnamese medical terms for autocomplete and bilingual support
-- Created: 2026-02-11
-- Depends on: 010_medical_terms_tables.sql

-- =============================================================================
-- ANATOMY TERMS (14 terms)
-- =============================================================================

INSERT INTO vietnamese_medical_terms (term_en, term_vi, category, subcategory, definition_en, definition_vi)
VALUES
    ('Shoulder', 'Vai', 'anatomy', 'upper_extremity',
     'The joint connecting the arm to the torso', 'Khớp nối cánh tay với thân mình'),
    ('Knee', 'Đầu gối', 'anatomy', 'lower_extremity',
     'The joint between the thigh and lower leg', 'Khớp giữa đùi và cẳng chân'),
    ('Spine', 'Cột sống', 'anatomy', 'axial',
     'The vertebral column from cervical to sacral regions', 'Cột xương sống từ vùng cổ đến vùng cùng'),
    ('Hip', 'Hông', 'anatomy', 'lower_extremity',
     'The ball-and-socket joint connecting the leg to the pelvis', 'Khớp chỏm cầu nối chân với xương chậu'),
    ('Ankle', 'Mắt cá chân', 'anatomy', 'lower_extremity',
     'The joint connecting the foot and leg', 'Khớp nối bàn chân và cẳng chân'),
    ('Elbow', 'Khuỷu tay', 'anatomy', 'upper_extremity',
     'The hinge joint between the upper and lower arm', 'Khớp bản lề giữa cánh tay trên và cẳng tay'),
    ('Wrist', 'Cổ tay', 'anatomy', 'upper_extremity',
     'The joint connecting the hand to the forearm', 'Khớp nối bàn tay với cẳng tay'),
    ('Neck', 'Cổ', 'anatomy', 'axial',
     'The cervical region of the spine', 'Vùng cổ của cột sống'),
    ('Lower Back', 'Thắt lưng', 'anatomy', 'axial',
     'The lumbar region of the spine', 'Vùng thắt lưng của cột sống'),
    ('Pelvis', 'Xương chậu', 'anatomy', 'axial',
     'The bony structure at the base of the spine', 'Cấu trúc xương ở đáy cột sống'),
    ('Thorax', 'Lồng ngực', 'anatomy', 'axial',
     'The chest region including ribs and thoracic spine', 'Vùng ngực bao gồm xương sườn và cột sống ngực'),
    ('Muscle', 'Cơ', 'anatomy', 'general',
     'Soft tissue that produces force and motion', 'Mô mềm tạo ra lực và chuyển động'),
    ('Tendon', 'Gân', 'anatomy', 'general',
     'Connective tissue connecting muscle to bone', 'Mô liên kết nối cơ với xương'),
    ('Ligament', 'Dây chằng', 'anatomy', 'general',
     'Connective tissue connecting bone to bone', 'Mô liên kết nối xương với xương');

-- =============================================================================
-- SYMPTOM TERMS (12 terms)
-- =============================================================================

INSERT INTO vietnamese_medical_terms (term_en, term_vi, category, subcategory, definition_en, definition_vi)
VALUES
    ('Pain', 'Đau', 'symptom', 'general',
     'An unpleasant sensory and emotional experience', 'Trải nghiệm cảm giác và cảm xúc khó chịu'),
    ('Stiffness', 'Cứng khớp', 'symptom', 'musculoskeletal',
     'Reduced range of motion or difficulty moving', 'Giảm biên độ vận động hoặc khó khăn khi di chuyển'),
    ('Weakness', 'Yếu cơ', 'symptom', 'musculoskeletal',
     'Reduced muscle strength or force production', 'Giảm sức mạnh cơ hoặc khả năng tạo lực'),
    ('Swelling', 'Sưng', 'symptom', 'general',
     'Abnormal enlargement of a body part due to fluid accumulation', 'Phình to bất thường của bộ phận cơ thể do tích tụ dịch'),
    ('Numbness', 'Tê', 'symptom', 'neurological',
     'Loss of sensation or feeling in a body area', 'Mất cảm giác ở một vùng cơ thể'),
    ('Tingling', 'Ngứa ran', 'symptom', 'neurological',
     'Pins and needles sensation', 'Cảm giác kim châm'),
    ('Spasm', 'Co thắt', 'symptom', 'musculoskeletal',
     'Involuntary muscle contraction', 'Co cơ không tự chủ'),
    ('Fatigue', 'Mệt mỏi', 'symptom', 'general',
     'Extreme tiredness resulting from physical exertion', 'Mệt mỏi cực độ do gắng sức thể chất'),
    ('Instability', 'Mất ổn định', 'symptom', 'musculoskeletal',
     'Feeling of giving way or lack of joint support', 'Cảm giác mất vững hoặc thiếu hỗ trợ khớp'),
    ('Limited Range of Motion', 'Hạn chế tầm vận động', 'symptom', 'musculoskeletal',
     'Restricted movement at a joint', 'Hạn chế vận động tại khớp'),
    ('Radiating Pain', 'Đau lan', 'symptom', 'neurological',
     'Pain that spreads from one area to another', 'Đau lan từ một vùng sang vùng khác'),
    ('Crepitus', 'Tiếng lạo xạo', 'symptom', 'musculoskeletal',
     'Crackling or grinding sound/sensation in a joint', 'Tiếng kêu lạo xạo hoặc cảm giác nghiến trong khớp');

-- =============================================================================
-- CONDITION TERMS (14 terms)
-- =============================================================================

INSERT INTO vietnamese_medical_terms (term_en, term_vi, category, subcategory, icd10_code, definition_en, definition_vi)
VALUES
    ('Osteoarthritis', 'Thoái hóa khớp', 'condition', 'musculoskeletal', 'M19.90',
     'Degenerative joint disease with cartilage breakdown', 'Bệnh thoái hóa khớp với sự phá hủy sụn'),
    ('Stroke', 'Đột quỵ', 'condition', 'neurological', 'I63.9',
     'Cerebrovascular accident causing brain damage', 'Tai biến mạch máu não gây tổn thương não'),
    ('Back Pain', 'Đau lưng', 'condition', 'musculoskeletal', 'M54.5',
     'Pain in the lumbar region', 'Đau ở vùng thắt lưng'),
    ('Herniated Disc', 'Thoát vị đĩa đệm', 'condition', 'musculoskeletal', 'M51.1',
     'Intervertebral disc protrusion compressing nerves', 'Đĩa đệm cột sống nhô ra chèn ép dây thần kinh'),
    ('Frozen Shoulder', 'Đông cứng vai', 'condition', 'musculoskeletal', 'M75.0',
     'Adhesive capsulitis causing progressive shoulder stiffness', 'Viêm dính bao khớp gây cứng vai tiến triển'),
    ('Rotator Cuff Tear', 'Rách chóp xoay', 'condition', 'musculoskeletal', 'M75.1',
     'Tear in the rotator cuff tendons of the shoulder', 'Rách gân chóp xoay của vai'),
    ('ACL Injury', 'Chấn thương dây chằng chéo trước', 'condition', 'musculoskeletal', 'S83.5',
     'Anterior cruciate ligament sprain or tear', 'Bong gân hoặc đứt dây chằng chéo trước'),
    ('Carpal Tunnel Syndrome', 'Hội chứng ống cổ tay', 'condition', 'neurological', 'G56.0',
     'Compression of the median nerve in the wrist', 'Chèn ép dây thần kinh giữa ở cổ tay'),
    ('Sciatica', 'Đau thần kinh tọa', 'condition', 'neurological', 'M54.3',
     'Pain radiating along the sciatic nerve', 'Đau lan dọc theo dây thần kinh tọa'),
    ('Spinal Stenosis', 'Hẹp ống sống', 'condition', 'musculoskeletal', 'M48.0',
     'Narrowing of the spinal canal', 'Hẹp ống sống'),
    ('Scoliosis', 'Vẹo cột sống', 'condition', 'musculoskeletal', 'M41.9',
     'Lateral curvature of the spine', 'Cong vẹo cột sống sang bên'),
    ('Cerebral Palsy', 'Bại não', 'condition', 'neurological', 'G80.9',
     'Group of movement disorders from brain damage before/during birth', 'Nhóm rối loạn vận động do tổn thương não trước/trong khi sinh'),
    ('Fracture', 'Gãy xương', 'condition', 'musculoskeletal', 'T14.8',
     'A break in the continuity of a bone', 'Sự gián đoạn liên tục của xương'),
    ('Tendinitis', 'Viêm gân', 'condition', 'musculoskeletal', 'M77.9',
     'Inflammation or irritation of a tendon', 'Viêm hoặc kích thích gân');

-- =============================================================================
-- TREATMENT TERMS (12 terms)
-- =============================================================================

INSERT INTO vietnamese_medical_terms (term_en, term_vi, category, subcategory, definition_en, definition_vi)
VALUES
    ('Exercise', 'Bài tập', 'treatment', 'therapeutic_exercise',
     'Planned physical activity to improve function', 'Hoạt động thể chất có kế hoạch để cải thiện chức năng'),
    ('Massage', 'Mát-xa', 'treatment', 'manual_therapy',
     'Soft tissue manipulation for pain relief and relaxation', 'Thao tác mô mềm để giảm đau và thư giãn'),
    ('Heat Therapy', 'Nhiệt trị liệu', 'treatment', 'modality',
     'Application of heat to relieve pain and increase blood flow', 'Sử dụng nhiệt để giảm đau và tăng lưu thông máu'),
    ('Cold Therapy', 'Lạnh trị liệu', 'treatment', 'modality',
     'Application of cold to reduce inflammation and pain', 'Sử dụng lạnh để giảm viêm và đau'),
    ('Electrical Stimulation', 'Kích thích điện', 'treatment', 'modality',
     'Use of electrical current for pain relief or muscle activation', 'Sử dụng dòng điện để giảm đau hoặc kích thích cơ'),
    ('Ultrasound Therapy', 'Siêu âm trị liệu', 'treatment', 'modality',
     'Deep heating using sound waves for tissue healing', 'Làm nóng sâu bằng sóng âm để chữa lành mô'),
    ('Stretching', 'Kéo giãn', 'treatment', 'therapeutic_exercise',
     'Lengthening muscles and connective tissue to improve flexibility', 'Kéo dài cơ và mô liên kết để cải thiện độ linh hoạt'),
    ('Strengthening', 'Tăng cường sức mạnh', 'treatment', 'therapeutic_exercise',
     'Resistance exercises to improve muscle strength', 'Bài tập kháng lực để cải thiện sức mạnh cơ'),
    ('Balance Training', 'Tập thăng bằng', 'treatment', 'therapeutic_exercise',
     'Activities to improve stability and prevent falls', 'Hoạt động cải thiện sự ổn định và phòng ngừa té ngã'),
    ('Joint Mobilization', 'Vận động khớp', 'treatment', 'manual_therapy',
     'Skilled passive movement of a joint to restore motion', 'Vận động thụ động khéo léo của khớp để phục hồi vận động'),
    ('Traction', 'Kéo giãn cột sống', 'treatment', 'modality',
     'Pulling force applied to the spine to decompress structures', 'Lực kéo tác động lên cột sống để giảm áp lực'),
    ('Hydrotherapy', 'Thủy trị liệu', 'treatment', 'modality',
     'Therapeutic exercises performed in water', 'Bài tập trị liệu thực hiện trong nước');

-- =============================================================================
-- ADDITIONAL TERMS (4 terms - assessment/outcome measures)
-- =============================================================================

INSERT INTO vietnamese_medical_terms (term_en, term_vi, category, subcategory, definition_en, definition_vi)
VALUES
    ('Range of Motion', 'Tầm vận động', 'assessment', 'measurement',
     'The degree of movement available at a joint', 'Mức độ vận động có thể tại khớp'),
    ('Manual Muscle Test', 'Kiểm tra sức cơ bằng tay', 'assessment', 'measurement',
     'Clinical test grading muscle strength from 0 to 5', 'Kiểm tra lâm sàng đánh giá sức mạnh cơ từ 0 đến 5'),
    ('Gait Analysis', 'Phân tích dáng đi', 'assessment', 'functional',
     'Evaluation of walking pattern and abnormalities', 'Đánh giá kiểu đi và các bất thường'),
    ('Posture Assessment', 'Đánh giá tư thế', 'assessment', 'functional',
     'Evaluation of body alignment in static positions', 'Đánh giá sự thẳng hàng cơ thể ở tư thế tĩnh');
