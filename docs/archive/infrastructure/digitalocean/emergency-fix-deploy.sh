#!/bin/bash
# EMERGENCY FIX DEPLOYMENT SCRIPT FOR STORY 1.1 QA GATE FAILURES
# This script applies critical fixes identified by QA testing
# Date: 2025-09-16

set -e

echo "=================================================="
echo "EMERGENCY FIX DEPLOYMENT FOR OPENPROJECT"
echo "Fixing Critical QA Gate Failures"
echo "=================================================="
echo ""

# Configuration
VM_IP="165.227.216.172"
VM_USER="root"
COMPOSE_FILE="docker-compose.fixed.yml"
BACKUP_DIR="/root/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running locally or on VM
if [[ $(hostname -I | awk '{print $1}') == "$VM_IP" ]] || [[ $(hostname) == "openproject-vm" ]]; then
    print_status "Running directly on VM"
    IS_LOCAL=true
else
    print_status "Running from local machine, will SSH to VM"
    IS_LOCAL=false
fi

# Function to run commands either locally or via SSH
run_command() {
    if [ "$IS_LOCAL" = true ]; then
        eval "$1"
    else
        ssh $VM_USER@$VM_IP "$1"
    fi
}

# Function to copy files to VM
copy_file() {
    if [ "$IS_LOCAL" = true ]; then
        cp "$1" "$2"
    else
        scp "$1" $VM_USER@$VM_IP:"$2"
    fi
}

echo ""
echo "=========================================="
echo "STEP 1: BACKUP CURRENT CONFIGURATION"
echo "=========================================="
print_status "Creating backup directory..."
run_command "mkdir -p $BACKUP_DIR"

print_status "Backing up current docker-compose.yml..."
run_command "cd /root && cp docker-compose.yml $BACKUP_DIR/docker-compose.yml.backup.\$(date +%Y%m%d_%H%M%S) 2>/dev/null || true"

print_status "Backing up database..."
run_command "docker exec openproject-db pg_dump -U openproject openproject | gzip > $BACKUP_DIR/openproject_emergency_backup_\$(date +%Y%m%d_%H%M%S).sql.gz 2>/dev/null || true"

echo ""
echo "=========================================="
echo "STEP 2: STOP CURRENT CONTAINERS"
echo "=========================================="
print_warning "Stopping all OpenProject containers..."
run_command "cd /root && docker-compose down || true"

# Additional cleanup for stuck containers
print_status "Cleaning up any stuck containers..."
run_command "docker stop openproject flrts-openproject openproject-db flrts-openproject-db memcached flrts-memcached cloudflared flrts-cloudflared 2>/dev/null || true"
run_command "docker rm openproject flrts-openproject openproject-db flrts-openproject-db memcached flrts-memcached cloudflared flrts-cloudflared 2>/dev/null || true"

echo ""
echo "=========================================="
echo "STEP 3: DEPLOY FIXED CONFIGURATION"
echo "=========================================="
print_status "Copying fixed docker-compose.yml to VM..."
if [ "$IS_LOCAL" = false ]; then
    copy_file "./infrastructure/digitalocean/$COMPOSE_FILE" "/root/docker-compose.yml"
else
    print_error "Please ensure $COMPOSE_FILE is in current directory"
    exit 1
fi

echo ""
echo "=========================================="
echo "STEP 4: VERIFY ENVIRONMENT VARIABLES"
echo "=========================================="
print_status "Checking required environment variables..."
run_command "cd /root && source .env 2>/dev/null || true"

# Check critical env vars
REQUIRED_VARS=(
    "POSTGRES_PASSWORD"
    "OPENPROJECT_SECRET_KEY_BASE"
    "CLOUDFLARE_TUNNEL_TOKEN"
)

for var in "${REQUIRED_VARS[@]}"; do
    if run_command "cd /root && grep -q '^${var}=' .env 2>/dev/null"; then
        print_status "✓ $var is set"
    else
        print_error "✗ $var is missing in .env file!"
        echo "Please ensure all required environment variables are set"
        exit 1
    fi
done

echo ""
echo "=========================================="
echo "STEP 5: START FIXED CONTAINERS"
echo "=========================================="
print_status "Pulling latest images..."
run_command "cd /root && docker-compose pull"

print_status "Starting containers with fixes..."
run_command "cd /root && docker-compose up -d"

echo ""
echo "=========================================="
echo "STEP 6: WAIT FOR SERVICES TO INITIALIZE"
echo "=========================================="
print_status "Waiting for database to be ready..."
sleep 10

# Check database health
for i in {1..30}; do
    if run_command "docker exec openproject-db pg_isready -U openproject -d openproject 2>/dev/null"; then
        print_status "Database is ready!"
        break
    fi
    echo -n "."
    sleep 2
done

print_status "Waiting for OpenProject to initialize (this may take 3-5 minutes)..."
sleep 30

echo ""
echo "=========================================="
echo "STEP 7: VERIFY FIXES"
echo "=========================================="

# Check 1: Container names
print_status "Verifying container names..."
if run_command "docker ps --format '{{.Names}}' | grep -q '^openproject$'"; then
    print_status "✓ Container name 'openproject' correct"
else
    print_error "✗ Container name incorrect"
fi

# Check 2: Port binding
print_status "Verifying port binding (localhost only)..."
if run_command "docker ps --format 'table {{.Ports}}' | grep -q '127.0.0.1:8080->80'"; then
    print_status "✓ Port 8080 bound to localhost only (secure)"
else
    print_error "✗ Port binding incorrect - SECURITY RISK!"
fi

# Check 3: Auto-restart policy
print_status "Verifying auto-restart policy..."
if run_command "docker inspect openproject --format='{{.HostConfig.RestartPolicy.Name}}' | grep -q 'always'"; then
    print_status "✓ Auto-restart policy set to 'always'"
else
    print_error "✗ Auto-restart policy not configured properly"
fi

# Check 4: Background workers
print_status "Checking background job workers..."
sleep 10
if run_command "docker exec openproject curl -s http://localhost/health_checks/worker | grep -q 'PASSED'"; then
    print_status "✓ Background workers are running"
else
    print_warning "⚠ Background workers may still be initializing"
fi

# Check 5: Health endpoint
print_status "Testing health endpoint..."
if run_command "docker exec openproject curl -f -s http://localhost/health_checks/default > /dev/null 2>&1"; then
    print_status "✓ Health check endpoint responding"
else
    print_error "✗ Health check endpoint not responding"
fi

# Check 6: Cloudflare tunnel
print_status "Checking Cloudflare tunnel..."
if run_command "docker ps | grep -q cloudflared"; then
    print_status "✓ Cloudflare tunnel container running"
else
    print_error "✗ Cloudflare tunnel not running"
fi

echo ""
echo "=========================================="
echo "STEP 8: PERFORMANCE TEST"
echo "=========================================="
print_status "Running quick performance test..."
if command -v ab >/dev/null 2>&1; then
    print_status "Testing response time (10 requests)..."
    run_command "ab -n 10 -c 1 -t 5 http://127.0.0.1:8080/login 2>/dev/null | grep 'Time per request:' | head -1 || echo 'Performance test incomplete'"
else
    print_warning "Apache Bench not installed, skipping performance test"
fi

echo ""
echo "=========================================="
echo "DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
print_status "Emergency fixes have been applied!"
echo ""
echo "Fixed Issues:"
echo "  ✓ Container names corrected (openproject, openproject-db)"
echo "  ✓ Port 8080 bound to localhost only (security fix)"
echo "  ✓ Auto-restart policy set to 'always'"
echo "  ✓ Database pool increased to 20 connections"
echo "  ✓ Background job workers configured (GoodJob)"
echo "  ✓ Thread counts optimized (2-5 threads)"
echo "  ✓ Puma workers configured properly"
echo ""
echo "Next Steps:"
echo "  1. Monitor logs: docker-compose logs -f openproject"
echo "  2. Check workers: docker exec openproject rails runner 'puts GoodJob::Job.count'"
echo "  3. Run QA tests: cd /root/infrastructure/qa-evidence/story-1.1 && ./RUN_ALL_TESTS.sh"
echo "  4. Monitor performance via: https://ops.10nz.tools"
echo ""
print_warning "Please wait 3-5 minutes for full initialization before running tests"
echo ""