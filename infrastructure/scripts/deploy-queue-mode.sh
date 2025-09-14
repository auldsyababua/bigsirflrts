#!/bin/bash
# deploy-queue-mode.sh
# Deployment script for n8n Queue Mode with Redis and PostgreSQL

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Deploying n8n in Queue Mode"
echo "==========================="

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker required but not installed. Aborting.${NC}" >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo -e "${RED}Docker Compose required but not installed. Aborting.${NC}" >&2; exit 1; }

# Change to infrastructure/docker directory
cd "$(dirname "$0")/../docker" || { echo -e "${RED}Failed to navigate to docker directory${NC}"; exit 1; }

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}No .env file found. Creating from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}Created .env file. Please edit it with your configuration.${NC}"
        echo -e "${YELLOW}Required variables:${NC}"
        echo "  - POSTGRES_USER"
        echo "  - POSTGRES_PASSWORD"
        echo "  - REDIS_PASSWORD"
        echo "  - N8N_ENCRYPTION_KEY (will be generated if not set)"
        echo "  - N8N_HOST"
        echo "  - WEBHOOK_URL"
        exit 1
    else
        echo -e "${RED}.env.example not found. Cannot proceed.${NC}"
        exit 1
    fi
fi

# Source environment variables
source .env

# Generate encryption key if not exists
if [ -z "$N8N_ENCRYPTION_KEY" ]; then
    echo "Generating encryption key..."
    N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)
    echo "N8N_ENCRYPTION_KEY=$N8N_ENCRYPTION_KEY" >> .env
    echo -e "${YELLOW}⚠️  IMPORTANT: Save this encryption key securely!${NC}"
    echo -e "${GREEN}Encryption key: $N8N_ENCRYPTION_KEY${NC}"
fi

# Validate required environment variables
required_vars=("POSTGRES_USER" "POSTGRES_PASSWORD" "REDIS_PASSWORD" "N8N_HOST" "WEBHOOK_URL")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo -e "${RED}Missing required environment variables:${NC}"
    printf '%s\n' "${missing_vars[@]}"
    exit 1
fi

# Start services in order
echo -e "${GREEN}Starting PostgreSQL...${NC}"
docker-compose up -d postgres
echo "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker-compose exec -T postgres pg_isready -U "$POSTGRES_USER" &>/dev/null; then
        echo -e "${GREEN}PostgreSQL is ready!${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

echo -e "${GREEN}Starting Redis...${NC}"
docker-compose up -d redis
echo "Waiting for Redis to be ready..."
for i in {1..10}; do
    if docker-compose exec -T redis redis-cli --pass "$REDIS_PASSWORD" ping &>/dev/null; then
        echo -e "${GREEN}Redis is ready!${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

echo -e "${GREEN}Starting n8n main instance...${NC}"
docker-compose up -d n8n-main
echo "Waiting for n8n main to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:5678/healthz &>/dev/null; then
        echo -e "${GREEN}n8n main is ready!${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

echo -e "${GREEN}Starting workers...${NC}"
docker-compose up -d n8n-worker-1 n8n-worker-2
sleep 5

echo -e "${GREEN}Starting webhook processor...${NC}"
docker-compose up -d n8n-webhook
sleep 5

echo -e "${GREEN}Starting load balancer...${NC}"
docker-compose up -d nginx

echo ""
echo -e "${GREEN}Deployment complete!${NC}"
echo ""

# Run health check if it exists
if [ -f ../scripts/health-check.sh ]; then
    echo "Running health check..."
    sleep 5
    ../scripts/health-check.sh
else
    echo -e "${YELLOW}Health check script not found. Skipping health check.${NC}"
fi

echo ""
echo -e "${GREEN}Access n8n at: https://${N8N_HOST}${NC}"
echo -e "${GREEN}Webhook URL: ${WEBHOOK_URL}${NC}"
echo ""
echo "Monitor services with:"
echo "  docker-compose logs -f n8n-main    # Main instance logs"
echo "  docker-compose logs -f n8n-worker-1 # Worker 1 logs"
echo "  docker-compose logs -f n8n-worker-2 # Worker 2 logs"
echo "  docker-compose logs -f n8n-webhook  # Webhook processor logs"
echo ""
echo -e "${YELLOW}Note: For Enterprise features like worker monitoring in UI, an Enterprise license is required.${NC}"