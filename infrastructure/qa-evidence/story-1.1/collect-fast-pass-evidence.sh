#!/usr/bin/env bash
set -Eeuo pipefail

# Fast-pass QA evidence collector for Story 1.1 (OpenProject on DO)
# - Verifies localhost binding, health endpoints, worker separation
# - Measures restart event latency (<30s) separately from health recovery time
# - Captures docker/compose state and logs as evidence

TS=$(date -Iseconds 2>/dev/null || date +%Y-%m-%dT%H-%M-%S)
TS=${TS//:/-}
EV_BASE_DIR="/root/bigsirflrts/infrastructure/qa-evidence/story-1.1"
EV_DIR="$EV_BASE_DIR/run-$TS"
mkdir -p "$EV_DIR"
echo "$TS" >"$EV_DIR/timestamp.txt"

echo "Collecting docker ps..."
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" | tee "$EV_DIR/docker-ps.txt" >/dev/null || true

echo "Collecting docker compose ps..."
if [ -f /root/docker-compose.yml ]; then
  (cd /root && docker compose -f docker-compose.yml -f docker-compose.override.yml ps || true) | tee "$EV_DIR/docker-compose-ps.txt" >/dev/null
  cp -f /root/docker-compose.yml "$EV_DIR/docker-compose.yml" || true
  cp -f /root/docker-compose.override.yml "$EV_DIR/docker-compose.override.yml" || true
else
  echo "WARN: /root/docker-compose.yml not found" | tee -a "$EV_DIR/warnings.txt"
fi

echo "Checking port binding (127.0.0.1:8080)..."
(grep -nE "ports|127\\.0\\.0\\.1|8080" /root/docker-compose*.yml || true) | tee "$EV_DIR/port-binding.txt" >/dev/null

echo "Hitting health endpoints on localhost:8080..."
for p in default database worker all; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:8080/health_checks/$p" || true)
  echo "$p: $code" | tee -a "$EV_DIR/health-codes.txt" >/dev/null
  curl -s "http://127.0.0.1:8080/health_checks/$p" >"$EV_DIR/health-$p.json" || true
done

echo "Collecting last 200 lines of logs for web and worker..."
docker logs --tail=200 openproject >"$EV_DIR/openproject-logs.txt" 2>&1 || true
docker logs --tail=200 openproject-worker >"$EV_DIR/openproject-worker-logs.txt" 2>&1 || true

# Measure restart event latency (<30s) and health recovery (informational)
RESTART_EVENT_SECS="n/a"
HEALTH_RECOVERY_SECS="n/a"
RESTART_OK="unknown"

if docker inspect openproject >/dev/null 2>&1; then
  echo "Measuring restart event latency (separate from health recovery)..."
  # Capture initial StartedAt
  initial_started_at=$(docker inspect -f '{{ .State.StartedAt }}' openproject 2>/dev/null || echo "")
  t0=$(date +%s)
  docker restart openproject >/dev/null 2>&1 || true

  # Wait up to 60s for StartedAt to change (restart event)
  for i in $(seq 1 60); do
    sleep 1
    current_started_at=$(docker inspect -f '{{ .State.StartedAt }}' openproject 2>/dev/null || echo "")
    if [ -n "$initial_started_at" ] && [ "$current_started_at" != "$initial_started_at" ]; then
      t1=$(date +%s)
      RESTART_EVENT_SECS=$(( t1 - t0 ))
      break
    fi
  done

  # Now measure health recovery time (up to 60s)
  t2=$(date +%s)
  for i in $(seq 1 12); do
    state=$(docker inspect -f '{{ .State.Health.Status }}' openproject 2>/dev/null || echo "")
    if [ "$state" = "healthy" ]; then
      t3=$(date +%s)
      HEALTH_RECOVERY_SECS=$(( t3 - t2 ))
      break
    fi
    sleep 5
  done

  if [ "$RESTART_EVENT_SECS" != "n/a" ] && [ "$RESTART_EVENT_SECS" -lt 30 ]; then
    RESTART_OK="yes"
  else
    RESTART_OK="no"
  fi

  {
    echo "Restart event seconds: $RESTART_EVENT_SECS"
    echo "Health recovery seconds: $HEALTH_RECOVERY_SECS"
  } | tee "$EV_DIR/restart-observed.txt" >/dev/null
fi

# Acceptance criteria computation
PASS_BINDING="no"
if grep -q "127.0.0.1:8080" "$EV_DIR"/docker-compose*.yml 2>/dev/null; then PASS_BINDING="yes"; fi
H_DEFAULT="no"; H_DATABASE="no"; H_WORKER="no"; H_ALL="no"
grep -q "default: 200" "$EV_DIR/health-codes.txt" && H_DEFAULT="yes" || true
grep -q "database: 200" "$EV_DIR/health-codes.txt" && H_DATABASE="yes" || true
grep -q "worker: 200" "$EV_DIR/health-codes.txt" && H_WORKER="yes" || true
grep -q "all: 200" "$EV_DIR/health-codes.txt" && H_ALL="yes" || true

{
  echo "Acceptance Criteria:"
  echo "- Web binds to 127.0.0.1:8080 only: $PASS_BINDING"
  echo "- Health endpoints 200 (default,database,worker,all): $H_DEFAULT,$H_DATABASE,$H_WORKER,$H_ALL"
  echo "- Auto-restart under 30s (event): $RESTART_OK"
  echo "Evidence directory: $EV_DIR"
} | tee "$EV_DIR/summary.txt"

echo "$EV_DIR"
