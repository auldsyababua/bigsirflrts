#!/bin/bash

# n8n Operational Resilience Test Runner
# Executes comprehensive failure scenario tests for Story 1.3
# Requires Docker and docker-compose

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/infrastructure/docker/docker-compose.single.yml"
TEST_RESULTS_FILE="$PROJECT_ROOT/test-results/resilience-tests.json"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=5

echo -e "${BLUE}=== n8n Operational Resilience Testing ===${NC}"
echo "Testing single-instance deployment per ADR-001"
echo ""

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"

    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}ERROR: Docker is not installed${NC}"
        exit 1
    fi

    # Check docker-compose
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}ERROR: docker-compose is not installed${NC}"
        exit 1
    fi

    # Check if single-instance config exists
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        echo -e "${RED}ERROR: Single-instance docker-compose file not found${NC}"
        echo "Expected at: $DOCKER_COMPOSE_FILE"
        exit 1
    fi

    echo -e "${GREEN}✓ Prerequisites satisfied${NC}"
}

# Function to start n8n
start_n8n() {
    echo -e "${YELLOW}Starting n8n single-instance deployment...${NC}"

    # Set required environment variables if not set
    export POSTGRES_USER=${POSTGRES_USER:-n8n}
    export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-securepassword123}
    export N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY:-test-encryption-key-32chars-long!!!}
    export N8N_HOST=${N8N_HOST:-localhost}
    export WEBHOOK_URL=${WEBHOOK_URL:-http://localhost:5678}

    # Start containers
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d

    # Wait for n8n to be healthy
    echo "Waiting for n8n to be healthy..."
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:5678/healthz &> /dev/null; then
            echo -e "${GREEN}✓ n8n is healthy${NC}"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done

    echo -e "${RED}✗ n8n failed to start${NC}"
    return 1
}

# Function to run a specific test
run_test() {
    local test_id=$1
    local test_name=$2
    local test_command=$3

    echo ""
    echo -e "${BLUE}[$test_id] $test_name${NC}"
    echo "----------------------------------------"

    if eval "$test_command"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Test: Container Resilience
test_container_resilience() {
    echo "Testing container auto-restart during webhook processing..."

    # Send webhook in background
    curl -X POST http://localhost:5678/webhook-test/resilience \
        -H "Content-Type: application/json" \
        -d '{"action":"long_running","duration":10000}' \
        --max-time 15 &> /dev/null &
    WEBHOOK_PID=$!

    sleep 2

    # Stop container
    echo "Stopping n8n container..."
    docker stop docker-n8n-1 &> /dev/null

    # Wait for auto-restart
    sleep 5

    # Check if container restarted
    if [ "$(docker inspect -f '{{.State.Status}}' docker-n8n-1 2>/dev/null)" == "running" ]; then
        # Test new webhook
        if curl -X POST http://localhost:5678/webhook-test/after-restart \
            -H "Content-Type: application/json" \
            -d '{"test":"recovery"}' \
            --max-time 5 &> /dev/null; then
            return 0
        fi
    fi

    return 1
}

# Test: Database Connection
test_database_connection() {
    echo "Testing Supabase connection failure and recovery..."

    # Block Supabase (simulate network failure)
    echo "Blocking Supabase connection..."
    docker exec flrts-n8n sh -c "iptables -A OUTPUT -d aws-0-us-west-1.pooler.supabase.com -j DROP" 2>/dev/null || true

    sleep 3

    # Check health during disconnection
    local health_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5678/healthz)

    # Restore connection
    echo "Restoring Supabase connection..."
    docker exec flrts-n8n sh -c "iptables -D OUTPUT -d aws-0-us-west-1.pooler.supabase.com -j DROP" 2>/dev/null || true

    sleep 5

    # Verify recovery
    if curl -X POST http://localhost:5678/webhook-test/db-recovery \
        -H "Content-Type: application/json" \
        -d '{"test":"recovery"}' \
        --max-time 5 &> /dev/null; then
        return 0
    fi

    return 1
}

# Test: Webhook Timeout
test_webhook_timeout() {
    echo "Testing webhook timeout handling (>30s)..."

    # Send long-running webhook
    local timeout_result=$(curl -X POST http://localhost:5678/webhook-test/timeout \
        -H "Content-Type: application/json" \
        -d '{"action":"timeout_test","duration":35000}' \
        --max-time 35 -w "%{http_code}" -o /dev/null -s 2>&1)

    # Send concurrent webhook to verify no hang
    local concurrent_result=$(curl -X POST http://localhost:5678/webhook-test/concurrent \
        -H "Content-Type: application/json" \
        -d '{"test":"concurrent"}' \
        --max-time 5 -w "%{http_code}" -o /dev/null -s)

    if [ "$concurrent_result" == "200" ] || [ "$concurrent_result" == "204" ]; then
        return 0
    fi

    return 1
}

# Test: Memory Pressure
test_memory_pressure() {
    echo "Testing memory pressure handling..."

    # Get initial memory
    local initial_mem=$(docker stats flrts-n8n --no-stream --format "{{.MemUsage}}" | awk '{print $1}' | sed 's/[^0-9.]//g')
    echo "Initial memory: ${initial_mem}MB"

    # Create memory pressure
    echo "Creating memory pressure with concurrent workflows..."
    for i in {1..10}; do
        curl -X POST http://localhost:5678/webhook-test/memory-$i \
            -H "Content-Type: application/json" \
            -d "{\"action\":\"memory_intensive\",\"data\":\"$(dd if=/dev/urandom bs=1024 count=1024 2>/dev/null | base64)\"}" \
            --max-time 10 &> /dev/null &
    done

    sleep 10

    # Check if container still running
    if [ "$(docker inspect -f '{{.State.Status}}' flrts-n8n 2>/dev/null)" == "running" ]; then
        # Get peak memory
        local peak_mem=$(docker stats flrts-n8n --no-stream --format "{{.MemUsage}}" | awk '{print $1}' | sed 's/[^0-9.]//g')
        echo "Peak memory: ${peak_mem}MB"

        # Check if under 2GB limit
        if (( $(echo "$peak_mem < 2048" | bc -l) )); then
            return 0
        fi
    fi

    return 1
}

# Test: Health Endpoint
test_health_endpoint() {
    echo "Testing health endpoint reliability..."

    local total_time=0
    local measurements=0
    local failed=0

    # Test response times
    for i in {1..10}; do
        local start_time=$(date +%s%N)
        local http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 1 http://localhost:5678/healthz)
        local end_time=$(date +%s%N)

        if [ "$http_code" == "200" ]; then
            local response_time=$(( (end_time - start_time) / 1000000 ))
            total_time=$((total_time + response_time))
            measurements=$((measurements + 1))
        else
            failed=$((failed + 1))
        fi

        sleep 0.1
    done

    if [ $measurements -gt 0 ]; then
        local avg_time=$((total_time / measurements))
        echo "Average response time: ${avg_time}ms"

        # Check if <500ms average and >80% success rate
        if [ $avg_time -lt 500 ] && [ $failed -lt 2 ]; then
            return 0
        fi
    fi

    return 1
}

# Function to generate test report
generate_report() {
    echo ""
    echo -e "${BLUE}=== Test Results Summary ===${NC}"
    echo "----------------------------------------"
    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
    echo -e "Total Tests: $TESTS_TOTAL"
    echo ""

    # Create test results directory
    mkdir -p "$(dirname "$TEST_RESULTS_FILE")"

    # Generate JSON report
    cat > "$TEST_RESULTS_FILE" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "tests_passed": $TESTS_PASSED,
  "tests_failed": $TESTS_FAILED,
  "tests_total": $TESTS_TOTAL,
  "success_rate": $(echo "scale=2; $TESTS_PASSED * 100 / $TESTS_TOTAL" | bc)
}
EOF

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ All operational resilience tests PASSED${NC}"
        echo ""
        echo "QA Gate Status: READY TO PASS"
        return 0
    else
        echo -e "${RED}✗ Some tests FAILED${NC}"
        echo ""
        echo "QA Gate Status: NOT READY"
        return 1
    fi
}

# Function to cleanup
cleanup() {
    echo ""
    echo -e "${YELLOW}Cleaning up test environment...${NC}"

    # Restore any network rules
    docker exec flrts-n8n sh -c "iptables -F OUTPUT" 2>/dev/null || true

    # Optional: Stop containers
    # docker-compose -f "$DOCKER_COMPOSE_FILE" down

    echo -e "${GREEN}✓ Cleanup complete${NC}"
}

# Main execution
main() {
    # Trap cleanup on exit
    trap cleanup EXIT

    # Check prerequisites
    check_prerequisites

    # Start n8n if not running
    start_n8n

    echo ""
    echo -e "${BLUE}Running Operational Resilience Tests${NC}"
    echo "======================================="

    # Run tests
    run_test "CONTAINER-RESILIENCE-001" \
        "Container restart during webhook processing" \
        "test_container_resilience"

    run_test "DATABASE-CONNECTION-002" \
        "Supabase connection failure and recovery" \
        "test_database_connection"

    run_test "WEBHOOK-TIMEOUT-003" \
        "Webhook processing timeout handling" \
        "test_webhook_timeout"

    run_test "MEMORY-PRESSURE-004" \
        "Memory limit approach testing" \
        "test_memory_pressure"

    run_test "HEALTH-ENDPOINT-005" \
        "Health check reliability testing" \
        "test_health_endpoint"

    # Generate report
    generate_report

    exit $?
}

# Run main function
main "$@"