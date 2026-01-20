#!/bin/bash
set -e

# PhysioFlow Deployment Script
# Usage: ./deploy.sh <environment> [--build] [--push] [--apply]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
REGISTRY="registry.trancloud.work:5000"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

usage() {
    echo "Usage: $0 <environment> [options]"
    echo ""
    echo "Environments: dev, staging, prod"
    echo ""
    echo "Options:"
    echo "  --build    Build Docker images"
    echo "  --push     Push images to registry"
    echo "  --apply    Apply Kubernetes manifests"
    echo "  --all      Build, push, and apply (default if no options)"
    echo ""
    echo "Examples:"
    echo "  $0 dev --all          # Full deployment to dev"
    echo "  $0 staging --build    # Build staging images only"
    echo "  $0 prod --apply       # Apply prod manifests only"
    exit 1
}

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse arguments
ENV=""
DO_BUILD=false
DO_PUSH=false
DO_APPLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        dev|staging|prod)
            ENV=$1
            shift
            ;;
        --build)
            DO_BUILD=true
            shift
            ;;
        --push)
            DO_PUSH=true
            shift
            ;;
        --apply)
            DO_APPLY=true
            shift
            ;;
        --all)
            DO_BUILD=true
            DO_PUSH=true
            DO_APPLY=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            ;;
    esac
done

# Validate environment
if [[ -z "$ENV" ]]; then
    log_error "Environment is required"
    usage
fi

# Default to --all if no options specified
if [[ "$DO_BUILD" == "false" && "$DO_PUSH" == "false" && "$DO_APPLY" == "false" ]]; then
    DO_BUILD=true
    DO_PUSH=true
    DO_APPLY=true
fi

# Set environment-specific variables
case $ENV in
    dev)
        NAMESPACE="physioflow-dev"
        APP_URL="https://physioflow-dev.trancloud.work"
        API_URL="https://physioflow-dev.trancloud.work/api"
        KEYCLOAK_REALM="physioflow-dev"
        ;;
    staging)
        NAMESPACE="physioflow-staging"
        APP_URL="https://physioflow-staging.trancloud.work"
        API_URL="https://physioflow-staging.trancloud.work/api"
        KEYCLOAK_REALM="physioflow-staging"
        ;;
    prod)
        NAMESPACE="physioflow-prod"
        APP_URL="https://physioflow.trancloud.work"
        API_URL="https://physioflow.trancloud.work/api"
        KEYCLOAK_REALM="physioflow-prod"
        ;;
esac

log_info "Deploying PhysioFlow to $ENV environment"
log_info "Namespace: $NAMESPACE"
log_info "URL: $APP_URL"

# Build images
if [[ "$DO_BUILD" == "true" ]]; then
    log_info "Building Docker images..."

    # Build web app
    log_info "Building web app..."
    docker build \
        --build-arg NEXT_PUBLIC_API_URL="$API_URL" \
        --build-arg NEXT_PUBLIC_APP_URL="$APP_URL" \
        --build-arg NEXT_PUBLIC_KEYCLOAK_URL="https://keycloak.trancloud.work" \
        --build-arg NEXT_PUBLIC_KEYCLOAK_REALM="$KEYCLOAK_REALM" \
        --build-arg NEXT_PUBLIC_KEYCLOAK_CLIENT_ID="physioflow-web" \
        -t "$REGISTRY/physioflow-web:$ENV" \
        -f "$ROOT_DIR/apps/web/Dockerfile" \
        "$ROOT_DIR/apps/web"

    # Build API
    log_info "Building API..."
    docker build \
        -t "$REGISTRY/physioflow-api:$ENV" \
        -f "$ROOT_DIR/apps/api/Dockerfile" \
        "$ROOT_DIR/apps/api"

    log_info "Build complete!"
fi

# Push images
if [[ "$DO_PUSH" == "true" ]]; then
    log_info "Pushing images to registry..."

    docker push "$REGISTRY/physioflow-web:$ENV"
    docker push "$REGISTRY/physioflow-api:$ENV"

    log_info "Push complete!"
fi

# Apply Kubernetes manifests
if [[ "$DO_APPLY" == "true" ]]; then
    log_info "Applying Kubernetes manifests..."

    # Create namespace if not exists
    kubectl apply -f "$SCRIPT_DIR/../k8s/namespaces/physioflow-$ENV.yaml"

    # Apply overlay
    kubectl apply -k "$SCRIPT_DIR/../k8s/overlays/$ENV/"

    # Wait for rollout
    log_info "Waiting for deployment rollout..."
    kubectl rollout status deployment/physioflow-web -n "$NAMESPACE" --timeout=120s
    kubectl rollout status deployment/physioflow-api -n "$NAMESPACE" --timeout=120s

    log_info "Deployment complete!"

    # Show status
    echo ""
    log_info "Deployment Status:"
    kubectl get pods -n "$NAMESPACE"
    echo ""
    kubectl get svc -n "$NAMESPACE"
fi

echo ""
log_info "PhysioFlow $ENV deployment finished!"
log_info "Access at: $APP_URL"
