# Container Naming Inconsistency Remediation Report

## Executive Summary

Note: This report reflects legacy pre‑Supabase context. Production now uses a
single Supabase PostgreSQL instance (no local Postgres containers) per ADR‑002.

**CRITICAL ISSUE**: Docker container naming is inconsistent across the project,
causing test failures and operational issues. The project uses two naming
patterns:

- `flrts-*` (from explicit `container_name` in compose files)
- `docker-*-1` (from Docker Compose auto-generated names)

This inconsistency breaks integration tests, monitoring scripts, and potentially
remote service configurations.

## Current State Analysis

### 1. Container Naming Patterns Discovered

#### Pattern A: Explicit `flrts-*` Names (Preferred)

These containers have `container_name` explicitly set in docker-compose files:

- `flrts-openproject`
- `flrts-nlp-service`
- `flrts-telegram-bot`
- `flrts-memcached`
- `flrts-n8n`
- `flrts-cloudflared`
- `flrts-prometheus`
- `flrts-grafana`
- `flrts-jaeger`
- `flrts-node-exporter`
- `flrts-n8n-monitor`
- `flrts-cadvisor`
- `flrts-postgres` (in some configs)
- `flrts-redis` (in some configs)
- `flrts-openproject-db`
- `flrts-postgres-backup`
- `flrts-uptime-kuma`

#### Pattern B: Auto-generated `docker-*-1` Names (Problematic)

These containers lack explicit names and get auto-generated based on directory:

- `docker-n8n-1` (from infrastructure/docker/docker-compose.single.yml)
- `docker-postgres-1` (from infrastructure/docker/docker-compose.single.yml)
- `docker-nginx-1` (from infrastructure/docker/docker-compose.single.yml)
- `docker-redis-1` (referenced in tests but not always created)
- `docker-n8n-worker-1` (referenced in tests but doesn't exist in single mode)

### 2. Files Requiring Updates

#### Critical Test Files with Hardcoded Container Names

```
/tests/integration/n8n-operational-resilience.test.ts
  Lines 25-27:
    const N8N_CONTAINER = 'docker-n8n-1';
    const POSTGRES_CONTAINER = 'docker-postgres-1';
    const NGINX_CONTAINER = 'docker-nginx-1';
  Line 524: 'docker-redis-1'
  Line 528: 'docker-n8n-worker-1'

/tests/integration/n8n-queue-mode.test.ts
  Line 268: References 'docker-compose up -d n8n-worker-1'
```

#### Shell Scripts with Hardcoded Container Names

```
/infrastructure/scripts/run-resilience-tests.sh
  Line 125: docker stop docker-n8n-1
  Line 131: docker inspect docker-n8n-1
  Line 150, 159: docker exec flrts-n8n (inconsistent!)
  Line 202, 217, 312: References flrts-n8n

/infrastructure/scripts/health-check.sh
  Line 15: docker exec bigsirflrts-postgres-1 (THIRD naming pattern!)
  Line 23: docker exec bigsirflrts-redis-1
```

#### Docker Compose Files Missing container_name

```
/infrastructure/docker/docker-compose.single.yml
  Services without container_name:
    - postgres (becomes docker-postgres-1)
    - n8n (becomes docker-n8n-1)

/infrastructure/docker/docker-compose.yml
  Missing nginx service entirely (but tests expect it)
```

### 3. Environment Configuration Issues

**NO COMPOSE_PROJECT_NAME SET ANYWHERE**

- None of the .env files contain COMPOSE_PROJECT_NAME
- This causes Docker Compose to use directory name as project prefix
- Different directories = different container name prefixes

### 4. Remote Service Dependencies

#### n8n Cloud Webhooks

- May have hardcoded webhook URLs expecting specific container names
- Need to verify webhook configurations in n8n cloud dashboard

#### Supabase Webhook Configurations

- Database webhooks may reference container endpoints
- Need to check Supabase dashboard for webhook configurations

#### Monitoring Systems

- Prometheus scrape configs may target specific container names
- Grafana dashboards may have hardcoded container references

## Remediation Plan

### Phase 1: Standardize Container Naming (IMMEDIATE)

#### Step 1.1: Add COMPOSE_PROJECT_NAME to all .env files

```bash
# Add to these files:
echo "COMPOSE_PROJECT_NAME=flrts" >> ./.env
echo "COMPOSE_PROJECT_NAME=flrts" >> ./infrastructure/docker/.env
echo "COMPOSE_PROJECT_NAME=flrts" >> ./infrastructure/digitalocean/.env.production
echo "COMPOSE_PROJECT_NAME=flrts" >> ./tests/.env.test
```

#### Step 1.2: Add explicit container_name to docker-compose.single.yml

```yaml
services:
  postgres:
    container_name: flrts-postgres
    # ... rest of config

  n8n:
    container_name: flrts-n8n
    # ... rest of config
```

#### Step 1.3: Add nginx service with container_name where needed

```yaml
services:
  nginx:
    container_name: flrts-nginx
    image: nginx:alpine
    # ... config
```

### Phase 2: Update All Code References

#### Step 2.1: Update Test Files

```typescript
// /tests/integration/n8n-operational-resilience.test.ts
const N8N_CONTAINER = process.env.N8N_CONTAINER || 'flrts-n8n';
const POSTGRES_CONTAINER = process.env.POSTGRES_CONTAINER || 'flrts-postgres';
const NGINX_CONTAINER = process.env.NGINX_CONTAINER || 'flrts-nginx';
```

#### Step 2.2: Update Shell Scripts

```bash
# /infrastructure/scripts/run-resilience-tests.sh
# Replace all occurrences:
docker-n8n-1 → flrts-n8n
docker-postgres-1 → flrts-postgres
docker-nginx-1 → flrts-nginx

# /infrastructure/scripts/health-check.sh
# Fix third naming pattern:
bigsirflrts-postgres-1 → flrts-postgres
bigsirflrts-redis-1 → flrts-redis
```

#### Step 2.3: Create Environment Variable Configuration

```bash
# Create /infrastructure/config/container-names.env
export N8N_CONTAINER="flrts-n8n"
export POSTGRES_CONTAINER="flrts-postgres"
export REDIS_CONTAINER="flrts-redis"
export NGINX_CONTAINER="flrts-nginx"
export GRAFANA_CONTAINER="flrts-grafana"
export PROMETHEUS_CONTAINER="flrts-prometheus"
```

### Phase 3: Remote Service Updates

#### Step 3.1: n8n Cloud Dashboard

1. Login to n8n cloud dashboard
2. Update any webhook URLs that reference container names
3. Document all webhook endpoints for future reference

#### Step 3.2: Supabase Configuration

1. Check Supabase dashboard for database webhooks
2. Update any references to container endpoints
3. Test webhook functionality after updates

#### Step 3.3: Monitoring Configuration

1. Update Prometheus scrape configs in `/docker-compose.monitoring.yml`
2. Update Grafana dashboard queries if they reference container names
3. Verify all monitoring targets are reachable

### Phase 4: Documentation Updates

#### Files to Update

- `/docs/setup/openproject.md` - Update container references
- `/docs/stories/1.3.n8n-production-deployment.md` - Fix container names
- `/docs/qa/gates/*.yml` - Update test commands
- `/README.md` - Add container naming convention section

### Phase 5: Verification

#### Step 5.1: Stop All Containers

```bash
docker-compose down
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)
```

#### Step 5.2: Restart with New Naming

```bash
docker-compose up -d
docker ps --format "table {{.Names}}" | grep flrts
```

#### Step 5.3: Run All Tests

```bash
npm run test:integration
npm run test:resilience
./infrastructure/scripts/health-check.sh
./infrastructure/scripts/run-resilience-tests.sh
```

## Risk Assessment

### High Risk Areas

1. **Production Deployments** - Container name changes will cause downtime
2. **Remote Webhooks** - May fail until URLs are updated
3. **Monitoring** - Metrics collection will break temporarily
4. **CI/CD Pipelines** - May have hardcoded container references

### Mitigation Strategy

1. Test all changes in development environment first
2. Create rollback script before production changes
3. Schedule maintenance window for production updates
4. Have team ready to update remote configurations
5. Document all changes in deployment log

## Implementation Checklist

### Pre-Implementation

- [ ] Backup all docker-compose files
- [ ] Document current container names from `docker ps`
- [ ] List all remote webhook URLs
- [ ] Create rollback script
- [ ] Notify team of maintenance window

### Implementation

- [ ] Add COMPOSE_PROJECT_NAME to all .env files
- [ ] Update all docker-compose.yml files with container_name
- [ ] Update test files with new container names
- [ ] Update shell scripts with new container names
- [ ] Create container-names.env configuration file
- [ ] Update remote service configurations
- [ ] Update documentation

### Post-Implementation

- [ ] Verify all containers have correct names
- [ ] Run full test suite
- [ ] Verify webhook functionality
- [ ] Check monitoring dashboards
- [ ] Document lessons learned
- [ ] Update runbooks

## Expected Outcome

After implementation:

- All containers will use consistent `flrts-*` naming pattern
- Tests will pass without container name errors
- Scripts will work reliably across environments
- Remote services will maintain connectivity
- Future deployments will be predictable

## Rollback Plan

If issues occur:

1. Stop all containers: `docker-compose down`
2. Restore original docker-compose files from backup
3. Remove COMPOSE_PROJECT_NAME from .env files
4. Restart services: `docker-compose up -d`
5. Revert code changes via git
6. Update remote configurations back to original

## Timeline

- **Phase 1**: 30 minutes (Immediate standardization)
- **Phase 2**: 1 hour (Code updates)
- **Phase 3**: 2 hours (Remote service updates)
- **Phase 4**: 30 minutes (Documentation)
- **Phase 5**: 1 hour (Verification)

**Total Estimated Time**: 5 hours

## Conclusion

This container naming inconsistency is a critical issue that affects testing,
monitoring, and operational reliability. The remediation plan provides a
systematic approach to standardize on the `flrts-*` naming convention across all
environments. Implementation should be done carefully with proper testing at
each phase to minimize disruption to services.

---

_Report Generated: $(date -Iseconds)_ _Priority: HIGH_ _Impact: System-wide_
