# FLRTS OpenProject Infrastructure

## Overview

This directory contains all infrastructure configuration and deployment scripts
for the FLRTS OpenProject deployment on Digital Ocean.

## Directory Structure

```
infrastructure/
├── digitalocean/               # Digital Ocean specific configurations
│   ├── docker-compose.supabase.yml # Canonical Supabase-based Docker Compose
│   ├── docker-compose.monitoring.prod.yml # Production monitoring stack
│   ├── .env.production             # Environment variables template
│   └── DEPLOYMENT_GUIDE.md        # Complete deployment documentation
├── docker/                     # Local development Docker configurations
│   ├── docker-compose.yml     # Main development compose
│   └── docker-compose.monitoring.yml # Local monitoring stack
├── monitoring/                 # Consolidated monitoring configurations
│   ├── local/                # Development monitoring configs
│   │   ├── prometheus.yml    # Local Prometheus config
│   │   ├── grafana/          # Local Grafana dashboards
│   │   └── n8n-webhook-monitor.js # Webhook monitoring
│   ├── production/           # Production monitoring configs
│   │   ├── prometheus.prod.yml # Production Prometheus
│   │   ├── grafana/          # Production Grafana dashboards
│   │   └── n8n-monitor.js    # Production n8n monitoring
│   └── shared/               # Shared monitoring components
├── scripts/                    # Infrastructure operation scripts
│   ├── deploy-queue-mode.sh  # Queue mode deployment
│   ├── deploy-monitoring-remote.sh # Monitoring deployment
│   ├── generate-secure-env.sh # Secure environment generation
│   ├── health-check.sh       # Health check utilities
│   └── run-resilience-tests.sh # Resilience testing
└── README.md                  # This file
```

### Note on Script Organization

- **Infrastructure Scripts** (`/infrastructure/scripts/`): Infrastructure-specific operations like deployment, health checks, and resilience testing
- **Utility Scripts** (`/scripts/`): General-purpose tools for Cloudflare, Linear, and other integrations (see `/scripts/README.md`)

### Backward Compatibility

Symlinks are maintained for moved resources:
- `/monitoring` → `/infrastructure/monitoring/local` (for legacy references)
- `/scripts/deploy-monitoring-remote.sh` → `/infrastructure/scripts/deploy-monitoring-remote.sh`

## Current Deployment Status

### ✅ Completed

- [x] Digital Ocean Droplet provisioned (165.227.216.172)
- [x] Docker Compose configuration created
- [x] Environment template prepared
- [x] Deployment scripts ready
- [x] Documentation complete

### ⏳ Pending

- [ ] Environment variables configuration
- [ ] Cloudflare R2 bucket setup
- [ ] Cloudflare Tunnel configuration
- [ ] OpenProject deployment
- [ ] SSL/HTTPS configuration
- [ ] Initial testing

## Quick Start

### 1. Server is Already Provisioned

- **IP**: 165.227.216.172
- **Name**: flrts-openproject-prod
- **Size**: s-4vcpu-8gb
- **Region**: NYC3
- **OS**: Ubuntu 22.04 LTS

### 2. Configure Environment

```bash
# Copy and edit environment file
cp infrastructure/digitalocean/.env.production infrastructure/digitalocean/.env

# Edit with your actual values
nano infrastructure/digitalocean/.env
```

### 3. Deploy to Server

```bash
# Run automated deployment
./infrastructure/scripts/deploy.sh 165.227.216.172
```

### 4. Manual Deployment (Alternative)

```bash
# SSH to server
ssh root@165.227.216.172

# Run setup script
bash < infrastructure/scripts/setup-server.sh

# Copy files manually
scp infrastructure/digitalocean/docker-compose.supabase.yml root@165.227.216.172:/opt/flrts-openproject/docker-compose.yml
scp infrastructure/digitalocean/.env root@165.227.216.172:/opt/flrts-openproject/.env

# Start services
ssh root@165.227.216.172 "cd /opt/flrts-openproject && docker compose up -d"
```

## Key Files

### docker-compose.supabase.yml

Canonical Docker Compose configuration with:

- OpenProject Community Edition 14-slim
- Supabase PostgreSQL (single database; no local Postgres container)
- Migration init-container (db:migrate db:seed)
- Memcached for caching
- Cloudflare Tunnel for secure access

### .env.production

Template for all required environment variables:

- Supabase connection string (pooler, schema=openproject)
- OpenProject configuration
- Cloudflare R2 storage
- Cloudflare Tunnel token
- Email settings (optional)

### setup-server.sh

Automated server setup that:

- Installs Docker and Docker Compose
- Configures firewall (UFW)
- Sets up fail2ban
- Optimizes system parameters
- Creates swap space
- Installs monitoring tools

### deploy.sh

Automated deployment that:

- Runs server setup
- Copies all configuration files
- Creates necessary directories
- Sets up systemd service
- Configures automated backups
- Starts all services

## Next Steps

1. **Configure Cloudflare R2**:
   - Create bucket `openproject-files`
   - Generate API credentials
   - Add to .env file

2. **Setup Cloudflare Tunnel**:

   ```bash
   cloudflared tunnel create openproject-tunnel
   cloudflared tunnel token openproject-tunnel
   ```

   - Add token to .env file
   - Configure ingress rules in Cloudflare Dashboard

3. **Deploy OpenProject**:

   ```bash
   ./infrastructure/scripts/deploy.sh 165.227.216.172
   ```

4. **Verify Deployment**:
   - Check health: <http://165.227.216.172:8080/health_checks/default>
   - Access UI: <http://165.227.216.172:8080>
   - Complete setup wizard

5. **Secure Access**:
   - Verify Cloudflare Tunnel working
   - Remove direct port access
   - Update firewall rules

## Monitoring

### Check Service Status

```bash
ssh root@165.227.216.172 "docker ps"
```

### View Logs

```bash
ssh root@165.227.216.172 "cd /opt/flrts-openproject && docker compose logs -f"
```

### Health Check

```bash
ssh root@165.227.216.172 "/opt/flrts-openproject/scripts/health-check.sh"
```

## Troubleshooting

### Cannot Connect to Server

```bash
# Check droplet status
doctl compute droplet get 518515575
```

### Services Won't Start

```bash
# Check logs
ssh root@165.227.216.172 "docker compose logs openproject"

# Check environment
ssh root@165.227.216.172 "cat /opt/flrts-openproject/.env"
```

### High Resource Usage

```bash
# Check resource usage
ssh root@165.227.216.172 "docker stats --no-stream"

# Restart services
ssh root@165.227.216.172 "docker compose restart"
```

## Cost Summary

- Digital Ocean Droplet: $48/month
- Cloudflare R2: ~$2/month
- Cloudflare Tunnel: Free
- **Total**: ~$50/month

## Support

For issues or questions:

1. Check DEPLOYMENT_GUIDE.md for detailed instructions
2. Review Docker logs for error messages
3. Consult OpenProject documentation
4. Contact team lead for infrastructure access
