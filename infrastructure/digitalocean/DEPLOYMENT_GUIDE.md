# FLRTS OpenProject Deployment Guide - Digital Ocean

## Overview

This guide provides step-by-step instructions for deploying OpenProject
Community Edition on Digital Ocean using Docker Compose with **Supabase
PostgreSQL**, Cloudflare Tunnel for secure access, and R2 for file storage.

**Current Architecture**: Supabase-only (ADR-002) - No local PostgreSQL
container.

## Architecture

```
Internet → Cloudflare Tunnel → Digital Ocean VM (NYC3)
                                        ↓
                            Docker Network (flrts_network)
                                        ↓
                    ┌─────────────────────────────────────┐
                    │  OpenProject    │    Memcached      │
                    │  (Rails App)    │    (Cache)        │
                    │                 │                   │
                    │  Cloudflared    │                   │
                    │  (Tunnel)       │                   │
                    └─────────────────────────────────────┘
                            ↓                   ↓
                    Supabase PostgreSQL    Cloudflare R2
                    (Managed Database)     (File Storage)
```

## Prerequisites

1. **Digital Ocean Account** with billing configured
2. **Cloudflare Account** with:
   - Domain configured
   - R2 storage enabled
   - Zero Trust access configured
3. **Local Tools**:
   - SSH client
   - Terminal with bash

## Quick Start

### 1. Provision the Server

The server has already been provisioned:

- **Droplet Name**: flrts-openproject-prod
- **IP Address**: 165.227.216.172
- **Size**: s-4vcpu-8gb (4 vCPU, 8GB RAM, 160GB SSD)
- **Region**: NYC3
- **OS**: Ubuntu 22.04 LTS

### 2. Initial Server Setup

```bash
# SSH into the server
ssh root@165.227.216.172

# Run the setup script
cd /tmp
wget https://raw.githubusercontent.com/your-repo/infrastructure/scripts/setup-server.sh
chmod +x setup-server.sh
./setup-server.sh
```

### 3. Configure Environment Variables

**CRITICAL**: All credentials must be stored in environment variables. Never
commit the `.env` file!

```bash
# Navigate to project directory
cd /root

# Copy environment template (from this repo)
cp infrastructure/digitalocean/.env.example .env

# Generate secret key
echo "SECRET_KEY_BASE=$(openssl rand -hex 64)" >> .env

# Edit the .env file with your actual values
nano .env
```

Required environment variables to configure:

**Supabase Database Connection** (get from
<https://supabase.com/dashboard/project/thnwlykidzhrsagyjncc/settings/database>):

- `SUPABASE_DB_USER` - Usually `postgres`
- `SUPABASE_DB_PASSWORD` - Your Supabase database password
- `SUPABASE_DB_HOST` - `db.thnwlykidzhrsagyjncc.supabase.co`
- `SUPABASE_DB_PORT` - `5432`
- `SUPABASE_DB_NAME` - `postgres`
- `SUPABASE_DB_SCHEMA` - `openproject`

**OpenProject Security**:

- `SECRET_KEY_BASE` - Generated above (CRITICAL - never use defaults!)
- `OPENPROJECT_ADMIN_USERNAME` - Admin username (change from default!)
- `OPENPROJECT_ADMIN_PASSWORD` - Strong admin password (change from default!)
- `OPENPROJECT_HOST_NAME` - `ops.10nz.tools`
- `OPENPROJECT_HTTPS` - `true`

**Cloudflare R2 Storage**:

- `R2_ACCESS_KEY_ID` - From Cloudflare R2
- `R2_SECRET_ACCESS_KEY` - From Cloudflare R2
- `R2_ENDPOINT` - Your R2 endpoint URL
- `R2_BUCKET` - `10netzero-docs`

**Cloudflare Tunnel**:

- `CLOUDFLARE_TUNNEL_TOKEN` - From Cloudflare Tunnel setup

### 4. Set Up Cloudflare R2 Storage

1. Log into Cloudflare Dashboard
2. Navigate to R2 → Overview
3. Create a new bucket named `openproject-files`
4. Go to Manage R2 API Tokens
5. Create a new API token with:
   - Permission: Object Read & Write
   - Specify bucket: openproject-files
6. Copy the Access Key ID and Secret Access Key to your .env file

### 5. Configure Cloudflare Tunnel

```bash
# On your local machine (not the server)
# Install cloudflared
brew install cloudflare/cloudflare/cloudflared  # macOS
# or
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared

# Login to Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create openproject-tunnel

# Get the tunnel token
cloudflared tunnel token openproject-tunnel

# Copy the token to your server's .env file
```

Configure tunnel ingress rules in Cloudflare Dashboard:

1. Go to Zero Trust → Access → Tunnels
2. Select your tunnel
3. Add public hostname:
   - Subdomain: openproject
   - Domain: yourdomain.com
   - Service: <http://openproject:80>

### 6. Validate Environment Variables

**IMPORTANT**: Validate your environment before deployment to prevent boot with
empty credentials.

```bash
# On the server
cd /root

# Run validation script
bash infrastructure/digitalocean/validate-env.sh

# If validation passes, proceed with deployment
```

### 7. Deploy the Application

```bash
# On the server
cd /root

# Start all services using Supabase compose file
docker compose -f infrastructure/digitalocean/docker-compose.supabase.yml up -d

# Monitor startup (this takes 5-10 minutes for first migration)
docker compose -f infrastructure/digitalocean/docker-compose.supabase.yml logs -f

# Check that migration completed successfully
docker compose -f infrastructure/digitalocean/docker-compose.supabase.yml ps

# The openproject-migrate container should show "Exit 0" status
# The openproject container should be "Up" and healthy
```

**What happens during deployment:**

1. `openproject-migrate` runs database migrations and seeds (then exits)
2. `openproject` starts and connects to Supabase PostgreSQL
3. `memcached` starts for Rails caching
4. `cloudflared` starts the Cloudflare Tunnel

### 8. Initial OpenProject Configuration

Access OpenProject via Cloudflare Tunnel at `https://ops.10nz.tools`

**Admin Credentials** (from CLAUDE.md):

- Username: `admin`
- Password: Set via `OPENPROJECT_ADMIN_PASSWORD` in `.env`

**IMPORTANT**: Change the admin password immediately after first login!

1. Log in with admin credentials
2. Go to Administration → Users → admin
3. Change password to a strong, unique password
4. Store new password in 1Password or your password manager

### 8. Verify Deployment

```bash
# Check all containers are running
docker compose -f infrastructure/digitalocean/docker-compose.supabase.yml ps

# Test OpenProject health endpoint
curl http://localhost:8080/health_checks/default

# Test Supabase connection
docker compose -f infrastructure/digitalocean/docker-compose.supabase.yml exec openproject \
  rails runner "puts ActiveRecord::Base.connection.execute('SELECT version()').first"

# Should show PostgreSQL version from Supabase
```

## Maintenance

### Database Backups

**Note**: Database is managed by Supabase. Use Supabase's built-in backup
features:

1. **Point-in-Time Recovery (PITR)**: Available in Supabase dashboard
2. **Manual Backups**: Use `pg_dump` to backup from Supabase

```bash
# Manual backup from Supabase (run from your local machine or server)
PGPASSWORD="${SUPABASE_DB_PASSWORD}" pg_dump \
  -h db.thnwlykidzhrsagyjncc.supabase.co \
  -U postgres \
  -d postgres \
  --schema=openproject \
  --no-owner --no-acl \
  | gzip > openproject_backup_$(date +%Y%m%d).sql.gz

# Restore from backup
gunzip < openproject_backup_20250101.sql.gz | \
PGPASSWORD="${SUPABASE_DB_PASSWORD}" psql \
  -h db.thnwlykidzhrsagyjncc.supabase.co \
  -U postgres \
  -d postgres
```

### Monitoring

```bash
# Check service status
docker compose ps

# View logs
docker compose logs -f [service-name]

# Check resource usage
docker stats

# System health check
/opt/flrts-openproject/scripts/health-check.sh
```

### Updates

```bash
# Update OpenProject
cd /opt/flrts-openproject
docker compose pull openproject
docker compose up -d openproject

# Update all services
docker compose pull
docker compose up -d
```

### Troubleshooting

#### OpenProject won't start

```bash
# Check logs
docker compose -f infrastructure/digitalocean/docker-compose.supabase.yml logs openproject

# Check database connection to Supabase
docker compose -f infrastructure/digitalocean/docker-compose.supabase.yml exec openproject \
  rails runner "ActiveRecord::Base.connection.execute('SELECT 1')"

# Check if migration container completed successfully
docker compose -f infrastructure/digitalocean/docker-compose.supabase.yml ps openproject-migrate
# Should show "Exit 0"

# Restart services
docker compose -f infrastructure/digitalocean/docker-compose.supabase.yml restart
```

#### High memory usage

```bash
# Check memory consumers
docker stats --no-stream

# Restart specific service
docker compose restart openproject

# Clear caches
docker exec flrts-openproject rails runner "Rails.cache.clear"
```

#### Cloudflare Tunnel issues

```bash
# Check tunnel status
docker logs flrts-cloudflared

# Restart tunnel
docker compose restart cloudflared
```

## Resource Allocation

**Note**: No local PostgreSQL container - using Supabase managed database.

| Service     | Memory Limit | CPU Limit      | Actual Usage (typical)        |
| ----------- | ------------ | -------------- | ----------------------------- |
| OpenProject | No limit     | No limit       | 2-3GB / 0.5-1.0 cores         |
| Memcached   | No limit     | No limit       | 256MB / 0.05 cores            |
| Cloudflared | No limit     | No limit       | 50MB / 0.01 cores             |
| **Total**   | **~3.5GB**   | **~0.6 cores** | **2.5-3.5GB / 0.6-1.1 cores** |

**Droplet Size**: s-4vcpu-8gb (4 vCPU, 8GB RAM) - plenty of headroom for growth

## Security Checklist

- [x] Firewall configured (UFW)
- [x] Fail2ban protecting SSH
- [x] Docker logs limited to prevent disk fill
- [x] No direct port exposure (via Cloudflare Tunnel)
- [x] SSL/TLS certificates (handled by Cloudflare)
- [x] Database encrypted at rest (Supabase manages encryption)
- [x] No hardcoded credentials (all in .env file)
- [x] .env file in .gitignore
- [ ] Regular security updates scheduled
- [ ] Monitoring and alerting configured
- [ ] Admin password changed from default

## Cost Breakdown

| Service                             | Monthly Cost   |
| ----------------------------------- | -------------- |
| Digital Ocean Droplet (s-4vcpu-8gb) | $48.00         |
| Supabase Pro (PostgreSQL)           | $25.00         |
| Cloudflare R2 (100GB storage)       | ~$2.00         |
| Cloudflare Tunnel                   | Free           |
| **Total**                           | **~$75/month** |

## Emergency Procedures

### Complete System Recovery

```bash
# 1. Provision new droplet
# 2. Run setup script
# 3. Restore from backup
cd /opt/flrts-openproject
tar xzf backups/openproject_backup_YYYYMMDD.tar.gz
docker compose up -d
```

### Rollback Deployment

```bash
# Stop services
docker compose down

# Restore previous version
docker compose pull openproject:13  # previous version
docker compose up -d
```

### Emergency Access

If Cloudflare Tunnel fails:

```bash
# Temporarily enable direct access
ufw allow 8080/tcp
# Update docker-compose.yml ports to "8080:80"
docker compose up -d
# Access via http://165.227.216.172:8080
```

## Support Contacts

- **Digital Ocean Support**: <https://www.digitalocean.com/support/>
- **OpenProject Community**: <https://community.openproject.org/>
- **Cloudflare Support**: <https://support.cloudflare.com/>

## Appendix: Environment Variables Reference

See `.env.example` for the complete template. Key variables:

```bash
# Supabase Database Connection
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=                 # From Supabase dashboard
SUPABASE_DB_HOST=db.thnwlykidzhrsagyjncc.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_SCHEMA=openproject

# OpenProject Security (CRITICAL - never use defaults!)
SECRET_KEY_BASE=                      # Generate with: openssl rand -hex 64
OPENPROJECT_ADMIN_USERNAME=admin
OPENPROJECT_ADMIN_PASSWORD=           # Strong password
OPENPROJECT_HOST_NAME=ops.10nz.tools
OPENPROJECT_HTTPS=true

# Cloudflare R2 Storage
R2_ACCESS_KEY_ID=                     # From Cloudflare R2
R2_SECRET_ACCESS_KEY=                 # From Cloudflare R2
R2_ENDPOINT=                          # Your R2 endpoint
R2_BUCKET=10netzero-docs

# Cloudflare Tunnel
CLOUDFLARE_TUNNEL_TOKEN=              # From Cloudflare Tunnel setup
```

**Security Notes:**

- Never commit `.env` to git (already in .gitignore)
- Store credentials in 1Password or secure password manager
- Rotate `SECRET_KEY_BASE` and admin password quarterly
- Use strong, unique passwords for all credentials

---

**Deployment Status**: ✅ Server Provisioned | ⏳ Configuration Pending | ⏳
Services Pending
