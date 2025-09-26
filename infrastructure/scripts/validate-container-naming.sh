#!/bin/bash

# Container Naming Validation Script
# Story: INFRA-002
# Purpose: Quick validation of container naming standardization

set -e

echo "========================================="
echo "Container Naming Standardization Validator"
echo "========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Tracking variables
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

# Function to check a condition
check() {
    local description="$1"
    local command="$2"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -n "Checking: $description... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Function to warn about something
warn() {
    local description="$1"
    echo -e "${YELLOW}⚠ WARNING: $description${NC}"
    WARNINGS=$((WARNINGS + 1))
}

echo "=== Phase 1: Environment Configuration ==="
echo ""

# Check COMPOSE_PROJECT_NAME in .env files
ENV_FILES=(".env" "infrastructure/docker/.env" "tests/.env.test")

for env_file in "${ENV_FILES[@]}"; do
    if [ -f "$env_file" ]; then
        check "$env_file has COMPOSE_PROJECT_NAME=flrts" \
            "grep -q 'COMPOSE_PROJECT_NAME=flrts' $env_file"
    else
        warn "$env_file does not exist"
    fi
done

# Check for production env file (optional)
if [ -f "infrastructure/digitalocean/.env.production" ]; then
    check ".env.production has COMPOSE_PROJECT_NAME=flrts" \
        "grep -q 'COMPOSE_PROJECT_NAME=flrts' infrastructure/digitalocean/.env.production"
fi

echo ""
echo "=== Phase 2: Docker Compose Configuration ==="
echo ""

# Check docker-compose files for container names
COMPOSE_FILES=("docker-compose.yml" "infrastructure/docker/docker-compose.yml" "infrastructure/docker/docker-compose.single.yml")

for compose_file in "${COMPOSE_FILES[@]}"; do
    if [ -f "$compose_file" ]; then
        # Check if file has container_name entries
        if grep -q "container_name:" "$compose_file" 2>/dev/null; then
            # Check all container names start with flrts-
            if ! grep "container_name:" "$compose_file" | grep -v "flrts-" > /dev/null 2>&1; then
                echo -e "Checking: $compose_file container names... ${GREEN}✓ PASS${NC}"
                PASSED_CHECKS=$((PASSED_CHECKS + 1))
            else
                echo -e "Checking: $compose_file container names... ${RED}✗ FAIL${NC}"
                echo "  Found non-compliant container names:"
                grep "container_name:" "$compose_file" | grep -v "flrts-" | head -5
                FAILED_CHECKS=$((FAILED_CHECKS + 1))
            fi
            TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
        else
            warn "$compose_file has no explicit container_name fields"
        fi
    fi
done

echo ""
echo "=== Phase 3: Code References ==="
echo ""

# Check for bad patterns in test files
echo -n "Checking: No hardcoded docker-*-1 in test files... "
if ! grep -r "docker-.*-1" tests/ --include="*.ts" --include="*.js" 2>/dev/null | grep -v "node_modules" > /dev/null; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "  Found hardcoded references:"
    grep -r "docker-.*-1" tests/ --include="*.ts" --include="*.js" 2>/dev/null | grep -v "node_modules" | head -3
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# Check for bad patterns in shell scripts
echo -n "Checking: No bigsirflrts-* in shell scripts... "
if ! grep -r "bigsirflrts-" infrastructure/scripts/ --include="*.sh" 2>/dev/null > /dev/null; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "  Found bigsirflrts references:"
    grep -r "bigsirflrts-" infrastructure/scripts/ --include="*.sh" 2>/dev/null | head -3
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

echo ""
echo "=== Phase 4: Runtime Validation ==="
echo ""

# Check if Docker is running
if docker info > /dev/null 2>&1; then
    # Check running containers
    RUNNING_CONTAINERS=$(docker ps --format "{{.Names}}" 2>/dev/null || echo "")
    
    if [ -n "$RUNNING_CONTAINERS" ]; then
        echo "Running containers:"
        echo "$RUNNING_CONTAINERS" | while read -r container; do
            if [[ $container == flrts-* ]]; then
                echo -e "  ${GREEN}✓${NC} $container"
            elif [[ $container == docker-* ]]; then
                echo -e "  ${RED}✗${NC} $container (should be flrts-*)"
                FAILED_CHECKS=$((FAILED_CHECKS + 1))
            elif [[ $container == bigsirflrts-* ]]; then
                echo -e "  ${RED}✗${NC} $container (should be flrts-*)"
                FAILED_CHECKS=$((FAILED_CHECKS + 1))
            else
                echo -e "  ${YELLOW}?${NC} $container (non-project container)"
            fi
        done
    else
        warn "No containers currently running"
    fi
else
    warn "Docker is not running or not accessible"
fi

echo ""
echo "=== Phase 5: Additional Checks ==="
echo ""

# Check if container-names.env exists
if [ -f "infrastructure/config/container-names.env" ]; then
    check "container-names.env exists and is valid" \
        "grep -q 'N8N_CONTAINER=\"flrts-n8n\"' infrastructure/config/container-names.env"
else
    warn "infrastructure/config/container-names.env not found"
fi

# Check if rollback script exists
if [ -f "infrastructure/scripts/rollback-container-names.sh" ]; then
    check "Rollback script exists" "test -f infrastructure/scripts/rollback-container-names.sh"
    
    # Check if it's executable
    if [ -x "infrastructure/scripts/rollback-container-names.sh" ]; then
        echo -e "Checking: Rollback script is executable... ${GREEN}✓ PASS${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "Checking: Rollback script is executable... ${YELLOW}⚠ WARNING${NC}"
        warn "Rollback script exists but is not executable"
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
else
    warn "Rollback script not created yet"
fi

echo ""
echo "========================================="
echo "Validation Summary"
echo "========================================="
echo ""
echo -e "Total Checks: $TOTAL_CHECKS"
echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

# Calculate percentage
if [ $TOTAL_CHECKS -gt 0 ]; then
    PERCENTAGE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    echo "Success Rate: $PERCENTAGE%"
    echo ""
fi

# Final status
if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo "Container naming standardization is complete."
    exit 0
elif [ $FAILED_CHECKS -le 2 ]; then
    echo -e "${YELLOW}⚠ Almost there!${NC}"
    echo "A few checks failed. Please review and fix the issues above."
    exit 1
else
    echo -e "${RED}✗ Multiple issues found.${NC}"
    echo "Please address the failures listed above."
    exit 1
fi