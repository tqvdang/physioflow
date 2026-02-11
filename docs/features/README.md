# Vietnamese PT Features Documentation

Complete documentation for Vietnamese-specific physical therapy features in PhysioFlow.

## Feature Overview

PhysioFlow includes 6 major Vietnamese healthcare features:

1. **[BHYT Insurance](./BHYT_INSURANCE.md)** - Vietnamese national health insurance integration
2. **[Outcome Measures](./OUTCOME_MEASURES.md)** - 8 standardized PT assessment tools
3. **[Billing](./BILLING.md)** - VND-based billing with BHYT integration
4. **[Clinical Protocols](./CLINICAL_PROTOCOLS.md)** - 5 evidence-based treatment protocols
5. **[Discharge Planning](./DISCHARGE_PLANNING.md)** - Bilingual discharge summaries with HEP
6. **[Medical Terminology](./MEDICAL_TERMINOLOGY.md)** - 56 Vietnamese medical terms with autocomplete

## Quick Links

### By User Role

**Therapists**:
- [Outcome Measures](./OUTCOME_MEASURES.md) - Recording and tracking patient progress
- [Clinical Protocols](./CLINICAL_PROTOCOLS.md) - Using protocol templates
- [Discharge Planning](./DISCHARGE_PLANNING.md) - Creating discharge summaries

**Front Desk Staff**:
- [BHYT Insurance](./BHYT_INSURANCE.md) - Validating insurance cards
- [Billing](./BILLING.md) - Creating invoices and processing payments

**Clinic Admins**:
- [Service Code Management](../admin-guides/SERVICE_CODE_MANAGEMENT.md) - Managing PT service codes
- All feature documentation for oversight

### By Workflow

**Patient Intake**:
1. [BHYT Insurance](./BHYT_INSURANCE.md#validate-bhyt-card) - Validate insurance card
2. [Medical Terminology](./MEDICAL_TERMINOLOGY.md#autocomplete) - Search diagnoses

**Treatment Session**:
1. [Outcome Measures](./OUTCOME_MEASURES.md#record-measure) - Assess patient
2. [Clinical Protocols](./CLINICAL_PROTOCOLS.md#assign-protocol) - Follow protocol
3. [Billing](./BILLING.md#calculate-billing) - Calculate session cost

**Discharge**:
1. [Outcome Measures](./OUTCOME_MEASURES.md#calculate-progress) - Measure progress
2. [Discharge Planning](./DISCHARGE_PLANNING.md#create-discharge-plan) - Create plan
3. [Discharge Planning](./DISCHARGE_PLANNING.md#generate-summary) - Export summary

## Feature Matrix

| Feature | Database Tables | API Endpoints | Frontend Components | Mobile Support | Offline Capable |
|---------|-----------------|---------------|---------------------|----------------|-----------------|
| BHYT Insurance | 2 | 5 | 3 | ✓ | ✓ |
| Outcome Measures | 2 | 5 | 4 | ✓ | ✓ |
| Billing | 4 | 6 | 5 | ✓ | Partial |
| Clinical Protocols | 2 | 5 | 4 | ✓ | ✓ |
| Discharge Planning | 2 | 5 | 4 | ✓ | Partial |
| Medical Terminology | 1 | 5 | 2 | ✓ | Cache only |

## Integration Points

### BHYT → Billing
Insurance coverage automatically calculates patient copay in invoices.

```
BHYT Card (DN1, 80% coverage)
  ↓
Billing Calculation
  ↓
Invoice (Insurance: 80%, Patient: 20%)
```

### Outcome Measures → Discharge Planning
Progress data populates baseline vs discharge comparisons.

```
Outcome Measures (NDI: 30 → 20)
  ↓
Progress Calculation (33% improvement, MCID met)
  ↓
Discharge Summary (Clinically significant improvement)
```

### Clinical Protocols → Outcome Measures
Protocols define which outcomes to track and when.

```
Protocol: Lower Back Pain
  ↓
Scheduled Outcomes: ODI at weeks 0, 4, 8
  ↓
Auto-remind therapist to measure
```

### Medical Terms → All Features
Autocomplete provides consistent terminology across system.

```
Search: "đau lưng" (back pain)
  ↓
Suggestions: Đau thắt lưng (M54.5), Thoát vị đĩa đệm (M51.1)
  ↓
Used in: Diagnoses, Notes, Protocols, Discharge
```

## Performance Metrics

Based on load testing (see [Performance Testing](../deployment/PERFORMANCE_BENCHMARKS.md)):

| Feature | Target p95 | Actual p95 | RPS Target | Status |
|---------|-----------|-----------|------------|--------|
| BHYT Validation | < 100ms | 45ms | 100 | ✓ Pass |
| Outcome Progress | < 500ms | 280ms | 50 | ✓ Pass |
| Billing Calculation | < 200ms | 95ms | 100 | ✓ Pass |
| Medical Term Search | < 200ms | 120ms | 200 | ✓ Pass |
| Discharge PDF | < 3s | 1.8s | 10 | ✓ Pass |

## Database Migrations

These features require 11 new database migrations (002-012):

| Migration | Description | Tables Created | Depends On |
|-----------|-------------|----------------|------------|
| 005 | BHYT Insurance Enhancement | insurance_info extensions | 001 |
| 006 | Outcome Measures Tables | outcome_measures_library, outcome_measures | 001 |
| 007 | Billing Tables | pt_service_codes, invoices, payments | 001 |
| 008 | Clinical Protocols Tables | clinical_protocols, patient_protocols | 001, 002 |
| 009 | Discharge Planning Tables | discharge_plans, discharge_summaries | 001, 002 |
| 010 | Medical Terms Tables | vietnamese_medical_terms | 001 |
| 012 | Seed PT Service Codes | (seed data) | 007 |
| 013 | Seed Medical Terms | (seed data) | 010 |
| 014 | Seed Clinical Protocols | (seed data) | 008 |
| 015 | BHYT Validation Rules | bhyt_validation_rules | 005 |

See [Database Migrations](../deployment/DATABASE_MIGRATIONS.md) for detailed migration guide.

## API Endpoints

Total: 25+ Vietnamese PT endpoints across 6 features.

See [Vietnamese PT API Reference](../api/VIETNAMESE_PT_ENDPOINTS.md) for complete documentation.

## Testing Coverage

- **Unit Tests**: 95%+ coverage (Go backend, TypeScript frontend)
- **Integration Tests**: 31 endpoints tested
- **E2E Tests**: 12 user workflows tested
- **Load Tests**: 5 features tested under realistic load
- **Performance Tests**: Database queries optimized, no N+1 queries

See [Test Coverage Report](../../apps/api/tests/integration/ENDPOINTS_TESTED.md) for details.

## Deployment Guide

### Prerequisites

1. PostgreSQL 16+ with pg_trgm extension
2. Run all migrations in order (002-015)
3. Seed reference data (012-014)
4. Configure environment variables
5. Import Keycloak realm configuration

### Quick Deploy

```bash
# Run migrations
make migrate

# Seed data
make seed

# Start services
make dev

# Verify features
make test-api
```

See [Deployment Guide](../deployment/DATABASE_MIGRATIONS.md) for full instructions.

## User Guides

- **[Therapist Guide](../user-guides/THERAPIST_GUIDE.md)** (Vietnamese + English)
  - Patient management
  - Session documentation
  - Outcome tracking
  - Discharge planning

- **[Admin Guide](../admin-guides/SERVICE_CODE_MANAGEMENT.md)**
  - Service code management
  - BHYT rule configuration
  - Protocol template customization
  - Outcome measure library

## Troubleshooting

### Common Issues

1. **BHYT validation fails**: Check [BHYT Insurance Troubleshooting](./BHYT_INSURANCE.md#troubleshooting)
2. **Outcome MCID not calculating**: See [Outcome Measures Troubleshooting](./OUTCOME_MEASURES.md#troubleshooting)
3. **Billing calculation mismatch**: Review [Billing Troubleshooting](./BILLING.md#troubleshooting)
4. **Protocol not progressing**: Check [Clinical Protocols Troubleshooting](./CLINICAL_PROTOCOLS.md#troubleshooting)
5. **Discharge PDF generation slow**: See [Performance Optimization](../deployment/PERFORMANCE_BENCHMARKS.md)

### Support

For feature-specific questions:
- Check feature documentation (this directory)
- Review API reference documentation
- Check test files for usage examples
- Open GitHub issue with `feature:vietnamese-pt` label

## References

### Vietnamese Healthcare Regulations

- **BHYT Law 2008**: Legal framework for Vietnamese health insurance
- **Decree 146/2018/NĐ-CP**: BHYT coverage and reimbursement rates
- **Circular 14/2019/TT-BYT**: Healthcare service pricing
- **Circular 46/2018/TT-BYT**: Physical therapy service standards

### Clinical Guidelines

- **VPTA Guidelines**: Vietnam Physical Therapy Association standards
- **MOH PT Standards**: Ministry of Health PT practice guidelines
- **WHO Rehabilitation**: World Health Organization rehabilitation frameworks

### Technical References

- **PostgreSQL**: Partitioning, indexing, trigram search
- **Go Echo Framework**: REST API patterns
- **React Query**: Server state management
- **WatermelonDB**: Offline-first mobile database

## Contributing

When adding new Vietnamese PT features:

1. **Documentation First**: Write feature documentation before coding
2. **Bilingual Support**: All user-facing text must have Vietnamese translation
3. **Database Design**: Use proper indexes, partitioning, and constraints
4. **API Design**: Follow REST conventions, include Vietnamese field names
5. **Testing**: Write unit, integration, e2e, and load tests
6. **Performance**: Meet p95 latency targets from load testing

See [Contributing Guide](../../CONTRIBUTING.md) for general guidelines.

## Changelog

### Version 0.1.0 (February 2026)
- Initial release of 6 Vietnamese PT features
- 25+ API endpoints implemented
- 11 database migrations
- 56 medical terms seeded
- 8 outcome measures supported
- 18 BHYT prefix codes validated
- 8 PT service codes standardized
- 5 clinical protocol templates

---

**Last Updated**: February 11, 2026
**Maintained By**: PhysioFlow Development Team
**Feedback**: Open GitHub issue with your questions or suggestions
