# PhysioFlow Gap Analysis - Implementation Checklist

**Start Date:** 2026-02-11
**Target Completion:** Phase 1 by 2026-03-04 (3 weeks)

---

## Phase 1: Production Blockers (Weeks 1-3)

### Sprint 1A: BHYT Completion (Week 1: Feb 11-17)

#### Database Changes
- [ ] Create migration `016_bhyt_hospital_registration.sql`
  - [ ] Add `hospital_registration_code` (ma_kcb_bd) to `insurance_info` table
  - [ ] Add CHECK constraint: `length(hospital_registration_code) = 5`
  - [ ] Add index on hospital_registration_code
- [ ] Create migration `017_bhyt_additional_prefix_codes.sql`
  - [ ] Add 4 new prefix code entries to `bhyt_validation_rules`
    - [ ] HS1, HS2 (students: 5% copay, 80% coverage)
    - [ ] CA1, CA2 (veterans: 0% copay, 95% coverage)
    - [ ] GD1, GD2 (martyrs' families: 0% copay, 100% coverage)
    - [ ] NO1 (elderly 80+: 0% copay, 100% coverage)

#### Go API Changes
- [ ] Update `apps/api/internal/model/insurance.go`
  - [ ] Add `HospitalRegistrationCode` field
  - [ ] Add `ExpirationDate` field
- [ ] Update `apps/api/internal/service/insurance_service.go`
  - [ ] Implement `ValidateExpirationDate(card *InsuranceCard, visitDate time.Time) error`
  - [ ] Update `ValidateCard()` to check expiration against current date
  - [ ] Update prefix code validation to include 18 codes (not 14)
  - [ ] Add facility eligibility check (hospital registration must match)
- [ ] Update `apps/api/internal/repository/insurance_repository.go`
  - [ ] Add `GetBHYTValidationRules()` method (fetch from database)
- [ ] Update `apps/api/internal/handler/insurance.go`
  - [ ] Add validation error responses for expiration/facility mismatch

#### Shared Types
- [ ] Update `packages/shared-types/src/insurance.ts`
  - [ ] Add `hospitalRegistrationCode?: string`
  - [ ] Add `expirationDate: Date`
  - [ ] Add to Zod schema

#### Web Frontend
- [ ] Update `apps/web/src/components/insurance/InsuranceCardForm.tsx`
  - [ ] Add hospital registration code field
  - [ ] Add expiration date picker
  - [ ] Show real-time validation errors
- [ ] Update `apps/web/messages/vi.json` and `messages/en.json`
  - [ ] Add translations for new prefix codes
  - [ ] Add error messages for expiration/facility validation

#### Mobile
- [ ] Update `apps/mobile/lib/database/schema.ts`
  - [ ] Add `hospital_registration_code` and `expiration_date` columns
- [ ] Update `apps/mobile/lib/database/models/InsuranceCard.ts`
  - [ ] Add validation for expiration date
- [ ] Update `apps/mobile/src/screens/patient/InsuranceFormScreen.tsx`
  - [ ] Add form fields for new data

#### Testing
- [ ] `apps/api/internal/service/insurance_service_test.go`
  - [ ] Test all 18 prefix codes (table-driven)
  - [ ] Test expiration date scenarios (valid, expired, future)
  - [ ] Test facility eligibility (matching, mismatched)
- [ ] `apps/api/tests/integration/vietnamese_pt_test.go`
  - [ ] Test `POST /api/v1/patients/:id/insurance/validate` with expired card
  - [ ] Test validation with invalid facility
- [ ] `apps/web/tests/e2e/insurance.spec.ts`
  - [ ] Test form validation for expiration date
  - [ ] Test error display for expired card

#### Documentation
- [ ] Update `GAP_ANALYSIS_REPORT.md` - mark Sprint 1A complete
- [ ] Update `IMPLEMENTATION_CHECKLIST.md` - check off completed items

---

### Sprint 1B: Assessment Forms (Week 2: Feb 18-24)

#### Database Changes
- [ ] Create migration `018_rom_mmt_tables.sql`
  - [ ] Create `rom_assessments` table
    - [ ] Columns: id, patient_id, visit_id, joint, side (left/right), type (active/passive), degree, therapist_id, assessed_at
    - [ ] Index on (patient_id, assessed_at)
  - [ ] Create `mmt_assessments` table
    - [ ] Columns: id, patient_id, visit_id, muscle_group, grade (0-5), notes, therapist_id, assessed_at
    - [ ] Index on (patient_id, assessed_at)
  - [ ] Add CHECK constraints: `degree BETWEEN 0 AND 180`, `grade BETWEEN 0 AND 5`

#### Go API Changes
- [ ] Create `apps/api/internal/model/rom_assessment.go`
  - [ ] Define ROMAssessment struct with validation tags
- [ ] Create `apps/api/internal/model/mmt_assessment.go`
  - [ ] Define MMTAssessment struct with validation tags
- [ ] Create `apps/api/internal/repository/rom_repository.go`
  - [ ] Methods: Create, GetByPatient, GetByVisit, GetHistory
- [ ] Create `apps/api/internal/repository/mmt_repository.go`
  - [ ] Methods: Create, GetByPatient, GetByVisit, GetHistory
- [ ] Create `apps/api/internal/service/rom_service.go`
  - [ ] Business logic: validate degree ranges per joint type
  - [ ] Trending: compare current ROM to baseline
- [ ] Create `apps/api/internal/service/mmt_service.go`
  - [ ] Business logic: validate grade (0-5 only)
  - [ ] Trending: compare current MMT to baseline
- [ ] Create `apps/api/internal/handler/rom.go`
  - [ ] `POST /api/v1/assessments/rom` - Record ROM measurement
  - [ ] `GET /api/v1/assessments/rom/patient/:patientId` - Get ROM history
  - [ ] `GET /api/v1/assessments/rom/patient/:patientId/trending` - ROM trending
- [ ] Create `apps/api/internal/handler/mmt.go`
  - [ ] `POST /api/v1/assessments/mmt` - Record MMT measurement
  - [ ] `GET /api/v1/assessments/mmt/patient/:patientId` - Get MMT history
  - [ ] `GET /api/v1/assessments/mmt/patient/:patientId/trending` - MMT trending
- [ ] Update `apps/api/internal/repository/repository.go` - add ROM/MMT repos
- [ ] Update `apps/api/internal/service/service.go` - add ROM/MMT services
- [ ] Update `apps/api/cmd/api/main.go` - register ROM/MMT routes

#### Shared Types
- [ ] Create `packages/shared-types/src/rom.ts`
  - [ ] ROMAssessment interface, ROMJointType enum, ROMSideType enum
  - [ ] Zod schemas
- [ ] Create `packages/shared-types/src/mmt.ts`
  - [ ] MMTAssessment interface, MMTGrade enum, MMTMuscleGroup enum
  - [ ] Zod schemas

#### Web Frontend
- [ ] Create `apps/web/src/hooks/use-rom.ts`
  - [ ] useCreateROM(), useROMHistory(), useROMTrending()
- [ ] Create `apps/web/src/hooks/use-mmt.ts`
  - [ ] useCreateMMT(), useMMTHistory(), useMMTTrending()
- [ ] Create `apps/web/src/components/assessment/ROMForm.tsx`
  - [ ] Joint selector (shoulder/elbow/wrist/hip/knee/ankle)
  - [ ] Side selector (left/right/bilateral)
  - [ ] Type selector (active/passive)
  - [ ] Degree input (0-180 with validation per joint)
- [ ] Create `apps/web/src/components/assessment/MMTForm.tsx`
  - [ ] Muscle group selector (organized by region)
  - [ ] Grade selector (0-5 with descriptions)
  - [ ] Notes textarea
- [ ] Create `apps/web/src/components/assessment/ROMMMTHistory.tsx`
  - [ ] Table view of ROM/MMT history with trending arrows
- [ ] Update `apps/web/src/app/[locale]/patients/[id]/assessment/page.tsx`
  - [ ] Add ROM/MMT forms to assessment workflow
- [ ] Update i18n files with ROM/MMT translations

#### Mobile
- [ ] Update `apps/mobile/lib/database/schema.ts`
  - [ ] Add `rom_assessments` and `mmt_assessments` tables
- [ ] Create `apps/mobile/lib/database/models/ROMAssessment.ts`
- [ ] Create `apps/mobile/lib/database/models/MMTAssessment.ts`
- [ ] Create `apps/mobile/src/screens/assessment/ROMFormScreen.tsx`
- [ ] Create `apps/mobile/src/screens/assessment/MMTFormScreen.tsx`
- [ ] Update sync service to include ROM/MMT data

#### Testing
- [ ] `apps/api/internal/service/rom_service_test.go`
  - [ ] Test degree validation per joint (shoulder 0-180, hip 0-120, etc.)
  - [ ] Test trending calculations
- [ ] `apps/api/internal/service/mmt_service_test.go`
  - [ ] Test grade validation (reject 5.5, accept 0-5 only)
- [ ] `apps/api/tests/integration/vietnamese_pt_test.go`
  - [ ] Test ROM/MMT endpoint workflows
- [ ] `apps/web/tests/e2e/assessment.spec.ts`
  - [ ] Test full ROM entry workflow
  - [ ] Test full MMT entry workflow

#### Documentation
- [ ] Update `GAP_ANALYSIS_REPORT.md` - mark Sprint 1B complete

---

### Sprint 1C: Anatomy Visualization (Week 2-3: Feb 24-Mar 3)

#### Database Changes
- [x] Create migration `019_pain_locations.sql`
  - [x] Add `pain_locations` JSONB column to `treatment_sessions` table
  - [x] Structure: `{ "regions": [{ "id": "shoulder_left", "severity": 8, "description": "Sharp pain" }] }`

#### Web Frontend (Primary Implementation)
- [x] Create SVG body diagram assets
  - [x] `apps/web/public/anatomy/body-front.svg` - Front view with 30 regions
  - [x] `apps/web/public/anatomy/body-back.svg` - Back view with 28 regions
  - [x] Each region should have unique ID and be clickable
- [x] Create `apps/web/src/components/assessment/AnatomyDiagram.tsx`
  - [x] Props: view (front/back), selectedRegions, onRegionClick
  - [x] Inline SVG with clickable region shapes
  - [x] Highlight selected regions with color intensity by severity
- [x] Create `apps/web/src/components/assessment/PainMarker.tsx`
  - [x] Modal for marking pain on anatomy diagram
  - [x] Severity slider (0-10)
  - [x] Description textarea
  - [x] View toggle (front/back)
- [ ] Update `apps/web/src/app/[locale]/patients/[id]/assessment/page.tsx`
  - [ ] Add "Mark Pain Locations" button
  - [ ] Display marked locations with severity badges
- [x] Update i18n with anatomy region names

#### Shared Types
- [x] Create `packages/shared-types/src/pain-location.ts`
  - [x] Add AnatomyPainLocation interface: `{ id: AnatomyRegionId; severity: number; description?: string }`
  - [x] Add PainLocationData, AnatomyView, AnatomyRegionMeta, ANATOMY_REGIONS
  - [x] Add severity color/label helper functions

#### Go API Changes
- [x] Create `apps/api/internal/model/pain_location.go`
  - [x] Add PainRegion, PainLocationData structs with validation
- [x] Create `apps/api/internal/repository/pain_location_repository.go`
  - [x] UpdatePainLocations, GetPainLocations with postgres and mock implementations
- [x] Create `apps/api/internal/service/pain_location_service.go`
  - [x] Business logic: validate region IDs, severity range, deduplication
- [x] Create `apps/api/internal/handler/pain_location.go`
  - [x] PUT/GET /sessions/:sessionId/pain-locations endpoints
- [x] Register pain location routes in main.go

#### Mobile (Simplified Implementation)
- [x] Create `apps/mobile/src/components/assessment/PainLocationList.tsx`
  - [x] List view (no interactive diagram on mobile due to complexity)
  - [x] Allow manual entry: region selector + severity + description
  - [x] Display marked locations as list items
- [x] Update `apps/mobile/lib/database/schema.ts`
  - [x] Add `pain_locations` column to sessions table

#### Testing
- [x] `apps/web/tests/e2e/assessment.spec.ts`
  - [x] Test clicking region on anatomy diagram
  - [x] Test setting severity
  - [x] Test saving pain locations with visit
- [x] Visual regression test for anatomy diagram rendering

#### Documentation
- [ ] Update `GAP_ANALYSIS_REPORT.md` - mark Sprint 1C complete

---

### Sprint 1D: Report Generation (Week 3: Mar 3-6)

#### Infrastructure Setup
- [ ] ~~Add Playwright to API dependencies for headless Chrome PDF generation~~
  - [ ] ~~Update `apps/api/go.mod` with github.com/playwright-community/playwright-go~~
  - [ ] ~~Install Playwright browsers: `playwright install chromium`~~
- [x] Alternative: Use wkhtmltopdf (lighter weight)
  - [x] Add to Dockerfile: `RUN apk --no-cache add wkhtmltopdf font-noto font-noto-cjk font-noto-extra ttf-dejavu`

#### Database Changes
- [x] Create migration `020_report_templates.sql`
  - [x] Create `report_templates` table for bilingual templates
  - [x] Seed discharge summary template (Vietnamese + English)
  - [x] Seed invoice template (Vietnamese + English)

#### Go API Changes
- [x] Create `apps/api/internal/service/report_service.go`
  - [x] Method: `GenerateDischargeSummaryPDF(summaryID string) ([]byte, error)`
    - [x] Fetch discharge summary data
    - [x] Render HTML template with data
    - [x] Convert HTML → PDF using wkhtmltopdf
    - [ ] Upload to MinIO for storage (deferred to Phase 2)
    - [x] Return PDF bytes
  - [x] Method: `GenerateInvoicePDF(invoiceID string) ([]byte, error)`
    - [x] Fetch invoice data
    - [x] Render HTML template with Vietnamese formatting (VND, dates)
    - [x] Convert to PDF
- [x] Create `apps/api/internal/handler/report.go`
  - [x] `GET /api/v1/reports/discharge/:id/pdf` - Generate and download discharge summary PDF
  - [x] `GET /api/v1/reports/invoice/:id/pdf` - Generate and download invoice PDF
- [x] Create HTML templates
  - [x] `apps/api/templates/discharge_summary_vi.html` (Vietnamese)
  - [x] `apps/api/templates/discharge_summary_en.html` (English)
  - [x] `apps/api/templates/invoice_vi.html` (Vietnamese)
  - [x] `apps/api/templates/invoice_en.html` (English)
  - [x] Use Go html/template for rendering

#### Shared Types
- [x] No changes needed (use existing Discharge and Invoice types)

#### Web Frontend
- [x] Update `apps/web/src/app/[locale]/patients/[id]/discharge/page.tsx`
  - [x] Add "Export PDF" button
  - [x] Call `GET /api/v1/reports/discharge/:id/pdf`
  - [x] Download file with proper filename
- [x] Update `apps/web/src/app/[locale]/billing/invoices/page.tsx`
  - [x] Add "Print Invoice" button
  - [x] Call `GET /api/v1/reports/invoice/:id/pdf`
- [x] Update `apps/web/src/app/[locale]/patients/[id]/billing/page.tsx`
  - [x] Add "Print Invoice" button in table and preview dialog
- [x] Add i18n translations for PDF export strings (vi.json, en.json)

#### Mobile
- [ ] Update discharge and billing screens to include PDF export
  - [ ] Use React Native Share to share PDF file

#### Testing
- [x] `apps/api/internal/service/report_service_test.go`
  - [x] Test formatVND with sample data
  - [x] Test sanitizeFilename
  - [x] Test localizeDischargeReason (all reason types)
  - [x] Test localizeInvoiceStatus (all status types)
- [ ] `apps/api/tests/integration/vietnamese_pt_test.go`
  - [ ] Test `GET /api/v1/reports/discharge/:id/pdf` returns valid PDF
  - [ ] Test `GET /api/v1/reports/invoice/:id/pdf` returns valid PDF
- [ ] Performance test: PDF generation p95 < 3s

#### Documentation
- [ ] Update `GAP_ANALYSIS_REPORT.md` - mark Sprint 1D complete

---

### Sprint 1E: BHYT Claim Submission (Week 3: Mar 6-8)

#### Database Changes
- [x] Create migration `021_claim_submission.sql`
  - [x] Create `bhyt_claims` table
    - [x] Columns: id, clinic_id, facility_code, month, year, file_path, file_name, status (pending/submitted/approved/rejected), totals, created_at, updated_at
  - [x] Create `bhyt_claim_line_items` table
    - [x] Columns: id, claim_id, invoice_id, patient_id, patient_name, bhyt_card_number, service_code, service_name_vi, quantity, unit_price, total_price, insurance_paid, patient_paid, service_date

#### Go API Changes
- [x] Create `apps/api/internal/model/bhyt_claim.go`
  - [x] BHYTClaim struct, BHYTClaimLineItem struct
  - [x] VSS XML structs (HoSoXML, HoSoBenhNhan, ChiTietDichVu) with xml tags
  - [x] GenerateFileName(), request/response types, search params
- [x] Create `apps/api/internal/repository/bhyt_claim_repository.go`
  - [x] Methods: CreateClaim, GetClaimByID, ListClaims, UpdateClaimStatus, CreateLineItems, GetLineItemsByClaimID, GetBillableServices
  - [x] PostgreSQL implementation with full SQL queries
  - [x] Mock implementation for development mode
- [x] Create `apps/api/internal/service/bhyt_claim_service.go`
  - [x] Method: `GenerateClaimFile(clinicID, facilityCode, month, year)`
    - [x] Query all billable services with BHYT coverage for period
    - [x] Build XML structure per VSS spec (Decision 5937/QD-BHXH)
    - [x] Store claim in database with status=pending
    - [x] Return claim with line items
  - [x] Method: `GetClaimXML(claimID)` - generates XML on demand for download
  - [ ] Validate XML against XSD schema (deferred - no XSD available)
  - [ ] Upload XML to MinIO (deferred - download on demand instead)
  - [ ] Method: `SubmitClaim(claimID string) error` (deferred - for future VSS API integration)
- [x] Create `apps/api/internal/handler/bhyt_claim.go`
  - [x] `POST /api/v1/billing/claims/generate` - Generate claim XML file
    - [x] Body: `{ "facility_code": "12345", "month": 2, "year": 2026 }`
  - [x] `GET /api/v1/billing/claims/:id/download` - Download claim XML
  - [x] `GET /api/v1/billing/claims` - List claims with filters
  - [x] `GET /api/v1/billing/claims/:id` - Get single claim with line items
- [x] XML generation via Go `encoding/xml` (programmatic, type-safe; no separate template file needed)

#### Shared Types
- [x] Create `packages/shared-types/src/bhyt-claim.ts`
  - [x] BHYTClaim interface, BHYTClaimLineItem interface
  - [x] API response types (snake_case), search params, list response
  - [ ] Zod schemas (deferred - not used in existing codebase patterns)

#### Web Frontend
- [x] Create `apps/web/src/app/[locale]/billing/claims/page.tsx`
  - [x] Form to generate claim: facility code, month, year (dialog)
  - [x] Table of generated claims with status badges
  - [x] Download button for XML file
  - [x] Filters: status, year
  - [x] Pagination
- [x] Create `apps/web/src/hooks/use-bhyt-claims.ts`
  - [x] useGenerateClaim(), useBHYTClaims(), useDownloadClaim(), useBHYTClaim()
- [x] Update i18n with claim submission translations (en.json + vi.json)

#### Testing
- [x] `apps/api/internal/service/bhyt_claim_service_test.go`
  - [x] Test XML generation with sample data (TestBuildClaimXML, TestMarshalClaimXML)
  - [x] Validate XML structure matches VSS spec
  - [x] Test file naming: `HS_<facility>_<month><year>.xml` (TestGenerateFileName)
  - [x] Test claim generation (TestGenerateClaimFile - multiple patients, no billable, single patient)
  - [x] Test period validation (TestValidateClaimPeriod)
  - [x] Test VND rounding (TestRoundToVNDClaim)
- [ ] `apps/api/tests/integration/vietnamese_pt_test.go` (deferred - requires running DB)
- [ ] Manual test: Upload generated XML to VSS test portal (deferred - no test portal access)

#### Documentation
- [x] Create `docs/BHYT_CLAIM_SUBMISSION.md` - Document VSS XML format and submission workflow
- [x] Update `GAP_ANALYSIS_REPORT.md` - mark Sprint 1E complete
- [x] Update `IMPLEMENTATION_CHECKLIST.md` - mark Sprint 1E complete

---

## Phase 1 Completion Criteria

**All 6 production blockers resolved:**
- ✅ Anatomy visualization working (interactive body diagram)
- ✅ ROM/MMT forms implemented (structured assessment data)
- ✅ BHYT claim submission working (XML export for VSS)
- ✅ All 18 BHYT prefix codes supported
- ✅ BHYT expiration validation implemented
- ✅ Report generation working (PDF export)

**Testing:**
- ✅ Unit test coverage ≥ 90% for new services
- ✅ Integration tests passing for all new endpoints
- ✅ E2E tests covering full workflows (assessment, billing, claims)
- ✅ Performance tests meeting targets (PDF < 3s, validation < 100ms)

**Deployment:**
- ✅ All migrations run successfully on dev/staging
- ✅ Feature flags configured for gradual rollout
- ✅ Monitoring dashboards updated with new metrics
- ✅ Documentation complete (user guides, API docs)

---

## Tracking Progress

### Daily Standup Questions
1. What did I complete yesterday?
2. What will I work on today?
3. Are there any blockers?

### Update This Checklist
```bash
# After completing a task
vim /home/dang/dev/physioflow/IMPLEMENTATION_CHECKLIST.md
# Change [ ] to [x] for completed items

# Commit progress
git add IMPLEMENTATION_CHECKLIST.md
git commit -m "chore: update implementation checklist - Sprint 1A complete"
```

### Generate Progress Report
```bash
# Count completed items
grep -c "\[x\]" /home/dang/dev/physioflow/IMPLEMENTATION_CHECKLIST.md

# Count total items
grep -c "\[ \]" /home/dang/dev/physioflow/IMPLEMENTATION_CHECKLIST.md
```

---

**Last Updated:** 2026-02-11 - Sprint 1C Anatomy Visualization implemented
**Next Review:** After Sprint 1A completion (2026-02-17)
