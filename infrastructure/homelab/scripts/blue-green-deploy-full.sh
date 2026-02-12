#!/bin/bash
# Blue-Green Deployment Script for PhysioFlow (API + Web)
# Usage: ./blue-green-deploy-full.sh <environment> <api-tag> <web-tag> [--skip-tests]
#
# This script implements zero-downtime deployments by:
# 1. Detecting the current active version (blue/green)
# 2. Deploying both API and Web to the inactive version
# 3. Running smoke tests
# 4. Switching traffic
# 5. Monitoring for issues
# 6. Rolling back if problems detected

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
K8S_BASE="$PROJECT_ROOT/infrastructure/homelab/k8s"
MONITORING_DURATION=300  # 5 minutes
SKIP_TESTS=false

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

# Parse arguments
if [ $# -lt 3 ]; then
    log_error "Usage: $0 <environment> <api-tag> <web-tag> [--skip-tests]"
    log_error "Example: $0 prod v1.2.3 v1.2.3"
    exit 1
fi

ENVIRONMENT=$1
API_TAG=$2
WEB_TAG=$3

if [ $# -ge 4 ] && [ "$4" == "--skip-tests" ]; then
    SKIP_TESTS=true
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod."
    exit 1
fi

NAMESPACE="physioflow-$ENVIRONMENT"
log_info "Starting blue-green deployment for $ENVIRONMENT environment"
log_info "API image tag: $API_TAG"
log_info "Web image tag: $WEB_TAG"

# Check if namespace exists
if ! kubectl get namespace "$NAMESPACE" &>/dev/null; then
    log_error "Namespace $NAMESPACE does not exist"
    exit 1
fi

# Detect current active version for API
log_info "Detecting current active version..."
CURRENT_VERSION=$(kubectl get svc physioflow-api -n "$NAMESPACE" -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "blue")

if [ -z "$CURRENT_VERSION" ]; then
    CURRENT_VERSION="blue"
    log_warning "No version label found on service, defaulting to blue"
fi

# Determine new version
if [ "$CURRENT_VERSION" == "blue" ]; then
    NEW_VERSION="green"
else
    NEW_VERSION="blue"
fi

log_info "Current active version: $CURRENT_VERSION"
log_info "Deploying to version: $NEW_VERSION"

# Confirmation for production
if [ "$ENVIRONMENT" == "prod" ]; then
    log_warning "You are about to deploy to PRODUCTION!"
    log_warning "Current version: $CURRENT_VERSION"
    log_warning "New version: $NEW_VERSION"
    log_warning "API tag: $API_TAG"
    log_warning "Web tag: $WEB_TAG"
    read -p "Type 'DEPLOY' to continue: " confirmation
    if [ "$confirmation" != "DEPLOY" ]; then
        log_error "Deployment cancelled"
        exit 1
    fi
fi

# Create database backup for production
if [ "$ENVIRONMENT" == "prod" ]; then
    log_info "Creating database backup..."
    if [ -f "$SCRIPT_DIR/db-backup.sh" ]; then
        "$SCRIPT_DIR/db-backup.sh" "$ENVIRONMENT" "pre-deployment-${API_TAG}" || {
            log_error "Database backup failed"
            exit 1
        }
        log_success "Database backup completed"
    else
        log_warning "Database backup script not found, skipping backup"
    fi
fi

# Deploy new version manifests
log_info "Applying Kubernetes manifests..."
kubectl apply -k "$K8S_BASE/overlays/$ENVIRONMENT"

# Update API deployment
API_DEPLOYMENT="physioflow-api-$NEW_VERSION"
log_info "Updating API deployment: $API_DEPLOYMENT"
kubectl set image deployment/"$API_DEPLOYMENT" \
    api=registry.trancloud.work/physioflow-api:"$API_TAG" \
    -n "$NAMESPACE"

# Update Web deployment
WEB_DEPLOYMENT="physioflow-web-$NEW_VERSION"
log_info "Updating Web deployment: $WEB_DEPLOYMENT"
kubectl set image deployment/"$WEB_DEPLOYMENT" \
    web=registry.trancloud.work/physioflow-web:"$WEB_TAG" \
    -n "$NAMESPACE"

# Wait for API rollout
log_info "Waiting for API deployment to be ready..."
if ! kubectl rollout status deployment/"$API_DEPLOYMENT" -n "$NAMESPACE" --timeout=5m; then
    log_error "API deployment rollout failed"
    exit 1
fi

# Wait for Web rollout
log_info "Waiting for Web deployment to be ready..."
if ! kubectl rollout status deployment/"$WEB_DEPLOYMENT" -n "$NAMESPACE" --timeout=5m; then
    log_error "Web deployment rollout failed"
    exit 1
fi

# Get pod names
API_POD=$(kubectl get pods -n "$NAMESPACE" -l "component=api,version=$NEW_VERSION" -o jsonpath='{.items[0].metadata.name}')
WEB_POD=$(kubectl get pods -n "$NAMESPACE" -l "component=web,version=$NEW_VERSION" -o jsonpath='{.items[0].metadata.name}')

log_info "API pod: $API_POD"
log_info "Web pod: $WEB_POD"

# Wait for pods to be ready
log_info "Waiting for pods to be ready..."
kubectl wait --for=condition=ready pod/"$API_POD" -n "$NAMESPACE" --timeout=2m
kubectl wait --for=condition=ready pod/"$WEB_POD" -n "$NAMESPACE" --timeout=2m

# Run smoke tests
if [ "$SKIP_TESTS" == "false" ]; then
    log_info "Running smoke tests against new version..."

    # Get pod IP for direct testing before switching traffic
    API_POD_IP=$(kubectl get pod "$API_POD" -n "$NAMESPACE" -o jsonpath='{.status.podIP}')
    API_PORT=8080
    if [ "$ENVIRONMENT" == "dev" ]; then
        API_PORT=7011
    fi
    API_URL="http://$API_POD_IP:$API_PORT"

    if [ -f "$SCRIPT_DIR/smoke-tests.sh" ]; then
        if ! "$SCRIPT_DIR/smoke-tests.sh" "$API_URL"; then
            log_error "Smoke tests failed. Aborting deployment."
            log_warning "New version ($NEW_VERSION) is running but not receiving traffic."
            log_warning "To manually inspect:"
            log_warning "  kubectl logs $API_POD -n $NAMESPACE"
            log_warning "  kubectl logs $WEB_POD -n $NAMESPACE"
            log_warning "To rollback:"
            log_warning "  kubectl scale deployment/$API_DEPLOYMENT --replicas=0 -n $NAMESPACE"
            log_warning "  kubectl scale deployment/$WEB_DEPLOYMENT --replicas=0 -n $NAMESPACE"
            exit 1
        fi
        log_success "Smoke tests passed"
    else
        log_warning "Smoke test script not found, skipping tests"
    fi
else
    log_warning "Skipping smoke tests (--skip-tests flag was used)"
fi

# Switch traffic for API
log_info "Switching API traffic from $CURRENT_VERSION to $NEW_VERSION..."
kubectl patch svc physioflow-api -n "$NAMESPACE" \
    -p "{\"spec\":{\"selector\":{\"version\":\"$NEW_VERSION\"}}}"

# Switch traffic for Web
log_info "Switching Web traffic from $CURRENT_VERSION to $NEW_VERSION..."
kubectl patch svc physioflow-web -n "$NAMESPACE" \
    -p "{\"spec\":{\"selector\":{\"version\":\"$NEW_VERSION\"}}}"

log_success "Traffic switched to $NEW_VERSION"

# Monitor for issues
log_info "Monitoring $NEW_VERSION deployment for $MONITORING_DURATION seconds..."
log_info "Checking pod status and logs for errors..."

MONITORING_START=$(date +%s)
MONITORING_END=$((MONITORING_START + MONITORING_DURATION))
ERRORS_DETECTED=0

while [ $(date +%s) -lt $MONITORING_END ]; do
    ELAPSED=$(($(date +%s) - MONITORING_START))
    REMAINING=$((MONITORING_DURATION - ELAPSED))

    # Check API pod status
    API_POD_STATUS=$(kubectl get pod "$API_POD" -n "$NAMESPACE" -o jsonpath='{.status.phase}' 2>/dev/null || echo "Unknown")
    API_RESTART_COUNT=$(kubectl get pod "$API_POD" -n "$NAMESPACE" -o jsonpath='{.status.containerStatuses[0].restartCount}')

    # Check Web pod status
    WEB_POD_STATUS=$(kubectl get pod "$WEB_POD" -n "$NAMESPACE" -o jsonpath='{.status.phase}' 2>/dev/null || echo "Unknown")
    WEB_RESTART_COUNT=$(kubectl get pod "$WEB_POD" -n "$NAMESPACE" -o jsonpath='{.status.containerStatuses[0].restartCount}')

    # Check if pods are still running
    if [ "$API_POD_STATUS" != "Running" ] || [ "$WEB_POD_STATUS" != "Running" ]; then
        log_error "Pods no longer running (API: $API_POD_STATUS, Web: $WEB_POD_STATUS). Rolling back..."
        kubectl patch svc physioflow-api -n "$NAMESPACE" \
            -p "{\"spec\":{\"selector\":{\"version\":\"$CURRENT_VERSION\"}}}"
        kubectl patch svc physioflow-web -n "$NAMESPACE" \
            -p "{\"spec\":{\"selector\":{\"version\":\"$CURRENT_VERSION\"}}}"
        log_error "Rolled back to $CURRENT_VERSION"
        exit 1
    fi

    # Check for crash loops
    if [ "$API_RESTART_COUNT" -gt 0 ] || [ "$WEB_RESTART_COUNT" -gt 0 ]; then
        log_error "Pods have restarted (API: $API_RESTART_COUNT, Web: $WEB_RESTART_COUNT). Rolling back..."
        kubectl patch svc physioflow-api -n "$NAMESPACE" \
            -p "{\"spec\":{\"selector\":{\"version\":\"$CURRENT_VERSION\"}}}"
        kubectl patch svc physioflow-web -n "$NAMESPACE" \
            -p "{\"spec\":{\"selector\":{\"version\":\"$CURRENT_VERSION\"}}}"
        log_error "Rolled back to $CURRENT_VERSION"
        exit 1
    fi

    # Check logs for critical errors
    API_ERROR_COUNT=$(kubectl logs "$API_POD" -n "$NAMESPACE" --tail=50 2>/dev/null | grep -i "error\|fatal\|panic" | wc -l || echo 0)
    WEB_ERROR_COUNT=$(kubectl logs "$WEB_POD" -n "$NAMESPACE" --tail=50 2>/dev/null | grep -i "error\|fatal\|panic" | wc -l || echo 0)

    if [ "$API_ERROR_COUNT" -gt 10 ] || [ "$WEB_ERROR_COUNT" -gt 10 ]; then
        ERRORS_DETECTED=$((ERRORS_DETECTED + 1))
        log_warning "High error count detected (API: $API_ERROR_COUNT, Web: $WEB_ERROR_COUNT) - Count: $ERRORS_DETECTED"
    fi

    # Rollback if too many error intervals detected
    if [ "$ERRORS_DETECTED" -gt 5 ]; then
        log_error "Too many errors detected. Rolling back..."
        kubectl patch svc physioflow-api -n "$NAMESPACE" \
            -p "{\"spec\":{\"selector\":{\"version\":\"$CURRENT_VERSION\"}}}"
        kubectl patch svc physioflow-web -n "$NAMESPACE" \
            -p "{\"spec\":{\"selector\":{\"version\":\"$CURRENT_VERSION\"}}}"
        log_error "Rolled back to $CURRENT_VERSION"
        exit 1
    fi

    echo -ne "\rMonitoring... ${REMAINING}s remaining | API: $API_POD_STATUS (restarts: $API_RESTART_COUNT, errors: $API_ERROR_COUNT) | Web: $WEB_POD_STATUS (restarts: $WEB_RESTART_COUNT, errors: $WEB_ERROR_COUNT)    "
    sleep 10
done

echo ""
log_success "Monitoring period completed successfully"

# Scale down old version
log_info "Scaling down $CURRENT_VERSION version..."
kubectl scale deployment/physioflow-api-"$CURRENT_VERSION" --replicas=0 -n "$NAMESPACE"
kubectl scale deployment/physioflow-web-"$CURRENT_VERSION" --replicas=0 -n "$NAMESPACE"
log_success "Scaled down $CURRENT_VERSION deployments"

# Update migration version configmap
log_info "Updating deployment metadata..."
kubectl patch configmap migration-version -n "$NAMESPACE" \
    -p "{\"data\":{\"last_deployment_version\":\"$NEW_VERSION\",\"last_deployment_date\":\"$(date -Iseconds)\",\"api_image_tag\":\"$API_TAG\",\"web_image_tag\":\"$WEB_TAG\"}}" \
    2>/dev/null || log_warning "Could not update migration-version configmap"

# Print summary
echo ""
echo "============================================"
echo "  Blue-Green Deployment Summary"
echo "============================================"
echo "Environment:     $ENVIRONMENT"
echo "Active version:  $NEW_VERSION"
echo "API image:       registry.trancloud.work/physioflow-api:$API_TAG"
echo "Web image:       registry.trancloud.work/physioflow-web:$WEB_TAG"
echo "Namespace:       $NAMESPACE"
echo "============================================"
echo ""

log_success "Blue-green deployment completed successfully!"
log_info ""
log_info "To verify deployment:"
log_info "  kubectl get pods -n $NAMESPACE"
log_info "  kubectl get svc -n $NAMESPACE"
log_info ""
log_info "To rollback:"
log_info "  kubectl patch svc physioflow-api -n $NAMESPACE -p '{\"spec\":{\"selector\":{\"version\":\"$CURRENT_VERSION\"}}}'"
log_info "  kubectl patch svc physioflow-web -n $NAMESPACE -p '{\"spec\":{\"selector\":{\"version\":\"$CURRENT_VERSION\"}}}'"
log_info "  kubectl scale deployment/physioflow-api-$CURRENT_VERSION --replicas=1 -n $NAMESPACE"
log_info "  kubectl scale deployment/physioflow-web-$CURRENT_VERSION --replicas=1 -n $NAMESPACE"
