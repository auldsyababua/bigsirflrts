#!/bin/bash

# secure-docker-binding.sh - Update Docker to bind only to localhost
# This prevents direct access to port 8080 from the internet

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Securing Docker Port Binding ===${NC}"
echo -e "${YELLOW}This script will update Docker Compose to bind services only to localhost${NC}"
echo ""

# Create updated Docker Compose configuration
cat > /tmp/docker-compose-secure.yml <<'EOF'
version: '3.8'

services:
  openproject:
    image: openproject/openproject:14
    container_name: openproject
    hostname: openproject
    environment:
      OPENPROJECT_SECRET_KEY_BASE: ${OPENPROJECT_SECRET_KEY_BASE}
      OPENPROJECT_HOST__NAME: ops.10nz.tools
      OPENPROJECT_HTTPS: "true"
      OPENPROJECT_HSTS: "true"
      RAILS_CACHE_STORE: "memcache"
      OPENPROJECT_CACHE__MEMCACHE__SERVER: "openproject-cache:11211"
      OPENPROJECT_RAILS__RELATIVE__URL__ROOT: ""
      DATABASE_URL: "postgresql://openproject:${POSTGRES_PASSWORD}@openproject-db/openproject?pool=20&encoding=unicode&reconnect=true"
      RAILS_MIN_THREADS: 4
      RAILS_MAX_THREADS: 16
      IMAP_ENABLED: "false"
    ports:
      # CRITICAL SECURITY FIX: Bind only to localhost, not 0.0.0.0
      - "127.0.0.1:8080:80"
    volumes:
      - openproject-data:/var/openproject/assets
      - openproject-logs:/var/log/openproject
    depends_on:
      - openproject-db
      - openproject-cache
    networks:
      - openproject-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/health_checks/default"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  openproject-db:
    image: postgres:16-alpine
    container_name: openproject-db
    environment:
      POSTGRES_USER: openproject
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: openproject
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=C"
    volumes:
      - openproject-db-data:/var/lib/postgresql/data
    networks:
      - openproject-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U openproject"]
      interval: 30s
      timeout: 10s
      retries: 5

  openproject-cache:
    image: memcached:alpine
    container_name: openproject-cache
    networks:
      - openproject-network
    restart: unless-stopped

  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared
    command: tunnel --no-autoupdate run --token ${CLOUDFLARE_TUNNEL_TOKEN}
    networks:
      - openproject-network
    restart: unless-stopped
    depends_on:
      - openproject

volumes:
  openproject-data:
    driver: local
  openproject-db-data:
    driver: local
  openproject-logs:
    driver: local

networks:
  openproject-network:
    driver: bridge
EOF

echo -e "${GREEN}Created secure Docker Compose configuration${NC}"
echo ""
echo -e "${YELLOW}To apply this configuration on the server:${NC}"
echo ""
echo "1. SSH into the server:"
echo "   ssh root@165.227.216.172"
echo ""
echo "2. Stop the current containers:"
echo "   cd /root/openproject"
echo "   docker-compose down"
echo ""
echo "3. Backup the current configuration:"
echo "   cp docker-compose.yml docker-compose.yml.backup"
echo ""
echo "4. Copy this secure configuration to the server"
echo "5. Start with the secure configuration:"
echo "   docker-compose up -d"
echo ""
echo -e "${GREEN}=== Key Security Changes ===${NC}"
echo "✅ OpenProject now binds to 127.0.0.1:8080 (localhost only)"
echo "✅ External access only possible through Cloudflare Tunnel"
echo "✅ Direct port 8080 access blocked even without firewall"
echo ""
echo -e "${YELLOW}Note:${NC} This configuration file is saved at: /tmp/docker-compose-secure.yml"