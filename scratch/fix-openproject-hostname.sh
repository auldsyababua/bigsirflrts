#!/bin/bash

# Fix OpenProject hostname configuration issue
# This script updates the OpenProject configuration to properly handle the host_name

echo "========================================="
echo "OpenProject Host Name Configuration Fix"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}This script will help fix the 'Invalid host_name configuration' error${NC}"
echo ""

# Step 1: Check current configuration
echo -e "${GREEN}Step 1: Current OpenProject Configuration${NC}"
echo "Please SSH into your DigitalOcean VM at: 165.227.216.172"
echo ""
echo "Run these commands on the VM:"
echo ""

cat << 'EOF'
# 1. Navigate to OpenProject directory
cd /opt/openproject

# 2. Check current docker-compose.yml configuration
echo "Current OPENPROJECT_HOST__NAME setting:"
grep -A2 "OPENPROJECT_HOST__NAME" docker-compose.yml

# 3. Check if environment file exists and contains host configuration
if [ -f .env ]; then
    echo "Environment file settings:"
    grep -E "OPENPROJECT_HOST|HOST_NAME" .env
fi

# 4. Check container environment
echo "Current container environment:"
docker exec openproject env | grep -E "OPENPROJECT_HOST|HOST_NAME"

EOF

echo ""
echo -e "${GREEN}Step 2: Fix Configuration${NC}"
echo "Create or update the docker-compose.yml with proper settings:"
echo ""

cat << 'EOF'
# Create backup first
cp docker-compose.yml docker-compose.yml.backup

# Update docker-compose.yml with proper host configuration
# Use sed to update the OPENPROJECT_HOST__NAME line
sed -i 's/OPENPROJECT_HOST__NAME:.*/OPENPROJECT_HOST__NAME: "ops.10nz.tools"/' docker-compose.yml

# Also ensure these environment variables are set:
cat >> docker-compose.yml << 'DOCKER_ENV'
      # Ensure proper host configuration
      OPENPROJECT_HOST__NAME: "ops.10nz.tools"
      OPENPROJECT_HTTPS: "true"
      OPENPROJECT_HSTS: "true"
      OPENPROJECT_PROTOCOL: "https"
      # Allow access from Cloudflare tunnel
      OPENPROJECT_RAILS__RELATIVE__URL__ROOT: ""
      # Disable host name validation if needed (temporary fix)
      # OPENPROJECT_HOST__NAME__VALIDATE: "false"
DOCKER_ENV

EOF

echo ""
echo -e "${GREEN}Step 3: Alternative Quick Fix (if above doesn't work)${NC}"
echo "If the issue persists, you can temporarily disable host validation:"
echo ""

cat << 'EOF'
# Add this to your docker-compose.yml environment section:
docker exec openproject bash -c "echo 'export OPENPROJECT_HOST__NAME=ops.10nz.tools' >> /app/.env"
docker exec openproject bash -c "echo 'export OPENPROJECT_HOST__NAME__VALIDATE=false' >> /app/.env"

# Or update the configuration directly:
docker exec openproject bundle exec rails runner "
  Setting.host_name = 'ops.10nz.tools'
  Setting.protocol = 'https'
  puts 'Host configuration updated'
"

EOF

echo ""
echo -e "${GREEN}Step 4: Restart OpenProject${NC}"
echo "After making changes, restart the container:"
echo ""

cat << 'EOF'
# Restart OpenProject container
docker-compose down
docker-compose up -d

# Wait for it to be healthy
echo "Waiting for OpenProject to be healthy..."
for i in {1..30}; do
    if docker exec openproject curl -f http://localhost:80/health_checks/default > /dev/null 2>&1; then
        echo "OpenProject is healthy!"
        break
    fi
    echo -n "."
    sleep 2
done

# Check logs for any errors
docker logs openproject --tail 50 | grep -i "host\|error"

EOF

echo ""
echo -e "${GREEN}Step 5: Verify Cloudflare Tunnel${NC}"
echo "Ensure your Cloudflare tunnel is configured correctly:"
echo ""

cat << 'EOF'
# Check if cloudflared is running
ps aux | grep cloudflared

# Check tunnel configuration (usually in /etc/cloudflared/config.yml)
cat /etc/cloudflared/config.yml

# The tunnel should have an ingress rule like:
# ingress:
#   - hostname: ops.10nz.tools
#     service: http://localhost:8080
#   - service: http_status:404

# If using docker for cloudflared:
docker ps | grep cloudflare

EOF

echo ""
echo -e "${YELLOW}Step 6: Direct Database Fix (Last Resort)${NC}"
echo "If all else fails, update the database directly:"
echo ""

cat << 'EOF'
# Connect to PostgreSQL and update settings
docker exec -it openproject-db psql -U openproject -d openproject -c "
  UPDATE settings
  SET value = '--- ops.10nz.tools'
  WHERE name = 'host_name';
"

# Also check protocol setting
docker exec -it openproject-db psql -U openproject -d openproject -c "
  UPDATE settings
  SET value = '--- https'
  WHERE name = 'protocol';
"

# Clear Rails cache
docker exec openproject bundle exec rails tmp:cache:clear

EOF

echo ""
echo -e "${RED}Important Notes:${NC}"
echo "1. The OPENPROJECT_HOST__NAME must match your Cloudflare tunnel hostname exactly"
echo "2. Ensure Cloudflare tunnel is pointing to localhost:8080 (or the correct port)"
echo "3. OpenProject must be configured with HTTPS=true when behind Cloudflare"
echo "4. Check that your DNS for ops.10nz.tools points to your Cloudflare tunnel"
echo ""
echo "After running these fixes, test by visiting: https://ops.10nz.tools"