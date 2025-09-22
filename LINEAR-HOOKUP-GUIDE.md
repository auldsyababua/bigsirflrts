# Linear Integration Hookup Guide

## How to Connect Your Existing Project to Linear

### Step 1: Initial Setup (5 minutes)

```bash
# 1. Configure Linear API access
node scripts/setup-linear.js

# 2. Test connection
node scripts/linear-cli.js list
```

### Step 2: Analyze Your Repository (2 minutes)

This will scan your entire codebase and identify:
- TODO/FIXME comments in code
- Markdown documentation to migrate
- Task lists in docs
- BMAD stories and PRDs
- Existing project management files

```bash
# Analyze repository
node scripts/migrate-to-linear.js analyze

# This creates: linear-migration-analysis.json
```

### Step 3: Set Up BMAD Structure in Linear (1 minute)

Create the labels and templates for BMAD workflow:

```bash
node scripts/migrate-to-linear.js setup-bmad
```

This creates:
- BMAD agent labels (bmad:pm, bmad:architect, etc.)
- Workflow trigger labels (needs-prd, needs-architecture)
- Template issues for common workflows

### Step 4: Import Existing Documentation (5-10 minutes)

Review the analysis and import to Linear:

```bash
# Preview what will be created (dry run)
node scripts/migrate-to-linear.js import --dry-run

# Actually import to Linear
node scripts/migrate-to-linear.js import
```

### Step 5: Configure GitHub Integration

Add these secrets to your GitHub repository:
1. Go to: Settings → Secrets and variables → Actions
2. Add three secrets:

```
LINEAR_API_KEY = [YOUR_LINEAR_API_KEY]
LINEAR_TEAM_ID = YOUR_LINEAR_TEAM_ID
LINEAR_PROJECT_ID = 9d089be4-a284-4879-9b67-f472abecf998
```

### Step 6: Enable GitHub Actions

The workflows are already in place. They'll start running automatically:
- `.github/workflows/linear-sync.yml` - Every 30 minutes
- `.github/workflows/linear-pr-automation.yml` - On PR events

Test manually:
```bash
gh workflow run linear-sync.yml
```

### Step 7: Create Sprint Cycles (Optional)

Set up your sprint planning:

```bash
# Create 6 two-week sprints
node scripts/setup-linear-cycles.js create -w 2 -c 6

# View cycles
node scripts/setup-linear-cycles.js list
```

## Migration Strategy for BigSirFLRTS

### What Gets Migrated Automatically

1. **From Code Files**:
   - TODO/FIXME comments → Linear tasks
   - BUG comments → High priority issues
   - Function TODOs → Technical debt items

2. **From Documentation**:
   - `/docs/stories/*.md` → Linear stories
   - `/docs/qa/*.md` → QA tasks
   - Task lists in markdown → Individual tasks
   - ROADMAP.md sections → Epics

3. **From BMAD Structure**:
   - `.bmad-core/prd/*.md` → Epic issues
   - `.bmad-core/stories/*.md` → Story issues
   - `.bmad-core/architecture/*.md` → Technical tasks

### Manual Migration Needed

Some items need manual review:

1. **Complex Documents**:
   ```bash
   # These contain important context that should be in Linear:
   - docs/linear-integration.md → Project documentation
   - docs/system-connections.md → Architecture docs
   - OPENPROJECT_DEPLOYMENT.md → Deployment runbook
   ```

2. **Create These in Linear**:
   - Project brief from your PRD
   - Milestones for major releases
   - Current sprint goals

3. **Link Existing PRs**:
   ```bash
   # Update open PRs with Linear issue IDs
   gh pr list --json number,title -q '.[] | "\(.number): \(.title)"'
   ```

## Workflow Changes

### Before (Repository-based)
```
1. Create TODO in code
2. Track in markdown files
3. Discuss in PR comments
4. Update various docs
```

### After (Linear-driven)
```
1. Create issue in Linear
2. Auto-create branch
3. Link PR to Linear
4. Single source of truth
```

## Daily Workflow

### Starting Work
```bash
# View your assigned issues
node scripts/linear-cli.js list -a me

# Pick an issue and it creates a branch automatically
# Or manually create branch
git checkout -b linear/10n-87-implement-feature
```

### During Development
```bash
# Update Linear from your branch
node scripts/linear-cli.js sync-branch $(git branch --show-current)

# Add notes to Linear issue
node scripts/linear-cli.js comment 10N-87 "Started implementation"
```

### Creating PRs
```bash
# PR description auto-populated from Linear
gh pr create

# Or use the Linear issue ID in PR title
gh pr create -t "10N-87: Implement feature"
```

## BMAD Agent Integration

The agents can now read from Linear:

```javascript
// In any BMAD agent
const linear = getLinearClient();
const context = await linear.generateBMADContext('10N-87');

// Context includes:
// - Issue details, description, state
// - Project information
// - Parent/child issues
// - Comments and attachments
```

## Monitoring Integration Health

### Check Sync Status
```bash
# View recent workflow runs
gh run list --workflow=linear-sync.yml

# Check for sync issues
gh run view --log
```

### Verify Linear State
```bash
# List recent issues
node scripts/linear-cli.js list --limit 10

# Check current cycle
node scripts/setup-linear-cycles.js current
```

## Troubleshooting

### Issues Not Syncing
1. Check GitHub Actions are enabled
2. Verify secrets are set correctly
3. Run manual sync: `gh workflow run linear-sync.yml`

### Branches Not Created
1. Issue must be assigned
2. Issue must be "In Progress" state
3. Check logs: `gh run view --log`

### PR Not Linking
1. Branch name must contain issue ID (10N-XX)
2. Or PR title/body must mention issue
3. Linear API key must be valid

## Quick Reference Card

```bash
# Daily commands
node scripts/linear-cli.js list          # Your issues
node scripts/linear-cli.js get 10N-86    # Issue details
node scripts/linear-cli.js create "..."  # New issue

# Sprint management
node scripts/setup-linear-cycles.js current     # Current sprint
node scripts/setup-linear-cycles.js assign 10N-86  # Add to sprint

# Migration
node scripts/migrate-to-linear.js analyze  # Find items to migrate
node scripts/migrate-to-linear.js import   # Import to Linear

# GitHub
gh workflow run linear-sync.yml  # Force sync
gh pr create                      # Auto-linked PR
```

## Success Checklist

- [ ] Linear API configured and tested
- [ ] Repository analyzed and items imported
- [ ] BMAD labels created in Linear
- [ ] GitHub secrets added
- [ ] First sync workflow ran successfully
- [ ] Test issue created and branch generated
- [ ] PR created and linked to Linear
- [ ] Team notified of new workflow

---

**Your project is now connected to Linear!**

The migration tools have identified all your existing work and can import it. The GitHub Actions will keep everything in sync going forward.