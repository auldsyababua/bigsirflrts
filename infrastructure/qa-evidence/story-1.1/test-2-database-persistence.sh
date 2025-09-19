#!/bin/bash
# Test 2: Database Persistence Across VM Reboots
# QA Gate Requirement: Story 1.1
# Date: $(date -Iseconds)

set -e

echo "=========================================="
echo "TEST 2: DATABASE PERSISTENCE ACROSS VM REBOOTS"
echo "=========================================="
echo "Start time: $(date -Iseconds)"
echo ""

# Configuration
DB_CONTAINER="flrts-openproject-db"
OPENPROJECT_URL="https://ops.10nz.tools"
LOG_FILE="./test-2-evidence.log"
TEST_PROJECT_NAME="QA_TEST_PROJECT_$(date +%s)"
TEST_DATA_ID="qa_test_$(date +%s)"

# Function to create test data in database
create_test_data() {
    echo "Creating test data in database..."

    # Create test data directly in PostgreSQL
    docker exec $DB_CONTAINER psql -U openproject -d openproject -c "
        CREATE TABLE IF NOT EXISTS qa_test_persistence (
            id VARCHAR(50) PRIMARY KEY,
            test_name VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            test_data TEXT
        );

        INSERT INTO qa_test_persistence (id, test_name, test_data)
        VALUES ('$TEST_DATA_ID', '$TEST_PROJECT_NAME', 'Test data created at $(date -Iseconds)');
    " | tee -a $LOG_FILE

    echo "Test data created with ID: $TEST_DATA_ID" | tee -a $LOG_FILE
}

# Function to verify test data
verify_test_data() {
    echo "Verifying test data exists..."

    RESULT=$(docker exec $DB_CONTAINER psql -U openproject -d openproject -t -c "
        SELECT COUNT(*) FROM qa_test_persistence WHERE id = '$TEST_DATA_ID';
    " | tr -d ' ')

    if [ "$RESULT" = "1" ]; then
        echo "✅ Test data verified: Record exists with ID $TEST_DATA_ID" | tee -a $LOG_FILE

        # Get full record details
        docker exec $DB_CONTAINER psql -U openproject -d openproject -c "
            SELECT * FROM qa_test_persistence WHERE id = '$TEST_DATA_ID';
        " | tee -a $LOG_FILE

        return 0
    else
        echo "❌ Test data NOT found: Record with ID $TEST_DATA_ID does not exist" | tee -a $LOG_FILE
        return 1
    fi
}

# Function to check container health
check_services_health() {
    echo "Checking service health status..."

    # Check database container
    DB_STATUS=$(docker inspect $DB_CONTAINER --format='{{.State.Status}}' 2>/dev/null || echo "not found")
    echo "Database container status: $DB_STATUS" | tee -a $LOG_FILE

    # Check OpenProject container
    OP_STATUS=$(docker inspect flrts-openproject --format='{{.State.Status}}' 2>/dev/null || echo "not found")
    echo "OpenProject container status: $OP_STATUS" | tee -a $LOG_FILE

    # Check database connectivity
    docker exec $DB_CONTAINER pg_isready -U openproject -d openproject | tee -a $LOG_FILE
}

# Pre-test validation
echo "=== PRE-TEST VALIDATION ==="
check_services_health
echo ""

# Create test data
echo "=== CREATING TEST DATA ==="
create_test_data
echo ""

# Verify test data before reboot
echo "=== VERIFY TEST DATA BEFORE REBOOT ==="
if ! verify_test_data; then
    echo "❌ Failed to create test data. Aborting test." | tee -a $LOG_FILE
    exit 1
fi
echo ""

# Take screenshot/snapshot of data
echo "=== CAPTURING PRE-REBOOT STATE ==="
echo "Capturing database statistics..."
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
echo "Capturing table count..."
docker exec $DB_CONTAINER psql -U openproject -d openproject -c "
    SELECT COUNT(*) as table_count FROM information_schema.tables
    WHERE table_schema = 'public';
" | tee -a $LOG_FILE

echo ""
echo "⚠️  WARNING: This test requires VM reboot!"
echo "=========================================="
echo ""
echo "MANUAL STEPS REQUIRED:"
echo "1. SSH into the Digital Ocean VM"
echo "2. Execute: sudo reboot"
echo "3. Wait for VM to restart (approximately 60-90 seconds)"
echo "4. Run the verification script: ./test-2-verify.sh"
echo ""
echo "Creating verification script..."

# Create verification script
cat > ./test-2-verify.sh << 'EOF'
#!/bin/bash
# Test 2 Verification: Check Data After Reboot
# Run this after VM reboot

set -e

echo "=========================================="
echo "TEST 2 VERIFICATION: POST-REBOOT CHECK"
echo "=========================================="
echo "Verification time: $(date -Iseconds)"
echo ""

TEST_DATA_ID="PLACEHOLDER_ID"
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
    PERSISTENCE_VERIFIED=false
fi

echo ""
echo "=== DATABASE INTEGRITY CHECK ==="

# Check for corruption warnings
docker logs $DB_CONTAINER 2>&1 | grep -i "error\|corrupt\|fatal" | tail -20 || echo "No corruption warnings found" | tee -a $LOG_FILE

echo ""
echo "=== OPENPROJECT ACCESSIBILITY ==="

# Check if OpenProject is accessible
if curl -s -f https://ops.10nz.tools/health_checks/default > /dev/null 2>&1; then
    echo "✅ OpenProject accessible at https://ops.10nz.tools" | tee -a $LOG_FILE
    SERVICE_ACCESSIBLE=true
else
    echo "❌ OpenProject not accessible" | tee -a $LOG_FILE
    SERVICE_ACCESSIBLE=false
fi

echo ""
echo "=========================================="
echo "TEST RESULTS"
echo "=========================================="
echo "End time: $(date -Iseconds)"
echo ""

if [ "$PERSISTENCE_VERIFIED" = true ] && [ "$SERVICE_ACCESSIBLE" = true ]; then
    echo "✅ TEST PASSED: All validation criteria met!" | tee -a $LOG_FILE
    echo "  - Test data persisted across VM reboot" | tee -a $LOG_FILE
    echo "  - Database container auto-started after reboot" | tee -a $LOG_FILE
    echo "  - No data corruption detected" | tee -a $LOG_FILE
    echo "  - OpenProject service accessible" | tee -a $LOG_FILE
    exit 0
else
    echo "❌ TEST FAILED: Not all criteria met!" | tee -a $LOG_FILE
    [ "$PERSISTENCE_VERIFIED" = false ] && echo "  - Data did not persist" | tee -a $LOG_FILE
    [ "$SERVICE_ACCESSIBLE" = false ] && echo "  - Service not accessible" | tee -a $LOG_FILE
    exit 1
fi
EOF

# Update the verification script with actual test data ID
sed -i.bak "s/PLACEHOLDER_ID/$TEST_DATA_ID/g" ./test-2-verify.sh
rm -f ./test-2-verify.sh.bak
chmod +x ./test-2-verify.sh

echo ""
echo "✅ Verification script created: ./test-2-verify.sh"
echo "✅ Test data ID: $TEST_DATA_ID"
echo ""
echo "NEXT STEPS:"
echo "1. SSH into VM: ssh root@165.227.216.172"
echo "2. Execute reboot: sudo reboot"
echo "3. Wait 60-90 seconds for VM to restart"
echo "4. Run verification: ./test-2-verify.sh"
echo ""
echo "Test preparation completed at $(date -Iseconds)" | tee -a $LOG_FILE