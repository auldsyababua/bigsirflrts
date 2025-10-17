# Archived Scripts

**Updated:** 2025-10-16

This directory contains scripts that are no longer actively used due to completed migrations, superseded functionality, or one-time setup completion.

---

## Subdirectories

### linear-migration/
**Breadcrumbs:** ARCH-002 through ARCH-006
**Archived:** 2025-10-16
**Reason:** One-time OpenProject → Linear migration complete

See [linear-migration/ARCHIVE-README.md](linear-migration/ARCHIVE-README.md) for details.

### cloudflare/
**Breadcrumbs:** ARCH-007, ARCH-008, ARCH-009
**Archived:** 2025-10-16
**Reason:** Deprecated scripts with hardcoded paths, one-time R2 setup

See [cloudflare/ARCHIVE-README.md](cloudflare/ARCHIVE-README.md) for details.

### infrastructure/
**Breadcrumbs:** ARCH-010, ARCH-011, ARCH-012
**Archived:** 2025-10-16
**Reason:** One-time deployment and setup scripts

See [infrastructure/ARCHIVE-README.md](infrastructure/ARCHIVE-README.md) for details.

---

## Root-Level Archived Scripts

### Test Setup Scripts (ARCH-013, ARCH-014)

**Archived:** 2025-10-16
**Original Locations:**
- `/scripts/setup-test-env.sh` (ARCH-013)
- `/scripts/setup/setup-smart-search.sh` (ARCH-014)

#### setup-test-env.sh (ARCH-013)
**Last Modified:** 2025-09-14
**Reason:** Superseded by validate-test-env.sh
**Replacement:** `scripts/validate-test-env.sh` (active)

**Original Purpose:**
- Set up test environment variables
- Create test database
- Seed test data
- Configure test dependencies

**Why Superseded:**
- validate-test-env.sh provides better validation
- CI/CD now uses validate-test-env.sh
- Setup functionality integrated into CI workflows

**Recovery:**
```bash
git log --all -- scripts/setup-test-env.sh
git checkout <commit-hash> -- scripts/setup-test-env.sh
```

#### setup-smart-search.sh (ARCH-014)
**Last Modified:** Sep 24 (no git history)
**Reason:** One-time setup script
**Status:** Setup complete

**Original Purpose:**
- Configure smart search functionality
- Set up search indexes
- Initialize search API keys
- Test search integration

**Why One-Time:**
- Search infrastructure configured
- Indexes created and working
- API keys established
- No need to re-run setup

**Recovery:**
```bash
git log --all -- scripts/setup/setup-smart-search.sh
git checkout <commit-hash> -- scripts/setup/setup-smart-search.sh
```

---

## Earlier Archives (Pre-2025-10-16)

### Cloudflare Tunnel Scripts (2025-10-02)

**Archived:** 2025-10-02
**Reason:** Superseded by Frappe Cloud migration ([ADR-006](../../architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md))

- `setup-tunnel.sh` - Cloudflare Tunnel configuration automation
- `setup-cloudflare.sh` - Cloudflare DNS and tunnel orchestration

**Why Deprecated:** Frappe Cloud provides managed hosting with built-in SSL/CDN via Cloudflare integration. Custom tunnel setup is no longer required.

### OpenProject Administration (2025-10-02)

- `fix_admin_password.rb` - OpenProject admin password reset utility

**Why Deprecated:** OpenProject backend replaced by ERPNext on Frappe Cloud. Admin access now managed through Frappe Cloud dashboard.

### Monitoring Deployment (2025-10-02)

- `deploy-monitoring-remote.sh` - Remote monitoring stack deployment (referenced cloudflared)

**Why Deprecated:** Self-hosted monitoring infrastructure replaced by Frappe Cloud's native monitoring and observability tools.

---

## Replacement Approach

### Current Infrastructure
- **Hosting:** Frappe Cloud managed infrastructure (ops.10nz.tools)
- **SSL/CDN:** Automatic via Frappe Cloud Cloudflare integration
- **Admin Access:** Frappe Cloud dashboard → Site Management
- **Monitoring:** Frappe Cloud built-in metrics + custom app telemetry

### Current Scripts (Active)
Located in `/scripts/` (not archived):
- `bmad-qa-gate.sh` - QA gate for CI/CD
- `security-review.sh` - Security scanning
- `test-like-github.sh` - Local CI testing
- `validate-test-env.sh` - Test environment validation
- `check-port-bindings.sh` - Production port security
- `ssh-frappe-bench.sh` - SSH to Frappe Cloud bench
- `pre-commit-ci-check.sh` - Pre-commit hooks

See current deployment procedures:
- [FRAPPE_CLOUD_DEPLOYMENT.md](../../deployment/FRAPPE_CLOUD_DEPLOYMENT.md)
- Migration mapping: `docs/.scratch/deep-audit/migration-mapping.md`

---

## Breadcrumb Index

**Root Scripts:**
- ARCH-013: setup-test-env.sh → docs/archive/scripts/
- ARCH-014: setup-smart-search.sh → docs/archive/scripts/

**Subdirectories:**
- ARCH-002 through ARCH-006: linear-migration/
- ARCH-007 through ARCH-009: cloudflare/
- ARCH-010 through ARCH-012: infrastructure/

---

**Last Updated:** 2025-10-16
**Migration Reference:** docs/.scratch/deep-audit/migration-mapping.md

## Maintenance Scripts

**Archived Date:** 2025-10-17
**Original Location:** /scripts/maintenance/

### cleanup.sh

Context cleanup script - removes archive node_modules and large binaries.

- Size: 2061 bytes
- Last Modified: Sep 24 (no git history)
- Not in package.json
- Purpose: One-time cleanup of archive directories and duplicate node_modules

### fix-node-modules.sh

npm workspaces setup script.

- Size: 2931 bytes
- Last Modified: Sep 24 (no git history)
- Not in package.json
- Purpose: One-time migration to npm workspaces (already complete)

### Why Archived

- One-time operations already completed
- Not referenced in package.json scripts
- No git history (created before repo tracking)
- npm workspaces already configured
- Archive cleanup no longer needed

### Recovery

```bash
git log --all -- scripts/maintenance/cleanup.sh
git log --all -- scripts/maintenance/fix-node-modules.sh
git checkout <commit-hash> -- scripts/maintenance/<script-name>
```

### Breadcrumbs

- EVAL-004: scripts/maintenance/cleanup.sh
- EVAL-005: scripts/maintenance/fix-node-modules.sh
