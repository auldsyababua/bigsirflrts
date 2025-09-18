# FLRTS OpenProject Deployment Guide - Digital Ocean

## Overview

This guide provides step-by-step instructions for deploying OpenProject
Community Edition on Digital Ocean using Docker Compose with Cloudflare Tunnel
for secure access and R2 for file storage.

## Architecture

```
Internet → Cloudflare Tunnel → Digital Ocean VM (NYC3)
                                        ↓
                            Docker Network (172.20.0.0/16)
                                        ↓
                    ┌─────────────────────────────────────┐
                    │  OpenProject    │    PostgreSQL 16  │
                    │  (4GB RAM)      │    (2GB RAM)      │
                    │                 │                   │
                    │  Memcached      │    Cloudflared    │
                    │  (256MB RAM)    │    (256MB RAM)    │
                    └─────────────────────────────────────┘
                                        ↓
                            Cloudflare R2 (File Storage)
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

```bash
# Navigate to project directory
cd /opt/flrts-openproject

# Copy environment template
cp .env.example .env

# Generate secret key
echo "OPENPROJECT_SECRET_KEY_BASE=$(openssl rand -hex 64)" >> .env

# Generate strong PostgreSQL password
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)" >> .env

# Edit the .env file with your values
nano .env
```

Required environment variables to configure:

- `POSTGRES_PASSWORD` - Strong password for PostgreSQL
- `OPENPROJECT_SECRET_KEY_BASE` - Generated above
- `OPENPROJECT_HOST_NAME` - Your domain (e.g., openproject.yourdomain.com)
- `R2_ACCESS_KEY_ID` - From Cloudflare R2
- `R2_SECRET_ACCESS_KEY` - From Cloudflare R2
- `R2_ENDPOINT` - Your R2 endpoint URL
- `R2_BUCKET` - Your R2 bucket name
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
   - Service: http://openproject:80

### 6. Deploy the Application

```bash
# On the server
cd /opt/flrts-openproject

# Start all services
docker compose up -d

# Monitor startup (this takes 2-3 minutes)
docker compose logs -f openproject

# Check health
./scripts/health-check.sh
```

### 7. Initial OpenProject Configuration

1. Access OpenProject at `http://165.227.216.172:8080` (temporary)
2. Complete the setup wizard:
   - Admin email: admin@yourdomain.com
   - Admin password: (secure password)
   - Language: English
3. Configure organization settings
4. Create first project

### 8. Secure the Deployment

```bash
# Once Cloudflare Tunnel is working, remove direct port access
ufw delete allow 8080/tcp
ufw reload

# Update docker-compose.yml to bind only to localhost
# Change: ports: - "8080:80"
# To: ports: - "127.0.0.1:8080:80"
docker compose up -d
```

## Maintenance

### Daily Backups

Automated backups run daily at 2 AM UTC:

```bash
# Manual backup
/opt/flrts-openproject/scripts/backup.sh

# View backup files
ls -la /opt/flrts-openproject/backups/
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
docker compose logs openproject

# Check database connection (Supabase)
# Use your Supabase pooler connection string; example:
# psql "postgresql://<user>:<password>@<pooler-host>:5432/postgres?sslmode=require&schema=openproject" -c "select now()"

# Restart services
docker compose restart
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

| Service     | Memory Limit | CPU Limit     | Actual Usage (typical)        |
| ----------- | ------------ | ------------- | ----------------------------- |
| OpenProject | 4GB          | 2.0 cores     | 2-3GB / 0.5-1.0 cores         |
| Memcached   | 384MB        | 0.25 cores    | 256MB / 0.05 cores            |
| Cloudflared | 256MB        | 0.25 cores    | 50MB / 0.01 cores             |
| **Total**   | **4.6GB**    | **2.5 cores** | **2.5-3.5GB / 0.6-1.1 cores** |

## Security Checklist

- [x] Firewall configured (UFW)
- [x] Fail2ban protecting SSH
- [x] Docker logs limited to prevent disk fill
- [x] No direct port exposure (via Cloudflare Tunnel)
- [ ] SSL/TLS certificates (handled by Cloudflare)
- [ ] Database encrypted at rest
- [ ] Regular security updates scheduled
- [ ] Monitoring and alerting configured

## Cost Breakdown

| Service                             | Monthly Cost   |
| ----------------------------------- | -------------- |
| Digital Ocean Droplet (s-4vcpu-8gb) | $48.00         |
| Cloudflare R2 (100GB storage)       | ~$2.00         |
| Cloudflare Tunnel                   | Free           |
| **Total**                           | **~$50/month** |

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

- **Digital Ocean Support**: https://www.digitalocean.com/support/
- **OpenProject Community**: https://community.openproject.org/
- **Cloudflare Support**: https://support.cloudflare.com/

## Appendix: Environment Variables Reference

```bash
# Required Variables
POSTGRES_PASSWORD=                    # PostgreSQL password
OPENPROJECT_SECRET_KEY_BASE=         # Rails secret key (generate with openssl)
OPENPROJECT_HOST_NAME=                # Your domain name
CLOUDFLARE_TUNNEL_TOKEN=              # Cloudflare Tunnel token

# R2 Storage (Required for file attachments)
R2_ACCESS_KEY_ID=                     # R2 Access Key
R2_SECRET_ACCESS_KEY=                 # R2 Secret Key
R2_ENDPOINT=                          # https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_BUCKET=openproject-files           # R2 bucket name

# Optional Email Configuration
EMAIL_DELIVERY_METHOD=smtp            # Email delivery method
SMTP_ADDRESS=                         # SMTP server address
SMTP_PORT=587                         # SMTP port
SMTP_USERNAME=                        # SMTP username
SMTP_PASSWORD=                        # SMTP password
SMTP_DOMAIN=                          # Email domain
SMTP_AUTH=plain                       # SMTP authentication method
```

---

**Deployment Status**: ✅ Server Provisioned | ⏳ Configuration Pending | ⏳
Services Pending
