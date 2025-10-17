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
ERPNEXT_API_KEY="${ERPNEXT_API_KEY:-}"
ERPNEXT_API_SECRET="${ERPNEXT_API_SECRET:-}"

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

  if [[ "$HTTP_CODE" =~ ^(200|301|302|403)$ ]]; then
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

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "API authentication successful"
    log_info "Response: $(echo "$BODY" | jq -c '.')"
  else
    log_fail "API authentication failed (HTTP ${HTTP_CODE})"
    log_info "Response: $BODY"
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

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')

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

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

  if [[ "$HTTP_CODE" =~ ^(200|400|405)$ ]]; then
    # 200 = success, 400 = method exists but bad payload, 405 = method exists but wrong HTTP method
    log_pass "Telegram webhook endpoint is accessible (HTTP ${HTTP_CODE})"
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

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "Task DocType is accessible"
    TASK_COUNT=$(echo "$BODY" | jq -r '.data | length // 0')
    log_info "Retrieved ${TASK_COUNT} task(s) from API"
  else
    log_fail "Task DocType access failed (HTTP ${HTTP_CODE})"
    log_info "Response: $BODY"
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

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')

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
