# Linear Integration Guide

This guide consolidates all Linear integration documentation for the BigSirFLRTS project.

## Quick Start

### Step 1: Configure Linear API Access

```bash
# 1. Set up Linear API key
node scripts/setup-linear.js

# 2. Test connection
node scripts/linear-cli.js list
```

### Step 2: Repository Analysis

Analyze your codebase to identify items for Linear migration:

```bash
# Scan repository for TODOs, docs, and tasks
node scripts/migrate-to-linear.js analyze
# Creates: linear-migration-analysis.json
```

## Core Integration Components

### Linear SDK Integration (`lib/linear-integration.js`)
- Full API wrapper for Linear operations
- Pre-configured for 10netzero team and BigSirFLRTS project
- BMAD context generation for AI agents

### CLI Tools

#### Main CLI (`scripts/linear-cli.js`)
- `list` - List project issues
- `create` - Create new issues
- `get` - Get issue details
- `sync-branch` - Sync from git branches
- `cycle` - View current cycle

#### Setup Script (`scripts/setup-linear.js`)
- Interactive API key configuration
- Automatic .env file management
- Connection testing

#### Cycle Management (`scripts/setup-linear-cycles.js`)
- `create` - Create sprint cycles
- `list` - View all cycles
- `current` - Show current cycle details
- `assign` - Assign issues to cycles

## GitHub Actions Integration

### Automated Workflows

Located in `.github/workflows/`:
- `linear-sync.yml` - Syncs issues with PRs
- `linear-update.yml` - Updates issue status

### Environment Setup

Add these secrets to your GitHub repository:
1. Go to: Settings → Secrets and variables → Actions
2. Add three secrets:

```env
LINEAR_API_KEY = [YOUR_LINEAR_API_KEY]
LINEAR_TEAM_KEY = 10NETZERO
LINEAR_PROJECT_ID = [PROJECT_ID from Linear]
```

## Webhook Configuration

### Linear → GitHub Webhooks

Set up in Linear Settings → API → Webhooks:
- **Issue Created**: Trigger GitHub Actions
- **Issue Updated**: Sync status changes
- **Comment Added**: Notify team

### GitHub → Linear Integration

Automatic updates when:
- PR created with issue reference
- PR merged/closed
- Commits reference Linear issue IDs

## Migration Guide

### From TODO Comments

```bash
# Find all TODOs in codebase
node scripts/migrate-to-linear.js analyze --type=todos

# Create Linear issues from TODOs
node scripts/migrate-to-linear.js migrate --type=todos
```

### From Documentation

```bash
# Analyze markdown files
node scripts/migrate-to-linear.js analyze --type=docs

# Selective migration
node scripts/migrate-to-linear.js migrate --type=docs --interactive
```

### From BMAD Stories

```bash
# Import BMAD stories as Linear issues
node scripts/migrate-to-linear.js migrate --type=bmad
```

## Workflow Commands

### Daily Operations

```bash
# View today's tasks
node scripts/linear-cli.js list --filter=assigned

# Create issue from command line
node scripts/linear-cli.js create "Fix authentication bug" --priority=high

# Check current sprint
node scripts/linear-cli.js cycle current
```

### Branch Management

```bash
# Create branch from Linear issue
git checkout -b $(node scripts/linear-cli.js branch 10N-123)

# Sync branch with Linear
git push origin HEAD
# Automatically updates Linear issue status
```

## Best Practices

### Issue Naming
- Use clear, actionable titles
- Include context in description
- Tag with appropriate labels

### Git Integration
- Reference Linear IDs in commits: `10N-123: Fixed auth bug`
- Use auto-generated branch names
- Let GitHub Actions handle status updates

### Documentation
- Keep technical specs in Linear
- Link PRs to issues
- Update issue status through PR lifecycle

## Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Verify LINEAR_API_KEY in .env
   - Check network connectivity
   - Ensure API key has correct permissions

2. **GitHub Actions Not Triggering**
   - Verify secrets are set in repository
   - Check workflow file syntax
   - Review Actions logs for errors

3. **Webhooks Not Working**
   - Confirm webhook URLs in Linear settings
   - Check GitHub webhook delivery logs
   - Verify webhook secrets match

## Configuration Files

### Required Environment Variables

```env
# .env (local development)
LINEAR_API_KEY=your_api_key_here
LINEAR_TEAM_KEY=10NETZERO
LINEAR_PROJECT_ID=your_project_id

# GitHub Secrets (CI/CD)
LINEAR_API_KEY
LINEAR_TEAM_KEY
LINEAR_PROJECT_ID
```

### Package Dependencies

```json
{
  "dependencies": {
    "@linear/sdk": "^latest"
  }
}
```

## Support

For issues or questions:
1. Check existing Linear issues
2. Review GitHub Actions logs
3. Consult team in Linear comments

---
*This document consolidates all Linear integration guides. Last updated: 2025-09-22*