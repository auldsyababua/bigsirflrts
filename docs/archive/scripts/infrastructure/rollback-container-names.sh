#!/bin/bash
# rollback-container-names.sh
# Story: INFRA-002 - Container Naming Standardization
# Purpose: Rollback container naming changes if issues occur
#
# This script will:
# 1. Stop all containers
# 2. Restore original docker-compose files
# 3. Remove COMPOSE_PROJECT_NAME from .env files
# 4. Restart services
# 5. Revert code changes

set -euo pipefail

# Trap for cleanup on error
trap 'echo "Rollback failed on line $LINENO. Manual intervention may be required."' ERR

echo "========================================="
echo "Container Naming Rollback Script"
echo "========================================="
echo ""

# Color codes for output (check if terminal supports colors)
if [ -t 1 ] && command -v tput >/dev/null 2>&1; then
    RED=$(tput setaf 1)
    GREEN=$(tput setaf 2)
    YELLOW=$(tput setaf 3)
    NC=$(tput sgr0)
else
    RED=''
    GREEN=''
    YELLOW=''
    NC=''
fi

# Confirmation prompt
echo -e "${YELLOW}WARNING: This will rollback all container naming changes!${NC}"
echo "This includes:"
echo "  - Reverting docker-compose files"
echo "  - Removing COMPOSE_PROJECT_NAME from .env files"
echo "  - Reverting test and script file changes"
echo ""
read -p "Are you sure you want to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Rollback cancelled."
    exit 0
fi

echo ""
echo "Starting rollback process..."
echo ""

# Step 1: Stop all containers
echo -e "${YELLOW}Step 1: Stopping all containers...${NC}"
if command -v docker-compose >/dev/null 2>&1; then
    docker-compose down 2>/dev/null || true
    
    # Also stop containers in infrastructure directories
    if [ -f infrastructure/docker/docker-compose.yml ]; then
        (cd infrastructure/docker && docker-compose down 2>/dev/null || true)
    fi
    if [ -f infrastructure/docker/docker-compose.single.yml ]; then
        (cd infrastructure/docker && docker-compose -f docker-compose.single.yml down 2>/dev/null || true)
    fi
else
    echo "docker-compose not found, stopping containers individually..."
    docker stop $(docker ps -aq) 2>/dev/null || true
fi
echo -e "${GREEN}✓ Containers stopped${NC}"

# Step 2: Restore original docker-compose files
echo ""
echo -e "${YELLOW}Step 2: Restoring docker-compose files...${NC}"

# List of docker-compose files to restore
compose_files=(
    "docker-compose.yml"
    "infrastructure/docker/docker-compose.yml"
    "infrastructure/docker/docker-compose.single.yml"
    "infrastructure/docker/docker-compose.monitoring.yml"
    "infrastructure/digitalocean/docker-compose.prod.yml"
    "infrastructure/digitalocean/docker-compose.supabase.yml"
)

for file in "${compose_files[@]}"; do
    if [ -f "$file" ]; then
        echo -n "  Restoring $file... "
        git checkout HEAD -- "$file" 2>/dev/null && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"
    fi
done

# Step 3: Remove COMPOSE_PROJECT_NAME from .env files
echo ""
echo -e "${YELLOW}Step 3: Removing COMPOSE_PROJECT_NAME from .env files...${NC}"

# List of .env files to clean
env_files=(
    ".env"
    "infrastructure/docker/.env"
    "infrastructure/digitalocean/.env.production"
    "tests/.env.test"
)

for env_file in "${env_files[@]}"; do
    if [ -f "$env_file" ]; then
        echo -n "  Cleaning $env_file... "
        # Use sed to remove COMPOSE_PROJECT_NAME line
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS sed requires -i ''
            sed -i '' '/^COMPOSE_PROJECT_NAME=/d' "$env_file" 2>/dev/null && echo -e "${GREEN}✓${NC}" || echo -e "${YELLOW}⚠ Not found or error${NC}"
        else
            # Linux sed
            sed -i '/^COMPOSE_PROJECT_NAME=/d' "$env_file" 2>/dev/null && echo -e "${GREEN}✓${NC}" || echo -e "${YELLOW}⚠ Not found or error${NC}"
        fi
    fi
done

# Step 4: Revert code changes
echo ""
echo -e "${YELLOW}Step 4: Reverting code changes...${NC}"

# Revert test files
test_files=(
    "tests/integration/n8n-operational-resilience.test.ts"
    "tests/integration/container-naming-validation.test.ts"
    "tests/integration/container-naming-validation-improved.test.ts"
)

for file in "${test_files[@]}"; do
    if [ -f "$file" ]; then
        echo -n "  Reverting $file... "
        git checkout HEAD -- "$file" 2>/dev/null && echo -e "${GREEN}✓${NC}" || echo -e "${YELLOW}⚠ No changes or error${NC}"
    fi
done

# Revert shell scripts
script_files=(
    "infrastructure/scripts/run-resilience-tests.sh"
    "infrastructure/scripts/health-check.sh"
    "infrastructure/scripts/validate-container-naming.sh"
    "infrastructure/scripts/validate-container-naming-improved.sh"
)

for file in "${script_files[@]}"; do
    if [ -f "$file" ]; then
        echo -n "  Reverting $file... "
        git checkout HEAD -- "$file" 2>/dev/null && echo -e "${GREEN}✓${NC}" || echo -e "${YELLOW}⚠ No changes or error${NC}"
    fi
done

# Step 5: Restart services (optional)
echo ""
echo -e "${YELLOW}Step 5: Restart services?${NC}"
read -p "Do you want to restart services now? (yes/no): " restart

if [ "$restart" == "yes" ]; then
    echo "Restarting services..."
    if [ -f docker-compose.yml ]; then
        docker-compose up -d
        echo -e "${GREEN}✓ Services restarted${NC}"
    else
        echo -e "${RED}✗ docker-compose.yml not found${NC}"
    fi
else
    echo "Skipping service restart. You can restart manually with: docker-compose up -d"
fi

# Final verification
echo ""
echo "========================================="
echo "Rollback Complete"
echo "========================================="
echo ""
echo "Verification steps:"
echo "1. Check container names: docker ps --format 'table {{.Names}}\t{{.Status}}'"
echo "2. Verify .env files: grep COMPOSE_PROJECT_NAME .env"
echo "3. Test services: docker-compose ps"
echo ""
echo -e "${GREEN}Rollback completed successfully!${NC}"
echo ""
echo "Note: If you had any uncommitted changes before the rollback,"
echo "they may have been lost. Check 'git status' to verify."