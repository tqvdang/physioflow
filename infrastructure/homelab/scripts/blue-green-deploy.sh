#!/bin/bash
# Blue-Green Deployment Script for PhysioFlow
# Usage: ./blue-green-deploy.sh <environment> <image-tag> [--skip-tests]
#
# This script implements zero-downtime deployments by:
# 1. Detecting the current active version (blue/green)
# 2. Deploying to the inactive version
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
ERROR_RATE_THRESHOLD=0.01  # 1% error rate
SKIP_TESTS=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
if [ $# -lt 2 ]; then
    log_error "Usage: $0 <environment> <image-tag> [--skip-tests]"
    log_error "Example: $0 dev v1.2.3"
    exit 1
fi

ENVIRONMENT=$1
IMAGE_TAG=$2

if [ $# -ge 3 ] && [ "$3" == "--skip-tests" ]; then
    SKIP_TESTS=true
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod."
    exit 1
fi

NAMESPACE="physioflow-$ENVIRONMENT"
log_info "Starting blue-green deployment for $ENVIRONMENT environment with image tag $IMAGE_TAG"

# Check if namespace exists
if ! kubectl get namespace "$NAMESPACE" &>/dev/null; then
    log_error "Namespace $NAMESPACE does not exist"
    exit 1
fi

# Detect current active version
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

# Deploy new version
log_info "Deploying $NEW_VERSION version..."
kubectl apply -k "$K8S_BASE/overlays/$ENVIRONMENT"

# Update image for new deployment
DEPLOYMENT_NAME="physioflow-api-$NEW_VERSION"
log_info "Updating image for $DEPLOYMENT_NAME to registry.trancloud.work/physioflow-api:$IMAGE_TAG"
kubectl set image deployment/"$DEPLOYMENT_NAME" api=registry.trancloud.work/physioflow-api:"$IMAGE_TAG" -n "$NAMESPACE"

# Wait for rollout
log_info "Waiting for $NEW_VERSION deployment to be ready..."
if ! kubectl rollout status deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE" --timeout=5m; then
    log_error "Deployment rollout failed"
    exit 1
fi

# Get pod name for new version
NEW_POD=$(kubectl get pods -n "$NAMESPACE" -l "version=$NEW_VERSION" -o jsonpath='{.items[0].metadata.name}')
log_info "New version pod: $NEW_POD"

# Wait for pod to be ready
log_info "Waiting for pod to be ready..."
kubectl wait --for=condition=ready pod/"$NEW_POD" -n "$NAMESPACE" --timeout=2m

# Run smoke tests
if [ "$SKIP_TESTS" == "false" ]; then
    log_info "Running smoke tests against $NEW_VERSION version..."

    # Get the cluster IP of the new deployment
    NEW_POD_IP=$(kubectl get pod "$NEW_POD" -n "$NAMESPACE" -o jsonpath='{.status.podIP}')
    API_URL="http://$NEW_POD_IP:7011"

    if ! "$SCRIPT_DIR/smoke-tests.sh" "$API_URL"; then
        log_error "Smoke tests failed. Aborting deployment."
        log_warning "New version ($NEW_VERSION) is still running but not receiving traffic."
        log_warning "You can manually inspect and then run: kubectl scale deployment/$DEPLOYMENT_NAME --replicas=0 -n $NAMESPACE"
        exit 1
    fi
    log_success "Smoke tests passed"
else
    log_warning "Skipping smoke tests (--skip-tests flag was used)"
fi

# Switch traffic
log_info "Switching traffic from $CURRENT_VERSION to $NEW_VERSION..."
kubectl patch svc physioflow-api -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"version\":\"$NEW_VERSION\"}}}"
log_success "Traffic switched to $NEW_VERSION"

# Monitor for issues
log_info "Monitoring $NEW_VERSION deployment for $MONITORING_DURATION seconds..."
log_info "Checking pod status and logs for errors..."

MONITORING_START=$(date +%s)
MONITORING_END=$((MONITORING_START + MONITORING_DURATION))

while [ $(date +%s) -lt $MONITORING_END ]; do
    ELAPSED=$(($(date +%s) - MONITORING_START))
    REMAINING=$((MONITORING_DURATION - ELAPSED))

    # Check if pod is still running
    POD_STATUS=$(kubectl get pod "$NEW_POD" -n "$NAMESPACE" -o jsonpath='{.status.phase}' 2>/dev/null || echo "Unknown")

    if [ "$POD_STATUS" != "Running" ]; then
        log_error "Pod is no longer running (status: $POD_STATUS). Rolling back..."
        kubectl patch svc physioflow-api -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"version\":\"$CURRENT_VERSION\"}}}"
        log_error "Rolled back to $CURRENT_VERSION"
        exit 1
    fi

    # Check for crash loops
    RESTART_COUNT=$(kubectl get pod "$NEW_POD" -n "$NAMESPACE" -o jsonpath='{.status.containerStatuses[0].restartCount}')
    if [ "$RESTART_COUNT" -gt 0 ]; then
        log_error "Pod has restarted $RESTART_COUNT times. Rolling back..."
        kubectl patch svc physioflow-api -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"version\":\"$CURRENT_VERSION\"}}}"
        log_error "Rolled back to $CURRENT_VERSION"
        exit 1
    fi

    # Check logs for critical errors
    ERROR_COUNT=$(kubectl logs "$NEW_POD" -n "$NAMESPACE" --tail=50 2>/dev/null | grep -i "error\|fatal\|panic" | wc -l || echo 0)
    if [ "$ERROR_COUNT" -gt 5 ]; then
        log_warning "Detected $ERROR_COUNT errors in recent logs"
    fi

    echo -ne "\rMonitoring... ${REMAINING}s remaining (Pod: $POD_STATUS, Restarts: $RESTART_COUNT, Recent errors: $ERROR_COUNT)    "
    sleep 10
done

echo ""
log_success "Monitoring period completed successfully"

# Scale down old version
log_info "Scaling down $CURRENT_VERSION version..."
kubectl scale deployment/physioflow-api-"$CURRENT_VERSION" --replicas=0 -n "$NAMESPACE"
log_success "Scaled down $CURRENT_VERSION deployment"

# Update migration version configmap if needed
log_info "Deployment metadata:"
log_info "  Environment: $ENVIRONMENT"
log_info "  New version: $NEW_VERSION"
log_info "  Image tag: $IMAGE_TAG"
log_info "  Namespace: $NAMESPACE"
log_info "  Deployment: $DEPLOYMENT_NAME"

log_success "Blue-green deployment completed successfully!"
log_info "Active version is now: $NEW_VERSION"
log_info ""
log_info "To rollback, run:"
log_info "  kubectl patch svc physioflow-api -n $NAMESPACE -p '{\"spec\":{\"selector\":{\"version\":\"$CURRENT_VERSION\"}}}'"
log_info "  kubectl scale deployment/physioflow-api-$CURRENT_VERSION --replicas=1 -n $NAMESPACE"
