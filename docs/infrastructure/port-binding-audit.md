# Docker Compose Port Binding Audit

**Issue:** 10N-166 - Open ports on all interfaces in local/dev stacks **Date:**
2025-09-30 **Severity:** LOW (already properly configured in production)

## Summary

All production Docker Compose files correctly use `127.0.0.1:` prefix for
localhost-only binding. Development/local stacks intentionally use `0.0.0.0`
(implicit) for convenience, which is acceptable for local development.

## Audit Results

### ✅ Production Files (Correct - 127.0.0.1)

| File                                                             | Service     | Binding                 | Status     |
| ---------------------------------------------------------------- | ----------- | ----------------------- | ---------- |
| `infrastructure/digitalocean/docker-compose.prod.yml`            | openproject | `127.0.0.1:8080:80`     | ✅ Correct |
| `infrastructure/digitalocean/docker-compose.prod.yml`            | uptime-kuma | `127.0.0.1:3001:3001`   | ✅ Correct |
| `infrastructure/digitalocean/docker-compose.monitoring.prod.yml` | prometheus  | `127.0.0.1:9090:9090`   | ✅ Correct |
| `infrastructure/digitalocean/docker-compose.monitoring.prod.yml` | grafana     | `127.0.0.1:3000:3000`   | ✅ Correct |
| `infrastructure/digitalocean/docker-compose.monitoring.prod.yml` | jaeger UI   | `127.0.0.1:16686:16686` | ✅ Correct |
| `infrastructure/digitalocean/docker-compose.monitoring.prod.yml` | jaeger gRPC | `127.0.0.1:14250:14250` | ✅ Correct |
| `infrastructure/digitalocean/docker-compose.monitoring.prod.yml` | n8n-monitor | `127.0.0.1:3002:3002`   | ✅ Correct |
| `infrastructure/digitalocean/docker-compose.supabase.yml`        | openproject | `127.0.0.1:8080:8080`   | ✅ Correct |

**Note:** Jaeger OTLP ports (4317/4318) use `expose:` for container-to-container
communication only. Using `ports: ["4317:4317"]` would incorrectly expose them
to the host on 0.0.0.0. For container-only access, always use `expose:` instead
of `ports:`.

### ℹ️ Development/Local Files (0.0.0.0 - Acceptable)

| File                          | Service     | Binding     | Purpose       |
| ----------------------------- | ----------- | ----------- | ------------- |
| `docker-compose.yml`          | openproject | `8080:80`   | Local dev     |
| `docker-compose.yml`          | flrts-nlp   | `3000:3000` | Local dev     |
| `docker-compose.yml`          | n8n         | `5678:5678` | Local dev     |
| `infrastructure/docker/*.yml` | various     | various     | Local/testing |

## Policy

### Development (Local)

- **Allowed:** `8080:80` (implicit 0.0.0.0 bind)
- **Purpose:** Easy access from host machine, testing from mobile devices on LAN
- **Risk:** LOW - only on developer machines, never deployed

### Production (DigitalOcean, AWS, etc.)

- **Required:** `127.0.0.1:8080:80` (explicit localhost bind)
- **Purpose:** Services accessible only via Cloudflare Tunnel or internal
  network
- **Enforcement:** CI check validates production files

## Recommendations

1. ✅ **No changes needed** - Production is already correctly configured
2. ✅ **Add CI check** - Prevent regression by validating port bindings in CI
3. ✅ **Document policy** - This file serves as reference

## CI Enforcement

A pre-commit/CI check will validate:

- All files matching `infrastructure/digitalocean/*.yml` OR `**/prod.yml`
- Must use `127.0.0.1:` prefix for all port bindings
- Exception: Container-to-container ports (e.g., Jaeger OTLP on 4317)

See: `scripts/check-port-bindings.sh`
