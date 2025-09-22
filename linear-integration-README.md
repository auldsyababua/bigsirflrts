# Linear Integration for BigSirFLRTS

## Quick Start

```bash
# 1. Setup Linear API integration
node scripts/setup-linear.js

# 2. Test the connection
node scripts/linear-cli.js list

# 3. Create your first issue
node scripts/linear-cli.js create "My first Linear issue" -d "Created from CLI"
```

## What's Included

### Core Integration (`lib/linear-integration.js`)
- Full Linear API client wrapper
- BigSirFLRTS project configuration
- BMAD context generation
- Issue lifecycle management

### CLI Tool (`scripts/linear-cli.js`)
```bash
# List issues
node scripts/linear-cli.js list --limit 10

# Get issue details with BMAD context
node scripts/linear-cli.js get 10N-86

# Create issue
node scripts/linear-cli.js create "Title" -d "Description" -p 2

# Sync from git branch
node scripts/linear-cli.js sync-branch feature/10n-86-auth

# View current cycle
node scripts/linear-cli.js cycle
```

### BMAD Integration (`.bmad-core/integrations/linear-context.md`)
- Agents automatically read Linear context
- Issue status triggers agent workflows
- Git branches follow Linear naming

### Webhook Handler (`scripts/linear-webhook.js`)
- Processes Linear events in real-time
- Creates branches on issue assignment
- Updates PR descriptions from Linear
- Routes events to BMAD agents

## Project Configuration

- **Team**: 10netzero (`2b0b568f-e5a6-40ac-866b-367a2564046a`)
- **Project**: BigSirFLRTS (`9d089be4-a284-4879-9b67-f472abecf998`)
- **Issue**: 10N-86 (First integration test issue)

## Environment Variables

```bash
LINEAR_API_KEY=lin_api_xxxxx        # Your personal API key
LINEAR_TEAM_ID=2b0b568f-...        # 10netzero team
LINEAR_PROJECT_ID=9d089be4-...     # BigSirFLRTS project
LINEAR_WEBHOOK_SECRET=lin_whs_xxx  # For webhook verification
```

## Workflow

1. **Issue Creation** → Auto-creates git branch
2. **Status Change** → Updates repository state
3. **PR Creation** → Links to Linear issue
4. **Merge** → Closes Linear issue

## Documentation

- [Full Integration Guide](docs/linear-integration.md)
- [Webhook Deployment](docs/linear-webhook-deployment.md)
- [BMAD Agent Context](/.bmad-core/integrations/linear-context.md)

## Testing

```bash
# Run setup first
node scripts/setup-linear.js

# Test commands
node scripts/linear-cli.js list
node scripts/linear-cli.js get 10N-86
node scripts/linear-cli.js cycle
```

## Troubleshooting

### "LINEAR_API_KEY environment variable is required"
Run `node scripts/setup-linear.js` to configure your API key.

### Can't connect to Linear
1. Check your API key is valid
2. Verify you have access to 10netzero team
3. Test with: `node scripts/linear-cli.js list`

### Webhook not working
See [Webhook Deployment Guide](docs/linear-webhook-deployment.md)

## Next Steps

1. ✅ Install Linear SDK
2. ✅ Create integration module
3. ✅ Configure BMAD agents
4. ✅ Setup CLI tool
5. ⏳ Deploy webhook handler (optional)
6. ⏳ Enable real-time sync (optional)

---

*Linear is the Single Source of Truth for BigSirFLRTS project management*