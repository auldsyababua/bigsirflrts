#!/bin/bash
#
# ERPNext Deployment Script
# Replaces OpenProject with ERPNext at ops.10nz.tools
#
# Prerequisites:
# 1. SSH access to DigitalOcean droplet
# 2. .env.erpnext file configured with Supabase credentials
# 3. Cloudflare tunnel token in .env.erpnext
# 4. This script should be run from the droplet (not locally)
#
# Usage:
#   bash deploy-erpnext.sh [--skip-backup] [--keep-openproject-data]
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.erpnext.yml"
ENV_FILE="${SCRIPT_DIR}/.env.erpnext"
BACKUP_DIR="${SCRIPT_DIR}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Parse arguments
SKIP_BACKUP=false
KEEP_OPENPROJECT_DATA=false

for arg in "$@"; do
  case $arg in
    --skip-backup)
      SKIP_BACKUP=true
      shift
      ;;
    --keep-openproject-data)
      KEEP_OPENPROJECT_DATA=true
      shift
      ;;
  esac
done

# Functions
log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
  log_info "Checking prerequisites..."

  # Check if running as root or with sudo
  if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root or with sudo"
    exit 1
  fi

  # Check if docker is installed
  if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed"
    exit 1
  fi

  # Check if docker compose is available
  if ! docker compose version &> /dev/null; then
    log_error "Docker Compose V2 is not installed"
    exit 1
  fi

  # Check if env file exists
  if [[ ! -f "$ENV_FILE" ]]; then
    log_error "Environment file not found: $ENV_FILE"
    log_error "Please create it from .env.erpnext.example"
    exit 1
  fi

  # Check if compose file exists
  if [[ ! -f "$COMPOSE_FILE" ]]; then
    log_error "Compose file not found: $COMPOSE_FILE"
    exit 1
  fi

  log_info "✓ Prerequisites check passed"
}

backup_openproject() {
  if [[ "$SKIP_BACKUP" == true ]]; then
    log_warn "Skipping OpenProject backup (--skip-backup flag set)"
    return
  fi

  log_info "Creating backup of OpenProject data..."
  mkdir -p "$BACKUP_DIR"

  # Backup OpenProject PostgreSQL database
  if docker ps --format '{{.Names}}' | grep -q "flrts-openproject-db"; then
    log_info "Backing up OpenProject database..."
    docker exec flrts-openproject-db pg_dump -U openproject -d openproject \
      | gzip > "${BACKUP_DIR}/openproject_db_${TIMESTAMP}.sql.gz"
    log_info "✓ Database backup saved to: ${BACKUP_DIR}/openproject_db_${TIMESTAMP}.sql.gz"
  else
    log_warn "OpenProject database container not running, skipping database backup"
  fi

  # Export docker volumes
  log_info "Backing up OpenProject volumes..."
  docker run --rm -v openproject_data:/data -v "$BACKUP_DIR":/backup \
    alpine tar czf "/backup/openproject_data_${TIMESTAMP}.tar.gz" -C /data . \
    || log_warn "Failed to backup openproject_data volume"

  log_info "✓ OpenProject backup complete"
}

stop_openproject() {
  log_info "Stopping OpenProject containers..."

  # Stop OpenProject services
  if docker ps --format '{{.Names}}' | grep -q "flrts-openproject"; then
    docker compose -f infrastructure/digitalocean/docker-compose.prod.yml \
      stop openproject openproject-db memcached || true
    log_info "✓ OpenProject containers stopped"
  else
    log_warn "OpenProject containers not running"
  fi

  # Keep cloudflared running (will be reconfigured)
  log_info "Keeping cloudflared tunnel active"
}

remove_openproject_containers() {
  log_info "Removing OpenProject containers..."

  docker compose -f infrastructure/digitalocean/docker-compose.prod.yml \
    rm -f openproject openproject-db memcached || true

  if [[ "$KEEP_OPENPROJECT_DATA" == false ]]; then
    log_warn "Removing OpenProject volumes (data will be lost)..."
    docker volume rm openproject_data openproject_logs postgres_data || true
    log_info "✓ OpenProject volumes removed"
  else
    log_info "Keeping OpenProject volumes (can rollback if needed)"
  fi

  log_info "✓ OpenProject containers removed"
}

pull_erpnext_images() {
  log_info "Pulling ERPNext Docker images..."

  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull

  log_info "✓ ERPNext images pulled"
}

start_redis() {
  log_info "Starting Redis containers..."

  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d redis-cache redis-queue

  # Wait for Redis to be healthy
  log_info "Waiting for Redis to be ready..."
  sleep 5

  docker exec flrts-redis-cache redis-cli ping || {
    log_error "Redis cache failed to start"
    exit 1
  }

  docker exec flrts-redis-queue redis-cli ping || {
    log_error "Redis queue failed to start"
    exit 1
  }

  log_info "✓ Redis containers started and healthy"
}

configure_erpnext() {
  log_info "Running ERPNext configurator..."

  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up erpnext-configurator

  log_info "✓ ERPNext configured"
}

create_erpnext_site() {
  log_info "Creating ERPNext site..."

  # Start backend temporarily to create site
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d erpnext-backend

  # Wait for backend to be ready
  sleep 10

  # Get admin password from env file
  ADMIN_PASSWORD=$(grep FRAPPE_ADMIN_PASSWORD "$ENV_FILE" | cut -d'=' -f2)

  if [[ -z "$ADMIN_PASSWORD" ]]; then
    log_error "FRAPPE_ADMIN_PASSWORD not set in $ENV_FILE"
    exit 1
  fi

  # Create site
  log_info "Creating Frappe site: ops.10nz.tools"
  docker exec flrts-erpnext-backend \
    bench new-site ops.10nz.tools \
    --db-name erpnext \
    --admin-password "$ADMIN_PASSWORD" \
    --force

  # Install ERPNext app
  log_info "Installing ERPNext application..."
  docker exec flrts-erpnext-backend \
    bench --site ops.10nz.tools install-app erpnext

  # Enable scheduler
  log_info "Enabling scheduler..."
  docker exec flrts-erpnext-backend \
    bench --site ops.10nz.tools scheduler enable

  log_info "✓ ERPNext site created and configured"
}

start_erpnext_services() {
  log_info "Starting all ERPNext services..."

  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

  log_info "✓ ERPNext services started"
}

verify_deployment() {
  log_info "Verifying ERPNext deployment..."

  # Wait for services to stabilize
  sleep 30

  # Check container health
  log_info "Checking container health..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

  # Test frontend health endpoint
  log_info "Testing ERPNext health endpoint..."
  if curl -f http://localhost:8080/api/method/ping &> /dev/null; then
    log_info "✓ ERPNext is responding to health checks"
  else
    log_error "ERPNext health check failed"
    log_error "Check logs: docker compose -f $COMPOSE_FILE logs -f"
    exit 1
  fi

  # Check Cloudflare tunnel
  if docker ps --format '{{.Names}}' | grep -q "flrts-cloudflared"; then
    log_info "✓ Cloudflare tunnel is running"
  else
    log_warn "Cloudflare tunnel is not running"
  fi

  log_info "✓ Deployment verification complete"
}

show_next_steps() {
  log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log_info "ERPNext Deployment Complete!"
  log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo
  log_info "Access ERPNext at: https://ops.10nz.tools"
  log_info "Username: Administrator"
  log_info "Password: (from FRAPPE_ADMIN_PASSWORD in .env.erpnext)"
  echo
  log_info "Useful commands:"
  echo "  View logs:    docker compose -f $COMPOSE_FILE logs -f"
  echo "  Restart:      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE restart"
  echo "  Stop:         docker compose -f $COMPOSE_FILE --env-file $ENV_FILE down"
  echo "  Bench shell:  docker exec -it flrts-erpnext-backend bash"
  echo
  log_info "Backups saved to: $BACKUP_DIR"
  log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Main execution
main() {
  log_info "Starting ERPNext deployment to replace OpenProject"
  log_info "Deployment will be accessible at: ops.10nz.tools"
  echo

  check_prerequisites
  backup_openproject
  stop_openproject
  remove_openproject_containers
  pull_erpnext_images
  start_redis
  configure_erpnext
  create_erpnext_site
  start_erpnext_services
  verify_deployment
  show_next_steps
}

# Run main function
main
