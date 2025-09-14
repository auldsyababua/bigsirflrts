#!/bin/bash
# run-load-test.sh
# Script to run Artillery load tests against n8n Queue Mode

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "n8n Queue Mode Load Testing"
echo "============================"

# Check if Artillery is installed
if ! command -v artillery &> /dev/null; then
    echo -e "${YELLOW}Artillery not found. Installing...${NC}"
    npm install -g artillery
fi

# Navigate to tests directory
cd "$(dirname "$0")" || exit 1

# Check if test data exists
if [ ! -f test-data.csv ]; then
    echo -e "${RED}test-data.csv not found!${NC}"
    exit 1
fi

# Check if artillery config exists
if [ ! -f artillery-test.yml ]; then
    echo -e "${RED}artillery-test.yml not found!${NC}"
    exit 1
fi

# Clean up old reports
rm -f artillery-report.json artillery-report.html

# Check target availability
TARGET_URL="${1:-https://n8n.10nz.tools}"
echo -e "Testing target: ${GREEN}$TARGET_URL${NC}"

# Test connectivity
echo -n "Checking target availability... "
if curl -s -o /dev/null -w "%{http_code}" "$TARGET_URL/healthz" | grep -q "200"; then
    echo -e "${GREEN}✓ Target is accessible${NC}"
else
    echo -e "${RED}✗ Target is not accessible${NC}"
    echo -e "${YELLOW}Make sure n8n is running and accessible at $TARGET_URL${NC}"
    exit 1
fi

# Run the load test
echo ""
echo -e "${GREEN}Starting load test...${NC}"
echo "This will run for approximately 4 minutes (240 seconds)"
echo ""

artillery run artillery-test.yml --target "$TARGET_URL" || {
    echo -e "${RED}Load test failed!${NC}"
    exit 1
}

echo ""
echo -e "${GREEN}Load test completed!${NC}"

# Check if reports were generated
if [ -f artillery-report.json ]; then
    echo -e "${GREEN}JSON report generated: artillery-report.json${NC}"

    # Parse and display key metrics
    echo ""
    echo "Key Metrics:"
    echo "------------"

    # Using jq if available, otherwise basic grep
    if command -v jq &> /dev/null; then
        echo "Total Requests: $(jq '.aggregate.counters."http.requests" // 0' artillery-report.json)"
        echo "Successful Responses: $(jq '.aggregate.counters."http.codes.200" // 0' artillery-report.json)"
        echo "Mean Response Time: $(jq '.aggregate.summaries."http.response_time".mean // 0' artillery-report.json)ms"
        echo "P95 Response Time: $(jq '.aggregate.summaries."http.response_time".p95 // 0' artillery-report.json)ms"
        echo "P99 Response Time: $(jq '.aggregate.summaries."http.response_time".p99 // 0' artillery-report.json)ms"
    else
        echo "Install jq for detailed metrics: apt-get install jq"
    fi
fi

if [ -f artillery-report.html ]; then
    echo -e "${GREEN}HTML report generated: artillery-report.html${NC}"
    echo "Open in browser to view detailed results"
fi

echo ""
echo "Test Summary:"
echo "- Warm-up: 30s at 5 req/s"
echo "- Ramp-up: 60s from 10 to 100 req/s"
echo "- Sustained: 120s at 100 req/s"
echo "- Cool-down: 30s at 10 req/s"
echo ""
echo -e "${GREEN}✓ Load testing complete${NC}"