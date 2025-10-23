#!/usr/bin/env bash
set -euo pipefail

# Telegram Bot Lambda Smoke Tests
# Tests complete flow: Telegram → Lambda → OpenAI → ERPNext → Telegram

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
LAMBDA_FUNCTION_URL="${LAMBDA_FUNCTION_URL:-}"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_TEST_CHAT_ID="${TELEGRAM_TEST_CHAT_ID:-}"
TELEGRAM_WEBHOOK_SECRET="${TELEGRAM_WEBHOOK_SECRET:-}"
ERPNEXT_API_URL="${ERPNEXT_API_URL:-}"
ERPNEXT_API_KEY="${ERPNEXT_API_KEY:-}"
ERPNEXT_API_SECRET="${ERPNEXT_API_SECRET:-}"

# Counters
PASSED=0
FAILED=0
SKIPPED=0

# Global variables for test data
TEST_MESSAGE_ID=""
INVALID_MESSAGE_ID=""

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

  # Check required commands
  if ! command -v curl &> /dev/null; then
    log_fail "curl not found"
    exit 1
  fi

  if ! command -v jq &> /dev/null; then
    log_fail "jq not found (required for JSON parsing)"
    exit 1
  fi

  if ! command -v bc &> /dev/null; then
    log_fail "bc not found (required for arithmetic operations)"
    exit 1
  fi

  # Check required environment variables
  local required_vars=("LAMBDA_FUNCTION_URL" "TELEGRAM_BOT_TOKEN" "TELEGRAM_TEST_CHAT_ID" "TELEGRAM_WEBHOOK_SECRET" "ERPNEXT_API_URL" "ERPNEXT_API_KEY" "ERPNEXT_API_SECRET")
  for var in "${required_vars[@]}"; do
    if [[ -z "${!var:-}" ]]; then
      log_fail "Environment variable $var not set"
      exit 1
    fi
  done

  log_pass "Prerequisites check"
}

# Test 1: Lambda Health Check
test_lambda_health() {
  log_test "Lambda Health Check"
  log_info "URL: ${LAMBDA_FUNCTION_URL}"

  # Create a minimal valid Telegram webhook payload for health check
  local payload='{
    "update_id": 123456789,
    "message": {
      "message_id": 1,
      "from": {
        "id": 123456789,
        "is_bot": false,
        "first_name": "Test",
        "username": "testuser"
      },
      "chat": {
        "id": '${TELEGRAM_TEST_CHAT_ID}',
        "type": "private"
      },
      "date": '$(date +%s)',
      "text": "health check"
    }
  }'

  # Measure response time
  local start_time=$(date +%s%3N)
  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -X POST \
    -H "Content-Type: application/json" \
    -H "X-Telegram-Bot-Api-Secret-Token: ${TELEGRAM_WEBHOOK_SECRET}" \
    -d "$payload" \
    "${LAMBDA_FUNCTION_URL}" || echo -e "\n000")
  local end_time=$(date +%s%3N)
  local response_time=$((end_time - start_time))

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    log_pass "Lambda health check successful (HTTP ${HTTP_CODE})"
    log_info "Response time: ${response_time}ms"
    # With Provisioned Concurrency enabled (1 unit), cold starts eliminated
    if [[ $response_time -lt 2000 ]]; then
      log_pass "Response time < 2 seconds (Provisioned Concurrency active)"
    else
      log_fail "Response time >= 2 seconds (${response_time}ms) - check Provisioned Concurrency status"
    fi
  else
    log_fail "Lambda health check failed (HTTP ${HTTP_CODE})"
  fi
}

# Test 2: Create Task via Telegram
test_create_task() {
  log_test "Create Task via Telegram"
  log_info "Sending message: 'Colin check pump #3 at Big Sky'"

  # Send message via Telegram Bot API
  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\": \"${TELEGRAM_TEST_CHAT_ID}\", \"text\": \"Colin check pump #3 at Big Sky\"}" \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    TEST_MESSAGE_ID=$(echo "$BODY" | jq -r '.result.message_id // empty')
    if [[ -n "$TEST_MESSAGE_ID" ]]; then
      log_pass "Message sent successfully (message_id: ${TEST_MESSAGE_ID})"
      log_info "Waiting 2 seconds for processing..."
      sleep 2
    else
      log_fail "Failed to extract message_id from response"
      return
    fi
  else
    log_fail "Failed to send message via Telegram API (HTTP ${HTTP_CODE})"
    return
  fi

  # Note: We can't directly verify Telegram confirmation receipt in this script
  # Instead, we'll verify the task was created in ERPNext (next test)
}

# Test 3: Verify Task in ERPNext
test_verify_task() {
  log_test "Verify Task in ERPNext"

  if [[ -z "$TEST_MESSAGE_ID" ]]; then
    log_skip "No test message ID available (Test 2 failed)"
    return
  fi

  # Query Maintenance Visit API with telegram_message_id filter
  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Accept: application/json" \
    "${ERPNEXT_API_URL}/api/resource/Maintenance Visit?filters=[[\"custom_telegram_message_id\",\"=\",\"${TEST_MESSAGE_ID}\"]]&limit_page_length=1" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    TASK_COUNT=$(echo "$BODY" | jq -r '.data | length // 0')
    if [[ "$TASK_COUNT" -gt 0 ]]; then
      log_pass "Task found in ERPNext"
      TASK_DATA=$(echo "$BODY" | jq -r '.data[0]')

      # Verify fields
      WORK_DETAILS=$(echo "$TASK_DATA" | jq -r '.mntc_work_details // empty')
      ASSIGNED_TO=$(echo "$TASK_DATA" | jq -r '.custom_assigned_to // empty')
      SOURCE=$(echo "$TASK_DATA" | jq -r '.custom_flrts_source // empty')
      MSG_ID=$(echo "$TASK_DATA" | jq -r '.custom_telegram_message_id // empty')

      if [[ "$WORK_DETAILS" == *"check pump #3"* ]]; then
        log_pass "Work details contain expected text"
      else
        log_fail "Work details incorrect: '$WORK_DETAILS'"
      fi

      if [[ "$ASSIGNED_TO" == "colin@10nz.tools" ]]; then
        log_pass "Assigned to correct user"
      else
        log_fail "Assigned to incorrect: '$ASSIGNED_TO'"
      fi

      if [[ "$SOURCE" == "telegram_bot" ]]; then
        log_pass "Source is telegram_bot"
      else
        log_fail "Source incorrect: '$SOURCE'"
      fi

      if [[ "$MSG_ID" == "$TEST_MESSAGE_ID" ]]; then
        log_pass "Telegram message ID matches"
      else
        log_fail "Message ID mismatch: expected $TEST_MESSAGE_ID, got $MSG_ID"
      fi
    else
      log_fail "No task found with telegram_message_id ${TEST_MESSAGE_ID}"
    fi
  else
    log_fail "Failed to query Maintenance Visit API (HTTP ${HTTP_CODE})"
  fi
}

# Test 4: Verify Audit Log in ERPNext
test_verify_audit_log() {
  log_test "Verify Audit Log in ERPNext"

  if [[ -z "$TEST_MESSAGE_ID" ]]; then
    log_skip "No test message ID available (Test 2 failed)"
    return
  fi

  # Query FLRTS Parser Log API with telegram_message_id filter
  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Accept: application/json" \
    "${ERPNEXT_API_URL}/api/resource/FLRTS Parser Log?filters=[[\"telegram_message_id\",\"=\",\"${TEST_MESSAGE_ID}\"]]&limit_page_length=1" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    LOG_COUNT=$(echo "$BODY" | jq -r '.data | length // 0')
    if [[ "$LOG_COUNT" -gt 0 ]]; then
      log_pass "Audit log entry found"
      LOG_DATA=$(echo "$BODY" | jq -r '.data[0]')

      # Verify fields
      STATUS=$(echo "$LOG_DATA" | jq -r '.status // empty')
      CONFIDENCE=$(echo "$LOG_DATA" | jq -r '.confidence // 0')
      MSG_ID=$(echo "$LOG_DATA" | jq -r '.telegram_message_id // empty')
      PARSED_DATA=$(echo "$LOG_DATA" | jq -r '.parsed_data // empty')

      if [[ "$STATUS" == "success" ]]; then
        log_pass "Status is success"
      else
        log_fail "Status incorrect: '$STATUS'"
      fi

      if (( $(echo "$CONFIDENCE > 0.7" | bc -l) )); then
        log_pass "Confidence > 0.7 (${CONFIDENCE})"
      else
        log_fail "Confidence too low: ${CONFIDENCE}"
      fi

      if [[ "$MSG_ID" == "$TEST_MESSAGE_ID" ]]; then
        log_pass "Telegram message ID matches"
      else
        log_fail "Message ID mismatch: expected $TEST_MESSAGE_ID, got $MSG_ID"
      fi

      if echo "$PARSED_DATA" | jq empty > /dev/null 2>&1; then
        log_pass "Parsed data is valid JSON"
      else
        log_fail "Parsed data is not valid JSON: '$PARSED_DATA'"
      fi
    else
      log_fail "No audit log found with telegram_message_id ${TEST_MESSAGE_ID}"
    fi
  else
    log_fail "Failed to query FLRTS Parser Log API (HTTP ${HTTP_CODE})"
  fi
}

# Test 5: Error Handling - Invalid Assignee
test_error_handling() {
  log_test "Error Handling - Invalid Assignee"
  log_info "Sending message with invalid assignee: 'John do something at Big Sky'"

  # Send message with invalid assignee via Telegram Bot API
  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\": \"${TELEGRAM_TEST_CHAT_ID}\", \"text\": \"John do something at Big Sky\"}" \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    INVALID_MESSAGE_ID=$(echo "$BODY" | jq -r '.result.message_id // empty')
    if [[ -n "$INVALID_MESSAGE_ID" ]]; then
      log_pass "Message with invalid assignee sent successfully (message_id: ${INVALID_MESSAGE_ID})"
      log_info "Waiting 2 seconds for processing..."
      sleep 2
    else
      log_fail "Failed to extract message_id from response"
      return
    fi
  else
    log_fail "Failed to send message via Telegram API (HTTP ${HTTP_CODE})"
    return
  fi

  # Verify no Maintenance Visit was created
  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Accept: application/json" \
    "${ERPNEXT_API_URL}/api/resource/Maintenance Visit?filters=[[\"custom_telegram_message_id\",\"=\",\"${INVALID_MESSAGE_ID}\"]]&limit_page_length=1" || echo -e "\n000")

  parse_http_response "$RESPONSE"

  if [[ "$HTTP_CODE" == "200" ]]; then
    TASK_COUNT=$(echo "$BODY" | jq -r '.data | length // 0')
    if [[ "$TASK_COUNT" -eq 0 ]]; then
      log_pass "No Maintenance Visit created for invalid assignee"
    else
      log_fail "Maintenance Visit was created despite invalid assignee"
    fi
  else
    log_fail "Failed to query Maintenance Visit API (HTTP ${HTTP_CODE})"
  fi

  # NOTE: Handler behavior for invalid assignee (index.mjs lines 226-256):
  # - Maps assignee name to email using context.users
  # - If no match found, sends Telegram error message and returns early
  # - Does NOT call createMaintenanceVisit()
  # - Does NOT call logParserAudit()
  # This is DIFFERENT from other error paths (parsing failures, ERPNext API errors)
  # which DO call logParserAudit() with status='failed'.
  #
  # Therefore, we SKIP the audit log assertion for invalid assignee errors.
  # The test still validates:
  # 1. Message was sent successfully
  # 2. No Maintenance Visit was created (verified above)
  # 3. User receives error message (cannot verify in automation)
  log_skip "Audit log check for invalid assignee (handler doesn't emit audits for this error type)"

  # Note: We can't directly verify Telegram error message receipt in this script
}

# Test 6: Cleanup (Optional)
test_cleanup() {
  log_test "Cleanup (Optional)"

  local cleanup_performed=false

  # Delete test task
  if [[ -n "$TEST_MESSAGE_ID" ]]; then
    # First get the task name
    RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
      -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
      -H "Accept: application/json" \
      "${ERPNEXT_API_URL}/api/resource/Maintenance Visit?filters=[[\"custom_telegram_message_id\",\"=\",\"${TEST_MESSAGE_ID}\"]]&limit_page_length=1" || echo -e "\n000")

    parse_http_response "$RESPONSE"

    if [[ "$HTTP_CODE" == "200" ]]; then
      TASK_NAME=$(echo "$BODY" | jq -r '.data[0].name // empty')
      if [[ -n "$TASK_NAME" ]]; then
        # Delete the task
        DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
          -X DELETE \
          -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
          "${ERPNEXT_API_URL}/api/resource/Maintenance Visit/${TASK_NAME}" || echo -e "\n000")

        DELETE_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)
        if [[ "$DELETE_CODE" == "202" ]]; then
          log_pass "Test task deleted from ERPNext"
          cleanup_performed=true
        else
          log_info "Failed to delete test task (HTTP ${DELETE_CODE})"
        fi
      fi
    fi
  fi

  # Delete test audit logs
  for msg_id in "$TEST_MESSAGE_ID" "$INVALID_MESSAGE_ID"; do
    if [[ -n "$msg_id" ]]; then
      # Get audit log name
      RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
        -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
        -H "Accept: application/json" \
        "${ERPNEXT_API_URL}/api/resource/FLRTS Parser Log?filters=[[\"telegram_message_id\",\"=\",\"${msg_id}\"]]&limit_page_length=1" || echo -e "\n000")

      parse_http_response "$RESPONSE"

      if [[ "$HTTP_CODE" == "200" ]]; then
        LOG_NAME=$(echo "$BODY" | jq -r '.data[0].name // empty')
        if [[ -n "$LOG_NAME" ]]; then
          # Delete the log
          DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
            -X DELETE \
            -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
            "${ERPNEXT_API_URL}/api/resource/FLRTS Parser Log/${LOG_NAME}" || echo -e "\n000")

          DELETE_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)
          if [[ "$DELETE_CODE" == "202" ]]; then
            log_pass "Test audit log deleted (${msg_id})"
            cleanup_performed=true
          else
            log_info "Failed to delete test audit log (HTTP ${DELETE_CODE})"
          fi
        fi
      fi
    fi
  done

  if [[ "$cleanup_performed" == true ]]; then
    log_pass "Cleanup completed"
  else
    log_skip "No cleanup performed"
  fi
}

# Main execution
main() {
  echo "======================================"
  echo "Telegram Bot Lambda Smoke Tests"
  echo "Testing: ${LAMBDA_FUNCTION_URL}"
  echo "======================================"

  check_prerequisites
  test_lambda_health
  test_create_task
  test_verify_task
  test_verify_audit_log
  test_error_handling
  test_cleanup

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