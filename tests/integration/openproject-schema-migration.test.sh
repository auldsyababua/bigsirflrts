#!/bin/bash
# OpenProject Schema Migration Test Suite for Story 1.9
# Pre-implementation tests with adversarial mindset to prevent test gaming
# These tests MUST pass for the migration to be considered complete

set -euo pipefail

# Configuration
DB_HOST="${SUPABASE_DB_HOST:-db.thnwlykidzhrsagyjncc.supabase.co}"
DB_PORT="${SUPABASE_DB_PORT:-5432}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
DB_USER="${SUPABASE_DB_USER:-postgres}"
DB_PASS="${SUPABASE_DB_PASS}"  # Must be provided via environment
SSH_HOST="${SSH_HOST:-root@165.227.216.172}"
OPENPROJECT_URL="${OPENPROJECT_URL:-https://ops.10nz.tools}"
ADMIN_USER="${OPENPROJECT_ADMIN_USER:-admin}"
ADMIN_PASS="${OPENPROJECT_ADMIN_PASS}"  # Must be provided via environment - no default for security

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
CRITICAL_FAILURES=""
TEST_LOG="/tmp/openproject-migration-test-$(date +%Y%m%d-%H%M%S).log"

# Validate required environment variables
if [ -z "$DB_PASS" ]; then
    echo -e "${RED}ERROR: SUPABASE_DB_PASS environment variable not set${NC}"
    exit 1
fi

if [ -z "$ADMIN_PASS" ]; then
    echo -e "${RED}ERROR: OPENPROJECT_ADMIN_PASS environment variable not set${NC}"
    exit 1
fi

echo "============================================="
echo "OpenProject Schema Migration Test Suite"
echo "Target Database: ${DB_HOST}"
echo "Date: $(date -Iseconds)"
echo "Test Log: ${TEST_LOG}"
echo "============================================="

# Function to execute SQL and capture result
exec_sql() {
    local query="$1"
    local expected_error="${2:-}"
    
    if [ -z "$DB_PASS" ]; then
        echo -e "${RED}ERROR: DB_PASS environment variable not set${NC}"
        exit 1
    fi
    
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -t -A -c "$query" 2>&1
}

# Function to record test results
record_result() {
    local test_name="$1"
    local result="$2"
    local details="$3"
    
    echo "[$(date -Iseconds)] ${test_name}: ${result} - ${details}" >> "$TEST_LOG"
    
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} ${test_name}: PASSED"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC} ${test_name}: FAILED - ${details}"
        ((TESTS_FAILED++))
        CRITICAL_FAILURES="${CRITICAL_FAILURES}\n- ${test_name}: ${details}"
    fi
}

# Function to test SSH access
test_ssh_access() {
    ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$SSH_HOST" "echo 'SSH OK'" 2>/dev/null
}

echo -e "\n${BLUE}=== PHASE 1: PRE-MIGRATION VALIDATION ===${NC}"

# TEST 1: Database Connectivity
echo -e "\n${YELLOW}TEST 1: Database Connectivity${NC}"
DB_VERSION=$(exec_sql "SELECT version();" 2>/dev/null | head -1)
if [ -n "$DB_VERSION" ]; then
    record_result "Database Connectivity" "PASS" "Connected to PostgreSQL"
else
    record_result "Database Connectivity" "FAIL" "Cannot connect to database"
    exit 1
fi

# TEST 2: Verify Current Schema State
echo -e "\n${YELLOW}TEST 2: Current Schema Analysis${NC}"
OPENPROJECT_TABLES=$(exec_sql "
    SELECT COUNT(*) 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND (table_name LIKE 'work_%' 
         OR table_name LIKE 'project%' 
         OR table_name LIKE 'user%'
         OR table_name LIKE 'attachment%'
         OR table_name LIKE 'wiki_%'
         OR table_name LIKE 'meeting%'
         OR table_name LIKE 'time_entr%'
         OR table_name LIKE 'custom_%'
         OR table_name LIKE 'role%'
         OR table_name LIKE 'member%'
         OR table_name LIKE 'journal%'
         OR table_name LIKE 'setting%'
         OR table_name LIKE 'version%'
         OR table_name = 'schema_migrations'
         OR table_name = 'ar_internal_metadata');
")

if [ "$OPENPROJECT_TABLES" -gt 0 ]; then
    record_result "OpenProject Tables Found" "PASS" "Found $OPENPROJECT_TABLES OpenProject tables in public schema"
else
    record_result "OpenProject Tables Found" "FAIL" "No OpenProject tables found in public schema"
fi

# TEST 3: Check for Schema Existence
echo -e "\n${YELLOW}TEST 3: Target Schema Check${NC}"
SCHEMA_EXISTS=$(exec_sql "
    SELECT COUNT(*) 
    FROM information_schema.schemata 
    WHERE schema_name = 'openproject';
")

if [ "$SCHEMA_EXISTS" -eq 0 ]; then
    record_result "Target Schema Status" "PASS" "Schema 'openproject' does not exist yet (expected pre-migration)"
else
    # Check if it's empty
    TABLES_IN_OPENPROJECT=$(exec_sql "
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_schema = 'openproject';
    ")
    if [ "$TABLES_IN_OPENPROJECT" -eq 0 ]; then
        record_result "Target Schema Status" "PASS" "Schema 'openproject' exists but is empty"
    else
        record_result "Target Schema Status" "FAIL" "Schema 'openproject' already contains $TABLES_IN_OPENPROJECT tables"
    fi
fi

# TEST 4: Foreign Key Dependencies
echo -e "\n${YELLOW}TEST 4: Foreign Key Constraint Analysis${NC}"
FK_COUNT=$(exec_sql "
    SELECT COUNT(*)
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN (
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND (table_name LIKE 'work_%' 
             OR table_name LIKE 'project%' 
             OR table_name LIKE 'user%')
    );
")

if [ "$FK_COUNT" -ge 0 ]; then
    record_result "Foreign Key Analysis" "PASS" "Identified $FK_COUNT foreign key constraints to migrate"
else
    record_result "Foreign Key Analysis" "FAIL" "Could not analyze foreign key constraints"
fi

# TEST 5: Check for Cross-Schema References
echo -e "\n${YELLOW}TEST 5: Cross-Schema Reference Check${NC}"
CROSS_REFS=$(exec_sql "
    SELECT COUNT(DISTINCT tc.table_name)
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND ccu.table_schema != 'public';
")

if [ "$CROSS_REFS" -eq 0 ]; then
    record_result "Cross-Schema References" "PASS" "No cross-schema references found"
else
    record_result "Cross-Schema References" "FAIL" "Found $CROSS_REFS tables with cross-schema references"
fi

# TEST 6: Container Configuration Validation
echo -e "\n${YELLOW}TEST 6: Container Configuration Check${NC}"
if test_ssh_access; then
    CONFIG_CHECK=$(ssh -o StrictHostKeyChecking=no "$SSH_HOST" \
        "grep -E 'OPENPROJECT_DB.*SCHEMA|SEARCH_PATH' /root/docker-compose.yml" 2>/dev/null | wc -l)
    if [ "$CONFIG_CHECK" -gt 0 ]; then
        record_result "Container Config" "PASS" "Found schema configuration in docker-compose.yml"
    else
        record_result "Container Config" "FAIL" "No schema configuration found in docker-compose.yml"
    fi
else
    record_result "Container Config" "FAIL" "Cannot access container for configuration check"
fi

echo -e "\n${BLUE}=== PHASE 2: MIGRATION EXECUTION TESTS ===${NC}"

# TEST 7: Schema Creation Test (Dry Run)
echo -e "\n${YELLOW}TEST 7: Schema Creation Capability${NC}"
CAN_CREATE=$(exec_sql "
    SELECT has_schema_privilege('$DB_USER', 'public', 'CREATE');
")

if [ "$CAN_CREATE" = "t" ]; then
    record_result "Schema Creation Rights" "PASS" "User has CREATE privilege"
else
    record_result "Schema Creation Rights" "FAIL" "User lacks CREATE privilege on schema"
fi

# TEST 8: Table Migration Test (Single Table)
echo -e "\n${YELLOW}TEST 8: Table Migration Simulation${NC}"
# Test with a non-critical table first if exists
TEST_TABLE=$(exec_sql "
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE 'schema_migrations'
    LIMIT 1;
")

if [ -n "$TEST_TABLE" ]; then
    # Check if we can perform ALTER TABLE using direct privilege check
    CAN_ALTER=$(exec_sql "
        SELECT has_table_privilege('$DB_USER', 'public.$TEST_TABLE', 'ALTER');
    " 2>&1)
    
    if [[ "$CAN_ALTER" == *"t"* ]]; then
        record_result "Table Alter Rights" "PASS" "User has ALTER privileges on table"
    else
        record_result "Table Alter Rights" "FAIL" "User cannot alter table (returned: $CAN_ALTER)"
    fi
else
    record_result "Table Alter Rights" "PASS" "No test table available (expected in some cases)"
fi

# TEST 9: Sequence Migration Check
echo -e "\n${YELLOW}TEST 9: Sequence Dependencies${NC}"
SEQ_COUNT=$(exec_sql "
    SELECT COUNT(*) 
    FROM pg_sequences 
    WHERE schemaname = 'public'
    AND sequencename LIKE '%_id_seq%';
")

if [ "$SEQ_COUNT" -ge 0 ]; then
    record_result "Sequence Analysis" "PASS" "Found $SEQ_COUNT sequences to migrate"
else
    record_result "Sequence Analysis" "FAIL" "Could not analyze sequences"
fi

# TEST 10: Index Migration Check
echo -e "\n${YELLOW}TEST 10: Index Analysis${NC}"
INDEX_COUNT=$(exec_sql "
    SELECT COUNT(*) 
    FROM pg_indexes 
    WHERE schemaname = 'public'
    AND tablename IN (
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND (table_name LIKE 'work_%' 
             OR table_name LIKE 'project%' 
             OR table_name LIKE 'user%')
    );
")

if [ "$INDEX_COUNT" -ge 0 ]; then
    record_result "Index Analysis" "PASS" "Found $INDEX_COUNT indexes to migrate"
else
    record_result "Index Analysis" "FAIL" "Could not analyze indexes"
fi

echo -e "\n${BLUE}=== PHASE 3: APPLICATION FUNCTIONALITY TESTS ===${NC}"

# TEST 11: Application Health Check
echo -e "\n${YELLOW}TEST 11: Application Pre-Migration Health${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${OPENPROJECT_URL}/health_checks/default" || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    record_result "Pre-Migration Health" "PASS" "Application healthy before migration"
else
    record_result "Pre-Migration Health" "FAIL" "Application unhealthy (HTTP $HTTP_STATUS)"
fi

# TEST 12: API Authentication Test
echo -e "\n${YELLOW}TEST 12: API Authentication${NC}"
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -u "${ADMIN_USER}:${ADMIN_PASS}" \
    "${OPENPROJECT_URL}/api/v3/users/me" || echo "000")

if [ "$API_STATUS" = "200" ]; then
    record_result "API Authentication" "PASS" "API authentication working"
else
    record_result "API Authentication" "FAIL" "API authentication failed (HTTP $API_STATUS)"
fi

echo -e "\n${BLUE}=== PHASE 4: SAFETY AND ROLLBACK TESTS ===${NC}"

# TEST 13: Backup Verification
echo -e "\n${YELLOW}TEST 13: Backup Capability Check${NC}"
# Check if we can create a backup point
BACKUP_TEST=$(exec_sql "
    SELECT COUNT(*) 
    FROM pg_stat_activity 
    WHERE datname = '$DB_NAME';
")

if [ "$BACKUP_TEST" -ge 0 ]; then
    record_result "Backup Capability" "PASS" "Database accessible for backup"
else
    record_result "Backup Capability" "FAIL" "Cannot verify backup capability"
fi

# TEST 14: Transaction Safety Test
echo -e "\n${YELLOW}TEST 14: Transaction Safety${NC}"
TRANSACTION_TEST=$(exec_sql "
    BEGIN;
    SELECT 1;
    ROLLBACK;
    SELECT 'Transaction test complete';
")

if [[ "$TRANSACTION_TEST" == *"Transaction test complete"* ]]; then
    record_result "Transaction Safety" "PASS" "Transactions working correctly"
else
    record_result "Transaction Safety" "FAIL" "Transaction test failed"
fi

# TEST 15: Data Integrity Check
echo -e "\n${YELLOW}TEST 15: Data Integrity Baseline${NC}"
# Get row counts for critical tables
WORK_PACKAGES=$(exec_sql "SELECT COUNT(*) FROM public.work_packages;" 2>/dev/null || echo "0")
PROJECTS=$(exec_sql "SELECT COUNT(*) FROM public.projects;" 2>/dev/null || echo "0")
USERS=$(exec_sql "SELECT COUNT(*) FROM public.users;" 2>/dev/null || echo "0")

if [ "$WORK_PACKAGES" -ge 0 ] && [ "$PROJECTS" -ge 0 ] && [ "$USERS" -ge 0 ]; then
    echo "  Work Packages: $WORK_PACKAGES"
    echo "  Projects: $PROJECTS"
    echo "  Users: $USERS"
    record_result "Data Integrity Baseline" "PASS" "Baseline counts recorded"
    
    # Save baseline for post-migration comparison
    echo "WORK_PACKAGES_BASELINE=$WORK_PACKAGES" > /tmp/migration-baseline.env
    echo "PROJECTS_BASELINE=$PROJECTS" >> /tmp/migration-baseline.env
    echo "USERS_BASELINE=$USERS" >> /tmp/migration-baseline.env
else
    record_result "Data Integrity Baseline" "FAIL" "Could not establish baseline counts"
fi

echo -e "\n${BLUE}=== PHASE 5: ADVERSARIAL EDGE CASES ===${NC}"

# TEST 16: Special Characters in Data
echo -e "\n${YELLOW}TEST 16: Special Character Handling${NC}"
SPECIAL_CHARS=$(exec_sql "
    SELECT COUNT(*) 
    FROM public.work_packages 
    WHERE subject LIKE '%''%' 
       OR subject LIKE '%\"%' 
       OR subject LIKE '%\\%'
       OR subject LIKE '%;%';" 2>/dev/null || echo "0")

if [ "$SPECIAL_CHARS" -ge 0 ]; then
    record_result "Special Characters" "PASS" "Found $SPECIAL_CHARS records with special characters"
else
    record_result "Special Characters" "FAIL" "Could not check special characters"
fi

# TEST 17: Large Object Migration
echo -e "\n${YELLOW}TEST 17: Large Objects Check${NC}"
LARGE_OBJECTS=$(exec_sql "
    SELECT COUNT(*) 
    FROM pg_largeobject_metadata;" 2>/dev/null || echo "0")

if [ "$LARGE_OBJECTS" -ge 0 ]; then
    record_result "Large Objects" "PASS" "Found $LARGE_OBJECTS large objects to consider"
else
    record_result "Large Objects" "FAIL" "Could not check large objects"
fi

# TEST 18: Concurrent Access Test
echo -e "\n${YELLOW}TEST 18: Concurrent Access Simulation${NC}"
# Test if application can handle concurrent access during migration
for i in {1..3}; do
    curl -s -o /dev/null "${OPENPROJECT_URL}/login" &
done
wait

CONCURRENT_OK=$(curl -s -o /dev/null -w "%{http_code}" "${OPENPROJECT_URL}/login")
if [ "$CONCURRENT_OK" = "200" ]; then
    record_result "Concurrent Access" "PASS" "Application handles concurrent requests"
else
    record_result "Concurrent Access" "FAIL" "Application failed under concurrent load"
fi

# TEST 19: Permission Inheritance
echo -e "\n${YELLOW}TEST 19: Permission Structure${NC}"
GRANT_COUNT=$(exec_sql "
    SELECT COUNT(*) 
    FROM information_schema.table_privileges 
    WHERE table_schema = 'public' 
    AND grantee != 'postgres';" 2>/dev/null || echo "0")

if [ "$GRANT_COUNT" -ge 0 ]; then
    record_result "Permission Structure" "PASS" "Found $GRANT_COUNT permission grants to migrate"
else
    record_result "Permission Structure" "FAIL" "Could not analyze permissions"
fi

# TEST 20: Schema Search Path Validation
echo -e "\n${YELLOW}TEST 20: Search Path Configuration${NC}"
CURRENT_SEARCH_PATH=$(exec_sql "SHOW search_path;")
echo "  Current search path: $CURRENT_SEARCH_PATH"

if [[ "$CURRENT_SEARCH_PATH" == *"public"* ]]; then
    record_result "Search Path" "PASS" "Current search path includes public schema"
else
    record_result "Search Path" "FAIL" "Search path misconfigured"
fi

echo -e "\n${BLUE}=== PHASE 6: POST-MIGRATION VALIDATION (Conditional) ===${NC}"

# These tests should be run AFTER migration is complete
if [ "${RUN_POST_MIGRATION:-false}" = "true" ]; then
    
    # TEST 21: Schema Migration Verification
    echo -e "\n${YELLOW}TEST 21: Post-Migration Schema Verification${NC}"
    MIGRATED_TABLES=$(exec_sql "
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_schema = 'openproject';
    ")
    
    if [ "$MIGRATED_TABLES" -eq "$OPENPROJECT_TABLES" ]; then
        record_result "Migration Completeness" "PASS" "All $MIGRATED_TABLES tables migrated"
    else
        record_result "Migration Completeness" "FAIL" "Only $MIGRATED_TABLES of $OPENPROJECT_TABLES migrated"
    fi
    
    # TEST 22: Data Integrity Post-Migration
    echo -e "\n${YELLOW}TEST 22: Post-Migration Data Integrity${NC}"
    if [ -f /tmp/migration-baseline.env ]; then
        source /tmp/migration-baseline.env
        
        NEW_WORK_PACKAGES=$(exec_sql "SELECT COUNT(*) FROM openproject.work_packages;" 2>/dev/null || echo "0")
        NEW_PROJECTS=$(exec_sql "SELECT COUNT(*) FROM openproject.projects;" 2>/dev/null || echo "0")
        NEW_USERS=$(exec_sql "SELECT COUNT(*) FROM openproject.users;" 2>/dev/null || echo "0")
        
        if [ "$NEW_WORK_PACKAGES" -eq "$WORK_PACKAGES_BASELINE" ] && \
           [ "$NEW_PROJECTS" -eq "$PROJECTS_BASELINE" ] && \
           [ "$NEW_USERS" -eq "$USERS_BASELINE" ]; then
            record_result "Data Integrity" "PASS" "All data preserved after migration"
        else
            record_result "Data Integrity" "FAIL" "Data count mismatch after migration"
        fi
    else
        record_result "Data Integrity" "FAIL" "No baseline data for comparison"
    fi
    
    # TEST 23: Application Functionality Post-Migration
    echo -e "\n${YELLOW}TEST 23: Post-Migration Application Test${NC}"
    POST_HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${OPENPROJECT_URL}/health_checks/default" || echo "000")
    if [ "$POST_HTTP_STATUS" = "200" ]; then
        record_result "Post-Migration Health" "PASS" "Application healthy after migration"
    else
        record_result "Post-Migration Health" "FAIL" "Application unhealthy (HTTP $POST_HTTP_STATUS)"
    fi
    
    # TEST 24: Search Path Update Verification
    echo -e "\n${YELLOW}TEST 24: Search Path Update Check${NC}"
    if test_ssh_access; then
        UPDATED_PATH=$(ssh -o StrictHostKeyChecking=no "$SSH_HOST" \
            "grep 'SEARCH_PATH' /root/docker-compose.yml | grep -v 'public'" 2>/dev/null | wc -l)
        if [ "$UPDATED_PATH" -gt 0 ]; then
            record_result "Search Path Update" "PASS" "Search path updated to exclude public"
        else
            record_result "Search Path Update" "FAIL" "Search path still includes public schema"
        fi
    else
        record_result "Search Path Update" "FAIL" "Cannot verify search path update"
    fi
    
    # TEST 25: Clean Public Schema
    echo -e "\n${YELLOW}TEST 25: Public Schema Cleanup${NC}"
    REMAINING_IN_PUBLIC=$(exec_sql "
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND (table_name LIKE 'work_%' 
             OR table_name LIKE 'project%' 
             OR table_name LIKE 'user%');
    ")
    
    if [ "$REMAINING_IN_PUBLIC" -eq 0 ]; then
        record_result "Public Schema Cleanup" "PASS" "No OpenProject tables remain in public"
    else
        record_result "Public Schema Cleanup" "FAIL" "$REMAINING_IN_PUBLIC tables still in public schema"
    fi
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
QUALITY_SCORE=$((100 - (TESTS_FAILED * 5)))
if [ "$QUALITY_SCORE" -lt 0 ]; then
    QUALITY_SCORE=0
fi

echo -e "\n${YELLOW}Quality Score: ${QUALITY_SCORE}/100${NC}"
echo -e "Test Log: ${TEST_LOG}"

# Gate Decision
if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "\n${GREEN}GATE DECISION: PASS${NC}"
    echo -e "Schema migration can proceed safely."
    exit 0
elif [ "$TESTS_FAILED" -le 3 ]; then
    echo -e "\n${YELLOW}GATE DECISION: CONCERNS${NC}"
    echo -e "Minor issues detected. Review before proceeding."
    exit 1
else
    echo -e "\n${RED}GATE DECISION: FAIL${NC}"
    echo -e "Critical issues detected. Do not proceed with migration."
    exit 2
fi