#!/bin/bash
# shellcheck disable=SC2086,SC2181

# Container Naming Validation Script (Improved Version)
# Story: INFRA-002
# Purpose: Quick validation of container naming standardization
#
# Improvements:
# - Added error trapping and cleanup
# - Better arithmetic handling
# - Shellcheck compliant
# - More robust file checking

set -euo pipefail

# Trap for cleanup on error
trap 'echo "Error on line $LINENO"' ERR

echo "========================================="
echo "Container Naming Standardization Validator"
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

# Tracking variables with proper initialization
declare -i TOTAL_CHECKS=0
declare -i PASSED_CHECKS=0
declare -i FAILED_CHECKS=0
declare -i WARNINGS=0

# Configuration
readonly PROJECT_NAME="flrts"
readonly CONTAINER_PREFIX="flrts-"

# Function to check a condition
check() {
    local description="$1"
    local command="$2"
    
    ((TOTAL_CHECKS++)) || true
    printf "Checking: %s... " "$description"
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED_CHECKS++)) || true
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAILED_CHECKS++)) || true
        return 1
    fi
}

# Function to warn about something
warn() {
    local description="$1"
    echo -e "${YELLOW}⚠ WARNING: $description${NC}"
    ((WARNINGS++)) || true
}

# Function to check file exists
file_exists() {
    [ -f "$1" ] || [ -L "$1" ]
}

# Function to safely grep files
safe_grep() {
    local pattern="$1"
    local file="$2"
    
    if file_exists "$file"; then
        grep -q "$pattern" "$file" 2>/dev/null
    else
        return 1
    fi
}

echo "=== Phase 1: Environment Configuration ==="
echo ""

# Check COMPOSE_PROJECT_NAME in .env files
declare -a ENV_FILES=(
    ".env"
    "infrastructure/docker/.env"
    "tests/.env.test"
)

for env_file in "${ENV_FILES[@]}"; do
    if file_exists "$env_file"; then
        check "$env_file has COMPOSE_PROJECT_NAME=$PROJECT_NAME" \
            "safe_grep 'COMPOSE_PROJECT_NAME=$PROJECT_NAME' '$env_file'"
    else
        warn "$env_file does not exist"
    fi
done

# Check for production env file (optional)
PROD_ENV="infrastructure/digitalocean/.env.production"
if file_exists "$PROD_ENV"; then
    check ".env.production has COMPOSE_PROJECT_NAME=$PROJECT_NAME" \
        "safe_grep 'COMPOSE_PROJECT_NAME=$PROJECT_NAME' '$PROD_ENV'"
fi

echo ""
echo "=== Phase 2: Docker Compose Configuration ==="
echo ""

# Check docker-compose files for container names
declare -a COMPOSE_FILES=(
    "docker-compose.yml"
    "infrastructure/docker/docker-compose.yml"
    "infrastructure/docker/docker-compose.single.yml"
)

for compose_file in "${COMPOSE_FILES[@]}"; do
    if file_exists "$compose_file"; then
        # Check if file has container_name entries
        if grep -q "container_name:" "$compose_file" 2>/dev/null; then
            # Check all container names start with flrts-
            if ! grep "container_name:" "$compose_file" 2>/dev/null | grep -v "$CONTAINER_PREFIX" > /dev/null 2>&1; then
                echo -e "Checking: $compose_file container names... ${GREEN}✓ PASS${NC}"
                ((PASSED_CHECKS++)) || true
            else
                echo -e "Checking: $compose_file container names... ${RED}✗ FAIL${NC}"
                echo "  Found non-compliant container names:"
                grep "container_name:" "$compose_file" 2>/dev/null | grep -v "$CONTAINER_PREFIX" | head -5 || true
                ((FAILED_CHECKS++)) || true
            fi
            ((TOTAL_CHECKS++)) || true
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
if ! find tests/ -name "*.ts" -o -name "*.js" 2>/dev/null | \
     xargs grep -l "docker-.*-1" 2>/dev/null | \
     grep -v "node_modules" > /dev/null; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED_CHECKS++)) || true
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "  Found hardcoded references in:"
    find tests/ -name "*.ts" -o -name "*.js" 2>/dev/null | \
        xargs grep -l "docker-.*-1" 2>/dev/null | \
        grep -v "node_modules" | head -3 || true
    ((FAILED_CHECKS++)) || true
fi
((TOTAL_CHECKS++)) || true

# Check for bad patterns in shell scripts
echo -n "Checking: No bigsirflrts-* in shell scripts... "
SCRIPTS_DIR="infrastructure/scripts"
if [ -d "$SCRIPTS_DIR" ]; then
    if ! find "$SCRIPTS_DIR" -name "*.sh" -exec grep -l "bigsirflrts-" {} \; 2>/dev/null | head -1 | grep -q .; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED_CHECKS++)) || true
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "  Found bigsirflrts references in:"
        find "$SCRIPTS_DIR" -name "*.sh" -exec grep -l "bigsirflrts-" {} \; 2>/dev/null | head -3 || true
        ((FAILED_CHECKS++)) || true
    fi
else
    warn "Scripts directory not found"
fi
((TOTAL_CHECKS++)) || true

echo ""
echo "=== Phase 4: Runtime Validation ==="
echo ""

# Check if Docker is running
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    # Check running containers
    RUNNING_CONTAINERS=$(docker ps --format "{{.Names}}" 2>/dev/null || echo "")
    
    if [ -n "$RUNNING_CONTAINERS" ]; then
        echo "Running containers:"
        while IFS= read -r container; do
            if [[ $container == ${CONTAINER_PREFIX}* ]]; then
                echo -e "  ${GREEN}✓${NC} $container"
            elif [[ $container == docker-* ]]; then
                echo -e "  ${RED}✗${NC} $container (should be ${CONTAINER_PREFIX}*)"
                ((FAILED_CHECKS++)) || true
            elif [[ $container == bigsirflrts-* ]]; then
                echo -e "  ${RED}✗${NC} $container (should be ${CONTAINER_PREFIX}*)"
                ((FAILED_CHECKS++)) || true
            else
                echo -e "  ${YELLOW}?${NC} $container (non-project container)"
            fi
        done <<< "$RUNNING_CONTAINERS"
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
CONTAINER_ENV="infrastructure/config/container-names.env"
if file_exists "$CONTAINER_ENV"; then
    check "container-names.env exists and is valid" \
        "safe_grep 'N8N_CONTAINER=\"${CONTAINER_PREFIX}n8n\"' '$CONTAINER_ENV'"
else
    warn "$CONTAINER_ENV not found"
fi

# Check if rollback script exists
ROLLBACK_SCRIPT="infrastructure/scripts/rollback-container-names.sh"
if file_exists "$ROLLBACK_SCRIPT"; then
    check "Rollback script exists" "test -f '$ROLLBACK_SCRIPT'"
    
    # Check if it's executable
    if [ -x "$ROLLBACK_SCRIPT" ]; then
        echo -e "Checking: Rollback script is executable... ${GREEN}✓ PASS${NC}"
        ((PASSED_CHECKS++)) || true
    else
        echo -e "Checking: Rollback script is executable... ${YELLOW}⚠ WARNING${NC}"
        warn "Rollback script exists but is not executable"
    fi
    ((TOTAL_CHECKS++)) || true
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

# Calculate percentage (handle division by zero)
if [ "$TOTAL_CHECKS" -gt 0 ]; then
    PERCENTAGE=$(( (PASSED_CHECKS * 100) / TOTAL_CHECKS ))
    echo "Success Rate: ${PERCENTAGE}%"
    echo ""
fi

# Final status
if [ "$FAILED_CHECKS" -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo "Container naming standardization is complete."
    exit 0
elif [ "$FAILED_CHECKS" -le 2 ]; then
    echo -e "${YELLOW}⚠ Almost there!${NC}"
    echo "A few checks failed. Please review and fix the issues above."
    exit 1
else
    echo -e "${RED}✗ Multiple issues found.${NC}"
    echo "Please address the failures listed above."
    exit 1
fi