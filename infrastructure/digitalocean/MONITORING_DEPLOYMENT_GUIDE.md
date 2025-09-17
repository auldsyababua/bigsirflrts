# FLRTS Monitoring Stack Deployment Guide

## Overview

This guide deploys a comprehensive monitoring stack (Prometheus, Grafana, Jaeger, n8n-monitor) to the existing OpenProject DigitalOcean droplet. The monitoring services integrate with the existing Cloudflare Tunnel for secure HTTPS access.

## Architecture

```
Internet → Cloudflare Tunnel → DigitalOcean Droplet (165.227.216.172)
                                        ↓
                            Docker Network (flrts_network)
                                        ↓
    ┌─────────────────────────────────────────────────────────────┐
    │  OpenProject    │  PostgreSQL 16  │  Memcached  │ Cloudflared │
    │  (2.0/4.0G)     │  (1.0/2.0G)     │ (0.125/256M)│ (0.05/64M)  │
    ├─────────────────────────────────────────────────────────────┤
    │ Prometheus │ Grafana │ Jaeger │ Node-Exp │ cAdvisor │ n8n-Mon │
    │ (0.15/320M)│(0.15/320M)│(0.1/192M)│(0.05/64M)│(0.1/128M)│(0.1/128M)│
    └─────────────────────────────────────────────────────────────┘
```

## Prerequisites

- ✅ Existing OpenProject droplet running (Story 1.1)
- ✅ Cloudflare Tunnel configured
- ✅ SSH access to droplet (165.227.216.172)
- ✅ Docker and Docker Compose installed

## Quick Deployment

### 1. Upload Monitoring Configuration

```bash
# From your local machine
scp -r infrastructure/digitalocean/monitoring root@165.227.216.172:/root/openproject/
scp infrastructure/digitalocean/docker-compose.monitoring.prod.yml root@165.227.216.172:/root/openproject/
```

### 2. Update Cloudflare Tunnel

```bash
# Run monitoring tunnel setup (from local machine)
cd infrastructure/digitalocean
./setup-monitoring-tunnel.sh

# Follow prompts to add monitoring DNS records
```

### 3. Deploy Monitoring Stack

```bash
# On the droplet
ssh root@165.227.216.172

cd /root/openproject

# Start monitoring services
docker-compose -f docker-compose.supabase.yml -f docker-compose.monitoring.prod.yml up -d

# Verify services are running
docker-compose ps
```

### 4. Verify Access

- **Prometheus**: https://prometheus.monitoring.${DOMAIN}
- **Grafana**: https://grafana.monitoring.${DOMAIN} (admin/admin)
- **Jaeger**: https://jaeger.monitoring.${DOMAIN}
- **n8n Monitor**: https://n8n-monitor.monitoring.${DOMAIN}

## Detailed Configuration

### Resource Allocation

| Service | CPU Limit | Memory Limit | Purpose |
|---------|-----------|--------------|---------|
| Prometheus | 0.15 vCPU | 320MB | Metrics collection |
| Grafana | 0.15 vCPU | 320MB | Visualization |
| Jaeger | 0.1 vCPU | 192MB | Distributed tracing |
| Node Exporter | 0.05 vCPU | 64MB | System metrics |
| cAdvisor | 0.1 vCPU | 128MB | Container metrics |
| n8n Monitor | 0.1 vCPU | 128MB | Webhook monitoring |

**Total Added**: 0.65 vCPU, 1.152GB RAM

### Network Configuration

- **Internal Network**: `flrts_network` (shared with OpenProject)
- **External Access**: Cloudflare Tunnel only (no direct port exposure)
- **Security**: All monitoring ports bound to localhost only

### Data Persistence

- **Prometheus**: 15-day retention, 2GB storage limit
- **Grafana**: Persistent dashboards and settings
- **Jaeger**: In-memory storage (3000 traces max)

## Monitoring Configuration

### Prometheus Targets

- **Self-monitoring**: Prometheus metrics
- **System metrics**: Node Exporter (system resources)
- **Container metrics**: cAdvisor (Docker containers)
- **Application metrics**: OpenProject health checks
- **Webhook monitoring**: n8n Monitor service

### Grafana Setup

1. **Login**: https://grafana.monitoring.${DOMAIN}
   - Username: `admin`
   - Password: `admin` (change on first login)

2. **Datasource**: Prometheus automatically configured
3. **Dashboards**: Located in `/etc/grafana/provisioning/dashboards/`

### n8n Monitoring

- **Health checks**: Monitors n8n instance at `http://localhost:5678`
- **Metrics**: Available at `/metrics` endpoint
- **Logging**: Persistent logs in `/app/logs`

## Security Configuration

### Access Control

- ✅ **No public ports**: All services behind Cloudflare Tunnel
- ✅ **Localhost binding**: Direct access only via SSH tunnel
- ✅ **Container isolation**: Services communicate via Docker network
- ✅ **Cloudflare protection**: DDoS and security filtering

### Firewall Rules

```bash
# DigitalOcean firewall blocks all monitoring ports
# Only SSH (22), HTTP (80), HTTPS (443) allowed
# Cloudflare Tunnel provides secure access
```

## Troubleshooting

### Check Service Status

```bash
# View running containers
docker-compose ps

# Check service logs
docker-compose logs prometheus
docker-compose logs grafana
docker-compose logs jaeger

# Check resource usage
docker stats
```

### Common Issues

1. **Services not starting**
   ```bash
   # Check available resources
   free -h
   df -h

   # Check Docker logs
   docker-compose logs --tail=50
   ```

2. **Can't access monitoring URLs**
   ```bash
   # Verify Cloudflare Tunnel
   docker-compose logs cloudflared

   # Check DNS resolution
   nslookup prometheus.monitoring.${DOMAIN}
   ```

3. **High resource usage**
   ```bash
   # Monitor container resources
   docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
   ```

### Performance Tuning

If resource usage is high, consider:

1. **Reduce Prometheus retention**: Change from 15d to 7d
2. **Lower scrape intervals**: Increase from 30s to 60s
3. **Reduce Jaeger traces**: Lower MEMORY_MAX_TRACES from 3000 to 1000

## Backup and Recovery

### Configuration Backup

```bash
# Backup Grafana dashboards
docker exec flrts-grafana grafana-cli admin export-dash

# Backup Prometheus configuration
tar -czf monitoring-backup.tar.gz monitoring/
```

### Service Recovery

```bash
# Restart individual service
docker-compose restart prometheus

# Recreate all monitoring services
docker-compose -f docker-compose.monitoring.prod.yml down
docker-compose -f docker-compose.supabase.yml -f docker-compose.monitoring.prod.yml up -d
```

## Cost Impact

### Monthly Costs

- **No additional droplet cost**: Using existing s-4vcpu-8gb droplet
- **Bandwidth**: Minimal increase (~$1-2/month)
- **Storage**: Monitoring data within existing 160GB allocation

### Resource Efficiency

- **Single droplet**: $48/month vs $120+/month for separate monitoring droplet
- **Shared network**: Efficient container-to-container communication
- **Resource sharing**: Better utilization of available 8GB RAM

## Migration Notes

### Future n8n Migration

When migrating n8n from Sliplane to this droplet:

1. **Resource allocation**: n8n will need 0.15 vCPU, 512MB RAM
2. **Total usage**: Will reach ~100% of droplet capacity
3. **Monitoring update**: Update n8n-monitor to use local n8n instance

### Scaling Considerations

If resource usage becomes too high:

1. **Upgrade droplet**: s-4vcpu-8gb → s-6vcpu-12gb (+$24/month)
2. **Optimize services**: Reduce OpenProject allocation slightly
3. **Separate monitoring**: Move to dedicated droplet (less cost-effective)

## Maintenance

### Regular Tasks

- **Weekly**: Check Grafana dashboard for anomalies
- **Monthly**: Review Prometheus storage usage
- **Quarterly**: Update monitoring service images

### Updates

```bash
# Update monitoring stack
docker-compose pull
docker-compose -f docker-compose.supabase.yml -f docker-compose.monitoring.prod.yml up -d
```

## Success Metrics

- ✅ **All services accessible** via HTTPS
- ✅ **Resource usage** under 95% (CPU/RAM)
- ✅ **Data collection** functioning correctly
- ✅ **No service conflicts** with OpenProject
- ✅ **External monitoring** of local development services
