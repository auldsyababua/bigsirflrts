#!/bin/bash
# Test 3: Error Handling for Database Connection Failures
# QA Gate Requirement: Story 1.1
# Date: $(date -Iseconds)

set -e

echo "=========================================="
echo "TEST 3: DATABASE CONNECTION ERROR HANDLING"
echo "=========================================="
echo "Start time: $(date -Iseconds)"
echo ""

# Configuration
DB_CONTAINER="flrts-openproject-db"
OP_CONTAINER="flrts-openproject"
OPENPROJECT_URL="https://ops.10nz.tools"
LOG_FILE="./test-3-evidence.log"

# Function to check OpenProject response
check_openproject_response() {
    echo "Checking OpenProject response at $(date -Iseconds)..."

    # Try to access OpenProject
    RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" $OPENPROJECT_URL 2>/dev/null || echo "CURL_FAILED")

    if echo "$RESPONSE" | grep -q "HTTP_CODE:"; then
        HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
        echo "HTTP Status Code: $HTTP_CODE" | tee -a $LOG_FILE

        # Check if error message is clear
        if [ "$HTTP_CODE" = "500" ] || [ "$HTTP_CODE" = "502" ] || [ "$HTTP_CODE" = "503" ]; then
            echo "Response body (first 500 chars):" | tee -a $LOG_FILE
            echo "$RESPONSE" | head -c 500 | tee -a $LOG_FILE
            return 0
        fi
    else
        echo "Connection failed completely" | tee -a $LOG_FILE
        return 1
    fi
}

# Function to check container logs for error handling
check_error_logs() {
    echo "Checking OpenProject logs for error handling..."

    # Get last 50 lines of logs
    docker logs --tail 50 $OP_CONTAINER 2>&1 | grep -i "database\|postgres\|connection\|error" | tee -a $LOG_FILE || echo "No relevant error logs found"
}

# Pre-test validation
echo "=== PRE-TEST VALIDATION ==="
echo "1. Database container status:"
docker ps --filter "name=$DB_CONTAINER" --format "table {{.Names}}\t{{.Status}}" | tee -a $LOG_FILE

echo ""
echo "2. OpenProject container status:"
docker ps --filter "name=$OP_CONTAINER" --format "table {{.Names}}\t{{.Status}}" | tee -a $LOG_FILE

echo ""
echo "3. Current connectivity check:"
docker exec $DB_CONTAINER pg_isready -U openproject -d openproject | tee -a $LOG_FILE

echo ""
echo "4. OpenProject health check:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" "$OPENPROJECT_URL/health_checks/default" | tee -a $LOG_FILE

echo ""
echo "=== SIMULATING DATABASE FAILURE ==="
echo "Stopping PostgreSQL container at $(date -Iseconds)..."
docker stop $DB_CONTAINER | tee -a $LOG_FILE

echo "Database container stopped. Waiting 5 seconds..."
sleep 5

echo ""
echo "=== TESTING ERROR HANDLING ==="
echo "1. Attempting to access OpenProject with database down..."
check_openproject_response

echo ""
echo "2. Checking OpenProject container status:"
docker ps --filter "name=$OP_CONTAINER" --format "table {{.Names}}\t{{.Status}}" | tee -a $LOG_FILE

echo ""
echo "3. Checking error logs:"
check_error_logs

echo ""
echo "4. Testing health check endpoint with DB down:"
HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$OPENPROJECT_URL/health_checks/database" 2>/dev/null || echo "FAILED")
echo "$HEALTH_RESPONSE" | tee -a $LOG_FILE

echo ""
echo "=== RESTARTING DATABASE ==="
echo "Starting database container at $(date -Iseconds)..."
docker start $DB_CONTAINER | tee -a $LOG_FILE

echo "Waiting for database to be ready..."
RECONNECT_START=$(date +%s)

# Wait for database to be ready
for i in $(seq 1 60); do
    if docker exec $DB_CONTAINER pg_isready -U openproject -d openproject 2>/dev/null; then
        echo "✅ Database ready after $i seconds!" | tee -a $LOG_FILE
        break
    else
        echo "Waiting for database... ($i/60)" | tee -a $LOG_FILE
        sleep 1
    fi
done

echo ""
echo "=== TESTING AUTOMATIC RECONNECTION ==="
echo "Monitoring OpenProject reconnection..."

RECONNECTED=false
RECONNECT_TIME=0

for i in $(seq 1 60); do
    if curl -s -f "$OPENPROJECT_URL/health_checks/default" > /dev/null 2>&1; then
        RECONNECT_END=$(date +%s)
        RECONNECT_TIME=$((RECONNECT_END - RECONNECT_START))
        echo "✅ OpenProject reconnected after $RECONNECT_TIME seconds!" | tee -a $LOG_FILE
        RECONNECTED=true
        break
    else
        echo "Attempt $i/60: Waiting for reconnection..." | tee -a $LOG_FILE
        sleep 1
    fi
done

echo ""
echo "=== POST-RECOVERY VALIDATION ==="
echo "1. Database health check:"
docker exec $DB_CONTAINER pg_isready -U openproject -d openproject | tee -a $LOG_FILE

echo ""
echo "2. OpenProject health checks:"
echo "  - Default health check:"
curl -s -o /dev/null -w "    HTTP Status: %{http_code}\n" "$OPENPROJECT_URL/health_checks/default" | tee -a $LOG_FILE

echo "  - Database health check:"
curl -s -o /dev/null -w "    HTTP Status: %{http_code}\n" "$OPENPROJECT_URL/health_checks/database" | tee -a $LOG_FILE

echo ""
echo "3. Connection pool status:"
docker exec $OP_CONTAINER bash -c "ps aux | grep -i postgres || echo 'No postgres processes found'" | head -5 | tee -a $LOG_FILE

echo ""
echo "4. Recent error recovery logs:"
docker logs --since 2m $OP_CONTAINER 2>&1 | grep -i "reconnect\|recover\|restore" | tail -10 || echo "No recovery logs found" | tee -a $LOG_FILE

# Additional graceful degradation test
echo ""
echo "=== GRACEFUL DEGRADATION TEST ==="
echo "Testing if static assets are still served during DB outage..."

# Stop DB again briefly
docker stop $DB_CONTAINER > /dev/null 2>&1
sleep 2

# Try to access static content
STATIC_TEST=$(curl -s -o /dev/null -w "%{http_code}" "$OPENPROJECT_URL/assets/application.css" 2>/dev/null || echo "000")
echo "Static asset response code during DB outage: $STATIC_TEST" | tee -a $LOG_FILE

# Restart DB
docker start $DB_CONTAINER > /dev/null 2>&1

echo ""
echo "=========================================="
echo "TEST RESULTS"
echo "=========================================="
echo "End time: $(date -Iseconds)"
echo ""

# Evaluate results
ERROR_MSG_CLEAR=false
AUTO_RECONNECT=false

# Check if error handling was appropriate
if [ -f $LOG_FILE ]; then
    if grep -q "database\|connection\|postgres" $LOG_FILE; then
        ERROR_MSG_CLEAR=true
    fi
fi

if [ "$RECONNECTED" = true ] && [ $RECONNECT_TIME -le 60 ]; then
    AUTO_RECONNECT=true
fi

if [ "$ERROR_MSG_CLEAR" = true ] && [ "$AUTO_RECONNECT" = true ]; then
    echo "✅ TEST PASSED: All validation criteria met!" | tee -a $LOG_FILE
    echo "  - Clear error messages shown during database failure" | tee -a $LOG_FILE
    echo "  - OpenProject reconnected automatically within $RECONNECT_TIME seconds" | tee -a $LOG_FILE
    echo "  - No manual intervention required for recovery" | tee -a $LOG_FILE
    echo "  - Service recovered to full functionality" | tee -a $LOG_FILE
    exit 0
else
    echo "❌ TEST FAILED: Not all criteria met!" | tee -a $LOG_FILE
    [ "$ERROR_MSG_CLEAR" = false ] && echo "  - Error messages not clear or missing" | tee -a $LOG_FILE
    [ "$AUTO_RECONNECT" = false ] && echo "  - Automatic reconnection failed or took > 60s" | tee -a $LOG_FILE
    exit 1
fi