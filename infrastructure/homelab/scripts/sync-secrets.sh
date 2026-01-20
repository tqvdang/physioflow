#!/bin/bash
set -e

# Sync secrets from Infisical to Kubernetes
# Usage: ./sync-secrets.sh <environment>

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFISICAL_DOMAIN="https://secrets.trancloud.work"
PROJECT_SLUG="physioflow"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

usage() {
    echo "Usage: $0 <environment>"
    echo ""
    echo "Environments: dev, staging, prod"
    echo ""
    echo "Prerequisites:"
    echo "  - infisical CLI installed"
    echo "  - Logged in to Infisical: infisical login --domain=$INFISICAL_DOMAIN"
    echo ""
    exit 1
}

ENV=$1

if [[ -z "$ENV" ]]; then
    log_error "Environment is required"
    usage
fi

case $ENV in
    dev)
        NAMESPACE="physioflow-dev"
        ;;
    staging)
        NAMESPACE="physioflow-staging"
        ;;
    prod)
        NAMESPACE="physioflow-prod"
        ;;
    *)
        log_error "Invalid environment: $ENV"
        usage
        ;;
esac

# Check if infisical is installed
if ! command -v infisical &> /dev/null; then
    log_error "infisical CLI not found. Install it first:"
    echo "  curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.deb.sh' | sudo -E bash"
    echo "  sudo apt-get update && sudo apt-get install infisical"
    exit 1
fi

log_info "Syncing secrets for $ENV environment..."

# Create temp directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Export secrets from Infisical
log_info "Fetching secrets from Infisical..."
infisical export \
    --domain="$INFISICAL_DOMAIN" \
    --env="$ENV" \
    --projectId="$PROJECT_SLUG" \
    --format=dotenv > "$TEMP_DIR/.env"

# Check if secrets were exported
if [[ ! -s "$TEMP_DIR/.env" ]]; then
    log_error "No secrets found or export failed"
    exit 1
fi

# Create Kubernetes secret from .env file
log_info "Creating Kubernetes secret..."
kubectl create secret generic physioflow-secrets \
    --from-env-file="$TEMP_DIR/.env" \
    --namespace="$NAMESPACE" \
    --dry-run=client \
    -o yaml > "$TEMP_DIR/secret.yaml"

# Apply secret
log_info "Applying secret to namespace $NAMESPACE..."
kubectl apply -f "$TEMP_DIR/secret.yaml"

# Restart deployments to pick up new secrets
log_info "Restarting deployments to pick up new secrets..."
kubectl rollout restart deployment/physioflow-web -n "$NAMESPACE" 2>/dev/null || true
kubectl rollout restart deployment/physioflow-api -n "$NAMESPACE" 2>/dev/null || true

echo ""
log_info "Secrets synced successfully for $ENV environment!"
log_info "Secrets applied to namespace: $NAMESPACE"
