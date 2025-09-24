#!/bin/bash

# FLRTS Project - Environment Validation Script
# Run this after disaster recovery to ensure everything is properly set up

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}    FLRTS Project - Environment Validator        ${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""

# Track overall status
ERRORS=0
WARNINGS=0

# Function to check status
check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        ERRORS=$((ERRORS + 1))
    fi
}

warn_status() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

echo -e "${BLUE}1. Checking Environment Files...${NC}"
echo "----------------------------------------"

# Check main .env
if [ -f .env ]; then
    check_status 0 "Main .env file exists"
else
    check_status 1 "Main .env file missing"
fi

# Check test env
if [ -f .env.test ]; then
    check_status 0 ".env.test exists"
else
    warn_status ".env.test missing (needed for tests)"
fi

echo ""
echo -e "${BLUE}2. Checking Critical Environment Variables...${NC}"
echo "----------------------------------------"

# Check critical variables directly from file
check_var() {
    local var_name="$1"
    local var_desc="$2"

    # Get value from .env file
    local value=$(grep "^${var_name}=" .env 2>/dev/null | cut -d'=' -f2- | sed 's/^"//;s/"$//')

    if [ -z "$value" ] || [ "$value" = "_REPLACE_ME_" ]; then
        check_status 1 "$var_desc ($var_name)"
    else
        check_status 0 "$var_desc set"
    fi
}

# Check each critical variable
check_var "SUPABASE_URL" "Supabase API URL"
check_var "SUPABASE_ANON_KEY" "Supabase Anonymous Key"
check_var "OPENAI_API_KEY" "OpenAI API Key"
check_var "N8N_WEBHOOK_URL" "n8n Webhook URL"
check_var "TELEGRAM_BOT_TOKEN" "Telegram Bot Token"

echo ""
echo -e "${BLUE}3. Checking Node.js Dependencies...${NC}"
echo "----------------------------------------"

# Check root node_modules
if [ -d "node_modules" ]; then
    count=$(find node_modules -maxdepth 1 -type d | wc -l)
    check_status 0 "Root node_modules exists ($count packages)"
else
    check_status 1 "Root node_modules missing - run: npm install"
fi

# Check package dependencies
packages=(
    "packages/sync-service"
    "packages/nlp-service"
    "monitoring"
    "infrastructure/digitalocean/monitoring"
)

for pkg in "${packages[@]}"; do
    if [ -d "$pkg/node_modules" ]; then
        check_status 0 "$pkg dependencies installed"
    else
        warn_status "$pkg dependencies missing - run: cd $pkg && npm install"
    fi
done

echo ""
echo -e "${BLUE}4. Checking Build Artifacts...${NC}"
echo "----------------------------------------"

# Check for TypeScript compilation
if [ -d "dist" ] || [ -d "build" ]; then
    check_status 0 "Build artifacts exist"
else
    warn_status "No build artifacts found - may need to run: npm run build"
fi

echo ""
echo -e "${BLUE}5. Checking Service Connectivity...${NC}"
echo "----------------------------------------"

# Test Supabase connection
SUPABASE_URL=$(grep "^SUPABASE_URL=" .env 2>/dev/null | cut -d'=' -f2- | sed 's/^"//;s/"$//')
if [ ! -z "$SUPABASE_URL" ] && [ "$SUPABASE_URL" != "_REPLACE_ME_" ]; then
    if curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL/rest/v1/" | grep -q "200\|401"; then
        check_status 0 "Supabase URL is reachable"
    else
        check_status 1 "Cannot reach Supabase URL"
    fi
else
    check_status 1 "Supabase URL not configured"
fi

# Test n8n webhook (if local)
N8N_WEBHOOK_URL=$(grep "^N8N_WEBHOOK_URL=" .env 2>/dev/null | cut -d'=' -f2- | sed 's/^"//;s/"$//')
if [[ "$N8N_WEBHOOK_URL" == *"localhost"* ]] || [[ "$N8N_WEBHOOK_URL" == *"192.168"* ]]; then
    warn_status "n8n webhook is local - ensure n8n is running"
else
    if [ ! -z "$N8N_WEBHOOK_URL" ] && [ "$N8N_WEBHOOK_URL" != "_REPLACE_ME_" ]; then
        check_status 0 "n8n webhook URL configured"
    else
        check_status 1 "n8n webhook URL not configured"
    fi
fi

echo ""
echo -e "${BLUE}6. Checking Script Updates...${NC}"
echo "----------------------------------------"

# Check if scripts reference old env files
if grep -q "\.env\.supabase\|\.env\.telegram" supabase/*.sh 2>/dev/null; then
    check_status 1 "Scripts still reference old .env files"
    echo "  Files needing update:"
    grep -l "\.env\.supabase\|\.env\.telegram" supabase/*.sh 2>/dev/null | sed 's/^/    - /'
else
    check_status 0 "Scripts updated to use main .env"
fi

echo ""
echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}                    SUMMARY                      ${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Environment is ready.${NC}"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Environment is functional with $WARNINGS warnings.${NC}"
else
    echo -e "${RED}❌ Found $ERRORS errors and $WARNINGS warnings.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Fix missing environment variables in .env"
    echo "2. Run: npm install (in root and package directories)"
    echo "3. Update any scripts still using old .env files"
    echo "4. Re-run this validator"
fi

echo ""
echo "For detailed recovery steps, see: DISASTER_RECOVERY.md"

exit $ERRORS