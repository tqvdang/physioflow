# Database Migration Rollback Scripts

This directory contains rollback (down) scripts for database migrations.

## Purpose

Each rollback script reverses the changes made by its corresponding forward migration, allowing safe rollback to previous database states.

## Naming Convention

Rollback scripts follow the pattern: `<migration_number>_down.sql`

- `005_down.sql` - Rollback for `005_bhyt_insurance_enhancement.sql`
- `006_down.sql` - Rollback for `006_outcome_measures_tables.sql`
- etc.

## Usage

### Automatic Rollback

The preferred method is using the automated rollback script:

```bash
# From infrastructure/homelab/scripts/
./db-rollback.sh <environment> <backup-file>
```

This will:
1. Stop all API pods
2. Restore database from backup
3. Verify migration version

### Manual Rollback

If you need to manually rollback specific migrations:

```bash
# Connect to database
export PGPASSWORD="<password>"
psql -h 192.168.10.24 -U emr -d physioflow_dev

# Run rollback script
\i /home/dang/dev/physioflow/infrastructure/db/migrations/rollback/011_down.sql

# Update schema_migrations table
DELETE FROM schema_migrations WHERE version = '011';

# Verify
SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;
```

## Migration Dependencies

Some migrations depend on others. When rolling back, ensure you rollback in reverse order:

1. **011_down.sql** - Audit tables (no dependencies)
2. **010_down.sql** - Medical terms (no dependencies)
3. **009_down.sql** - Discharge planning (depends on clinical schema)
4. **008_down.sql** - Clinical protocols (depends on clinical schema)
5. **007_down.sql** - Billing tables (no dependencies)
6. **006_down.sql** - Outcome measures (no dependencies)
7. **005_down.sql** - BHYT insurance (alters existing table)

## What Each Rollback Does

### 005_down.sql - BHYT Insurance Enhancement
- Drops indexes: `idx_insurance_bhyt_card_number`, `idx_insurance_bhyt_prefix`
- Removes constraints: `chk_bhyt_card_format`, `chk_bhyt_prefix_format`, etc.
- Drops columns: `bhyt_card_number`, `bhyt_prefix_code`, `bhyt_coverage_percent`, etc.

### 006_down.sql - Outcome Measures
- Drops partition tables: `outcome_measures_2024` through `outcome_measures_2030`
- Drops parent table: `outcome_measures`
- Drops library table: `outcome_measures_library`

### 007_down.sql - Billing Tables
- Drops tables: `payment_transactions`, `invoice_line_items`, `invoices`, `pt_service_codes`
- Drops enums: `payment_method`, `invoice_status`

### 008_down.sql - Clinical Protocols
- Drops tables: `patient_protocol_exercises`, `patient_protocols`, `clinical_protocols`
- Drops enum: `protocol_status`

### 009_down.sql - Discharge Planning
- Drops tables: `discharge_summaries`, `discharge_plans`
- Drops enums: `discharge_status`, `discharge_reason`, `discharge_disposition`

### 010_down.sql - Medical Terms
- Drops indexes: GIN indexes for full-text search
- Drops table: `medical_terms`

### 011_down.sql - Audit Logs
- Drops partition tables: `audit_logs_2024` through `audit_logs_2030`
- Drops parent table: `audit_logs`
- Drops enum: `audit_action`

## Testing Rollback Scripts

Before using in production, test rollback scripts in dev:

```bash
# 1. Apply migrations
psql -h 192.168.10.24 -U emr -d physioflow_dev -f ../005_bhyt_insurance_enhancement.sql

# 2. Verify migration
psql -h 192.168.10.24 -U emr -d physioflow_dev -c "\d insurance_info"

# 3. Run rollback
psql -h 192.168.10.24 -U emr -d physioflow_dev -f rollback/005_down.sql

# 4. Verify rollback
psql -h 192.168.10.24 -U emr -d physioflow_dev -c "\d insurance_info"
```

## Warnings

- **Data Loss**: Rollback scripts will DROP tables and columns, resulting in data loss
- **Dependencies**: Ensure no foreign key constraints reference tables being dropped
- **Backups**: Always create a backup before running rollback scripts
- **Testing**: Test rollback scripts in non-production environments first
- **Order**: Roll back migrations in reverse order of application

## Creating New Rollback Scripts

When creating a new migration, always create a corresponding rollback script:

1. Create migration: `XXX_feature_name.sql`
2. Create rollback: `rollback/XXX_down.sql`
3. Test both forward and rollback migrations
4. Document any special considerations

Template for rollback script:

```sql
-- Rollback: XXX_feature_name.sql
-- Description: Brief description of what this rollback does
-- Created: YYYY-MM-DD

-- Drop tables in reverse order (handle dependencies first)
DROP TABLE IF EXISTS child_table CASCADE;
DROP TABLE IF EXISTS parent_table CASCADE;

-- Drop enums
DROP TYPE IF EXISTS custom_enum_type CASCADE;

-- Remove columns (if altering existing table)
ALTER TABLE existing_table DROP COLUMN IF EXISTS new_column;

-- Drop constraints
ALTER TABLE existing_table DROP CONSTRAINT IF EXISTS constraint_name;

-- Drop indexes
DROP INDEX IF EXISTS idx_name CASCADE;
```

## Support

For questions or issues with rollback scripts:
- Check the deployment runbook: `infrastructure/homelab/DEPLOYMENT_RUNBOOK.md`
- Review migration logs in database
- Contact DevOps team
