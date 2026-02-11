#!/bin/bash
# Smoke Tests for PhysioFlow API
# Usage: ./smoke-tests.sh <api-url>
#
# Runs a suite of smoke tests against a deployed API instance
# Returns 0 if all tests pass, 1 if any test fails

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
TIMEOUT=10
TEST_RESULTS=()

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Check arguments
if [ $# -lt 1 ]; then
    log_error "Usage: $0 <api-url>"
    log_error "Example: $0 http://10.42.0.123:7011"
    exit 1
fi

API_URL="$1"
log_info "Running smoke tests against: $API_URL"

# Test function
run_test() {
    local test_name="$1"
    local endpoint="$2"
    local method="${3:-GET}"
    local expected_status="${4:-200}"
    local data="${5:-}"

    log_info "Testing: $test_name"

    local response_code
    if [ -n "$data" ]; then
        response_code=$(curl -s -o /dev/null -w "%{http_code}" \
            -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            --max-time "$TIMEOUT" \
            "$API_URL$endpoint" 2>/dev/null || echo "000")
    else
        response_code=$(curl -s -o /dev/null -w "%{http_code}" \
            -X "$method" \
            --max-time "$TIMEOUT" \
            "$API_URL$endpoint" 2>/dev/null || echo "000")
    fi

    if [ "$response_code" == "$expected_status" ]; then
        log_success "$test_name (HTTP $response_code)"
        TEST_RESULTS+=("PASS")
        return 0
    else
        log_error "$test_name (Expected HTTP $expected_status, got $response_code)"
        TEST_RESULTS+=("FAIL")
        return 1
    fi
}

# Test 1: Health check
run_test "Health Check" "/health" "GET" "200"

# Test 2: Ready check
run_test "Readiness Check" "/ready" "GET" "200" || true

# Test 3: API version/info
run_test "API Version" "/api/v1/info" "GET" "200" || true

# Test 4: BHYT insurance validation endpoint
BHYT_PAYLOAD='{"card_number":"HC1234567890123","visit_date":"2026-02-11"}'
run_test "BHYT Insurance Validation" "/api/v1/insurance/bhyt/validate" "POST" "200" "$BHYT_PAYLOAD" || true

# Test 5: Outcome measures library
run_test "Outcome Measures Library" "/api/v1/outcome-measures/library" "GET" "200" || true

# Test 6: Service codes endpoint
run_test "PT Service Codes" "/api/v1/billing/service-codes" "GET" "200" || true

# Test 7: Clinical protocols
run_test "Clinical Protocols" "/api/v1/protocols" "GET" "200" || true

# Test 8: Medical terms search
run_test "Medical Terms Search" "/api/v1/medical-terms/search?q=vai&lang=vi" "GET" "200" || true

# Test 9: Database connectivity check
run_test "Database Connectivity" "/api/v1/health/db" "GET" "200" || true

# Calculate results
TOTAL_TESTS=${#TEST_RESULTS[@]}
PASSED_TESTS=$(printf '%s\n' "${TEST_RESULTS[@]}" | grep -c "PASS" || echo 0)
FAILED_TESTS=$((TOTAL_TESTS - PASSED_TESTS))

echo ""
echo "================================"
echo "  Smoke Test Results"
echo "================================"
echo "Total tests:  $TOTAL_TESTS"
echo -e "Passed:       ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:       ${RED}$FAILED_TESTS${NC}"
echo "================================"

if [ "$FAILED_TESTS" -gt 0 ]; then
    log_error "Some smoke tests failed"
    exit 1
fi

log_success "All smoke tests passed!"
exit 0
