#!/bin/bash
# Deployment with Database Migration for PhysioFlow
# Usage: ./deploy-with-migration.sh <environment> <image-tag> [migration-version]
#
# This script orchestrates a safe deployment with database migrations:
# 1. Creates database backup
# 2. Applies new migrations (if any)
# 3. Performs blue-green deployment
# 4. Updates migration version tracking
# 5. Rolls back on failure

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
MIGRATIONS_DIR="$PROJECT_ROOT/infrastructure/db/migrations"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
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

log_step() {
    echo -e "${MAGENTA}[STEP]${NC} $1"
}

# Check arguments
if [ $# -lt 2 ]; then
    log_error "Usage: $0 <environment> <image-tag> [migration-version]"
    log_error "Example: $0 dev v1.2.3 015"
    exit 1
fi

ENVIRONMENT=$1
IMAGE_TAG=$2
TARGET_MIGRATION_VERSION="${3:-}"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod."
    exit 1
fi

NAMESPACE="physioflow-$ENVIRONMENT"

# Database configuration per environment
case $ENVIRONMENT in
    dev)
        DB_HOST="192.168.10.24"
        DB_PORT="5432"
        DB_NAME="physioflow_dev"
        DB_USER="emr"
        ;;
    staging)
        DB_HOST="192.168.10.24"
        DB_PORT="5432"
        DB_NAME="physioflow_staging"
        DB_USER="emr"
        ;;
    prod)
        DB_HOST="192.168.10.24"
        DB_PORT="5432"
        DB_NAME="physioflow_prod"
        DB_USER="emr"
        ;;
esac

echo ""
echo "========================================"
echo "  PhysioFlow Deployment with Migration"
echo "========================================"
echo "Environment:    $ENVIRONMENT"
echo "Image tag:      $IMAGE_TAG"
echo "Database:       $DB_NAME"
echo "Target version: ${TARGET_MIGRATION_VERSION:-auto-detect}"
echo "========================================"
echo ""

# Confirmation for production
if [ "$ENVIRONMENT" == "prod" ]; then
    log_warning "You are about to deploy to PRODUCTION!"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_error "Deployment cancelled"
        exit 1
    fi
fi

# Step 1: Check database connectivity
log_step "Step 1/7: Checking database connectivity..."
if ! PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &>/dev/null; then
    log_error "Cannot connect to database: $DB_NAME"
    exit 1
fi
log_success "Database connectivity verified"

# Step 2: Get current migration version
log_step "Step 2/7: Detecting current migration version..."
CURRENT_MIGRATION_VERSION=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;" 2>/dev/null | xargs || echo "000")
log_info "Current migration version: $CURRENT_MIGRATION_VERSION"

# Auto-detect target migration version if not provided
if [ -z "$TARGET_MIGRATION_VERSION" ]; then
    TARGET_MIGRATION_VERSION=$(ls -1 "$MIGRATIONS_DIR" | grep -E '^[0-9]+_.*\.sql$' | sed 's/_.*$//' | sort -n | tail -n 1)
    log_info "Auto-detected target migration version: $TARGET_MIGRATION_VERSION"
fi

# Determine if migrations are needed
MIGRATIONS_NEEDED=()
for migration_file in $(ls -1 "$MIGRATIONS_DIR" | grep -E '^[0-9]+_.*\.sql$' | sort); do
    MIGRATION_NUM=$(echo "$migration_file" | sed 's/_.*$//')

    # Skip if already applied
    if [ "$MIGRATION_NUM" -le "$CURRENT_MIGRATION_VERSION" ]; then
        continue
    fi

    # Skip if beyond target
    if [ "$MIGRATION_NUM" -gt "$TARGET_MIGRATION_VERSION" ]; then
        continue
    fi

    MIGRATIONS_NEEDED+=("$migration_file")
done

if [ ${#MIGRATIONS_NEEDED[@]} -eq 0 ]; then
    log_info "No new migrations to apply"
else
    log_info "Migrations to apply: ${#MIGRATIONS_NEEDED[@]}"
    for migration in "${MIGRATIONS_NEEDED[@]}"; do
        log_info "  - $migration"
    done
fi

# Step 3: Create database backup
log_step "Step 3/7: Creating database backup..."
BACKUP_LABEL="pre-deploy-${IMAGE_TAG}"
BACKUP_FILE=$("$SCRIPT_DIR/db-backup.sh" "$ENVIRONMENT" "$BACKUP_LABEL" | tail -n 1)

if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup creation failed"
    exit 1
fi
log_success "Database backup created: $BACKUP_FILE"

# Step 4: Apply migrations
if [ ${#MIGRATIONS_NEEDED[@]} -gt 0 ]; then
    log_step "Step 4/7: Applying database migrations..."

    for migration_file in "${MIGRATIONS_NEEDED[@]}"; do
        MIGRATION_PATH="$MIGRATIONS_DIR/$migration_file"
        log_info "Applying migration: $migration_file"

        if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_PATH"; then
            log_success "Migration applied: $migration_file"

            # Record migration
            MIGRATION_NUM=$(echo "$migration_file" | sed 's/_.*$//')
            PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
INSERT INTO schema_migrations (version, applied_at)
VALUES ('$MIGRATION_NUM', NOW())
ON CONFLICT (version) DO NOTHING;
EOF
        else
            log_error "Migration failed: $migration_file"
            log_error "Rolling back database..."

            # Rollback database
            "$SCRIPT_DIR/db-rollback.sh" "$ENVIRONMENT" "$BACKUP_FILE"
            exit 1
        fi
    done

    log_success "All migrations applied successfully"
else
    log_step "Step 4/7: Skipping migrations (none needed)"
fi

# Step 5: Blue-green deployment
log_step "Step 5/7: Performing blue-green deployment..."
if "$SCRIPT_DIR/blue-green-deploy.sh" "$ENVIRONMENT" "$IMAGE_TAG"; then
    log_success "Blue-green deployment completed"
else
    log_error "Blue-green deployment failed"
    log_error "Rolling back database and deployment..."

    # Rollback database
    "$SCRIPT_DIR/db-rollback.sh" "$ENVIRONMENT" "$BACKUP_FILE"
    exit 1
fi

# Step 6: Update migration version ConfigMap
log_step "Step 6/7: Updating migration version tracking..."
NEW_MIGRATION_VERSION=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;" 2>/dev/null | xargs || echo "unknown")

kubectl patch configmap migration-version -n "$NAMESPACE" \
    -p "{\"data\":{\"current_version\":\"$NEW_MIGRATION_VERSION\",\"last_backup\":\"$(date -Iseconds)\",\"last_migration_date\":\"$(date -Iseconds)\"}}" \
    2>/dev/null || log_warning "Could not update migration version ConfigMap"

log_success "Migration version updated: $NEW_MIGRATION_VERSION"

# Step 7: Verification
log_step "Step 7/7: Verifying deployment..."

# Wait a bit for the service to stabilize
sleep 10

# Get the service endpoint
if [ "$ENVIRONMENT" == "dev" ]; then
    SERVICE_URL="https://physioflow-dev.trancloud.work/api"
elif [ "$ENVIRONMENT" == "staging" ]; then
    SERVICE_URL="https://physioflow-staging.trancloud.work/api"
else
    SERVICE_URL="https://physioflow.trancloud.work/api"
fi

# Check health endpoint
log_info "Checking health endpoint: $SERVICE_URL/health"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/health" || echo "000")

if [ "$HEALTH_STATUS" == "200" ]; then
    log_success "Health check passed"
else
    log_warning "Health check returned: $HEALTH_STATUS"
fi

# Print summary
echo ""
echo "========================================"
echo "  Deployment Summary"
echo "========================================"
echo "Environment:       $ENVIRONMENT"
echo "Image tag:         $IMAGE_TAG"
echo "Migration version: $NEW_MIGRATION_VERSION"
echo "Backup file:       $(basename "$BACKUP_FILE")"
echo "Service URL:       $SERVICE_URL"
echo "Health status:     $HEALTH_STATUS"
echo "========================================"
echo ""

log_success "Deployment with migration completed successfully!"
log_info "Backup is available at: $BACKUP_FILE"
log_info ""
log_info "To rollback this deployment:"
log_info "  $SCRIPT_DIR/db-rollback.sh $ENVIRONMENT $BACKUP_FILE"
log_info "  # Then manually switch service to previous version"
