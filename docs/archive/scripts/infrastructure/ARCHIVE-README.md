# Infrastructure One-Off Scripts Archive

**Archived:** 2025-10-16
**Original Path:** `/infrastructure/scripts/`
**Breadcrumb IDs:** ARCH-010, ARCH-011, ARCH-012
**Reason:** One-time deployment, setup, and rollback scripts

## What Was Here

These scripts were used for one-time infrastructure operations during early project development. They are no longer actively needed as the operations they performed were completed.

### File Inventory

| File | Size | Last Modified | Purpose |
|------|------|---------------|---------|
| deploy-queue-mode.sh | N/A | No git history | Deploy queue mode (Story 1.3) |
| generate-secure-env.sh | N/A | No git history | Generate .env files (one-time setup) |
| rollback-container-names.sh | N/A | No git history | Rollback container naming changes |

**Note:** All files have no git history, indicating they were created before repository tracking began or were never committed to version control.

## Why Archived

### One-Time Operations Complete

All scripts in this archive performed one-time operations that are now complete:

1. **Queue Mode Deployment (Story 1.3):** Feature deployed and stable
2. **Environment Generation:** .env files established, no longer need generation
3. **Container Name Rollback:** Rollback executed, naming standardized

### No Active Usage

**Evidence from codebase analysis:**
- ✅ Not referenced in package.json scripts
- ✅ Not used in GitHub workflows
- ✅ No git history (never tracked or pre-repo creation)
- ✅ No imports or calls from other scripts

### Infrastructure Evolution

**Current Infrastructure:**
- Docker Compose: Stable configuration in `docker-compose.yml`
- Environment Management: Standardized .env handling
- Container Naming: Finalized conventions in place
- Queue Mode: Active and stable since Story 1.3 completion

## Last Active

**Last Modified:** No git history available
**Estimated Creation:** September 2025 (pre-repository tracking)
**Status:** Operations completed, scripts no longer needed

**Note:** The absence of git history suggests these were created during initial project setup or were used for manual operations not intended for version control.

## Related

### Story Context

**Story 1.3 - Queue Mode:**
- Purpose: Implement message queue processing mode
- Status: Complete
- Deployment: deploy-queue-mode.sh executed
- Current: Queue mode active and stable

### Container Naming

**Rollback Context:**
- Original naming convention: Unclear (pre-standardization)
- Rollback performed: Container names reverted
- Current standard: Documented in `infrastructure/README.md`
- Script: rollback-container-names.sh executed

### Environment Management

**Current Approach:**
- `.env.example` - Template for environment variables
- `.env.local` - Local development (gitignored)
- Deployment configs - Production/staging environments
- No generation script needed - manual copy from example

### Active Infrastructure Scripts

**Not Archived (still in `/scripts/`):**
- `health-check.sh` - Service health monitoring
- `run-resilience-tests.sh` - Resilience testing
- `validate-container-naming.sh` - Container naming validation

**These remain active and are referenced in package.json or workflows.**

### Migration Documentation
- Migration mapping: `docs/.scratch/deep-audit/migration-mapping.md`
- Forensic audit: `docs/.scratch/deep-audit/forensic-audit-report.md`

## Recovery

If you need to restore these scripts for reference or historical context:

### View Git History
```bash
# These scripts have no git history
git log --all -- infrastructure/scripts/deploy-queue-mode.sh
# Output: (empty - no commits found)

git log --all -- infrastructure/scripts/generate-secure-env.sh
# Output: (empty - no commits found)

git log --all -- infrastructure/scripts/rollback-container-names.sh
# Output: (empty - no commits found)
```

### Restore from Archive
```bash
# Since no git history exists, restore from archive location
git checkout HEAD -- docs/archive/scripts/infrastructure/deploy-queue-mode.sh
git checkout HEAD -- docs/archive/scripts/infrastructure/generate-secure-env.sh
git checkout HEAD -- docs/archive/scripts/infrastructure/rollback-container-names.sh

# Copy to working location if needed
cp docs/archive/scripts/infrastructure/*.sh infrastructure/scripts/
```

### Use Cases for Recovery
- **Reference:** Understand how queue mode was deployed
- **Documentation:** Document manual deployment processes
- **Similar Operations:** Perform similar one-time infrastructure changes
- **Audit:** Review what infrastructure changes were made

## Script Details

### deploy-queue-mode.sh (ARCH-010)

**Original Location:** `/infrastructure/scripts/deploy-queue-mode.sh`
**Purpose:** Deploy queue mode feature (Story 1.3)

**Estimated Functionality:**
- Stop affected services
- Update Docker Compose configuration
- Add queue mode environment variables
- Restart services with queue mode enabled
- Verify queue processing working

**Why One-Time:**
- Feature deployed in Story 1.3
- Queue mode now part of standard configuration
- No need to re-deploy (already active)

**Current Queue Mode:**
- Configuration: `docker-compose.yml` (queue service defined)
- Environment: Queue mode variables in .env
- Monitoring: Health checks confirm queue processing
- Status: Active and stable

### generate-secure-env.sh (ARCH-011)

**Original Location:** `/infrastructure/scripts/generate-secure-env.sh`
**Purpose:** Generate .env files with secure random values

**Estimated Functionality:**
```bash
# Generate random secrets
# Create .env file from template
# Set secure permissions (chmod 600)
# Populate with generated values:
#   - Database passwords
#   - API keys
#   - JWT secrets
#   - Encryption keys
```

**Why One-Time:**
- .env files already exist and configured
- Secrets already generated and stored
- Regenerating would break existing installations
- Manual secret rotation preferred for security

**Current Approach:**
- Copy `.env.example` to `.env.local`
- Manually populate with secrets from 1Password
- Use ENV-based placeholders: `{{SECRET_NAME}}`
- Deployment configs manage production secrets

**Security Note:**
- Automatic secret generation useful for initial setup
- Not recommended for production (secrets should be managed)
- Current: 1Password for secret management (though deprecated for code references)

### rollback-container-names.sh (ARCH-012)

**Original Location:** `/infrastructure/scripts/rollback-container-names.sh`
**Purpose:** Rollback container naming changes

**Estimated Context:**
- Container naming convention changed at some point
- New convention caused issues or inconsistency
- Script reverted to previous naming scheme

**Estimated Functionality:**
```bash
# Stop all containers
# Rename containers to previous convention
# Update docker-compose.yml references
# Restart with old naming scheme
# Verify services working
```

**Why One-Time:**
- Rollback executed successfully
- Container naming now standardized
- Current naming validated and documented
- No further changes planned

**Current Container Naming:**
- Standard: Documented in `infrastructure/README.md`
- Validation: `validate-container-naming.sh` (active script)
- Enforcement: CI/CD checks ensure consistency
- No rollback needed: Current naming stable

## Infrastructure Context

### Docker Compose Setup

**Current Configuration:**
- `docker-compose.yml` - Main configuration (root)
- `infrastructure/docker/docker-compose.*.yml` - Environment-specific
- Services: Web, database, queue, monitoring (as applicable)
- Networks: Internal networking configured
- Volumes: Data persistence defined

**Evolution:**
1. Initial setup (pre-git tracking)
2. Queue mode added (Story 1.3 - deploy-queue-mode.sh)
3. Container naming standardized (rollback-container-names.sh)
4. Current stable state

### Environment Variables

**Current Management:**
- `.env.example` - Template with all required variables
- `.env.local` - Local development (gitignored)
- Deployment: Environment-specific configs
- No generation: Manual copy and populate

**Original Generation Script:**
- `generate-secure-env.sh` created initial .env
- Useful for first-time setup
- Not needed for ongoing operations

### Service Health Monitoring

**Active Scripts:**
- `scripts/health-check.sh` - Monitor service health
- Checks: Database connectivity, API responsiveness, queue processing
- Alerts: Log warnings for unhealthy services

**Superseded by:**
- Modern health checks in `docker-compose.yml`
- Container health status monitoring
- Automated restart policies

## Migration Notes

### From One-Off Scripts to Declarative Infrastructure

**Old Approach:**
- Manual scripts for each infrastructure change
- One-off deployment scripts
- Imperative "how to deploy" logic

**Current Approach:**
- Declarative `docker-compose.yml` configuration
- Infrastructure as code
- Idempotent deployments (`docker-compose up -d`)

**Benefits:**
- Reproducible deployments
- Version-controlled infrastructure
- No one-off scripts needed
- Easier onboarding for new developers

### Best Practices Learned

**From deploy-queue-mode.sh:**
- Lesson: Infrastructure changes should be in docker-compose.yml
- Action: Queue mode now declarative in compose file

**From generate-secure-env.sh:**
- Lesson: Secret generation useful for dev, risky for prod
- Action: Use secret management tools (1Password, env configs)

**From rollback-container-names.sh:**
- Lesson: Establish naming conventions early
- Action: Document standards, enforce with validation scripts

## Active Infrastructure Management

### Current Scripts (NOT Archived)

Located in `/scripts/`:
- `health-check.sh` - Service health monitoring
- `run-resilience-tests.sh` - Resilience testing
- `validate-container-naming.sh` - Naming validation

**Why Active:**
- Ongoing operations (not one-time)
- Referenced in package.json or CI/CD
- Regular execution required

### Current Infrastructure Directory

`/infrastructure/` contains:
- `aws/lambda/telegram-bot/` - Active Lambda function
- `docker/` - Docker configuration files
- `docs/` - Infrastructure documentation
- `tests/` - Infrastructure tests
- `archive/monitoring/` - Archived DigitalOcean monitoring (ADR-006)

**Note:** `/infrastructure/scripts/` directory may be empty after this archive and could be removed.

## Breadcrumbs

- **ARCH-010:** infrastructure/scripts/deploy-queue-mode.sh → docs/archive/scripts/infrastructure/
- **ARCH-011:** infrastructure/scripts/generate-secure-env.sh → docs/archive/scripts/infrastructure/
- **ARCH-012:** infrastructure/scripts/rollback-container-names.sh → docs/archive/scripts/infrastructure/

---

**Archived by:** Action Agent
**Archive Date:** 2025-10-16
**Archive Commit:** chore/directory-cleanup branch
**Migration Reference:** docs/.scratch/deep-audit/migration-mapping.md
