#!/usr/bin/env bash
set -euo pipefail

# Remote monitoring stack deploy for the OpenProject VM.
# Usage:
#   scripts/deploy-monitoring-remote.sh root@165.227.216.172 \
#     --prom-host prom.10nz.tools \
#     --grafana-host graf.10nz.tools \
#     --jaeger-host jaeger.10nz.tools \
#     --monitor-host monitor.10nz.tools
#
# Notes:
# - Requires SSH access to the droplet as root (key-based auth recommended).
# - Copies compose + monitoring assets to /root/ and brings stack up.
# - If hostnames are provided, attempts to update /root/cloudflare-monitoring-config.yml
#   using dockerized yq and restarts cloudflared.

REMOTE_HOST=${1:-}
shift || true

PROM_HOST=""
GRAFANA_HOST=""
JAEGER_HOST=""
MONITOR_HOST=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prom-host) PROM_HOST="$2"; shift 2;;
    --grafana-host) GRAFANA_HOST="$2"; shift 2;;
    --jaeger-host) JAEGER_HOST="$2"; shift 2;;
    --monitor-host) MONITOR_HOST="$2"; shift 2;;
    *) echo "Unknown arg: $1" >&2; exit 1;;
  esac
done

if [[ -z "$REMOTE_HOST" ]]; then
  echo "Usage: $0 <user@host> [--prom-host host] [--grafana-host host] [--jaeger-host host] [--monitor-host host]" >&2
  exit 1
fi

echo "[1/6] Creating remote directories…"
ssh -o StrictHostKeyChecking=no "$REMOTE_HOST" "mkdir -p /root/monitoring /root/logs"

echo "[2/6] Syncing compose and monitoring assets…"
scp -o StrictHostKeyChecking=no infrastructure/digitalocean/docker-compose.monitoring.prod.yml "$REMOTE_HOST":/root/docker-compose.monitoring.prod.yml
scp -o StrictHostKeyChecking=no -r infrastructure/monitoring/production/* "$REMOTE_HOST":/root/monitoring/

echo "[3/6] Bringing up monitoring stack…"
ssh -o StrictHostKeyChecking=no "$REMOTE_HOST" "docker compose -f /root/docker-compose.monitoring.prod.yml up -d"

echo "[4/6] Verifying service health (localhost on VM)…"
ssh -o StrictHostKeyChecking=no "$REMOTE_HOST" bash -lc '
  set -e
  echo "-- docker ps --"
  docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" | sed -n "1,200p"
  echo
  echo "-- Prometheus ready --"
  curl -sf http://localhost:9090/-/ready | cat
  echo
  echo "-- Grafana health --"
  curl -sf http://localhost:3000/api/health | cat
  echo
  echo "-- Jaeger UI (HTTP 200 expected on root) --"
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:16686
  echo "-- Node Exporter metrics line 1 --"
  curl -sf http://localhost:9100/metrics | head -n1
  echo "-- cAdvisor metrics line 1 --"
  curl -sf http://localhost:8080/metrics | head -n1
'

if [[ -n "$PROM_HOST" || -n "$GRAFANA_HOST" || -n "$JAEGER_HOST" || -n "$MONITOR_HOST" ]]; then
  echo "[5/6] Updating Cloudflare ingress (if cloudflared is present)…"
  # Build yq once (containerized) and patch the ingress file.
  ssh -o StrictHostKeyChecking=no "$REMOTE_HOST" bash -lc '
    set -e
    CFG="/root/cloudflare-monitoring-config.yml"
    if [ ! -f "$CFG" ]; then
      echo "cloudflare-monitoring-config.yml not found; skipping ingress update" >&2
      exit 0
    fi
    cp -a "$CFG" "${CFG}.bak.$(date +%s)"
  '

  # Use a here-doc to generate a remote patch script that runs yq edits
  TMP_SCRIPT=$(mktemp)
  cat > "$TMP_SCRIPT" <<'EOS'
set -e
CFG="/root/cloudflare-monitoring-config.yml"
ensure_entry() {
  local host="$1" service="$2"
  [ -z "$host" ] && return 0
  docker run --rm -v /root:/workdir mikefarah/yq \
    '(.ingress //= []) as $i | .ingress |= ($i + [{"hostname": "'"$host"'", "service": "'"$service"'"}])' \
    -i "$CFG"
}
ensure_entry "__PROM_HOST__" "http://localhost:9090"
ensure_entry "__GRAFANA_HOST__" "http://localhost:3000"
ensure_entry "__JAEGER_HOST__" "http://localhost:16686"
ensure_entry "__MONITOR_HOST__" "http://localhost:3002"
docker ps --format '{{.Names}}' | grep -q '^cloudflared$' && docker restart cloudflared >/dev/null 2>&1 || true
EOS

  # Replace placeholders with actual hosts
  sed -i '' -e "s#__PROM_HOST__#${PROM_HOST}#g" "$TMP_SCRIPT"
  sed -i '' -e "s#__GRAFANA_HOST__#${GRAFANA_HOST}#g" "$TMP_SCRIPT"
  sed -i '' -e "s#__JAEGER_HOST__#${JAEGER_HOST}#g" "$TMP_SCRIPT"
  sed -i '' -e "s#__MONITOR_HOST__#${MONITOR_HOST}#g" "$TMP_SCRIPT"

  scp -o StrictHostKeyChecking=no "$TMP_SCRIPT" "$REMOTE_HOST":/root/.ingress_update.sh
  rm -f "$TMP_SCRIPT"
  ssh -o StrictHostKeyChecking=no "$REMOTE_HOST" "bash /root/.ingress_update.sh && rm -f /root/.ingress_update.sh"
else
  echo "[5/6] Skipping Cloudflare ingress update (no hostnames provided)."
fi

echo "[6/6] Done. If ingress was updated, check cloudflared logs for route status."

