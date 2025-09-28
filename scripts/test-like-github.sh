#!/usr/bin/env bash
set -euo pipefail

# test-like-github.sh
# Run tests EXACTLY as GitHub Actions does to catch all CI failures locally
# This prevents the "fix one error, push, find another" cycle

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

# Color output for clarity
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  GitHub Actions CI Environment Test Runner${NC}"
echo -e "${BLUE}  Mimics exact GitHub Actions environment locally${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Function to print section headers
print_section() {
    echo ""
    echo -e "${YELLOW}▶ $1${NC}"
    echo "────────────────────────────────────────────────"
}

# Function to track failures
FAILED_TESTS=()
TOTAL_FAILURES=0

run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -e "${BLUE}Running:${NC} $test_name"
    if eval "$test_command"; then
        echo -e "${GREEN}✓ PASSED:${NC} $test_name"
        return 0
    else
        echo -e "${RED}✗ FAILED:${NC} $test_name"
        FAILED_TESTS+=("$test_name")
        ((TOTAL_FAILURES++))
        return 1
    fi
}

print_section "Setting GitHub Actions Environment Variables"

# Export all GitHub Actions environment variables
export CI=true
export NODE_ENV=test
export GITHUB_ACTIONS=true
export RUNNER_TYPE=ubuntu-latest

# Load Supabase variables if .env.test exists, otherwise use .env values
if [[ -f .env.test ]]; then
    echo "Loading .env.test for CI environment variables..."
    set -a
    source .env.test
    set +a
else
    echo -e "${YELLOW}Warning: .env.test not found. Using .env values (may cause differences!)${NC}"
    if [[ -f .env ]]; then
        # Extract only the Supabase variables we need
        export SUPABASE_URL=$(grep '^SUPABASE_URL=' .env | cut -d '=' -f2)
        export SUPABASE_ANON_KEY=$(grep '^SUPABASE_ANON_KEY=' .env | cut -d '=' -f2)
        export SUPABASE_SERVICE_ROLE_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env | cut -d '=' -f2)
        export SUPABASE_PROJECT_ID=$(grep '^SUPABASE_PROJECT_ID=' .env | cut -d '=' -f2)
    fi
fi

echo "Environment configured:"
echo "  CI=$CI"
echo "  NODE_ENV=$NODE_ENV"
echo "  GITHUB_ACTIONS=$GITHUB_ACTIONS"
echo "  SUPABASE_URL=${SUPABASE_URL:+[SET]}"
echo "  SUPABASE_PROJECT_ID=${SUPABASE_PROJECT_ID:+[SET]}"

print_section "Dependency Check"

# Ensure dependencies are installed
if [[ ! -d node_modules ]]; then
    echo "Installing dependencies..."
    npm ci || npm install
fi

# Check for required tools
command -v rg >/dev/null 2>&1 || echo -e "${YELLOW}Warning: ripgrep not installed (tests may behave differently)${NC}"

print_section "Running Full Test Suite (No Fail-Fast)"

# Track overall success
ALL_TESTS_PASSED=true

# Run each test component separately to capture ALL failures
echo ""
echo -e "${BLUE}Stage 1: Linting${NC}"
if ! run_test "Lint Check" "npm run -s lint 2>&1"; then
    ALL_TESTS_PASSED=false
fi

echo ""
echo -e "${BLUE}Stage 2: Format Check${NC}"
if ! run_test "Format Check" "npm run -s format:check 2>&1"; then
    ALL_TESTS_PASSED=false
fi

echo ""
echo -e "${BLUE}Stage 3: Unit Tests (@P0)${NC}"
if ! run_test "Unit Tests" "npm run -s test:unit 2>&1"; then
    ALL_TESTS_PASSED=false
fi

echo ""
echo -e "${BLUE}Stage 4: Integration Tests (@P0)${NC}"
if ! run_test "Integration Tests" "npm run -s test:integration 2>&1"; then
    ALL_TESTS_PASSED=false
fi

echo ""
echo -e "${BLUE}Stage 5: E2E Tests (@P0)${NC}"
# E2E tests might fail if services aren't running - note this but don't block
if ! run_test "E2E Tests" "npm run -s test:e2e 2>&1"; then
    ALL_TESTS_PASSED=false
    echo -e "${YELLOW}Note: E2E failures might be due to services not running locally${NC}"
fi

print_section "Test Results Summary"

if [[ ${#FAILED_TESTS[@]} -eq 0 ]]; then
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✓ ALL TESTS PASSED - Safe to push to GitHub!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    exit 0
else
    echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}  ✗ TESTS FAILED - Fix these before pushing!${NC}"
    echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${RED}Failed tests ($TOTAL_FAILURES):${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo -e "  ${RED}✗${NC} $test"
    done
    echo ""
    echo -e "${YELLOW}These failures WILL block your PR on GitHub.${NC}"
    echo -e "${YELLOW}Fix ALL of them before pushing to avoid the push-fail-fix cycle.${NC}"
    exit 1
fi