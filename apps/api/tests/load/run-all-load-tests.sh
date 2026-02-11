#!/bin/bash

# Run all load tests and generate summary report
# Usage: ./run-all-load-tests.sh [API_URL]

set -e

API_URL=${1:-http://localhost:7011}
RESULTS_DIR="./results/$(date +%Y%m%d_%H%M%S)"

echo "========================================="
echo "PhysioFlow Load Test Suite"
echo "========================================="
echo ""
echo "API URL: $API_URL"
echo "Results directory: $RESULTS_DIR"
echo ""

# Create results directory
mkdir -p "$RESULTS_DIR"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test
run_test() {
    local test_name=$1
    local test_file=$2
    local description=$3

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo "========================================="
    echo "Test: $test_name"
    echo "Description: $description"
    echo "========================================="
    echo ""

    if k6 run \
        --env API_URL="$API_URL" \
        --out "json=$RESULTS_DIR/${test_name}-results.json" \
        --quiet \
        "$test_file"; then

        echo -e "${GREEN}✓ PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi

    echo ""
    echo ""
}

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}Error: k6 is not installed${NC}"
    echo "Install k6 from: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Check if API is reachable
echo "Checking API health..."
if curl -sf "$API_URL/health" > /dev/null; then
    echo -e "${GREEN}✓ API is reachable${NC}"
else
    echo -e "${YELLOW}⚠ Warning: API health check failed${NC}"
    echo "Continuing anyway..."
fi
echo ""

# Run all tests
run_test "bhyt-validation" \
    "bhyt-validation.js" \
    "BHYT insurance card validation (target: p95 < 100ms, 100 req/s)"

run_test "outcome-measures" \
    "outcome-measures.js" \
    "Outcome measures progress calculation (target: p95 < 500ms, 50 req/s)"

run_test "medical-term-search" \
    "medical-term-search.js" \
    "Medical term trigram search (target: p95 < 200ms, 200 req/s)"

run_test "discharge-pdf" \
    "discharge-pdf.js" \
    "Discharge summary PDF generation (target: p95 < 3s, 10 req/s)"

run_test "billing-calculation" \
    "billing-calculation.js" \
    "Billing calculation with insurance (target: p95 < 200ms, 100 req/s)"

# Generate summary report
echo "========================================="
echo "Summary Report"
echo "========================================="
echo ""
echo "Total tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo ""
echo "Results saved to: $RESULTS_DIR"
echo ""

# Generate HTML report if results exist
if [ -f "$RESULTS_DIR/bhyt-validation-results.json" ]; then
    echo "Generating HTML report..."

    cat > "$RESULTS_DIR/index.html" <<EOF
<!DOCTYPE html>
<html>
<head>
    <title>PhysioFlow Load Test Results</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 { color: #2c3e50; }
        .summary {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .test-result {
            background: white;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .passed { border-left: 4px solid #27ae60; }
        .failed { border-left: 4px solid #e74c3c; }
        .metric {
            display: inline-block;
            margin-right: 20px;
            padding: 5px 10px;
            background: #ecf0f1;
            border-radius: 4px;
            font-size: 14px;
        }
        .metric strong { color: #2c3e50; }
        .timestamp { color: #7f8c8d; font-size: 14px; }
    </style>
</head>
<body>
    <h1>PhysioFlow Load Test Results</h1>

    <div class="summary">
        <h2>Summary</h2>
        <p class="timestamp">Run: $(date)</p>
        <p><strong>Total Tests:</strong> $TOTAL_TESTS</p>
        <p><strong>Passed:</strong> <span style="color: #27ae60;">$PASSED_TESTS</span></p>
        <p><strong>Failed:</strong> <span style="color: #e74c3c;">$FAILED_TESTS</span></p>
    </div>

    <h2>Test Results</h2>

    <div class="test-result passed">
        <h3>BHYT Validation</h3>
        <p>Target: p95 &lt; 100ms, 100 req/s</p>
        <div>
            <span class="metric"><strong>Status:</strong> View JSON results</span>
            <span class="metric"><a href="bhyt-validation-results.json">Results JSON</a></span>
        </div>
    </div>

    <div class="test-result passed">
        <h3>Outcome Measures</h3>
        <p>Target: p95 &lt; 500ms, 50 req/s</p>
        <div>
            <span class="metric"><a href="outcome-measures-results.json">Results JSON</a></span>
        </div>
    </div>

    <div class="test-result passed">
        <h3>Medical Term Search</h3>
        <p>Target: p95 &lt; 200ms, 200 req/s</p>
        <div>
            <span class="metric"><a href="medical-term-search-results.json">Results JSON</a></span>
        </div>
    </div>

    <div class="test-result passed">
        <h3>Discharge PDF Generation</h3>
        <p>Target: p95 &lt; 3s, 10 req/s</p>
        <div>
            <span class="metric"><a href="discharge-pdf-results.json">Results JSON</a></span>
        </div>
    </div>

    <div class="test-result passed">
        <h3>Billing Calculation</h3>
        <p>Target: p95 &lt; 200ms, 100 req/s</p>
        <div>
            <span class="metric"><a href="billing-calculation-results.json">Results JSON</a></span>
        </div>
    </div>

</body>
</html>
EOF

    echo "HTML report generated: $RESULTS_DIR/index.html"
    echo "Open in browser: file://$(realpath "$RESULTS_DIR/index.html")"
fi

# Exit with error if any tests failed
if [ $FAILED_TESTS -gt 0 ]; then
    exit 1
fi
