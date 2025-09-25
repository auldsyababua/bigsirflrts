# User Story: Directory Structure Consolidation

## Story ID: INFRA-001

**Priority**: Medium **Estimated Effort**: 3 hours **Status**: PARTIALLY COMPLETE

## Story Title

As a DevOps engineer, I need to consolidate duplicate monitoring and scripts
directories to create a clear, organized infrastructure structure that
eliminates confusion and duplication.

## Background

The project currently has duplicate directories causing confusion and
maintenance overhead:

- **Monitoring**: `/monitoring/` vs `/infrastructure/digitalocean/monitoring/`
- **Scripts**: `/scripts/` vs `/infrastructure/scripts/`

This duplication leads to unclear responsibilities, potential conflicts, and
maintenance overhead.

## Acceptance Criteria

### AC1: Monitoring Directory Consolidation ✅ COMPLETE

- [x] Create unified `/infrastructure/monitoring/` structure with
      subdirectories:
  - `/infrastructure/monitoring/local/` - Local development monitoring configs
  - `/infrastructure/monitoring/production/` - Production monitoring configs
  - `/infrastructure/monitoring/shared/` - Shared monitoring components
- [x] Migrate content from `/monitoring/` to appropriate subdirectories
- [x] Update all references in docker-compose files and scripts
- [x] Remove original `/monitoring/` directory after migration

### AC2: Scripts Directory Organization

- [ ] Keep `/infrastructure/scripts/` for infrastructure-specific scripts
      (deploy, health checks, etc.)
- [ ] Keep `/scripts/` for general utility scripts (cf-wrangler, dns checks,
      setup)
- [ ] Document clear separation of responsibilities in README
- [ ] Verify all script references and imports still work

### AC3: Documentation and References

- [x] Update all docker-compose files that reference monitoring configs
- [ ] Update documentation to reflect new structure
- [ ] Update any CI/CD pipelines or automation that references old paths

## Technical Implementation Details

### Current State Analysis

```
/monitoring/                           # 11 files including package.json, n8n-monitor configs
├── grafana/
├── n8n-webhook-monitor.js
├── package.json
└── node_modules/

/infrastructure/digitalocean/monitoring/   # 6 files, production configs
├── grafana/
├── n8n-monitor.js
├── prometheus.prod.yml
└── package.json

/scripts/                              # General utilities
├── cf-wrangler
├── check-cf-dns
├── maintenance/
└── setup/

/infrastructure/scripts/               # Infrastructure operations
├── deploy-queue-mode.sh
├── health-check.sh
├── run-resilience-tests.sh
└── generate-secure-env.sh
```

### Migration Plan

1. **Phase 1**: Create new structure

   ```bash
   mkdir -p /infrastructure/monitoring/{local,production,shared}
   ```

2. **Phase 2**: Migrate monitoring files
   - Move `/monitoring/` contents to `/infrastructure/monitoring/local/`
   - Move `/infrastructure/digitalocean/monitoring/` to
     `/infrastructure/monitoring/production/`
   - Extract common components to `/infrastructure/monitoring/shared/`

3. **Phase 3**: Update references
   - Scan and update all docker-compose volume mounts
   - Update Dockerfile COPY statements
   - Update documentation

## Dev Notes

### File Reference Updates Required

```bash
# Files to check and update:
grep -r "monitoring/" --include="*.yml" --include="*.yaml"
grep -r "monitoring/" --include="Dockerfile*"
grep -r "../monitoring" --include="*.sh"
```

### Docker Compose Volume Mount Pattern

```yaml
# Before:
volumes:
  - ./monitoring/grafana:/etc/grafana

# After:
volumes:
  - ./infrastructure/monitoring/production/grafana:/etc/grafana
```

### Script Path Updates

```bash
# Before:
source ./scripts/maintenance/cleanup.sh

# After (unchanged, general utilities stay):
source ./scripts/maintenance/cleanup.sh

# Infrastructure scripts:
source ./infrastructure/scripts/health-check.sh
```

## Risk Assessment

- **Low Risk**: Primarily file movement with reference updates
- **Main Risk**: Broken volume mounts in docker-compose files
- **Mitigation**: Test all docker-compose configurations after changes

## Testing Requirements

- [x] All docker-compose configurations build successfully (validated)
- [ ] Monitoring services start correctly (pending deployment test)
- [x] All scripts execute without path errors
- [ ] CI/CD pipelines continue to work

## Dependencies

- None - can be implemented independently

## Environment Files & Secrets

### Required .env Files for Testing

The following .env files contain necessary secrets and configurations:

```bash
# Development environment
/.env                                    # Main development secrets
/infrastructure/docker/.env              # Docker-specific configs
/tests/.env.test                        # Test environment configs

# Production environment (if needed for reference)
/infrastructure/digitalocean/.env.production  # Production secrets
```

### ⚠️ CRITICAL INSTRUCTION FOR DEV AGENTS

**If you encounter ANY of the following situations, STOP AND ASK FOR HELP:**

- Missing .env files or secrets
- Authentication/credential errors
- Unable to access remote services (n8n Cloud, Supabase)
- Unclear about which environment file to use
- Any deviation from the specified implementation plan

**DO NOT:**

- Create new .env files without consultation
- Modify existing secrets or credentials
- Skip steps due to missing access
- Change the implementation approach without approval
- Assume default values for missing configurations

**Example Stop Points:**

```bash
# If this fails, STOP and ask for help:
docker-compose --env-file .env up -d

# If credentials are missing, STOP:
Error: SUPABASE_URL not found in environment

# If remote access fails, STOP:
Error: Unable to connect to n8n Cloud dashboard
```

## Definition of Done

- [ ] All monitoring files consolidated under `/infrastructure/monitoring/`
- [ ] Scripts directories maintain clear separation of concerns
- [ ] All references updated and working
- [ ] Documentation reflects new structure
- [ ] All tests pass

## Dev Agent Record

### Completion Date: 2025-09-25

### Work Completed:

#### Monitoring Consolidation ✅
- Created `/infrastructure/monitoring/` structure with `local/`, `production/`, and `shared/` subdirectories
- Migrated all files from `/monitoring/` to `/infrastructure/monitoring/local/`
- Migrated all files from `/infrastructure/digitalocean/monitoring/` to `/infrastructure/monitoring/production/`
- Updated `infrastructure/docker/docker-compose.monitoring.yml` to use `../monitoring/local/` paths
- Updated `infrastructure/digitalocean/docker-compose.monitoring.prod.yml` to use `../monitoring/production/` paths
- Updated `scripts/deploy-monitoring-remote.sh` to deploy from new production path
- Validated both docker-compose configurations successfully
- Removed old monitoring directories after successful migration

#### Files Modified:
- `infrastructure/docker/docker-compose.monitoring.yml` (3 path updates)
- `infrastructure/digitalocean/docker-compose.monitoring.prod.yml` (3 path updates)  
- `scripts/deploy-monitoring-remote.sh` (1 path update)

#### Remaining Work:
- Scripts directory organization (AC2)
- Documentation updates
- CI/CD pipeline updates (if any exist)

### Commit: ae97805

## Rollback Plan

If issues occur:

1. Restore original directory structure from git
2. Revert docker-compose file changes
3. Revert script reference updates
