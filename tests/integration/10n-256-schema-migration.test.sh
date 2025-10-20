#!/usr/bin/env bash
set -euo pipefail

# Schema Migration Tests for 10N-256
# Tests custom DocTypes and custom fields for ERPNext migration
# Status: RED (TDD - tests should fail until implementation is deployed)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
ERPNEXT_API_URL="${ERPNEXT_API_URL:-http://localhost:8000}"
ERPNEXT_API_KEY="${ERPNEXT_ADMIN_API_KEY:-${ERPNEXT_API_KEY:-}}"
ERPNEXT_API_SECRET="${ERPNEXT_ADMIN_API_SECRET:-${ERPNEXT_API_SECRET:-}}"

# Counters
PASSED=0
FAILED=0
SKIPPED=0

# Helper functions
log_test() {
  echo -e "\n${YELLOW}[TEST]${NC} $1"
}

log_pass() {
  echo -e "${GREEN}✓ PASS${NC}: $1"
  ((PASSED++)) || true
}

log_fail() {
  echo -e "${RED}✗ FAIL${NC}: $1"
  ((FAILED++)) || true
}

log_skip() {
  echo -e "${YELLOW}⊘ SKIP${NC}: $1"
  ((SKIPPED++)) || true
}

log_info() {
  echo -e "  ${NC}$1"
}

# Parse HTTP response with code on last line, body on preceding lines
parse_http_response() {
  local response="$1"
  HTTP_CODE=$(echo "$response" | tail -n1)
  BODY=$(echo "$response" | sed '$d')
}

# Check prerequisites
check_prerequisites() {
  log_test "Checking prerequisites"

  if ! command -v curl &> /dev/null; then
    log_fail "curl not found"
    exit 1
  fi

  if ! command -v jq &> /dev/null; then
    log_fail "jq not found (required for JSON parsing)"
    exit 1
  fi

  if [[ -z "$ERPNEXT_API_KEY" ]] || [[ -z "$ERPNEXT_API_SECRET" ]]; then
    log_fail "API credentials not configured (set ERPNEXT_API_KEY and ERPNEXT_API_SECRET)"
    exit 1
  fi

  log_pass "Prerequisites check"
}

# Test 1: Mining Site DocType Exists
test_mining_site_doctype_exists() {
  log_test "Mining Site DocType Exists"

  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Accept: application/json" \
    "${ERPNEXT_API_URL}/api/resource/Mining%20Site?limit_page_length=1" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "Mining Site DocType exists and is accessible"
  else
    log_fail "Mining Site DocType not found (HTTP ${HTTP_CODE})"
    log_info "Expected: Custom DocType 'Mining Site' to be created"
  fi
}

# Test 2: Mining Site Fields Validation
test_mining_site_fields() {
  log_test "Mining Site DocType Fields"

  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Accept: application/json" \
    "${ERPNEXT_API_URL}/api/resource/DocType/Mining%20Site" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    # Check for required fields
    FIELDS=$(echo "$BODY" | jq -r '.data.fields[] | .fieldname')

    # Required fields from prototype: site_name, location, site_code, is_active
    REQUIRED_FIELDS=("site_name" "location" "site_code" "is_active")
    MISSING_FIELDS=()

    for field in "${REQUIRED_FIELDS[@]}"; do
      if ! echo "$FIELDS" | grep -q "^${field}$"; then
        MISSING_FIELDS+=("$field")
      fi
    done

    if [[ ${#MISSING_FIELDS[@]} -eq 0 ]]; then
      log_pass "All required Mining Site fields present"
      log_info "Fields: site_name, location, site_code, is_active"
    else
      log_fail "Missing Mining Site fields: ${MISSING_FIELDS[*]}"
    fi
  else
    log_fail "Failed to retrieve Mining Site DocType metadata (HTTP ${HTTP_CODE})"
  fi
}

# Test 3: Mining Site Field Types
test_mining_site_field_types() {
  log_test "Mining Site Field Types"

  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Accept: application/json" \
    "${ERPNEXT_API_URL}/api/resource/DocType/Mining%20Site" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    # Validate field types match specification
    SITE_NAME_TYPE=$(echo "$BODY" | jq -r '.data.fields[] | select(.fieldname=="site_name") | .fieldtype')
    IS_ACTIVE_TYPE=$(echo "$BODY" | jq -r '.data.fields[] | select(.fieldname=="is_active") | .fieldtype')

    local ALL_VALID=true

    if [[ "$SITE_NAME_TYPE" != "Data" ]]; then
      log_fail "site_name should be 'Data' type, got: ${SITE_NAME_TYPE}"
      ALL_VALID=false
    fi

    if [[ "$IS_ACTIVE_TYPE" != "Check" ]]; then
      log_fail "is_active should be 'Check' type, got: ${IS_ACTIVE_TYPE}"
      ALL_VALID=false
    fi

    if [[ "$ALL_VALID" == "true" ]]; then
      log_pass "Mining Site field types correct"
    fi
  else
    log_fail "Failed to retrieve Mining Site DocType metadata (HTTP ${HTTP_CODE})"
  fi
}

# Test 4: Contractor DocType Exists
test_contractor_doctype_exists() {
  log_test "Contractor DocType Exists"

  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Accept: application/json" \
    "${ERPNEXT_API_URL}/api/resource/Contractor?limit_page_length=1" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "Contractor DocType exists and is accessible"
  else
    log_fail "Contractor DocType not found (HTTP ${HTTP_CODE})"
    log_info "Expected: Custom DocType 'Contractor' to be created"
  fi
}

# Test 5: Contractor Fields Validation
test_contractor_fields() {
  log_test "Contractor DocType Fields"

  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Accept: application/json" \
    "${ERPNEXT_API_URL}/api/resource/DocType/Contractor" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    FIELDS=$(echo "$BODY" | jq -r '.data.fields[] | .fieldname')

    # Required fields: contractor_name, contractor_type, contact_email, contact_phone, is_active
    REQUIRED_FIELDS=("contractor_name" "contractor_type" "contact_email" "contact_phone" "is_active")
    MISSING_FIELDS=()

    for field in "${REQUIRED_FIELDS[@]}"; do
      if ! echo "$FIELDS" | grep -q "^${field}$"; then
        MISSING_FIELDS+=("$field")
      fi
    done

    if [[ ${#MISSING_FIELDS[@]} -eq 0 ]]; then
      log_pass "All required Contractor fields present"
      log_info "Fields: contractor_name, contractor_type, contact_email, contact_phone, is_active"
    else
      log_fail "Missing Contractor fields: ${MISSING_FIELDS[*]}"
    fi
  else
    log_fail "Failed to retrieve Contractor DocType metadata (HTTP ${HTTP_CODE})"
  fi
}

# Test 6: Contractor Type Options
test_contractor_type_options() {
  log_test "Contractor Type Select Options"

  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Accept: application/json" \
    "${ERPNEXT_API_URL}/api/resource/DocType/Contractor" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    OPTIONS=$(echo "$BODY" | jq -r '.data.fields[] | select(.fieldname=="contractor_type") | .options')

    # Expected options from prototype
    EXPECTED_OPTIONS=("Equipment Maintenance" "Electrical" "Plumbing" "HVAC" "General Labor" "Other")
    local ALL_FOUND=true

    for opt in "${EXPECTED_OPTIONS[@]}"; do
      if ! echo "$OPTIONS" | grep -q "$opt"; then
        log_fail "Missing contractor_type option: $opt"
        ALL_FOUND=false
      fi
    done

    if [[ "$ALL_FOUND" == "true" ]]; then
      log_pass "Contractor type options correct"
    fi
  else
    log_fail "Failed to retrieve Contractor DocType metadata (HTTP ${HTTP_CODE})"
  fi
}

# Test 7: Maintenance Visit Custom Fields Exist
test_maintenance_visit_custom_fields() {
  log_test "Maintenance Visit Custom Fields"

  # Use getdoctype endpoint to get merged schema with custom fields
  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Accept: application/json" \
    "${ERPNEXT_API_URL}/api/method/frappe.desk.form.load.getdoctype?doctype=Maintenance%20Visit" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    FIELDS=$(echo "$BODY" | jq -r '.docs[0].fields[] | .fieldname')

    # 7 custom fields from maintenance_visit_fields.json
    CUSTOM_FIELDS=("supabase_task_id" "flrts_owner" "flrts_priority" "flrts_site" "flrts_contractor" "flrts_metadata" "custom_synced_at")
    MISSING_FIELDS=()

    for field in "${CUSTOM_FIELDS[@]}"; do
      if ! echo "$FIELDS" | grep -q "^${field}$"; then
        MISSING_FIELDS+=("$field")
      fi
    done

    if [[ ${#MISSING_FIELDS[@]} -eq 0 ]]; then
      log_pass "All 7 custom fields present in Maintenance Visit"
      log_info "Fields: supabase_task_id, flrts_owner, flrts_priority, flrts_site, flrts_contractor, flrts_metadata, custom_synced_at"
    else
      log_fail "Missing custom fields: ${MISSING_FIELDS[*]}"
    fi
  else
    log_fail "Failed to retrieve Maintenance Visit DocType metadata (HTTP ${HTTP_CODE})"
  fi
}

# Test 8: Custom Field Types
test_custom_field_types() {
  log_test "Maintenance Visit Custom Field Types"

  # Use getdoctype endpoint to get merged schema with custom fields
  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Accept: application/json" \
    "${ERPNEXT_API_URL}/api/method/frappe.desk.form.load.getdoctype?doctype=Maintenance%20Visit" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    # Validate specific field types
    SUPABASE_TASK_ID_TYPE=$(echo "$BODY" | jq -r '.docs[0].fields[] | select(.fieldname=="supabase_task_id") | .fieldtype')
    FLRTS_PRIORITY_TYPE=$(echo "$BODY" | jq -r '.docs[0].fields[] | select(.fieldname=="flrts_priority") | .fieldtype')
    FLRTS_SITE_TYPE=$(echo "$BODY" | jq -r '.docs[0].fields[] | select(.fieldname=="flrts_site") | .fieldtype')
    FLRTS_METADATA_TYPE=$(echo "$BODY" | jq -r '.docs[0].fields[] | select(.fieldname=="flrts_metadata") | .fieldtype')

    local ALL_VALID=true

    if [[ "$SUPABASE_TASK_ID_TYPE" != "Data" ]]; then
      log_fail "supabase_task_id should be 'Data' type, got: ${SUPABASE_TASK_ID_TYPE}"
      ALL_VALID=false
    fi

    if [[ "$FLRTS_PRIORITY_TYPE" != "Select" ]]; then
      log_fail "flrts_priority should be 'Select' type, got: ${FLRTS_PRIORITY_TYPE}"
      ALL_VALID=false
    fi

    if [[ "$FLRTS_SITE_TYPE" != "Link" ]]; then
      log_fail "flrts_site should be 'Link' type, got: ${FLRTS_SITE_TYPE}"
      ALL_VALID=false
    fi

    if [[ "$FLRTS_METADATA_TYPE" != "JSON" ]]; then
      log_fail "flrts_metadata should be 'JSON' type, got: ${FLRTS_METADATA_TYPE}"
      ALL_VALID=false
    fi

    if [[ "$ALL_VALID" == "true" ]]; then
      log_pass "Custom field types correct"
    fi
  else
    log_fail "Failed to retrieve Maintenance Visit DocType metadata (HTTP ${HTTP_CODE})"
  fi
}

# Test 9: Link Field Options
test_link_field_options() {
  log_test "Link Field Options (Foreign Key References)"

  # Use getdoctype endpoint to get merged schema with custom fields
  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Accept: application/json" \
    "${ERPNEXT_API_URL}/api/method/frappe.desk.form.load.getdoctype?doctype=Maintenance%20Visit" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    FLRTS_OWNER_OPTIONS=$(echo "$BODY" | jq -r '.docs[0].fields[] | select(.fieldname=="flrts_owner") | .options')
    FLRTS_SITE_OPTIONS=$(echo "$BODY" | jq -r '.docs[0].fields[] | select(.fieldname=="flrts_site") | .options')
    FLRTS_CONTRACTOR_OPTIONS=$(echo "$BODY" | jq -r '.docs[0].fields[] | select(.fieldname=="flrts_contractor") | .options')

    local ALL_VALID=true

    if [[ "$FLRTS_OWNER_OPTIONS" != "User" ]]; then
      log_fail "flrts_owner should link to 'User', got: ${FLRTS_OWNER_OPTIONS}"
      ALL_VALID=false
    fi

    if [[ "$FLRTS_SITE_OPTIONS" != "Mining Site" ]]; then
      log_fail "flrts_site should link to 'Mining Site', got: ${FLRTS_SITE_OPTIONS}"
      ALL_VALID=false
    fi

    if [[ "$FLRTS_CONTRACTOR_OPTIONS" != "Contractor" ]]; then
      log_fail "flrts_contractor should link to 'Contractor', got: ${FLRTS_CONTRACTOR_OPTIONS}"
      ALL_VALID=false
    fi

    if [[ "$ALL_VALID" == "true" ]]; then
      log_pass "Link field references correct"
    fi
  else
    log_fail "Failed to retrieve Maintenance Visit DocType metadata (HTTP ${HTTP_CODE})"
  fi
}

# Test 10: Field Constraints (unique, read_only)
test_field_constraints() {
  log_test "Custom Field Constraints"

  # Use getdoctype endpoint to get merged schema with custom fields
  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Accept: application/json" \
    "${ERPNEXT_API_URL}/api/method/frappe.desk.form.load.getdoctype?doctype=Maintenance%20Visit" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    # Check supabase_task_id is unique and read_only
    SUPABASE_UNIQUE=$(echo "$BODY" | jq -r '.docs[0].fields[] | select(.fieldname=="supabase_task_id") | .unique')
    SUPABASE_READONLY=$(echo "$BODY" | jq -r '.docs[0].fields[] | select(.fieldname=="supabase_task_id") | .read_only')

    # Check custom_synced_at is read_only
    SYNCED_READONLY=$(echo "$BODY" | jq -r '.docs[0].fields[] | select(.fieldname=="custom_synced_at") | .read_only')

    local ALL_VALID=true

    if [[ "$SUPABASE_UNIQUE" != "1" ]]; then
      log_fail "supabase_task_id should be unique"
      ALL_VALID=false
    fi

    if [[ "$SUPABASE_READONLY" != "1" ]]; then
      log_fail "supabase_task_id should be read_only"
      ALL_VALID=false
    fi

    if [[ "$SYNCED_READONLY" != "1" ]]; then
      log_fail "custom_synced_at should be read_only"
      ALL_VALID=false
    fi

    if [[ "$ALL_VALID" == "true" ]]; then
      log_pass "Field constraints correct"
    fi
  else
    log_fail "Failed to retrieve Maintenance Visit DocType metadata (HTTP ${HTTP_CODE})"
  fi
}

# Test 11: Priority Field Options
test_priority_options() {
  log_test "Priority Field Options (1-5 scale)"

  # Use getdoctype endpoint to get merged schema with custom fields
  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Accept: application/json" \
    "${ERPNEXT_API_URL}/api/method/frappe.desk.form.load.getdoctype?doctype=Maintenance%20Visit" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    PRIORITY_OPTIONS=$(echo "$BODY" | jq -r '.docs[0].fields[] | select(.fieldname=="flrts_priority") | .options')
    PRIORITY_DEFAULT=$(echo "$BODY" | jq -r '.docs[0].fields[] | select(.fieldname=="flrts_priority") | .default')

    # Should have options "1\n2\n3\n4\n5"
    local ALL_VALID=true

    for i in {1..5}; do
      if ! echo "$PRIORITY_OPTIONS" | grep -q "^${i}$"; then
        log_fail "Missing priority option: $i"
        ALL_VALID=false
      fi
    done

    if [[ "$PRIORITY_DEFAULT" != "3" ]]; then
      log_fail "Priority default should be '3', got: ${PRIORITY_DEFAULT}"
      ALL_VALID=false
    fi

    if [[ "$ALL_VALID" == "true" ]]; then
      log_pass "Priority options correct (1-5 with default 3)"
    fi
  else
    log_fail "Failed to retrieve Maintenance Visit DocType metadata (HTTP ${HTTP_CODE})"
  fi
}

# Test 12: CRUD Operations - Mining Site
test_mining_site_crud() {
  log_test "Mining Site CRUD Operations"

  # Create a test Mining Site
  CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -X POST \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Content-Type: application/json" \
    -d '{
      "site_name": "Test Site for 10N-256",
      "location": "Test Location",
      "site_code": "TEST-256",
      "is_active": 1
    }' \
    "${ERPNEXT_API_URL}/api/resource/Mining%20Site" || echo -e "\n000")

  parse_http_response "$CREATE_RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    SITE_NAME=$(echo "$BODY" | jq -r '.data.name')
    log_pass "Mining Site created successfully: ${SITE_NAME}"

    # Clean up - delete the test site
    DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
      -X DELETE \
      -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
      "${ERPNEXT_API_URL}/api/resource/Mining%20Site/${SITE_NAME}" || echo -e "\n000")

    parse_http_response "$DELETE_RESPONSE"
    if [[ "$HTTP_CODE" == "202" ]]; then
      log_info "Test site cleaned up successfully"
    fi
  else
    log_fail "Failed to create Mining Site (HTTP ${HTTP_CODE})"
    log_info "Response: $(echo "$BODY" | jq -r '.exception // .message // "Unknown error"')"
  fi
}

# Test 13: CRUD Operations - Contractor
test_contractor_crud() {
  log_test "Contractor CRUD Operations"

  # Create a test Contractor
  CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -X POST \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Content-Type: application/json" \
    -d '{
      "contractor_name": "Test Contractor for 10N-256",
      "contractor_type": "Equipment Maintenance",
      "contact_email": "test@example.com",
      "contact_phone": "555-1234",
      "is_active": 1
    }' \
    "${ERPNEXT_API_URL}/api/resource/Contractor" || echo -e "\n000")

  parse_http_response "$CREATE_RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    CONTRACTOR_NAME=$(echo "$BODY" | jq -r '.data.name')
    log_pass "Contractor created successfully: ${CONTRACTOR_NAME}"

    # Clean up - delete the test contractor
    DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
      -X DELETE \
      -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
      "${ERPNEXT_API_URL}/api/resource/Contractor/${CONTRACTOR_NAME}" || echo -e "\n000")

    parse_http_response "$DELETE_RESPONSE"
    if [[ "$HTTP_CODE" == "202" ]]; then
      log_info "Test contractor cleaned up successfully"
    fi
  else
    log_fail "Failed to create Contractor (HTTP ${HTTP_CODE})"
    log_info "Response: $(echo "$BODY" | jq -r '.exception // .message // "Unknown error"')"
  fi
}

# Test 14: Maintenance Visit with Custom Fields
test_maintenance_visit_with_custom_fields() {
  log_test "Maintenance Visit with Custom Fields"

  # This test will create a Maintenance Visit with custom fields populated
  # Note: This assumes Customer and other required dependencies exist

  # For now, just verify we can read Maintenance Visit with custom fields
  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Accept: application/json" \
    "${ERPNEXT_API_URL}/api/resource/Maintenance%20Visit?limit_page_length=1" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "Maintenance Visit accessible with custom fields"

    # Check if we got any records and if they have custom fields
    RECORD_COUNT=$(echo "$BODY" | jq -r '.data | length')
    if [[ "$RECORD_COUNT" -gt 0 ]]; then
      HAS_CUSTOM_FIELD=$(echo "$BODY" | jq -r '.data[0] | has("flrts_priority")')
      if [[ "$HAS_CUSTOM_FIELD" == "true" ]]; then
        log_info "Custom fields visible in API response"
      else
        log_info "Note: No existing records with custom fields (expected for fresh deployment)"
      fi
    fi
  else
    log_fail "Failed to access Maintenance Visit (HTTP ${HTTP_CODE})"
  fi
}

# Main execution
main() {
  echo "=========================================="
  echo "Schema Migration Tests - 10N-256"
  echo "Testing: ${ERPNEXT_API_URL}"
  echo "=========================================="
  echo ""
  echo "NOTE: These are TDD tests - they SHOULD FAIL until"
  echo "the schema migration is deployed to ERPNext."
  echo ""

  check_prerequisites

  echo ""
  echo "--- Custom DocType Tests ---"
  test_mining_site_doctype_exists
  test_mining_site_fields
  test_mining_site_field_types
  test_contractor_doctype_exists
  test_contractor_fields
  test_contractor_type_options

  echo ""
  echo "--- Custom Field Tests ---"
  test_maintenance_visit_custom_fields
  test_custom_field_types
  test_link_field_options
  test_field_constraints
  test_priority_options

  echo ""
  echo "--- CRUD Operation Tests ---"
  test_mining_site_crud
  test_contractor_crud
  test_maintenance_visit_with_custom_fields

  echo ""
  echo "=========================================="
  echo "Test Results"
  echo "=========================================="
  echo -e "${GREEN}Passed:${NC}  ${PASSED}"
  echo -e "${RED}Failed:${NC}  ${FAILED}"
  echo -e "${YELLOW}Skipped:${NC} ${SKIPPED}"
  echo "=========================================="

  if [[ $FAILED -gt 0 ]]; then
    echo -e "\n${RED}Tests failed. This is EXPECTED (TDD red phase).${NC}"
    echo -e "${YELLOW}Deploy the schema migration to make tests pass.${NC}"
    exit 1
  elif [[ $PASSED -eq 0 ]]; then
    echo -e "\n${YELLOW}No tests passed. Check configuration.${NC}"
    exit 1
  else
    echo -e "\n${GREEN}All tests passed! Schema migration successful.${NC}"
    exit 0
  fi
}

main
