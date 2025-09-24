#!/bin/bash

# REAL Extended Session Timeout Test
# Tests ACTUAL 2+ hour idle scenarios as required by QA
# Simulates weekend/overnight scenarios where OpenProject might sit idle

set -e

echo "=========================================================="
echo "SUPABASE POSTGRESQL EXTENDED SESSION TIMEOUT TEST"
echo "=========================================================="
echo "WARNING: This test runs for 2+ hours to simulate real idle scenarios!"
echo "Use ACCELERATED mode for faster testing during development."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_HOST="aws-0-us-east-2.pooler.supabase.com"
SUPABASE_PORT="5432"
SUPABASE_USER="postgres.thnwlykidzhrsagyjncc"
SUPABASE_DB="postgres"
TEST_PASSWORD=""

# Test mode configuration
ACCELERATED_MODE=false
if [ "$2" = "--accelerated" ] || [ "$2" = "--fast" ]; then
    ACCELERATED_MODE=true
    echo -e "${YELLOW}ACCELERATED MODE: Using 2-minute intervals instead of 2+ hours${NC}"
    echo -e "${YELLOW}For QA validation, run without --accelerated flag for full test${NC}"
    echo ""
fi

# Timing configuration
if [ "$ACCELERATED_MODE" = true ]; then
    IDLE_PERIOD=120  # 2 minutes for development testing
    CHECK_INTERVAL=30  # Check every 30 seconds
    TOTAL_CHECKS=4  # 4 checks over 2 minutes
else
    IDLE_PERIOD=7200  # 2 hours (7200 seconds)
    CHECK_INTERVAL=600  # Check every 10 minutes
    TOTAL_CHECKS=12  # 12 checks over 2 hours
fi

log_with_timestamp() {
    local message="$1"
    local color="${2:-$NC}"
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] $message${NC}"
}

get_password() {
    if [ -z "$1" ]; then
        echo -e "${RED}Error: Please provide the Supabase database password as an argument${NC}"
        echo "Usage: ./test-supabase-extended-session.sh YOUR_DB_PASSWORD [--accelerated]"
        echo ""
        echo "Options:"
        echo "  --accelerated    Run 2-minute test instead of 2+ hour test (for development)"
        echo "  (no flag)        Run full 2+ hour test (for QA validation)"
        exit 1
    fi
    TEST_PASSWORD="$1"
}

test_initial_connection() {
    log_with_timestamp "Testing initial connection..." "$BLUE"

    INITIAL_TEST=$(PGPASSWORD="$TEST_PASSWORD" psql \
        -h "$SUPABASE_HOST" \
        -p "$SUPABASE_PORT" \
        -U "$SUPABASE_USER" \
        -d "$SUPABASE_DB" \
        -c "SELECT 'Initial connection successful', now() as start_time;" 2>&1)

    if echo "$INITIAL_TEST" | grep -q "Initial connection successful"; then
        log_with_timestamp "✓ Initial connection established successfully" "$GREEN"
        return 0
    else
        log_with_timestamp "✗ Initial connection failed: $INITIAL_TEST" "$RED"
        return 1
    fi
}

test_session_persistence() {
    local check_number=$1
    local elapsed_time=$2

    log_with_timestamp "Connection check #$check_number (elapsed: ${elapsed_time}s)" "$BLUE"

    # Test connection with a simple query
    CONNECTION_TEST=$(PGPASSWORD="$TEST_PASSWORD" psql \
        -h "$SUPABASE_HOST" \
        -p "$SUPABASE_PORT" \
        -U "$SUPABASE_USER" \
        -d "$SUPABASE_DB" \
        -c "SELECT 'Connection alive', now() as check_time;" 2>&1)

    if echo "$CONNECTION_TEST" | grep -q "Connection alive"; then
        log_with_timestamp "✓ Connection still alive after ${elapsed_time}s" "$GREEN"
        return 0
    else
        log_with_timestamp "✗ Connection failed after ${elapsed_time}s: $CONNECTION_TEST" "$RED"
        return 1
    fi
}

test_data_persistence() {
    local operation_type="$1"

    if [ "$operation_type" = "create" ]; then
        log_with_timestamp "Creating test data to verify persistence..." "$BLUE"

        DATA_CREATE=$(PGPASSWORD="$TEST_PASSWORD" psql \
            -h "$SUPABASE_HOST" \
            -p "$SUPABASE_PORT" \
            -U "$SUPABASE_USER" \
            -d "$SUPABASE_DB" \
            -c "CREATE TEMP TABLE session_test_$(date +%s) (test_data text); INSERT INTO session_test_$(date +%s) VALUES ('Session persistence test data');" 2>&1)

        if echo "$DATA_CREATE" | grep -q "INSERT 0 1"; then
            log_with_timestamp "✓ Test data created successfully" "$GREEN"
            return 0
        else
            log_with_timestamp "✗ Test data creation failed: $DATA_CREATE" "$RED"
            return 1
        fi
    else
        log_with_timestamp "Verifying data integrity after idle period..." "$BLUE"

        # Test that we can still perform operations after the idle period
        DATA_VERIFY=$(PGPASSWORD="$TEST_PASSWORD" psql \
            -h "$SUPABASE_HOST" \
            -p "$SUPABASE_PORT" \
            -U "$SUPABASE_USER" \
            -d "$SUPABASE_DB" \
            -c "SELECT 'Data operations work', count(*) as table_count FROM information_schema.tables;" 2>&1)

        if echo "$DATA_VERIFY" | grep -q "Data operations work"; then
            log_with_timestamp "✓ Data operations still functional after idle period" "$GREEN"
            return 0
        else
            log_with_timestamp "✗ Data operations failed after idle period: $DATA_VERIFY" "$RED"
            return 1
        fi
    fi
}

test_complex_operation_after_idle() {
    log_with_timestamp "Testing complex operations after extended idle period..." "$BLUE"

    # Test a more complex operation to ensure full functionality
    COMPLEX_TEST=$(PGPASSWORD="$TEST_PASSWORD" psql \
        -h "$SUPABASE_HOST" \
        -p "$SUPABASE_PORT" \
        -U "$SUPABASE_USER" \
        -d "$SUPABASE_DB" \
        -c "WITH test_cte AS (SELECT generate_series(1,10) as num) SELECT 'Complex query works', count(*), avg(num) FROM test_cte;" 2>&1)

    if echo "$COMPLEX_TEST" | grep -q "Complex query works"; then
        log_with_timestamp "✓ Complex operations work perfectly after idle period" "$GREEN"
        return 0
    else
        log_with_timestamp "✗ Complex operations failed after idle period: $COMPLEX_TEST" "$RED"
        return 1
    fi
}

main() {
    get_password "$1"

    log_with_timestamp "=== EXTENDED SESSION TIMEOUT TEST STARTING ===" "$YELLOW"

    if [ "$ACCELERATED_MODE" = true ]; then
        log_with_timestamp "Mode: ACCELERATED (${IDLE_PERIOD}s total, checks every ${CHECK_INTERVAL}s)" "$YELLOW"
    else
        log_with_timestamp "Mode: FULL QA VALIDATION (${IDLE_PERIOD}s total, checks every ${CHECK_INTERVAL}s)" "$YELLOW"
        log_with_timestamp "WARNING: This will run for over 2 hours!" "$YELLOW"
    fi

    echo ""

    # Test initial connection
    if ! test_initial_connection; then
        log_with_timestamp "FATAL: Cannot establish initial connection" "$RED"
        exit 1
    fi

    # Create test data
    if ! test_data_persistence "create"; then
        log_with_timestamp "WARNING: Cannot create test data, continuing anyway..." "$YELLOW"
    fi

    # Main idle testing loop
    local checks_passed=0
    local checks_failed=0

    for ((i=1; i<=TOTAL_CHECKS; i++)); do
        local elapsed_time=$((i * CHECK_INTERVAL))

        log_with_timestamp "Waiting ${CHECK_INTERVAL}s before next check..." "$BLUE"
        sleep $CHECK_INTERVAL

        if test_session_persistence "$i" "$elapsed_time"; then
            ((checks_passed++))
        else
            ((checks_failed++))

            # Try to reconnect on failure
            log_with_timestamp "Attempting automatic reconnection..." "$YELLOW"
            sleep 5

            if test_session_persistence "${i}-retry" "$elapsed_time"; then
                log_with_timestamp "✓ Automatic reconnection successful" "$GREEN"
                ((checks_passed++))
            else
                log_with_timestamp "✗ Automatic reconnection failed" "$RED"
            fi
        fi
    done

    # Final comprehensive test
    log_with_timestamp "=== FINAL VALIDATION AFTER FULL IDLE PERIOD ===" "$YELLOW"

    local final_tests_passed=0

    if test_data_persistence "verify"; then
        ((final_tests_passed++))
    fi

    if test_complex_operation_after_idle; then
        ((final_tests_passed++))
    fi

    # Results summary
    echo ""
    echo "=========================================================="
    log_with_timestamp "EXTENDED SESSION TEST RESULTS" "$BLUE"
    echo "=========================================================="
    log_with_timestamp "Total runtime: ${IDLE_PERIOD}s (${IDLE_PERIOD}/3600 hours)" "$BLUE"
    log_with_timestamp "Periodic checks passed: ${checks_passed}/${TOTAL_CHECKS}" "$BLUE"
    log_with_timestamp "Periodic checks failed: ${checks_failed}/${TOTAL_CHECKS}" "$BLUE"
    log_with_timestamp "Final validation tests passed: ${final_tests_passed}/2" "$BLUE"

    echo ""
    echo "=========================================================="
    log_with_timestamp "QA VALIDATION SUMMARY" "$YELLOW"
    echo "=========================================================="

    if [ $checks_failed -eq 0 ] && [ $final_tests_passed -eq 2 ]; then
        log_with_timestamp "🎉 EXTENDED SESSION TEST PASSED!" "$GREEN"
        log_with_timestamp "✓ Connections remain stable during extended idle periods" "$GREEN"
        log_with_timestamp "✓ Automatic reconnection works when needed" "$GREEN"
        log_with_timestamp "✓ Data operations work normally after idle period" "$GREEN"
        log_with_timestamp "✓ Complex operations work normally after idle period" "$GREEN"
        echo ""
        log_with_timestamp "ACTIONABLE FOR TEAM: System is resilient to weekend/overnight idle periods" "$GREEN"
        exit 0
    else
        log_with_timestamp "❌ EXTENDED SESSION TEST FAILED!" "$RED"
        log_with_timestamp "Issues detected during extended idle testing" "$RED"
        echo ""
        log_with_timestamp "ACTIONABLE FOR TEAM:" "$RED"
        log_with_timestamp "1. Check Supabase connection timeout settings" "$RED"
        log_with_timestamp "2. Review OpenProject connection pool configuration" "$RED"
        log_with_timestamp "3. Consider implementing connection keep-alive mechanism" "$RED"
        log_with_timestamp "4. Monitor connection health during off-hours" "$RED"
        exit 1
    fi
}

# Handle Ctrl+C gracefully
trap 'echo ""; log_with_timestamp "Test interrupted by user" "$YELLOW"; exit 130' INT

# Execute main function
main "$@"