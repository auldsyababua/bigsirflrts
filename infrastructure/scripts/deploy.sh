#!/bin/bash
# FLRTS OpenProject Deployment Script
# Usage: ./deploy.sh <server-ip>

set -e

# Check arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 <server-ip>"
    echo "Example: $0 165.227.216.172"
    exit 1
fi

SERVER_IP=$1
SSH_USER=${SSH_USER:-root}
PROJECT_DIR="/opt/flrts-openproject"

echo "==========================================
FLRTS OpenProject Deployment
Target: ${SSH_USER}@${SERVER_IP}
=========================================="

# Function to execute commands on server
remote_exec() {
    ssh -o StrictHostKeyChecking=no ${SSH_USER}@${SERVER_IP} "$@"
}

# Function to copy files to server
remote_copy() {
    scp -o StrictHostKeyChecking=no -r "$1" ${SSH_USER}@${SERVER_IP}:"$2"
}

# Step 1: Copy and run setup script
echo "📦 Step 1: Setting up server..."
remote_copy infrastructure/scripts/setup-server.sh /tmp/setup-server.sh
remote_exec "chmod +x /tmp/setup-server.sh && /tmp/setup-server.sh"

# Step 2: Create project directory structure
echo "📁 Step 2: Creating project directories..."
remote_exec "mkdir -p ${PROJECT_DIR}/{scripts,backups,config}"

# Step 3: Copy Docker Compose and configuration files
echo "📋 Step 3: Copying configuration files..."
remote_copy infrastructure/digitalocean/docker-compose.prod.yml ${PROJECT_DIR}/docker-compose.yml

# Step 4: Copy environment file (if exists)
if [ -f infrastructure/digitalocean/.env ]; then
    echo "🔐 Step 4: Copying environment file..."
    remote_copy infrastructure/digitalocean/.env ${PROJECT_DIR}/.env
else
    echo "⚠️  Step 4: No .env file found. Creating from template..."
    remote_copy infrastructure/digitalocean/.env.production ${PROJECT_DIR}/.env.example
    echo "IMPORTANT: Edit ${PROJECT_DIR}/.env.example and rename to .env"
fi

# Step 5: Create PostgreSQL initialization script
echo "💾 Step 5: Creating database initialization script..."
cat <<'EOF' | remote_exec "cat > ${PROJECT_DIR}/postgres-init.sql"
-- OpenProject PostgreSQL Initialization Script
-- This runs only on first container creation

-- Create extensions required by OpenProject
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set default configuration for OpenProject
ALTER DATABASE openproject SET statement_timeout = '60s';
ALTER DATABASE openproject SET lock_timeout = '10s';
ALTER DATABASE openproject SET idle_in_transaction_session_timeout = '10min';

-- Create application role with proper permissions
DO
\$do\$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'openproject_app') THEN
      CREATE ROLE openproject_app LOGIN PASSWORD 'app_password';
   END IF;
END
\$do\$;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE openproject TO openproject_app;
GRANT ALL ON SCHEMA public TO openproject_app;
EOF

# Step 6: Create backup script
echo "💾 Step 6: Creating backup script..."
cat <<'EOF' | remote_exec "cat > ${PROJECT_DIR}/scripts/backup.sh"
#!/bin/bash
# OpenProject Backup Script

BACKUP_DIR="/opt/flrts-openproject/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="openproject_backup_${TIMESTAMP}.tar.gz"

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

# Backup PostgreSQL database
docker exec flrts-openproject-db pg_dump -U openproject openproject | gzip > ${BACKUP_DIR}/db_${TIMESTAMP}.sql.gz

# Backup OpenProject files
docker run --rm -v openproject_data:/data -v ${BACKUP_DIR}:/backup alpine tar czf /backup/files_${TIMESTAMP}.tar.gz /data

# Create combined backup
cd ${BACKUP_DIR}
tar czf ${BACKUP_FILE} db_${TIMESTAMP}.sql.gz files_${TIMESTAMP}.tar.gz
rm db_${TIMESTAMP}.sql.gz files_${TIMESTAMP}.tar.gz

# Keep only last 7 days of backups
find ${BACKUP_DIR} -name "openproject_backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}"
EOF

remote_exec "chmod +x ${PROJECT_DIR}/scripts/backup.sh"

# Step 7: Create systemd service for auto-start
echo "🚀 Step 7: Creating systemd service..."
cat <<'EOF' | remote_exec "cat > /etc/systemd/system/flrts-openproject.service"
[Unit]
Description=FLRTS OpenProject Docker Compose Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/flrts-openproject
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
ExecReload=/usr/bin/docker compose restart
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

remote_exec "systemctl daemon-reload && systemctl enable flrts-openproject"

# Step 8: Create health check script
echo "🏥 Step 8: Creating health check script..."
cat <<'EOF' | remote_exec "cat > ${PROJECT_DIR}/scripts/health-check.sh"
#!/bin/bash
# OpenProject Health Check Script

# Check if containers are running
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check OpenProject health endpoint
if curl -f http://localhost:8080/health_checks/default > /dev/null 2>&1; then
    echo "✅ OpenProject is healthy"
else
    echo "❌ OpenProject health check failed"
fi

# Check database connection
if docker exec flrts-openproject-db pg_isready -U openproject > /dev/null 2>&1; then
    echo "✅ PostgreSQL is healthy"
else
    echo "❌ PostgreSQL health check failed"
fi

# Check memory usage
echo ""
echo "Memory Usage:"
free -h

# Check disk usage
echo ""
echo "Disk Usage:"
df -h /

# Check Docker disk usage
echo ""
echo "Docker Disk Usage:"
docker system df
EOF

remote_exec "chmod +x ${PROJECT_DIR}/scripts/health-check.sh"

# Step 9: Pull Docker images
echo "🐳 Step 9: Pulling Docker images..."
remote_exec "cd ${PROJECT_DIR} && docker compose pull"

# Step 10: Initialize database and start services
echo "🚀 Step 10: Starting services..."
if remote_exec "[ -f ${PROJECT_DIR}/.env ]"; then
    remote_exec "cd ${PROJECT_DIR} && docker compose up -d"

    echo "⏳ Waiting for services to start (this may take 2-3 minutes)..."
    sleep 30

    # Run health check
    remote_exec "${PROJECT_DIR}/scripts/health-check.sh"
else
    echo "⚠️  Cannot start services without .env file"
    echo "Please configure ${PROJECT_DIR}/.env and run:"
    echo "  ssh ${SSH_USER}@${SERVER_IP} 'cd ${PROJECT_DIR} && docker compose up -d'"
fi

# Step 11: Setup cron jobs
echo "⏰ Step 11: Setting up cron jobs..."
remote_exec "crontab -l 2>/dev/null || true" > /tmp/current_cron
echo "0 2 * * * ${PROJECT_DIR}/scripts/backup.sh" >> /tmp/current_cron
echo "*/5 * * * * ${PROJECT_DIR}/scripts/health-check.sh > /dev/null 2>&1" >> /tmp/current_cron
cat /tmp/current_cron | remote_exec "crontab -"
rm /tmp/current_cron

echo "==========================================
✅ Deployment Complete!

Server: ${SSH_USER}@${SERVER_IP}
Project Directory: ${PROJECT_DIR}

Next Steps:
1. Configure .env file if not already done:
   ssh ${SSH_USER}@${SERVER_IP}
   cd ${PROJECT_DIR}
   nano .env

2. Start services (if not running):
   docker compose up -d

3. Check service health:
   ./scripts/health-check.sh

4. Configure Cloudflare Tunnel:
   - Create tunnel in Cloudflare Dashboard
   - Add the tunnel token to .env
   - Restart cloudflared container

5. Access OpenProject:
   - Via IP (temporary): http://${SERVER_IP}:8080
   - Via Cloudflare (production): https://your-domain.com

6. Monitor logs:
   docker compose logs -f

Important Commands:
- Start services: docker compose up -d
- Stop services: docker compose down
- View logs: docker compose logs -f [service-name]
- Restart service: docker compose restart [service-name]
- Run backup: ./scripts/backup.sh
- Check health: ./scripts/health-check.sh
==========================================
"