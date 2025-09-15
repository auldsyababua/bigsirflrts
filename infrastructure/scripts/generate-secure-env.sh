#!/bin/bash
# generate-secure-env.sh
# Generates secure environment values for n8n queue mode production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}n8n Queue Mode - Secure Environment Generator${NC}"
echo "============================================="
echo ""

# Check for required commands
command -v openssl >/dev/null 2>&1 || { echo -e "${RED}Error: openssl is required but not installed.${NC}" >&2; exit 1; }

# Function to generate secure password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Function to generate encryption key
generate_encryption_key() {
    openssl rand -hex 32
}

# Backup existing .env if it exists
if [ -f "../docker/.env" ]; then
    echo -e "${YELLOW}Backing up existing .env to .env.backup...${NC}"
    cp ../docker/.env ../docker/.env.backup.$(date +%Y%m%d_%H%M%S)
fi

# Generate secure values
echo -e "${GREEN}Generating secure values...${NC}"
POSTGRES_PASSWORD=$(generate_password)
REDIS_PASSWORD=$(generate_password)
N8N_ENCRYPTION_KEY=$(generate_encryption_key)

# Create .env file from production template
echo -e "${GREEN}Creating .env file...${NC}"
cat > ../docker/.env << EOF
# n8n Queue Mode Production Configuration
# Generated: $(date -Iseconds)
#
# WARNING: This file contains sensitive credentials
# - Store a backup in your password manager
# - Never commit this file to version control
# - Rotate these values quarterly

# Database Configuration
POSTGRES_USER=n8n_prod
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_HOST=postgres

# Redis Configuration
REDIS_PASSWORD=${REDIS_PASSWORD}

# n8n Encryption Configuration
# CRITICAL: Back up this key! If lost, all stored credentials become unusable.
N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}

# n8n Host Configuration
N8N_HOST=n8n.10nz.tools
WEBHOOK_URL=https://n8n.10nz.tools

# Performance Tuning (optimized for 10-user scale)
WORKER_CONCURRENCY=5
MAX_WORKERS=1

# Resource Limits
POSTGRES_MAX_CONNECTIONS=50
REDIS_MAX_MEMORY=128mb
N8N_PAYLOAD_SIZE_MAX=16

# Session Configuration
N8N_SESSION_TIMEOUT=168
N8N_USER_MANAGEMENT_JWT_DURATION=168h

# Execution Pruning
EXECUTIONS_DATA_PRUNE=true
EXECUTIONS_DATA_MAX_AGE=336
EXECUTIONS_DATA_PRUNE_TIMEOUT=3600
EOF

# Display summary
echo ""
echo -e "${GREEN}✅ Secure environment file generated successfully!${NC}"
echo ""
echo "Generated Credentials (save these securely):"
echo "============================================="
echo -e "${BLUE}PostgreSQL Password:${NC} ${POSTGRES_PASSWORD}"
echo -e "${BLUE}Redis Password:${NC} ${REDIS_PASSWORD}"
echo -e "${BLUE}n8n Encryption Key:${NC} ${N8N_ENCRYPTION_KEY}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT NEXT STEPS:${NC}"
echo "1. Save these credentials in your password manager (1Password, etc.)"
echo "2. The .env file has been created at: ../docker/.env"
echo "3. Set appropriate file permissions: chmod 600 ../docker/.env"
echo "4. Never commit the .env file to git (it should be in .gitignore)"
echo ""
echo -e "${GREEN}For single-instance deployment (recommended for 10 users):${NC}"
echo "Consider using ../docker/docker-compose.single.yml instead"
echo ""

# Set secure permissions
chmod 600 ../docker/.env
echo -e "${GREEN}✅ File permissions set to 600 (owner read/write only)${NC}"

# Offer to display the location
echo ""
echo -e "${BLUE}Environment file location:${NC} $(pwd)/../docker/.env"

# Check if .gitignore includes .env
if ! grep -q "^\.env$" ../docker/.gitignore 2>/dev/null; then
    echo ".env" >> ../docker/.gitignore
    echo -e "${GREEN}✅ Added .env to .gitignore${NC}"
fi