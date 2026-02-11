-- Migration: 014_seed_clinical_protocols.sql
-- Description: Seed 5 clinical protocol templates for common Vietnamese PT conditions
-- Created: 2026-02-11
-- Depends on: 008_clinical_protocols_tables.sql

-- =============================================================================
-- 1. Lower Back Pain Protocol
-- =============================================================================

INSERT INTO clinical_protocols (
    protocol_name, protocol_name_vi,
    description, description_vi,
    goals, exercises,
    frequency_per_week, duration_weeks, session_duration_minutes,
    progression_criteria,
    category, applicable_diagnoses, body_regions
)
VALUES (
    'Lower Back Pain Rehabilitation',
    'Phục hồi chức năng đau thắt lưng',
    'Evidence-based protocol for non-specific lower back pain management including McKenzie principles, core stabilization, and functional restoration',
    'Phác đồ dựa trên bằng chứng để quản lý đau thắt lưng không đặc hiệu bao gồm nguyên tắc McKenzie, ổn định cơ lõi và phục hồi chức năng',
    '[
        {"type": "short_term", "description": "Reduce pain level from baseline by 50% within 4 weeks", "description_vi": "Giảm mức đau từ mức ban đầu 50% trong 4 tuần", "measurable_criteria": "NPRS decrease >= 3 points", "target_timeframe_weeks": 4},
        {"type": "short_term", "description": "Restore lumbar ROM to functional range", "description_vi": "Phục hồi tầm vận động thắt lưng đến mức chức năng", "measurable_criteria": "Flexion >= 60 degrees, Extension >= 20 degrees", "target_timeframe_weeks": 4},
        {"type": "long_term", "description": "Return to full work duties without pain", "description_vi": "Trở lại làm việc đầy đủ không đau", "measurable_criteria": "ODI score < 20%", "target_timeframe_weeks": 8},
        {"type": "long_term", "description": "Independent home exercise program", "description_vi": "Tự tập chương trình bài tập tại nhà", "measurable_criteria": "Patient demonstrates all exercises correctly", "target_timeframe_weeks": 8}
    ]'::JSONB,
    '[
        {"name": "Pelvic Tilts", "name_vi": "Nghiêng xương chậu", "description": "Gentle pelvic rocking to activate deep stabilizers", "description_vi": "Lắc xương chậu nhẹ nhàng để kích hoạt cơ ổn định sâu", "sets": 3, "reps": 10, "duration_seconds": null, "frequency_per_day": 2, "phase": "initial", "precautions": ["Stop if pain increases"]},
        {"name": "Cat-Cow Stretch", "name_vi": "Giãn cơ mèo-bò", "description": "Alternating spinal flexion and extension on hands and knees", "description_vi": "Xen kẽ gập và duỗi cột sống ở tư thế quỳ bốn chân", "sets": 2, "reps": 10, "duration_seconds": null, "frequency_per_day": 2, "phase": "initial", "precautions": ["Avoid end-range if painful"]},
        {"name": "Bird-Dog", "name_vi": "Chó-chim", "description": "Opposite arm and leg extension for core stability", "description_vi": "Duỗi tay và chân đối diện để ổn định cơ lõi", "sets": 3, "reps": 8, "duration_seconds": null, "frequency_per_day": 1, "phase": "intermediate", "precautions": ["Maintain neutral spine"]},
        {"name": "Dead Bug", "name_vi": "Bọ chết", "description": "Supine core stabilization with arm and leg movement", "description_vi": "Ổn định cơ lõi nằm ngửa với chuyển động tay và chân", "sets": 3, "reps": 8, "duration_seconds": null, "frequency_per_day": 1, "phase": "intermediate", "precautions": ["Keep low back flat on floor"]},
        {"name": "Plank", "name_vi": "Plank", "description": "Isometric core strengthening in prone position", "description_vi": "Tăng cường cơ lõi đẳng trường ở tư thế nằm sấp", "sets": 3, "reps": 1, "duration_seconds": 30, "frequency_per_day": 1, "phase": "advanced", "precautions": ["Stop if low back sags"]}
    ]'::JSONB,
    3, 8, 45,
    '{
        "phase_transitions": [
            {"from_phase": "initial", "to_phase": "intermediate", "criteria": "Pain < 4/10, tolerates basic exercises without flare-up", "criteria_vi": "Đau < 4/10, chịu được bài tập cơ bản không bùng phát", "typical_week": 3},
            {"from_phase": "intermediate", "to_phase": "advanced", "criteria": "Pain < 3/10, core stability adequate for dynamic exercises", "criteria_vi": "Đau < 3/10, ổn định cơ lõi đủ cho bài tập động", "typical_week": 5}
        ],
        "discharge_criteria": "ODI < 20%, independent HEP, return to full function",
        "discharge_criteria_vi": "ODI < 20%, tự tập HEP, trở lại chức năng đầy đủ"
    }'::JSONB,
    'musculoskeletal',
    ARRAY['M54.5', 'M54.4', 'M54.9'],
    ARRAY['lumbar_spine']
);

-- =============================================================================
-- 2. Shoulder Pain Protocol
-- =============================================================================

INSERT INTO clinical_protocols (
    protocol_name, protocol_name_vi,
    description, description_vi,
    goals, exercises,
    frequency_per_week, duration_weeks, session_duration_minutes,
    progression_criteria,
    category, applicable_diagnoses, body_regions
)
VALUES (
    'Shoulder Pain Rehabilitation',
    'Phục hồi chức năng đau vai',
    'Comprehensive shoulder rehabilitation protocol for impingement, rotator cuff pathology, and adhesive capsulitis with progressive loading',
    'Phác đồ phục hồi vai toàn diện cho hội chứng chèn ép, bệnh lý chóp xoay và viêm dính bao khớp với tải trọng tăng dần',
    '[
        {"type": "short_term", "description": "Reduce shoulder pain to < 3/10 at rest", "description_vi": "Giảm đau vai xuống < 3/10 khi nghỉ", "measurable_criteria": "NPRS at rest < 3", "target_timeframe_weeks": 4},
        {"type": "short_term", "description": "Improve shoulder flexion to 150 degrees", "description_vi": "Cải thiện gập vai lên 150 độ", "measurable_criteria": "Active shoulder flexion >= 150 degrees", "target_timeframe_weeks": 6},
        {"type": "long_term", "description": "Full return to overhead activities", "description_vi": "Trở lại hoàn toàn các hoạt động trên đầu", "measurable_criteria": "DASH score < 15", "target_timeframe_weeks": 12},
        {"type": "long_term", "description": "Rotator cuff strength 5/5 bilaterally", "description_vi": "Sức mạnh chóp xoay 5/5 hai bên", "measurable_criteria": "MMT 5/5 all rotator cuff muscles", "target_timeframe_weeks": 12}
    ]'::JSONB,
    '[
        {"name": "Pendulum Exercise", "name_vi": "Bài tập con lắc", "description": "Gentle pendulum swings to promote joint lubrication", "description_vi": "Lắc nhẹ kiểu con lắc để tăng bôi trơn khớp", "sets": 1, "reps": 20, "duration_seconds": null, "frequency_per_day": 3, "phase": "initial", "precautions": ["Keep body relaxed", "No active muscle contraction"]},
        {"name": "Isometric External Rotation", "name_vi": "Xoay ngoài đẳng trường", "description": "Static external rotation against wall or doorframe", "description_vi": "Xoay ngoài tĩnh chống tường hoặc khung cửa", "sets": 3, "reps": 10, "duration_seconds": 5, "frequency_per_day": 2, "phase": "initial", "precautions": ["Pain-free range only"]},
        {"name": "Scapular Retraction", "name_vi": "Rút xương bả vai", "description": "Squeeze shoulder blades together", "description_vi": "Ép hai bả vai lại với nhau", "sets": 3, "reps": 15, "duration_seconds": 5, "frequency_per_day": 2, "phase": "initial", "precautions": []},
        {"name": "Resistance Band External Rotation", "name_vi": "Xoay ngoài với dây kháng lực", "description": "External rotation with elastic resistance at side", "description_vi": "Xoay ngoài với dây đàn hồi ở bên hông", "sets": 3, "reps": 12, "duration_seconds": null, "frequency_per_day": 1, "phase": "intermediate", "precautions": ["Elbow stays at side"]},
        {"name": "Wall Push-Up Plus", "name_vi": "Chống đẩy tường Plus", "description": "Wall push-up with scapular protraction at end range", "description_vi": "Chống đẩy tường với duỗi xương bả vai ở tầm cuối", "sets": 3, "reps": 12, "duration_seconds": null, "frequency_per_day": 1, "phase": "intermediate", "precautions": ["No shoulder hiking"]},
        {"name": "Overhead Press", "name_vi": "Đẩy trên đầu", "description": "Controlled overhead pressing with light weight", "description_vi": "Đẩy trên đầu có kiểm soát với tạ nhẹ", "sets": 3, "reps": 10, "duration_seconds": null, "frequency_per_day": 1, "phase": "advanced", "precautions": ["Full pain-free ROM required first"]}
    ]'::JSONB,
    3, 12, 45,
    '{
        "phase_transitions": [
            {"from_phase": "initial", "to_phase": "intermediate", "criteria": "Pain < 4/10 with AROM, active flexion > 120 degrees", "criteria_vi": "Đau < 4/10 với AROM, gập chủ động > 120 độ", "typical_week": 4},
            {"from_phase": "intermediate", "to_phase": "advanced", "criteria": "Full AROM, strength >= 4/5, pain < 2/10", "criteria_vi": "AROM đầy đủ, sức mạnh >= 4/5, đau < 2/10", "typical_week": 8}
        ],
        "discharge_criteria": "DASH < 15, full AROM, strength 5/5, return to activities",
        "discharge_criteria_vi": "DASH < 15, AROM đầy đủ, sức mạnh 5/5, trở lại hoạt động"
    }'::JSONB,
    'musculoskeletal',
    ARRAY['M75.0', 'M75.1', 'M75.4'],
    ARRAY['shoulder']
);

-- =============================================================================
-- 3. Knee Osteoarthritis Protocol
-- =============================================================================

INSERT INTO clinical_protocols (
    protocol_name, protocol_name_vi,
    description, description_vi,
    goals, exercises,
    frequency_per_week, duration_weeks, session_duration_minutes,
    progression_criteria,
    category, applicable_diagnoses, body_regions
)
VALUES (
    'Knee Osteoarthritis Management',
    'Quản lý thoái hóa khớp gối',
    'Progressive exercise program for knee osteoarthritis following OARSI guidelines with focus on strengthening, flexibility, and functional mobility',
    'Chương trình tập luyện tiến triển cho thoái hóa khớp gối theo hướng dẫn OARSI tập trung vào tăng cường sức mạnh, linh hoạt và vận động chức năng',
    '[
        {"type": "short_term", "description": "Reduce knee pain during walking to < 3/10", "description_vi": "Giảm đau gối khi đi bộ xuống < 3/10", "measurable_criteria": "NPRS during ambulation < 3", "target_timeframe_weeks": 4},
        {"type": "short_term", "description": "Improve knee flexion ROM to 120 degrees", "description_vi": "Cải thiện tầm vận động gập gối lên 120 độ", "measurable_criteria": "Active knee flexion >= 120 degrees", "target_timeframe_weeks": 4},
        {"type": "long_term", "description": "Walk 30 minutes continuously without significant pain", "description_vi": "Đi bộ liên tục 30 phút không đau đáng kể", "measurable_criteria": "6MWT improved >= 50m, pain < 3/10", "target_timeframe_weeks": 8},
        {"type": "long_term", "description": "Independent stair negotiation", "description_vi": "Tự lên xuống cầu thang", "measurable_criteria": "Stair ascent/descent without rail, reciprocal pattern", "target_timeframe_weeks": 8}
    ]'::JSONB,
    '[
        {"name": "Quad Sets", "name_vi": "Co cơ tứ đầu đẳng trường", "description": "Isometric quadriceps contraction with knee straight", "description_vi": "Co cơ tứ đầu đẳng trường với gối thẳng", "sets": 3, "reps": 10, "duration_seconds": 10, "frequency_per_day": 3, "phase": "initial", "precautions": ["Pain-free contraction only"]},
        {"name": "Straight Leg Raise", "name_vi": "Nâng chân thẳng", "description": "Supine hip flexion with knee locked in extension", "description_vi": "Gập hông nằm ngửa với gối khóa duỗi thẳng", "sets": 3, "reps": 10, "duration_seconds": null, "frequency_per_day": 2, "phase": "initial", "precautions": ["Maintain quad lock"]},
        {"name": "Heel Slides", "name_vi": "Trượt gót chân", "description": "Supine knee flexion by sliding heel toward buttock", "description_vi": "Gập gối nằm ngửa bằng cách trượt gót chân về phía mông", "sets": 3, "reps": 15, "duration_seconds": null, "frequency_per_day": 2, "phase": "initial", "precautions": ["Within comfortable range"]},
        {"name": "Mini Squats", "name_vi": "Squat nhỏ", "description": "Partial squats to 45 degrees with chair support", "description_vi": "Squat một phần đến 45 độ với hỗ trợ ghế", "sets": 3, "reps": 10, "duration_seconds": null, "frequency_per_day": 1, "phase": "intermediate", "precautions": ["Knees behind toes", "Stop if sharp pain"]},
        {"name": "Step-Ups", "name_vi": "Bước lên bậc", "description": "Forward step-up onto low platform", "description_vi": "Bước lên phía trước lên bục thấp", "sets": 3, "reps": 10, "duration_seconds": null, "frequency_per_day": 1, "phase": "intermediate", "precautions": ["Use rail initially"]},
        {"name": "Stationary Cycling", "name_vi": "Đạp xe tại chỗ", "description": "Low resistance cycling for cardiovascular fitness and ROM", "description_vi": "Đạp xe kháng lực thấp cho thể lực tim mạch và tầm vận động", "sets": 1, "reps": 1, "duration_seconds": 900, "frequency_per_day": 1, "phase": "advanced", "precautions": ["Seat height adjusted properly"]}
    ]'::JSONB,
    3, 8, 45,
    '{
        "phase_transitions": [
            {"from_phase": "initial", "to_phase": "intermediate", "criteria": "Pain < 4/10, quad strength >= 3+/5, flexion > 100 degrees", "criteria_vi": "Đau < 4/10, sức cơ tứ đầu >= 3+/5, gập > 100 độ", "typical_week": 3},
            {"from_phase": "intermediate", "to_phase": "advanced", "criteria": "Pain < 3/10, can do 10 mini squats, walks 15 min", "criteria_vi": "Đau < 3/10, làm được 10 squat nhỏ, đi bộ 15 phút", "typical_week": 5}
        ],
        "discharge_criteria": "WOMAC improved >= 30%, walks 30 min, independent stairs, independent HEP",
        "discharge_criteria_vi": "WOMAC cải thiện >= 30%, đi bộ 30 phút, tự lên xuống cầu thang, tự tập HEP"
    }'::JSONB,
    'musculoskeletal',
    ARRAY['M17.0', 'M17.1', 'M17.9'],
    ARRAY['knee']
);

-- =============================================================================
-- 4. Post-Stroke Rehabilitation Protocol
-- =============================================================================

INSERT INTO clinical_protocols (
    protocol_name, protocol_name_vi,
    description, description_vi,
    goals, exercises,
    frequency_per_week, duration_weeks, session_duration_minutes,
    progression_criteria,
    category, applicable_diagnoses, body_regions
)
VALUES (
    'Post-Stroke Rehabilitation',
    'Phục hồi chức năng sau đột quỵ',
    'Comprehensive neurological rehabilitation protocol for post-stroke patients focusing on motor recovery, functional mobility, and ADL independence',
    'Phác đồ phục hồi thần kinh toàn diện cho bệnh nhân sau đột quỵ tập trung vào phục hồi vận động, vận động chức năng và độc lập trong sinh hoạt hàng ngày',
    '[
        {"type": "short_term", "description": "Achieve independent sitting balance", "description_vi": "Đạt được thăng bằng ngồi độc lập", "measurable_criteria": "Sitting balance 2+ minutes unsupported", "target_timeframe_weeks": 4},
        {"type": "short_term", "description": "Initiate active movement in affected extremities", "description_vi": "Bắt đầu vận động chủ động ở chi bị ảnh hưởng", "measurable_criteria": "Brunnstrom stage >= 3", "target_timeframe_weeks": 6},
        {"type": "long_term", "description": "Achieve supervised ambulation with assistive device", "description_vi": "Đạt được đi lại có giám sát với dụng cụ hỗ trợ", "measurable_criteria": "10m walk test completed, FIM mobility score >= 5", "target_timeframe_weeks": 12},
        {"type": "long_term", "description": "Independence in basic ADLs", "description_vi": "Độc lập trong sinh hoạt hàng ngày cơ bản", "measurable_criteria": "Barthel Index >= 60", "target_timeframe_weeks": 16}
    ]'::JSONB,
    '[
        {"name": "Bed Mobility Training", "name_vi": "Tập di chuyển trên giường", "description": "Rolling, bridging, and scooting in bed", "description_vi": "Lăn, nâng mông và di chuyển trên giường", "sets": 3, "reps": 5, "duration_seconds": null, "frequency_per_day": 3, "phase": "initial", "precautions": ["Monitor blood pressure", "Guard for safety"]},
        {"name": "Sitting Balance", "name_vi": "Tập thăng bằng ngồi", "description": "Supported to unsupported sitting with weight shifting", "description_vi": "Ngồi có hỗ trợ đến không hỗ trợ với chuyển trọng lượng", "sets": 3, "reps": 10, "duration_seconds": null, "frequency_per_day": 2, "phase": "initial", "precautions": ["Guard for falls", "Monitor fatigue"]},
        {"name": "Sit-to-Stand Transfer", "name_vi": "Tập đứng dậy từ ngồi", "description": "Progressive sit-to-stand with decreasing assistance", "description_vi": "Đứng dậy từ ngồi tiến triển với giảm dần hỗ trợ", "sets": 3, "reps": 5, "duration_seconds": null, "frequency_per_day": 2, "phase": "intermediate", "precautions": ["Weight bearing as tolerated", "Use affected side"]},
        {"name": "Standing Balance", "name_vi": "Tập thăng bằng đứng", "description": "Weight shifting and reaching activities in standing", "description_vi": "Chuyển trọng lượng và các hoạt động với tay ở tư thế đứng", "sets": 3, "reps": 10, "duration_seconds": null, "frequency_per_day": 2, "phase": "intermediate", "precautions": ["Use parallel bars initially"]},
        {"name": "Gait Training", "name_vi": "Tập đi", "description": "Progressive ambulation training with appropriate assistive device", "description_vi": "Tập đi tiến triển với dụng cụ hỗ trợ phù hợp", "sets": 1, "reps": 1, "duration_seconds": 600, "frequency_per_day": 2, "phase": "advanced", "precautions": ["Appropriate assistive device", "Standby assist minimum"]},
        {"name": "Task-Specific UE Training", "name_vi": "Tập chi trên theo nhiệm vụ", "description": "Functional upper extremity tasks (reaching, grasping, manipulation)", "description_vi": "Các nhiệm vụ chức năng chi trên (với, nắm, thao tác)", "sets": 3, "reps": 10, "duration_seconds": null, "frequency_per_day": 2, "phase": "intermediate", "precautions": ["Avoid compensatory patterns"]}
    ]'::JSONB,
    5, 16, 60,
    '{
        "phase_transitions": [
            {"from_phase": "initial", "to_phase": "intermediate", "criteria": "Independent sitting, Brunnstrom >= 3, medically stable", "criteria_vi": "Ngồi độc lập, Brunnstrom >= 3, ổn định y tế", "typical_week": 4},
            {"from_phase": "intermediate", "to_phase": "advanced", "criteria": "Supervised standing, beginning active movement, sit-to-stand with min assist", "criteria_vi": "Đứng có giám sát, bắt đầu vận động chủ động, đứng dậy với hỗ trợ tối thiểu", "typical_week": 8}
        ],
        "discharge_criteria": "Barthel >= 60, supervised ambulation, safe transfers, caregiver trained",
        "discharge_criteria_vi": "Barthel >= 60, đi lại có giám sát, di chuyển an toàn, người chăm sóc được huấn luyện"
    }'::JSONB,
    'neurological',
    ARRAY['I63.9', 'I61.9', 'I64'],
    ARRAY['full_body']
);

-- =============================================================================
-- 5. Pediatric Development Delay Protocol
-- =============================================================================

INSERT INTO clinical_protocols (
    protocol_name, protocol_name_vi,
    description, description_vi,
    goals, exercises,
    frequency_per_week, duration_weeks, session_duration_minutes,
    progression_criteria,
    category, applicable_diagnoses, body_regions
)
VALUES (
    'Pediatric Development Delay',
    'Chậm phát triển ở trẻ em',
    'Developmental physical therapy protocol for children with gross motor delays, focusing on age-appropriate milestone achievement through play-based therapy',
    'Phác đồ vật lý trị liệu phát triển cho trẻ chậm phát triển vận động thô, tập trung đạt mốc phát triển phù hợp lứa tuổi thông qua trị liệu dựa trên chơi',
    '[
        {"type": "short_term", "description": "Achieve next developmental motor milestone", "description_vi": "Đạt mốc phát triển vận động tiếp theo", "measurable_criteria": "PDMS-2 gross motor quotient improved >= 5 points", "target_timeframe_weeks": 6},
        {"type": "short_term", "description": "Improve postural control for current developmental level", "description_vi": "Cải thiện kiểm soát tư thế cho mức phát triển hiện tại", "measurable_criteria": "Maintains position independently for 30+ seconds", "target_timeframe_weeks": 4},
        {"type": "long_term", "description": "Close developmental gap by 50%", "description_vi": "Thu hẹp khoảng cách phát triển 50%", "measurable_criteria": "PDMS-2 age equivalent improved proportionally", "target_timeframe_weeks": 24},
        {"type": "long_term", "description": "Caregiver competency in home program", "description_vi": "Người chăm sóc thành thạo chương trình tại nhà", "measurable_criteria": "Caregiver demonstrates all activities independently", "target_timeframe_weeks": 8}
    ]'::JSONB,
    '[
        {"name": "Tummy Time Activities", "name_vi": "Hoạt động nằm sấp", "description": "Prone positioning with age-appropriate toys for head/trunk control", "description_vi": "Tư thế nằm sấp với đồ chơi phù hợp lứa tuổi để kiểm soát đầu/thân", "sets": 3, "reps": 1, "duration_seconds": 300, "frequency_per_day": 4, "phase": "initial", "precautions": ["Always supervised", "Stop if distressed"]},
        {"name": "Supported Sitting Play", "name_vi": "Chơi ngồi có hỗ trợ", "description": "Sitting with support progressing to independent with reaching activities", "description_vi": "Ngồi có hỗ trợ tiến triển đến độc lập với hoạt động với tay", "sets": 3, "reps": 1, "duration_seconds": 300, "frequency_per_day": 3, "phase": "initial", "precautions": ["Soft surface underneath", "Guard for falls"]},
        {"name": "Rolling Games", "name_vi": "Trò chơi lăn", "description": "Facilitated rolling using toys as motivation", "description_vi": "Lăn có hỗ trợ sử dụng đồ chơi làm động lực", "sets": 5, "reps": 3, "duration_seconds": null, "frequency_per_day": 2, "phase": "initial", "precautions": ["Both directions"]},
        {"name": "Pull-to-Stand Activities", "name_vi": "Hoạt động kéo đứng", "description": "Using furniture and toys to encourage pulling to stand", "description_vi": "Sử dụng đồ nội thất và đồ chơi khuyến khích kéo đứng", "sets": 5, "reps": 3, "duration_seconds": null, "frequency_per_day": 3, "phase": "intermediate", "precautions": ["Stable support surface", "Guard for falls"]},
        {"name": "Cruising Activities", "name_vi": "Hoạt động đi men", "description": "Walking sideways along furniture with toy motivation", "description_vi": "Đi ngang men theo đồ nội thất với động lực đồ chơi", "sets": 3, "reps": 1, "duration_seconds": 300, "frequency_per_day": 3, "phase": "intermediate", "precautions": ["Furniture at appropriate height"]},
        {"name": "Supported Walking", "name_vi": "Đi có hỗ trợ", "description": "Walking with hand-held support progressing to push toy", "description_vi": "Đi với hỗ trợ cầm tay tiến triển đến xe đẩy đồ chơi", "sets": 3, "reps": 1, "duration_seconds": 300, "frequency_per_day": 3, "phase": "advanced", "precautions": ["Safe environment", "Appropriate footwear"]}
    ]'::JSONB,
    2, 24, 45,
    '{
        "phase_transitions": [
            {"from_phase": "initial", "to_phase": "intermediate", "criteria": "Independent sitting, active rolling both directions, beginning transitions", "criteria_vi": "Ngồi độc lập, lăn chủ động cả hai hướng, bắt đầu chuyển đổi tư thế", "typical_week": 8},
            {"from_phase": "intermediate", "to_phase": "advanced", "criteria": "Pull-to-stand independently, cruising along furniture, standing balance improving", "criteria_vi": "Tự kéo đứng, đi men đồ nội thất, thăng bằng đứng cải thiện", "typical_week": 16}
        ],
        "discharge_criteria": "Age-appropriate motor milestones achieved or developmental gap closed significantly, caregiver independent with HEP",
        "discharge_criteria_vi": "Đạt mốc vận động phù hợp lứa tuổi hoặc khoảng cách phát triển thu hẹp đáng kể, người chăm sóc tự tập HEP"
    }'::JSONB,
    'pediatric',
    ARRAY['R62.0', 'R62.50', 'F82'],
    ARRAY['full_body']
);
