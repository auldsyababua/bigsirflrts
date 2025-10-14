#!/bin/bash
# Validate required environment variables before starting OpenProject
# This script ensures all critical secrets are set to prevent boot with empty credentials

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Validating environment variables..."

# Track validation status
VALIDATION_FAILED=0

# Function to check if a variable is set and non-empty
check_required_var() {
    local var_name=$1
    local var_value="${!var_name}"
    
    if [ -z "$var_value" ]; then
        echo -e "${RED}✗ MISSING: ${var_name}${NC}"
        VALIDATION_FAILED=1
        return 1
    else
        echo -e "${GREEN}✓ ${var_name} is set${NC}"
        return 0
    fi
}

# Function to check if a variable contains a placeholder value
check_not_placeholder() {
    local var_name=$1
    local var_value="${!var_name}"
    local placeholder=$2
    
    if [ "$var_value" = "$placeholder" ]; then
        echo -e "${RED}✗ PLACEHOLDER: ${var_name} still contains placeholder value${NC}"
        VALIDATION_FAILED=1
        return 1
    fi
    return 0
}

echo ""
echo "Checking Supabase Database Configuration..."
check_required_var "SUPABASE_DB_USER"
check_required_var "SUPABASE_DB_PASSWORD"
check_not_placeholder "SUPABASE_DB_PASSWORD" "your-supabase-password-here"
check_required_var "SUPABASE_DB_HOST"
check_required_var "SUPABASE_DB_PORT"
check_required_var "SUPABASE_DB_NAME"
check_required_var "SUPABASE_DB_SCHEMA"

echo ""
echo "Checking OpenProject Security Configuration..."
check_required_var "SECRET_KEY_BASE"

# Check SECRET_KEY_BASE length (should be at least 64 characters for security)
if [ -n "$SECRET_KEY_BASE" ]; then
    SECRET_LENGTH=${#SECRET_KEY_BASE}
    if [ $SECRET_LENGTH -lt 64 ]; then
        echo -e "${YELLOW}⚠ WARNING: SECRET_KEY_BASE is only ${SECRET_LENGTH} characters (recommended: 128+)${NC}"
    fi
fi

check_required_var "OPENPROJECT_ADMIN_USERNAME"
check_required_var "OPENPROJECT_ADMIN_PASSWORD"
check_required_var "OPENPROJECT_HOST_NAME"
check_required_var "OPENPROJECT_HTTPS"

echo ""
echo "Checking Cloudflare R2 Storage Configuration..."
check_required_var "R2_ACCESS_KEY_ID"
check_required_var "R2_SECRET_ACCESS_KEY"
check_required_var "R2_ENDPOINT"
check_required_var "R2_BUCKET"

echo ""
echo "Checking Cloudflare Tunnel Configuration..."
check_required_var "CLOUDFLARE_TUNNEL_TOKEN"

# Final validation result
echo ""
if [ $VALIDATION_FAILED -eq 1 ]; then
    echo -e "${RED}❌ Environment validation FAILED${NC}"
    echo ""
    echo "Please ensure all required environment variables are set in your .env file."
    echo "See infrastructure/digitalocean/.env.example for a template."
    echo ""
    exit 1
else
    echo -e "${GREEN}✅ All required environment variables are set${NC}"
    echo ""
fi

