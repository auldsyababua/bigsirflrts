# Deep Forensic Repository Audit

**Date:** 2025-10-16
**Auditor:** Research Agent
**Scope:** Full repository structure analysis
**Repository:** BigSirFLRTS

---

## Executive Summary

**Total Items Audited:** 23 root-level items + 8 major directories with deep subdirectory analysis
**Active Files:** ~40 files (core infrastructure, scripts, configs)
**Obsolete Files:** ~25+ files (Supabase migrations, OpenProject configs, one-off research)
**One-Off Scripts:** ~10 scripts (migrations, one-time setup)
**Misplaced Files:** ~15 files (erpnext-admin-map/, lib/, flrts_extensions/, tmp logs)

### Recommendations Summary

- **Archive:** 25+ files (database/, one-off scripts, obsolete configs)
- **Delete:** 2 files (tmp-sec.log, security-findings.json - should be gitignored)
- **Consolidate:** 8 directories (merge infrastructure/scripts into scripts/, move erpnext-admin-map to docs/research/)
- **Move:** 5 items (flrts_extensions/ to external repo, lib/ contents to packages/)
- **Keep as-is:** 12 files (active scripts, core configs, docker-compose.yml)

### Critical Findings

1. **flrts_extensions/** at root - According to .project-context.md (line 129-132), this custom ERPNext app belongs in external repo `/Users/colinaulds/Desktop/flrts-extensions`, NOT in this repository
2. **database/** - Entire directory is obsolete Supabase migrations (confirmed per .project-context.md ADR-006: Supabase deprecated for primary backend)
3. **erpnext-admin-map/** - One-time research screenshots from Oct 7, should move to docs/research/
4. **lib/linear-integration.js** - Single file, last modified Sep 22, no imports found in codebase
5. **security-findings.json + tmp-sec.log** - Should be gitignored, not tracked

---

## Audit by Directory

### /scripts (18 files + 3 subdirs)

**Last Modified Range:** Sep 22, 2025 - Oct 13, 2025

#### Active Scripts (Keep)

| File | Purpose | Last Modified | Used By | Classification |
|------|---------|---------------|---------|----------------|
| **bmad-qa-gate.sh** | Universal QA gate for CI/CD | 2025-09-29 | package.json (`npm run qa:gate`) | **ACTIVE** |
| **security-review.sh** | Security vulnerability scanning | 2025-10-03 | .github/workflows/security.yml | **ACTIVE** |
| **test-like-github.sh** | Local CI testing | 2025-09-30 | package.json (`npm run test:ci-local`) | **ACTIVE** |
| **validate-test-env.sh** | Test environment validation | 2025-09-28 | package.json (`npm run test:ci-validate`) | **ACTIVE** |
| **check-port-bindings.sh** | Production port security validation | 2025-09-30 | Security checks | **ACTIVE** |
| **ssh-frappe-bench.sh** | SSH access to Frappe Cloud bench | 2025-10-13 | Manual operations | **ACTIVE** |
| **pre-commit-ci-check.sh** | Pre-commit hook for CI | 2025-09-28 | Git hooks | **ACTIVE** |

**Recommendation:** **KEEP** - All actively used in CI/CD or manual operations

---

#### One-Off Migration Scripts (Archive)

| File | Purpose | Last Modified | One-Time Use | Recommendation |
|------|---------|---------------|--------------|----------------|
| **migrate-to-linear.js** | Full Linear migration | 2025-09-29 | Migration complete | **ARCHIVE** |
| **migrate-to-linear-simple.js** | Simplified Linear migration | 2025-09-29 | Migration complete | **ARCHIVE** |
| **setup-linear.js** | Initial Linear setup | 2025-09-22 | Setup complete | **ARCHIVE** |
| **setup-linear-cycles.js** | Linear cycle configuration | 2025-09-22 | Setup complete | **ARCHIVE** |

**Evidence:**
- Last modified Sep 22-29, no recent activity
- No imports in active code
- Linear integration now stable (10N-275 master dashboard established)

**Recommendation:** **ARCHIVE** to `docs/archive/scripts/linear-migration/`

---

#### Operational Scripts (Evaluate)

| File | Purpose | Last Modified | Status | Recommendation |
|------|---------|---------------|--------|----------------|
| **linear-cli.js** | Linear command-line interface | 2025-09-22 | No usage in package.json | **EVALUATE** |
| **linear-webhook.js** | Linear webhook handler | 2025-09-22 | Workflow may use | **EVALUATE** |
| **push-docs-to-linear.js** | Sync docs to Linear | 2025-09-22 | No workflow usage found | **ARCHIVE** |

**Investigation needed:**
- Check if linear-webhook.js used by .github/workflows/linear-*.yml
- Check if linear-cli.js used for manual operations

---

#### Deprecated Cloudflare Scripts (Archive)

| File | Purpose | Last Modified | Technology Status | Recommendation |
|------|---------|---------------|-------------------|----------------|
| **cf-wrangler** | Cloudflare Workers deployment wrapper | No git history | Hardcoded path: `/Users/colinaulds/Desktop/projects/bigsirflrts` | **ARCHIVE** |
| **check-cf-dns** | Cloudflare DNS verification | No git history | Hardcoded path + manual env sourcing | **ARCHIVE** |

**Evidence:**
- Hardcoded absolute paths (anti-pattern for portable code)
- Not referenced in package.json or workflows
- Cloudflare R2 optional per .project-context.md

**Recommendation:** **ARCHIVE** to `docs/archive/scripts/cloudflare/`

---

#### Test Setup Scripts (Archive)

| File | Purpose | Last Modified | Status | Recommendation |
|------|---------|---------------|--------|----------------|
| **setup-test-env.sh** | Test environment setup | 2025-09-14 | Replaced by validate-test-env.sh | **ARCHIVE** |

**Recommendation:** **ARCHIVE** - Superseded by validate-test-env.sh

---

#### Subdirectories

**scripts/dev/**
- `preview-globs.sh` - Last modified Oct 13, 2025 - **KEEP** (development utility)

**scripts/maintenance/**
- `cleanup.sh` - Sep 24, no git history - **EVALUATE** (check if used)
- `fix-node-modules.sh` - Sep 24, no git history - **EVALUATE** (check if used)

**scripts/setup/**
- `setup-smart-search.sh` - Sep 24, no git history - **ARCHIVE** (one-time setup)

---

### /database (ENTIRE DIRECTORY - OBSOLETE)

**Purpose:** Supabase PostgreSQL migrations and schema definitions
**Last Activity:** 2025-09-30 (migration 002_openproject_schema.sql)
**Status:** **OBSOLETE** per ADR-006

**Evidence from .project-context.md (lines 21-36):**
```markdown
**❌ Supabase as Primary Backend** → ✅ ERPNext (ADR-006)
- Supabase hosting (PostgreSQL) deprecated for primary data storage
- **Current use:** Analytics/audit logging ONLY (not primary backend)
- Do NOT create new Supabase tables for primary data
- Migration decision: ADR-006 (2025-09-30)
```

**Database README.md states:**
- "Single Supabase PostgreSQL 15.8 database"
- "public schema: FLRTS tables"
- "openproject schema: OpenProject tables"
- Both OpenProject and Supabase deprecated per ADR-006

**Contents:**
- `migrations/` (4 SQL files: initial schema, OpenProject schema, FLRTS features, monitoring views)
- `seeds/` (development.sql, test.sql)
- `README.md` (references deprecated architecture)

**Recommendation:** **ARCHIVE ENTIRE DIRECTORY** to `docs/archive/supabase-migrations/`

**Rationale:**
- Supabase no longer primary backend (ERPNext only)
- OpenProject shut down Sep 30, 2025
- Migrations serve historical reference only
- No active development on Supabase schema

---

### /erpnext-admin-map (One-Time Research - MISPLACED)

**Purpose:** ERPNext admin interface screenshots for documentation
**Created:** 2025-10-07
**Last Modified:** 2025-10-13 (README.md)

**Contents:**
- README.md (describes screenshot collection for ERPNext-admin-map.md)
- 8 PNG screenshots:
  - customer-list.png (57 KB)
  - item-list.png (55 KB)
  - item-form-has-serial.png (126 KB)
  - serialno-list.png (52 KB)
  - serialno-detail-link-to-item.png (78 KB)
  - maintenance-visit-list.png (66 KB)
  - maintenance-visit-form.png (78 KB)
  - admin-api-access-redacted.png (98 KB)

**README states:** "Ping Planning so Action/Docs can wire them into ERPNext-admin-map.md"

**Analysis:**
- **One-time research** - Screenshots captured once, not updated regularly
- **Misplaced** - Should live in docs/research/ or docs/erpnext/research/
- **Size:** 610 KB total (acceptable for documentation)
- **Status:** Complete (8/8 screenshots present per README)

**Recommendation:** **MOVE** to `docs/erpnext/research/admin-interface-screenshots/`

**Rationale:**
- Root-level directories should be active development, not one-off research
- docs/erpnext/research/ already exists for ERPNext analysis
- Follows project convention (research in docs/)

---

### /lib (Single File - CONSOLIDATE)

**Contents:** `linear-integration.js` (5.9 KB)

**File Analysis:**

| Property | Value |
|----------|-------|
| Purpose | Linear integration module for BigSirFLRTS |
| Last Modified | 2025-09-22 |
| Last Commit | "fix: add missing linting and formatting config files for QA gate" |
| Imports Found | **NONE** (searched entire codebase) |
| Dependencies | `@linear/sdk` |

**File Header:**
```javascript
/**
 * Linear Integration Module for BigSirFLRTS
 * Provides direct access to Linear as Single Source of Truth
 */
```

**Code Inspection:**
- Exports `LinearIntegration` class
- Hardcoded projectId and teamId
- Methods: getCurrentUser(), getProject(), etc.

**Dependency Check:**
```bash
$ rg "linear-integration" --type ts --type js -g '!node_modules' -g '!archive'
# Result: No matches (not imported anywhere)
```

**Recommendation:** **CONSOLIDATE OR ARCHIVE**

**Options:**
1. **Move to packages/linear-client/** if intended as shared library
2. **Archive** if superseded by @linear/sdk direct usage
3. **Delete** if unused prototype

**Rationale:**
- Single-file directory is anti-pattern
- No imports = not actively used
- Last meaningful change was linting fix, not feature work

---

### /infrastructure

**Structure:**
```
infrastructure/
├── archive/monitoring/        # Already archived DigitalOcean monitoring
├── aws/lambda/telegram-bot/   # Active Lambda function
├── cloudflare/setup-r2.sh     # One-off R2 setup
├── docker/                    # Docker Compose configs (3 files)
├── docs/                      # Infrastructure docs
├── github-runner/.env         # GitHub runner config
├── qa-evidence/               # QA artifacts
├── scripts/                   # 8 infrastructure scripts
├── tests/                     # Infrastructure tests
├── README.md
└── RUNNER-MIGRATION.md
```

---

#### infrastructure/archive/monitoring (Already Archived)

**Status:** ✅ **ALREADY ARCHIVED** (per commit 36f8b74 "chore: archive obsolete infrastructure and cleanup directories")

**Contents:** DigitalOcean monitoring configs (moved Oct 16, 2025 per ADR-006)

**Recommendation:** **KEEP AS-IS** (already in archive/)

---

#### infrastructure/aws/lambda/telegram-bot (Active)

**Purpose:** Telegram bot Lambda function
**Last Modified:** 2025-10-13
**Status:** **ACTIVE**

**Recommendation:** **KEEP** - Production Lambda function for ERPNext Telegram integration

---

#### infrastructure/cloudflare/setup-r2.sh (One-Off Script)

**Purpose:** Cloudflare R2 bucket setup
**Last Modified:** 2025-09-22
**Size:** 4.3 KB
**Status:** One-time setup script

**Recommendation:** **ARCHIVE** to `docs/archive/scripts/cloudflare/setup-r2.sh`

**Rationale:**
- Setup scripts are one-time use
- R2 optional per .project-context.md ("optional Cloudflare R2 via marketplace app")

---

#### infrastructure/docker/ (Active Configs)

**Contents:**
- `docker-compose.yml` (6.6 KB) - Main compose file
- `docker-compose.single.yml` (4.2 KB) - Single-container mode
- `docker-compose.monitoring.yml` (3.2 KB) - Monitoring stack
- `nginx/`, `postgres/`, `redis/` subdirs with configs

**Last Modified:** 2025-09-24 to Oct 13, 2025
**Status:** **ACTIVE** (referenced in root docker-compose.yml)

**Recommendation:** **KEEP** - Active Docker configurations

**Note:** Check if all 3 compose files still needed or if consolidation possible

---

#### infrastructure/scripts/ (8 scripts)

**Active Scripts:**
| File | Purpose | Status |
|------|---------|--------|
| health-check.sh | Service health monitoring | **ACTIVE** |
| run-resilience-tests.sh | Resilience testing | **ACTIVE** (package.json) |
| validate-container-naming.sh | Container naming validation | **ACTIVE** |

**One-Off Scripts:**
| File | Purpose | Recommendation |
|------|---------|----------------|
| deploy-queue-mode.sh | Deploy queue mode (Story 1.3) | **ARCHIVE** |
| generate-secure-env.sh | Generate .env files | **ARCHIVE** (setup) |
| rollback-container-names.sh | Rollback container names | **ARCHIVE** |

**Recommendation:** **CONSOLIDATE** infrastructure/scripts/ into root /scripts/

**Rationale (from scripts/README.md):**
```markdown
## Usage Guidelines
1. **General Utilities Only**: This directory is for general-purpose scripts.
   Infrastructure-specific scripts belong in `/infrastructure/scripts/`
```

**Counter-argument:** Only 3 active infrastructure scripts vs 7 active general scripts. Consolidation reduces directory depth.

---

#### infrastructure/github-runner/

**Contents:** `.env` file only (GitHub runner config)

**Status:** Minimal configuration
**Recommendation:** **EVALUATE** - Check if still needed or if config moved elsewhere

---

### /packages

**Structure:**
```
packages/
├── archive/           # Already archived packages
├── flrts-extension/   # Browser extension for OpenProject
└── nlp-service/       # NLP parsing service
```

---

#### packages/archive/ (Already Archived)

**Status:** ✅ **ALREADY ARCHIVED**
**Recommendation:** **KEEP AS-IS**

---

#### packages/flrts-extension/ (Obsolete Browser Extension)

**Purpose:** Chrome extension for OpenProject natural language task creation
**Last Modified:** 2025-09-24
**Technology:** OpenProject integration
**Status:** **OBSOLETE**

**Evidence from manifest.json:**
```json
{
  "name": "FLRTS for OpenProject",
  "description": "Natural language task creation for OpenProject",
  "host_permissions": [
    "http://localhost:8080/*",
    "https://*.openproject.com/*",
    "https://*.openproject.org/*"
  ]
}
```

**Contents:**
- `manifest.json` (966 bytes)
- `content.js` (10.7 KB)

**Analysis:**
- Targets OpenProject (shut down Sep 30, 2025 per .project-context.md)
- No ERPNext equivalent needed (direct API access preferred)
- Last modified before OpenProject shutdown

**Recommendation:** **ARCHIVE** to `packages/archive/flrts-extension/`

**Rationale:**
- OpenProject deprecated (ADR-006)
- Browser extensions not part of ERPNext strategy
- Small size (11 KB) - archive for historical reference

---

#### packages/nlp-service/ (Evaluate)

**Purpose:** NLP service for parsing task requests (OpenAI GPT-4o)
**Last Modified:** 2025-09-28 (package-lock.json)
**Status:** **UNCLEAR** - Uses OpenProject + Supabase (both deprecated)

**README.md Analysis:**

**Stated Purpose:**
> "Natural Language Processing service that parses task requests into structured OpenProject work packages."

**Dependencies (from README):**
- ✅ OpenAI GPT-4o parsing
- ❌ Supabase integration for logging (deprecated)
- ❌ OpenProject work packages (deprecated)

**Features:**
- POST /parse - Parse natural language to structured task
- Reasoning capture for debugging
- Supabase logging
- Hardcoded team/site data

**Contents:**
- src/ (7 files)
- dist/ (compiled output)
- tests/
- package.json, tsconfig.json
- instrumentation.ts (OpenTelemetry)

**Next Steps from README:**
> "1. **Connect to OpenProject API** - Transform parsed tasks into actual work packages"

**Analysis:**
- Built for deprecated OpenProject backend
- Supabase logging (deprecated for primary data)
- May need refactor for ERPNext DocType creation
- OpenTelemetry instrumentation (aligned with ADR-007)

**Recommendation:** **DECISION REQUIRED**

**Options:**
1. **Refactor** - Adapt for ERPNext Task DocType creation (if NLP still desired)
2. **Archive** - If direct ERPNext Task creation preferred over NLP parsing
3. **Keep as research** - If planning future NLP integration

**Question for Planning:** Is NLP task parsing still a priority with ERPNext backend?

---

### /flrts_extensions (ROOT DIRECTORY - MISPLACED)

**Critical Finding:** This directory should NOT be in this repository

**Evidence from .project-context.md (lines 126-132):**
```markdown
- **Custom App:** flrts_extensions deployed via Git push-to-deploy
  - **External Repository:** `/Users/colinaulds/Desktop/flrts-extensions`
  - **GitHub:** `auldsyababua/flrts-extensions`
  - **Note:** NOT included in this monorepo (removed 2025-10-16)
  - **To modify:** Edit files in `/Users/colinaulds/Desktop/flrts-extensions` and push to deploy
```

**Current Location:** `/Users/colinaulds/Desktop/bigsirflrts/flrts_extensions/`
**Expected Location:** `/Users/colinaulds/Desktop/flrts-extensions/` (external repo)

**Contents:**
- `.env.example` (Telegram bot config)
- `flrts_extensions/` (nested directory)
  - `automations/`
  - `tests/`
  - `utils/`

**Git History:** Present in current repo (but should be removed per Oct 16 note)

**Recommendation:** **REMOVE FROM REPOSITORY**

**Action Plan:**
1. Verify external repo `/Users/colinaulds/Desktop/flrts-extensions` has latest code
2. Add `/flrts_extensions` to `.gitignore`
3. Remove from this repository
4. Update documentation to reference external repo only

**Rationale:**
- Project standards clearly state this belongs in external repo
- Mixing Frappe custom app with main repo violates separation of concerns
- Frappe Cloud deployment expects separate Git repo

---

### /config/linting (Consolidate to Root)

**Purpose:** Markdown linting configuration
**Contents:**
- `.markdownlint.json` (134 bytes)
- `.markdownlintignore` (119 bytes)

**Current Location:** `config/linting/`
**Alternative Location:** Root directory (alongside `.eslintrc.json`, `.prettierrc.json`)

**Analysis:**
- Root already has `.eslintrc.json`, `.prettierrc.json`, `.markdownlint.json`
- Duplicate `.markdownlint.json` in config/linting/
- Only 2 files in config/linting/ subdirectory

**Recommendation:** **CONSOLIDATE** - Move to root, delete config/ directory

**Rationale:**
- Standard practice: linting configs at root
- Eliminates duplicate config files
- Reduces directory depth
- Follows existing pattern (ESLint, Prettier at root)

---

### Root-Level Files

#### Configuration Files (Keep)

| File | Purpose | Status | Recommendation |
|------|---------|--------|----------------|
| `.eslintrc.json` | ESLint configuration | **ACTIVE** | **KEEP** |
| `.prettierrc.json` | Prettier configuration | **ACTIVE** | **KEEP** |
| `.markdownlint.json` | Markdown linting | **ACTIVE** | **KEEP** (consolidate from config/) |
| `tsconfig.json` | TypeScript configuration | **ACTIVE** | **KEEP** |
| `vitest.config.ts` | Vitest test configuration | **ACTIVE** | **KEEP** |
| `package.json` | NPM package manifest | **ACTIVE** | **KEEP** |
| `package-lock.json` | NPM lockfile (45k tokens!) | **ACTIVE** | **KEEP** (but NEVER READ per CLAUDE.md) |

**Recommendation:** **KEEP ALL** - Core project configuration

---

#### Docker Configuration (Keep)

| File | Purpose | Status | Recommendation |
|------|---------|--------|----------------|
| `docker-compose.yml` | Main Docker Compose config | **ACTIVE** | **KEEP** |

**Recommendation:** **KEEP** - Active infrastructure

---

#### Root Scripts (Keep)

| File | Purpose | Status | Recommendation |
|------|---------|--------|----------------|
| `validate-setup.sh` | Environment validation | **ACTIVE** | **KEEP** |

**Git History:** 2025-09-22
**Purpose:** "FLRTS Project - Environment Validation Script - Run after disaster recovery"

**Recommendation:** **KEEP** - Active setup validation

---

#### Temporary Files (Delete + Gitignore)

| File | Purpose | Size | Recommendation |
|------|---------|------|----------------|
| `tmp-sec.log` | Security review log | 849 bytes | **DELETE** + **GITIGNORE** |
| `security-findings.json` | Security scan results | 170 bytes | **DELETE** + **GITIGNORE** |

**Analysis:**
- `tmp-sec.log` - Created 2025-09-29, output from security-review.sh
- `security-findings.json` - Modified 2025-10-16, contains scan results
- Both are generated artifacts, not source files

**Content of security-findings.json:**
```json
{
  "summary": {
    "total": 0,
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0,
    "files_reviewed": 90
  },
  "findings": [],
  "status": "warning"
}
```

**Recommendation:**
1. **DELETE** both files
2. **ADD TO .gitignore:** `tmp-sec.log`, `security-findings.json`
3. Update security-review.sh to output to gitignored location

**Rationale:**
- Generated files should not be tracked in git
- Security scan results change with each run
- Should be regenerated in CI/CD, not stored

---

#### Documentation Files (Keep)

| File | Purpose | Status | Recommendation |
|------|---------|--------|----------------|
| `README.md` | Project README | **ACTIVE** | **KEEP** |
| `CONTRIBUTING.md` | Contribution guidelines | **ACTIVE** | **KEEP** |
| `CLAUDE.md` | Claude Code instructions | **ACTIVE** | **KEEP** |

**Recommendation:** **KEEP ALL** - Core project documentation

---

## Dependency Analysis

### Scripts Referenced in package.json

**Active Script Usage:**
```json
{
  "scripts": {
    "qa:gate": "bash scripts/bmad-qa-gate.sh",                    // ✅ ACTIVE
    "test:ci-local": "bash scripts/test-like-github.sh",          // ✅ ACTIVE
    "test:ci-validate": "bash scripts/validate-test-env.sh",      // ✅ ACTIVE
    "test:resilience:shell": "bash infrastructure/scripts/run-resilience-tests.sh"  // ✅ ACTIVE
  }
}
```

**Workspace References:**
```json
{
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "nlp:dev": "npm run dev --workspace=nlp-service",
    "nlp:build": "npm run build --workspace=nlp-service",
    "nlp:start": "npm run start --workspace=nlp-service",
    "nlp:test": "npm run test --workspace=nlp-service"
  }
}
```

**Analysis:**
- `packages/nlp-service/` actively referenced in package.json
- `packages/flrts-extension/` **NOT** referenced (candidate for archive)

---

### Scripts Referenced in GitHub Workflows

**.github/workflows/security.yml:**
```yaml
paths:
  - 'scripts/security-review.sh'
run:
  bash scripts/security-review.sh 2>&1 | tee security-review.log
```

**Analysis:**
- Only `security-review.sh` explicitly referenced in workflows
- Other scripts may be called by workflows indirectly

---

### Import Analysis

**Searched for:**
- `lib/linear-integration.js` - **NO IMPORTS FOUND**
- `scripts/*` - Scripts not typically imported (executed via bash/npm)

**Conclusion:**
- `lib/linear-integration.js` is orphaned code (no active usage)

---

## Size Analysis

### Large Directories (Excluding node_modules)

| Directory | Approx Size | Status | Notes |
|-----------|-------------|--------|-------|
| `docs/` | Large (many subdirs) | **ACTIVE** | Contains archive/ subdirectory |
| `tests/` | Medium | **ACTIVE** | Contains archive/ subdirectory |
| `infrastructure/` | Medium | **MIXED** | Active + archived components |
| `packages/` | Medium | **MIXED** | Active nlp-service + archive/ |
| `database/` | Small | **OBSOLETE** | Supabase migrations |
| `erpnext-admin-map/` | 610 KB | **ONE-OFF** | 8 PNG screenshots |

**Recommendation:** No size-based deletions needed (all directories < 1 GB)

---

## Git Activity Heatmap

### Most Active Directories (Last 30 Days)

1. **scripts/** - 15+ commits (security-review.sh, check-port-bindings.sh, ssh-frappe-bench.sh)
2. **infrastructure/** - 10+ commits (docker configs, monitoring archive)
3. **docs/** - Moderate activity (ADR-006, ADR-007 additions)
4. **tests/** - Moderate activity (test suite audit, archival)
5. **database/** - **ZERO ACTIVITY** since Sep 30 (last OpenProject migration)

### Least Active Directories (Candidates for Archive)

1. **database/** - Last activity Sep 30 (OpenProject schema)
2. **erpnext-admin-map/** - Created Oct 7, no updates since Oct 13
3. **lib/** - Last activity Sep 22 (linting only)
4. **packages/flrts-extension/** - Last activity Sep 24

---

## Recommended Actions

### Phase 1: Immediate Cleanup (Low Risk)

#### 1.1 Delete Temporary Files
```bash
rm tmp-sec.log security-findings.json
echo "tmp-sec.log" >> .gitignore
echo "security-findings.json" >> .gitignore
```

**Impact:** None (regenerated by CI)
**Risk:** Low

---

#### 1.2 Remove Misplaced flrts_extensions/
```bash
# Verify external repo is up-to-date
ls -la /Users/colinaulds/Desktop/flrts-extensions/

# Add to .gitignore
echo "/flrts_extensions" >> .gitignore

# Remove from repo
git rm -r flrts_extensions/
```

**Impact:** Enforces separation of concerns per .project-context.md
**Risk:** Low (external repo exists)

---

### Phase 2: Archive Obsolete Directories (Medium Risk)

#### 2.1 Archive database/ (Supabase Migrations)
```bash
mkdir -p docs/archive/supabase-migrations
git mv database/ docs/archive/supabase-migrations/
```

**Rationale:**
- Supabase deprecated per ADR-006
- No activity since Sep 30
- Historical reference only

**Impact:** Removes obsolete tech from active codebase
**Risk:** Low (not referenced in active code)

---

#### 2.2 Archive One-Off Scripts
```bash
# Linear migration scripts
mkdir -p docs/archive/scripts/linear-migration
git mv scripts/migrate-to-linear*.js docs/archive/scripts/linear-migration/
git mv scripts/setup-linear*.js docs/archive/scripts/linear-migration/
git mv scripts/push-docs-to-linear.js docs/archive/scripts/linear-migration/

# Cloudflare scripts
mkdir -p docs/archive/scripts/cloudflare
git mv scripts/cf-wrangler docs/archive/scripts/cloudflare/
git mv scripts/check-cf-dns docs/archive/scripts/cloudflare/
git mv infrastructure/cloudflare/setup-r2.sh docs/archive/scripts/cloudflare/

# Infrastructure one-offs
mkdir -p docs/archive/scripts/infrastructure
git mv infrastructure/scripts/deploy-queue-mode.sh docs/archive/scripts/infrastructure/
git mv infrastructure/scripts/generate-secure-env.sh docs/archive/scripts/infrastructure/
git mv infrastructure/scripts/rollback-container-names.sh docs/archive/scripts/infrastructure/

# Test setup
git mv scripts/setup-test-env.sh docs/archive/scripts/
```

**Impact:** Removes one-time-use scripts from active codebase
**Risk:** Low (not in package.json or workflows)

---

#### 2.3 Archive packages/flrts-extension/
```bash
git mv packages/flrts-extension/ packages/archive/flrts-extension/
```

**Rationale:**
- OpenProject deprecated (ADR-006)
- Not referenced in package.json workspaces
- No ERPNext equivalent planned

**Impact:** Removes obsolete browser extension
**Risk:** Low (OpenProject shut down)

---

### Phase 3: Consolidate Directories (High Risk - Requires Testing)

#### 3.1 Consolidate infrastructure/scripts/ into scripts/
```bash
# Move active infrastructure scripts to root scripts/
git mv infrastructure/scripts/health-check.sh scripts/
git mv infrastructure/scripts/run-resilience-tests.sh scripts/
git mv infrastructure/scripts/validate-container-naming*.sh scripts/

# Update package.json reference
# Change: "bash infrastructure/scripts/run-resilience-tests.sh"
# To: "bash scripts/run-resilience-tests.sh"
```

**Impact:** Simplifies directory structure
**Risk:** Medium (requires package.json update)

**Testing Required:**
- `npm run test:resilience:shell` still works
- CI/CD workflows still find scripts

---

#### 3.2 Move erpnext-admin-map/ to docs/
```bash
mkdir -p docs/erpnext/research/admin-interface-screenshots
git mv erpnext-admin-map/2025-10-07/* docs/erpnext/research/admin-interface-screenshots/
git mv erpnext-admin-map/2025-10-07/README.md docs/erpnext/research/admin-interface-screenshots/
rmdir erpnext-admin-map/2025-10-07/
rmdir erpnext-admin-map/
```

**Impact:** Moves research artifacts to appropriate location
**Risk:** Low (documentation only)

---

#### 3.3 Consolidate config/linting/ to Root
```bash
# Check for differences between root and config/linting/
diff .markdownlint.json config/linting/.markdownlint.json

# If identical, remove config/linting/
rm -rf config/linting/
rmdir config/  # If empty
```

**Impact:** Eliminates duplicate config files
**Risk:** Low (linting configs)

**Testing Required:**
- `npm run lint:md` still works
- Markdown files still lint correctly

---

#### 3.4 Resolve lib/linear-integration.js
```bash
# Option 1: Archive if unused
mkdir -p docs/archive/prototypes
git mv lib/linear-integration.js docs/archive/prototypes/
rmdir lib/

# Option 2: Move to packages/linear-client/ if reusable
# (Only if planning to use as shared library)
```

**Impact:** Removes single-file directory
**Risk:** Low (no imports found)

---

### Phase 4: Evaluate Uncertain Status (Requires Decision)

#### 4.1 packages/nlp-service/ - DECISION REQUIRED

**Question:** Is NLP task parsing still a priority with ERPNext backend?

**Options:**
1. **Refactor for ERPNext** - Update to create ERPNext Task DocType instead of OpenProject
2. **Archive** - If direct ERPNext Task creation preferred
3. **Keep as-is for research** - If planning future NLP integration

**Evidence Needed:**
- PRD or roadmap for NLP features with ERPNext
- Backlog items mentioning natural language task creation
- User requirements for NLP vs direct form entry

**Recommendation:** **ASK PLANNING AGENT**

---

#### 4.2 scripts/linear-cli.js & linear-webhook.js

**Question:** Are these still used for Linear operations?

**Investigation Needed:**
- Check .github/workflows/linear-*.yml for references
- Ask team if manual CLI operations still needed
- Determine if webhook.js used in production

**Current Evidence:**
- Not in package.json scripts
- Last modified Sep 22 (linting only)
- No obvious imports

**Recommendation:** **INVESTIGATE WORKFLOWS** before archiving

---

#### 4.3 scripts/maintenance/ Scripts

**Files:**
- `cleanup.sh` (2061 bytes)
- `fix-node-modules.sh` (2931 bytes)

**Investigation Needed:**
- Check if used in CI/CD
- Ask team if manual maintenance operations
- Determine if still relevant or superseded

**Recommendation:** **EVALUATE USAGE** before archiving

---

## Summary of Classifications

### Keep as Active (12 files)
- scripts/bmad-qa-gate.sh
- scripts/security-review.sh
- scripts/test-like-github.sh
- scripts/validate-test-env.sh
- scripts/check-port-bindings.sh
- scripts/ssh-frappe-bench.sh
- scripts/pre-commit-ci-check.sh
- scripts/dev/preview-globs.sh
- infrastructure/scripts/health-check.sh
- infrastructure/scripts/run-resilience-tests.sh
- infrastructure/scripts/validate-container-naming.sh
- validate-setup.sh (root)

### Archive (25+ items)
- **database/** (entire directory - Supabase migrations)
- scripts/migrate-to-linear.js
- scripts/migrate-to-linear-simple.js
- scripts/setup-linear.js
- scripts/setup-linear-cycles.js
- scripts/push-docs-to-linear.js
- scripts/cf-wrangler
- scripts/check-cf-dns
- scripts/setup-test-env.sh
- scripts/setup/setup-smart-search.sh
- infrastructure/cloudflare/setup-r2.sh
- infrastructure/scripts/deploy-queue-mode.sh
- infrastructure/scripts/generate-secure-env.sh
- infrastructure/scripts/rollback-container-naming.sh
- packages/flrts-extension/ (OpenProject browser extension)

### Delete + Gitignore (2 files)
- tmp-sec.log
- security-findings.json

### Move (3 items)
- erpnext-admin-map/ → docs/erpnext/research/admin-interface-screenshots/
- config/linting/ → root (consolidate)
- lib/linear-integration.js → docs/archive/prototypes/ OR delete

### Remove (1 item)
- flrts_extensions/ (belongs in external repo per .project-context.md)

### Evaluate/Decision Required (5 items)
- packages/nlp-service/ (refactor, archive, or keep?)
- scripts/linear-cli.js (still used?)
- scripts/linear-webhook.js (still used?)
- scripts/maintenance/cleanup.sh (still used?)
- scripts/maintenance/fix-node-modules.sh (still used?)

---

## Root Directory Impact

### Current Root Items: 23
- Directories: 13
- Files: 10

### After Cleanup: ~15-18
- Directories: 8-10 (remove database/, erpnext-admin-map/, lib/, config/, flrts_extensions/)
- Files: 8 (remove tmp-sec.log, security-findings.json)

### Target Structure
```
bigsirflrts/
├── docs/                      # Documentation (keep)
├── infrastructure/            # Infrastructure (keep, consolidate scripts/)
├── packages/                  # Packages (keep, archive flrts-extension)
├── scripts/                   # Scripts (keep active, archive one-offs)
├── tests/                     # Tests (keep)
├── .github/                   # Workflows (keep)
├── docker-compose.yml         # Docker config (keep)
├── package.json               # NPM manifest (keep)
├── tsconfig.json              # TypeScript config (keep)
├── vitest.config.ts           # Test config (keep)
├── .eslintrc.json             # ESLint config (keep)
├── .prettierrc.json           # Prettier config (keep)
├── .markdownlint.json         # Markdown lint (keep)
├── .gitignore                 # Git ignore (update)
├── README.md                  # Project README (keep)
├── CONTRIBUTING.md            # Contributing guide (keep)
├── CLAUDE.md                  # Claude instructions (keep)
└── validate-setup.sh          # Setup validation (keep)
```

**Reduction:** 23 → 17 items (26% reduction)

---

## Risk Assessment

### Low Risk Actions (Safe to Execute)
1. Delete tmp-sec.log, security-findings.json
2. Remove flrts_extensions/ (external repo exists)
3. Archive database/ (Supabase deprecated)
4. Archive one-off migration scripts (Linear, Cloudflare, setup)
5. Move erpnext-admin-map/ to docs/research/

**Impact:** Removes obsolete/temporary files
**Rollback:** Easy (git revert)

### Medium Risk Actions (Requires Testing)
1. Consolidate infrastructure/scripts/ into scripts/
2. Archive packages/flrts-extension/
3. Consolidate config/linting/ to root
4. Archive lib/linear-integration.js

**Impact:** Changes directory structure, may affect imports/workflows
**Rollback:** Moderate (git revert + retesting)
**Testing Required:** CI/CD workflows, package.json scripts

### High Risk Actions (Requires Decision)
1. packages/nlp-service/ (refactor vs archive)
2. scripts/linear-cli.js & linear-webhook.js (still used?)
3. scripts/maintenance/ scripts (still used?)

**Impact:** May delete actively-used code
**Rollback:** Difficult if not caught quickly
**Required:** Explicit approval from Planning Agent or team

---

## Next Steps for Planning Agent

1. **Review Phase 1 (Immediate Cleanup)** - Approve deletion of temporary files and flrts_extensions/ removal
2. **Approve Phase 2 (Archive)** - Confirm archival of database/ and one-off scripts
3. **Test Phase 3 (Consolidate)** - Execute consolidation with testing validation
4. **Decide Phase 4 (Evaluate)** - Make decisions on NLP service, Linear scripts, maintenance scripts
5. **Execute in Batches** - Don't do all at once; test between phases
6. **Update Documentation** - Document decisions in ADR if needed

---

## Audit Artifacts

**Audit Method:**
- Git history analysis (`git log --all --format="%ai | %s" -- <path>`)
- File header inspection (`head -20`)
- Dependency search (`rg` for imports)
- Package.json script references
- GitHub workflow analysis
- Project context verification (.project-context.md, CLAUDE.md)

**Files Checked:** 90+ files across 23 root items and 8 major directories

**Time Spent:** ~2 hours (comprehensive directory traversal + git history)

---

**Report Prepared By:** Research Agent
**Date:** 2025-10-16
**Repository:** BigSirFLRTS (/Users/colinaulds/Desktop/bigsirflrts)
**Git Branch:** chore/directory-cleanup
**Report Location:** docs/.scratch/deep-audit/forensic-audit-report.md

---

## Appendix: Git History Excerpts

### database/ Activity
```
2025-09-30 13:06:17 - database/migrations/002_openproject_schema.sql
2025-09-25 20:40:34 - database/migrations/004_monitoring_views.sql
2025-09-17 23:27:05 - database/README.md
2025-09-14 00:10:42 - database/ (initial schema)
```
**Last Activity:** Sep 30 (OpenProject schema)

### scripts/ Activity (Top 5)
```
2025-10-13 17:52:54 - scripts/ssh-frappe-bench.sh
2025-10-03 13:09:34 - scripts/security-review.sh
2025-09-30 11:34:58 - scripts/check-port-bindings.sh
2025-09-30 01:29:12 - scripts/test-like-github.sh
2025-09-29 18:27:52 - scripts/migrate-to-linear*.js
```
**Most Active:** security-review.sh, check-port-bindings.sh, ssh-frappe-bench.sh

### infrastructure/ Activity
```
2025-10-16 11:25:56 - chore: archive obsolete infrastructure (#151)
2025-10-03 13:09:34 - feat(sync): backend factory + ERPNext stub client
2025-09-28 09:46:40 - Test/infra 002 tiered git hooks (#10)
```
**Recent:** Archive of monitoring/ (DigitalOcean) on Oct 16

---

**End of Forensic Audit Report**
