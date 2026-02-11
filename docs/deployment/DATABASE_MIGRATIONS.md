# Database Migrations Guide

Complete guide for deploying Vietnamese PT features database schema.

## Overview

Vietnamese PT features require 11 new migrations (002-015) that add:
- 13 new tables
- 56 medical terms (seed data)
- 8 PT service codes (seed data)
- 5 clinical protocol templates (seed data)
- 18 BHYT validation rules

---

## Migration Sequence

**IMPORTANT**: Run migrations in order. Each migration declares its dependencies.

| # | Migration File | Description | Tables | Depends On |
|---|----------------|-------------|--------|------------|
| 002 | `002_clinical_schema.sql` | Treatment plans and sessions | 2 | 001 |
| 003 | `003_checklist_schema.sql` | Visit checklists | 3 | 002 |
| 004 | `004_scheduling_schema.sql` | Appointments | 1 | 001 |
| **005** | **`005_bhyt_insurance_enhancement.sql`** | **BHYT card fields** | 0 (extends) | 001 |
| **006** | **`006_outcome_measures_tables.sql`** | **Outcome measures** | 2 | 001 |
| **007** | **`007_billing_tables.sql`** | **Billing system** | 4 | 001 |
| **008** | **`008_clinical_protocols_tables.sql`** | **Protocol templates** | 2 | 001, 002 |
| **009** | **`009_discharge_planning_tables.sql`** | **Discharge plans** | 2 | 001, 002 |
| **010** | **`010_medical_terms_tables.sql`** | **Medical terminology** | 1 | 001 |
| 011 | `011_seed_outcome_measures_library.sql` | Outcome measures library (seed) | 0 | 006 |
| **012** | **`012_seed_pt_service_codes.sql`** | **PT service codes (seed)** | 0 | 007 |
| **013** | **`013_seed_medical_terms.sql`** | **Medical terms (seed)** | 0 | 010 |
| **014** | **`014_seed_clinical_protocols.sql`** | **Protocol templates (seed)** | 0 | 008 |
| **015** | **`015_bhyt_validation_rules.sql`** | **BHYT validation rules** | 1 | 005 |

**Bold** = Vietnamese PT features

---

## Quick Deploy

### Prerequisites

1. **PostgreSQL 16+** installed
2. **Extensions enabled**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "pg_trgm";
   ```
3. **Database created**:
   ```bash
   createdb -U postgres physioflow
   ```

### Automated Deploy

```bash
# From project root
make migrate

# Or manually from infrastructure/db
cd infrastructure/db
for f in migrations/*.sql; do
  psql -U emr -d physioflow -f "$f"
done
```

### Verify Deployment

```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected: 25+ tables including:
-- - insurance_info (extended)
-- - outcome_measures_library
-- - outcome_measures (partitioned)
-- - pt_service_codes
-- - invoices, invoice_line_items, payments
-- - clinical_protocols, patient_protocols
-- - discharge_plans, discharge_summaries
-- - vietnamese_medical_terms
-- - bhyt_validation_rules

-- Check seed data
SELECT COUNT(*) FROM pt_service_codes;          -- Should be 8
SELECT COUNT(*) FROM vietnamese_medical_terms;  -- Should be 56
SELECT COUNT(*) FROM clinical_protocols;        -- Should be 5
SELECT COUNT(*) FROM bhyt_validation_rules;     -- Should be 18
```

---

## Migration Details

### 005: BHYT Insurance Enhancement

**Purpose**: Extends `insurance_info` table with Vietnamese national health insurance fields.

**Changes**:
```sql
ALTER TABLE insurance_info ADD COLUMN bhyt_card_number VARCHAR(15);
ALTER TABLE insurance_info ADD COLUMN bhyt_prefix_code VARCHAR(5);
ALTER TABLE insurance_info ADD COLUMN bhyt_coverage_percent DECIMAL(5,2);
ALTER TABLE insurance_info ADD COLUMN bhyt_copay_rate DECIMAL(5,2);
```

**Constraints**:
- Card format: `^[A-Z]{2}[0-9]{13}$` (e.g., DN1234567890123)
- Prefix format: `^[A-Z]{2}[0-9]{1,2}$` (e.g., DN1, HC2)
- Coverage: 0-100%
- Copay: 0-100%

**Indexes**:
- `idx_insurance_bhyt_card_number` - Fast card lookup
- `idx_insurance_bhyt_prefix` - Prefix filtering

**Rollback**:
```sql
ALTER TABLE insurance_info DROP COLUMN IF EXISTS bhyt_card_number;
ALTER TABLE insurance_info DROP COLUMN IF EXISTS bhyt_prefix_code;
ALTER TABLE insurance_info DROP COLUMN IF EXISTS bhyt_coverage_percent;
ALTER TABLE insurance_info DROP COLUMN IF EXISTS bhyt_copay_rate;
```

---

### 006: Outcome Measures Tables

**Purpose**: Stores outcome measure scores with time-series partitioning.

**Tables Created**:
1. `outcome_measures_library` - Reference library (VAS, NDI, ODI, etc.)
2. `outcome_measures` - Patient measurements (partitioned by year)

**Key Features**:
- **Partitioning**: By year (2024-2030) for performance
- **MCID tracking**: Computed column for clinical significance
- **Bilingual**: English + Vietnamese names

**Partitions**:
```sql
CREATE TABLE outcome_measures_2026 PARTITION OF outcome_measures
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

**Indexes**:
- `idx_outcome_measures_patient_id` - Patient queries
- `idx_outcome_measures_patient_type_date` - Trending queries

**Rollback**:
```sql
DROP TABLE IF EXISTS outcome_measures CASCADE;
DROP TABLE IF EXISTS outcome_measures_library CASCADE;
```

---

### 007: Billing Tables

**Purpose**: Billing with VND currency and BHYT integration.

**Tables Created**:
1. `pt_service_codes` - PT service catalog with VND pricing
2. `invoices` - Patient invoices with insurance/copay split
3. `invoice_line_items` - Line items with per-service coverage
4. `payments` - Payment records with multiple methods

**Key Features**:
- VND currency support (DECIMAL(12,2) for large amounts)
- BHYT coverage flags per service
- Payment methods: cash, card, bank_transfer, momo, zalopay, vnpay, bhyt

**Indexes**:
- `idx_invoices_patient_id` - Patient invoice history
- `idx_invoices_bhyt_claim` - Insurance claim tracking
- `idx_payments_receipt_number` - Receipt lookup

**Rollback**:
```sql
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoice_line_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS pt_service_codes CASCADE;
```

---

### 008: Clinical Protocols Tables

**Purpose**: Evidence-based treatment protocol templates.

**Tables Created**:
1. `clinical_protocols` - Protocol templates (5 seeded)
2. `patient_protocols` - Assigned protocols with progress tracking

**Key Features**:
- **JSONB fields**: Goals, exercises, progression criteria (complex nested data)
- **Bilingual content**: All text in English + Vietnamese
- **Phase tracking**: initial → intermediate → advanced

**JSONB Structure**:
```json
{
  "goals": [
    {
      "type": "short_term",
      "description": "Reduce pain by 50%",
      "description_vi": "Giảm đau 50%",
      "target_timeframe_weeks": 4
    }
  ],
  "exercises": [
    {
      "name": "Pelvic Tilts",
      "name_vi": "Nghiêng xương chậu",
      "sets": 3,
      "reps": 10,
      "phase": "initial"
    }
  ]
}
```

**Indexes**:
- `idx_protocols_category` - Protocol filtering
- `idx_protocols_diagnoses` (GIN) - ICD-10 code search
- `idx_patient_protocols_progress_status` - Progress filtering

**Rollback**:
```sql
DROP TABLE IF EXISTS patient_protocols CASCADE;
DROP TABLE IF EXISTS clinical_protocols CASCADE;
```

---

### 009: Discharge Planning Tables

**Purpose**: Discharge planning with outcome comparisons and HEP.

**Tables Created**:
1. `discharge_plans` - Planning with baseline comparison
2. `discharge_summaries` - Bilingual summaries for export

**Key Features**:
- **Baseline comparison**: Before/after outcome scores
- **HEP exercises**: JSONB array of home exercise program
- **Outcome trending**: Time-series chart data
- **Bilingual**: Summary text in both languages

**JSONB Structure**:
```json
{
  "baseline_comparison": {
    "measures": [
      {
        "name": "NDI",
        "baseline_score": 30,
        "discharge_score": 20,
        "improvement_percent": 33.3,
        "mcid_met": true
      }
    ]
  },
  "hep_exercises": [
    {
      "name": "Pelvic Tilts",
      "name_vi": "Nghiêng xương chậu",
      "sets": 3,
      "reps": 10,
      "frequency": "2x daily"
    }
  ]
}
```

**Rollback**:
```sql
DROP TABLE IF EXISTS discharge_summaries CASCADE;
DROP TABLE IF EXISTS discharge_plans CASCADE;
```

---

### 010: Medical Terms Tables

**Purpose**: Bilingual medical terminology with trigram search.

**Table Created**:
1. `vietnamese_medical_terms` - Medical dictionary

**Key Features**:
- **Trigram search**: Fast autocomplete (GIN indexes)
- **ICD-10 mapping**: Link terms to diagnosis codes
- **Categories**: anatomy, symptom, condition, treatment, assessment
- **Aliases**: Alternative spellings and synonyms

**Indexes**:
- `idx_medical_terms_en_trgm` (GIN) - English autocomplete
- `idx_medical_terms_vi_trgm` (GIN) - Vietnamese autocomplete
- `idx_medical_terms_icd10` - ICD-10 code lookup

**Rollback**:
```sql
DROP TABLE IF EXISTS vietnamese_medical_terms CASCADE;
```

---

### 012: Seed PT Service Codes

**Purpose**: Seeds 8 standard Vietnamese PT service codes.

**Service Codes**:
| Code | Name (EN) | Name (VI) | Price (VND) | BHYT |
|------|-----------|-----------|-------------|------|
| PT001 | Therapeutic Exercise | Tập luyện trị liệu | 250,000 | ✓ |
| PT002 | Manual Therapy | Liệu pháp thủ công | 300,000 | ✓ |
| PT003 | Modalities | Vật lý trị liệu | 200,000 | ✓ |
| PT004 | Gait Training | Tập đi | 250,000 | ✓ |
| PT105 | Initial Evaluation | Đánh giá ban đầu | 500,000 | ✓ |
| PT106 | Re-evaluation | Đánh giá lại | 350,000 | ✓ |
| PT201 | Group Therapy | Liệu pháp nhóm | 150,000 | ✓ |
| PT301 | Home Visit | Thăm khám tại nhà | 600,000 | ✓ |

**Rollback**:
```sql
DELETE FROM pt_service_codes WHERE code IN ('PT001', 'PT002', 'PT003', 'PT004', 'PT105', 'PT106', 'PT201', 'PT301');
```

---

### 013: Seed Medical Terms

**Purpose**: Seeds 56 Vietnamese medical terms across 5 categories.

**Categories**:
- **Anatomy** (14 terms): Vai, Đầu gối, Cột sống, Hông, Mắt cá chân, ...
- **Symptoms** (12 terms): Đau, Cứng khớp, Yếu cơ, Sưng, Tê, ...
- **Conditions** (14 terms): Thoái hóa khớp, Đột quỵ, Đau lưng, ...
- **Treatments** (12 terms): Bài tập, Mát-xa, Nhiệt trị liệu, ...
- **Assessment** (4 terms): Tầm vận động, Kiểm tra sức cơ, ...

**Rollback**:
```sql
TRUNCATE vietnamese_medical_terms;
```

---

### 014: Seed Clinical Protocols

**Purpose**: Seeds 5 evidence-based protocol templates.

**Protocols**:
1. **Lower Back Pain** (Phục hồi đau thắt lưng) - 8 weeks, 3x/week
2. **Shoulder Pain** (Phục hồi đau vai) - 12 weeks, 3x/week
3. **Knee Osteoarthritis** (Quản lý thoái hóa khớp gối) - 8 weeks, 3x/week
4. **Post-Stroke** (Phục hồi sau đột quỵ) - 16 weeks, 5x/week
5. **Pediatric Delay** (Chậm phát triển ở trẻ em) - 24 weeks, 2x/week

**Rollback**:
```sql
DELETE FROM clinical_protocols WHERE protocol_name IN (
  'Lower Back Pain Rehabilitation',
  'Shoulder Pain Rehabilitation',
  'Knee Osteoarthritis Management',
  'Post-Stroke Rehabilitation',
  'Pediatric Development Delay'
);
```

---

### 015: BHYT Validation Rules

**Purpose**: Creates validation rules table and seeds 18 prefix codes.

**Table Created**:
1. `bhyt_validation_rules` - Validation rules per prefix

**Prefix Codes** (18 total across 8 categories):
- **HC**: HC1, HC2, HC3, HC4 (Healthcare workers)
- **DN**: DN1, DN2, DN3 (Enterprise workers)
- **TE**: TE1, TE2, TE3 (Children)
- **CB**: CB1, CB2 (War veterans)
- **XK**: XK1, XK2 (Poor households)
- **NN**: NN1, NN2, NN3 (Farmers/self-employed)
- **TN**: TN1, TN2 (Voluntary)
- **TX**: TX1, TX2 (Social insurance)

**Validation Function**:
```sql
CREATE FUNCTION validate_bhyt_card(p_card_number VARCHAR(15))
RETURNS TABLE (
    is_valid BOOLEAN,
    coverage_percent DECIMAL(5,2),
    copay_rate DECIMAL(5,2),
    beneficiary_category VARCHAR(100)
);
```

**Rollback**:
```sql
DROP FUNCTION IF EXISTS validate_bhyt_card;
DROP TABLE IF EXISTS bhyt_validation_rules CASCADE;
```

---

## Rollback Procedures

### Rollback Single Migration

```bash
# Manually run rollback commands from migration comments
psql -U emr -d physioflow

-- Example: Rollback migration 015
DROP FUNCTION IF EXISTS validate_bhyt_card;
DROP TABLE IF EXISTS bhyt_validation_rules CASCADE;
```

### Rollback All Vietnamese PT Features

**WARNING**: This will delete all data in Vietnamese PT tables.

```sql
-- Drop in reverse dependency order
DROP TABLE IF EXISTS discharge_summaries CASCADE;
DROP TABLE IF EXISTS discharge_plans CASCADE;
DROP TABLE IF EXISTS patient_protocols CASCADE;
DROP TABLE IF EXISTS clinical_protocols CASCADE;
DROP TABLE IF EXISTS bhyt_validation_rules CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoice_line_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS pt_service_codes CASCADE;
DROP TABLE IF EXISTS vietnamese_medical_terms CASCADE;
DROP TABLE IF EXISTS outcome_measures CASCADE;
DROP TABLE IF EXISTS outcome_measures_library CASCADE;

-- Remove BHYT columns from insurance_info
ALTER TABLE insurance_info DROP COLUMN IF EXISTS bhyt_card_number;
ALTER TABLE insurance_info DROP COLUMN IF EXISTS bhyt_prefix_code;
ALTER TABLE insurance_info DROP COLUMN IF EXISTS bhyt_coverage_percent;
ALTER TABLE insurance_info DROP COLUMN IF EXISTS bhyt_copay_rate;
ALTER TABLE insurance_info DROP COLUMN IF EXISTS version;
```

---

## Backup Strategy

### Before Migration

```bash
# Full database backup
pg_dump -U emr -d physioflow -F c -f physioflow_backup_$(date +%Y%m%d_%H%M%S).dump

# Or specific tables
pg_dump -U emr -d physioflow \
  -t insurance_info \
  -t patients \
  -F c -f pre_migration_backup.dump
```

### Restore from Backup

```bash
# Full restore
pg_restore -U emr -d physioflow_restore physioflow_backup_20260211_100000.dump

# Specific table restore
pg_restore -U emr -d physioflow -t insurance_info pre_migration_backup.dump
```

---

## Data Seeding

### Development Environment

```bash
# Seed all Vietnamese PT data
cd infrastructure/db/seeds
psql -U emr -d physioflow -f development_data.sql
```

### Production Environment

**IMPORTANT**: Review seed data before applying to production.

```bash
# Seed only reference data (no test patients)
psql -U emr -d physioflow -f migrations/012_seed_pt_service_codes.sql
psql -U emr -d physioflow -f migrations/013_seed_medical_terms.sql
psql -U emr -d physioflow -f migrations/014_seed_clinical_protocols.sql
psql -U emr -d physioflow -f migrations/015_bhyt_validation_rules.sql
```

---

## Troubleshooting

### Migration Fails with "relation already exists"

**Cause**: Migration ran partially before failure.

**Solution**:
```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'pt_service_codes'
);

-- Drop and re-run if needed
DROP TABLE IF EXISTS pt_service_codes CASCADE;
-- Then re-run migration
```

### Extension Not Found

**Symptom**: `ERROR: extension "pg_trgm" does not exist`

**Solution**:
```sql
-- As superuser
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Partition Already Exists

**Symptom**: `ERROR: relation "outcome_measures_2026" already exists`

**Solution**:
```sql
-- Drop partition and recreate
DROP TABLE IF EXISTS outcome_measures_2026;
-- Re-run migration
```

### Seed Data Constraint Violation

**Symptom**: `ERROR: duplicate key value violates unique constraint`

**Solution**:
```sql
-- Clear existing seed data
DELETE FROM pt_service_codes WHERE code LIKE 'PT%';
-- Re-run seed
```

---

## Performance Considerations

### Index Creation Time

Large tables may take time to index:
- `outcome_measures`: ~10 seconds per partition per index
- `vietnamese_medical_terms` (trigram): ~5 seconds per GIN index

**Monitor progress**:
```sql
SELECT * FROM pg_stat_progress_create_index;
```

### Partition Pruning

Verify partitions are properly pruned:
```sql
EXPLAIN SELECT * FROM outcome_measures
WHERE measurement_date BETWEEN '2026-01-01' AND '2026-12-31';

-- Should show: Seq Scan on outcome_measures_2026
-- NOT scanning all partitions
```

---

## Monitoring

### Check Migration Status

```sql
-- List all tables
SELECT table_name, table_rows
FROM information_schema.tables
LEFT JOIN (
  SELECT schemaname, tablename, n_live_tup as table_rows
  FROM pg_stat_user_tables
) AS row_counts
ON table_name = tablename
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check indexes
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### Performance Metrics

```sql
-- Most scanned tables
SELECT schemaname, tablename, seq_scan, seq_tup_read, idx_scan, idx_tup_fetch
FROM pg_stat_user_tables
ORDER BY seq_scan DESC;

-- Missing indexes (high seq_scan, low idx_scan)
SELECT tablename, seq_scan, idx_scan, seq_scan - idx_scan AS too_much_seq
FROM pg_stat_user_tables
WHERE seq_scan - idx_scan > 0
ORDER BY too_much_seq DESC;
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Database Migrations

on:
  push:
    branches: [main]
    paths:
      - 'infrastructure/db/migrations/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Run migrations
        run: |
          for f in infrastructure/db/migrations/*.sql; do
            psql -h localhost -U postgres -d physioflow -f "$f"
          done

      - name: Verify tables
        run: |
          psql -h localhost -U postgres -d physioflow \
            -c "SELECT COUNT(*) FROM pt_service_codes;"
```

---

## References

- [PostgreSQL Partitioning](https://www.postgresql.org/docs/16/ddl-partitioning.html)
- [Trigram Indexes](https://www.postgresql.org/docs/16/pgtrgm.html)
- [Vietnamese Health Insurance Law](https://bhxh.gov.vn/)

---

**Last Updated**: February 11, 2026
**Database Version**: PostgreSQL 16
**Total Migrations**: 15 (including Vietnamese PT features)
