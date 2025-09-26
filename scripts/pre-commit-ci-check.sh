#!/bin/bash

# Pre-commit CI environment check
# This script performs a lightweight CI environment verification
# without running the full test suite to avoid slowing down commits

set -e

echo "🔍 Pre-commit CI environment check..."

# Check if .env.test exists
if [ ! -f .env.test ]; then
    echo "⚠️  WARNING: .env.test file not found!"
    echo "   CI tests may fail on GitHub Actions."
    echo "   Run 'npm run test:ci-local' to test with CI environment"
    exit 0  # Warning only, don't block commit
fi

# Quick validation that CI environment variables are configured
source .env.test 2>/dev/null || true

if [ "$CI" != "true" ] || [ "$NODE_ENV" != "test" ]; then
    echo "⚠️  WARNING: CI environment variables not properly configured in .env.test"
    echo "   Expected: CI=true, NODE_ENV=test"
    echo "   Found: CI=$CI, NODE_ENV=$NODE_ENV"
    echo "   Tests may pass locally but fail on GitHub Actions!"
    echo ""
    echo "   To test with CI environment: npm run test:ci-local"
    exit 0  # Warning only, don't block commit
fi

# Check if test:ci-local command exists
if ! grep -q "test:ci-local" package.json; then
    echo "⚠️  WARNING: npm run test:ci-local command not found in package.json"
    echo "   Cannot verify CI compatibility"
    exit 0  # Warning only, don't block commit
fi

echo "✅ CI environment check passed"
echo ""
echo "📝 Reminder: Run 'npm run test:ci-local' before pushing to ensure CI compatibility"
echo ""

exit 0