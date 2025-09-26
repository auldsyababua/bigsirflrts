#!/bin/bash
# OpenProject Operational Resilience Tests for Story 1.1
# Critical tests to verify production readiness on Digital Ocean

set -euo pipefail

# Configuration
OPENPROJECT_URL="${OPENPROJECT_URL:-https://ops.10nz.tools}"
SSH_HOST="${SSH_HOST:-root@165.227.216.172}"
ADMIN_USER="${OPENPROJECT_ADMIN_USER:-admin}"
ADMIN_PASS="${OPENPROJECT_ADMIN_PASS:-mqsgyCQNQ2q*NCMT8QARXKJqz}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
CRITICAL_FAILURES=""

echo "============================================="
echo "OpenProject Operational Resilience Testing"
echo "Target: ${OPENPROJECT_URL}"
echo "Date: $(date -Iseconds)"
echo "============================================="

# Function to record test results
record_result() {
    local test_name="$1"
    local result="$2"
    local details="$3"

    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} ${test_name}: PASSED"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC} ${test_name}: FAILED - ${details}"
        ((TESTS_FAILED++))
        CRITICAL_FAILURES="${CRITICAL_FAILURES}\n- ${test_name}: ${details}"
    fi
}

# TEST 1: Health Check Response Time
echo -e "\n${YELLOW}TEST 1: Health Check Performance${NC}"
START_TIME=$(date +%s%N)
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${OPENPROJECT_URL}/health_checks/default" || echo "000")
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 )) # Convert to milliseconds

if [ "$HTTP_STATUS" = "200" ] && [ "$RESPONSE_TIME" -lt 500 ]; then
    record_result "Health Check Response" "PASS" "Response time: ${RESPONSE_TIME}ms"
else
    record_result "Health Check Response" "FAIL" "HTTP ${HTTP_STATUS}, Time: ${RESPONSE_TIME}ms (Required: <500ms)"
fi

# TEST 2: Worker Health Status
echo -e "\n${YELLOW}TEST 2: Background Worker Health${NC}"
WORKER_STATUS=$(curl -s "${OPENPROJECT_URL}/health_checks/worker" 2>/dev/null | grep -o "PASSED\|FAILED" || echo "FAILED")
if [ "$WORKER_STATUS" = "PASSED" ]; then
    record_result "Worker Health" "PASS" "Workers active"
else
    record_result "Worker Health" "FAIL" "No good_job processes active"
fi

# TEST 3: Job Queue Status
echo -e "\n${YELLOW}TEST 3: Job Queue Backlog${NC}"
QUEUE_STATUS=$(curl -s "${OPENPROJECT_URL}/health_checks/worker_backed_up" 2>/dev/null | grep -o "PASSED\|FAILED" || echo "FAILED")
if [ "$QUEUE_STATUS" = "PASSED" ]; then
    record_result "Job Queue" "PASS" "No backlog detected"
else
    record_result "Job Queue" "FAIL" "Jobs waiting >5 minutes"
fi

# TEST 4: Performance Load Test (95th percentile)
echo -e "\n${YELLOW}TEST 4: Performance Load Test${NC}"
echo "Running 100 requests with 10 concurrent connections..."

# Use Apache Bench if available, otherwise use curl loop
if command -v ab &> /dev/null; then
    AB_RESULT=$(ab -n 100 -c 10 -g /tmp/ab_results.txt "${OPENPROJECT_URL}/login" 2>&1 | grep "95%" | awk '{print $2}')
    P95_TIME=$(echo "$AB_RESULT" | sed 's/[^0-9]//g')

    if [ -n "$P95_TIME" ] && [ "$P95_TIME" -lt 200 ]; then
        record_result "95th Percentile Response" "PASS" "${P95_TIME}ms"
    else
        record_result "95th Percentile Response" "FAIL" "${P95_TIME}ms (Required: <200ms)"
    fi
else
    # Fallback: Simple sequential test
    TOTAL_TIME=0
    for i in {1..10}; do
        START=$(date +%s%N)
        curl -s -o /dev/null "${OPENPROJECT_URL}/login"
        END=$(date +%s%N)
        TIME=$(( (END - START) / 1000000 ))
        TOTAL_TIME=$((TOTAL_TIME + TIME))
    done
    AVG_TIME=$((TOTAL_TIME / 10))

    if [ "$AVG_TIME" -lt 200 ]; then
        record_result "Average Response Time" "PASS" "${AVG_TIME}ms"
    else
        record_result "Average Response Time" "FAIL" "${AVG_TIME}ms (Required: <200ms)"
    fi
fi

# TEST 5: Container Health via SSH
echo -e "\n${YELLOW}TEST 5: Container Health Check${NC}"
if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$SSH_HOST" "docker ps --filter name=openproject --format '{{.Status}}'" 2>/dev/null | grep -q "healthy"; then
    record_result "Container Health" "PASS" "OpenProject container healthy"
else
    record_result "Container Health" "FAIL" "Cannot verify container health (SSH access required)"
fi

# TEST 6: Database Persistence Test
echo -e "\n${YELLOW}TEST 6: Database Connection${NC}"
DB_TEST=$(curl -s "${OPENPROJECT_URL}/health_checks/database" 2>/dev/null | grep -o "PASSED\|FAILED" || echo "FAILED")
if [ "$DB_TEST" = "PASSED" ]; then
    record_result "Database Connection" "PASS" "Supabase connection active"
else
    record_result "Database Connection" "FAIL" "Database health check failed"
fi

# TEST 7: Cloudflare Tunnel Status
echo -e "\n${YELLOW}TEST 7: Cloudflare Tunnel${NC}"
CF_HEADER=$(curl -sI "${OPENPROJECT_URL}" | grep -i "cf-ray" | wc -l)
if [ "$CF_HEADER" -gt 0 ]; then
    record_result "Cloudflare Tunnel" "PASS" "Traffic routed through Cloudflare"
else
    record_result "Cloudflare Tunnel" "FAIL" "No Cloudflare headers detected"
fi

# TEST 8: Security - Port Exposure
echo -e "\n${YELLOW}TEST 8: Security Port Check${NC}"
DIRECT_ACCESS=$(timeout 2 nc -zv 165.227.216.172 8080 2>&1 | grep -c "succeeded\|open" || echo "0")
if [ "$DIRECT_ACCESS" -eq 0 ]; then
    record_result "Port Security" "PASS" "Port 8080 properly blocked"
else
    record_result "Port Security" "FAIL" "Port 8080 exposed to internet"
fi

# TEST 9: API Authentication
echo -e "\n${YELLOW}TEST 9: API Authentication${NC}"
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${OPENPROJECT_URL}/api/v3/work_packages")
if [ "$API_STATUS" = "401" ]; then
    record_result "API Security" "PASS" "Requires authentication (401)"
else
    record_result "API Security" "FAIL" "Unexpected status: ${API_STATUS}"
fi

# TEST 10: Resource Monitoring
echo -e "\n${YELLOW}TEST 10: VM Resource Usage${NC}"
if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$SSH_HOST" "docker stats --no-stream --format 'table {{.Container}}\t{{.CPUPerc}}\t{{.MemPerc}}'" 2>/dev/null; then
    # Parse resource usage (this is simplified, would need more complex parsing in production)
    record_result "Resource Monitoring" "PASS" "Resource stats available"
else
    record_result "Resource Monitoring" "FAIL" "Cannot access VM for monitoring"
fi

# Summary Report
echo -e "\n============================================="
echo "TEST EXECUTION SUMMARY"
echo "============================================="
echo -e "${GREEN}Passed:${NC} ${TESTS_PASSED}"
echo -e "${RED}Failed:${NC} ${TESTS_FAILED}"

if [ "$TESTS_FAILED" -gt 0 ]; then
    echo -e "\n${RED}CRITICAL FAILURES:${NC}${CRITICAL_FAILURES}"
fi

# Calculate quality score
QUALITY_SCORE=$((100 - (TESTS_FAILED * 10)))
if [ "$QUALITY_SCORE" -lt 0 ]; then
    QUALITY_SCORE=0
fi

echo -e "\n${YELLOW}Quality Score: ${QUALITY_SCORE}/100${NC}"

# Gate Decision
if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "\n${GREEN}GATE DECISION: PASS${NC}"
    exit 0
elif [ "$TESTS_FAILED" -le 2 ]; then
    echo -e "\n${YELLOW}GATE DECISION: CONCERNS${NC}"
    exit 1
else
    echo -e "\n${RED}GATE DECISION: FAIL${NC}"
    exit 2
fi