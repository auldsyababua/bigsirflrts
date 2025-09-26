# User Story: Container Naming Standardization

## Story ID: INFRA-002

**Priority**: HIGH - Blocks testing and deployment reliability **Estimated
Effort**: 5.5 hours

## Story Title

As a DevOps engineer, I need to standardize Docker container naming across all
environments to eliminate test failures and ensure consistent operations.

## Background

Critical container naming inconsistency causes test failures and operational
issues. Three different naming patterns exist:

- `flrts-*` (correct, explicit container names)
- `docker-*-1` (auto-generated, problematic)
- `bigsirflrts-*` (found in health-check.sh)

This breaks integration tests, monitoring scripts, and remote service
configurations.

**Detailed Report**:
`/infrastructure/qa-evidence/container-naming-remediation-report.md`

### Real-World Impact Example: GitHub Actions Branch Protection

**Date**: 2025-09-25 **Issue**: PR #7 was blocked from merging despite all CI
checks passing

**Root Cause**: Inconsistent naming between workflow jobs and branch protection
rules

- Branch protection expected: `"BMAD QA Gate / qa-gate"`
- Workflows created: `"qa-gate"`

This mismatch caused a phantom "waiting for status to be reported" check that
blocked PR merging. The issue required manual intervention to update branch
protection rules.

**Lesson**: Without standardization, even successful operations can fail due to
name mismatches. This applies to:

- Container names in Docker
- Job names in CI/CD workflows
- Check names in branch protection
- Service names in monitoring
- Webhook endpoints in external services

Standardization prevents these silent failures that waste developer time and
block deployments.

## Acceptance Criteria

### AC1: Environment Configuration Standardization

- [ ] Add `COMPOSE_PROJECT_NAME=flrts` to all .env files:
  - `/.env`
  - `/infrastructure/docker/.env`
  - `/infrastructure/digitalocean/.env.production`
  - `/tests/.env.test`
- [ ] Verify environment inheritance in all docker-compose contexts

### AC2: Docker Compose File Updates

- [ ] Add explicit `container_name` fields to all services missing them
- [ ] All container names must follow `flrts-*` pattern
- [ ] Verify with `docker-compose config`

### AC3: Code Reference Updates

- [ ] Update test files to use environment variables
- [ ] Update shell scripts with correct container names
- [ ] Remove all hardcoded container references

### AC4: Remote Service Configuration Updates

- [ ] Update n8n Cloud webhook URLs if affected
- [ ] Update Supabase webhook configurations
- [ ] Update monitoring configurations
- [ ] Document all remote configuration changes

### AC5: Automated Test Validation

- [ ] Configuration validation tests pass (COMPOSE_PROJECT_NAME in all .env
      files)
- [ ] Docker Compose validation tests pass (all services have flrts- prefix)
- [ ] Runtime container validation tests pass (no docker-_-1 or bigsirflrts-_
      patterns)
- [ ] Code reference validation tests pass (no hardcoded container names)
- [ ] Integration connectivity tests pass (services connect with new names)
- [ ] Rollback validation tests pass (rollback script exists and is executable)
- [ ] Test suite execution:
      `npm test tests/integration/container-naming-validation.test.ts`
- [ ] Container naming compliance report generated successfully

## Technical Implementation Details

### Current Problem Analysis

```typescript
// PROBLEMATIC: Hardcoded in tests
const N8N_CONTAINER = 'docker-n8n-1';        // Should be 'flrts-n8n'
const POSTGRES_CONTAINER = 'docker-postgres-1'; // Should be 'flrts-postgres'

// INCONSISTENT: Mixed patterns in scripts
docker exec flrts-n8n ...              // Correct
docker stop docker-n8n-1 ...           // Wrong
docker exec bigsirflrts-postgres-1 ... // Third pattern!
```

### Files Requiring Updates

#### Test Files

```typescript
// /tests/integration/n8n-operational-resilience.test.ts
// Lines 25-27: Update container names
const N8N_CONTAINER = process.env.N8N_CONTAINER || 'flrts-n8n';
const POSTGRES_CONTAINER = process.env.POSTGRES_CONTAINER || 'flrts-postgres';
const NGINX_CONTAINER = process.env.NGINX_CONTAINER || 'flrts-nginx';
```

#### Shell Scripts

```bash
# /infrastructure/scripts/run-resilience-tests.sh
# Lines 125, 131, 150, 159, 202, 217, 312
# Replace all docker-*-1 references with flrts-*

# /infrastructure/scripts/health-check.sh
# Lines 15, 23
# Replace bigsirflrts-* with flrts-*
```

#### Docker Compose Updates

```yaml
# /infrastructure/docker/docker-compose.single.yml
services:
  postgres:
    container_name: flrts-postgres # Add this
    # ...existing config...

  n8n:
    container_name: flrts-n8n # Add this
    # ...existing config...
```

### Container Names Configuration

```bash
# Create /infrastructure/config/container-names.env
export N8N_CONTAINER="flrts-n8n"
export POSTGRES_CONTAINER="flrts-postgres"
export REDIS_CONTAINER="flrts-redis"
export NGINX_CONTAINER="flrts-nginx"
```

## Dev Notes

### Implementation Sequence

1. **Environment Setup** (30 min)
   - Add COMPOSE_PROJECT_NAME to all .env files
   - Create container-names.env configuration

2. **Docker Compose Updates** (1 hour)
   - Add container_name to all services
   - Ensure consistent flrts- prefix
   - Test with docker-compose config

3. **Code Updates** (1 hour)
   - Update test files with environment variables
   - Fix shell scripts container references
   - Search for any remaining hardcoded names

4. **Remote Services** (2 hours)
   - Check n8n Cloud dashboard
   - Update Supabase configurations
   - Verify CI/CD pipelines

5. **Testing & Verification** (1 hour)
   - Run all integration tests
   - Execute health check scripts
   - Verify monitoring

### Verification Commands

```bash
# Stop everything
docker-compose down
docker stop $(docker ps -aq)

# Restart with new naming
docker-compose up -d

# Verify names
docker ps --format "table {{.Names}}\t{{.Status}}"

# Should show:
# flrts-n8n        Up 2 minutes
# flrts-postgres   Up 2 minutes
# flrts-redis      Up 2 minutes
# flrts-nginx      Up 2 minutes

# Run tests
npm run test:integration
npm run test:resilience
./infrastructure/scripts/health-check.sh
```

## Risk Assessment

- **HIGH RISK**: Production downtime during container rename
- **MEDIUM RISK**: Remote webhook failures until URLs updated
- **MEDIUM RISK**: Monitoring disruption during transition
- **LOW RISK**: Test failures during development

### Mitigation Strategy

- Test all changes in development first
- Create rollback script before production changes
- Schedule maintenance window
- Have team ready for remote configuration updates
- Document all changes

## Testing Requirements

### Automated Test Suite

- [ ] Run full test suite:
      `npm test tests/integration/container-naming-validation.test.ts`
- [ ] All configuration validation tests pass
- [ ] All Docker Compose validation tests pass
- [ ] All runtime container validation tests pass
- [ ] All code reference validation tests pass
- [ ] All integration connectivity tests pass
- [ ] All rollback validation tests pass

### Pre-Implementation

- [ ] Backup all docker-compose files
- [ ] Document current container names
- [ ] List all remote webhook URLs
- [ ] Create rollback script
- [ ] Run baseline test to document current state:
  ```bash
  docker ps --format "{{.Names}}" | grep -E "(docker-|bigsirflrts-)" > baseline.txt
  ```

### During Implementation

- [ ] Verify container names after each phase
- [ ] Test after each major change
- [ ] Keep detailed change log
- [ ] Run validation tests after each component update:

  ```bash
  # Validate environment files
  grep -l "COMPOSE_PROJECT_NAME=flrts" .env infrastructure/docker/.env tests/.env.test

  # Verify docker-compose configuration
  docker-compose config | grep "container_name:" | grep -v "flrts-" && echo "FAIL" || echo "PASS"

  # Check container runtime names
  docker ps --format "{{.Names}}" | grep -v "^flrts-" && echo "Non-compliant containers found"
  ```

### Post-Implementation

- [ ] All containers use flrts-\* pattern
- [ ] All tests pass (integration, resilience, and new validation tests)
- [ ] Remote services connected
- [ ] Monitoring operational
- [ ] Container naming compliance report generated
- [ ] No references to `docker-*-1` or `bigsirflrts-*` patterns remain

## Dependencies and Blockers

- **Dependency**: Access to n8n Cloud dashboard
- **Dependency**: Access to Supabase dashboard
- **Blocker**: Production maintenance window required

## Environment Files & Secrets

### Required .env Files

**ALL of these files need to be updated with `COMPOSE_PROJECT_NAME=flrts`:**

```bash
# Development environment
/.env                                    # Main development secrets
/infrastructure/docker/.env              # Docker-specific configs
/tests/.env.test                        # Test environment configs

# Production environment
/infrastructure/digitalocean/.env.production  # Production secrets
```

### Critical Secrets Required

The following secrets must be available in the .env files:

```bash
# n8n Configuration
N8N_HOST=              # n8n instance URL
N8N_API_KEY=           # For n8n Cloud API access
N8N_WEBHOOK_URL=       # Base webhook URL

# Supabase Configuration
SUPABASE_URL=          # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=  # Service role key
SUPABASE_ANON_KEY=     # Anonymous key

# Database Configuration
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=

# Container Configuration (to be added)
COMPOSE_PROJECT_NAME=flrts  # ADD THIS TO ALL .env FILES
```

### ⚠️ CRITICAL INSTRUCTION FOR DEV AGENTS

**STOP AND ASK FOR HELP if you encounter ANY of these situations:**

1. **Missing Secrets or .env Files:**

   ```bash
   # If any of these fail, STOP:
   test -f .env || echo "STOP: .env file missing"
   grep "N8N_API_KEY" .env || echo "STOP: N8N_API_KEY missing"
   grep "SUPABASE_URL" .env || echo "STOP: SUPABASE_URL missing"
   ```

2. **Remote Service Access Issues:**
   - Cannot access n8n Cloud dashboard at <https://app.n8n.cloud>
   - Cannot access Supabase dashboard at <https://app.supabase.com>
   - API authentication failures
   - Webhook URL updates fail

3. **Container Naming Conflicts:**

   ```bash
   # If this shows unexpected names, STOP:
   docker ps --format "{{.Names}}" | grep -v "flrts-"
   ```

4. **Test Failures After Changes:**
   - Integration tests fail with connection errors
   - Health check scripts cannot find containers
   - Monitoring loses connection to services

**DO NOT:**

- Create new .env files without explicit approval
- Modify existing secrets or generate new API keys
- Skip steps due to missing access credentials
- Change the container naming pattern from `flrts-*`
- Proceed with partial implementation if blockers exist
- Assume default values for missing configurations

**Example Stop Points:**

```bash
# STOP if this fails:
docker-compose --env-file .env config | grep -q "container_name" || \
  echo "STOP: container_name not being set properly"

# STOP if credentials missing:
curl -H "Authorization: Bearer $N8N_API_KEY" https://api.n8n.cloud/api/v1/workflows || \
  echo "STOP: Cannot access n8n Cloud API"

# STOP if Supabase unreachable:
curl -H "apikey: $SUPABASE_ANON_KEY" $SUPABASE_URL/rest/v1/ || \
  echo "STOP: Cannot access Supabase API"

# STOP if remote webhook configuration needed:
echo "STOP: Need manual access to update webhook URLs in n8n Cloud dashboard"
echo "STOP: Need manual access to update Supabase webhook configurations"
```

### Required Manual Access Points

**The following require manual intervention - STOP and request help:**

1. **n8n Cloud Dashboard:**
   - URL: <https://app.n8n.cloud>
   - Need: Update webhook URLs if they reference container names
   - Need: Verify workflow configurations after container rename

2. **Supabase Dashboard:**
   - URL: <https://app.supabase.com>
   - Need: Update webhook endpoint configurations
   - Need: Verify database connection strings

3. **CI/CD Systems:**
   - If using GitHub Actions: Check `.github/workflows/`
   - If using other CI: Request access details

## Rollback Plan

```bash
#!/bin/bash
# rollback-container-names.sh

# 1. Stop all containers
docker-compose down

# 2. Restore original docker-compose files
git checkout HEAD -- infrastructure/docker/docker-compose*.yml

# 3. Remove COMPOSE_PROJECT_NAME from .env
sed -i '/COMPOSE_PROJECT_NAME/d' .env
sed -i '/COMPOSE_PROJECT_NAME/d' infrastructure/docker/.env

# 4. Restart services
docker-compose up -d

# 5. Revert code changes
git checkout HEAD -- tests/integration/*.test.ts
git checkout HEAD -- infrastructure/scripts/*.sh
```

## Definition of Done

- [ ] All containers consistently use flrts-\* naming
- [ ] All integration and resilience tests pass
- [ ] Remote webhook configurations updated and tested
- [ ] Monitoring systems operational
- [ ] Documentation updated
- [ ] Rollback procedure verified

## Support Resources

- Container naming report:
  `/infrastructure/qa-evidence/container-naming-remediation-report.md`
- Current audit: `docker ps --format "table {{.Names}}\t{{.Status}}"`
- Test command: `npm run test:resilience`
