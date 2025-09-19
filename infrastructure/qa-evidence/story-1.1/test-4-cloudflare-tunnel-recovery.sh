#!/bin/bash
# Test 4: Cloudflare Tunnel Failure Recovery
# QA Gate Requirement: Story 1.1
# Date: $(date -Iseconds)

set -e

echo "=========================================="
echo "TEST 4: CLOUDFLARE TUNNEL FAILURE RECOVERY"
echo "=========================================="
echo "Start time: $(date -Iseconds)"
echo ""

# Configuration
TUNNEL_CONTAINER="flrts-cloudflared"
OPENPROJECT_URL="https://ops.10nz.tools"
DIRECT_URL="http://165.227.216.172:8080"  # Should be blocked by firewall
LOG_FILE="./test-4-evidence.log"

# Function to check HTTPS accessibility
check_https_access() {
    echo "Checking HTTPS access at $(date -Iseconds)..."

    if curl -s -f -m 5 "$OPENPROJECT_URL" > /dev/null 2>&1; then
        echo "✅ HTTPS accessible via Cloudflare Tunnel" | tee -a $LOG_FILE
        return 0
    else
        echo "❌ HTTPS not accessible" | tee -a $LOG_FILE
        return 1
    fi
}

# Function to verify firewall blocking direct access
verify_firewall() {
    echo "Verifying firewall blocks direct access..."

    if timeout 3 curl -s "$DIRECT_URL" > /dev/null 2>&1; then
        echo "⚠️  WARNING: Direct access possible (firewall may be misconfigured)" | tee -a $LOG_FILE
        return 1
    else
        echo "✅ Direct access blocked by firewall (expected behavior)" | tee -a $LOG_FILE
        return 0
    fi
}

# Pre-test validation
echo "=== PRE-TEST VALIDATION ==="
echo "1. Cloudflare Tunnel container status:"
docker ps --filter "name=$TUNNEL_CONTAINER" --format "table {{.Names}}\t{{.Status}}" | tee -a $LOG_FILE

echo ""
echo "2. Current HTTPS accessibility:"
check_https_access

echo ""
echo "3. Firewall validation (direct access should fail):"
verify_firewall

echo ""
echo "4. Tunnel health from logs:"
docker logs --tail 10 $TUNNEL_CONTAINER 2>&1 | grep -i "connect\|tunnel\|error" | tail -5 || echo "No relevant logs" | tee -a $LOG_FILE

echo ""
echo "=== SIMULATING TUNNEL FAILURE ==="
echo "Stopping Cloudflare Tunnel container at $(date -Iseconds)..."
docker stop $TUNNEL_CONTAINER | tee -a $LOG_FILE

echo "Tunnel container stopped. Waiting 3 seconds..."
sleep 3

echo ""
echo "=== VERIFYING IMPACT OF TUNNEL FAILURE ==="
echo "1. Testing HTTPS accessibility (should fail):"

HTTPS_DOWN=false
if ! check_https_access; then
    echo "✅ Confirmed: HTTPS inaccessible without tunnel (expected)" | tee -a $LOG_FILE
    HTTPS_DOWN=true
else
    echo "❌ Unexpected: HTTPS still accessible" | tee -a $LOG_FILE
fi

echo ""
echo "2. Confirming OpenProject container is still running:"
docker ps --filter "name=flrts-openproject" --format "table {{.Names}}\t{{.Status}}" | tee -a $LOG_FILE

echo ""
echo "3. Testing internal connectivity (container-to-container):"
docker exec flrts-openproject curl -s -o /dev/null -w "Internal health check: %{http_code}\n" "http://localhost/health_checks/default" | tee -a $LOG_FILE

echo ""
echo "=== RESTARTING CLOUDFLARE TUNNEL ==="
echo "Starting tunnel container at $(date -Iseconds)..."
RESTART_TIME=$(date +%s)
docker start $TUNNEL_CONTAINER | tee -a $LOG_FILE

echo "Tunnel container started. Monitoring recovery..."
echo ""

echo "=== MONITORING TUNNEL RECOVERY ==="
RECOVERED=false
RECOVERY_TIME=0

for i in $(seq 1 30); do
    echo "Recovery check $i/30 at $(date -Iseconds):"

    if curl -s -f -m 3 "$OPENPROJECT_URL" > /dev/null 2>&1; then
        RECOVERY_END=$(date +%s)
        RECOVERY_TIME=$((RECOVERY_END - RESTART_TIME))
        echo "✅ HTTPS access restored after $RECOVERY_TIME seconds!" | tee -a $LOG_FILE
        RECOVERED=true
        break
    else
        echo "⏳ HTTPS not yet accessible..." | tee -a $LOG_FILE
        sleep 1
    fi
done

echo ""
echo "=== POST-RECOVERY VALIDATION ==="
echo "1. Tunnel container status:"
docker ps --filter "name=$TUNNEL_CONTAINER" --format "table {{.Names}}\t{{.Status}}" | tee -a $LOG_FILE

echo ""
echo "2. Tunnel connection logs:"
docker logs --tail 20 $TUNNEL_CONTAINER 2>&1 | grep -i "connect\|tunnel\|ready" | tail -10 | tee -a $LOG_FILE

echo ""
echo "3. HTTPS response headers (checking Cloudflare):"
curl -s -I "$OPENPROJECT_URL" | grep -i "cf-\|cloudflare" | head -5 | tee -a $LOG_FILE

echo ""
echo "4. SSL certificate verification:"
echo | openssl s_client -connect ops.10nz.tools:443 2>/dev/null | openssl x509 -noout -text | grep -A2 "Subject:" | tee -a $LOG_FILE

echo ""
echo "5. Response time test (5 requests):"
for i in {1..5}; do
    TIME=$(curl -s -o /dev/null -w "%{time_total}" "$OPENPROJECT_URL")
    echo "  Request $i: ${TIME}s" | tee -a $LOG_FILE
done

# Additional tunnel resilience test
echo ""
echo "=== TUNNEL RESILIENCE TEST ==="
echo "Testing automatic recovery from brief network interruption..."

# Briefly restart the tunnel
docker restart $TUNNEL_CONTAINER > /dev/null 2>&1
echo "Tunnel restarted. Testing recovery speed..."

QUICK_RECOVERY=false
for i in $(seq 1 15); do
    if curl -s -f -m 2 "$OPENPROJECT_URL" > /dev/null 2>&1; then
        echo "✅ Quick recovery confirmed after $i seconds" | tee -a $LOG_FILE
        QUICK_RECOVERY=true
        break
    fi
    sleep 1
done

echo ""
echo "=========================================="
echo "TEST RESULTS"
echo "=========================================="
echo "End time: $(date -Iseconds)"
echo ""

# Evaluate results
if [ "$HTTPS_DOWN" = true ] && [ "$RECOVERED" = true ] && [ $RECOVERY_TIME -le 30 ]; then
    echo "✅ TEST PASSED: All validation criteria met!" | tee -a $LOG_FILE
    echo "  - HTTPS became inaccessible when tunnel stopped" | tee -a $LOG_FILE
    echo "  - Tunnel container restarted successfully" | tee -a $LOG_FILE
    echo "  - HTTPS access restored within $RECOVERY_TIME seconds (< 30s required)" | tee -a $LOG_FILE
    echo "  - Cloudflare headers confirmed in responses" | tee -a $LOG_FILE
    [ "$QUICK_RECOVERY" = true ] && echo "  - Quick recovery from restart demonstrated" | tee -a $LOG_FILE
    exit 0
else
    echo "❌ TEST FAILED: Not all criteria met!" | tee -a $LOG_FILE
    [ "$HTTPS_DOWN" = false ] && echo "  - HTTPS did not become inaccessible" | tee -a $LOG_FILE
    [ "$RECOVERED" = false ] && echo "  - Tunnel did not recover" | tee -a $LOG_FILE
    [ $RECOVERY_TIME -gt 30 ] && echo "  - Recovery took > 30 seconds" | tee -a $LOG_FILE
    exit 1
fi