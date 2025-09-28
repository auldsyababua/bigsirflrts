# Container Naming Consistency Audit

## Problem Statement

Docker Compose container names are inconsistent across the project due to
different project names being used:

- Some containers: `flrts-*` (e.g., flrts-grafana, flrts-n8n-monitor)
- Others: `docker-*-1` (e.g., docker-n8n-1, docker-postgres-1)
- This breaks tests and scripts that reference containers by hardcoded names

## Root Cause

Docker Compose uses the pattern:
`{project-name}-{service-name}-{instance-number}`

- When no project name is specified, it uses the parent directory name
- Different docker-compose files are in different directories or use different
  project names

## Audit Tasks for PM

### 1. Find All Docker Compose Files

```bash
find . -name "docker-compose*.yml" -o -name "docker-compose*.yaml" | grep -v node_modules
```

Document each file's:

- Location
- Expected project name
- Services defined
- Current container naming pattern

### 2. Search for Hardcoded Container Names

```bash
# Find all hardcoded container references
rg "flrts-n8n|docker-n8n|flrts-postgres|docker-postgres" \
  --type sh --type ts --type js --type yml \
  -g '!node_modules' -g '!*.log'
```

### 3. Test Container Name Dependencies

Run these tests to identify breaking points:

#### Test A: Check Running Container Names

```bash
docker ps --format "table {{.Names}}\t{{.Image}}" | grep -E "(n8n|postgres|redis|grafana)"
```

#### Test B: Verify Script Dependencies

```bash
# Check if scripts can find their containers
grep -r "docker exec\|docker stop\|docker restart\|docker logs" infrastructure/scripts/
```

#### Test C: Test Environment Variables

```bash
# Check for COMPOSE_PROJECT_NAME settings
find . -name ".env*" -exec grep -l "COMPOSE_PROJECT_NAME" {} \;
```

### 4. Run Integration Tests

```bash
# These will fail if container names are wrong
npm run test:integration 2>&1 | grep -E "(container|not found|Error)"
```

### 5. Standardization Checklist

- [ ] All docker-compose files use same project name
- [ ] Project name is set via `.env` file or compose config
- [ ] No hardcoded container names in scripts
- [ ] All tests use environment variables for container names
- [ ] Documentation specifies expected container names

## Recommended Solution

### Option 1: Standardize on 'flrts' Project Name

1. Add to all `.env` files:

   ```
   COMPOSE_PROJECT_NAME=flrts
   ```

2. Update all docker-compose commands:

   ```bash
   docker-compose -p flrts up -d
   ```

3. Expected container names:
   - `flrts-n8n-1`
   - `flrts-postgres-1`
   - `flrts-redis-1`
   - `flrts-grafana-1`

### Option 2: Use Environment Variables in Scripts

1. Define in `.env`:

   ```
   N8N_CONTAINER=docker-n8n-1
   POSTGRES_CONTAINER=docker-postgres-1
   ```

2. Update scripts to use:

   ```bash
   docker exec ${N8N_CONTAINER} ...
   ```

## Files Requiring Updates (Initial List)

Based on current findings:

- `/tests/integration/n8n-operational-resilience.test.ts`
- `/tests/integration/n8n-minimal-resilience.test.ts`
- `/infrastructure/scripts/run-resilience-tests.sh`
- `/infrastructure/docker/docker-compose.yml`
- `/infrastructure/docker/docker-compose.single.yml`

## Testing After Fix

1. Stop all containers:

   ```bash
   docker-compose down
   docker stop $(docker ps -aq)
   ```

2. Start with new naming:

   ```bash
   docker-compose -p flrts up -d
   ```

3. Verify names:

   ```bash
   docker ps --format "{{.Names}}" | sort
   ```

4. Run all tests:

   ```bash
   npm run test:integration
   npm run test:resilience
   ```

## Success Criteria

- [ ] All containers follow consistent naming pattern
- [ ] No hardcoded container names in code
- [ ] All tests pass with new container names
- [ ] Scripts work regardless of deployment environment
- [ ] Documentation reflects naming convention
