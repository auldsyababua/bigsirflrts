#!/bin/bash

# FLRTS OpenProject Development Setup Script

set -e

echo "🚀 FLRTS OpenProject Development Setup"
echo "======================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Start OpenProject
echo ""
echo "Starting OpenProject Community Edition..."
docker-compose up -d

echo ""
echo "⏳ Waiting for OpenProject to initialize (this may take 2-3 minutes)..."
sleep 30

# Check if OpenProject is running
while ! curl -s http://localhost:8080 > /dev/null; do
    echo "   Still waiting for OpenProject to start..."
    sleep 10
done

echo "✅ OpenProject is running!"

# Display access information
echo ""
echo "======================================"
echo "🎉 OpenProject is ready!"
echo "======================================"
echo ""
echo "Access OpenProject at: http://localhost:8080"
echo ""
echo "Default admin credentials:"
echo "  Username: admin"
echo "  Password: admin"
echo "  Email: admin@flrts.local"
echo ""
echo "To stop OpenProject:"
echo "  docker-compose down"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f openproject"
echo ""
echo "To reset everything:"
echo "  docker-compose down -v"
echo ""
echo "======================================"

# Create API key instructions
echo ""
echo "📝 Next Steps:"
echo "1. Login to OpenProject at http://localhost:8080"
echo "2. Go to 'My Account' → 'Access Tokens'"
echo "3. Create a new API token for FLRTS"
echo "4. Save the token in .env file as OPENPROJECT_API_KEY"
echo ""

# Build OpenProject CLI if Go is installed
if command -v go &> /dev/null; then
    echo "Building OpenProject CLI..."
    cd ../../tools/openproject-cli
    go build -o op-cli main.go
    echo "✅ OpenProject CLI built at: tools/openproject-cli/op-cli"
    echo ""
    echo "To use the CLI:"
    echo "  export OPENPROJECT_URL=http://localhost:8080"
    echo "  export OPENPROJECT_APIKEY=<your-api-key>"
    echo "  ./tools/openproject-cli/op-cli work-package list"
else
    echo "ℹ️  Go is not installed. Skipping OpenProject CLI build."
    echo "   Install Go to build the CLI tool."
fi

echo ""
echo "🚀 Setup complete! Happy coding!"