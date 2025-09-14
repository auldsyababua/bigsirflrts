# FLRTS OpenProject Infrastructure

## Overview

This directory contains all infrastructure configuration and deployment scripts for the FLRTS OpenProject deployment on Digital Ocean.

## Directory Structure

```
infrastructure/
├── digitalocean/               # Digital Ocean specific configurations
│   ├── docker-compose.prod.yml # Production Docker Compose file
│   ├── .env.production         # Environment variables template
│   └── DEPLOYMENT_GUIDE.md    # Complete deployment documentation
├── scripts/                    # Deployment and maintenance scripts
│   ├── setup-server.sh        # Server initialization script
│   └── deploy.sh              # Automated deployment script
└── README.md                  # This file
```

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
scp infrastructure/digitalocean/docker-compose.prod.yml root@165.227.216.172:/opt/flrts-openproject/docker-compose.yml
scp infrastructure/digitalocean/.env root@165.227.216.172:/opt/flrts-openproject/.env

# Start services
ssh root@165.227.216.172 "cd /opt/flrts-openproject && docker compose up -d"
```

## Key Files

### docker-compose.prod.yml
Production-ready Docker Compose configuration with:
- OpenProject Community Edition 14
- PostgreSQL 16 (dedicated container)
- Memcached for caching
- Cloudflare Tunnel for secure access
- Automated backup service
- Resource limits optimized for 8GB RAM

### .env.production
Template for all required environment variables:
- Database credentials
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
   - Check health: http://165.227.216.172:8080/health_checks/default
   - Access UI: http://165.227.216.172:8080
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