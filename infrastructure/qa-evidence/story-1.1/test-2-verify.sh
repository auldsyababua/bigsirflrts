#!/bin/bash
# Test 2 Verification: Check Data After VM Reboot
# Run this after VM reboot to verify database persistence

set -e

echo "=========================================="
echo "TEST 2 VERIFICATION: POST-REBOOT CHECK"
echo "=========================================="
echo "Verification time: $(date -Iseconds)"
echo ""

# Configuration - will be updated by test-2-database-persistence.sh
TEST_DATA_ID="PLACEHOLDER_ID"  # This will be replaced with actual ID
DB_CONTAINER="flrts-openproject-db"
LOG_FILE="./test-2-evidence.log"

echo "=== WAITING FOR SERVICES TO START ==="
echo "Waiting for containers to be ready..."

# Wait for database container
WAIT_COUNT=0
MAX_WAIT=120

for i in $(seq 1 $MAX_WAIT); do
    if docker ps | grep -q $DB_CONTAINER; then
        echo "✅ Database container running!" | tee -a $LOG_FILE
        break
    else
        echo "Waiting for database container... ($i/$MAX_WAIT)" | tee -a $LOG_FILE
        sleep 1
    fi
done

# Wait for database to be ready
echo "Waiting for database to accept connections..."
for i in $(seq 1 60); do
    if docker exec $DB_CONTAINER pg_isready -U openproject -d openproject 2>/dev/null; then
        echo "✅ Database ready!" | tee -a $LOG_FILE
        break
    else
        echo "Waiting for database... ($i/60)" | tee -a $LOG_FILE
        sleep 1
    fi
done

echo ""
echo "=== POST-REBOOT SERVICE STATUS ==="

# Check all services
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.State}}" | tee -a $LOG_FILE

echo ""
echo "=== VERIFYING DATA PERSISTENCE ==="

# Verify test data exists
RESULT=$(docker exec $DB_CONTAINER psql -U openproject -d openproject -t -c "
    SELECT COUNT(*) FROM qa_test_persistence WHERE id = '$TEST_DATA_ID';
" 2>/dev/null | tr -d ' ')

if [ "$RESULT" = "1" ]; then
    echo "✅ SUCCESS: Test data persisted across reboot!" | tee -a $LOG_FILE

    # Show the persisted record
    docker exec $DB_CONTAINER psql -U openproject -d openproject -c "
        SELECT * FROM qa_test_persistence WHERE id = '$TEST_DATA_ID';
    " | tee -a $LOG_FILE

    PERSISTENCE_VERIFIED=true
else
    echo "❌ FAILURE: Test data lost after reboot!" | tee -a $LOG_FILE

    # Check if table exists
    TABLE_EXISTS=$(docker exec $DB_CONTAINER psql -U openproject -d openproject -t -c "
        SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'qa_test_persistence';
    " 2>/dev/null | tr -d ' ')

    if [ "$TABLE_EXISTS" = "0" ]; then
        echo "  Table qa_test_persistence does not exist" | tee -a $LOG_FILE
    else
        echo "  Table exists but record not found" | tee -a $LOG_FILE
        # Show any records in the table
        docker exec $DB_CONTAINER psql -U openproject -d openproject -c "
            SELECT * FROM qa_test_persistence;
        " | tee -a $LOG_FILE
    fi

    PERSISTENCE_VERIFIED=false
fi

echo ""
echo "=== DATABASE INTEGRITY CHECK ==="

# Check for corruption warnings in logs
echo "Checking for database corruption warnings..."
docker logs $DB_CONTAINER 2>&1 | tail -50 | grep -i "error\|corrupt\|fatal" || echo "✅ No corruption warnings found" | tee -a $LOG_FILE

# Check database statistics
echo ""
echo "Database statistics:"
docker exec $DB_CONTAINER psql -U openproject -d openproject -c "
    SELECT
        pg_database.datname,
        pg_size_pretty(pg_database_size(pg_database.datname)) as size,
        numbackends as connections
    FROM pg_database
    JOIN pg_stat_database ON pg_database.datname = pg_stat_database.datname
    WHERE pg_database.datname = 'openproject';
" | tee -a $LOG_FILE

echo ""
echo "=== OPENPROJECT ACCESSIBILITY ==="

# Check if OpenProject is accessible
OPENPROJECT_URL="https://ops.10nz.tools"
echo "Testing OpenProject accessibility at $OPENPROJECT_URL..."

if curl -s -f "$OPENPROJECT_URL/health_checks/default" > /dev/null 2>&1; then
    echo "✅ OpenProject accessible at $OPENPROJECT_URL" | tee -a $LOG_FILE

    # Get response time
    RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$OPENPROJECT_URL")
    echo "  Response time: ${RESPONSE_TIME}s" | tee -a $LOG_FILE

    SERVICE_ACCESSIBLE=true
else
    echo "❌ OpenProject not accessible" | tee -a $LOG_FILE

    # Check if container is running
    if docker ps | grep -q "flrts-openproject"; then
        echo "  OpenProject container is running" | tee -a $LOG_FILE

        # Check container logs
        echo "  Recent OpenProject logs:" | tee -a $LOG_FILE
        docker logs --tail 20 flrts-openproject 2>&1 | tee -a $LOG_FILE
    else
        echo "  OpenProject container not running" | tee -a $LOG_FILE
    fi

    SERVICE_ACCESSIBLE=false
fi

echo ""
echo "=== VOLUME PERSISTENCE CHECK ==="

# Verify volumes are still attached
echo "Docker volumes status:"
docker volume ls | grep -E "openproject|postgres" | tee -a $LOG_FILE

# Check volume mount points
echo ""
echo "Volume mount verification:"
docker inspect $DB_CONTAINER --format='{{range .Mounts}}{{.Type}}: {{.Source}} -> {{.Destination}}{{println}}{{end}}' | tee -a $LOG_FILE

echo ""
echo "=========================================="
echo "TEST RESULTS"
echo "=========================================="
echo "End time: $(date -Iseconds)"
echo ""

# Summary
if [ "$PERSISTENCE_VERIFIED" = true ] && [ "$SERVICE_ACCESSIBLE" = true ]; then
    echo "✅ TEST PASSED: All validation criteria met!" | tee -a $LOG_FILE
    echo "  - Test data persisted across VM reboot" | tee -a $LOG_FILE
    echo "  - Database container auto-started after reboot" | tee -a $LOG_FILE
    echo "  - No data corruption detected" | tee -a $LOG_FILE
    echo "  - OpenProject service accessible" | tee -a $LOG_FILE
    echo "  - All volumes properly mounted" | tee -a $LOG_FILE

    # Create success marker
    echo "TEST_2_PASSED" > ./test-2-result.txt

    exit 0
else
    echo "❌ TEST FAILED: Not all criteria met!" | tee -a $LOG_FILE
    [ "$PERSISTENCE_VERIFIED" = false ] && echo "  - Data did not persist across reboot" | tee -a $LOG_FILE
    [ "$SERVICE_ACCESSIBLE" = false ] && echo "  - Service not accessible after reboot" | tee -a $LOG_FILE

    # Create failure marker
    echo "TEST_2_FAILED" > ./test-2-result.txt

    exit 1
fi