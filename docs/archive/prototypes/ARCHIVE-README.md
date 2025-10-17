# Archived: Code Prototypes

**Archived Date:** 2025-10-16
**Reason:** Orphaned code with no active imports

## linear-integration.js

**Original Location:** /lib/linear-integration.js
**Last Modified:** 2025-09-22 (linting fix only)
**Size:** 5.9KB

Linear integration module for BigSirFLRTS. Exports LinearIntegration class
with methods for getCurrentUser(), getProject(), etc.

### Why Archived

- No imports found in entire codebase
- Single-file directory (anti-pattern)
- Last meaningful change was linting, not feature work
- Likely superseded by @linear/sdk direct usage

### Recovery

```bash
git log --all -- lib/linear-integration.js
git checkout <commit-hash> -- lib/linear-integration.js
```

### Breadcrumb

CONS-001: lib/linear-integration.js → docs/archive/prototypes/
