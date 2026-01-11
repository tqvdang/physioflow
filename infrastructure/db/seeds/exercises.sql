-- Seed file: exercises.sql
-- Description: Exercise library for PhysioFlow
-- Created: 2026-01-11

-- =============================================================================
-- EXERCISES TABLE CREATION (if not in migrations)
-- =============================================================================

CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    name_vi VARCHAR(200) NOT NULL,
    description TEXT,
    description_vi TEXT,
    instructions TEXT,
    instructions_vi TEXT,
    category VARCHAR(50) NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    equipment TEXT[] DEFAULT '{}',
    muscle_groups TEXT[] NOT NULL DEFAULT '{}',
    image_url VARCHAR(500),
    video_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    default_sets INTEGER NOT NULL DEFAULT 3,
    default_reps INTEGER NOT NULL DEFAULT 10,
    default_hold_secs INTEGER NOT NULL DEFAULT 0,
    default_duration_mins INTEGER NOT NULL DEFAULT 0,
    precautions TEXT,
    precautions_vi TEXT,
    is_global BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_exercises_clinic_id ON exercises(clinic_id);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON exercises(difficulty);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_groups ON exercises USING GIN(muscle_groups);
CREATE INDEX IF NOT EXISTS idx_exercises_is_global ON exercises(is_global);
CREATE INDEX IF NOT EXISTS idx_exercises_is_active ON exercises(is_active);

CREATE TABLE IF NOT EXISTS exercise_prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    prescribed_by UUID NOT NULL REFERENCES users(id),
    program_id UUID REFERENCES home_exercise_programs(id) ON DELETE SET NULL,
    sets INTEGER NOT NULL DEFAULT 3,
    reps INTEGER NOT NULL DEFAULT 10,
    hold_seconds INTEGER NOT NULL DEFAULT 0,
    frequency VARCHAR(50) NOT NULL,
    duration_weeks INTEGER NOT NULL DEFAULT 4,
    custom_instructions TEXT,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_prescriptions_patient_id ON exercise_prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_exercise_prescriptions_exercise_id ON exercise_prescriptions(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_prescriptions_program_id ON exercise_prescriptions(program_id);
CREATE INDEX IF NOT EXISTS idx_exercise_prescriptions_status ON exercise_prescriptions(status);

CREATE TABLE IF NOT EXISTS home_exercise_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    created_by UUID NOT NULL REFERENCES users(id),
    name VARCHAR(200) NOT NULL,
    name_vi VARCHAR(200),
    description TEXT,
    description_vi TEXT,
    frequency VARCHAR(50) NOT NULL,
    duration_weeks INTEGER NOT NULL DEFAULT 4,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_home_exercise_programs_patient_id ON home_exercise_programs(patient_id);
CREATE INDEX IF NOT EXISTS idx_home_exercise_programs_is_active ON home_exercise_programs(is_active);

CREATE TABLE IF NOT EXISTS exercise_compliance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID NOT NULL REFERENCES exercise_prescriptions(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sets_completed INTEGER NOT NULL DEFAULT 0,
    reps_completed INTEGER NOT NULL DEFAULT 0,
    pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
    difficulty VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_compliance_logs_prescription_id ON exercise_compliance_logs(prescription_id);
CREATE INDEX IF NOT EXISTS idx_exercise_compliance_logs_patient_id ON exercise_compliance_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_exercise_compliance_logs_completed_at ON exercise_compliance_logs(completed_at);

-- =============================================================================
-- STRETCHING EXERCISES
-- =============================================================================

INSERT INTO exercises (id, name, name_vi, description, description_vi, instructions, instructions_vi, category, difficulty, equipment, muscle_groups, default_sets, default_reps, default_hold_secs, precautions, precautions_vi, is_global, is_active) VALUES

-- 1. Neck Stretches
('e1000000-0001-0001-0001-000000000001',
'Upper Trapezius Stretch',
'Keo gian co thang lung',
'A gentle stretch for the upper trapezius muscle to relieve neck and shoulder tension.',
'Bai tap keo gian nhe nhang cho co thang lung de giam cang thang co va vai.',
'1. Sit or stand with good posture\n2. Gently tilt your head to one side, bringing ear toward shoulder\n3. Place your hand on top of your head for a gentle assist\n4. Hold for 30 seconds\n5. Repeat on other side',
'1. Ngoi hoac dung voi tu the tot\n2. Nhe nhang nghieng dau sang mot ben, dua tai ve phia vai\n3. Dat tay len dinh dau de ho tro nhe nhang\n4. Giu 30 giay\n5. Lap lai ben con lai',
'stretching', 'beginner', '{}', '{neck,shoulder}', 3, 1, 30,
'Avoid overstretching. Stop if you feel pain or dizziness.',
'Tranh keo gian qua muc. Dung lai neu cam thay dau hoac chong mat.',
TRUE, TRUE),

-- 2. Levator Scapulae Stretch
('e1000000-0001-0001-0001-000000000002',
'Levator Scapulae Stretch',
'Keo gian co nang vai',
'Targets the muscle connecting neck to shoulder blade.',
'Tap trung vao co noi co va xuong ba vai.',
'1. Sit with good posture\n2. Turn your head 45 degrees to one side\n3. Look down toward your armpit\n4. Place hand on back of head for gentle pressure\n5. Hold for 30 seconds each side',
'1. Ngoi voi tu the tot\n2. Xoay dau 45 do sang mot ben\n3. Nhin xuong phia nach\n4. Dat tay len sau dau de tao ap luc nhe\n5. Giu 30 giay moi ben',
'stretching', 'beginner', '{}', '{neck,upper_back}', 3, 1, 30,
'Do not force the stretch. Keep shoulders relaxed.',
'Khong ep keo gian. Giu vai thoai mai.',
TRUE, TRUE),

-- 3. Chest Doorway Stretch
('e1000000-0001-0001-0001-000000000003',
'Doorway Pec Stretch',
'Keo gian co nguc tai khung cua',
'Opens up the chest and counteracts forward posture.',
'Mo rong nguc va chong lai tu the ngua ve phia truoc.',
'1. Stand in a doorway\n2. Place forearms on door frame at 90 degrees\n3. Step forward with one foot\n4. Lean forward until you feel stretch in chest\n5. Hold for 30 seconds',
'1. Dung trong khung cua\n2. Dat cang tay len khung cua o 90 do\n3. Buoc mot chan ve phia truoc\n4. Nghieng ve phia truoc cho den khi cam thay keo gian o nguc\n5. Giu 30 giay',
'stretching', 'beginner', '{doorway}', '{chest,shoulder}', 3, 1, 30,
'Keep core engaged. Do not arch lower back excessively.',
'Giu co bung. Khong cong lung duoi qua muc.',
TRUE, TRUE),

-- 4. Cat-Cow Stretch
('e1000000-0001-0001-0001-000000000004',
'Cat-Cow Stretch',
'Keo gian Meo-Bo',
'A gentle flow between two poses that warms up the spine.',
'Mot dong tac nhe nhang giua hai tu the de lam am cot song.',
'1. Start on hands and knees (tabletop position)\n2. Inhale: Drop belly, lift head and tailbone (Cow)\n3. Exhale: Round spine toward ceiling, tuck chin (Cat)\n4. Flow smoothly between positions\n5. Repeat 10-15 times',
'1. Bat dau o tu the quay va dau goi (tu the ban)\n2. Hit vao: Ha bung, nang dau va xuong cung (Bo)\n3. Tho ra: Cong lung len tran, gap cam (Meo)\n4. Di chuyen muot giua cac vi tri\n5. Lap lai 10-15 lan',
'stretching', 'beginner', '{mat}', '{lower_back,upper_back,core}', 2, 15, 0,
'Move slowly and controlled. Do not force any position.',
'Di chuyen cham va kiem soat. Khong ep bat ky vi tri nao.',
TRUE, TRUE),

-- 5. Piriformis Stretch
('e1000000-0001-0001-0001-000000000005',
'Piriformis Stretch (Figure 4)',
'Keo gian co hinh le (Hinh so 4)',
'Stretches the piriformis muscle in the buttocks to help with sciatica.',
'Keo gian co hinh le o mong de giup giam dau than kinh toa.',
'1. Lie on your back with knees bent\n2. Cross one ankle over opposite knee (figure 4)\n3. Pull the bottom leg toward chest\n4. Hold for 30 seconds\n5. Switch sides',
'1. Nam ngua voi dau goi cong\n2. Bat cheo mot mat ca chan len dau goi ben doi dien (hinh so 4)\n3. Keo chan duoi ve phia nguc\n4. Giu 30 giay\n5. Doi ben',
'stretching', 'beginner', '{mat}', '{glutes,hip}', 3, 1, 30,
'Keep lower back flat on floor. Do not bounce.',
'Giu lung duoi phang tren san. Khong nay.',
TRUE, TRUE),

-- 6. Hamstring Stretch
('e1000000-0001-0001-0001-000000000006',
'Supine Hamstring Stretch',
'Keo gian co dui sau nam ngua',
'Stretches the back of the thigh while protecting the lower back.',
'Keo gian phan sau cua dui trong khi bao ve lung duoi.',
'1. Lie on your back\n2. Lift one leg toward ceiling\n3. Hold behind thigh or use a strap\n4. Keep knee slightly bent\n5. Hold for 30 seconds each leg',
'1. Nam ngua\n2. Nang mot chan len tran\n3. Giu phia sau dui hoac su dung day\n4. Giu dau goi hoi cong\n5. Giu 30 giay moi chan',
'stretching', 'beginner', '{mat,strap}', '{hamstrings}', 3, 1, 30,
'Keep lower back pressed into floor. Do not lock knee.',
'Giu lung duoi ep xuong san. Khong khoa dau goi.',
TRUE, TRUE),

-- 7. Hip Flexor Stretch
('e1000000-0001-0001-0001-000000000007',
'Kneeling Hip Flexor Stretch',
'Keo gian co gap hong quy',
'Stretches tight hip flexors from prolonged sitting.',
'Keo gian co gap hong bi cang do ngoi lau.',
'1. Kneel on one knee (use cushion if needed)\n2. Other foot flat in front\n3. Tuck pelvis slightly\n4. Lean forward until stretch is felt in front of hip\n5. Hold 30 seconds, switch sides',
'1. Quy mot dau goi (dung dem neu can)\n2. Chan con lai dat phang phia truoc\n3. Gap xuong chau nhe\n4. Nghieng ve phia truoc cho den khi cam thay keo gian o phia truoc hong\n5. Giu 30 giay, doi ben',
'stretching', 'beginner', '{mat}', '{hip,quadriceps}', 3, 1, 30,
'Keep torso upright. Do not arch lower back.',
'Giu than tren thang. Khong cong lung duoi.',
TRUE, TRUE),

-- =============================================================================
-- STRENGTHENING EXERCISES
-- =============================================================================

-- 8. Bridge Exercise
('e1000000-0002-0001-0001-000000000001',
'Glute Bridge',
'Nang mong',
'Strengthens glutes and core while promoting hip extension.',
'Tang cuong co mong va co bung trong khi thuc day mo rong hong.',
'1. Lie on back, knees bent, feet flat\n2. Engage core and squeeze glutes\n3. Lift hips toward ceiling\n4. Hold briefly at top\n5. Lower slowly with control',
'1. Nam ngua, dau goi cong, chan dat phang\n2. Keo co bung va co mong\n3. Nang hong len tran\n4. Giu ngan o dinh\n5. Ha xuong cham voi kiem soat',
'strengthening', 'beginner', '{mat}', '{glutes,core,lower_back}', 3, 15, 0,
'Do not arch lower back excessively. Keep ribs down.',
'Khong cong lung duoi qua muc. Giu xuong suon xuong.',
TRUE, TRUE),

-- 9. Clamshell
('e1000000-0002-0001-0001-000000000002',
'Clamshell',
'Bai tap So Hen',
'Targets hip abductors, especially gluteus medius.',
'Tap trung vao co dang hong, dac biet la co mong giua.',
'1. Lie on side with knees bent 45 degrees\n2. Keep feet together\n3. Lift top knee while keeping feet together\n4. Lower with control\n5. Complete all reps then switch sides',
'1. Nam nghieng voi dau goi cong 45 do\n2. Giu hai ban chan sat nhau\n3. Nang dau goi tren len trong khi giu chan sat nhau\n4. Ha xuong co kiem soat\n5. Hoan thanh tat ca lan lap roi doi ben',
'strengthening', 'beginner', '{mat,resistance_band}', '{hip,glutes}', 3, 15, 0,
'Do not roll hips backward. Keep pelvis stable.',
'Khong xoay hong ve phia sau. Giu xuong chau on dinh.',
TRUE, TRUE),

-- 10. Bird Dog
('e1000000-0002-0001-0001-000000000003',
'Bird Dog',
'Chim-Cho',
'Core stability exercise that challenges balance and coordination.',
'Bai tap on dinh co bung thach thuc can bang va phoi hop.',
'1. Start on hands and knees\n2. Extend opposite arm and leg simultaneously\n3. Keep back flat and hips level\n4. Hold 2-3 seconds\n5. Return and repeat other side',
'1. Bat dau o tu the quay va dau goi\n2. Duoi tay va chan doi dien cung luc\n3. Giu lung phang va hong ngang bang\n4. Giu 2-3 giay\n5. Tro ve va lap lai ben kia',
'strengthening', 'beginner', '{mat}', '{core,lower_back,glutes}', 3, 10, 3,
'Avoid rotating trunk. Move slowly and controlled.',
'Tranh xoay than. Di chuyen cham va kiem soat.',
TRUE, TRUE),

-- 11. Dead Bug
('e1000000-0002-0001-0001-000000000004',
'Dead Bug',
'Bo Chet',
'Core stabilization exercise that teaches coordination.',
'Bai tap on dinh co bung day phoi hop.',
'1. Lie on back, arms toward ceiling, knees at 90 degrees\n2. Press lower back into floor\n3. Lower opposite arm and leg toward floor\n4. Keep core engaged throughout\n5. Return and repeat other side',
'1. Nam ngua, tay huong len tran, dau goi o 90 do\n2. Ep lung duoi xuong san\n3. Ha tay va chan doi dien xuong gan san\n4. Giu co bung toan bo thoi gian\n5. Tro ve va lap lai ben kia',
'strengthening', 'beginner', '{mat}', '{core}', 3, 10, 0,
'Keep lower back pressed into floor. Do not hold breath.',
'Giu lung duoi ep xuong san. Khong nin tho.',
TRUE, TRUE),

-- 12. Side Plank
('e1000000-0002-0001-0001-000000000005',
'Side Plank',
'Plank Ben',
'Strengthens obliques and hip abductors.',
'Tang cuong co cheo va co dang hong.',
'1. Lie on side, forearm on ground, elbow under shoulder\n2. Stack feet or stagger them\n3. Lift hips to create straight line\n4. Hold position\n5. Lower and repeat other side',
'1. Nam nghieng, cang tay tren mat dat, khuyu tay duoi vai\n2. Xep chan chong len nhau hoac so le\n3. Nang hong de tao duong thang\n4. Giu vi tri\n5. Ha xuong va lap lai ben kia',
'strengthening', 'intermediate', '{mat}', '{core,hip}', 3, 1, 30,
'Keep body in straight line. Do not let hips sag.',
'Giu co the theo duong thang. Khong de hong chung xuong.',
TRUE, TRUE),

-- 13. Wall Push-Up
('e1000000-0002-0001-0001-000000000006',
'Wall Push-Up',
'Chong day tuong',
'Beginner-friendly push-up variation for upper body strength.',
'Bien the chong day than thien voi nguoi moi bat dau de tang cuong than tren.',
'1. Stand facing wall, arms length away\n2. Place hands on wall at shoulder height\n3. Bend elbows to lean toward wall\n4. Push back to start\n5. Keep body straight throughout',
'1. Dung doi dien tuong, cach mot canh tay\n2. Dat tay len tuong ngang vai\n3. Gap khuyu tay de nghieng ve phia tuong\n4. Day tro lai vi tri ban dau\n5. Giu co the thang toan bo thoi gian',
'strengthening', 'beginner', '{wall}', '{chest,shoulder,wrist_forearm}', 3, 12, 0,
'Keep core engaged. Do not let shoulders shrug.',
'Giu co bung. Khong de vai nhun len.',
TRUE, TRUE),

-- 14. Shoulder External Rotation
('e1000000-0002-0001-0001-000000000007',
'Shoulder External Rotation with Band',
'Xoay ngoai vai voi day',
'Strengthens rotator cuff muscles.',
'Tang cuong co xoay vai.',
'1. Hold band with both hands, elbows at sides at 90 degrees\n2. Keep elbows tucked\n3. Rotate forearms outward against band\n4. Control return\n5. Repeat',
'1. Cam day bang ca hai tay, khuyu tay o ben hong 90 do\n2. Giu khuyu tay sat than\n3. Xoay cang tay ra ngoai chong lai day\n4. Kiem soat khi tro ve\n5. Lap lai',
'strengthening', 'beginner', '{resistance_band}', '{shoulder}', 3, 15, 0,
'Keep elbows glued to sides. Do not shrug shoulders.',
'Giu khuyu tay sat ben hong. Khong nhun vai.',
TRUE, TRUE),

-- 15. Scapular Retraction
('e1000000-0002-0001-0001-000000000008',
'Scapular Retraction',
'Rut xuong ba vai',
'Strengthens middle trapezius and rhomboids for better posture.',
'Tang cuong co thang giua va co hinh thoi de co tu the tot hon.',
'1. Stand or sit with arms at sides\n2. Squeeze shoulder blades together\n3. Hold for 5 seconds\n4. Release slowly\n5. Repeat',
'1. Dung hoac ngoi voi tay o ben hong\n2. Ep xuong ba vai lai gan nhau\n3. Giu 5 giay\n4. Tha ra tu tu\n5. Lap lai',
'strengthening', 'beginner', '{}', '{upper_back}', 3, 15, 5,
'Do not shrug shoulders up. Keep neck relaxed.',
'Khong nhun vai len. Giu co thoai mai.',
TRUE, TRUE),

-- 16. Sit to Stand
('e1000000-0002-0001-0001-000000000009',
'Sit to Stand',
'Ngoi xuong dung len',
'Functional exercise for leg strength and daily activities.',
'Bai tap chuc nang cho suc manh chan va hoat dong hang ngay.',
'1. Sit at edge of sturdy chair\n2. Lean slightly forward\n3. Stand up without using hands\n4. Control lowering back to seated\n5. Repeat',
'1. Ngoi o mep ghe chac chan\n2. Nghieng nhe ve phia truoc\n3. Dung day khong dung tay\n4. Kiem soat khi ha xuong ngoi\n5. Lap lai',
'strengthening', 'beginner', '{chair}', '{quadriceps,glutes}', 3, 10, 0,
'Use hands for assistance if needed. Ensure chair is stable.',
'Su dung tay ho tro neu can. Dam bao ghe on dinh.',
TRUE, TRUE),

-- 17. Heel Raises
('e1000000-0002-0001-0001-000000000010',
'Heel Raises',
'Nang got chan',
'Strengthens calf muscles for ankle stability.',
'Tang cuong co bap chan de on dinh mat ca chan.',
'1. Stand with feet hip-width apart\n2. Hold onto wall or chair for balance\n3. Rise up onto balls of feet\n4. Lower slowly with control\n5. Repeat',
'1. Dung voi hai chan rong bang hong\n2. Bam vao tuong hoac ghe de giu thang bang\n3. Nang len tren cac ngon chan\n4. Ha xuong tu tu co kiem soat\n5. Lap lai',
'strengthening', 'beginner', '{wall,chair}', '{calves,ankle}', 3, 15, 0,
'Control the movement. Do not bounce.',
'Kiem soat dong tac. Khong nay.',
TRUE, TRUE),

-- =============================================================================
-- BALANCE EXERCISES
-- =============================================================================

-- 18. Single Leg Stance
('e1000000-0003-0001-0001-000000000001',
'Single Leg Balance',
'Dung thang bang mot chan',
'Basic balance exercise for stability and proprioception.',
'Bai tap thang bang co ban de on dinh va cam nhan ban than.',
'1. Stand near wall or chair for safety\n2. Lift one foot off ground\n3. Balance on standing leg\n4. Hold for 30 seconds\n5. Repeat other side',
'1. Dung gan tuong hoac ghe de an toan\n2. Nang mot chan len khoi mat dat\n3. Thang bang tren chan dung\n4. Giu 30 giay\n5. Lap lai ben kia',
'balance', 'beginner', '{wall,chair}', '{ankle,hip,core}', 3, 1, 30,
'Use support as needed. Focus on a fixed point.',
'Su dung ho tro khi can. Tap trung vao mot diem co dinh.',
TRUE, TRUE),

-- 19. Tandem Stance
('e1000000-0003-0001-0001-000000000002',
'Tandem Stance',
'Dung mot chan truoc mot chan sau',
'Heel-to-toe standing position for balance training.',
'Tu the dung got-den-ngon chan de luyen thang bang.',
'1. Place one foot directly in front of other (heel to toe)\n2. Arms out for balance if needed\n3. Hold position\n4. Switch which foot is in front',
'1. Dat mot chan ngay truoc chan kia (got toi ngon)\n2. Dang tay de giu thang bang neu can\n3. Giu vi tri\n4. Doi chan nao o phia truoc',
'balance', 'beginner', '{}', '{ankle,core}', 3, 1, 30,
'Use wall for support if needed. Progress gradually.',
'Su dung tuong ho tro neu can. Tien trien dan dan.',
TRUE, TRUE),

-- 20. Weight Shifts
('e1000000-0003-0001-0001-000000000003',
'Standing Weight Shifts',
'Doi trong tam dung',
'Basic exercise for improving weight distribution awareness.',
'Bai tap co ban de cai thien nhan thuc ve phan bo trong luong.',
'1. Stand with feet hip-width apart\n2. Shift weight to right foot\n3. Shift weight to left foot\n4. Then shift forward and backward\n5. Repeat smoothly',
'1. Dung voi chan rong bang hong\n2. Doi trong luong sang chan phai\n3. Doi trong luong sang chan trai\n4. Sau do doi ve phia truoc va phia sau\n5. Lap lai muot ma',
'balance', 'beginner', '{}', '{ankle,hip}', 2, 10, 0,
'Keep movements controlled. Do not lose balance.',
'Giu dong tac kiem soat. Khong mat thang bang.',
TRUE, TRUE),

-- =============================================================================
-- CARDIOVASCULAR / MOBILITY EXERCISES
-- =============================================================================

-- 21. Marching in Place
('e1000000-0004-0001-0001-000000000001',
'Marching in Place',
'Di bo tai cho',
'Low-impact cardiovascular exercise suitable for warmup.',
'Bai tap tim mach tac dong thap phu hop de khoi dong.',
'1. Stand with feet hip-width apart\n2. March by lifting knees alternately\n3. Swing arms naturally\n4. Maintain good posture\n5. Continue for duration',
'1. Dung voi chan rong bang hong\n2. Di bo bang cach nang dau goi luan phien\n3. Vung tay tu nhien\n4. Duy tri tu the tot\n5. Tiep tuc trong thoi gian',
'cardiovascular', 'beginner', '{}', '{hip,full_body}', 1, 1, 0,
'Start slowly and increase pace gradually. Stop if dizzy.',
'Bat dau cham va tang toc do dan dan. Dung lai neu chong mat.',
TRUE, TRUE),

-- 22. Ankle Circles
('e1000000-0005-0001-0001-000000000001',
'Ankle Circles',
'Xoay mat ca chan',
'Mobility exercise for ankle joint.',
'Bai tap di dong cho khop mat ca chan.',
'1. Sit or stand with one foot off ground\n2. Rotate ankle clockwise\n3. Complete all circles\n4. Rotate counterclockwise\n5. Repeat other ankle',
'1. Ngoi hoac dung voi mot chan khoi mat dat\n2. Xoay mat ca chan theo chieu kim dong ho\n3. Hoan thanh tat ca vong xoay\n4. Xoay nguoc chieu kim dong ho\n5. Lap lai mat ca chan kia',
'mobility', 'beginner', '{}', '{ankle}', 2, 10, 0,
'Make full circles. Move slowly and controlled.',
'Lam vong tron day du. Di chuyen cham va kiem soat.',
TRUE, TRUE),

-- 23. Shoulder Rolls
('e1000000-0005-0001-0001-000000000002',
'Shoulder Rolls',
'Xoay vai',
'Releases tension in neck and shoulders.',
'Giai phong cang thang o co va vai.',
'1. Stand or sit with arms relaxed\n2. Roll shoulders forward in circles\n3. Complete all forward rolls\n4. Reverse direction\n5. Repeat',
'1. Dung hoac ngoi voi tay thoai mai\n2. Xoay vai ve phia truoc theo vong tron\n3. Hoan thanh tat ca vong xoay ve phia truoc\n4. Dao nguoc huong\n5. Lap lai',
'mobility', 'beginner', '{}', '{shoulder,neck}', 2, 10, 0,
'Move slowly. Make full circles.',
'Di chuyen cham. Lam vong tron day du.',
TRUE, TRUE),

-- 24. Trunk Rotations
('e1000000-0005-0001-0001-000000000003',
'Seated Trunk Rotation',
'Xoay than ngoi',
'Improves thoracic spine mobility.',
'Cai thien su di dong cot song nguc.',
'1. Sit upright in chair\n2. Cross arms over chest\n3. Rotate trunk to one side\n4. Return to center\n5. Rotate to other side',
'1. Ngoi thang trong ghe\n2. Khoanh tay truoc nguc\n3. Xoay than sang mot ben\n4. Tro ve giua\n5. Xoay sang ben kia',
'mobility', 'beginner', '{chair}', '{upper_back,core}', 2, 10, 0,
'Keep hips facing forward. Move within comfortable range.',
'Giu hong huong ve phia truoc. Di chuyen trong pham vi thoai mai.',
TRUE, TRUE),

-- =============================================================================
-- POSTURAL EXERCISES
-- =============================================================================

-- 25. Chin Tucks
('e1000000-0006-0001-0001-000000000001',
'Chin Tucks',
'Rut cam',
'Strengthens deep neck flexors and improves posture.',
'Tang cuong co gap co sau va cai thien tu the.',
'1. Sit or stand with good posture\n2. Draw chin straight back (make double chin)\n3. Keep eyes level\n4. Hold for 5 seconds\n5. Relax and repeat',
'1. Ngoi hoac dung voi tu the tot\n2. Keo cam thang ve phia sau (tao cam kep)\n3. Giu mat ngang\n4. Giu 5 giay\n5. Thu gian va lap lai',
'postural', 'beginner', '{}', '{neck}', 3, 10, 5,
'Do not jut chin forward. Keep movement small.',
'Khong dua cam ve phia truoc. Giu dong tac nho.',
TRUE, TRUE),

-- 26. Wall Angels
('e1000000-0006-0001-0001-000000000002',
'Wall Angels',
'Thien than tuong',
'Improves shoulder mobility and postural awareness.',
'Cai thien su di dong vai va nhan thuc tu the.',
'1. Stand with back against wall\n2. Arms at 90 degrees against wall\n3. Slide arms up overhead\n4. Slide back down\n5. Keep back and arms touching wall',
'1. Dung voi lung dua vao tuong\n2. Tay o 90 do tua vao tuong\n3. Truot tay len qua dau\n4. Truot xuong\n5. Giu lung va tay cham tuong',
'postural', 'intermediate', '{wall}', '{shoulder,upper_back}', 3, 10, 0,
'Keep lower back flat against wall. Do not arch.',
'Giu lung duoi phang vao tuong. Khong cong lung.',
TRUE, TRUE),

-- 27. Thoracic Extension
('e1000000-0006-0001-0001-000000000003',
'Thoracic Extension over Foam Roller',
'Mo rong cot song nguc tren con lan',
'Opens up the thoracic spine and chest.',
'Mo rong cot song nguc va nguc.',
'1. Lie with foam roller across mid-back\n2. Support head with hands\n3. Gently arch back over roller\n4. Hold briefly\n5. Roll to different section and repeat',
'1. Nam voi con lan ngang giua lung\n2. Do dau bang tay\n3. Nhe nhang cong lung qua con lan\n4. Giu ngan\n5. Lan den phan khac va lap lai',
'postural', 'intermediate', '{foam_roller,mat}', '{upper_back}', 2, 10, 5,
'Do not place roller on lower back. Move slowly.',
'Khong dat con lan len lung duoi. Di chuyen cham.',
TRUE, TRUE),

-- 28. Prone Y Raises
('e1000000-0006-0001-0001-000000000004',
'Prone Y Raises',
'Nang chu Y nam sap',
'Strengthens lower trapezius for better shoulder posture.',
'Tang cuong co thang duoi de co tu the vai tot hon.',
'1. Lie face down on mat\n2. Arms extended overhead in Y position\n3. Thumbs pointing up\n4. Lift arms few inches off floor\n5. Lower with control',
'1. Nam up mat tren tham\n2. Tay duoi qua dau o vi tri chu Y\n3. Ngon cai chi len\n4. Nang tay vai inch khoi san\n5. Ha xuong co kiem soat',
'postural', 'intermediate', '{mat}', '{upper_back,shoulder}', 3, 12, 0,
'Keep neck neutral. Do not lift too high.',
'Giu co o vi tri trung tinh. Khong nang qua cao.',
TRUE, TRUE);

-- Update created_at timestamps to be slightly different for ordering
UPDATE exercises SET updated_at = created_at;

COMMENT ON TABLE exercises IS 'Exercise library containing all available exercises for prescription';
COMMENT ON TABLE exercise_prescriptions IS 'Exercises prescribed to patients with specific parameters';
COMMENT ON TABLE home_exercise_programs IS 'Home exercise programs containing multiple prescribed exercises';
COMMENT ON TABLE exercise_compliance_logs IS 'Patient compliance tracking for prescribed exercises';
