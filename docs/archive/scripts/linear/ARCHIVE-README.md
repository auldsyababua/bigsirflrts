# Archived: Linear CLI and Webhook Scripts

**Archived Date:** 2025-10-17
**Original Locations:**
- /scripts/linear-cli.js
- /scripts/linear-webhook.js

**Reason:** No active usage found, Linear integration working without them

## Context

These scripts were created for Linear workspace management and webhook handling,
but are not actively used in package.json scripts or GitHub workflows.

## Scripts

### linear-cli.js

Command-line interface for Linear integration operations.

- Last Modified: 2025-09-22 (linting only)
- Dependencies: commander, chalk, dotenv
- Features: Issue listing, project management CLI
- Not in package.json scripts
- No workflow references found

### linear-webhook.js

Linear webhook event handler for triggering BMAD agents.

- Last Modified: 2025-09-22 (linting only)
- Dependencies: crypto (webhook signature verification)
- Features: Webhook signature verification, git branch creation
- Not in package.json scripts
- No workflow references found

## Why Archived

- Linear integration working via other mechanisms
- No package.json script references
- No GitHub workflow usage
- Last meaningful changes were linting fixes only
- No evidence of manual usage in documentation

## Recovery

```bash
git log --all -- scripts/linear-cli.js
git log --all -- scripts/linear-webhook.js
git checkout <commit-hash> -- scripts/linear-cli.js
git checkout <commit-hash> -- scripts/linear-webhook.js
```

## Related

- Linear workspace: colin-aulds (10nz.tools)
- Master dashboard: 10N-275
- Active Linear integration via @linear/sdk direct usage

## Breadcrumbs

- EVAL-002: scripts/linear-cli.js
- EVAL-003: scripts/linear-webhook.js
