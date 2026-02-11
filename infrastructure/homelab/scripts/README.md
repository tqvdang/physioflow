# PhysioFlow Deployment Scripts

This directory contains scripts for deploying PhysioFlow using blue-green deployment strategy with zero-downtime migrations.

## Available Scripts

### Blue-Green Deployment

**`blue-green-deploy.sh`**
- Implements blue-green deployment strategy
- Automatically detects current active version
- Deploys to inactive environment
- Runs smoke tests before switching traffic
- Monitors new deployment for 5 minutes
- Auto-rollback on failure

```bash
./blue-green-deploy.sh <environment> <image-tag> [--skip-tests]

# Examples:
./blue-green-deploy.sh dev v1.2.3
./blue-green-deploy.sh staging v1.2.3 --skip-tests
./blue-green-deploy.sh prod v1.2.3
```

### Smoke Tests

**`smoke-tests.sh`**
- Runs suite of health checks against deployed API
- Tests critical endpoints
- Returns exit code 0 on success, 1 on failure
- Used automatically by blue-green deployment

```bash
./smoke-tests.sh <api-url>

# Example:
./smoke-tests.sh http://10.42.0.123:7011
```

### Database Backup

**`db-backup.sh`**
- Creates full database backup before migrations
- Exports schema and data separately
- Includes migration version metadata
- Compresses and uploads to MinIO
- Maintains retention policy (keeps last 10 local backups)

```bash
./db-backup.sh <environment> [backup-label]

# Examples:
./db-backup.sh dev pre-migration-v1.2.3
./db-backup.sh staging manual-backup
./db-backup.sh prod pre-deploy-$(date +%Y%m%d)
```

### Database Rollback

**`db-rollback.sh`**
- Restores database from backup
- Stops all API pods during rollback
- Verifies migration version after restore
- Downloads from MinIO if backup not local
- Requires confirmation for production

```bash
./db-rollback.sh <environment> <backup-file>

# Examples:
./db-rollback.sh dev /tmp/physioflow-backups/dev_pre-migration_20260211_103045.tar.gz
./db-rollback.sh staging dev_pre-migration_20260211_103045.tar.gz  # Downloads from MinIO
./db-rollback.sh prod <backup-file>  # Requires "ROLLBACK PRODUCTION" confirmation
```

### Deployment with Migration

**`deploy-with-migration.sh`**
- Orchestrates complete deployment with database migrations
- Creates automatic backup before migrations
- Applies new migrations in order
- Performs blue-green deployment
- Updates migration version tracking
- Auto-rollback on any failure

```bash
./deploy-with-migration.sh <environment> <image-tag> [migration-version]

# Examples:
./deploy-with-migration.sh dev v1.2.3          # Auto-detect latest migration
./deploy-with-migration.sh dev v1.2.3 015      # Deploy up to migration 015
./deploy-with-migration.sh prod v1.2.3 015     # Requires confirmation
```

## Workflow Examples

### Deploy Without Database Changes

```bash
# 1. Build and push images
docker build -t registry.trancloud.work/physioflow-api:v1.2.3 -f apps/api/Dockerfile .
docker push registry.trancloud.work/physioflow-api:v1.2.3

# 2. Run blue-green deployment
./blue-green-deploy.sh dev v1.2.3

# 3. Verify deployment
kubectl get pods -n physioflow-dev
curl https://physioflow-dev.trancloud.work/api/health
```

### Deploy With Database Migrations

```bash
# 1. Build and push images
docker build -t registry.trancloud.work/physioflow-api:v1.2.3 -f apps/api/Dockerfile .
docker push registry.trancloud.work/physioflow-api:v1.2.3

# 2. Set database password
export POSTGRES_PASSWORD="<password>"

# 3. Run deployment with migrations
./deploy-with-migration.sh dev v1.2.3

# 4. Verify migration
psql -h 192.168.10.24 -U emr -d physioflow_dev -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"
```

### Emergency Rollback

```bash
# 1. Get current active version
CURRENT=$(kubectl get svc physioflow-api -n physioflow-prod -o jsonpath='{.spec.selector.version}')
PREVIOUS=$([ "$CURRENT" = "blue" ] && echo "green" || echo "blue")

# 2. Switch traffic immediately
kubectl patch svc physioflow-api -n physioflow-prod \
  -p "{\"spec\":{\"selector\":{\"version\":\"$PREVIOUS\"}}}"

# 3. If database needs rollback
export POSTGRES_PASSWORD="<password>"
./db-rollback.sh prod <backup-file>

# 4. Scale up previous version
kubectl scale deployment/physioflow-api-$PREVIOUS --replicas=2 -n physioflow-prod
```

### Manual Backup and Restore

```bash
# Create backup
export POSTGRES_PASSWORD="<password>"
BACKUP_FILE=$(./db-backup.sh dev manual-backup-$(date +%Y%m%d) | tail -n 1)
echo "Backup created: $BACKUP_FILE"

# Restore from backup
./db-rollback.sh dev "$BACKUP_FILE"
```

## Prerequisites

### Required Tools

- `kubectl` - Kubernetes CLI
- `psql` / `pg_dump` / `pg_restore` - PostgreSQL client tools
- `mc` - MinIO client (optional, for backup upload)
- `curl` - For smoke tests
- `jq` - JSON processing

### Environment Variables

```bash
# Database password (required for backup/restore/migration scripts)
export POSTGRES_PASSWORD="<password-from-infrastructure.yaml>"

# MinIO credentials (optional, for backup upload)
# Configure MinIO alias once:
mc alias set trancloud http://192.168.10.25:9000 <access-key> <secret-key>
```

### Kubernetes Access

```bash
# Ensure kubectl is configured
kubectl config current-context

# Verify access to namespaces
kubectl get ns | grep physioflow
```

## Database Configuration

Database settings per environment (from `infrastructure.yaml`):

| Environment | Host | Port | Database | User |
|-------------|------|------|----------|------|
| Dev | 192.168.10.24 | 5432 | physioflow_dev | emr |
| Staging | 192.168.10.24 | 5432 | physioflow_staging | emr |
| Production | 192.168.10.24 | 5432 | physioflow_prod | emr |

## MinIO Configuration

MinIO backup storage (from `infrastructure.yaml`):

- **Host:** 192.168.10.25:9000
- **Alias:** trancloud
- **Buckets:**
  - `physioflow-backups-dev`
  - `physioflow-backups-staging`
  - `physioflow-backups-prod`

## Troubleshooting

### Script Fails with "Cannot connect to database"

Check database connectivity:
```bash
export PGPASSWORD="<password>"
psql -h 192.168.10.24 -U emr -d physioflow_dev -c "SELECT 1;"
```

### Smoke Tests Fail

Run smoke tests manually to see detailed errors:
```bash
# Get pod IP
POD_IP=$(kubectl get pod -n physioflow-dev -l version=green -o jsonpath='{.items[0].status.podIP}')

# Run smoke tests with verbose output
./smoke-tests.sh http://$POD_IP:7011
```

### Backup Upload Fails

Check MinIO configuration:
```bash
# List MinIO aliases
mc alias list

# Test connection
mc ls trancloud/

# Reconfigure if needed
mc alias set trancloud http://192.168.10.25:9000 <access-key> <secret-key>
```

### Migration Version Mismatch

Check current migration version:
```bash
export PGPASSWORD="<password>"
psql -h 192.168.10.24 -U emr -d physioflow_dev -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 10;"
```

Check ConfigMap:
```bash
kubectl get configmap migration-version -n physioflow-dev -o yaml
```

## Safety Features

All scripts include:

- **Environment validation** - Ensures valid environment (dev/staging/prod)
- **Confirmation prompts** - Production deployments require explicit confirmation
- **Pre-flight checks** - Verify connectivity before destructive operations
- **Automatic rollback** - Failed deployments rollback automatically
- **Logging** - Color-coded output for easy monitoring
- **Error handling** - Scripts exit on error with clear messages

## Migration Tracking

Migration versions are tracked in three places:

1. **Database:** `schema_migrations` table
2. **ConfigMap:** `migration-version` in namespace
3. **Backup metadata:** `metadata.json` in backup archive

## Additional Resources

- **Deployment Runbook:** `../DEPLOYMENT_RUNBOOK.md` - Complete deployment procedures
- **Migration Rollbacks:** `../../db/migrations/rollback/README.md` - Manual rollback procedures
- **Infrastructure Reference:** `/home/dang/dev/infrastructure.yaml` - Complete infrastructure details

## Support

For issues or questions:
1. Check the deployment runbook: `../DEPLOYMENT_RUNBOOK.md`
2. Review script output for error messages
3. Check pod logs: `kubectl logs -n <namespace> <pod-name>`
4. Verify database connectivity
5. Contact DevOps team
