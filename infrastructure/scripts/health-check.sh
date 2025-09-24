#!/bin/bash
# health-check.sh - LEGACY (DEPRECATED)
# This script targeted n8n queue mode with local Postgres/Redis containers.
# Production runs n8n single-instance and uses Supabase as the only database.
# Retained for historical reference; exits without checks to avoid confusion.

echo "[DEPRECATED] health-check.sh is not applicable (no local Postgres/Redis; Supabase + single-instance n8n)."
exit 0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "n8n Queue Mode Health Check (legacy)"

# Check PostgreSQL
echo -n "PostgreSQL: "
if docker exec bigsirflrts-postgres-1 pg_isready -U n8n &>/dev/null; then
    echo -e "${GREEN}✓ Healthy${NC}"
else
    echo -e "${RED}✗ Down${NC}"
fi

# Check Redis
echo -n "Redis: "
if docker exec bigsirflrts-redis-1 redis-cli --pass ${REDIS_PASSWORD} ping &>/dev/null; then
    echo -e "${GREEN}✓ Healthy${NC}"

    # Check queue length
    QUEUE_LENGTH=$(docker exec bigsirflrts-redis-1 redis-cli --pass ${REDIS_PASSWORD} llen bull:queue:default 2>/dev/null)
    echo "  Queue Length: ${QUEUE_LENGTH:-0} jobs"
else
    echo -e "${RED}✗ Down${NC}"
fi

# Check n8n Main
echo -n "n8n Main: "
if curl -s http://localhost:5678/healthz &>/dev/null; then
    echo -e "${GREEN}✓ Healthy${NC}"
else
    echo -e "${RED}✗ Down${NC}"
fi

# Check Workers
for PORT in 5679 5680; do
    echo -n "Worker (port $PORT): "
    if curl -s http://localhost:$PORT/healthz &>/dev/null; then
        echo -e "${GREEN}✓ Healthy${NC}"
    else
        echo -e "${YELLOW}⚠ Not responding${NC}"
    fi
done

# Check Webhook Processor
echo -n "Webhook Processor: "
if curl -s http://localhost:5681/healthz &>/dev/null; then
    echo -e "${GREEN}✓ Healthy${NC}"
else
    echo -e "${YELLOW}⚠ Not responding${NC}"
fi

# Check metrics endpoint
echo -n "Metrics: "
if curl -s http://localhost:5678/metrics &>/dev/null; then
    echo -e "${GREEN}✓ Available${NC}"
else
    echo -e "${YELLOW}⚠ Not available${NC}"
fi
