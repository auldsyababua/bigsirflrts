#!/usr/bin/env bash
set -euo pipefail

# validate-test-env.sh
# Validates that the test environment matches CI requirements
# Shows which tests will run vs be skipped based on current environment

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Test Environment Validator${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Track validation results
WARNINGS=0
ERRORS=0

check_env() {
    local var_name=$1
    local expected_value=$2
    local actual_value=${!var_name:-"<not set>"}
    
    if [[ "$actual_value" == "$expected_value" ]]; then
        echo -e "  ${GREEN}✓${NC} $var_name = $actual_value"
        return 0
    else
        echo -e "  ${RED}✗${NC} $var_name = $actual_value ${RED}(expected: $expected_value)${NC}"
        ((ERRORS++))
        return 1
    fi
}

check_env_exists() {
    local var_name=$1
    local actual_value=${!var_name:-""}
    
    if [[ -n "$actual_value" && "$actual_value" != "_REPLACE_ME_" ]]; then
        echo -e "  ${GREEN}✓${NC} $var_name is set"
        return 0
    else
        echo -e "  ${YELLOW}⚠${NC} $var_name is not properly configured"
        ((WARNINGS++))
        return 1
    fi
}

echo -e "${CYAN}Current Environment Mode:${NC}"
if [[ "${CI:-false}" == "true" ]]; then
    echo -e "  Running in ${GREEN}CI MODE${NC}"
else
    echo -e "  Running in ${YELLOW}DEVELOPMENT MODE${NC}"
fi
echo ""

echo -e "${CYAN}Critical CI Environment Variables:${NC}"
check_env "CI" "true"
check_env "NODE_ENV" "test"
check_env "GITHUB_ACTIONS" "true"
echo ""

echo -e "${CYAN}Supabase Configuration:${NC}"
check_env_exists "SUPABASE_URL"
check_env_exists "SUPABASE_ANON_KEY"
check_env_exists "SUPABASE_SERVICE_ROLE_KEY"
check_env_exists "SUPABASE_PROJECT_ID"
echo ""

echo -e "${CYAN}Test Behavior Analysis:${NC}"

# Analyze which tests will skip based on environment
echo -e "\n${BLUE}Tests affected by CI environment:${NC}"

# Check database monitoring test
echo -e "\n  ${CYAN}database-monitoring.test.ts:${NC}"
if [[ "${CI:-false}" == "true" ]]; then
    if [[ -n "${TEST_DATABASE_URL:-}" && "${TEST_DATABASE_URL:-}" != "_REPLACE_ME_" ]] || \
       [[ -n "${DATABASE_URL:-}" && "${DATABASE_URL:-}" != "_REPLACE_ME_" ]]; then
        echo -e "    Will ${GREEN}RUN${NC} - Database URL configured"
    else
        echo -e "    Will ${YELLOW}SKIP${NC} - No database URL in CI mode"
        echo -e "    ${YELLOW}Note: This test requires direct DB access, not Supabase API keys${NC}"
    fi
else
    echo -e "    Will ${GREEN}RUN${NC} - Development mode allows fallback database"
fi

# Check for other CI-dependent tests
for test_file in tests/integration/*.test.ts tests/e2e/*.test.ts; do
    if [[ -f "$test_file" ]]; then
        if grep -q "process.env.CI\|process.env.GITHUB_ACTIONS\|skipIf" "$test_file" 2>/dev/null; then
            basename_file=$(basename "$test_file")
            echo -e "\n  ${CYAN}$basename_file:${NC}"
            echo -e "    ${YELLOW}Has environment-dependent behavior${NC}"
        fi
    fi
done

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

if [[ $ERRORS -gt 0 ]]; then
    echo -e "${RED}✗ Environment does NOT match GitHub Actions CI${NC}"
    echo -e "${RED}  Tests will behave differently than in CI!${NC}"
    echo ""
    echo -e "${YELLOW}To fix this, either:${NC}"
    echo -e "  1. Run: ${CYAN}./scripts/test-like-github.sh${NC}"
    echo -e "  2. Create ${CYAN}.env.test${NC} with CI=true and NODE_ENV=test"
    echo -e "  3. Set environment variables manually before testing"
    exit 1
elif [[ $WARNINGS -gt 0 ]]; then
    echo -e "${YELLOW}⚠ Environment partially matches CI (some warnings)${NC}"
    echo -e "${YELLOW}  Some tests may be skipped or behave differently${NC}"
    exit 0
else
    echo -e "${GREEN}✓ Environment matches GitHub Actions CI perfectly!${NC}"
    echo -e "${GREEN}  Tests will run exactly as they do on GitHub${NC}"
    exit 0
fi