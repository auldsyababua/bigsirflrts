#!/usr/bin/env bash
set -euo pipefail

# ERPNext Smoke Tests - Phase 7 Verification
# Tests ERPNext on Frappe Cloud infrastructure (ADR-006)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
ERPNEXT_API_URL="${ERPNEXT_API_URL:-http://localhost:8000}"
# Support both ADMIN and non-ADMIN variants
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

  log_pass "Prerequisites check"
}

# Test 1: ERPNext API Health Check
test_api_health() {
  log_test "ERPNext API Health Check"
  log_info "URL: ${ERPNEXT_API_URL}"

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${ERPNEXT_API_URL}" || echo "000")

  # Only 2xx and 3xx indicate a healthy API
  if [[ "$HTTP_CODE" =~ ^(200|301|302)$ ]]; then
    log_pass "ERPNext API is responding (HTTP ${HTTP_CODE})"
  else
    log_fail "ERPNext API not responding (HTTP ${HTTP_CODE})"
  fi
}

# Test 2: API Authentication
test_api_authentication() {
  log_test "API Authentication"

  if [[ -z "$ERPNEXT_API_KEY" ]] || [[ -z "$ERPNEXT_API_SECRET" ]]; then
    log_skip "API credentials not configured (set ERPNEXT_API_KEY and ERPNEXT_API_SECRET)"
    return
  fi

  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Accept: application/json" \
    "${ERPNEXT_API_URL}/api/method/frappe.auth.get_logged_user" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "API authentication successful"
    USERNAME=$(echo "$BODY" | jq -r '.message // "unknown"')
    log_info "Authenticated as: ${USERNAME}"
  else
    log_fail "API authentication failed (HTTP ${HTTP_CODE})"
    # Only log error type, not full response to avoid leaking sensitive info
    ERROR_TYPE=$(echo "$BODY" | jq -r '.exc_type // "Unknown error"' 2>/dev/null || echo "Unknown error")
    log_info "Error type: ${ERROR_TYPE}"
  fi
}

# Test 3: Check Installed Apps (flrts_extensions)
test_installed_apps() {
  log_test "Installed Apps (flrts_extensions verification)"

  if [[ -z "$ERPNEXT_API_KEY" ]] || [[ -z "$ERPNEXT_API_SECRET" ]]; then
    log_skip "API credentials not configured"
    return
  fi

  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Accept: application/json" \
    "${ERPNEXT_API_URL}/api/method/frappe.utils.change_log.get_versions" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    # Check if flrts_extensions is in the response
    if echo "$BODY" | jq -e '.message | has("flrts_extensions")' > /dev/null 2>&1; then
      log_pass "flrts_extensions custom app is installed"
      VERSION=$(echo "$BODY" | jq -r '.message.flrts_extensions.version // "unknown"')
      log_info "Version: ${VERSION}"
    else
      log_fail "flrts_extensions custom app not found"
      log_info "Installed apps: $(echo "$BODY" | jq -r '.message | keys | join(", ")')"
    fi
  else
    log_fail "Failed to retrieve installed apps (HTTP ${HTTP_CODE})"
  fi
}

# Test 4: Telegram Webhook Endpoint Accessibility
test_telegram_webhook() {
  log_test "Telegram Webhook Endpoint"

  if [[ -z "$ERPNEXT_API_KEY" ]] || [[ -z "$ERPNEXT_API_SECRET" ]]; then
    log_skip "API credentials not configured"
    return
  fi

  # Check if telegram webhook method exists
  WEBHOOK_URL="${ERPNEXT_API_URL}/api/method/flrts_extensions.telegram.webhook"

  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -X POST \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Content-Type: application/json" \
    -d '{}' \
    "${WEBHOOK_URL}" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  # HTTP 200 or 417 indicates successful webhook access
  # HTTP 417 means webhook validation is working correctly (empty payload rejected)
  if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "417" ]]; then
    log_pass "Telegram webhook endpoint is accessible (HTTP ${HTTP_CODE})"
    if [[ "$HTTP_CODE" == "417" ]]; then
      log_info "HTTP 417: Webhook validation working correctly (empty payload rejected as expected)"
    fi
  else
    log_fail "Telegram webhook endpoint not accessible (HTTP ${HTTP_CODE})"
  fi
}

# Test 5: Basic Task DocType Access
test_task_doctype() {
  log_test "Task DocType Access"

  if [[ -z "$ERPNEXT_API_KEY" ]] || [[ -z "$ERPNEXT_API_SECRET" ]]; then
    log_skip "API credentials not configured"
    return
  fi

  # Try to get Task DocType metadata
  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Accept: application/json" \
    "${ERPNEXT_API_URL}/api/resource/Task?limit_page_length=1" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "Task DocType is accessible"
    TASK_COUNT=$(echo "$BODY" | jq -r '.data | length // 0')
    log_info "Retrieved ${TASK_COUNT} task(s) from API"
  else
    log_fail "Task DocType access failed (HTTP ${HTTP_CODE})"
    # Only log error type, not full response to avoid leaking sensitive info
    ERROR_TYPE=$(echo "$BODY" | jq -r '.exc_type // "Unknown error"' 2>/dev/null || echo "Unknown error")
    log_info "Error type: ${ERROR_TYPE}"
  fi
}

# Test 6: Site Config and Version
test_site_info() {
  log_test "ERPNext Site Information"

  if [[ -z "$ERPNEXT_API_KEY" ]] || [[ -z "$ERPNEXT_API_SECRET" ]]; then
    log_skip "API credentials not configured"
    return
  fi

  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Accept: application/json" \
    "${ERPNEXT_API_URL}/api/method/frappe.utils.change_log.get_versions" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "Site information retrieved"
    FRAPPE_VERSION=$(echo "$BODY" | jq -r '.message.frappe.version // "unknown"')
    ERPNEXT_VERSION=$(echo "$BODY" | jq -r '.message.erpnext.version // "unknown"')
    log_info "Frappe: ${FRAPPE_VERSION}"
    log_info "ERPNext: ${ERPNEXT_VERSION}"
  else
    log_fail "Failed to retrieve site information (HTTP ${HTTP_CODE})"
  fi
}

# Test 7: FLRTS Parser Log DocType Exists (10N-377)
test_flrts_parser_log_doctype() {
  log_test "FLRTS Parser Log DocType Exists"

  if [[ -z "$ERPNEXT_API_KEY" ]] || [[ -z "$ERPNEXT_API_SECRET" ]]; then
    log_skip "API credentials not configured"
    return
  fi

  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Accept: application/json" \
    "${ERPNEXT_API_URL}/api/resource/DocType/FLRTS%20Parser%20Log" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "FLRTS Parser Log DocType exists"
    # Verify field count (should have 30+ fields)
    FIELD_COUNT=$(echo "$BODY" | jq -r '.data.fields | length // 0')
    log_info "Field count: ${FIELD_COUNT}"
    if [[ "$FIELD_COUNT" -ge 30 ]]; then
      log_info "Field count validation: OK (>= 30)"
    else
      log_fail "Field count validation: Expected >= 30, got ${FIELD_COUNT}"
    fi
  else
    log_fail "FLRTS Parser Log DocType not found (HTTP ${HTTP_CODE})"
    log_info "Expected: Deploy flrts-extensions to create this DocType"
  fi
}

# Test 8: FLRTS User Preference DocType Exists (10N-377)
test_flrts_user_preference_doctype() {
  log_test "FLRTS User Preference DocType Exists"

  if [[ -z "$ERPNEXT_API_KEY" ]] || [[ -z "$ERPNEXT_API_SECRET" ]]; then
    log_skip "API credentials not configured"
    return
  fi

  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Accept: application/json" \
    "${ERPNEXT_API_URL}/api/resource/DocType/FLRTS%20User%20Preference" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "FLRTS User Preference DocType exists"
    # Verify field count (should have 11+ fields)
    FIELD_COUNT=$(echo "$BODY" | jq -r '.data.fields | length // 0')
    log_info "Field count: ${FIELD_COUNT}"
    if [[ "$FIELD_COUNT" -ge 11 ]]; then
      log_info "Field count validation: OK (>= 11)"
    else
      log_fail "Field count validation: Expected >= 11, got ${FIELD_COUNT}"
    fi
  else
    log_fail "FLRTS User Preference DocType not found (HTTP ${HTTP_CODE})"
    log_info "Expected: Deploy flrts-extensions to create this DocType"
  fi
}

# Test 9: Maintenance Visit Custom Fields Exist (10N-377)
test_maintenance_visit_custom_fields() {
  log_test "Maintenance Visit Custom Fields (Verify Accessibility)"

  if [[ -z "$ERPNEXT_API_KEY" ]] || [[ -z "$ERPNEXT_API_SECRET" ]]; then
    log_skip "API credentials not configured"
    return
  fi

  # Try to query with all 7 custom fields
  CUSTOM_FIELDS="custom_assigned_to,custom_priority,custom_parse_rationale,custom_parse_confidence,custom_telegram_message_id,custom_flrts_source,custom_flagged_for_review"

  # Build JSON array from CUSTOM_FIELDS
  FIELDS_JSON=$(echo "$CUSTOM_FIELDS" | awk -F',' '{
    printf "[\"name\""
    for (i=1; i<=NF; i++) {
      printf ",\"%s\"", $i
    }
    printf "]"
  }')

  # URL-encode the fields JSON for curl
  FIELDS_PARAM=$(printf '%s' "$FIELDS_JSON" | jq -sRr @uri)

  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Accept: application/json" \
    "${ERPNEXT_API_URL}/api/resource/Maintenance%20Visit?fields=${FIELDS_PARAM}&limit=1" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "Maintenance Visit custom fields are accessible"
    log_info "Custom fields are accessible via API (tested all 7 fields)"
  else
    log_fail "Maintenance Visit custom fields not accessible (HTTP ${HTTP_CODE})"
    ERROR_TYPE=$(echo "$BODY" | jq -r '.exc_type // "Unknown error"' 2>/dev/null || echo "Unknown error")
    log_info "Error type: ${ERROR_TYPE}"
    log_info "Expected: Deploy flrts-extensions to add custom fields"
  fi
}

# Test 10: Create FLRTS Parser Log Record (10N-377)
test_create_parser_log() {
  log_test "Create FLRTS Parser Log Record"

  if [[ -z "$ERPNEXT_API_KEY" ]] || [[ -z "$ERPNEXT_API_SECRET" ]]; then
    log_skip "API credentials not configured"
    return
  fi

  # Use timestamp to avoid duplicate conflicts
  TIMESTAMP=$(date +%s)

  PAYLOAD=$(cat <<EOF
{
  "telegram_message_id": "test-${TIMESTAMP}-msg-001",
  "telegram_user_id": "123456789",
  "telegram_chat_id": "987654321",
  "original_message": "Test message for smoke test",
  "model_name": "gpt-4o-mini",
  "prompt_version": "v1.0-test",
  "response_duration_ms": 1500,
  "prompt_tokens": 100,
  "completion_tokens": 50,
  "total_tokens": 150,
  "estimated_cost_usd": 0.0015
}
EOF
)

  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -X POST \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$PAYLOAD" \
    "${ERPNEXT_API_URL}/api/resource/FLRTS%20Parser%20Log" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "FLRTS Parser Log record created successfully"
    RECORD_NAME=$(echo "$BODY" | jq -r '.data.name // "unknown"')
    log_info "Record name: ${RECORD_NAME}"
  else
    log_fail "Failed to create FLRTS Parser Log record (HTTP ${HTTP_CODE})"
    ERROR_TYPE=$(echo "$BODY" | jq -r '.exc_type // "Unknown error"' 2>/dev/null || echo "Unknown error")
    log_info "Error type: ${ERROR_TYPE}"
    log_info "Expected: Deploy flrts-extensions to enable record creation"
  fi
}

# Test 11: Create FLRTS User Preference Record (10N-377)
test_create_user_preference() {
  log_test "Create FLRTS User Preference Record"

  if [[ -z "$ERPNEXT_API_KEY" ]] || [[ -z "$ERPNEXT_API_SECRET" ]]; then
    log_skip "API credentials not configured"
    return
  fi

  # Use timestamp to avoid duplicate conflicts
  TIMESTAMP=$(date +%s)

  PAYLOAD=$(cat <<EOF
{
  "telegram_user_id": "test-user-${TIMESTAMP}",
  "telegram_username": "smoketestuser${TIMESTAMP}",
  "timezone": "UTC",
  "enable_telegram_notifications": 1,
  "enable_email_notifications": 0
}
EOF
)

  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -X POST \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$PAYLOAD" \
    "${ERPNEXT_API_URL}/api/resource/FLRTS%20User%20Preference" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "FLRTS User Preference record created successfully"
    RECORD_NAME=$(echo "$BODY" | jq -r '.data.name // "unknown"')
    log_info "Record name: ${RECORD_NAME}"
  else
    log_fail "Failed to create FLRTS User Preference record (HTTP ${HTTP_CODE})"
    ERROR_TYPE=$(echo "$BODY" | jq -r '.exc_type // "Unknown error"' 2>/dev/null || echo "Unknown error")
    log_info "Error type: ${ERROR_TYPE}"
    log_info "Expected: Deploy flrts-extensions to enable record creation"
  fi
}

# Test 12: Create Maintenance Visit with Custom Fields (10N-377)
test_create_maintenance_visit_with_custom_fields() {
  log_test "Create Maintenance Visit with Custom Fields"

  if [[ -z "$ERPNEXT_API_KEY" ]] || [[ -z "$ERPNEXT_API_SECRET" ]]; then
    log_skip "API credentials not configured"
    return
  fi

  # Use timestamp for unique identification
  TIMESTAMP=$(date +%s)
  MNTC_DATE=$(date +%Y-%m-%d)

  PAYLOAD=$(cat <<EOF
{
  "mntc_date": "${MNTC_DATE}",
  "completion_status": "Pending",
  "custom_priority": "High",
  "custom_telegram_message_id": "test-msg-maint-${TIMESTAMP}",
  "custom_flrts_source": "telegram_bot",
  "custom_parse_confidence": 0.95,
  "custom_flagged_for_review": 0
}
EOF
)

  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -X POST \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$PAYLOAD" \
    "${ERPNEXT_API_URL}/api/resource/Maintenance%20Visit" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "Maintenance Visit with custom fields created successfully"
    RECORD_NAME=$(echo "$BODY" | jq -r '.data.name // "unknown"')
    log_info "Record name: ${RECORD_NAME}"

    # Verify custom fields were stored
    VERIFY_RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
      -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
      -H "Accept: application/json" \
      "${ERPNEXT_API_URL}/api/resource/Maintenance%20Visit/${RECORD_NAME}" || echo -e "\n000")

    parse_http_response "$VERIFY_RESPONSE"

    if [[ "$HTTP_CODE" == "200" ]]; then
      STORED_PRIORITY=$(echo "$BODY" | jq -r '.data.custom_priority // "not_found"')
      if [[ "$STORED_PRIORITY" == "High" ]]; then
        log_info "Custom field verification: OK (priority stored correctly)"
      else
        log_fail "Custom field verification: Expected 'High', got '${STORED_PRIORITY}'"
      fi
    fi
  else
    log_fail "Failed to create Maintenance Visit with custom fields (HTTP ${HTTP_CODE})"
    ERROR_TYPE=$(echo "$BODY" | jq -r '.exc_type // "Unknown error"' 2>/dev/null || echo "Unknown error")
    log_info "Error type: ${ERROR_TYPE}"
    log_info "Expected: Deploy flrts-extensions to enable custom fields"
  fi
}

# Main execution
main() {
  echo "======================================"
  echo "ERPNext Smoke Tests - Phase 7"
  echo "Testing: ${ERPNEXT_API_URL}"
  echo "======================================"

  check_prerequisites
  test_api_health
  test_api_authentication
  test_site_info
  test_installed_apps
  test_telegram_webhook
  test_task_doctype

  echo ""
  echo "======================================"
  echo "FLRTS Extensions Deployment Tests"
  echo "======================================"

  test_flrts_parser_log_doctype
  test_flrts_user_preference_doctype
  test_maintenance_visit_custom_fields
  test_create_parser_log
  test_create_user_preference
  test_create_maintenance_visit_with_custom_fields

  echo ""
  echo "======================================"
  echo "Test Results"
  echo "======================================"
  echo -e "${GREEN}Passed:${NC}  ${PASSED}"
  echo -e "${RED}Failed:${NC}  ${FAILED}"
  echo -e "${YELLOW}Skipped:${NC} ${SKIPPED}"
  echo "======================================"

  if [[ $FAILED -gt 0 ]]; then
    echo -e "\n${RED}Some tests failed. Please investigate.${NC}"
    exit 1
  elif [[ $PASSED -eq 0 ]]; then
    echo -e "\n${YELLOW}No tests passed. Check configuration.${NC}"
    exit 1
  else
    echo -e "\n${GREEN}All tests passed!${NC}"
    exit 0
  fi
}

main
