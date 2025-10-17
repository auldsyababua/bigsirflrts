#!/bin/bash

# Test Environment Setup Script
# This script helps set up the test environment for integration tests

set -e

echo "🔧 Setting up test environment for BIGSIRFLRTS..."
echo "================================================="

# Check if .env.test exists
if [ ! -f ".env.test" ]; then
    echo "📝 Creating .env.test from template..."
    cp .env.test.example .env.test
    echo "✅ Created .env.test"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env.test with your test credentials:"
    echo "   - Supabase URL and keys"
    echo "   - NLP Parser API settings"
    echo "   - Database credentials"
    echo ""
else
    echo "✅ .env.test already exists"
fi

# Check for required tools
echo ""
echo "🔍 Checking required tools..."

check_tool() {
    if command -v $1 &> /dev/null; then
        echo "  ✅ $1 is installed"
        return 0
    else
        echo "  ❌ $1 is not installed"
        return 1
    fi
}

MISSING_TOOLS=0

check_tool "node" || MISSING_TOOLS=1
check_tool "npm" || MISSING_TOOLS=1
check_tool "docker" || echo "  ⚠️  Docker recommended for n8n tests"
check_tool "docker-compose" || echo "  ⚠️  Docker Compose recommended for n8n tests"

# Check Node version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt "18" ]; then
        echo "  ⚠️  Node.js version 18+ required (current: $(node -v))"
        MISSING_TOOLS=1
    fi
fi

# Install dependencies if needed
echo ""
echo "📦 Checking npm dependencies..."
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo "Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# Create necessary directories for n8n tests
echo ""
echo "📁 Setting up test directories..."
mkdir -p infrastructure/docker/{redis,postgres,nginx}
mkdir -p infrastructure/scripts
mkdir -p infrastructure/tests
echo "✅ Test directories created"

# Run tests
echo ""
echo "🧪 Ready to run tests!"
echo ""
echo "Available test commands:"
echo "  npm run test:unit       - Run unit tests"
echo "  npm run test:integration - Run integration tests"
echo "  npm run test:mvp        - Run all MVP tests"
echo ""

if [ $MISSING_TOOLS -eq 1 ]; then
    echo "⚠️  Some required tools are missing. Please install them first."
    exit 1
fi

echo "💡 Tips:"
echo "  - Integration tests will skip if services aren't configured"
echo "  - Set MOCK_NLP_PARSER=true to mock NLP parser service"
echo "  - Set SUPPRESS_TEST_LOGS=true to reduce test output noise"
echo ""
echo "✅ Test environment setup complete!"