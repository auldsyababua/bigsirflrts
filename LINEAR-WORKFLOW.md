# Linear Workflow Quick Reference

## 🎯 Current Status
- **54 documents archived** to `.archive/`
- **Repository cleaned** for better AI agent performance
- **Pre-commit hooks active** to enforce Linear-first development
- **BMAD agents updated** with Linear MCP tool instructions

## 🚀 Daily Workflow

### Starting Work
```bash
# View your tasks
node scripts/linear-cli.js list --assignee me

# Create new task
node scripts/linear-cli.js create "Fix authentication bug"
# Returns: 10N-102

# Start work
git checkout -b colin/10n-102-fix-authentication-bug
```

### During Development
```bash
# Commit with Linear reference
git commit -m "10N-102: Fixed JWT token expiration"

# Update issue status
node scripts/linear-cli.js update 10N-102 --status "In Review"

# Add comment
node scripts/linear-cli.js comment 10N-102 "Found root cause in auth middleware"
```

### Documentation
```bash
# Create documentation in Linear (not files!)
node scripts/linear-cli.js create --type document "API Documentation"

# Search existing docs
node scripts/linear-cli.js search "webhook configuration"
```

## 📋 Quick Commands

| Action | Command |
|--------|---------|
| My tasks | `node scripts/linear-cli.js list --assignee me` |
| Create issue | `node scripts/linear-cli.js create "Title"` |
| Update status | `node scripts/linear-cli.js update ID --status "In Progress"` |
| Add comment | `node scripts/linear-cli.js comment ID "Message"` |
| Search docs | `node scripts/linear-cli.js search "query"` |

## 🚫 What NOT to Do

❌ **Never create files in:**
- `/docs/stories/`
- `/docs/qa/`
- `/docs/processes/`
- `/docs/misc/`

✅ **Instead use:**
- Linear issues for tasks/stories
- Linear documents for documentation
- Linear comments for updates

## 🔍 Finding Information

1. **Current work**: Check Linear active sprint
2. **Documentation**: Search Linear documents
3. **Archived content**: `.archive/` directory (read-only)

## 🏷️ Standard Labels

- `qa-gate` - QA validation issues
- `post-mvp` - Work for after MVP
- `performance` - Performance optimizations
- `infrastructure` - Infrastructure tasks
- `bug` - Bug fixes
- `enhancement` - Feature improvements

## 🔗 Key Links

- **Linear Project**: https://linear.app/10netzero/project/9d089be4-a284-4879-9b67-f472abecf998
- **Team Page**: https://linear.app/10netzero/team/10NZ
- **Current Sprint**: Check active cycle in Linear

## 📊 Benefits Achieved

- **90% reduction** in context window usage
- **Centralized** project management
- **Automated** GitHub-Linear sync
- **Enforced** best practices via hooks
- **Clean** repository structure

## 🆘 Troubleshooting

### "Documentation Location Error" on commit
- You're trying to create docs in old locations
- Use Linear instead: `node scripts/linear-cli.js create --type document`

### Can't find old documentation
- Check `.archive/` directory
- Search Linear documents
- Use: `node scripts/linear-cli.js search "topic"`

### Missing Linear API key
```bash
source scripts/setup-linear.js
```

## 📈 Metrics

- Documents archived: 54
- Active docs in repo: 5 (README, CLAUDE, etc.)
- Linear issues created: 100+
- Context window saved: ~45,000 tokens