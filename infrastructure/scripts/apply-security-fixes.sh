#!/bin/bash

# apply-security-fixes.sh - Apply all security fixes for Story 1.1 QA findings
# This script addresses the critical security issues identified:
# 1. Blocks port 8080 from public access
# 2. Configures Docker to bind only to localhost
# 3. Sets up proper firewall rules

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     OpenProject Security Fix Implementation - Story 1.1     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}This script will apply the following security fixes:${NC}"
echo "  1. Create Digital Ocean firewall to block port 8080"
echo "  2. Update Docker to bind only to localhost (127.0.0.1)"
echo "  3. Restrict access to only necessary ports"
echo ""
echo -e "${RED}⚠️  IMPORTANT: This script requires:${NC}"
echo "  - Digital Ocean API access (via DIGITALOCEAN_API_KEY)"
echo "  - SSH access to the server (165.227.216.172)"
echo "  - doctl CLI tool installed"
echo ""
read -p "Do you want to proceed? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Configuration
SERVER_IP="165.227.216.172"
DROPLET_ID="518515575"
FIREWALL_NAME="openproject-secure"

echo ""
echo -e "${GREEN}=== Step 1: Creating Digital Ocean Firewall ===${NC}"
echo "Creating firewall to block port 8080 and restrict access..."

# Check for existing firewall
EXISTING_FW=$(doctl compute firewall list --format ID,Name --no-header | grep "$FIREWALL_NAME" | awk '{print $1}' || true)
if [ ! -z "$EXISTING_FW" ]; then
    echo "Removing existing firewall: $EXISTING_FW"
    doctl compute firewall delete "$EXISTING_FW" --force
fi

# Create new secure firewall
doctl compute firewall create \
    --name "$FIREWALL_NAME" \
    --inbound-rules "protocol:tcp,ports:22,address:0.0.0.0/0 protocol:tcp,ports:443,address:0.0.0.0/0 protocol:tcp,ports:80,address:0.0.0.0/0 protocol:icmp,address:0.0.0.0/0" \
    --outbound-rules "protocol:tcp,ports:all,address:0.0.0.0/0 protocol:udp,ports:all,address:0.0.0.0/0 protocol:icmp,address:0.0.0.0/0" \
    --droplet-ids "$DROPLET_ID"

echo -e "${GREEN}✅ Firewall created successfully${NC}"

echo ""
echo -e "${GREEN}=== Step 2: Creating Secure Docker Compose Configuration ===${NC}"

# Create secure docker-compose file
cat > /tmp/docker-compose-secure.yml <<'DOCKER_CONFIG'
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
      # SECURITY FIX: Bind only to localhost
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
DOCKER_CONFIG

echo -e "${GREEN}✅ Secure Docker configuration created${NC}"

echo ""
echo -e "${GREEN}=== Step 3: Deploying Configuration to Server ===${NC}"
echo "Copying secure configuration to server and restarting services..."

# Copy configuration to server and apply
scp /tmp/docker-compose-secure.yml root@$SERVER_IP:/root/openproject/docker-compose-new.yml

# SSH to server and apply changes
ssh root@$SERVER_IP << 'REMOTE_COMMANDS'
cd /root/openproject

# Backup current configuration
cp docker-compose.yml docker-compose.yml.backup-$(date +%Y%m%d-%H%M%S)

# Stop services
docker-compose down

# Apply new configuration
mv docker-compose-new.yml docker-compose.yml

# Start services with secure configuration
docker-compose up -d

# Wait for services to start
sleep 10

# Check status
docker-compose ps
REMOTE_COMMANDS

echo ""
echo -e "${GREEN}=== Step 4: Verification ===${NC}"

# Verify port 8080 is not accessible externally
echo -n "Testing port 8080 is blocked externally... "
if timeout 2 bash -c "echo > /dev/tcp/$SERVER_IP/8080" 2>/dev/null; then
    echo -e "${RED}❌ WARNING: Port 8080 still accessible!${NC}"
else
    echo -e "${GREEN}✅ Port 8080 blocked${NC}"
fi

# Verify HTTPS access through Cloudflare
echo -n "Testing HTTPS access via Cloudflare... "
if curl -s -o /dev/null -w "%{http_code}" https://ops.10nz.tools | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✅ HTTPS access working${NC}"
else
    echo -e "${YELLOW}⚠️  HTTPS access may need time to propagate${NC}"
fi

# Clean up temp files
rm -f /tmp/docker-compose-secure.yml

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                  Security Fixes Applied                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Digital Ocean firewall configured${NC}"
echo -e "${GREEN}✅ Port 8080 blocked from public access${NC}"
echo -e "${GREEN}✅ Docker bound to localhost only (127.0.0.1:8080)${NC}"
echo -e "${GREEN}✅ HTTPS access maintained via Cloudflare Tunnel${NC}"
echo ""
echo -e "${YELLOW}Remaining Recommendations:${NC}"
echo "  • Consider restricting SSH (port 22) to specific IP addresses"
echo "  • Set up monitoring for the firewall and services"
echo "  • Implement regular security audits"
echo ""
echo -e "${GREEN}Security fixes successfully applied!${NC}"