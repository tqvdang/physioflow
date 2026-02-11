# PhysioFlow Gap Analysis - Quick Reference

**Status:** 70-85% feature parity with OpenEMR Vietnamese PT module
**Last Updated:** 2026-02-11

## 🚨 Production Blockers (P0)

| # | Feature | Impact | Effort | Status |
|---|---------|--------|--------|--------|
| 1 | **Anatomy Visualization** | High - Visual pain marking critical for documentation | 1 week | ❌ Not started |
| 2 | **ROM/MMT Forms** | High - Structured assessment data required | 1 week | ❌ Not started |
| 3 | **BHYT Claim Submission** | Critical - Required for insurance reimbursement | 3 days | ❌ Not started |
| 4 | **Missing BHYT Prefix Codes** | High - 4 codes missing (HS, CA, GD, NO) | 1 week | ❌ Not started |
| 5 | **BHYT Expiration Validation** | High - Invalid cards accepted currently | 3 days | ❌ Not started |
| 6 | **Report Generation (PDF)** | High - Discharge summaries, invoices need export | 3 days | ❌ Not started |

**Total Estimated Effort:** 2-3 weeks

---

## 📊 Feature Coverage Matrix

| Domain | OpenEMR | PhysioFlow | Coverage | Critical Gaps |
|--------|---------|------------|----------|---------------|
| **Database** | 8-10 PT tables | 35+ tables | 85% | ⚠️ Hospital registration link |
| **BHYT Insurance** | 18 prefix codes | 14 prefix codes | 78% | ❌ Missing HS/CA/GD/NO, no expiration check |
| **Assessment Forms** | ROM/MMT/Anatomy | SOAP notes only | 30% | ❌ No structured ROM/MMT, no anatomy diagram |
| **Outcome Measures** | Basic tracking | Advanced with MCID | 90% | ⚠️ No formal re-evaluation UI |
| **Billing** | Basic + Claims | Advanced - Claims | 80% | ❌ No claim XML generation |
| **Clinical Protocols** | 5 templates | 5 templates (not seeded) | 90% | ⚠️ Need seeding |
| **Reporting** | 12 reports | 0 reports | 0% | ❌ No PDF generation, no financial reports |
| **Mobile** | None | Full offline app | 100% | ✅ Superior |

---

## 🎯 Implementation Roadmap

### Phase 1: Production Blockers (Weeks 1-3)
```
Week 1: BHYT Completion
  ├─ Add 4 missing prefix codes (HS, CA, GD, NO)
  ├─ Implement expiration validation
  ├─ Add hospital registration code field
  └─ Test claim eligibility logic

Week 2: Assessment Forms + Anatomy
  ├─ Create ROM form (joint selector, degree input)
  ├─ Create MMT form (muscle group, 0-5 grading)
  ├─ Build SVG anatomy diagram (clickable regions)
  └─ Add database tables + API endpoints

Week 3: Reports + Claims
  ├─ Implement PDF generation (discharge, invoice)
  ├─ Create BHYT claim XML generator
  └─ Test full billing → claim workflow
```

### Phase 2: Important Features (Weeks 4-6)
- Re-evaluation form with baseline comparison
- Condition-specific assessment templates (LBP, shoulder, knee)
- Special tests library (30+ tests)
- Financial reporting (5 core reports)
- 39 missing validation rules

### Phase 3: Nice to Have (Weeks 7-8)
- Data import tools (CSV/Excel)
- Protocol pre-population
- Exercise video integration

---

## 🔍 Missing Validation Rules (39 Total)

### By Category
- **Insurance:** 9 rules (expiration, duplicate cards, exemptions)
- **Outcome Measures:** 7 rules (MCID thresholds, score ranges)
- **Billing:** 8 rules (quantity > 0, overpayment handling)
- **Clinical Protocols:** 6 rules (eligibility, contraindications)
- **Discharge:** 4 rules (minimum duration, criteria)
- **Assessment:** 3 rules (ROM 0-180°, MMT 0-5)
- **Vietnamese-Specific:** 2 rules (name chars, phone format)

**See full list:** GAP_ANALYSIS_REPORT.md Section 4

---

## 📈 Success Criteria

### Functional
- [ ] 18/18 BHYT prefix codes (currently 14/18)
- [ ] 100% assessment forms (ROM, MMT, anatomy)
- [ ] BHYT claim XML generation working
- [ ] PDF reports for discharge + invoices

### Performance
- [ ] PDF generation p95 < 3s
- [ ] Anatomy interaction p95 < 100ms
- [ ] Financial reports p95 < 500ms

### Adoption
- [ ] 80%+ therapists use anatomy diagram
- [ ] 90%+ assessments use ROM/MMT forms
- [ ] 100% BHYT invoices use claim submission

---

## 🛠️ Quick Start Commands

### Review Full Report
```bash
cat /home/dang/dev/physioflow/GAP_ANALYSIS_REPORT.md
```

### Start Phase 1 Implementation
```bash
# 1. Create feature branch
git checkout -b feature/gap-analysis-phase1

# 2. Start with BHYT completion
cd /home/dang/dev/physioflow
# Follow Sprint 1A in GAP_ANALYSIS_REPORT.md

# 3. Run tests after each sprint
make test-all
```

### Deploy with Feature Flags
```bash
# Enable features incrementally
psql -U emr -d physioflow -c "UPDATE feature_flags SET enabled = true WHERE name = 'anatomy_visualization';"
```

---

## 📚 Key References

- **Full Report:** `GAP_ANALYSIS_REPORT.md`
- **OpenEMR Base:** `/home/dang/dev/openemr`
- **Plan File:** `/home/dang/.claude/plans/snuggly-churning-alpaca.md`
- **Infrastructure:** `/home/dang/dev/infrastructure.yaml`

---

## 🚀 Next Actions

1. **Prioritize:** Review P0 blockers with stakeholders
2. **Sprint Planning:** Break down Phase 1 into daily tasks
3. **Feature Flags:** Deploy flag system for incremental rollout
4. **Testing:** Expand test coverage for new features (90%+ target)
5. **Monitoring:** Add metrics for new features (anatomy clicks, ROM entries, claim generation)

---

**Note:** This is a living document. Update as gaps are addressed.
