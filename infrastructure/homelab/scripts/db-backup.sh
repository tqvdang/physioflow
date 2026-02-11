#!/bin/bash
# Database Backup Script for PhysioFlow
# Usage: ./db-backup.sh <environment> <backup-label>
#
# Creates a full backup of the PostgreSQL database including:
# - Schema and data dump
# - Migration version tracking
# - Backup metadata
# - Compressed archive uploaded to MinIO

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="/tmp/physioflow-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

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
if [ $# -lt 1 ]; then
    log_error "Usage: $0 <environment> [backup-label]"
    log_error "Example: $0 dev pre-migration-v1.2.3"
    exit 1
fi

ENVIRONMENT=$1
BACKUP_LABEL="${2:-manual-backup}"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod."
    exit 1
fi

# Database configuration per environment
case $ENVIRONMENT in
    dev)
        DB_HOST="192.168.10.24"
        DB_PORT="5432"
        DB_NAME="physioflow_dev"
        DB_USER="emr"
        MINIO_BUCKET="physioflow-backups-dev"
        ;;
    staging)
        DB_HOST="192.168.10.24"
        DB_PORT="5432"
        DB_NAME="physioflow_staging"
        DB_USER="emr"
        MINIO_BUCKET="physioflow-backups-staging"
        ;;
    prod)
        DB_HOST="192.168.10.24"
        DB_PORT="5432"
        DB_NAME="physioflow_prod"
        DB_USER="emr"
        MINIO_BUCKET="physioflow-backups-prod"
        ;;
esac

# MinIO configuration (from infrastructure.yaml)
MINIO_HOST="192.168.10.25"
MINIO_PORT="9000"
MINIO_ALIAS="trancloud"

log_info "Starting database backup for $ENVIRONMENT environment"
log_info "Database: $DB_NAME on $DB_HOST:$DB_PORT"
log_info "Backup label: $BACKUP_LABEL"

# Create backup directory
BACKUP_NAME="${ENVIRONMENT}_${BACKUP_LABEL}_${TIMESTAMP}"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
mkdir -p "$BACKUP_PATH"

log_info "Backup directory: $BACKUP_PATH"

# Check database connectivity
log_info "Checking database connectivity..."
if ! PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &>/dev/null; then
    log_error "Cannot connect to database"
    exit 1
fi
log_success "Database connectivity verified"

# Get current migration version
log_info "Fetching current migration version..."
MIGRATION_VERSION=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;" 2>/dev/null | xargs || echo "unknown")
log_info "Current migration version: $MIGRATION_VERSION"

# Create backup metadata
log_info "Creating backup metadata..."
cat > "$BACKUP_PATH/metadata.json" <<EOF
{
  "backup_name": "$BACKUP_NAME",
  "environment": "$ENVIRONMENT",
  "database": "$DB_NAME",
  "backup_label": "$BACKUP_LABEL",
  "timestamp": "$TIMESTAMP",
  "migration_version": "$MIGRATION_VERSION",
  "created_at": "$(date -Iseconds)",
  "database_host": "$DB_HOST",
  "database_port": "$DB_PORT"
}
EOF

# Dump database schema
log_info "Dumping database schema..."
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --schema-only \
    --no-owner \
    --no-acl \
    -f "$BACKUP_PATH/schema.sql"

if [ $? -eq 0 ]; then
    log_success "Schema dump completed ($(du -h "$BACKUP_PATH/schema.sql" | cut -f1))"
else
    log_error "Schema dump failed"
    exit 1
fi

# Dump database data
log_info "Dumping database data..."
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --data-only \
    --no-owner \
    --no-acl \
    -f "$BACKUP_PATH/data.sql"

if [ $? -eq 0 ]; then
    log_success "Data dump completed ($(du -h "$BACKUP_PATH/data.sql" | cut -f1))"
else
    log_error "Data dump failed"
    exit 1
fi

# Dump full database (alternative format)
log_info "Creating full database dump..."
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-acl \
    -F c \
    -f "$BACKUP_PATH/full_backup.dump"

if [ $? -eq 0 ]; then
    log_success "Full dump completed ($(du -h "$BACKUP_PATH/full_backup.dump" | cut -f1))"
else
    log_error "Full dump failed"
    exit 1
fi

# Compress backup
log_info "Compressing backup..."
ARCHIVE_NAME="${BACKUP_NAME}.tar.gz"
tar -czf "$BACKUP_DIR/$ARCHIVE_NAME" -C "$BACKUP_DIR" "$BACKUP_NAME"

if [ $? -eq 0 ]; then
    ARCHIVE_SIZE=$(du -h "$BACKUP_DIR/$ARCHIVE_NAME" | cut -f1)
    log_success "Backup compressed: $ARCHIVE_NAME ($ARCHIVE_SIZE)"
else
    log_error "Compression failed"
    exit 1
fi

# Upload to MinIO
log_info "Uploading backup to MinIO..."
if command -v mc &> /dev/null; then
    # Check if MinIO alias exists
    if ! mc alias list "$MINIO_ALIAS" &>/dev/null; then
        log_warning "MinIO alias not configured. Skipping upload."
        log_info "To configure MinIO, run:"
        log_info "  mc alias set $MINIO_ALIAS http://$MINIO_HOST:$MINIO_PORT <access-key> <secret-key>"
    else
        # Ensure bucket exists
        mc mb "$MINIO_ALIAS/$MINIO_BUCKET" 2>/dev/null || true

        # Upload archive
        if mc cp "$BACKUP_DIR/$ARCHIVE_NAME" "$MINIO_ALIAS/$MINIO_BUCKET/$ARCHIVE_NAME"; then
            log_success "Backup uploaded to MinIO: $MINIO_BUCKET/$ARCHIVE_NAME"

            # Set retention policy (optional)
            # mc retention set --default GOVERNANCE "30d" "$MINIO_ALIAS/$MINIO_BUCKET"
        else
            log_error "Failed to upload backup to MinIO"
        fi
    fi
else
    log_warning "MinIO client (mc) not installed. Skipping upload."
    log_info "Install with: wget https://dl.min.io/client/mc/release/linux-amd64/mc && chmod +x mc && sudo mv mc /usr/local/bin/"
fi

# Clean up old backups (keep last 10)
log_info "Cleaning up old backups..."
cd "$BACKUP_DIR"
ls -t | tail -n +11 | xargs -r rm -rf
log_success "Old backups cleaned up"

# Print summary
echo ""
echo "========================================"
echo "  Backup Summary"
echo "========================================"
echo "Environment:       $ENVIRONMENT"
echo "Database:          $DB_NAME"
echo "Backup label:      $BACKUP_LABEL"
echo "Migration version: $MIGRATION_VERSION"
echo "Archive:           $ARCHIVE_NAME"
echo "Size:              $ARCHIVE_SIZE"
echo "Location:          $BACKUP_DIR/$ARCHIVE_NAME"
echo "========================================"

log_success "Database backup completed successfully!"

# Return backup path for use in other scripts
echo "$BACKUP_DIR/$ARCHIVE_NAME"
