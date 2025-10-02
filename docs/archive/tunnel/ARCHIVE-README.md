# Cloudflare Tunnel Archive

## What Was Archived

This directory contains configuration and setup documentation for **Cloudflare
Tunnel** (cloudflared), which provided secure ingress to the self-hosted
OpenProject infrastructure.

### Files

- **CLOUDFLARE-TUNNEL-SETUP.md** - Complete tunnel setup guide including DNS
  configuration, ingress rules, and token management
- **cloudflared-config-secure.yml** - Production tunnel configuration (to be
  moved here from infrastructure/digitalocean/)
- **tunnel-config.yml** - Alternative tunnel configuration (to be moved here)

## Why It Was Deprecated

**Decision Date:** September 30, 2025 **Decision Record:**
[ADR-006 - ERPNext Hosting Migration to Frappe Cloud](../../architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md)

### Key Reasons

1. **No Longer Required**: Frappe Cloud provides native HTTPS ingress; no tunnel
   needed for backend services.
2. **Operational Complexity**: Tunnel health monitoring, token rotation, and
   ingress rule management added overhead.
3. **Single Point of Failure**: Recent tunnel failures blocked MVP rollout,
   demonstrating fragility.
4. **Access Pattern Mismatch**: ERPNext API access is HTTPS-native via Frappe
   Cloud's managed infrastructure.

## Replacement Approach

**New Access Pattern:** Direct DNS routing via Cloudflare (DNS-only mode)

### Architecture Changes

| Component         | Old (Cloudflare Tunnel)                           | New (Frappe Cloud Native) |
| ----------------- | ------------------------------------------------- | ------------------------- |
| **Ingress**       | Cloudflare Tunnel → DigitalOcean VM → Docker      | Cloudflare DNS → Frappe   |
|                   |                                                   | Cloud ingress             |
| **TLS/SSL**       | Managed by cloudflared container                  | Managed by Frappe Cloud   |
| **Configuration** | cloudflared-config-secure.yml + tunnel token      | DNS CNAME record only     |
| **Monitoring**    | Custom tunnel health checks                       | Frappe Cloud uptime SLA   |
| **Access**        | Tunnel token provisioned via Cloudflare dashboard | Public HTTPS endpoint     |

### DNS Configuration (Current)

```
ops.10nz.tools → CNAME → <frappe-cloud-site>.frappe.cloud
```

**Cloudflare Proxy:** Disabled (DNS-only / grey cloud) per Frappe Cloud
requirements

## Current Documentation

For active networking and access documentation, see:

- **Deployment**:
  [docs/deployment/FRAPPE_CLOUD_DEPLOYMENT.md](../../deployment/FRAPPE_CLOUD_DEPLOYMENT.md)
- **Architecture**:
  [docs/architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md](../../architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md)

## Historical Context

These files are preserved for:

- Understanding previous ingress patterns
- Reference if complementary services (n8n, monitoring) require tunnels
- Audit trail for networking decisions
- Cost comparison (tunnel was free; moved to managed hosting)

**Note:** Tunnel credentials and tokens in archived configs should be
**revoked** after migration validation completes.
