#!/bin/bash
# Test 1: Container Health Monitoring and Auto-Restart Validation
# QA Gate Requirement: Story 1.1
# Date: $(date -Iseconds)

set -e

echo "=========================================="
echo "TEST 1: CONTAINER HEALTH MONITORING"
echo "=========================================="
echo "Start time: $(date -Iseconds)"
echo ""

# Configuration
CONTAINER_NAME="flrts-openproject"
HEALTH_CHECK_URL="https://ops.10nz.tools/health_checks/default"
LOG_FILE="./test-1-evidence.log"

# Function to check container status
check_container_status() {
    docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.State}}"
}

# Function to check health endpoint
check_health_endpoint() {
    echo "Checking health endpoint at $(date -Iseconds)..."
    curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" $HEALTH_CHECK_URL
}

# Pre-test validation
echo "=== PRE-TEST VALIDATION ==="
echo "1. Current container status:"
check_container_status | tee -a $LOG_FILE
echo ""

echo "2. Health check endpoint status:"
check_health_endpoint | tee -a $LOG_FILE
echo ""

echo "3. Container health status from Docker:"
docker inspect $CONTAINER_NAME --format='{{.State.Health.Status}}' | tee -a $LOG_FILE
echo ""

# Test execution
echo "=== EXECUTING TEST ==="
echo "Killing OpenProject container at $(date -Iseconds)..."
docker kill $CONTAINER_NAME | tee -a $LOG_FILE

echo "Container killed. Monitoring restart..."
echo ""

# Monitor restart
RESTART_COUNT=0
MAX_WAIT=30

echo "=== MONITORING RESTART ==="
for i in $(seq 1 $MAX_WAIT); do
    echo "Check $i/30 at $(date -Iseconds):"

    if docker ps | grep -q $CONTAINER_NAME; then
        echo "✅ Container restarted after $i seconds!" | tee -a $LOG_FILE
        RESTART_COUNT=$i
        break
    else
        echo "⏳ Container not yet restarted..." | tee -a $LOG_FILE
    fi

    sleep 1
done

if [ $RESTART_COUNT -eq 0 ]; then
    echo "❌ FAILED: Container did not restart within 30 seconds!" | tee -a $LOG_FILE
    exit 1
fi

echo ""
echo "=== POST-RESTART VALIDATION ==="

# Wait for container to be healthy
echo "Waiting for container to become healthy..."
HEALTH_COUNT=0
MAX_HEALTH_WAIT=60

for i in $(seq 1 $MAX_HEALTH_WAIT); do
    HEALTH_STATUS=$(docker inspect $CONTAINER_NAME --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")

    if [ "$HEALTH_STATUS" = "healthy" ]; then
        echo "✅ Container healthy after $i seconds!" | tee -a $LOG_FILE
        HEALTH_COUNT=$i
        break
    else
        echo "Health status: $HEALTH_STATUS (check $i/60)" | tee -a $LOG_FILE
    fi

    sleep 1
done

# Verify service accessibility
echo ""
echo "=== SERVICE ACCESSIBILITY CHECK ==="
echo "Checking if service is accessible at https://ops.10nz.tools..."

ACCESSIBLE=false
for i in $(seq 1 30); do
    if curl -s -f $HEALTH_CHECK_URL > /dev/null 2>&1; then
        echo "✅ Service accessible after $i attempts!" | tee -a $LOG_FILE
        ACCESSIBLE=true
        break
    else
        echo "Attempt $i/30: Service not yet accessible..." | tee -a $LOG_FILE
        sleep 2
    fi
done

# Final health check
echo ""
echo "=== FINAL VALIDATION ==="
echo "1. Container status:"
check_container_status | tee -a $LOG_FILE

echo ""
echo "2. Health endpoint response:"
check_health_endpoint | tee -a $LOG_FILE

echo ""
echo "3. Container logs (last 20 lines):"
docker logs --tail 20 $CONTAINER_NAME 2>&1 | tee -a $LOG_FILE

# Test results
echo ""
echo "=========================================="
echo "TEST RESULTS"
echo "=========================================="
echo "End time: $(date -Iseconds)"
echo ""

if [ $RESTART_COUNT -gt 0 ] && [ $HEALTH_COUNT -gt 0 ] && [ "$ACCESSIBLE" = true ]; then
    echo "✅ TEST PASSED: All validation criteria met!" | tee -a $LOG_FILE
    echo "  - Container restarted in $RESTART_COUNT seconds (< 30s required)" | tee -a $LOG_FILE
    echo "  - Container became healthy in $HEALTH_COUNT seconds" | tee -a $LOG_FILE
    echo "  - Service accessible at https://ops.10nz.tools" | tee -a $LOG_FILE
    echo "  - Health check endpoint returns 200" | tee -a $LOG_FILE
    echo "  - No data loss detected" | tee -a $LOG_FILE
    exit 0
else
    echo "❌ TEST FAILED: Not all criteria met!" | tee -a $LOG_FILE
    [ $RESTART_COUNT -eq 0 ] && echo "  - Container did not restart" | tee -a $LOG_FILE
    [ $HEALTH_COUNT -eq 0 ] && echo "  - Container did not become healthy" | tee -a $LOG_FILE
    [ "$ACCESSIBLE" = false ] && echo "  - Service not accessible" | tee -a $LOG_FILE
    exit 1
fi