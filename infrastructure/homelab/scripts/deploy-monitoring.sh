#!/bin/bash
# Deploy PhysioFlow monitoring and observability configuration
# Usage: ./deploy-monitoring.sh [dev|staging|prod]

set -e

ENV="${1:-dev}"
NAMESPACE="physioflow-${ENV}"
MONITORING_NAMESPACE="monitoring"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}PhysioFlow Monitoring Deployment${NC}"
echo -e "${GREEN}Environment: ${ENV}${NC}"
echo -e "${GREEN}========================================${NC}"
echo

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    exit 1
fi

# Check if monitoring namespace exists
if ! kubectl get namespace "${MONITORING_NAMESPACE}" &> /dev/null; then
    echo -e "${YELLOW}Warning: Monitoring namespace '${MONITORING_NAMESPACE}' does not exist${NC}"
    echo -e "${YELLOW}Creating monitoring namespace...${NC}"
    kubectl create namespace "${MONITORING_NAMESPACE}"
fi

# Check if app namespace exists
if ! kubectl get namespace "${NAMESPACE}" &> /dev/null; then
    echo -e "${RED}Error: Application namespace '${NAMESPACE}' does not exist${NC}"
    echo -e "${YELLOW}Please deploy the application first${NC}"
    exit 1
fi

# Navigate to k8s directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K8S_DIR="${SCRIPT_DIR}/../k8s"

echo -e "${GREEN}Step 1: Deploying Grafana dashboards...${NC}"
kubectl apply -f "${K8S_DIR}/base/configmap-grafana-dashboards.yaml" -n "${MONITORING_NAMESPACE}"
echo -e "${GREEN}✓ Grafana dashboards deployed${NC}"
echo

echo -e "${GREEN}Step 2: Deploying Prometheus alert rules...${NC}"
kubectl apply -f "${K8S_DIR}/base/prometheusrule-physioflow.yaml" -n "${MONITORING_NAMESPACE}"
echo -e "${GREEN}✓ Prometheus alert rules deployed${NC}"
echo

echo -e "${GREEN}Step 3: Verifying deployments...${NC}"

# Check if Grafana dashboards ConfigMap exists
if kubectl get configmap grafana-dashboards -n "${MONITORING_NAMESPACE}" &> /dev/null; then
    echo -e "${GREEN}✓ Grafana dashboards ConfigMap found${NC}"
    DASHBOARD_COUNT=$(kubectl get configmap grafana-dashboards -n "${MONITORING_NAMESPACE}" -o json | jq -r '.data | keys | length')
    echo -e "  Found ${DASHBOARD_COUNT} dashboards"
else
    echo -e "${RED}✗ Grafana dashboards ConfigMap not found${NC}"
fi

# Check if PrometheusRule exists
if kubectl get prometheusrule physioflow-alerts -n "${MONITORING_NAMESPACE}" &> /dev/null; then
    echo -e "${GREEN}✓ Prometheus alert rules found${NC}"
    RULE_COUNT=$(kubectl get prometheusrule physioflow-alerts -n "${MONITORING_NAMESPACE}" -o json | jq -r '.spec.groups | length')
    echo -e "  Found ${RULE_COUNT} rule groups"
else
    echo -e "${RED}✗ Prometheus alert rules not found${NC}"
fi
echo

echo -e "${GREEN}Step 4: Restarting monitoring services...${NC}"

# Restart Grafana to load new dashboards
if kubectl get deployment grafana -n "${MONITORING_NAMESPACE}" &> /dev/null; then
    echo -e "${YELLOW}Restarting Grafana...${NC}"
    kubectl rollout restart deployment/grafana -n "${MONITORING_NAMESPACE}"
    kubectl rollout status deployment/grafana -n "${MONITORING_NAMESPACE}" --timeout=60s
    echo -e "${GREEN}✓ Grafana restarted${NC}"
else
    echo -e "${YELLOW}Warning: Grafana deployment not found in namespace '${MONITORING_NAMESPACE}'${NC}"
fi

# Restart Prometheus to load new alert rules
if kubectl get statefulset prometheus -n "${MONITORING_NAMESPACE}" &> /dev/null; then
    echo -e "${YELLOW}Restarting Prometheus...${NC}"
    kubectl rollout restart statefulset/prometheus -n "${MONITORING_NAMESPACE}"
    echo -e "${GREEN}✓ Prometheus restart initiated (may take a few minutes)${NC}"
elif kubectl get deployment prometheus -n "${MONITORING_NAMESPACE}" &> /dev/null; then
    echo -e "${YELLOW}Restarting Prometheus...${NC}"
    kubectl rollout restart deployment/prometheus -n "${MONITORING_NAMESPACE}"
    kubectl rollout status deployment/prometheus -n "${MONITORING_NAMESPACE}" --timeout=60s
    echo -e "${GREEN}✓ Prometheus restarted${NC}"
else
    echo -e "${YELLOW}Warning: Prometheus not found in namespace '${MONITORING_NAMESPACE}'${NC}"
fi
echo

echo -e "${GREEN}Step 5: Checking PhysioFlow API metrics endpoint...${NC}"

# Get API pod
API_POD=$(kubectl get pods -n "${NAMESPACE}" -l app=physioflow-api -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

if [ -n "$API_POD" ]; then
    echo -e "${GREEN}✓ Found API pod: ${API_POD}${NC}"

    # Check if metrics endpoint is accessible
    echo -e "${YELLOW}Testing metrics endpoint...${NC}"
    if kubectl exec -n "${NAMESPACE}" "${API_POD}" -- wget -q -O - http://localhost:8080/metrics?format=prometheus | head -n 5 &> /dev/null; then
        echo -e "${GREEN}✓ Metrics endpoint is accessible${NC}"

        # Show sample metrics
        echo -e "\nSample metrics:"
        kubectl exec -n "${NAMESPACE}" "${API_POD}" -- wget -q -O - http://localhost:8080/metrics?format=prometheus | grep -E "^(bhyt|outcome|billing|protocol|discharge|medical_terms)_" | head -n 10 || true
    else
        echo -e "${YELLOW}Warning: Metrics endpoint not accessible (API may still be starting)${NC}"
    fi
else
    echo -e "${YELLOW}Warning: No API pod found in namespace '${NAMESPACE}'${NC}"
fi
echo

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo
echo -e "Grafana dashboards: ${GREEN}Deployed${NC}"
echo -e "Prometheus alerts:  ${GREEN}Deployed${NC}"
echo
echo -e "${GREEN}Access monitoring:${NC}"
echo -e "  Grafana:    https://grafana.trancloud.work"
echo -e "  Prometheus: https://prometheus.trancloud.work"
echo
echo -e "${GREEN}Available dashboards:${NC}"
echo -e "  1. PhysioFlow PT Features:   /d/physioflow-pt-features"
echo -e "  2. BHYT Insurance Detail:    /d/physioflow-bhyt-detail"
echo -e "  3. Performance Metrics:      /d/physioflow-performance"
echo -e "  4. Error Dashboard:          /d/physioflow-errors"
echo -e "  5. Database Performance:     /d/physioflow-database"
echo
echo -e "${GREEN}Verify deployment:${NC}"
echo -e "  # Check Prometheus targets"
echo -e "  kubectl port-forward -n ${MONITORING_NAMESPACE} svc/prometheus 9090:9090"
echo -e "  # Visit http://localhost:9090/targets"
echo
echo -e "  # Check Grafana dashboards"
echo -e "  kubectl port-forward -n ${MONITORING_NAMESPACE} svc/grafana 3000:3000"
echo -e "  # Visit http://localhost:3000/dashboards"
echo
echo -e "  # Check API metrics"
echo -e "  kubectl port-forward -n ${NAMESPACE} svc/physioflow-api 7011:80"
echo -e "  curl http://localhost:7011/metrics?format=prometheus"
echo
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${GREEN}========================================${NC}"
