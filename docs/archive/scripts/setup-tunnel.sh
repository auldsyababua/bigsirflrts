#!/bin/bash

# Cloudflare Tunnel Setup Script
# This script creates and configures Cloudflare Tunnel for OpenProject

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
TUNNEL_NAME="${TUNNEL_NAME:-openproject-tunnel}"
DOMAIN="${CLOUDFLARE_DOMAIN:-example.com}"
SUBDOMAIN="${OPENPROJECT_SUBDOMAIN:-openproject}"
OPENPROJECT_URL="http://openproject:8080"  # Internal Docker service URL

echo -e "${GREEN}=== Cloudflare Tunnel Setup Script ===${NC}"

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo -e "${YELLOW}cloudflared CLI not found. Installing...${NC}"

    # Detect OS and install cloudflared
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
        sudo dpkg -i cloudflared-linux-amd64.deb
        rm cloudflared-linux-amd64.deb
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install cloudflared
    else
        echo -e "${RED}Unsupported OS. Please install cloudflared manually.${NC}"
        echo "Visit: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation"
        exit 1
    fi
fi

# Login to Cloudflare
echo -e "${YELLOW}Authenticating with Cloudflare...${NC}"
cloudflared tunnel login

# Check if tunnel already exists
echo -e "${GREEN}Checking for existing tunnel...${NC}"
if cloudflared tunnel list | grep -q "${TUNNEL_NAME}"; then
    echo -e "${YELLOW}Tunnel '${TUNNEL_NAME}' already exists${NC}"
    read -p "Do you want to delete and recreate it? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Deleting existing tunnel...${NC}"
        cloudflared tunnel delete "${TUNNEL_NAME}" -f
    else
        echo -e "${GREEN}Using existing tunnel${NC}"
        TUNNEL_ID=$(cloudflared tunnel list | grep "${TUNNEL_NAME}" | awk '{print $1}')
    fi
fi

# Create tunnel if it doesn't exist
if [ -z "$TUNNEL_ID" ]; then
    echo -e "${GREEN}Creating new tunnel: ${TUNNEL_NAME}${NC}"
    cloudflared tunnel create "${TUNNEL_NAME}"
    TUNNEL_ID=$(cloudflared tunnel list | grep "${TUNNEL_NAME}" | awk '{print $1}')
fi

echo -e "${GREEN}Tunnel ID: ${TUNNEL_ID}${NC}"

# Create tunnel configuration file
echo -e "${GREEN}Creating tunnel configuration...${NC}"
cat > config.yml << EOF
tunnel: ${TUNNEL_ID}
credentials-file: /etc/cloudflared/creds.json

ingress:
  # OpenProject main application
  - hostname: ${SUBDOMAIN}.${DOMAIN}
    service: ${OPENPROJECT_URL}
    noTLSVerify: true
    originRequest:
      connectTimeout: 30s
      httpHostHeader: ${SUBDOMAIN}.${DOMAIN}
      # Allow large file uploads
      chunkedEncoding: true
      # WebSocket support for real-time features
      noHappyEyeballs: true

  # Health check endpoint
  - hostname: health.${SUBDOMAIN}.${DOMAIN}
    service: ${OPENPROJECT_URL}/health_checks/all
    noTLSVerify: true

  # Catch-all rule (required)
  - service: http_status:404
EOF

# Create DNS record
echo -e "${GREEN}Creating DNS record for ${SUBDOMAIN}.${DOMAIN}...${NC}"
cloudflared tunnel route dns "${TUNNEL_NAME}" "${SUBDOMAIN}.${DOMAIN}"

# Generate credentials file location
CREDS_FILE="${HOME}/.cloudflared/${TUNNEL_ID}.json"
echo -e "${GREEN}Tunnel credentials saved to: ${CREDS_FILE}${NC}"

# Create Docker run script
echo -e "${GREEN}Creating Docker run script...${NC}"
cat > run-tunnel-docker.sh << EOF
#!/bin/bash

# Run Cloudflare Tunnel in Docker
# This script should be run on the server where OpenProject is deployed

docker run -d \\
  --name cloudflared \\
  --network openproject_network \\
  --restart unless-stopped \\
  -v /etc/cloudflared:/etc/cloudflared \\
  cloudflare/cloudflared:latest \\
  tunnel --config /etc/cloudflared/config.yml run
EOF
chmod +x run-tunnel-docker.sh

# Create docker-compose snippet
echo -e "${GREEN}Creating docker-compose service configuration...${NC}"
cat > tunnel-service.yml << EOF
  # Add this service to your docker-compose.yml
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared
    restart: unless-stopped
    networks:
      - openproject_network
    volumes:
      - /etc/cloudflared:/etc/cloudflared:ro
    command: tunnel --config /etc/cloudflared/config.yml run
    depends_on:
      - openproject
    environment:
      - TUNNEL_METRICS=0.0.0.0:2000
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.125'
EOF

# Create setup instructions
echo -e "${GREEN}Creating server setup instructions...${NC}"
cat > TUNNEL_SETUP.md << EOF
# Cloudflare Tunnel Setup Instructions

## Files to Copy to Server

1. Copy tunnel credentials to server:
   \`\`\`bash
   scp ${CREDS_FILE} root@<server-ip>:/etc/cloudflared/creds.json
   \`\`\`

2. Copy tunnel configuration to server:
   \`\`\`bash
   scp config.yml root@<server-ip>:/etc/cloudflared/config.yml
   \`\`\`

## On the Server

1. Create cloudflared directory:
   \`\`\`bash
   mkdir -p /etc/cloudflared
   \`\`\`

2. Set proper permissions:
   \`\`\`bash
   chmod 600 /etc/cloudflared/creds.json
   chmod 644 /etc/cloudflared/config.yml
   \`\`\`

3. Add the cloudflared service to your docker-compose.yml

4. Start the tunnel:
   \`\`\`bash
   docker-compose up -d cloudflared
   \`\`\`

## Verify Tunnel

1. Check tunnel status:
   \`\`\`bash
   cloudflared tunnel info ${TUNNEL_NAME}
   \`\`\`

2. Check tunnel health:
   \`\`\`bash
   curl https://${SUBDOMAIN}.${DOMAIN}
   \`\`\`

## Tunnel Details

- **Tunnel Name**: ${TUNNEL_NAME}
- **Tunnel ID**: ${TUNNEL_ID}
- **Public URL**: https://${SUBDOMAIN}.${DOMAIN}
- **Internal Service**: ${OPENPROJECT_URL}

## Troubleshooting

- Check logs: \`docker logs cloudflared\`
- Verify DNS: \`nslookup ${SUBDOMAIN}.${DOMAIN}\`
- Test connectivity: \`curl -I https://${SUBDOMAIN}.${DOMAIN}\`
EOF

# Create environment variables template
echo -e "${GREEN}Creating environment template...${NC}"
cat > tunnel.env << EOF
# Cloudflare Tunnel Environment Variables
TUNNEL_NAME=${TUNNEL_NAME}
TUNNEL_ID=${TUNNEL_ID}
CLOUDFLARE_DOMAIN=${DOMAIN}
OPENPROJECT_SUBDOMAIN=${SUBDOMAIN}
OPENPROJECT_PUBLIC_URL=https://${SUBDOMAIN}.${DOMAIN}
EOF

echo -e "${GREEN}=== Tunnel Setup Complete ===${NC}"
echo ""
echo -e "${GREEN}Tunnel successfully created!${NC}"
echo "  Name: ${TUNNEL_NAME}"
echo "  ID: ${TUNNEL_ID}"
echo "  URL: https://${SUBDOMAIN}.${DOMAIN}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the configuration in config.yml"
echo "2. Copy credentials and config to your server (see TUNNEL_SETUP.md)"
echo "3. Add cloudflared service to your docker-compose.yml"
echo "4. Start the tunnel on your server"
echo ""
echo -e "${GREEN}Files created:${NC}"
echo "  - config.yml (tunnel configuration)"
echo "  - tunnel-service.yml (docker-compose snippet)"
echo "  - run-tunnel-docker.sh (standalone Docker run script)"
echo "  - TUNNEL_SETUP.md (setup instructions)"
echo "  - tunnel.env (environment variables)"

# Verify tunnel is ready
echo ""
echo -e "${GREEN}Verifying tunnel configuration...${NC}"
cloudflared tunnel info "${TUNNEL_NAME}"