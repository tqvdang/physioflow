# Database Migration Rollback Procedures

This document describes rollback procedures for PhysioFlow database migrations.

## General Rollback Process

1. **Stop application traffic** - Scale down deployments or switch service selector to old version
2. **Restore database backup** - Use the pre-migration backup
3. **Verify data integrity** - Check critical tables and relationships
4. **Resume application traffic** - Scale up or switch service selector back

## Automated Rollback

```bash
# Rollback to a specific backup
./infrastructure/homelab/scripts/db-rollback.sh prod <backup-name>

# Example
./infrastructure/homelab/scripts/db-rollback.sh prod prod_pre-migration-v1.2.3_20260211_120000
```

## Migration-Specific Rollback Procedures

### Migration 027: Feature Flags Table

**Added**: `feature_flags` and `feature_flag_audit_log` tables

**Rollback SQL**:
```sql
BEGIN;

DROP TRIGGER IF EXISTS trigger_update_feature_flags_updated_at ON feature_flags;
DROP FUNCTION IF EXISTS update_feature_flags_updated_at();
DROP TABLE IF EXISTS feature_flag_audit_log;
DROP TABLE IF EXISTS feature_flags;

DELETE FROM schema_migrations WHERE version = '027';

COMMIT;
```

**Impact**: Removes feature flag functionality. Application must not depend on feature flags table.

### Migration 026: Add Version Column

**Added**: `version` column to `schema_migrations`

**Rollback SQL**:
```sql
BEGIN;

ALTER TABLE schema_migrations DROP COLUMN IF EXISTS version;

COMMIT;
```

**Impact**: Minimal - only affects migration tracking.

### Migration 025: Reporting Views

**Added**: Materialized views for reporting

**Rollback SQL**:
```sql
BEGIN;

DROP MATERIALIZED VIEW IF EXISTS mv_therapist_productivity;
DROP MATERIALIZED VIEW IF EXISTS mv_diagnosis_statistics;
DROP MATERIALIZED VIEW IF EXISTS mv_treatment_outcomes;
DROP MATERIALIZED VIEW IF EXISTS mv_insurance_claims_summary;

DELETE FROM schema_migrations WHERE version = '025';

COMMIT;
```

**Impact**: Removes reporting views. Reports may fail or run slower.

### Migration 024: Special Tests

**Added**: Special test templates and results tables

**Rollback SQL**:
```sql
BEGIN;

DROP TABLE IF EXISTS special_test_results CASCADE;
DROP TABLE IF EXISTS special_test_templates CASCADE;

DELETE FROM schema_migrations WHERE version = '024';

COMMIT;
```

**Impact**: Loses special test data. Export data before rollback if needed.

### Migration 023: Assessment Templates

**Added**: Assessment template system

**Rollback SQL**:
```sql
BEGIN;

DROP TABLE IF EXISTS patient_assessment_templates CASCADE;
DROP TABLE IF EXISTS assessment_templates CASCADE;

DELETE FROM schema_migrations WHERE version = '023';

COMMIT;
```

**Impact**: Loses assessment template configurations.

### Migration 022: Reevaluation Assessments

**Added**: Reevaluation tracking tables

**Rollback SQL**:
```sql
BEGIN;

DROP TABLE IF EXISTS reevaluation_assessments CASCADE;

DELETE FROM schema_migrations WHERE version = '022';

COMMIT;
```

**Impact**: Loses reevaluation data.

### Migration 021: Claim Submission

**Added**: BHYT claim submission tracking

**Rollback SQL**:
```sql
BEGIN;

DROP TABLE IF EXISTS bhyt_claim_submissions CASCADE;
DROP TABLE IF EXISTS bhyt_claim_items CASCADE;

DELETE FROM schema_migrations WHERE version = '021';

COMMIT;
```

**Impact**: Loses claim submission history. Export before rollback.

### Migration 020: Report Templates

**Added**: Report template system

**Rollback SQL**:
```sql
BEGIN;

DROP TABLE IF EXISTS report_templates CASCADE;

DELETE FROM schema_migrations WHERE version = '020';

COMMIT;
```

**Impact**: Loses report templates.

### Migration 019: Pain Locations

**Added**: Pain location tracking

**Rollback SQL**:
```sql
BEGIN;

DROP TABLE IF EXISTS pain_locations CASCADE;

DELETE FROM schema_migrations WHERE version = '019';

COMMIT;
```

**Impact**: Loses pain location data.

### Migration 018: ROM/MMT Tables

**Added**: Range of Motion and Manual Muscle Testing tables

**Rollback SQL**:
```sql
BEGIN;

DROP TABLE IF EXISTS mmt_assessments CASCADE;
DROP TABLE IF EXISTS rom_assessments CASCADE;

DELETE FROM schema_migrations WHERE version = '018';

COMMIT;
```

**Impact**: Loses ROM/MMT assessment data.

## Emergency Rollback Checklist

- [ ] Notify team of rollback decision
- [ ] Stop incoming traffic (scale deployments to 0 or switch to maintenance page)
- [ ] Create emergency backup (if not already done)
- [ ] Run rollback script or manual SQL
- [ ] Verify database connectivity and schema
- [ ] Run smoke tests
- [ ] Restore traffic
- [ ] Document what went wrong
- [ ] Plan fix and re-deployment

## Backup Verification

Before any migration, verify backups exist:

```bash
# List recent backups
mc ls trancloud/physioflow-backups-prod

# Download and verify a backup
mc cp trancloud/physioflow-backups-prod/prod_pre-migration-v1.2.3_20260211_120000.tar.gz /tmp/
tar -tzf /tmp/prod_pre-migration-v1.2.3_20260211_120000.tar.gz
```

## Data Export Before Risky Migrations

For migrations that drop or modify critical data:

```bash
# Export specific tables
pg_dump -h 192.168.10.24 -U emr -d physioflow_prod \
  -t feature_flags \
  -t feature_flag_audit_log \
  --data-only \
  -f /tmp/feature_flags_export.sql
```

## Testing Rollback Procedures

Always test rollback in dev/staging before production:

```bash
# Test in dev
./infrastructure/homelab/scripts/db-backup.sh dev test-rollback
./infrastructure/homelab/scripts/db-rollback.sh dev dev_test-rollback_<timestamp>
```

## Contact and Escalation

If rollback fails:
1. Check database logs: `kubectl logs -n physioflow-prod <postgres-pod>`
2. Verify backup integrity
3. Consider point-in-time recovery
4. Document all steps taken

## Version Compatibility Matrix

| App Version | Min DB Version | Max DB Version |
|-------------|----------------|----------------|
| v1.3.x      | 027            | latest         |
| v1.2.x      | 020            | 026            |
| v1.1.x      | 015            | 019            |
| v1.0.x      | 001            | 014            |

Never rollback database beyond application compatibility.
