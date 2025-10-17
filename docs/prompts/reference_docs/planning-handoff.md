# Planning Agent Session Handoff

**From**: Directory Cleanup Planning Session (2025-10-16)
**To**: Next Planning Agent
**Context**: Deep repository reorganization - merciless hygiene enforcement

---

## What Was Completed This Session

### PR #153 Created (Ready for Merge)
- **Branch**: `chore/directory-cleanup`
- **Status**: Approved for merge
- **Archived**: `/supabase`, `/scratch`, `infrastructure/monitoring/`
- **Deleted**: `/monitoring` symlink, `/prompts`, `/test`, `/test-results`
- **Result**: -6 top-level directories (52 → 46 items at root)

### Analysis Documents Created

1. **docs/.scratch/directory-audit/directory-audit-report.md**
   - Initial /docs directory analysis (15 directories analyzed)
   - Found single-file directories and overlaps

2. **docs/.scratch/directory-audit/docs-reorganization-proposal.md**
   - Proposed /docs reorganization using Diátaxis framework
   - Philosophy: Purpose over technology (NOT /docs/erpnext/, but /docs/research/erpnext/)

3. **docs/.scratch/directory-audit/full-repo-reorganization-proposal.md**
   - Full repository analysis (23 root items)
   - Industry best practices research
   - Identified immediate wins and long-term plan

---

## Critical User Directive: Go Deeper

User wants **merciless hygiene** with full traceability:

> "I think we need to be really diligent and merciless in our hygiene. Obviously we REALLY don't want to delete anything important, but by archiving and documenting all these moves and deletions (we should actually do this ahead of time so when action does it, they have a clear directive) and then we can just add the mapping doc into the project-context.md file as a ref so that if we do accidentally move something important, its easy to get it back and we know where it is."

### Key Requirements

1. **Deep forensic audit** - Not just top-level, go into subdirectories
2. **Document BEFORE executing** - Create migration mapping document first
3. **Full traceability** - Document original paths for all archived files
4. **Archive breadcrumbs** - Every archived item gets metadata (original path, date, reason)
5. **Add mapping to .project-context.md** - Reference document for recovery
6. **Merciless but safe** - Archive aggressively, but with recovery path

---

## Findings So Far (Partial Audit)

### scripts/ Directory (18 files + 3 subdirs)

**One-off migration scripts** (Last touched Sept 2025, likely obsolete):
- `migrate-to-linear.js` (413 lines) - OpenProject → Linear migration
- `migrate-to-linear-simple.js` (5633 bytes) - Simpler migration variant
- `push-docs-to-linear.js` - One-time doc migration

**Cloudflare scripts** (Last touched Sept 13, obsolete after DigitalOcean shutdown):
- `cf-wrangler` - Cloudflare CLI wrapper
- `check-cf-dns` - DNS check script

**Linear setup scripts** (One-time setup, probably obsolete):
- `setup-linear.js` - Initial Linear workspace setup
- `setup-linear-cycles.js` - Cycle configuration
- `linear-cli.js` - Linear CLI wrapper
- `linear-webhook.js` - Webhook setup

**Still active**:
- `security-review.sh` (25KB) - Active security scanning
- `ssh-frappe-bench.sh` - Active Frappe Cloud operations
- `bmad-qa-gate.sh` - CI gate (check if still used)
- `check-port-bindings.sh` - Port conflict detection
- `pre-commit-ci-check.sh` - Git hook
- `test-like-github.sh` - CI simulation
- `validate-test-env.sh` - Test env validation
- `setup-test-env.sh` - Test env setup

**Subdirectories**:
- `scripts/dev/` - 1 file: `preview-globs.sh`
- `scripts/maintenance/` - 2 files: `cleanup.sh`, `fix-node-modules.sh`
- `scripts/setup/` - 1 file: `setup-smart-search.sh`

### infrastructure/ Directory

**Obsolete (local dev only)**:
- `docker/` - Docker Compose for local n8n/Postgres (production uses Frappe Cloud)
- `cloudflare/setup-r2.sh` - R2 setup (obsolete)
- `tests/` - Load tests for old infrastructure
- `qa-evidence/` - Old container naming reports (historical)

**Possibly active**:
- `scripts/` - Various deployment/health check scripts (need audit)
- `github-runner/` - GitHub runner config (check if used)

### Other Root Items (Not Yet Audited)

- `/config` - Just linting (1 subdir)
- `/database` - Obsolete Supabase migrations
- `/erpnext-admin-map` - One-time research screenshots (Oct 7)
- `/flrts_extensions` - ERPNext custom app (duplicate of external repo?)
- `/lib` - 1 file: linear-integration.js
- `/packages` - nlp-service + archived packages

---

## Your Mission (Next Planning Agent)

### Philosophy (User-Approved)

**Organize by PURPOSE, not technology**:
- ✅ `docs/research/erpnext/schema-philosophy.md` (research about ERPNext)
- ❌ `docs/erpnext/research/schema-philosophy.md` (ERPNext gets own folder)

**Merciless hygiene**:
- One-off scripts → archive with breadcrumbs
- Obsolete infrastructure → archive with breadcrumbs
- Single-file directories → consolidate
- Technology-specific root folders → reorganize by purpose

**Traceability**:
- Document original path for every move
- Create migration mapping document
- Add reference to .project-context.md
- ARCHIVE-README.md for every archived directory

---

## Work Blocks for You to Execute

### Work Block 1: Deep Forensic Audit

**DO NOT DO THIS YOURSELF** - Spawn Research Agent to preserve your context.

**Delegate to Research Agent**:
```
You are the Research Agent. Your task is to conduct a deep forensic audit of the BigSirFLRTS repository to identify obsolete, one-off, and misplaced files for archival.

**Your Task**: Create comprehensive audit report with categorization.

**Directories to Audit** (go DEEP, check subdirectories):
1. scripts/ - Check git history, file headers, identify one-off vs active
2. infrastructure/ - Identify obsolete Docker/Cloudflare/test configs
3. config/ - Assess if needed or consolidate to root
4. database/ - Confirm obsolete (Supabase migrations)
5. erpnext-admin-map/ - Confirm one-time research
6. flrts_extensions/ - Check if duplicate of external repo
7. lib/ - Assess if single file should be consolidated
8. packages/ - Audit each package for active use

**For Each File/Directory, Document**:
- Original path
- Purpose (from file headers, git history, README)
- Last modified date (git log)
- Last meaningful commit (not just linting)
- Active vs obsolete classification
- Recommendation: Keep, Archive, Consolidate, Delete

**Output**: docs/.scratch/deep-audit/forensic-audit-report.md

**Tools to Use**:
- git log --all --format="%ai" --name-only -- <file>
- head -20 <file> (check headers/comments)
- Read any README files in directories
- Check .gitignore to see what's already ignored

**DO NOT** make assumptions - investigate each file.
**DO NOT** execute any moves - just document findings.
```

### Work Block 2: Create Migration Mapping Document

**After Research Agent completes audit**, spawn Action Agent:

```
You are the Action Agent. Your task is to create a comprehensive migration mapping document based on the forensic audit.

**Input**: docs/.scratch/deep-audit/forensic-audit-report.md

**Your Task**: Create migration plan with full traceability.

**Output**: docs/.scratch/deep-audit/migration-mapping.md

**Required Format**:

## Migration Mapping Document

### Archives (Moving to docs/archive/ or other archive locations)

| Original Path | New Path | Reason | Last Active | Breadcrumb ID |
|---------------|----------|--------|-------------|---------------|
| scripts/migrate-to-linear.js | docs/archive/scripts/migrate-to-linear.js | One-off OpenProject migration | 2025-09-29 | ARCH-001 |
| ... | ... | ... | ... | ... |

### Consolidations (Merging single-file directories)

| Original Path | New Path | Reason |
|---------------|----------|--------|
| lib/linear-integration.js | scripts/integrations/linear.js | Single-file dir consolidation |
| ... | ... | ... |

### Deletions (Removing duplicates/generated files)

| Original Path | Reason | Backup Location |
|---------------|--------|-----------------|
| tmp-sec.log | Log file (should be gitignored) | N/A - add to .gitignore |
| ... | ... | ... |

### Reorganizations (Purpose-based moves)

| Original Path | New Path | Reason |
|---------------|----------|--------|
| docs/erpnext/research/schema.md | docs/research/erpnext/schema.md | Purpose over technology |
| ... | ... | ... |

**Also Create**: Breadcrumb lookup table (ARCH-001 → full details)
```

### Work Block 3: Create Archive Breadcrumbs

**Spawn Action Agent**:

```
You are the Action Agent. Your task is to create ARCHIVE-README.md files for every directory that will be archived, with full breadcrumb metadata.

**Input**: docs/.scratch/deep-audit/migration-mapping.md

**Your Task**: For each archived directory, create ARCHIVE-README.md with:

**Template**:
```markdown
# [Directory Name] Archive

**Archived**: 2025-10-16
**Original Path**: `[exact original path]`
**Breadcrumb ID**: ARCH-XXX
**Reason**: [specific reason for archival]

## What Was Here

[List of files with original paths and purposes]

## Why Archived

[Detailed explanation of obsolescence]

## Related

- [Links to ADRs, PRs, Linear issues]
- Migration mapping: docs/.scratch/deep-audit/migration-mapping.md

## Last Active

Last modified: [date from git log]
Last meaningful change: [date and commit]

## Recovery

If you need to restore these files:
1. Check migration-mapping.md for breadcrumb ARCH-XXX
2. Original location documented above
3. Git history available: git log --all -- "[original path]"
```

**Output**: Create all ARCHIVE-README.md files (don't execute moves yet)
```

### Work Block 4: Update .project-context.md

**Spawn Action Agent**:

```
You are the Action Agent. Your task is to add reference to migration mapping document in .project-context.md.

**Add to .project-context.md** under "Known Issues/Blockers" or new "File Migration History" section:

```markdown
## File Migration History

**Repository Reorganization** (2025-10-16):
- Deep cleanup following merciless hygiene standards
- Full migration mapping: docs/.scratch/deep-audit/migration-mapping.md
- All archived items documented with breadcrumb IDs
- Original paths preserved for recovery

**Key Archives**:
- scripts/ - One-off migration scripts archived
- infrastructure/ - Obsolete DigitalOcean/Docker configs archived
- database/ - Supabase migrations archived

**Recovery**: See migration-mapping.md for breadcrumb lookup table.
```
```

### Work Block 5: Execute Cleanup (After User Approval)

**ONLY after user reviews and approves migration-mapping.md**, spawn Action Agent to execute.

**DO NOT execute without explicit user approval.**

---

## Estimated Timeline

- **WB1** (Research audit): 30-45 minutes (Research Agent)
- **WB2** (Migration mapping): 15-20 minutes (Action Agent)
- **WB3** (Breadcrumbs): 20-30 minutes (Action Agent)
- **WB4** (Update context): 5 minutes (Action Agent)
- **WB5** (Execution): 30 minutes (Action Agent, after approval)

**Total**: ~2 hours (mostly agent time, not your context)

---

## Critical Instructions

1. **DO NOT execute cleanup yourself** - You'll run out of context
2. **Spawn agents for each work block** - Preserve your context for coordination
3. **Wait for user approval** before WB5 execution
4. **Present migration-mapping.md to user** for review before any moves
5. **Update Linear 10N-275 dashboard** after each work block completes

---

## Files to Reference

- `docs/.scratch/directory-audit/directory-audit-report.md` - Initial /docs audit
- `docs/.scratch/directory-audit/docs-reorganization-proposal.md` - /docs philosophy
- `docs/.scratch/directory-audit/full-repo-reorganization-proposal.md` - Full repo analysis

---

## Success Criteria

- [ ] Forensic audit complete (all files categorized)
- [ ] Migration mapping document created
- [ ] User approves migration plan
- [ ] All ARCHIVE-README.md files created
- [ ] .project-context.md updated with recovery reference
- [ ] Cleanup executed successfully
- [ ] Repository reduced to essential, well-organized structure
- [ ] Full traceability for all moves

---

**Next Planning Agent**: Start with Work Block 1 (spawn Research Agent for deep audit). Report findings to user before proceeding.

**Token Budget Warning**: You have full context budget - use agents to preserve it.
