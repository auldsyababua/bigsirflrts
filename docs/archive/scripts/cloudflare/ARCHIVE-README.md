# Cloudflare Scripts Archive

**Archived:** 2025-10-16
**Original Paths:** `/scripts/cf-wrangler`, `/scripts/check-cf-dns`, `/infrastructure/cloudflare/setup-r2.sh`
**Breadcrumb IDs:** ARCH-007, ARCH-008, ARCH-009
**Reason:** Deprecated scripts with hardcoded paths, one-time R2 setup

## What Was Here

These scripts were used for Cloudflare Workers deployment and R2 bucket setup. They are deprecated due to hardcoded absolute paths, manual environment sourcing, and one-time setup nature.

### File Inventory

| File | Size | Last Modified | Purpose |
|------|------|---------------|---------|
| cf-wrangler | ~2 KB | No git history | Cloudflare Workers deployment wrapper |
| check-cf-dns | ~1.5 KB | No git history | Cloudflare DNS verification script |
| setup-r2.sh | 4.3 KB | 2025-09-22 | One-time Cloudflare R2 bucket setup |

**Total Size:** ~7.8 KB

## Why Archived

### cf-wrangler & check-cf-dns (ARCH-007, ARCH-008)

**Critical Issues:**
1. **Hardcoded Absolute Paths:** `/Users/colinaulds/Desktop/projects/bigsirflrts`
   - Not portable across machines or users
   - Breaks on different filesystem layouts
   - Anti-pattern for versioned code

2. **Manual Environment Sourcing:** Scripts manually source .env files
   - Fragile environment variable handling
   - Not integrated with project environment management
   - Superseded by standard .env loading

3. **No Active Usage:**
   - Not referenced in package.json scripts
   - Not used in GitHub workflows
   - No git history (created before repo tracking)

4. **Deprecated Approach:**
   - Wrangler CLI now has better native tooling
   - Direct `npx wrangler` usage preferred
   - Custom wrapper no longer needed

### setup-r2.sh (ARCH-009)

**Reason for Archive:**
1. **One-Time Setup:** R2 bucket setup is a one-time operation
   - Already executed on 2025-09-22
   - Buckets configured and working
   - No need to run again

2. **Optional Technology:**
   - Per .project-context.md: "optional Cloudflare R2 via marketplace app"
   - ERPNext native attachments preferred
   - R2 integration via Frappe marketplace app (if needed)

3. **Status:** Setup complete, buckets operational

## Last Active

### cf-wrangler & check-cf-dns
- **Last Modified:** No git history
- **Created:** Before git tracking began (estimated Sep 2025)
- **Status:** Never integrated into workflows

### setup-r2.sh
- **Last Modified:** 2025-09-22
- **Last Commit:** fix: add missing linting and formatting config files for QA gate
- **Status:** One-time execution complete

## Related

### Cloudflare Services

**Current Usage:**
- **Cloudflare Workers:** May still be active (check .github/workflows/)
- **Cloudflare R2:** Optional storage via marketplace app
- **Cloudflare DNS:** Active (managed via Cloudflare dashboard)

**Note:** Only these setup/wrapper scripts are archived. Cloudflare services themselves remain active.

### Architecture Decisions
- **ADR-006:** ERPNext migration mentions "optional R2 via marketplace app"
- **Storage Strategy:** ERPNext native attachments primary, R2 optional

### Related Files
- `.github/workflows/`: May contain Cloudflare Workers deployment workflows
- `infrastructure/cloudflare/`: Directory may be removed if now empty

### Migration Documentation
- Migration mapping: `docs/.scratch/deep-audit/migration-mapping.md`
- Forensic audit: `docs/.scratch/deep-audit/forensic-audit-report.md`

## Recovery

If you need to restore these scripts for reference or troubleshooting:

### View Git History
```bash
# cf-wrangler and check-cf-dns have no git history
# They were created before repo tracking

# setup-r2.sh has git history
git log --all -- infrastructure/cloudflare/setup-r2.sh
git log --all --patch -- infrastructure/cloudflare/setup-r2.sh
```

### Restore from Git
```bash
# Restore setup-r2.sh
git checkout <commit-hash> -- infrastructure/cloudflare/setup-r2.sh

# For cf-wrangler and check-cf-dns, restore from archive
git checkout <commit-hash> -- scripts/cf-wrangler
git checkout <commit-hash> -- scripts/check-cf-dns
```

### Use Cases for Recovery
- **Reference:** Understand original R2 bucket configuration
- **Debugging:** Troubleshoot Cloudflare Workers deployment issues
- **Documentation:** Document manual deployment process
- **New Environment:** Set up R2 in a new Cloudflare account

## Script Details

### cf-wrangler (ARCH-007)

**Original Location:** `/scripts/cf-wrangler`
**Size:** ~2 KB
**Purpose:** Wrapper around Cloudflare Wrangler CLI

**Hardcoded Path Issue:**
```bash
# Example from script
PROJECT_ROOT="/Users/colinaulds/Desktop/projects/bigsirflrts"
cd "$PROJECT_ROOT" || exit 1
```

**Problems:**
- Won't work on Colin's new machine paths
- Won't work for other developers
- Breaks CI/CD on GitHub Actions
- Should use `$(git rev-parse --show-toplevel)` instead

**Functionality:**
- Wrapper for `wrangler deploy`
- Environment variable loading
- Working directory management

**Why Deprecated:**
- Direct `npx wrangler` usage is simpler
- Modern wrangler has better defaults
- Custom wrapper adds complexity without benefit

### check-cf-dns (ARCH-008)

**Original Location:** `/scripts/check-cf-dns`
**Size:** ~1.5 KB
**Purpose:** Verify Cloudflare DNS configuration

**Hardcoded Path Issue:**
```bash
# Example from script
source /Users/colinaulds/Desktop/projects/bigsirflrts/.env
```

**Problems:**
- Same hardcoded path issues as cf-wrangler
- Manual .env sourcing fragile
- Should use project environment management

**Functionality:**
- Query DNS records via Cloudflare API
- Verify expected DNS configuration
- Report mismatches or errors

**Why Deprecated:**
- Cloudflare dashboard provides DNS verification
- DNS changes are infrequent (one-time setup)
- Manual verification sufficient for current needs

### setup-r2.sh (ARCH-009)

**Original Location:** `/infrastructure/cloudflare/setup-r2.sh`
**Size:** 4.3 KB
**Purpose:** One-time Cloudflare R2 bucket creation and configuration

**Functionality:**
```bash
# Creates R2 buckets
# Sets CORS configuration
# Configures lifecycle policies
# Sets up access credentials
# Tests bucket access
```

**Buckets Created:**
- Production attachments bucket
- Development/staging bucket
- Public assets bucket (if applicable)

**Configuration Applied:**
- CORS headers for ERPNext access
- Lifecycle rules for data retention
- Access policies and permissions

**Status:** ✅ Setup complete (2025-09-22)

**Current R2 Usage:**
- **Primary Storage:** ERPNext native attachments
- **Optional R2:** Available via Frappe marketplace app
- **Integration:** ERPNext app handles R2 if enabled

**Why One-Time:**
- Buckets persist once created
- Configuration changes via Cloudflare dashboard
- Re-running script would be idempotent but unnecessary

## Cloudflare Services Status

### Active Services (NOT Archived)
- **Cloudflare DNS:** Active for 10nz.tools domain
- **Cloudflare Workers:** May be active (check workflows)
- **Cloudflare R2:** Buckets created, optional usage

### Archived Components
- **Setup scripts:** This archive
- **Wrapper scripts:** cf-wrangler, check-cf-dns

### Alternative Approaches

**For Cloudflare Workers Deployment:**
```bash
# Instead of cf-wrangler wrapper
npx wrangler deploy --config wrangler.toml

# Or via package.json script
npm run deploy:workers
```

**For DNS Verification:**
- Use Cloudflare dashboard DNS management
- Use `dig` or `nslookup` for manual verification
- Set up monitoring alerts for DNS changes

**For R2 Management:**
- Use Cloudflare dashboard R2 interface
- Use wrangler CLI: `npx wrangler r2 bucket list`
- Manage via ERPNext marketplace app settings

## Migration Notes

### Cloudflare R2 Integration with ERPNext

**Current Approach (per .project-context.md):**
- ERPNext native attachments: Primary
- Cloudflare R2: Optional via marketplace app
- No direct R2 integration in this repository

**If R2 Needed:**
1. Install R2 marketplace app in ERPNext
2. Configure app with bucket credentials
3. Enable R2 for specific DocTypes
4. ERPNext handles all R2 operations

**No Custom Scripts Needed:**
- ERPNext app handles uploads
- ERPNext app handles CORS
- ERPNext app handles lifecycle

### Wrangler Configuration

If Cloudflare Workers are still active, configuration should be in:
- `wrangler.toml` - Worker configuration
- `.github/workflows/` - Deployment workflows
- Environment variables - Secrets and API keys

**Not in wrapper scripts.**

## Environment Variables

Scripts used these environment variables (for reference):

### cf-wrangler
- `CLOUDFLARE_API_TOKEN` - Cloudflare API authentication
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account identifier
- `WORKER_NAME` - Name of Worker to deploy

### check-cf-dns
- `CLOUDFLARE_API_KEY` - Cloudflare API key (legacy auth)
- `CLOUDFLARE_ZONE_ID` - DNS zone identifier
- `DOMAIN` - Domain to verify (e.g., 10nz.tools)

### setup-r2.sh
- `CLOUDFLARE_API_TOKEN` - Cloudflare API authentication
- `CLOUDFLARE_ACCOUNT_ID` - Account ID for R2 buckets
- `R2_BUCKET_NAME` - Name of bucket to create
- `R2_ACCESS_KEY_ID` - S3-compatible access key
- `R2_SECRET_ACCESS_KEY` - S3-compatible secret key

**Note:** These variables may still be needed for active Cloudflare services. Only the scripts are deprecated.

## Breadcrumbs

- **ARCH-007:** scripts/cf-wrangler → docs/archive/scripts/cloudflare/
- **ARCH-008:** scripts/check-cf-dns → docs/archive/scripts/cloudflare/
- **ARCH-009:** infrastructure/cloudflare/setup-r2.sh → docs/archive/scripts/cloudflare/

---

**Archived by:** Action Agent
**Archive Date:** 2025-10-16
**Archive Commit:** chore/directory-cleanup branch
**Migration Reference:** docs/.scratch/deep-audit/migration-mapping.md
