#!/bin/bash

# Setup Cloudflare Tunnel for Monitoring Services
# Extends existing OpenProject tunnel with monitoring endpoints

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CLOUDFLARE_DOMAIN="${CLOUDFLARE_DOMAIN}"
TUNNEL_NAME="${TUNNEL_NAME:-flrts-openproject-tunnel}"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Adding Monitoring Services to Cloudflare Tunnel     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ -z "$CLOUDFLARE_DOMAIN" ]; then
    read -p "Enter your Cloudflare domain (e.g., 10nz.tools): " CLOUDFLARE_DOMAIN
fi

# Get existing tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep "${TUNNEL_NAME}" | awk '{print $1}')

if [ -z "$TUNNEL_ID" ]; then
    echo -e "${RED}Error: Tunnel '${TUNNEL_NAME}' not found${NC}"
    echo "Please run the main OpenProject setup first"
    exit 1
fi

echo -e "${GREEN}Found existing tunnel: ${TUNNEL_NAME} (${TUNNEL_ID})${NC}"

# Create DNS records for monitoring services
echo -e "${YELLOW}Creating DNS records for monitoring services...${NC}"

cloudflared tunnel route dns "${TUNNEL_NAME}" "prometheus.monitoring.${CLOUDFLARE_DOMAIN}"
cloudflared tunnel route dns "${TUNNEL_NAME}" "grafana.monitoring.${CLOUDFLARE_DOMAIN}"
cloudflared tunnel route dns "${TUNNEL_NAME}" "jaeger.monitoring.${CLOUDFLARE_DOMAIN}"
cloudflared tunnel route dns "${TUNNEL_NAME}" "n8n-monitor.monitoring.${CLOUDFLARE_DOMAIN}"

echo -e "${GREEN}✓ DNS records created${NC}"

# Generate updated tunnel configuration
echo -e "${YELLOW}Generating updated tunnel configuration...${NC}"

cat > "cloudflare-monitoring-config.yml" << EOF
tunnel: ${TUNNEL_ID}
credentials-file: /etc/cloudflared/creds.json

ingress:
  # OpenProject main application (existing)
  - hostname: openproject.${CLOUDFLARE_DOMAIN}
    service: http://openproject:8080
    noTLSVerify: true
    originRequest:
      connectTimeout: 30s
      httpHostHeader: openproject.${CLOUDFLARE_DOMAIN}
      chunkedEncoding: true
      noHappyEyeballs: true

  # Monitoring Services (new)
  - hostname: prometheus.monitoring.${CLOUDFLARE_DOMAIN}
    service: http://prometheus:9090
    noTLSVerify: true
    originRequest:
      connectTimeout: 15s
      httpHostHeader: prometheus.monitoring.${CLOUDFLARE_DOMAIN}

  - hostname: grafana.monitoring.${CLOUDFLARE_DOMAIN}
    service: http://grafana:3000
    noTLSVerify: true
    originRequest:
      connectTimeout: 30s
      httpHostHeader: grafana.monitoring.${CLOUDFLARE_DOMAIN}

  - hostname: jaeger.monitoring.${CLOUDFLARE_DOMAIN}
    service: http://jaeger:16686
    noTLSVerify: true
    originRequest:
      connectTimeout: 15s
      httpHostHeader: jaeger.monitoring.${CLOUDFLARE_DOMAIN}

  - hostname: n8n-monitor.monitoring.${CLOUDFLARE_DOMAIN}
    service: http://n8n-monitor:3002
    noTLSVerify: true
    originRequest:
      connectTimeout: 15s
      httpHostHeader: n8n-monitor.monitoring.${CLOUDFLARE_DOMAIN}

  # Health check endpoint (existing)
  - hostname: health-openproject.${CLOUDFLARE_DOMAIN}
    service: http://openproject:8080/health_checks/all
    noTLSVerify: true

  # Catch-all rule
  - service: http_status:404
EOF

echo -e "${GREEN}✓ Updated tunnel configuration generated${NC}"

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Setup Complete!                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Monitoring Services URLs:${NC}"
echo "  • Prometheus: https://prometheus.monitoring.${CLOUDFLARE_DOMAIN}"
echo "  • Grafana:    https://grafana.monitoring.${CLOUDFLARE_DOMAIN}"
echo "  • Jaeger:     https://jaeger.monitoring.${CLOUDFLARE_DOMAIN}"
echo "  • n8n Monitor: https://n8n-monitor.monitoring.${CLOUDFLARE_DOMAIN}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Deploy the updated tunnel configuration to your server"
echo "2. Replace the existing tunnel config file"
echo "3. Restart cloudflared service"
echo ""
echo -e "${YELLOW}Commands for server deployment:${NC}"
echo "  scp cloudflare-monitoring-config.yml root@165.227.216.172:/root/openproject/cloudflare-config/tunnel-config.yml"
echo "  ssh root@165.227.216.172 'cd /root/openproject && docker-compose restart cloudflared'"