-- =============================================================================
-- PhysioFlow - Exercise Library Seed Data
-- =============================================================================
-- Sample exercises for the exercise library
-- Schema must match migrations/002_clinical_schema.sql
-- =============================================================================

-- Note: clinic_id = NULL means global exercise available to all clinics
-- body_regions uses the body_region enum type from migrations

-- =============================================================================
-- STRETCHING EXERCISES
-- =============================================================================

INSERT INTO exercises (
    id, clinic_id, name, name_vi, description, description_vi,
    instructions, instructions_vi, category, body_regions,
    image_urls, video_url, default_sets, default_reps, default_duration_seconds,
    difficulty_level, equipment_needed, precautions, precautions_vi, is_active
) VALUES

-- 1. Upper Trapezius Stretch
(
    'e1000000-0001-0001-0001-000000000001',
    NULL,
    'Upper Trapezius Stretch',
    'Kéo giãn cơ thang lưng trên',
    'A gentle stretch for the upper trapezius muscle to relieve neck and shoulder tension.',
    'Bài tập kéo giãn nhẹ nhàng cho cơ thang lưng trên để giảm căng thẳng cổ và vai.',
    '1. Sit or stand with good posture
2. Gently tilt your head to one side, bringing ear toward shoulder
3. Place your hand on top of your head for a gentle assist
4. Hold for 30 seconds
5. Repeat on other side',
    '1. Ngồi hoặc đứng với tư thế tốt
2. Nhẹ nhàng nghiêng đầu sang một bên, đưa tai về phía vai
3. Đặt tay lên đỉnh đầu để hỗ trợ nhẹ nhàng
4. Giữ 30 giây
5. Lặp lại bên còn lại',
    'stretching',
    ARRAY['head_neck', 'shoulder_left', 'shoulder_right']::body_region[],
    NULL, NULL,
    3, 1, 30,
    'beginner',
    NULL,
    'Avoid overstretching. Stop if you feel pain or dizziness.',
    'Tránh kéo giãn quá mức. Dừng lại nếu cảm thấy đau hoặc chóng mặt.',
    TRUE
),

-- 2. Levator Scapulae Stretch
(
    'e1000000-0001-0001-0001-000000000002',
    NULL,
    'Levator Scapulae Stretch',
    'Kéo giãn cơ nâng vai',
    'Targets the muscle connecting neck to shoulder blade.',
    'Tập trung vào cơ nối cổ và xương bả vai.',
    '1. Sit with good posture
2. Turn your head 45 degrees to one side
3. Look down toward your armpit
4. Place hand on back of head for gentle pressure
5. Hold for 30 seconds each side',
    '1. Ngồi với tư thế tốt
2. Xoay đầu 45 độ sang một bên
3. Nhìn xuống phía nách
4. Đặt tay lên sau đầu để tạo áp lực nhẹ
5. Giữ 30 giây mỗi bên',
    'stretching',
    ARRAY['head_neck', 'thoracic_spine']::body_region[],
    NULL, NULL,
    3, 1, 30,
    'beginner',
    NULL,
    'Do not force the stretch. Keep shoulders relaxed.',
    'Không ép kéo giãn. Giữ vai thoải mái.',
    TRUE
),

-- 3. Cat-Cow Stretch
(
    'e1000000-0001-0001-0001-000000000003',
    NULL,
    'Cat-Cow Stretch',
    'Kéo giãn Mèo-Bò',
    'A gentle flow between two poses that warms up the spine.',
    'Một động tác nhẹ nhàng giữa hai tư thế để làm ấm cột sống.',
    '1. Start on hands and knees (tabletop position)
2. Inhale: Drop belly, lift head and tailbone (Cow)
3. Exhale: Round spine toward ceiling, tuck chin (Cat)
4. Flow smoothly between positions
5. Repeat 10-15 times',
    '1. Bắt đầu ở tư thế quỳ và đầu gối (tư thế bàn)
2. Hít vào: Hạ bụng, nâng đầu và xương cùng (Bò)
3. Thở ra: Cong lưng lên trần, gập cằm (Mèo)
4. Di chuyển mượt giữa các vị trí
5. Lặp lại 10-15 lần',
    'stretching',
    ARRAY['lumbar_spine', 'thoracic_spine']::body_region[],
    NULL, NULL,
    2, 15, 0,
    'beginner',
    ARRAY['mat'],
    'Move slowly and controlled. Do not force any position.',
    'Di chuyển chậm và kiểm soát. Không ép bất kỳ vị trí nào.',
    TRUE
),

-- 4. Piriformis Stretch
(
    'e1000000-0001-0001-0001-000000000004',
    NULL,
    'Piriformis Stretch (Figure 4)',
    'Kéo giãn cơ hình lê (Hình số 4)',
    'Stretches the piriformis muscle in the buttocks to help with sciatica.',
    'Kéo giãn cơ hình lê ở mông để giúp giảm đau thần kinh tọa.',
    '1. Lie on your back with knees bent
2. Cross one ankle over opposite knee (figure 4)
3. Pull the bottom leg toward chest
4. Hold for 30 seconds
5. Switch sides',
    '1. Nằm ngửa với đầu gối cong
2. Bắt chéo một mắt cá chân lên đầu gối bên đối diện (hình số 4)
3. Kéo chân dưới về phía ngực
4. Giữ 30 giây
5. Đổi bên',
    'stretching',
    ARRAY['hip_left', 'hip_right', 'pelvis']::body_region[],
    NULL, NULL,
    3, 1, 30,
    'beginner',
    ARRAY['mat'],
    'Keep lower back flat on floor. Do not bounce.',
    'Giữ lưng dưới phẳng trên sàn. Không nảy.',
    TRUE
),

-- 5. Hip Flexor Stretch
(
    'e1000000-0001-0001-0001-000000000005',
    NULL,
    'Kneeling Hip Flexor Stretch',
    'Kéo giãn cơ gập hông quỳ',
    'Stretches tight hip flexors from prolonged sitting.',
    'Kéo giãn cơ gập hông bị căng do ngồi lâu.',
    '1. Kneel on one knee (use cushion if needed)
2. Other foot flat in front
3. Tuck pelvis slightly
4. Lean forward until stretch is felt in front of hip
5. Hold 30 seconds, switch sides',
    '1. Quỳ một đầu gối (dùng đệm nếu cần)
2. Chân còn lại đặt phẳng phía trước
3. Gập xương chậu nhẹ
4. Nghiêng về phía trước cho đến khi cảm thấy kéo giãn ở phía trước hông
5. Giữ 30 giây, đổi bên',
    'stretching',
    ARRAY['hip_left', 'hip_right']::body_region[],
    NULL, NULL,
    3, 1, 30,
    'beginner',
    ARRAY['mat'],
    'Keep torso upright. Do not arch lower back.',
    'Giữ thân trên thẳng. Không cong lưng dưới.',
    TRUE
),

-- =============================================================================
-- STRENGTHENING EXERCISES
-- =============================================================================

-- 6. Glute Bridge
(
    'e1000000-0002-0001-0001-000000000001',
    NULL,
    'Glute Bridge',
    'Nâng mông',
    'Strengthens glutes and core while promoting hip extension.',
    'Tăng cường cơ mông và cơ bụng trong khi thúc đẩy mở rộng hông.',
    '1. Lie on back, knees bent, feet flat
2. Engage core and squeeze glutes
3. Lift hips toward ceiling
4. Hold briefly at top
5. Lower slowly with control',
    '1. Nằm ngửa, đầu gối cong, chân đặt phẳng
2. Kéo cơ bụng và cơ mông
3. Nâng hông lên trần
4. Giữ ngắn ở đỉnh
5. Hạ xuống chậm với kiểm soát',
    'strengthening',
    ARRAY['hip_left', 'hip_right', 'lumbar_spine', 'pelvis']::body_region[],
    NULL, NULL,
    3, 15, 0,
    'beginner',
    ARRAY['mat'],
    'Do not arch lower back excessively. Keep ribs down.',
    'Không cong lưng dưới quá mức. Giữ xương sườn xuống.',
    TRUE
),

-- 7. Bird Dog
(
    'e1000000-0002-0001-0001-000000000002',
    NULL,
    'Bird Dog',
    'Chim-Chó',
    'Core stability exercise that challenges balance and coordination.',
    'Bài tập ổn định cơ bụng thách thức cân bằng và phối hợp.',
    '1. Start on hands and knees
2. Extend opposite arm and leg simultaneously
3. Keep back flat and hips level
4. Hold 2-3 seconds
5. Return and repeat other side',
    '1. Bắt đầu ở tư thế quỳ và đầu gối
2. Duỗi tay và chân đối diện cùng lúc
3. Giữ lưng phẳng và hông ngang bằng
4. Giữ 2-3 giây
5. Trở về và lặp lại bên kia',
    'strengthening',
    ARRAY['lumbar_spine', 'pelvis']::body_region[],
    NULL, NULL,
    3, 10, 3,
    'beginner',
    ARRAY['mat'],
    'Avoid rotating trunk. Move slowly and controlled.',
    'Tránh xoay thân. Di chuyển chậm và kiểm soát.',
    TRUE
),

-- 8. Side Plank
(
    'e1000000-0002-0001-0001-000000000003',
    NULL,
    'Side Plank',
    'Plank Bên',
    'Strengthens obliques and hip abductors.',
    'Tăng cường cơ chéo và cơ dạng hông.',
    '1. Lie on side, forearm on ground, elbow under shoulder
2. Stack feet or stagger them
3. Lift hips to create straight line
4. Hold position
5. Lower and repeat other side',
    '1. Nằm nghiêng, cẳng tay trên mặt đất, khuỷu tay dưới vai
2. Xếp chân chồng lên nhau hoặc so le
3. Nâng hông để tạo đường thẳng
4. Giữ vị trí
5. Hạ xuống và lặp lại bên kia',
    'strengthening',
    ARRAY['hip_left', 'hip_right', 'abdomen']::body_region[],
    NULL, NULL,
    3, 1, 30,
    'intermediate',
    ARRAY['mat'],
    'Keep body in straight line. Do not let hips sag.',
    'Giữ cơ thể theo đường thẳng. Không để hông chùng xuống.',
    TRUE
),

-- 9. Shoulder External Rotation with Band
(
    'e1000000-0002-0001-0001-000000000004',
    NULL,
    'Shoulder External Rotation with Band',
    'Xoay ngoài vai với dây',
    'Strengthens rotator cuff muscles.',
    'Tăng cường cơ xoay vai.',
    '1. Hold band with both hands, elbows at sides at 90 degrees
2. Keep elbows tucked
3. Rotate forearms outward against band
4. Control return
5. Repeat',
    '1. Cầm dây bằng cả hai tay, khuỷu tay ở bên hông 90 độ
2. Giữ khuỷu tay sát thân
3. Xoay cẳng tay ra ngoài chống lại dây
4. Kiểm soát khi trở về
5. Lặp lại',
    'strengthening',
    ARRAY['shoulder_left', 'shoulder_right']::body_region[],
    NULL, NULL,
    3, 15, 0,
    'beginner',
    ARRAY['resistance band'],
    'Keep elbows glued to sides. Do not shrug shoulders.',
    'Giữ khuỷu tay sát bên hông. Không nhún vai.',
    TRUE
),

-- 10. Sit to Stand
(
    'e1000000-0002-0001-0001-000000000005',
    NULL,
    'Sit to Stand',
    'Ngồi xuống đứng lên',
    'Functional exercise for leg strength and daily activities.',
    'Bài tập chức năng cho sức mạnh chân và hoạt động hàng ngày.',
    '1. Sit at edge of sturdy chair
2. Lean slightly forward
3. Stand up without using hands
4. Control lowering back to seated
5. Repeat',
    '1. Ngồi ở mép ghế chắc chắn
2. Nghiêng nhẹ về phía trước
3. Đứng dậy không dùng tay
4. Kiểm soát khi hạ xuống ngồi
5. Lặp lại',
    'strengthening',
    ARRAY['knee_left', 'knee_right', 'hip_left', 'hip_right']::body_region[],
    NULL, NULL,
    3, 10, 0,
    'beginner',
    ARRAY['chair'],
    'Use hands for assistance if needed. Ensure chair is stable.',
    'Sử dụng tay hỗ trợ nếu cần. Đảm bảo ghế ổn định.',
    TRUE
),

-- =============================================================================
-- BALANCE EXERCISES
-- =============================================================================

-- 11. Single Leg Balance
(
    'e1000000-0003-0001-0001-000000000001',
    NULL,
    'Single Leg Balance',
    'Đứng thăng bằng một chân',
    'Basic balance exercise for stability and proprioception.',
    'Bài tập thăng bằng cơ bản để ổn định và cảm nhận bản thân.',
    '1. Stand near wall or chair for safety
2. Lift one foot off ground
3. Balance on standing leg
4. Hold for 30 seconds
5. Repeat other side',
    '1. Đứng gần tường hoặc ghế để an toàn
2. Nâng một chân lên khỏi mặt đất
3. Thăng bằng trên chân đứng
4. Giữ 30 giây
5. Lặp lại bên kia',
    'balance',
    ARRAY['ankle_foot_left', 'ankle_foot_right', 'hip_left', 'hip_right']::body_region[],
    NULL, NULL,
    3, 1, 30,
    'beginner',
    ARRAY['wall', 'chair'],
    'Use support as needed. Focus on a fixed point.',
    'Sử dụng hỗ trợ khi cần. Tập trung vào một điểm cố định.',
    TRUE
),

-- 12. Tandem Stance
(
    'e1000000-0003-0001-0001-000000000002',
    NULL,
    'Tandem Stance',
    'Đứng một chân trước một chân sau',
    'Heel-to-toe standing position for balance training.',
    'Tư thế đứng gót-đến-ngón chân để luyện thăng bằng.',
    '1. Place one foot directly in front of other (heel to toe)
2. Arms out for balance if needed
3. Hold position
4. Switch which foot is in front',
    '1. Đặt một chân ngay trước chân kia (gót tới ngón)
2. Dang tay để giữ thăng bằng nếu cần
3. Giữ vị trí
4. Đổi chân nào ở phía trước',
    'balance',
    ARRAY['ankle_foot_left', 'ankle_foot_right']::body_region[],
    NULL, NULL,
    3, 1, 30,
    'beginner',
    NULL,
    'Use wall for support if needed. Progress gradually.',
    'Sử dụng tường hỗ trợ nếu cần. Tiến triển dần dần.',
    TRUE
),

-- =============================================================================
-- POSTURAL EXERCISES
-- =============================================================================

-- 13. Chin Tucks
(
    'e1000000-0006-0001-0001-000000000001',
    NULL,
    'Chin Tucks',
    'Rút cằm',
    'Strengthens deep neck flexors and improves posture.',
    'Tăng cường cơ gập cổ sâu và cải thiện tư thế.',
    '1. Sit or stand with good posture
2. Draw chin straight back (make double chin)
3. Keep eyes level
4. Hold for 5 seconds
5. Relax and repeat',
    '1. Ngồi hoặc đứng với tư thế tốt
2. Kéo cằm thẳng về phía sau (tạo cằm kép)
3. Giữ mắt ngang
4. Giữ 5 giây
5. Thư giãn và lặp lại',
    'postural',
    ARRAY['head_neck', 'cervical_spine']::body_region[],
    NULL, NULL,
    3, 10, 5,
    'beginner',
    NULL,
    'Do not jut chin forward. Keep movement small.',
    'Không đưa cằm về phía trước. Giữ động tác nhỏ.',
    TRUE
),

-- 14. Wall Angels
(
    'e1000000-0006-0001-0001-000000000002',
    NULL,
    'Wall Angels',
    'Thiên thần tường',
    'Improves shoulder mobility and postural awareness.',
    'Cải thiện sự di động vai và nhận thức tư thế.',
    '1. Stand with back against wall
2. Arms at 90 degrees against wall
3. Slide arms up overhead
4. Slide back down
5. Keep back and arms touching wall',
    '1. Đứng với lưng dựa vào tường
2. Tay ở 90 độ tựa vào tường
3. Trượt tay lên qua đầu
4. Trượt xuống
5. Giữ lưng và tay chạm tường',
    'postural',
    ARRAY['shoulder_left', 'shoulder_right', 'thoracic_spine']::body_region[],
    NULL, NULL,
    3, 10, 0,
    'intermediate',
    ARRAY['wall'],
    'Keep lower back flat against wall. Do not arch.',
    'Giữ lưng dưới phẳng vào tường. Không cong lưng.',
    TRUE
),

-- 15. Scapular Retraction
(
    'e1000000-0006-0001-0001-000000000003',
    NULL,
    'Scapular Retraction',
    'Rút xương bả vai',
    'Strengthens middle trapezius and rhomboids for better posture.',
    'Tăng cường cơ thang giữa và cơ hình thoi để có tư thế tốt hơn.',
    '1. Stand or sit with arms at sides
2. Squeeze shoulder blades together
3. Hold for 5 seconds
4. Release slowly
5. Repeat',
    '1. Đứng hoặc ngồi với tay ở bên hông
2. Ép xương bả vai lại gần nhau
3. Giữ 5 giây
4. Thả ra từ từ
5. Lặp lại',
    'postural',
    ARRAY['thoracic_spine']::body_region[],
    NULL, NULL,
    3, 15, 5,
    'beginner',
    NULL,
    'Do not shrug shoulders up. Keep neck relaxed.',
    'Không nhún vai lên. Giữ cổ thoải mái.',
    TRUE
)

ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    name_vi = EXCLUDED.name_vi,
    description = EXCLUDED.description,
    description_vi = EXCLUDED.description_vi,
    instructions = EXCLUDED.instructions,
    instructions_vi = EXCLUDED.instructions_vi,
    updated_at = NOW();

-- Output completion message
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Exercise library seed data inserted successfully';
    RAISE NOTICE 'Total exercises: 15';
    RAISE NOTICE 'Categories: stretching, strengthening, balance, postural';
    RAISE NOTICE '==============================================';
END $$;
