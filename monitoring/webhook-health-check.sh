#!/bin/bash
# Webhook Health Check Script
# Story 1.5 - Automated monitoring for Supabase → n8n webhook integration

# Configuration
WEBHOOK_URL="https://n8n-rrrs.sliplane.app/webhook/supabase-tasks-webhook"
SLACK_WEBHOOK="${SLACK_ALERT_WEBHOOK}"
DATE=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="/var/log/webhook-monitor.log"

# Performance thresholds (from Story 1.5 requirements)
MAX_RESPONSE_TIME=1.0  # 1 second webhook delivery threshold
TIMEOUT=5              # 5 second timeout for webhook test

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$DATE] $1" | tee -a "$LOG_FILE"
}

send_alert() {
    local message="$1"
    log "ALERT: $message"

    # Send to Slack if webhook configured
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -s -X POST "$SLACK_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"[WEBHOOK MONITOR] $message\"}" || \
            log "Failed to send Slack alert"
    fi
}

# Test webhook endpoint responsiveness
log "Testing webhook endpoint: $WEBHOOK_URL"

# Prepare test payload (Story 1.5 compliant format)
TEST_PAYLOAD='{
  "type": "HEALTH_CHECK",
  "table": "tasks",
  "schema": "public",
  "record": {
    "id": "health-check-'$(date +%s)'",
    "title": "Health Check Task",
    "status": "pending"
  },
  "old_record": null
}'

# Perform webhook test with timing
START_TIME=$(date +%s.%N)
RESPONSE=$(curl -s -o /tmp/webhook_response.txt -w "%{http_code}:%{time_total}" \
    --max-time "$TIMEOUT" \
    -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "$TEST_PAYLOAD" 2>/dev/null)

if [ $? -ne 0 ]; then
    send_alert "🚨 WEBHOOK FAILURE: Connection timeout or network error at $DATE"
    exit 1
fi

HTTP_CODE=$(echo "$RESPONSE" | cut -d':' -f1)
RESPONSE_TIME=$(echo "$RESPONSE" | cut -d':' -f2)

# Check HTTP status code
if [ "$HTTP_CODE" != "200" ]; then
    RESPONSE_BODY=$(cat /tmp/webhook_response.txt 2>/dev/null | head -200)
    send_alert "🚨 WEBHOOK FAILURE: HTTP $HTTP_CODE at $DATE. Response: $RESPONSE_BODY"
    rm -f /tmp/webhook_response.txt
    exit 1
fi

# Check response time against Story 1.5 threshold
if (( $(echo "$RESPONSE_TIME > $MAX_RESPONSE_TIME" | bc -l 2>/dev/null || echo "0") )); then
    send_alert "⚠️ PERFORMANCE ALERT: Webhook response time ${RESPONSE_TIME}s exceeds ${MAX_RESPONSE_TIME}s threshold at $DATE"
fi

# Success
log "✅ Webhook health check passed: HTTP $HTTP_CODE, ${RESPONSE_TIME}s response time"

# Cleanup
rm -f /tmp/webhook_response.txt

# Check Supabase webhook delivery logs (if psql available)
if command -v psql >/dev/null 2>&1 && [ -n "$SUPABASE_DB_URL" ]; then
    log "Checking recent webhook delivery success rate..."

    SUCCESS_RATE=$(psql "$SUPABASE_DB_URL" -t -c "
        SELECT COALESCE(
            ROUND(
                COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END)::numeric /
                NULLIF(COUNT(*), 0)::numeric * 100, 2
            ), 0
        ) as success_rate
        FROM net.http_request_queue
        WHERE url LIKE '%n8n-rrrs.sliplane.app%'
          AND created_at >= NOW() - INTERVAL '1 hour';" 2>/dev/null | xargs)

    if [ -n "$SUCCESS_RATE" ] && (( $(echo "$SUCCESS_RATE < 99" | bc -l 2>/dev/null || echo "0") )); then
        send_alert "⚠️ SUCCESS RATE ALERT: Webhook success rate ${SUCCESS_RATE}% below 99% threshold (last hour)"
    elif [ -n "$SUCCESS_RATE" ]; then
        log "✅ Webhook success rate: ${SUCCESS_RATE}% (last hour)"
    fi
fi

exit 0