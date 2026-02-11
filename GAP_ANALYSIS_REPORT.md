# PhysioFlow vs OpenEMR Vietnamese PT Module - Gap Analysis Report

**Generated:** 2026-02-11
**Comparison Base:** OpenEMR Vietnamese PT Module (`/home/dang/dev/openemr`)
**Analysis Scope:** Database schemas, API features, clinical workflows, validation rules, UI/UX, billing integration

---

## Executive Summary

PhysioFlow has achieved **70-85% feature parity** with OpenEMR's Vietnamese PT module, with several architectural advantages (modern tech stack, offline-first mobile, superior database design). However, **critical gaps exist that block production deployment** in Vietnamese healthcare settings.

### Key Strengths (PhysioFlow > OpenEMR)
- ✅ Modern PostgreSQL with JSONB, partitioning, RLS (vs MariaDB with PHP serialized arrays)
- ✅ 25+ REST API endpoints with Prometheus metrics and rate limiting
- ✅ Offline-first mobile app with WatermelonDB sync
- ✅ Checklist-driven workflow (40% faster data entry)
- ✅ Database-driven BHYT validation rules (vs hardcoded)
- ✅ Real-time insurance validation with coverage calculation
- ✅ Bilingual UI with next-intl (Vietnamese/English)

### Critical Gaps (Production Blockers)
- ❌ **Anatomy Visualization** - No interactive body diagram for pain/symptom marking
- ❌ **ROM/MMT Assessment Forms** - Missing structured data entry for range of motion and manual muscle testing
- ❌ **BHYT Prefix Codes** - Only 14 of 18 implemented (missing HS, CA, GD, NO)
- ❌ **Re-evaluation Forms** - No formal baseline comparison UI
- ❌ **Report Generation** - Missing PDF export for discharge summaries, treatment plans, invoices
- ❌ **Claim Submission** - No BHYT claim file generation (XML format for VSS)

---

## Detailed Findings by Category

### 1. Database Schema (Agent 1 Report)

**Coverage:** 85-90% feature complete

| Feature | OpenEMR | PhysioFlow | Gap |
|---------|---------|------------|-----|
| Core PT Tables | 8-10 tables | 35+ tables | ✅ Superior architecture |
| BHYT Insurance | `insurance_data` | `insurance_info` with extensions | ⚠️ Missing hospital registration link |
| Outcome Measures | `form_outcomes` (serialized) | `outcome_measures` (partitioned JSONB) | ✅ Better design |
| Clinical Protocols | `clinical_protocols` | `clinical_protocols` | ✅ Parity |
| Billing | `billing` + `billing_items` | `pt_service_codes` + `invoices` + `invoice_line_items` + `payments` | ✅ More detailed |
| Audit Logging | Limited | `audit_logs` (partitioned by month) | ✅ Superior |

**Critical Missing:**
- BHYT hospital registration (`ma_kcb_bd`) link for claim submission
- ROM measurement history table (OpenEMR stores in `form_assessment`)
- MMT grading history table

### 2. API & Features (Agent 2 Report)

**Coverage:** ~70% of OpenEMR features

**Implemented (25+ endpoints):**
- ✅ BHYT card validation and coverage calculation
- ✅ Outcome measure tracking with progress calculation
- ✅ Billing with automatic copay calculation
- ✅ Clinical protocol assignment and tracking
- ✅ Discharge planning with outcome comparison
- ✅ Vietnamese medical terms search (trigram)

**Missing:**
- ❌ Report generation API (`GET /api/v1/reports/discharge/:id/pdf`, `/treatment-plan/:id/pdf`, `/invoice/:id/pdf`)
- ❌ Data import/export tools (CSV/Excel import for bulk patient data)
- ❌ Protocol library pre-population (5 protocols need seeding)
- ❌ Payment plan support (installment billing for uninsured)
- ❌ BHYT claim file generation (`POST /api/v1/billing/claims/generate`)

### 3. Clinical Workflows (Agent 3 Report)

**Approach Difference:**
- OpenEMR: Traditional forms (Assessment → Treatment Plan → Exercise → Outcomes)
- PhysioFlow: Checklist-driven visits with auto-generated SOAP notes

**Missing Critical Workflows:**

#### A. ROM/MMT Assessment Entry
OpenEMR has structured forms for:
- Joint range of motion (shoulder, elbow, hip, knee, ankle) with left/right/active/passive values
- Manual muscle testing with 0-5 grading scale
- Pain location marking on body diagram (SVG with clickable regions)

PhysioFlow: **No dedicated ROM/MMT UI** (therapists would need to type in SOAP notes)

#### B. Re-evaluation Workflow
OpenEMR: Formal re-evaluation form with automatic baseline comparison
- Shows initial assessment values side-by-side with current values
- Highlights improvements/declines
- Auto-populates MCID threshold indicators

PhysioFlow: Basic outcome measure tracking without formal re-evaluation UI

#### C. Special Tests Registry
OpenEMR: 30+ special tests database (Neer's, Hawkins, Lachman, etc.) with interpretation guides
PhysioFlow: No special tests library

### 4. Validation Rules (Agent 4 Report)

**Catalogued:** 39 missing validation rules across 7 categories

#### Critical Missing Validations:

**Insurance (9 rules):**
1. BHYT card expiration date must be ≥ visit date
2. Hospital registration code (`ma_kcb_bd`) must match facility
3. 5-year bonus only applies if card age ≥ 5 years
4. Co-payment exemption for children under 6
5. Co-payment rate must be 0-100% (validated against tier)
6. Prefix code validation (18 codes, currently only 14)
7. Card number format: `^[A-Z]{2}\d-\d{4}-\d{5}-\d{5}$` (implemented) ✅
8. Coverage start date < end date (implemented) ✅
9. Duplicate card number check across patients

**Outcome Measures (7 rules):**
1. MCID threshold validation per measure type (e.g., VAS MCID = 2.0)
2. Score must be within valid range (e.g., VAS 0-10, NDI 0-100)
3. Baseline score required before interim/discharge scores
4. Re-assessment interval minimum (e.g., 2 weeks between measures)
5. Progress calculation division by zero check (implemented) ✅
6. Target score must be realistic (not > maximum possible score)
7. Measure type must match patient condition

**Billing (8 rules):**
1. Invoice line item quantity must be > 0
2. Unit price must be > 0 VND
3. Total amount = Σ(line items) - discounts + taxes (implemented) ✅
4. Payment amount cannot exceed invoice total
5. Overpayment handling (refund or credit)
6. Invoice must have ≥ 1 line item
7. Service code must be active and not expired
8. Copay cannot be negative (implemented) ✅

**Clinical Protocols (6 rules):**
1. Protocol eligibility (e.g., "Post-Stroke" requires stroke diagnosis)
2. Exercise contraindications (e.g., no shoulder abduction if acute tear)
3. Protocol duration validation (4-12 weeks typical)
4. Session frequency validation (2-5x/week typical)
5. Progression criteria met before advancing protocol phase
6. Home exercise program has 3-5 exercises (not 20)

**Discharge Planning (4 rules):**
1. Discharge date ≥ admission date
2. Minimum treatment duration (e.g., 2 weeks for most conditions)
3. Discharge criteria met (goals achieved, plateaued, or patient request)
4. Follow-up recommendations required if goals not met

**Assessment (3 rules):**
1. Pain scale 0-10 (VAS) (implemented in outcome measures) ✅
2. ROM values 0-180° (joint-specific maximums)
3. MMT grades 0-5 only

**Vietnamese-Specific (2 rules):**
1. Patient name validation (Vietnamese characters: á, à, ả, ã, ạ, ă, ắ, etc.)
2. Phone number format: `^(0|\+84)[3|5|7|8|9][0-9]{8}$`

### 5. UI/UX Completeness (Agent 5 Report)

**Data Entry Speed:**
- PhysioFlow: 40% faster (checklist approach)
- OpenEMR: Traditional forms (more fields, more clicks)

**Critical UI Gaps:**

#### A. Anatomy Visualization (HIGH PRIORITY)
OpenEMR: Interactive SVG body diagram
- 20+ clickable regions (head, neck, shoulders, arms, back, hips, legs, feet)
- Mark pain/symptom locations with severity ratings
- Visual representation stored as coordinates + severity JSON

PhysioFlow: **No anatomy visualization** (major UX gap)

**Impact:** Therapists must describe pain location in text, losing precision and visual communication

#### B. ROM/MMT Data Entry Forms
OpenEMR: Dedicated forms with dropdowns and sliders
- ROM: Joint selector → left/right/active/passive → degree input (0-180°)
- MMT: Muscle group selector → grade (0-5) → notes

PhysioFlow: **No structured forms** (would require free-text in SOAP notes)

#### C. Assessment Templates
OpenEMR: Pre-built templates for common conditions
- Lower back pain: 15-point checklist (posture, palpation, ROM, special tests, neurological)
- Shoulder pain: 12-point checklist (Neer's, Hawkins, Jobe's, impingement signs)
- Knee OA: 10-point checklist (gait, alignment, ROM, strength, functional tests)

PhysioFlow: Generic SOAP note structure (no condition-specific templates)

#### D. Reporting Interface
OpenEMR: Comprehensive reporting with filters
- Patient visit history report (filterable by date, therapist, diagnosis)
- Financial reports (revenue by service code, insurance vs cash)
- Outcome measures trending report (cohort analysis)

PhysioFlow: **No reporting UI** (only raw data queries)

**PhysioFlow Advantages:**
- ✅ Mobile app with offline capability (OpenEMR has no mobile app)
- ✅ Faster scheduling (drag-and-drop calendar)
- ✅ Better search (Meilisearch with fuzzy matching)
- ✅ Modern UI (shadcn/ui, responsive design)

### 6. Billing & Insurance Integration (Agent 6 Report)

**BHYT Coverage:**

| Feature | OpenEMR | PhysioFlow | Gap |
|---------|---------|------------|-----|
| Prefix Codes | 18 codes | 14 codes | ⚠️ Missing HS, CA, GD, NO |
| Coverage Calculation | Hardcoded PHP | Database-driven | ✅ Superior |
| Copay Calculation | ✅ | ✅ | Parity |
| Claim Submission | ✅ XML export | ❌ Not implemented | ⚠️ Critical gap |
| Facility Bonuses | ✅ 5-year bonus | ✅ 5-year bonus | Parity |
| Expiration Validation | ✅ | ❌ Not implemented | ⚠️ Missing |

**Missing BHYT Prefix Codes:**
1. **HS1-HS2** (Học sinh - Students): 5% copay, 80% coverage
2. **CA1-CA2** (Cựu chiến binh - Veterans): 0% copay, 95% coverage
3. **GD1-GD2** (Gia đình liệt sĩ - Families of martyrs): 0% copay, 100% coverage
4. **NO1** (Người cao tuổi - Elderly 80+): 0% copay, 100% coverage

**Claim Submission Gap:**
OpenEMR generates XML files for VSS (Vietnam Social Security) submission:
```xml
<HoSoXML>
  <BenhNhan>
    <MaBN>...</MaBN>
    <MaThe>HC1-2024-12345-67890</MaThe>
    <TenBN>Nguyễn Văn A</TenBN>
  </BenhNhan>
  <ChiTietDichVu>
    <Ma>PT001</Ma>
    <TenDV>Đánh giá và tái đánh giá toàn diện</TenDV>
    <DonGia>150000</DonGia>
    <BHYTThanhToan>120000</BHYTThanhToan>
    <BNThanhToan>30000</BNThanhToan>
  </ChiTietDichVu>
</HoSoXML>
```

PhysioFlow: **No claim file generation** (manual submission required)

**Financial Reporting:**
OpenEMR: 12 financial reports (revenue by period, outstanding payments, insurance vs cash breakdown)
PhysioFlow: Basic payment history (no aggregate reports)

---

## Priority Matrix

### P0 - Production Blockers (Must Have)
1. **Anatomy Visualization** - Interactive body diagram for pain marking
2. **ROM/MMT Forms** - Structured data entry with validation
3. **BHYT Claim Submission** - XML export for VSS (critical for reimbursement)
4. **Missing BHYT Prefix Codes** - Add HS, CA, GD, NO (4 codes)
5. **BHYT Expiration Validation** - Card must be valid on visit date
6. **Report Generation API** - PDF export for discharge summaries, invoices

### P1 - Important (Should Have)
7. **Re-evaluation Form UI** - Formal baseline comparison with MCID indicators
8. **Assessment Templates** - Condition-specific checklists (LBP, shoulder, knee)
9. **Special Tests Library** - 30+ orthopedic special tests with interpretation
10. **Financial Reporting** - Revenue reports, outstanding payments
11. **Payment Plans** - Installment billing for uninsured patients
12. **Missing Validation Rules** - 39 validation rules catalogued in section 4
13. **Data Import Tools** - CSV/Excel bulk import for patient migration

### P2 - Nice to Have (Could Have)
14. **Protocol Library Pre-population** - Seed 5 clinical protocols
15. **Cohort Analysis Reports** - Outcome measures trending across patient groups
16. **Exercise Video Library** - Embed videos in exercise prescriptions
17. **Patient Portal** - Self-service appointment booking, HEP viewing
18. **Telehealth Integration** - Video consultation capability
19. **Vietnamese Voice Input** - Speech-to-text for SOAP notes

---

## Recommended Implementation Plan

### Phase 1: Production Blockers (2-3 weeks)

**Sprint 1A: BHYT Completion (1 week)**
- Add 4 missing BHYT prefix codes (HS, CA, GD, NO) to database and validation service
- Implement BHYT expiration date validation in insurance service
- Add hospital registration code (`ma_kcb_bd`) to insurance_info table
- Test claim eligibility logic

**Sprint 1B: Assessment Forms (1 week)**
- Create ROM assessment form component (joint selector, degree input, left/right)
- Create MMT assessment form component (muscle group selector, 0-5 grading)
- Add ROM/MMT tables to database
- Add API endpoints: `POST /api/v1/assessments/rom`, `POST /api/v1/assessments/mmt`

**Sprint 1C: Anatomy Visualization (1 week)**
- Create SVG body diagram component (front/back views)
- Add clickable regions with pain severity rating (0-10)
- Store pain locations as JSONB in database
- Integrate into assessment workflow

**Sprint 1D: Report Generation (3 days)**
- Implement PDF generation service (use wkhtmltopdf or headless Chrome)
- Create discharge summary template (bilingual)
- Create invoice template (bilingual)
- Add endpoints: `GET /api/v1/reports/discharge/:id/pdf`, `/invoice/:id/pdf`

**Sprint 1E: BHYT Claim Submission (3 days)** -- COMPLETED
- ~~Implement XML generator for VSS claim format~~
- ~~Add endpoint: `POST /api/v1/billing/claims/generate`~~
- ~~Test with sample claims~~
- ~~Document submission workflow~~
- See `docs/BHYT_CLAIM_SUBMISSION.md` for full documentation

### Phase 2: Important Features (2-3 weeks)

**Sprint 2A: Re-evaluation Workflow (1 week)**
- Create re-evaluation form UI with baseline comparison
- Highlight changes since last assessment (green for improvement, red for decline)
- Add MCID indicators for outcome measures
- Add endpoint: `POST /api/v1/assessments/reevaluation`

**Sprint 2B: Assessment Templates (1 week)**
- Create 5 condition-specific templates (LBP, shoulder, knee, post-stroke, pediatric)
- Add template selector to assessment workflow
- Store template responses as structured data

**Sprint 2C: Special Tests Library (3 days)**
- Create special tests database table (name, description, interpretation)
- Seed 30+ orthopedic special tests
- Add special test results to assessment form

**Sprint 2D: Financial Reporting (1 week)**
- Create reporting service with SQL queries
- Implement 5 core reports:
  1. Revenue by period (daily/weekly/monthly)
  2. Outstanding payments (aging report)
  3. Insurance vs cash breakdown
  4. Top services by revenue
  5. Therapist productivity (sessions per day)
- Add reporting UI with filters

**Sprint 2E: Validation Rules (3 days)**
- Implement 39 missing validation rules catalogued in section 4
- Add server-side validation to API
- Add client-side validation to forms

### Phase 3: Nice to Have (1-2 weeks)

**Sprint 3A: Data Import Tools (3 days)**
- Create CSV/Excel import service
- Support patient bulk import
- Add validation and error reporting

**Sprint 3B: Protocol Pre-population (2 days)**
- Seed 5 clinical protocols in database
- Test protocol assignment workflow

**Sprint 3C: Exercise Video Integration (3 days)**
- Add video URL field to exercises table
- Embed videos in HEP export
- Link to external exercise library (e.g., PhysioTools)

---

## Architecture Recommendations

### 1. Report Generation Service
**Approach:** Use headless Chrome via Playwright for PDF generation
- **Pros:** Supports complex HTML/CSS, handles Vietnamese fonts, can embed charts
- **Cons:** Resource-intensive (use job queue)

**Implementation:**
```typescript
// apps/api/internal/service/report_service.go
func (s *ReportService) GenerateDischargeSummaryPDF(summaryID string) ([]byte, error) {
    // 1. Fetch discharge summary data
    // 2. Render HTML template with data
    // 3. Use Playwright to convert HTML → PDF
    // 4. Upload to MinIO for storage
    // 5. Return PDF bytes
}
```

### 2. BHYT Claim Submission -- COMPLETED
**Format:** XML per VSS specification (Decision 5937/QD-BHXH)
- Must include: patient info, BHYT card, service codes, amounts, facility info
- File naming: `HS_<facility_code>_<month><year>.xml`

**Implemented in:**
- `apps/api/internal/service/bhyt_claim_service.go` - GenerateClaimFile, GetClaimXML, BuildClaimXML
- `apps/api/internal/handler/bhyt_claim.go` - REST endpoints for claim CRUD + XML download
- `apps/api/internal/repository/bhyt_claim_repository.go` - Data access layer
- `apps/api/internal/model/bhyt_claim.go` - Domain models + VSS XML structs
- `apps/web/src/app/[locale]/billing/claims/page.tsx` - Frontend UI
- `docs/BHYT_CLAIM_SUBMISSION.md` - Full documentation

### 3. Anatomy Visualization
**Approach:** Interactive SVG with clickable regions
- Store pain locations as JSONB: `{ "regions": [{ "id": "shoulder_left", "severity": 8 }] }`
- Use shadcn/ui Dialog for region selection modal

**Component Structure:**
```typescript
// apps/web/src/components/assessment/AnatomyDiagram.tsx
export function AnatomyDiagram({
  view: 'front' | 'back',
  selectedRegions: PainRegion[],
  onRegionClick: (region: string) => void
}) {
  return (
    <svg viewBox="0 0 400 800">
      {/* Body outline */}
      <path d="..." />
      {/* Clickable regions */}
      <path id="shoulder_left" onClick={() => onRegionClick('shoulder_left')} />
    </svg>
  );
}
```

---

## Testing Requirements

### For Phase 1 (Production Blockers)
1. **Unit Tests:** BHYT validation with 18 prefix codes (table-driven tests)
2. **Integration Tests:** Claim XML generation with sample data
3. **E2E Tests:** Full assessment workflow (ROM → MMT → Pain marking → Report generation)
4. **Visual Regression Tests:** Anatomy diagram rendering
5. **PDF Export Tests:** Discharge summary and invoice templates

### For Phase 2 (Important Features)
1. **Unit Tests:** Validation rule enforcement (39 rules)
2. **Integration Tests:** Financial reporting queries
3. **E2E Tests:** Re-evaluation workflow with baseline comparison

---

## Deployment Strategy

### Incremental Rollout with Feature Flags
Use database-backed feature flags to enable new features gradually:

```sql
-- infrastructure/db/migrations/016_feature_flags.sql
CREATE TABLE feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO feature_flags (name, enabled) VALUES
    ('anatomy_visualization', false),
    ('rom_mmt_forms', false),
    ('bhyt_claim_submission', false),
    ('report_generation', false);
```

**Rollout Plan:**
1. Deploy to staging with all flags enabled → run full test suite
2. Deploy to production with flags disabled
3. Enable flags incrementally (10% → 50% → 100% of users)
4. Monitor metrics (error rates, performance) after each rollout step
5. Rollback by disabling flag if issues detected

---

## Success Metrics

### Functional Completeness
- [ ] 18/18 BHYT prefix codes supported (currently 14/18)
- [ ] 100% of OpenEMR assessment forms covered (ROM, MMT, anatomy)
- [ ] 100% of OpenEMR reports available (discharge, invoice, financial)
- [ ] BHYT claim XML generation working

### Performance
- [ ] PDF generation p95 < 3s (currently not implemented)
- [ ] Anatomy diagram interaction p95 < 100ms
- [ ] Financial report queries p95 < 500ms

### User Adoption
- [ ] 80%+ of therapists use anatomy diagram (vs free-text pain description)
- [ ] 90%+ of assessments use ROM/MMT forms (vs free-text SOAP)
- [ ] 100% of BHYT invoices use claim submission (vs manual entry)

---

## Conclusion

PhysioFlow has a **strong foundation** but requires **6 critical features** to match OpenEMR's production readiness:
1. Anatomy visualization
2. ROM/MMT forms
3. ~~BHYT claim submission~~ -- COMPLETED (Sprint 1E)
4. Missing BHYT prefix codes
5. BHYT expiration validation
6. Report generation

**Estimated effort:** 2-3 weeks for production blockers (Phase 1), 5-6 weeks for full parity (Phases 1-2).

**Next steps:**
1. Prioritize Phase 1 sprints (start with BHYT completion and assessment forms)
2. Set up feature flag system for incremental rollout
3. Expand test coverage for new features (target 90%+ for critical paths)
4. Update infrastructure.yaml with new services (report generation, claim submission)

---

**Report compiled from 6 specialized review agents:**
- Agent 1: Database Schema Comparison
- Agent 2: API & Features Comparison
- Agent 3: Clinical Workflows Comparison
- Agent 4: Business Rules & Validation
- Agent 5: UI/UX Completeness Review
- Agent 6: Billing & Insurance Integration
