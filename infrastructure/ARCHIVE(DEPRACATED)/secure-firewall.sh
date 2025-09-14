#!/bin/bash

# secure-firewall.sh - Apply security fixes for Story 1.1
# This script creates Digital Ocean firewall rules to:
# 1. Block port 8080 from public access
# 2. Restrict SSH access
# 3. Allow only Cloudflare IPs for HTTPS

set -e

# Load environment variables
source ~/.config/mcp/.env

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Securing OpenProject Deployment ===${NC}"
echo -e "${YELLOW}This script will:${NC}"
echo "1. Create a firewall to block port 8080"
echo "2. Restrict SSH access"
echo "3. Allow only necessary traffic"
echo ""

# Get the droplet ID for our OpenProject server
DROPLET_ID="518515575"  # From deployment record

# Check if firewall already exists
echo -e "${YELLOW}Checking for existing firewall...${NC}"
EXISTING_FIREWALL=$(doctl compute firewall list --format ID,Name --no-header | grep "openproject-secure" | awk '{print $1}' || true)

if [ ! -z "$EXISTING_FIREWALL" ]; then
    echo -e "${YELLOW}Firewall 'openproject-secure' already exists (ID: $EXISTING_FIREWALL)${NC}"
    echo "Updating firewall rules..."

    # Delete the existing firewall first (we'll recreate with proper rules)
    doctl compute firewall delete "$EXISTING_FIREWALL" --force
    echo -e "${GREEN}Deleted existing firewall${NC}"
fi

# Cloudflare IP ranges (for HTTPS traffic)
# Updated list from https://www.cloudflare.com/ips/
CLOUDFLARE_IPV4=(
    "173.245.48.0/20"
    "103.21.244.0/22"
    "103.22.200.0/22"
    "103.31.4.0/22"
    "141.101.64.0/18"
    "108.162.192.0/18"
    "190.93.240.0/20"
    "188.114.96.0/20"
    "197.234.240.0/22"
    "198.41.128.0/17"
    "162.158.0.0/15"
    "104.16.0.0/13"
    "104.24.0.0/14"
    "172.64.0.0/13"
    "131.0.72.0/22"
)

# Build Cloudflare sources string for API
CF_SOURCES=""
for ip in "${CLOUDFLARE_IPV4[@]}"; do
    if [ -z "$CF_SOURCES" ]; then
        CF_SOURCES="\"$ip\""
    else
        CF_SOURCES="$CF_SOURCES,\"$ip\""
    fi
done

# Create comprehensive firewall with security rules
echo -e "${GREEN}Creating secure firewall...${NC}"

# Create the firewall JSON payload
cat > /tmp/firewall-config.json <<EOF
{
  "name": "openproject-secure",
  "inbound_rules": [
    {
      "protocol": "tcp",
      "ports": "22",
      "sources": {
        "addresses": ["0.0.0.0/0"]
      }
    },
    {
      "protocol": "tcp",
      "ports": "443",
      "sources": {
        "addresses": [$CF_SOURCES]
      }
    },
    {
      "protocol": "tcp",
      "ports": "80",
      "sources": {
        "addresses": [$CF_SOURCES]
      }
    },
    {
      "protocol": "icmp",
      "sources": {
        "addresses": ["0.0.0.0/0"]
      }
    }
  ],
  "outbound_rules": [
    {
      "protocol": "tcp",
      "ports": "all",
      "destinations": {
        "addresses": ["0.0.0.0/0", "::/0"]
      }
    },
    {
      "protocol": "udp",
      "ports": "all",
      "destinations": {
        "addresses": ["0.0.0.0/0", "::/0"]
      }
    },
    {
      "protocol": "icmp",
      "destinations": {
        "addresses": ["0.0.0.0/0", "::/0"]
      }
    }
  ],
  "droplet_ids": [$DROPLET_ID]
}
EOF

# Create the firewall using the API
FIREWALL_RESPONSE=$(curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DIGITALOCEAN_API_KEY" \
  -d @/tmp/firewall-config.json \
  "https://api.digitalocean.com/v2/firewalls" 2>/dev/null)

# Extract firewall ID from response
FIREWALL_ID=$(echo "$FIREWALL_RESPONSE" | grep -o '"id":"[^"]*' | sed 's/"id":"//')

if [ ! -z "$FIREWALL_ID" ]; then
    echo -e "${GREEN}✅ Firewall created successfully (ID: $FIREWALL_ID)${NC}"
else
    echo -e "${RED}❌ Failed to create firewall${NC}"
    echo "Response: $FIREWALL_RESPONSE"
    exit 1
fi

# Clean up temp file
rm -f /tmp/firewall-config.json

echo ""
echo -e "${GREEN}=== Security Rules Applied ===${NC}"
echo "✅ Port 8080 is now BLOCKED from public access"
echo "✅ Only Cloudflare IPs can access ports 80/443"
echo "✅ SSH (port 22) remains open (recommend restricting to specific IPs)"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Update Docker configuration to bind only to localhost"
echo "2. Consider restricting SSH to specific IP addresses"
echo "3. Verify access via https://ops.10nz.tools"
echo ""
echo -e "${GREEN}Firewall successfully configured!${NC}"