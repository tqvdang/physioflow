-- Migration 024: Special Tests Library
-- Creates special_tests reference table and patient_special_test_results table
-- Seeds 30+ orthopedic special tests with bilingual (English/Vietnamese) content

BEGIN;

-- Special tests reference/library table
CREATE TABLE IF NOT EXISTS special_tests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    name_vi         VARCHAR(200) NOT NULL,
    category        VARCHAR(50)  NOT NULL CHECK (category IN ('shoulder', 'knee', 'spine', 'hip', 'ankle', 'elbow')),
    description     TEXT         NOT NULL DEFAULT '',
    description_vi  TEXT         NOT NULL DEFAULT '',
    positive_finding    TEXT     NOT NULL DEFAULT '',
    positive_finding_vi TEXT    NOT NULL DEFAULT '',
    negative_finding    TEXT     NOT NULL DEFAULT '',
    negative_finding_vi TEXT    NOT NULL DEFAULT '',
    sensitivity     SMALLINT     CHECK (sensitivity IS NULL OR (sensitivity >= 0 AND sensitivity <= 100)),
    specificity     SMALLINT     CHECK (specificity IS NULL OR (specificity >= 0 AND specificity <= 100)),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_special_tests_category ON special_tests (category);
CREATE INDEX idx_special_tests_name_trgm ON special_tests USING gin (name gin_trgm_ops);
CREATE INDEX idx_special_tests_name_vi_trgm ON special_tests USING gin (name_vi gin_trgm_ops);

-- Patient special test results table
CREATE TABLE IF NOT EXISTS patient_special_test_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      UUID         NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    visit_id        UUID,
    special_test_id UUID         NOT NULL REFERENCES special_tests(id) ON DELETE CASCADE,
    result          VARCHAR(20)  NOT NULL CHECK (result IN ('positive', 'negative', 'inconclusive')),
    notes           TEXT         NOT NULL DEFAULT '',
    therapist_id    UUID         NOT NULL,
    assessed_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_special_test_results_patient ON patient_special_test_results (patient_id);
CREATE INDEX idx_patient_special_test_results_visit ON patient_special_test_results (visit_id);
CREATE INDEX idx_patient_special_test_results_test ON patient_special_test_results (special_test_id);
CREATE INDEX idx_patient_special_test_results_therapist ON patient_special_test_results (therapist_id);
CREATE INDEX idx_patient_special_test_results_assessed ON patient_special_test_results (assessed_at DESC);

-- =============================================================================
-- Seed: Shoulder Tests (10)
-- =============================================================================

INSERT INTO special_tests (name, name_vi, category, description, description_vi, positive_finding, positive_finding_vi, negative_finding, negative_finding_vi, sensitivity, specificity) VALUES
(
    'Neer''s Test', 'Test Neer', 'shoulder',
    'Examiner stabilizes the scapula and passively flexes the shoulder with the arm in internal rotation. Compresses supraspinatus tendon against the anterior inferior acromion.',
    'Nguoi kiem tra co dinh xuong ba vai va gap thu dong vai voi canh tay xoay trong. Nen gan co tren gai vao mua chay truoc duoi.',
    'Pain during forced flexion indicates subacromial impingement syndrome',
    'Dau khi gap cuong buc cho thay hoi chung chon ep duoi mua chay',
    'No pain reproduction rules out subacromial impingement',
    'Khong tai tao dau loai tru hoi chung chon ep duoi mua chay',
    79, 53
),
(
    'Hawkins-Kennedy Test', 'Test Hawkins-Kennedy', 'shoulder',
    'Shoulder flexed to 90 degrees, then forcibly internally rotated. Tests for subacromial impingement by compressing the supraspinatus against the coracoacromial ligament.',
    'Vai gap 90 do, sau do cuong buc xoay trong. Kiem tra chon ep duoi mua chay bang cach nen co tren gai vao day chang qua-mua chay.',
    'Pain with internal rotation indicates subacromial impingement',
    'Dau khi xoay trong cho thay chon ep duoi mua chay',
    'No pain suggests absence of impingement',
    'Khong dau goi y khong co chon ep',
    80, 56
),
(
    'Jobe''s Test (Empty Can)', 'Test Jobe (Lon Rong)', 'shoulder',
    'Arms abducted to 90 degrees in the scapular plane with thumbs pointing down (internal rotation). Examiner applies downward resistance.',
    'Tay dang 90 do trong mat phang ba vai voi ngon cai chi xuong (xoay trong). Nguoi kiem tra tao luc can huong xuong.',
    'Pain or weakness indicates supraspinatus pathology (tear or tendinopathy)',
    'Dau hoac yeu chi ra benh ly co tren gai (rach hoac benh gan)',
    'Full strength without pain suggests intact supraspinatus',
    'Suc manh day du khong dau goi y co tren gai nguyen ven',
    77, 68
),
(
    'Drop Arm Test', 'Test Tha Canh Tay', 'shoulder',
    'Patient actively abducts arm to 90 degrees, then slowly lowers it. Tests rotator cuff integrity, particularly supraspinatus.',
    'Benh nhan chu dong dang tay 90 do, sau do tu tu ha xuong. Kiem tra tinh toan ven cua chung xoay, dac biet la co tren gai.',
    'Arm drops suddenly or patient cannot control descent, indicating rotator cuff tear',
    'Tay roi dot ngot hoac benh nhan khong kiem soat duoc viec ha, chi ra rach chung xoay',
    'Smooth controlled lowering suggests intact rotator cuff',
    'Ha xuong deu dan co kiem soat goi y chung xoay nguyen ven',
    27, 88
),
(
    'Speed''s Test', 'Test Speed', 'shoulder',
    'Patient forward flexes shoulder against resistance with elbow extended and forearm supinated. Tests for biceps tendon pathology.',
    'Benh nhan gap vai truoc chong luc voi khuyu duoi thang va cang tay ngua. Kiem tra benh ly gan co nhi dau.',
    'Pain in the bicipital groove indicates biceps tendinopathy or SLAP lesion',
    'Dau tai ranh co nhi dau chi ra benh ly gan co nhi dau hoac ton thuong SLAP',
    'No pain in bicipital groove suggests intact biceps tendon',
    'Khong dau tai ranh co nhi dau goi y gan co nhi dau nguyen ven',
    32, 75
),
(
    'O''Brien''s Test (Active Compression)', 'Test O''Brien (Ep Chu Dong)', 'shoulder',
    'Arm forward flexed to 90 degrees, adducted 10-15 degrees, internally rotated (thumb down). Resist downward force, then repeat with supination.',
    'Tay gap truoc 90 do, khep 10-15 do, xoay trong (ngon cai xuong). Chong luc huong xuong, sau do lap lai voi ngua.',
    'Pain with internal rotation that decreases with supination indicates SLAP lesion or AC joint pathology',
    'Dau khi xoay trong giam khi ngua chi ra ton thuong SLAP hoac benh ly khop vai-don',
    'No pain difference between positions suggests absence of SLAP lesion',
    'Khong co su khac biet dau giua cac vi tri goi y khong co ton thuong SLAP',
    63, 73
),
(
    'Lift-off Test (Gerber)', 'Test Nang (Gerber)', 'shoulder',
    'Patient places hand behind back (dorsum of hand on lumbar spine), then attempts to lift hand off back against resistance.',
    'Benh nhan dat tay sau lung (mu ban tay tren cot song that lung), sau do co nang tay khoi lung chong luc.',
    'Inability to lift hand off back indicates subscapularis tear or weakness',
    'Khong co kha nang nang tay khoi lung chi ra rach hoac yeu co duoi vai',
    'Ability to lift and hold hand off back suggests intact subscapularis',
    'Co kha nang nang va giu tay khoi lung goi y co duoi vai nguyen ven',
    18, 100
),
(
    'Apprehension Test', 'Test Lo Ngai', 'shoulder',
    'Patient supine, shoulder abducted to 90 degrees, elbow flexed to 90 degrees. Examiner externally rotates the shoulder.',
    'Benh nhan nam ngua, vai dang 90 do, khuyu gap 90 do. Nguoi kiem tra xoay ngoai vai.',
    'Patient shows apprehension or guarding, indicating anterior glenohumeral instability',
    'Benh nhan to ra lo lang hoac phong ve, chi ra mat vung khop o-canh tay truoc',
    'No apprehension suggests stable glenohumeral joint',
    'Khong lo lang goi y khop o-canh tay on dinh',
    72, 96
),
(
    'Relocation Test', 'Test Tai Dinh Vi', 'shoulder',
    'Performed after positive Apprehension Test. Examiner applies posterior-directed force on the proximal humerus.',
    'Thuc hien sau Test Lo Ngai duong tinh. Nguoi kiem tra tao luc huong sau tren dau gan xuong canh tay.',
    'Relief of apprehension with posterior force confirms anterior instability',
    'Giam lo lang voi luc huong sau xac nhan mat vung truoc',
    'No change in apprehension suggests other pathology',
    'Khong thay doi lo lang goi y benh ly khac',
    81, 92
),
(
    'Cross-Body Adduction Test', 'Test Khep Ngang Co The', 'shoulder',
    'Examiner passively flexes the patient''s shoulder to 90 degrees, then adducts the arm across the body toward the opposite shoulder.',
    'Nguoi kiem tra gap thu dong vai benh nhan 90 do, sau do khep canh tay ngang co the ve phia vai doi dien.',
    'Pain at the acromioclavicular joint indicates AC joint pathology',
    'Dau tai khop vai-don chi ra benh ly khop vai-don',
    'No pain at the AC joint suggests absence of AC joint pathology',
    'Khong dau tai khop vai-don goi y khong co benh ly khop vai-don',
    77, 35
);

-- =============================================================================
-- Seed: Knee Tests (8)
-- =============================================================================

INSERT INTO special_tests (name, name_vi, category, description, description_vi, positive_finding, positive_finding_vi, negative_finding, negative_finding_vi, sensitivity, specificity) VALUES
(
    'Lachman Test', 'Test Lachman', 'knee',
    'Patient supine with knee flexed 20-30 degrees. Examiner stabilizes femur with one hand and applies anterior translating force to proximal tibia with the other.',
    'Benh nhan nam ngua goi gap 20-30 do. Nguoi kiem tra co dinh xuong dui bang mot tay va tao luc dich chuyen truoc len dau gan xuong chay bang tay kia.',
    'Excessive anterior translation with soft end-feel indicates ACL tear',
    'Dich chuyen truoc qua muc voi cam giac cuoi mem chi ra rach day chang cheo truoc',
    'Firm end-feel with minimal anterior translation suggests intact ACL',
    'Cam giac cuoi cung voi dich chuyen truoc toi thieu goi y ACL nguyen ven',
    85, 94
),
(
    'Anterior Drawer Test (Knee)', 'Test Keo Truoc (Goi)', 'knee',
    'Patient supine with knee flexed to 90 degrees and foot flat on table. Examiner sits on foot and pulls the proximal tibia anteriorly.',
    'Benh nhan nam ngua goi gap 90 do va ban chan dat phang tren ban. Nguoi kiem tra ngoi tren ban chan va keo dau gan xuong chay ve phia truoc.',
    'Excessive anterior tibial translation indicates ACL insufficiency',
    'Dich chuyen truoc xuong chay qua muc chi ra thieu hut ACL',
    'Normal anterior translation suggests intact ACL',
    'Dich chuyen truoc binh thuong goi y ACL nguyen ven',
    55, 92
),
(
    'Posterior Drawer Test', 'Test Keo Sau', 'knee',
    'Patient supine with knee flexed to 90 degrees. Examiner pushes the proximal tibia posteriorly.',
    'Benh nhan nam ngua goi gap 90 do. Nguoi kiem tra day dau gan xuong chay ve phia sau.',
    'Excessive posterior tibial translation indicates PCL tear',
    'Dich chuyen sau xuong chay qua muc chi ra rach day chang cheo sau',
    'Normal posterior translation suggests intact PCL',
    'Dich chuyen sau binh thuong goi y PCL nguyen ven',
    90, 99
),
(
    'McMurray Test', 'Test McMurray', 'knee',
    'Patient supine with knee fully flexed. Examiner externally rotates tibia and extends knee (medial meniscus) or internally rotates and extends (lateral meniscus).',
    'Benh nhan nam ngua goi gap hoan toan. Nguoi kiem tra xoay ngoai xuong chay va duoi goi (sun chay giua) hoac xoay trong va duoi (sun chay ngoai).',
    'Palpable click or pain along the joint line indicates meniscal tear',
    'Tieng click cam nhan duoc hoac dau doc duong khop chi ra rach sun chay',
    'No clicking or pain suggests intact menisci',
    'Khong tieng click hoac dau goi y sun chay nguyen ven',
    70, 71
),
(
    'Apley''s Compression Test', 'Test Ep Apley', 'knee',
    'Patient prone with knee flexed to 90 degrees. Examiner applies downward compression through the tibia while rotating the lower leg internally and externally.',
    'Benh nhan nam sap goi gap 90 do. Nguoi kiem tra tao luc ep xuong qua xuong chay trong khi xoay cang chan trong va ngoai.',
    'Pain with compression and rotation indicates meniscal pathology',
    'Dau khi ep va xoay chi ra benh ly sun chay',
    'No pain with compression suggests intact menisci',
    'Khong dau khi ep goi y sun chay nguyen ven',
    61, 70
),
(
    'Apley''s Distraction Test', 'Test Keo Gian Apley', 'knee',
    'Patient prone with knee flexed to 90 degrees. Examiner applies upward distraction through the tibia while rotating the lower leg.',
    'Benh nhan nam sap goi gap 90 do. Nguoi kiem tra tao luc keo len qua xuong chay trong khi xoay cang chan.',
    'Pain with distraction and rotation indicates ligamentous injury',
    'Dau khi keo gian va xoay chi ra ton thuong day chang',
    'No pain with distraction suggests intact collateral ligaments',
    'Khong dau khi keo gian goi y day chang ben nguyen ven',
    61, 70
),
(
    'Valgus Stress Test', 'Test Ap Luc Valgus', 'knee',
    'Patient supine with knee slightly flexed (20-30 degrees). Examiner applies valgus (medially directed) force at the knee while stabilizing the ankle.',
    'Benh nhan nam ngua goi gap nhe (20-30 do). Nguoi kiem tra tao luc valgus (huong vao trong) tai goi trong khi co dinh co chan.',
    'Excessive medial joint opening indicates MCL injury',
    'Mo khop ben trong qua muc chi ra ton thuong day chang ben trong',
    'No excessive medial opening suggests intact MCL',
    'Khong mo qua muc ben trong goi y MCL nguyen ven',
    86, NULL
),
(
    'Varus Stress Test', 'Test Ap Luc Varus', 'knee',
    'Patient supine with knee slightly flexed (20-30 degrees). Examiner applies varus (laterally directed) force at the knee while stabilizing the ankle.',
    'Benh nhan nam ngua goi gap nhe (20-30 do). Nguoi kiem tra tao luc varus (huong ra ngoai) tai goi trong khi co dinh co chan.',
    'Excessive lateral joint opening indicates LCL injury',
    'Mo khop ben ngoai qua muc chi ra ton thuong day chang ben ngoai',
    'No excessive lateral opening suggests intact LCL',
    'Khong mo qua muc ben ngoai goi y LCL nguyen ven',
    25, NULL
);

-- =============================================================================
-- Seed: Spine Tests (6)
-- =============================================================================

INSERT INTO special_tests (name, name_vi, category, description, description_vi, positive_finding, positive_finding_vi, negative_finding, negative_finding_vi, sensitivity, specificity) VALUES
(
    'Straight Leg Raise (SLR)', 'Test Nang Chan Thang (SLR)', 'spine',
    'Patient supine. Examiner passively raises the patient''s leg with the knee extended. Positive between 30-70 degrees of hip flexion.',
    'Benh nhan nam ngua. Nguoi kiem tra nang thu dong chan benh nhan voi goi duoi thang. Duong tinh giua 30-70 do gap hong.',
    'Radiating pain below the knee between 30-70 degrees suggests lumbar disc herniation (L4-S1 nerve root irritation)',
    'Dau lan toa duoi goi giua 30-70 do goi y thoat vi dia dem that lung (kich thich re than kinh L4-S1)',
    'No radiating pain below the knee rules out significant disc herniation',
    'Khong dau lan toa duoi goi loai tru thoat vi dia dem dang ke',
    91, 26
),
(
    'Slump Test', 'Test Ngoi Cong', 'spine',
    'Patient seated. Sequentially: slump trunk forward, flex cervical spine, extend knee, dorsiflex ankle. Tests neural tension throughout the entire lower limb.',
    'Benh nhan ngoi. Tuan tu: cong than ra truoc, gap cot song co, duoi goi, gap mu co chan. Kiem tra cang than kinh toan bo chi duoi.',
    'Reproduction of radicular symptoms that changes with neck position indicates neural tension/disc pathology',
    'Tai tao trieu chung re than kinh thay doi voi vi tri co chi ra cang than kinh/benh ly dia dem',
    'No symptom reproduction or change with neck position suggests absence of neural tension',
    'Khong tai tao trieu chung hoac thay doi voi vi tri co goi y khong co cang than kinh',
    84, 83
),
(
    'Spurling''s Test', 'Test Spurling', 'spine',
    'Patient seated. Examiner side-bends and extends the cervical spine toward the symptomatic side, then applies axial compression.',
    'Benh nhan ngoi. Nguoi kiem tra nghieng ben va duoi cot song co ve phia ben co trieu chung, sau do tao luc ep doc truc.',
    'Reproduction of radicular arm pain indicates cervical nerve root compression (cervical radiculopathy)',
    'Tai tao dau lan toa canh tay chi ra chon ep re than kinh co (benh ly re than kinh co)',
    'No arm pain reproduction rules out significant cervical radiculopathy',
    'Khong tai tao dau canh tay loai tru benh ly re than kinh co dang ke',
    93, 95
),
(
    'Kemp''s Test', 'Test Kemp', 'spine',
    'Patient standing. Examiner guides patient into combined extension, lateral flexion, and rotation toward the symptomatic side.',
    'Benh nhan dung. Nguoi kiem tra huong dan benh nhan vao duoi ket hop, gap ben, va xoay ve phia ben co trieu chung.',
    'Local lumbar pain suggests facet joint pathology; radiating leg pain suggests foraminal stenosis',
    'Dau that lung tai cho goi y benh ly khop lien mam; dau lan toa chan goi y hep lo lien hop',
    'No pain with combined movement suggests absence of facet or foraminal pathology',
    'Khong dau voi van dong ket hop goi y khong co benh ly khop lien mam hoac lo lien hop',
    NULL, NULL
),
(
    'FABER Test (Patrick''s)', 'Test FABER (Patrick)', 'spine',
    'Patient supine. Place the tested leg in Flexion, ABduction, External Rotation with ankle on opposite knee. Examiner presses down on the tested knee and contralateral ASIS.',
    'Benh nhan nam ngua. Dat chan kiem tra o Gap, Dang, Xoay ngoai voi co chan tren goi doi dien. Nguoi kiem tra an xuong goi kiem tra va gai chau truoc tren doi dien.',
    'Groin pain suggests hip joint pathology; sacroiliac pain suggests SI joint dysfunction',
    'Dau bep chi ra benh ly khop hong; dau chau cung chi ra roi loan chuc nang khop chau cung',
    'No pain in groin or SI region suggests normal hip and SI joint function',
    'Khong dau tai bep hoac vung chau cung goi y chuc nang khop hong va chau cung binh thuong',
    77, 100
),
(
    'Thomas Test', 'Test Thomas', 'spine',
    'Patient supine. Both hips flexed to chest, then one leg lowered toward the table while holding the other to chest.',
    'Benh nhan nam ngua. Ca hai hong gap ve nguc, sau do ha mot chan xuong ban trong khi giu chan kia ap nguc.',
    'Inability to fully extend the hip (thigh remains elevated) indicates hip flexor tightness or contracture',
    'Khong co kha nang duoi hong hoan toan (dui van nang) chi ra cang hoac co rut co gap hong',
    'Full hip extension with thigh resting on table suggests normal hip flexor length',
    'Duoi hong hoan toan voi dui nghi tren ban goi y chieu dai co gap hong binh thuong',
    NULL, NULL
);

-- =============================================================================
-- Seed: Hip Tests (3)
-- =============================================================================

INSERT INTO special_tests (name, name_vi, category, description, description_vi, positive_finding, positive_finding_vi, negative_finding, negative_finding_vi, sensitivity, specificity) VALUES
(
    'FABER Test (Hip)', 'Test FABER (Hong)', 'hip',
    'Patient supine. Tested leg placed in Flexion, ABduction, External Rotation position (figure-4). Overpressure applied to knee and contralateral pelvis.',
    'Benh nhan nam ngua. Chan kiem tra dat o vi tri Gap, Dang, Xoay ngoai (hinh so 4). Tao ap luc len goi va xuong chau doi dien.',
    'Groin pain indicates hip joint pathology (labral tear, osteoarthritis, FAI)',
    'Dau bep chi ra benh ly khop hong (rach sun vien, thoai hoa khop, chon ep o-dui)',
    'No groin pain with full range suggests normal hip joint',
    'Khong dau bep voi tam van dong day du goi y khop hong binh thuong',
    82, 25
),
(
    'FADIR Test', 'Test FADIR', 'hip',
    'Patient supine. Examiner passively flexes, adducts, and internally rotates the hip. Compresses the anterior labrum against the femoral head.',
    'Benh nhan nam ngua. Nguoi kiem tra thu dong gap, khep, va xoay trong hong. Ep sun vien truoc vao chom xuong dui.',
    'Anterior groin pain indicates femoroacetabular impingement (FAI) or labral pathology',
    'Dau bep truoc chi ra chon ep o-dui hoac benh ly sun vien',
    'No pain with combined flexion/adduction/internal rotation suggests absence of FAI',
    'Khong dau voi gap/khep/xoay trong ket hop goi y khong co chon ep o-dui',
    94, 29
),
(
    'Thomas Test (Hip)', 'Test Thomas (Hong)', 'hip',
    'Patient supine at edge of table. Both knees pulled to chest to flatten the lumbar spine. Tested leg lowered toward table while opposite hip remains flexed.',
    'Benh nhan nam ngua tai mep ban. Ca hai goi keo ve nguc de lam phang cot song that lung. Chan kiem tra ha xuong ban trong khi hong doi dien van gap.',
    'Thigh remains above horizontal, indicating hip flexor (iliopsoas) contracture or tightness',
    'Dui nam tren mat phang ngang, chi ra co rut hoac cang co gap hong (that lung chau)',
    'Thigh drops to horizontal or below, suggesting normal hip flexor length',
    'Dui ha xuong mat phang ngang hoac duoi, goi y chieu dai co gap hong binh thuong',
    89, 92
);

-- =============================================================================
-- Seed: Ankle Tests (2)
-- =============================================================================

INSERT INTO special_tests (name, name_vi, category, description, description_vi, positive_finding, positive_finding_vi, negative_finding, negative_finding_vi, sensitivity, specificity) VALUES
(
    'Anterior Drawer Test (Ankle)', 'Test Keo Truoc (Co Chan)', 'ankle',
    'Patient supine or seated with ankle in slight plantarflexion (10-20 degrees). Examiner stabilizes the distal tibia and draws the talus anteriorly.',
    'Benh nhan nam ngua hoac ngoi voi co chan gap long ban chan nhe (10-20 do). Nguoi kiem tra co dinh dau xa xuong chay va keo xuong sen ra truoc.',
    'Excessive anterior talar translation with dimpling indicates anterior talofibular ligament (ATFL) tear',
    'Dich chuyen truoc xuong sen qua muc voi lom da chi ra rach day chang mat ca-mam ngoai truoc (ATFL)',
    'No excessive anterior translation suggests intact ATFL',
    'Khong dich chuyen truoc qua muc goi y ATFL nguyen ven',
    73, 97
),
(
    'Talar Tilt Test', 'Test Nghieng Xuong Sen', 'ankle',
    'Patient supine or seated with ankle in neutral. Examiner inverts the calcaneus while stabilizing the distal tibia to assess calcaneofibular ligament (CFL) integrity.',
    'Benh nhan nam ngua hoac ngoi voi co chan o vi tri trung tinh. Nguoi kiem tra lat trong got chan trong khi co dinh dau xa xuong chay de danh gia tinh toan ven cua day chang got-mam ngoai (CFL).',
    'Excessive inversion compared to opposite side indicates CFL tear',
    'Lat trong qua muc so voi ben doi dien chi ra rach day chang got-mam ngoai',
    'No excessive tilt suggests intact CFL',
    'Khong nghieng qua muc goi y CFL nguyen ven',
    52, 88
);

-- =============================================================================
-- Seed: Elbow Test (1)
-- =============================================================================

INSERT INTO special_tests (name, name_vi, category, description, description_vi, positive_finding, positive_finding_vi, negative_finding, negative_finding_vi, sensitivity, specificity) VALUES
(
    'Cozen''s Test', 'Test Cozen', 'elbow',
    'Patient seated with elbow flexed to 90 degrees and forearm pronated. Patient makes a fist and extends the wrist. Examiner resists wrist extension while palpating the lateral epicondyle.',
    'Benh nhan ngoi khuyu gap 90 do va cang tay sap. Benh nhan nam dam va duoi co tay. Nguoi kiem tra chong luc duoi co tay trong khi so mua ngoai.',
    'Pain at the lateral epicondyle indicates lateral epicondylitis (tennis elbow)',
    'Dau tai mua ngoai chi ra viem mua ngoai (khuyu tay tennis)',
    'No pain at the lateral epicondyle suggests absence of lateral epicondylitis',
    'Khong dau tai mua ngoai goi y khong co viem mua ngoai',
    84, 0
);

COMMIT;
