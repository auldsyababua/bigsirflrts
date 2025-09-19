#!/bin/bash

# Comprehensive Cloudflare Setup Script for OpenProject
# This script automates R2 bucket creation and Tunnel configuration

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default Configuration
PROJECT_NAME="${PROJECT_NAME:-flrts}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# R2 Configuration
R2_BUCKET_NAME="${R2_BUCKET_NAME:-${PROJECT_NAME}-openproject-attachments}"
R2_BUCKET_LOCATION="${R2_BUCKET_LOCATION:-nam}"

# Tunnel Configuration
TUNNEL_NAME="${TUNNEL_NAME:-${PROJECT_NAME}-openproject-tunnel}"
CLOUDFLARE_DOMAIN="${CLOUDFLARE_DOMAIN}"
OPENPROJECT_SUBDOMAIN="${OPENPROJECT_SUBDOMAIN:-openproject}"

# Output directory for generated files
OUTPUT_DIR="./cloudflare-config"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Cloudflare Complete Setup for OpenProject           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"

    local missing_tools=()

    # Check for required tools
    if ! command -v wrangler &> /dev/null; then
        missing_tools+=("wrangler")
    fi

    if ! command -v cloudflared &> /dev/null; then
        missing_tools+=("cloudflared")
    fi

    if ! command -v jq &> /dev/null; then
        missing_tools+=("jq")
    fi

    if [ ${#missing_tools[@]} -gt 0 ]; then
        echo -e "${RED}Missing required tools: ${missing_tools[*]}${NC}"
        echo ""
        echo "Installation instructions:"
        echo "  wrangler: npm install -g wrangler"
        echo "  cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation"
        echo "  jq: brew install jq (macOS) or apt-get install jq (Linux)"
        return 1
    fi

    echo -e "${GREEN}✓ All prerequisites installed${NC}"
    return 0
}

# Function to setup R2
setup_r2() {
    echo ""
    echo -e "${BLUE}=== Setting up Cloudflare R2 ===${NC}"

    # Login to Wrangler if needed
    if ! wrangler whoami &> /dev/null; then
        echo -e "${YELLOW}Logging in to Cloudflare via Wrangler...${NC}"
        wrangler login
    fi

    # Create R2 bucket
    echo -e "${GREEN}Creating R2 bucket: ${R2_BUCKET_NAME}${NC}"
    if wrangler r2 bucket create "${R2_BUCKET_NAME}" --location="${R2_BUCKET_LOCATION}" 2>/dev/null; then
        echo -e "${GREEN}✓ Bucket created successfully${NC}"
    else
        if wrangler r2 bucket list | grep -q "${R2_BUCKET_NAME}"; then
            echo -e "${GREEN}✓ Bucket already exists${NC}"
        else
            echo -e "${RED}✗ Failed to create bucket${NC}"
            return 1
        fi
    fi

    # Create CORS configuration
    cat > "${OUTPUT_DIR}/r2-cors.json" << EOF
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Type", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
EOF

    # Apply CORS rules
    echo -e "${GREEN}Applying CORS rules...${NC}"
    wrangler r2 bucket cors put "${R2_BUCKET_NAME}" --rules "${OUTPUT_DIR}/r2-cors.json"

    # Get account ID
    ACCOUNT_ID=$(wrangler whoami --json | jq -r '.account_id')

    # Generate R2 configuration
    cat > "${OUTPUT_DIR}/r2-config.env" << EOF
# Cloudflare R2 Configuration
R2_BUCKET_NAME=${R2_BUCKET_NAME}
R2_REGION=auto
R2_ENDPOINT=https://${ACCOUNT_ID}.r2.cloudflarestorage.com

# Add these after creating API token in Cloudflare Dashboard:
# R2_ACCESS_KEY_ID=<your-access-key-id>
# R2_SECRET_ACCESS_KEY=<your-secret-access-key>
EOF

    echo -e "${GREEN}✓ R2 setup complete${NC}"
    echo -e "${YELLOW}Note: Create R2 API token at:${NC}"
    echo "  https://dash.cloudflare.com/?to=/:account/r2/api-tokens"
}

# Function to setup Tunnel
setup_tunnel() {
    echo ""
    echo -e "${BLUE}=== Setting up Cloudflare Tunnel ===${NC}"

    if [ -z "$CLOUDFLARE_DOMAIN" ]; then
        read -p "Enter your Cloudflare domain (e.g., example.com): " CLOUDFLARE_DOMAIN
    fi

    # Login to cloudflared if needed
    echo -e "${YELLOW}Authenticating with Cloudflare...${NC}"
    cloudflared tunnel login

    # Check if tunnel exists
    if cloudflared tunnel list | grep -q "${TUNNEL_NAME}"; then
        echo -e "${YELLOW}Tunnel '${TUNNEL_NAME}' already exists${NC}"
        TUNNEL_ID=$(cloudflared tunnel list | grep "${TUNNEL_NAME}" | awk '{print $1}')
    else
        # Create tunnel
        echo -e "${GREEN}Creating tunnel: ${TUNNEL_NAME}${NC}"
        cloudflared tunnel create "${TUNNEL_NAME}"
        TUNNEL_ID=$(cloudflared tunnel list | grep "${TUNNEL_NAME}" | awk '{print $1}')
    fi

    echo -e "${GREEN}Tunnel ID: ${TUNNEL_ID}${NC}"

    # Create tunnel configuration
    cat > "${OUTPUT_DIR}/tunnel-config.yml" << EOF
tunnel: ${TUNNEL_ID}
credentials-file: /etc/cloudflared/creds.json

ingress:
  # OpenProject main application
  - hostname: ${OPENPROJECT_SUBDOMAIN}.${CLOUDFLARE_DOMAIN}
    service: http://openproject:8080
    noTLSVerify: true
    originRequest:
      connectTimeout: 30s
      httpHostHeader: ${OPENPROJECT_SUBDOMAIN}.${CLOUDFLARE_DOMAIN}
      chunkedEncoding: true
      noHappyEyeballs: true

  # Health check endpoint
  - hostname: health-${OPENPROJECT_SUBDOMAIN}.${CLOUDFLARE_DOMAIN}
    service: http://openproject:8080/health_checks/all
    noTLSVerify: true

  # Catch-all rule
  - service: http_status:404
EOF

    # Create DNS record
    echo -e "${GREEN}Creating DNS record...${NC}"
    cloudflared tunnel route dns "${TUNNEL_NAME}" "${OPENPROJECT_SUBDOMAIN}.${CLOUDFLARE_DOMAIN}"

    # Copy credentials file
    CREDS_FILE="${HOME}/.cloudflared/${TUNNEL_ID}.json"
    cp "${CREDS_FILE}" "${OUTPUT_DIR}/tunnel-creds.json"

    # Generate tunnel configuration
    cat > "${OUTPUT_DIR}/tunnel.env" << EOF
# Cloudflare Tunnel Configuration
TUNNEL_NAME=${TUNNEL_NAME}
TUNNEL_ID=${TUNNEL_ID}
CLOUDFLARE_DOMAIN=${CLOUDFLARE_DOMAIN}
OPENPROJECT_SUBDOMAIN=${OPENPROJECT_SUBDOMAIN}
OPENPROJECT_PUBLIC_URL=https://${OPENPROJECT_SUBDOMAIN}.${CLOUDFLARE_DOMAIN}
EOF

    echo -e "${GREEN}✓ Tunnel setup complete${NC}"
    echo "  URL: https://${OPENPROJECT_SUBDOMAIN}.${CLOUDFLARE_DOMAIN}"
}

# Function to generate deployment files
generate_deployment_files() {
    echo ""
    echo -e "${BLUE}=== Generating Deployment Files ===${NC}"

    # Create complete docker-compose overlay
    cat > "${OUTPUT_DIR}/docker-compose.cloudflare.yml" << 'EOF'
# Cloudflare services overlay for docker-compose
# Use with: docker-compose -f docker-compose.supabase.yml -f docker-compose.cloudflare.yml up -d

version: '3.8'

services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared
    restart: unless-stopped
    networks:
      - openproject_network
    volumes:
      - ./cloudflare-config/tunnel-config.yml:/etc/cloudflared/config.yml:ro
      - ./cloudflare-config/tunnel-creds.json:/etc/cloudflared/creds.json:ro
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
    healthcheck:
      test: ["CMD", "cloudflared", "tunnel", "info"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  openproject_network:
    external: true
EOF

    # Create deployment script
    cat > "${OUTPUT_DIR}/deploy-to-server.sh" << 'EOF'
#!/bin/bash

# Deployment script for Cloudflare configuration
# Run this on your local machine to deploy to the server

SERVER_IP="${1}"

if [ -z "$SERVER_IP" ]; then
    echo "Usage: $0 <server-ip>"
    exit 1
fi

echo "Deploying Cloudflare configuration to ${SERVER_IP}..."

# Create directory on server
ssh root@${SERVER_IP} "mkdir -p /root/openproject/cloudflare-config"

# Copy configuration files
scp tunnel-config.yml root@${SERVER_IP}:/root/openproject/cloudflare-config/
scp tunnel-creds.json root@${SERVER_IP}:/root/openproject/cloudflare-config/
scp docker-compose.cloudflare.yml root@${SERVER_IP}:/root/openproject/
scp r2-config.env root@${SERVER_IP}:/root/openproject/
scp tunnel.env root@${SERVER_IP}:/root/openproject/

# Set permissions on server
ssh root@${SERVER_IP} "chmod 600 /root/openproject/cloudflare-config/tunnel-creds.json"

echo "Configuration deployed!"
echo ""
echo "On the server, run:"
echo "  cd /root/openproject"
echo "  docker-compose -f docker-compose.supabase.yml -f docker-compose.cloudflare.yml up -d"
EOF
    chmod +x "${OUTPUT_DIR}/deploy-to-server.sh"

    # Create combined environment file
    cat > "${OUTPUT_DIR}/cloudflare.env" << EOF
# Complete Cloudflare Configuration
# Add this to your .env.production file

# R2 Storage
R2_BUCKET_NAME=${R2_BUCKET_NAME}
R2_REGION=auto
R2_ENDPOINT=https://${ACCOUNT_ID}.r2.cloudflarestorage.com
# R2_ACCESS_KEY_ID=<create-in-dashboard>
# R2_SECRET_ACCESS_KEY=<create-in-dashboard>

# Tunnel
OPENPROJECT_HOST__NAME=${OPENPROJECT_SUBDOMAIN}.${CLOUDFLARE_DOMAIN}
OPENPROJECT_PROTOCOL=https

# OpenProject R2 Configuration
OPENPROJECT_ATTACHMENTS__STORAGE=fog
OPENPROJECT_FOG_PROVIDER=aws
OPENPROJECT_FOG_DIRECTORY=${R2_BUCKET_NAME}
OPENPROJECT_FOG_CREDENTIALS_PROVIDER=AWS
OPENPROJECT_FOG_CREDENTIALS_AWS__ACCESS__KEY__ID=\${R2_ACCESS_KEY_ID}
OPENPROJECT_FOG_CREDENTIALS_AWS__SECRET__ACCESS__KEY=\${R2_SECRET_ACCESS_KEY}
OPENPROJECT_FOG_CREDENTIALS_ENDPOINT=\${R2_ENDPOINT}
OPENPROJECT_FOG_CREDENTIALS_REGION=\${R2_REGION}
OPENPROJECT_FOG_CREDENTIALS_PATH__STYLE=true
EOF

    echo -e "${GREEN}✓ Deployment files generated${NC}"
}

# Function to display summary
display_summary() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    Setup Complete!                      ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Created files in ${OUTPUT_DIR}/:${NC}"
    echo "  • tunnel-config.yml     - Cloudflare Tunnel configuration"
    echo "  • tunnel-creds.json     - Tunnel credentials (keep secure!)"
    echo "  • tunnel.env            - Tunnel environment variables"
    echo "  • r2-config.env         - R2 environment variables"
    echo "  • r2-cors.json          - R2 CORS configuration"
    echo "  • cloudflare.env        - Combined environment variables"
    echo "  • docker-compose.cloudflare.yml - Docker service definition"
    echo "  • deploy-to-server.sh   - Deployment script"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Create R2 API token:"
    echo "   https://dash.cloudflare.com/?to=/:account/r2/api-tokens"
    echo ""
    echo "2. Add API credentials to cloudflare.env"
    echo ""
    echo "3. Deploy to server:"
    echo "   ${OUTPUT_DIR}/deploy-to-server.sh <server-ip>"
    echo ""
    echo "4. Start services on server:"
    echo "   docker-compose -f docker-compose.supabase.yml -f docker-compose.cloudflare.yml up -d"
    echo ""
    echo -e "${GREEN}Public URL:${NC} https://${OPENPROJECT_SUBDOMAIN}.${CLOUDFLARE_DOMAIN}"
    echo -e "${GREEN}R2 Bucket:${NC} ${R2_BUCKET_NAME}"
    echo -e "${GREEN}Tunnel:${NC} ${TUNNEL_NAME} (${TUNNEL_ID})"
}

# Main execution
main() {
    # Check prerequisites
    if ! check_prerequisites; then
        exit 1
    fi

    # Setup R2
    if ! setup_r2; then
        echo -e "${RED}R2 setup failed${NC}"
        exit 1
    fi

    # Setup Tunnel
    if ! setup_tunnel; then
        echo -e "${RED}Tunnel setup failed${NC}"
        exit 1
    fi

    # Generate deployment files
    generate_deployment_files

    # Display summary
    display_summary
}

# Run main function
main "$@"
