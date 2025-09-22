# Repository Linear Integration Preparation Task

## Objective
Systematically prepare the repository for complete Linear workflow integration by eliminating sources of confusion, consolidating configurations, and migrating documentation.

## Prerequisites
- Linear MCP tools configured and working
- Understanding of current repository structure
- List of active vs deprecated components

## Execution Steps

### Phase 1: Configuration Audit (Context Rot Prevention)

```bash
# 1.1 Find ALL configuration files
echo "=== Configuration Files Audit ==="
find . -type f \( \
  -name "*.config.*" -o \
  -name "*rc.json" -o \
  -name "*rc.js" -o \
  -name ".*rc" -o \
  -name "*.json" \) \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  -not -path "./archive/*" \
  -not -path "./.archive/*" | sort | while read file; do
    echo "Found config: $file"
    # Check if it's referenced anywhere
    filename=$(basename "$file")
    usage_count=$(grep -r "$filename" . --exclude-dir=node_modules --exclude-dir=.git | wc -l)
    echo "  Usage count: $usage_count"
done
```

For each duplicate config found:
1. Determine which is actually used (check package.json, imports)
2. Merge necessary settings into primary config
3. Add header documentation explaining it's the single source
4. Delete duplicates
5. Create Linear issue documenting the consolidation

### Phase 2: Test Runner Standardization

```bash
# 2.1 Identify different test patterns
echo "=== Test Files by Type ==="
echo "Vitest TypeScript tests:"
find tests -name "*.test.ts" -o -name "*.spec.ts" | wc -l

echo "Node:test JavaScript tests:"
find tests -name "*.test.js" | grep -v node_modules | while read file; do
  if grep -q "node:test" "$file"; then
    echo "  - $file"
  fi
done

echo "Jest tests (if any):"
grep -l "describe.*expect" tests/**/*.js 2>/dev/null | grep -v vitest
```

Action items:
1. Convert all tests to use Vitest (single test runner)
2. Update test file imports from `node:test` to `vitest`
3. Remove Jest/other test runner configs
4. Update package.json test scripts
5. Document in Linear issue 10N-103

### Phase 3: Documentation Migration to Linear

```bash
# 3.1 Categorize documentation
echo "=== Documentation Audit ==="
find . -name "*.md" -not -path "./node_modules/*" -not -path "./.git/*" | while read doc; do
  # Check last modified date
  last_modified=$(git log -1 --format="%ar" -- "$doc" 2>/dev/null || echo "untracked")
  lines=$(wc -l < "$doc")
  echo "$doc - $lines lines - Last modified: $last_modified"
done
```

For each documentation file:
1. **Active & Important** → Create Linear document
2. **Setup/Config guides** → Move to Linear, leave README pointer
3. **Historical/Deprecated** → Move to `.archive/YYYY-MM/`
4. **Temporary/Scratch** → Delete after review

Create Linear documents using:
```javascript
await linear.createDocument({
  title: "[Original filename without .md]",
  content: "[Markdown content]",
  team: "10netzero"
});
```

### Phase 4: Dependency Cleanup

```bash
# 4.1 Find unused dependencies
echo "=== Checking for unused dependencies ==="
npx depcheck

# 4.2 Find duplicate package managers
ls -la | grep -E "yarn.lock|pnpm-lock|bun.lockb" && echo "WARNING: Multiple package managers detected!"

# 4.3 Check for old/deprecated packages
npm outdated
```

Actions:
1. Remove unused dependencies from package.json
2. Update outdated packages (careful with breaking changes)
3. Standardize on npm (remove other lock files)
4. Document dependency decisions in Linear

### Phase 5: File Naming & Structure

```bash
# 5.1 Find files with inconsistent naming
echo "=== Files potentially needing rename ==="
find . -type f -name "*[- ]copy*" -o -name "*_old*" -o -name "*_backup*" -o -name "*_v[0-9]*" | grep -v node_modules

# 5.2 Find similar named files (potential duplicates)
find . -type f -not -path "./node_modules/*" | xargs -I {} basename {} | sort | uniq -d
```

Standardize naming:
- No spaces in filenames (use hyphens)
- Consistent case (kebab-case for files)
- Remove version numbers from filenames (use git)
- No "copy", "backup", "old" in names

### Phase 6: Create Linear Tracking

Create epic in Linear:
```javascript
const epic = await linear.createIssue({
  title: "Repository Cleanup for Linear Integration",
  description: `
# Repository Preparation for Linear Workflow

## Objectives
- Eliminate configuration confusion
- Standardize test infrastructure
- Migrate documentation to Linear
- Clean up dependencies
- Establish single sources of truth

## Success Metrics
- Zero duplicate configs
- Single test runner (Vitest)
- All docs in Linear or archived
- Clean dependency tree
- No naming conflicts
`,
  team: "10netzero",
  labels: ["cleanup", "linear-integration"]
});
```

Create sub-tasks for each cleanup item found.

### Phase 7: Prevention Mechanisms

Create git hooks to prevent regression:

```bash
# .githooks/pre-commit
#!/bin/bash

# Prevent duplicate configs
if git diff --cached --name-only | grep -E "vitest\.config|jest\.config|\.eslintrc"; then
  count=$(find . -name "*vitest.config*" -o -name "*jest.config*" | wc -l)
  if [ $count -gt 1 ]; then
    echo "❌ Multiple test configs detected. Use existing config."
    exit 1
  fi
fi

# Prevent new .md files in certain directories
if git diff --cached --name-only | grep -E "^docs/stories|^docs/qa"; then
  echo "❌ Documentation should be created in Linear, not in /docs/"
  echo "   Create Linear issue/document instead"
  exit 1
fi

# Check for hardcoded secrets
if git diff --cached --name-status | grep -E "api_key|API_KEY|password|token" | grep -v ".env.example"; then
  echo "⚠️  Possible secret detected. Use environment variables!"
  exit 1
fi
```

### Phase 8: Validation

Run validation checks:
```bash
# All tests pass with single runner
npm run test:mvp

# No duplicate configs
find . -name "*.config.*" | xargs -I {} basename {} | sort | uniq -d

# Documentation migrated
ls docs/ | wc -l  # Should be minimal

# Dependencies clean
npm ls --depth=0  # No errors

# Git history preserved
git log --oneline | head -20  # Verify history intact
```

### Phase 9: Documentation in Linear

Create final report in Linear with:
1. Before/after metrics
2. Configurations consolidated
3. Documentation migrated (with Linear URLs)
4. Dependencies removed
5. Prevention mechanisms installed

## Success Criteria

✅ No duplicate configuration files
✅ Single test runner (Vitest) for all tests
✅ Documentation in Linear or properly archived
✅ Clean package.json with no unused deps
✅ Git hooks preventing regression
✅ All changes tracked in Linear issues

## Time Estimate
- Phase 1-2: 1 hour (configs & tests)
- Phase 3: 2 hours (documentation migration)
- Phase 4-5: 1 hour (dependencies & naming)
- Phase 6-9: 1 hour (Linear tracking & validation)

Total: ~5 hours for complete cleanup

## Notes
- Always create Linear issue before making changes
- Use git commits linking to Linear issues
- Archive rather than delete when uncertain
- Test after each phase to ensure nothing breaks
- Document decisions for future reference