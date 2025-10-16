#!/bin/bash

# Start OpenProject with Supabase PostgreSQL 15.8
# Uses Session Mode on port 5432 for stable connections

set -e

echo "==================================="
echo "Starting OpenProject with Supabase"
echo "PostgreSQL 15.8 - Session Mode"
echo "==================================="
echo ""

# Check if main .env exists
if [ ! -f ".env" ]; then
    echo "Error: .env file not found!"
    echo "Please ensure .env contains your SUPABASE_DB_PASSWORD"
    exit 1
fi

# Load environment variables
source .env

# Check if password is set
if [ "$SUPABASE_DB_PASSWORD" == "YOUR_SUPABASE_DB_PASSWORD" ] || [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo "Error: Please set your actual Supabase database password in .env"
    exit 1
fi

# Stop any existing containers
echo "Stopping any existing OpenProject containers..."
docker-compose -f docker-compose-supabase.yml down 2>/dev/null || true

# Start OpenProject with Supabase
echo "Starting OpenProject with Supabase PostgreSQL 15.8..."
docker-compose -f docker-compose-supabase.yml up -d

# Wait for OpenProject to be ready
echo ""
echo "Waiting for OpenProject to initialize (this may take 2-3 minutes)..."
sleep 30

# Check health status
MAX_ATTEMPTS=20
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo -n "Checking OpenProject health (attempt $ATTEMPT/$MAX_ATTEMPTS)... "

    if docker exec flrts-openproject curl -f http://localhost:80/health_checks/default >/dev/null 2>&1; then
        echo "✓ Healthy!"
        break
    else
        echo "Not ready yet..."
        sleep 10
        ATTEMPT=$((ATTEMPT + 1))
    fi
done

if [ $ATTEMPT -gt $MAX_ATTEMPTS ]; then
    echo ""
    echo "Warning: OpenProject health check timed out"
    echo "Check logs with: docker logs flrts-openproject"
    exit 1
fi

echo ""
echo "==================================="
echo "OpenProject is running!"
echo "==================================="
echo ""
echo "Access OpenProject at: http://localhost:8080"
echo "Default credentials:"
echo "  Username: admin"
echo "  Password: admin"
echo ""
echo "Database: PostgreSQL 15.8 on Supabase (Session Mode)"
echo ""
echo "Commands:"
echo "  View logs:        docker logs -f flrts-openproject"
echo "  Stop:            docker-compose -f docker-compose-supabase.yml down"
echo "  Restart:         docker-compose -f docker-compose-supabase.yml restart"
echo ""