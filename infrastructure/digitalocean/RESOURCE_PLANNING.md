# FLRTS Single Droplet Resource Planning

## Current Droplet: s-4vcpu-8gb (4 vCPU, 8GB RAM, 160GB SSD)

### Current Allocation (Story 1.1 - OpenProject)
- **OpenProject**: 2.0 vCPU, 4.0GB RAM
- **PostgreSQL**: 1.0 vCPU, 2.0GB RAM
- **Memcached**: 0.125 vCPU, 256MB RAM
- **Cloudflared**: ~0.05 vCPU, 64MB RAM
- **Subtotal**: ~3.175 vCPU, 6.32GB RAM

### Adding (Story 1.8 - Monitoring)
- **Prometheus**: 0.15 vCPU, 320MB RAM
- **Grafana**: 0.15 vCPU, 320MB RAM
- **Jaeger**: 0.1 vCPU, 192MB RAM
- **Node Exporter**: 0.05 vCPU, 64MB RAM
- **cAdvisor**: 0.1 vCPU, 128MB RAM
- **n8n-monitor**: 0.1 vCPU, 128MB RAM
- **Subtotal**: 0.65 vCPU, 1.152GB RAM

### Future Addition (n8n Migration from Sliplane)
- **n8n**: 0.15 vCPU, 512MB RAM
- **Redis** (for n8n queue): 0.025 vCPU, 128MB RAM
- **Subtotal**: 0.175 vCPU, 640MB RAM

## Total Resource Usage
- **Current + Monitoring**: 3.825 vCPU, 7.472GB RAM
- **With future n8n**: 4.0 vCPU, 8.112GB RAM

## Resource Safety Margins
- **Current**: 96% vCPU, 93% RAM utilization
- **Post-monitoring**: 96% vCPU, 93% RAM utilization
- **Post-n8n migration**: 100% vCPU, 101% RAM utilization

## Recommendations

### Immediate (Story 1.8)
✅ **Safe to proceed** - monitoring fits within current droplet capacity

### Future n8n Migration
⚠️ **Consider droplet upgrade to s-2vcpu-4gb → s-4vcpu-8gb** when migrating n8n
- Option 1: Upgrade to s-6vcpu-12gb ($72/month vs $48/month = +$24/month)
- Option 2: Optimize existing services (reduce OpenProject to 1.5 vCPU, 3GB RAM)

### Container Orchestration Benefits
- **Single network**: All services communicate efficiently via Docker network
- **Shared resources**: Better resource utilization than separate droplets
- **Simplified management**: One droplet, one Docker Compose deployment
- **Cost efficiency**: $48/month vs $120+/month for separate droplets

### Monitoring Architecture
```
Internet → Cloudflare Tunnel → DigitalOcean Droplet
                                        ↓
                            Docker Network (flrts_network)
                                        ↓
        ┌─────────────────────────────────────────────────────┐
        │  OpenProject  │  PostgreSQL  │  Memcached  │ CF-Tunnel │
        │  (2.0/4.0G)   │  (1.0/2.0G)  │ (0.125/256M) │(0.05/64M) │
        ├─────────────────────────────────────────────────────┤
        │ Prometheus │ Grafana │ Jaeger │ Node-Exp │ cAdvisor │
        │ (0.15/320M)│(0.15/320M)│(0.1/192M)│(0.05/64M)│(0.1/128M)│
        └─────────────────────────────────────────────────────┘
```

### Port Management
- **External (via Cloudflare Tunnel)**: 80, 443 only
- **Internal (localhost only)**: 9090 (Prometheus), 3000 (Grafana), 16686 (Jaeger)
- **Container-to-container**: All monitoring ports accessible internally
- **Security**: No monitoring ports exposed to internet