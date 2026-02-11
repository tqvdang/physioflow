#!/bin/bash
# Database Rollback Script for PhysioFlow
# Usage: ./db-rollback.sh <environment> <backup-file>
#
# Performs a database rollback from a backup:
# 1. Stops all API pods
# 2. Downloads backup from MinIO (if needed)
# 3. Drops current database
# 4. Restores from backup
# 5. Verifies migration version
# 6. Restarts API pods

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check arguments
if [ $# -lt 2 ]; then
    log_error "Usage: $0 <environment> <backup-file>"
    log_error "Example: $0 dev /tmp/physioflow-backups/dev_pre-migration_20260211_103045.tar.gz"
    log_error "Or: $0 dev dev_pre-migration_20260211_103045.tar.gz (will download from MinIO)"
    exit 1
fi

ENVIRONMENT=$1
BACKUP_FILE=$2

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod."
    exit 1
fi

# Confirmation for production
if [ "$ENVIRONMENT" == "prod" ]; then
    log_warning "You are about to rollback the PRODUCTION database!"
    log_warning "This will DELETE all current data and restore from backup."
    read -p "Are you absolutely sure? Type 'ROLLBACK PRODUCTION' to confirm: " confirm
    if [ "$confirm" != "ROLLBACK PRODUCTION" ]; then
        log_error "Rollback cancelled"
        exit 1
    fi
fi

# Database configuration per environment
case $ENVIRONMENT in
    dev)
        DB_HOST="192.168.10.24"
        DB_PORT="5432"
        DB_NAME="physioflow_dev"
        DB_USER="emr"
        NAMESPACE="physioflow-dev"
        MINIO_BUCKET="physioflow-backups-dev"
        ;;
    staging)
        DB_HOST="192.168.10.24"
        DB_PORT="5432"
        DB_NAME="physioflow_staging"
        DB_USER="emr"
        NAMESPACE="physioflow-staging"
        MINIO_BUCKET="physioflow-backups-staging"
        ;;
    prod)
        DB_HOST="192.168.10.24"
        DB_PORT="5432"
        DB_NAME="physioflow_prod"
        DB_USER="emr"
        NAMESPACE="physioflow-prod"
        MINIO_BUCKET="physioflow-backups-prod"
        ;;
esac

# MinIO configuration
MINIO_HOST="192.168.10.25"
MINIO_PORT="9000"
MINIO_ALIAS="trancloud"
BACKUP_DIR="/tmp/physioflow-backups"

log_info "Starting database rollback for $ENVIRONMENT environment"

# Download backup from MinIO if needed
if [ ! -f "$BACKUP_FILE" ]; then
    log_info "Backup file not found locally, attempting to download from MinIO..."
    BACKUP_FILENAME=$(basename "$BACKUP_FILE")

    if command -v mc &> /dev/null; then
        mkdir -p "$BACKUP_DIR"
        if mc cp "$MINIO_ALIAS/$MINIO_BUCKET/$BACKUP_FILENAME" "$BACKUP_DIR/$BACKUP_FILENAME"; then
            BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILENAME"
            log_success "Downloaded backup from MinIO"
        else
            log_error "Failed to download backup from MinIO"
            exit 1
        fi
    else
        log_error "MinIO client not installed and backup file not found locally"
        exit 1
    fi
fi

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

log_info "Using backup file: $BACKUP_FILE"

# Extract backup
log_info "Extracting backup archive..."
EXTRACT_DIR="/tmp/physioflow-restore-$$"
mkdir -p "$EXTRACT_DIR"
tar -xzf "$BACKUP_FILE" -C "$EXTRACT_DIR"

# Find the backup directory (it should be the only directory in extract dir)
BACKUP_DIR_NAME=$(ls -1 "$EXTRACT_DIR" | head -n 1)
RESTORE_PATH="$EXTRACT_DIR/$BACKUP_DIR_NAME"

if [ ! -d "$RESTORE_PATH" ]; then
    log_error "Invalid backup archive structure"
    rm -rf "$EXTRACT_DIR"
    exit 1
fi

# Read backup metadata
if [ -f "$RESTORE_PATH/metadata.json" ]; then
    log_info "Backup metadata:"
    cat "$RESTORE_PATH/metadata.json" | jq '.' || cat "$RESTORE_PATH/metadata.json"
    echo ""

    BACKUP_MIGRATION_VERSION=$(cat "$RESTORE_PATH/metadata.json" | jq -r '.migration_version' 2>/dev/null || echo "unknown")
    log_info "Backup migration version: $BACKUP_MIGRATION_VERSION"
else
    log_warning "No metadata file found in backup"
    BACKUP_MIGRATION_VERSION="unknown"
fi

# Stop API pods
log_info "Scaling down API deployments..."
kubectl scale deployment/physioflow-api-blue --replicas=0 -n "$NAMESPACE" 2>/dev/null || true
kubectl scale deployment/physioflow-api-green --replicas=0 -n "$NAMESPACE" 2>/dev/null || true
kubectl scale deployment/physioflow-api --replicas=0 -n "$NAMESPACE" 2>/dev/null || true

log_info "Waiting for pods to terminate..."
sleep 10

# Verify no API pods are running
RUNNING_PODS=$(kubectl get pods -n "$NAMESPACE" -l component=api --no-headers 2>/dev/null | wc -l)
if [ "$RUNNING_PODS" -gt 0 ]; then
    log_warning "$RUNNING_PODS API pods still running. Waiting..."
    sleep 20
fi

# Check database connectivity
log_info "Checking database connectivity..."
if ! PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1;" &>/dev/null; then
    log_error "Cannot connect to database server"
    rm -rf "$EXTRACT_DIR"
    exit 1
fi

# Terminate existing connections
log_info "Terminating existing database connections..."
PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres <<EOF
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
EOF

# Drop and recreate database
log_warning "Dropping current database: $DB_NAME"
PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"

log_info "Creating fresh database: $DB_NAME"
PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# Restore from backup
log_info "Restoring database from backup..."

if [ -f "$RESTORE_PATH/full_backup.dump" ]; then
    log_info "Using custom format backup..."
    PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --no-owner \
        --no-acl \
        "$RESTORE_PATH/full_backup.dump"

    if [ $? -eq 0 ]; then
        log_success "Database restored successfully"
    else
        log_error "Database restore failed"
        rm -rf "$EXTRACT_DIR"
        exit 1
    fi
elif [ -f "$RESTORE_PATH/schema.sql" ] && [ -f "$RESTORE_PATH/data.sql" ]; then
    log_info "Using schema + data SQL files..."

    log_info "Restoring schema..."
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$RESTORE_PATH/schema.sql"

    log_info "Restoring data..."
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$RESTORE_PATH/data.sql"

    log_success "Database restored successfully"
else
    log_error "No valid backup files found in archive"
    rm -rf "$EXTRACT_DIR"
    exit 1
fi

# Verify migration version
log_info "Verifying migration version..."
CURRENT_MIGRATION_VERSION=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;" 2>/dev/null | xargs || echo "unknown")
log_info "Restored migration version: $CURRENT_MIGRATION_VERSION"

# Update migration version configmap
log_info "Updating migration version ConfigMap..."
kubectl patch configmap migration-version -n "$NAMESPACE" -p "{\"data\":{\"current_version\":\"$CURRENT_MIGRATION_VERSION\",\"last_backup\":\"$(date -Iseconds)\",\"rollback_version\":\"$BACKUP_MIGRATION_VERSION\"}}" 2>/dev/null || log_warning "Could not update migration version ConfigMap"

# Clean up
log_info "Cleaning up temporary files..."
rm -rf "$EXTRACT_DIR"

# Restart API pods
log_info "Restarting API deployments..."
log_warning "Note: You need to manually scale up the desired deployment version"
log_info "Run one of these commands:"
log_info "  kubectl scale deployment/physioflow-api-blue --replicas=1 -n $NAMESPACE"
log_info "  kubectl scale deployment/physioflow-api-green --replicas=1 -n $NAMESPACE"
echo ""

# Print summary
echo "========================================"
echo "  Rollback Summary"
echo "========================================"
echo "Environment:       $ENVIRONMENT"
echo "Database:          $DB_NAME"
echo "Backup file:       $(basename "$BACKUP_FILE")"
echo "Migration version: $CURRENT_MIGRATION_VERSION"
echo "========================================"

log_success "Database rollback completed successfully!"
log_warning "Remember to scale up API pods and verify the application is working correctly"
