#!/bin/bash
# Test PhysioFlow metrics endpoint locally
# Usage: ./test-metrics.sh [format]
#   format: json (default) or prometheus

set -e

FORMAT="${1:-json}"
API_URL="${API_URL:-http://localhost:7011}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}PhysioFlow Metrics Test${NC}"
echo -e "${GREEN}========================================${NC}"
echo

# Check if API is running
echo -e "${YELLOW}Checking API availability...${NC}"
if curl -s -o /dev/null -w "%{http_code}" "${API_URL}/health" | grep -q "200"; then
    echo -e "${GREEN}✓ API is running at ${API_URL}${NC}"
else
    echo -e "${YELLOW}Warning: API may not be running at ${API_URL}${NC}"
    echo -e "${YELLOW}Make sure to start the API first: make dev${NC}"
    exit 1
fi
echo

# Test metrics endpoint
echo -e "${YELLOW}Fetching metrics in ${FORMAT} format...${NC}"
echo

if [ "$FORMAT" = "prometheus" ]; then
    curl -s "${API_URL}/metrics?format=prometheus" | head -n 50
    echo
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Feature Metrics Summary${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo

    # Show summary of key metrics
    RESPONSE=$(curl -s "${API_URL}/metrics?format=prometheus")

    echo -e "${YELLOW}BHYT Insurance:${NC}"
    echo "$RESPONSE" | grep -E "^bhyt_" | head -n 10 || echo "  No metrics yet"
    echo

    echo -e "${YELLOW}Outcome Measures:${NC}"
    echo "$RESPONSE" | grep -E "^outcome_" | head -n 5 || echo "  No metrics yet"
    echo

    echo -e "${YELLOW}Billing:${NC}"
    echo "$RESPONSE" | grep -E "^billing_" | head -n 5 || echo "  No metrics yet"
    echo

    echo -e "${YELLOW}Protocols:${NC}"
    echo "$RESPONSE" | grep -E "^protocols_" | head -n 5 || echo "  No metrics yet"
    echo

    echo -e "${YELLOW}Discharge:${NC}"
    echo "$RESPONSE" | grep -E "^discharge_" | head -n 5 || echo "  No metrics yet"
    echo

    echo -e "${YELLOW}Medical Terms:${NC}"
    echo "$RESPONSE" | grep -E "^medical_terms_" | head -n 5 || echo "  No metrics yet"
    echo

    echo -e "${YELLOW}API Requests:${NC}"
    echo "$RESPONSE" | grep -E "^api_request" | head -n 10 || echo "  No metrics yet"
    echo
else
    # JSON format
    curl -s "${API_URL}/metrics" | jq '.' || curl -s "${API_URL}/metrics"
    echo
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Test Complete${NC}"
echo -e "${GREEN}========================================${NC}"
echo
echo -e "To generate sample metrics, use the API:"
echo -e "  # Validate BHYT card"
echo -e "  curl -X POST ${API_URL}/api/v1/patients/123/insurance/validate \\"
echo -e "    -H 'Content-Type: application/json' \\"
echo -e "    -d '{\"card_number\": \"HN1234567890123\"}'"
echo
echo -e "  # Search medical terms"
echo -e "  curl ${API_URL}/api/v1/medical-terms/search?q=đau"
echo
echo -e "  # Calculate coverage"
echo -e "  curl -X POST ${API_URL}/api/v1/patients/123/insurance/calculate-coverage \\"
echo -e "    -H 'Content-Type: application/json' \\"
echo -e "    -d '{\"services\": [{\"code\": \"PT001\", \"quantity\": 1}]}'"
echo
