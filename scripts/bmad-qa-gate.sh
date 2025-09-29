#!/bin/bash
# Universal QA Gate Script for GitHub Actions
# Adapted from bigsirflrts project - ensures consistent CI/CD across projects

set -e

echo "🔍 Starting QA Gate Validation..."
echo "=================================="
echo ""

# Load test environment variables to properly skip E2E tests
if [[ -f .env.test ]]; then
    set -a
    source .env.test
    set +a
    echo "✅ Loaded .env.test (CI=$CI, ENABLE_E2E_TESTS=${ENABLE_E2E_TESTS:-not set})"
else
    echo "⚠️  No .env.test found - tests may not skip properly in CI"
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Track failures
FAILURES=0
WARNINGS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to report errors
report_error() {
    echo -e "${RED}❌ $1${NC}"
    FAILURES=$((FAILURES + 1))
}

# Function to report warnings
report_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

# Function to report success
report_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

echo "1️⃣  Checking development environment..."
echo "----------------------------------------"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node -v)
    report_success "Node.js installed: $NODE_VERSION"
else
    report_error "Node.js is not installed"
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm -v)
    report_success "npm installed: $NPM_VERSION"
else
    report_error "npm is not installed"
fi

# Check for package.json
if [ -f "package.json" ]; then
    report_success "package.json found"
else
    report_error "package.json not found - not a Node.js project?"
fi

echo ""
echo "2️⃣  Installing dependencies..."
echo "----------------------------------------"

if [ -f "package.json" ]; then
    # Check if node_modules exists and is recent
    if [ -d "node_modules" ] && [ -f "package-lock.json" ]; then
        # Check if package-lock.json is newer than node_modules
        if [ "package-lock.json" -nt "node_modules" ]; then
            echo "📦 package-lock.json has changed, running npm ci..."
            npm ci || report_error "Failed to install dependencies"
        else
            report_success "Dependencies up to date"
        fi
    else
        echo "📦 Installing dependencies with npm ci..."
        npm ci || report_error "Failed to install dependencies"
    fi
fi

echo ""
echo "3️⃣  Running code quality checks..."
echo "----------------------------------------"

# Linting
if [ -f "package.json" ] && grep -q "\"lint\"" package.json; then
    echo "🔍 Running linter..."
    npm run lint || report_error "Linting failed"
    report_success "Linting passed"
else
    report_warning "No lint script found in package.json"
fi

# Type checking
if [ -f "tsconfig.json" ]; then
    if grep -q "\"typecheck\"" package.json 2>/dev/null; then
        echo "📝 Running type check..."
        npm run typecheck || report_error "Type checking failed"
        report_success "Type checking passed"
    elif command_exists tsc; then
        echo "📝 Running TypeScript compiler..."
        tsc --noEmit || report_error "TypeScript compilation failed"
        report_success "TypeScript compilation passed"
    else
        report_warning "TypeScript config found but no type checking available"
    fi
fi

# Format checking
if [ -f "package.json" ] && grep -q "\"format:check\"" package.json; then
    echo "🎨 Checking code formatting..."
    npm run format:check || report_error "Format checking failed"
    report_success "Format checking passed"
fi

echo ""
echo "4️⃣  Running tests..."
echo "----------------------------------------"

# Ensure CI environment is set
export CI=true
export NODE_ENV=test

# Unit tests
if [ -f "package.json" ] && grep -q "\"test:unit\"" package.json; then
    echo "🧪 Running unit tests..."
    npm run test:unit || report_error "Unit tests failed"
    report_success "Unit tests passed"
elif [ -f "package.json" ] && grep -q "\"test\"" package.json; then
    echo "🧪 Running tests..."
    npm test || report_error "Tests failed"
    report_success "Tests passed"
else
    report_warning "No test script found in package.json"
fi

# Integration tests
if [ -f "package.json" ] && grep -q "\"test:integration\"" package.json; then
    echo "🔗 Running integration tests..."
    npm run test:integration || report_error "Integration tests failed"
    report_success "Integration tests passed"
fi

# E2E tests (should skip in CI unless explicitly enabled)
if [ -f "package.json" ] && grep -q "\"test:e2e\"" package.json; then
    if [ "$CI" == "true" ] && [ "$ENABLE_E2E_TESTS" != "true" ]; then
        report_success "E2E tests skipped in CI (set ENABLE_E2E_TESTS=true to run)"
    else
        echo "🌐 Running E2E tests..."
        npm run test:e2e || report_error "E2E tests failed"
        report_success "E2E tests passed"
    fi
fi

echo ""
echo "5️⃣  Checking dependencies..."
echo "----------------------------------------"

# Check for security vulnerabilities
echo "🔒 Checking for security vulnerabilities..."
npm audit --audit-level=high || report_warning "Security vulnerabilities found (non-blocking)"

# Check for unused dependencies
if command_exists depcheck; then
    echo "📦 Checking for unused dependencies..."
    npx depcheck --ignores="@types/*,eslint-*,prettier,husky,lint-staged" || report_warning "Unused dependencies found (non-blocking)"
else
    echo "ℹ️  Install depcheck for dependency analysis: npm i -g depcheck"
fi

echo ""
echo "6️⃣  Additional validations..."
echo "----------------------------------------"

# Docker validation (if docker-compose.yml exists)
if [ -f "docker-compose.yml" ] || [ -f "docker-compose.yaml" ]; then
    if command_exists docker-compose; then
        echo "🐳 Validating Docker Compose configuration..."
        docker-compose config --quiet || report_error "Docker Compose configuration is invalid"
        report_success "Docker Compose configuration is valid"
    else
        report_warning "Docker Compose file found but docker-compose not installed"
    fi
fi

# Environment variables check
if [ -f ".env.example" ]; then
    echo "🔐 Checking environment variables..."
    missing_vars=0
    while IFS= read -r line; do
        # Skip comments and empty lines
        [[ "$line" =~ ^#.*$ ]] && continue
        [[ -z "$line" ]] && continue
        
        # Extract variable name
        var_name=$(echo "$line" | cut -d'=' -f1)
        
        # Check if variable is set
        if [ -z "${!var_name}" ]; then
            report_warning "Environment variable not set: $var_name"
            missing_vars=$((missing_vars + 1))
        fi
    done < .env.example
    
    if [ $missing_vars -eq 0 ]; then
        report_success "All required environment variables are set"
    fi
fi

# Build check
if [ -f "package.json" ] && grep -q "\"build\"" package.json; then
    echo "🏗️  Running build..."
    npm run build || report_error "Build failed"
    report_success "Build completed successfully"
fi

echo ""
echo "============================================"
echo "📊 QA Gate Summary"
echo "============================================"

if [ $FAILURES -gt 0 ]; then
    echo -e "${RED}❌ QA Gate FAILED with $FAILURES error(s)${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Also found $WARNINGS warning(s)${NC}"
    fi
    echo ""
    echo "Please fix the errors above before proceeding."
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  QA Gate PASSED with $WARNINGS warning(s)${NC}"
    echo ""
    echo "Warnings are non-blocking but should be addressed."
    exit 0
else
    echo -e "${GREEN}✅ QA Gate PASSED - All checks successful!${NC}"
    echo ""
    echo "Your code is ready for deployment! 🚀"
    exit 0
fi