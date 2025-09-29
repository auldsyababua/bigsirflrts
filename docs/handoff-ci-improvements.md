# CI/CD Improvements Handoff

**Date**: 2025-09-29
**Context**: Post-TypeScript cleanup and CI/CD policy implementation (PRs #13, #14, #15)
**Status**: PR #15 is open but failing CI - needs investigation before proceeding
**Repository**: <https://github.com/auldsyababua/bigsirflrts>

---

## ⚠️ IMPORTANT: PR #15 Status

**Current Issue**: PR #15 is failing CI checks despite:

- ✅ All TypeScript errors fixed locally (0 errors with `npx tsc --noEmit`)
- ✅ Unit tests passing locally
- ✅ Prettier passing on all PR files
- ✅ ESLint passing (warnings only)
- ✅ Added `audit-results/` to `.prettierignore`

**Action Required**: Before starting the CI improvements below, you must:

1. **Investigate the CI failure**:
   - Check the GitHub Actions logs for PR #15: <https://github.com/auldsyababua/bigsirflrts/pull/15>
   - Look at the "core" job in the PR Core workflow
   - Identify which step is failing (likely unit tests or typecheck)

2. **Possible causes**:
   - CI environment differences (Node version, dependencies)
   - Race conditions in tests
   - Missing environment variables
   - Flaky tests (see Qodo suggestions below)

3. **Fix the failure**:
   - Address the root cause
   - Push the fix to the `fix/remaining-typescript-errors` branch
   - Wait for CI to pass

4. **Merge PR #15**:
   - Only proceed with the tasks below after PR #15 is merged
   - This ensures you're working from a stable baseline

---

## 🤖 Qodo Code Review Suggestions

The Qodo-merge-pro bot identified three potential issues in the test code. **Consider addressing these as part of fixing PR #15 or as a follow-up PR**:

### 1. Possible Flaky Test (High Priority)

**Issue**: Exponential backoff verification uses strict boolean comparisons with tight tolerances

**Location**: `tests/integration/supabase-webhook-retry-backoff.test.ts` line 196

**Current Code**:

```typescript
expect(Math.abs(actualDelay - expectedDelay) <= tolerance).toBe(true);
```

**Problem**: Environmental timing jitter in CI could cause intermittent failures

**Recommended Fix**:

```typescript
// Option 1: Increase tolerance
const tolerance = expectedDelay * 0.75; // Increased from 0.5 to 0.75

// Option 2: Add retry logic
await expect.poll(async () => {
  const delay = calculateDelay();
  return Math.abs(delay - expectedDelay) <= tolerance;
}, { timeout: 5000, intervals: [100, 250, 500] }).toBe(true);

// Option 3: Use toBeCloseTo for numeric comparisons
expect(actualDelay).toBeCloseTo(expectedDelay, -2); // Within 100ms
```

### 2. Empty URL Risk (Medium Priority)

**Issue**: Fallback to empty string for webhook URL can cause TypeError

**Location**: `tests/integration/supabase-webhook-retry-backoff.test.ts` line 294

**Current Code**:

```typescript
const webhookUrl = testConfig.n8n?.webhookUrl || process.env.N8N_WEBHOOK_URL || '';
const response = await fetch(webhookUrl, { ... });
```

**Problem**: `fetch('')` throws TypeError instead of failing the test with a clear message

**Recommended Fix**:

```typescript
const webhookUrl = testConfig.n8n?.webhookUrl || process.env.N8N_WEBHOOK_URL;
if (!webhookUrl) {
  throw new Error('N8N_WEBHOOK_URL is required but not configured. Set testConfig.n8n.webhookUrl or N8N_WEBHOOK_URL environment variable.');
}
const response = await fetch(webhookUrl, { ... });
```

### 3. Mock Access Safety (Low Priority)

**Issue**: Accessing `vi.mocked(...).mock.calls[0]?.[0]` assumes at least one call

**Location**: `tests/unit/opentelemetry-sdk.test.ts` lines 143, 156, 171

**Current Code**:

```typescript
const exporterConfig = vi.mocked(OTLPTraceExporter).mock.calls[0]?.[0];
expect(exporterConfig?.headers).toHaveProperty('authorization', `Bearer ${testApiKey}`);
```

**Problem**: If mocking changes, this could be undefined and mask test failures

**Recommended Fix**:

```typescript
// Assert call count first
expect(vi.mocked(OTLPTraceExporter)).toHaveBeenCalledTimes(1);
const exporterConfig = vi.mocked(OTLPTraceExporter).mock.calls[0][0];
expect(exporterConfig.headers).toHaveProperty('authorization', `Bearer ${testApiKey}`);
```

**Implementation Strategy**:

- Fix #1 (flaky test) immediately if CI is failing intermittently
- Fix #2 (empty URL) as part of PR #15 or a quick follow-up
- Fix #3 (mock safety) as a follow-up PR (low priority)

---

## Background

The CI/CD pipeline was recently restructured to follow 2025 best practices for AI-driven development:

- **PR Core** (`.github/workflows/pr-core.yml`): Fast, blocking checks (ESLint, Prettier, TypeScript, unit tests)
- **Docs Lint** (`.github/workflows/docs-lint.yml`): Advisory markdown linting (non-blocking)
- **QA Gate** (`.github/workflows/bmad-qa-gate.yml` and `bmad-qa-gate-fast.yml`): Comprehensive validation (post-merge/nightly)
- **Pre-push hook** (`.husky/pre-push`): Fast local checks with escape hatches

All TypeScript errors have been resolved (68 → 0) and strict typecheck is now enabled in PR Core.

---

## Tasks to Complete

### Task 1: Test Suite Parallelization (High Priority)

**Goal**: Reduce QA Gate run time from 10-15 minutes to 5-7 minutes

**Current State**: QA Gate runs lint, format:check, and test:mvp sequentially

**Required Changes**:

1. **Edit `.github/workflows/bmad-qa-gate.yml`**:
   - Split the single `qa-gate` job into three parallel jobs: `lint`, `format`, and `test`
   - Each job should run independently with its own checkout and dependency installation
   - Keep the same environment variables and secrets

2. **Edit `.github/workflows/bmad-qa-gate-fast.yml`**:
   - Apply the same parallelization as above
   - Preserve the existing caching configuration

**Implementation Pattern**:

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: 'npm'
      - run: npm ci || npm i
      - run: npm run lint

  format:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: 'npm'
      - run: npm ci || npm i
      - run: npm run format:check

  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: 'npm'
      - run: npm ci || npm i
      - name: Install tools (ripgrep, shellcheck)
        run: |
          sudo apt-get update
          sudo apt-get install -y ripgrep shellcheck
      - name: Install Playwright (Chromium)
        run: npx playwright install --with-deps chromium
      - run: npm run test:mvp
        env:
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          NODE_ENV: "test"
          CI: "true"
```

**Files to Modify**:

- `.github/workflows/bmad-qa-gate.yml`
- `.github/workflows/bmad-qa-gate-fast.yml`

**Testing**:

- Push changes to a test branch
- Verify all three jobs run in parallel
- Confirm total workflow time is reduced

---

### Task 2: Dependency Caching Consistency (Medium Priority)

**Goal**: Save 30-60 seconds per workflow run

**Current State**: Only `bmad-qa-gate-fast.yml` uses npm caching; standard QA gate doesn't

**Required Changes**:

1. **Edit `.github/workflows/bmad-qa-gate.yml`**:
   - Add `cache: 'npm'` to the `actions/setup-node@v4` step
   - This should be done in all jobs if you've parallelized (Task 1)

2. **Edit `.github/workflows/pr-core.yml`**:
   - Add `cache: 'npm'` to the `actions/setup-node@v4` step

**Implementation Pattern**:

```yaml
- name: Use Node.js 20
  uses: actions/setup-node@v4
  with:
    node-version: "20"
    cache: 'npm'  # Add this line
```

**Files to Modify**:

- `.github/workflows/bmad-qa-gate.yml`
- `.github/workflows/pr-core.yml`

**Testing**:

- Check workflow logs for "Cache restored from key: ..." messages
- Verify dependency installation time decreases on subsequent runs

---

### Task 3: E2E Conditional Execution (Low Priority)

**Goal**: Skip E2E tests on most post-merge runs, saving 2-3 minutes

**Current State**: E2E tests run on every QA Gate execution

**Required Changes**:

1. **Edit `.github/workflows/bmad-qa-gate.yml`** and **`.github/workflows/bmad-qa-gate-fast.yml`**:
   - Add conditional execution to E2E test step
   - Run E2E tests only when:
     - Commit message contains `[e2e]`
     - Workflow is triggered by schedule (nightly)
     - Workflow is manually dispatched

**Implementation Pattern**:

```yaml
- name: Run E2E tests
  if: contains(github.event.head_commit.message, '[e2e]') || github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
  run: npm run test:e2e
  env:
    # ... existing env vars
```

**Alternative**: Split test:mvp into separate steps:

```yaml
- name: Unit tests
  run: npm run test:unit

- name: Integration tests
  run: npm run test:integration

- name: E2E tests
  if: contains(github.event.head_commit.message, '[e2e]') || github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
  run: npm run test:e2e
```

**Files to Modify**:

- `.github/workflows/bmad-qa-gate.yml`
- `.github/workflows/bmad-qa-gate-fast.yml`

**Testing**:

- Push a commit without `[e2e]` → E2E tests should be skipped
- Push a commit with `[e2e]` → E2E tests should run
- Verify nightly scheduled runs still execute E2E tests

---

### Task 4: Husky Deprecation Fix (Maintenance)

**Goal**: Remove deprecated Husky configuration to prevent failures in v10

**Current State**: Pre-commit and pre-push hooks show deprecation warnings

**Required Changes**:

1. **Edit `.husky/pre-commit`**:
   - Remove the first two lines:

     ```bash
     #!/usr/bin/env sh
     . "$(dirname -- "$0")/_/husky.sh"
     ```

   - Keep all other content unchanged

2. **Edit `.husky/pre-push`**:
   - Remove the first two lines (same as above)
   - Keep all other content unchanged

**Files to Modify**:

- `.husky/pre-commit`
- `.husky/pre-push`

**Testing**:

- Run `git commit` locally → should not show deprecation warning
- Run `git push` locally → should not show deprecation warning
- Verify hooks still execute correctly

---

### Task 5: Test Artifacts on Failure (Developer Experience)

**Goal**: Make CI failures easier to debug by preserving test results

**Current State**: No artifacts are saved when tests fail

**Required Changes**:

1. **Edit `.github/workflows/pr-core.yml`**:
   - Add artifact upload step after unit tests
   - Only upload on failure

2. **Edit `.github/workflows/bmad-qa-gate.yml`** and **`.github/workflows/bmad-qa-gate-fast.yml`**:
   - Add artifact upload steps after test execution
   - Only upload on failure

**Implementation Pattern**:

```yaml
- name: Unit tests (@P0)
  run: npm run test:unit

- name: Upload test results on failure
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: test-results-${{ github.run_id }}
    path: |
      test-results/
      playwright-report/
      coverage/
    retention-days: 7
```

**Files to Modify**:

- `.github/workflows/pr-core.yml`
- `.github/workflows/bmad-qa-gate.yml`
- `.github/workflows/bmad-qa-gate-fast.yml`

**Testing**:

- Introduce a failing test
- Push to trigger CI
- Verify artifacts are uploaded and downloadable from GitHub Actions UI

---

## Implementation Order

**Recommended sequence**:

1. **Task 4** (Husky deprecation) - Quick win, no risk
2. **Task 2** (Dependency caching) - Easy, immediate benefit
3. **Task 1** (Test parallelization) - Biggest impact, moderate complexity
4. **Task 5** (Test artifacts) - Developer experience improvement
5. **Task 3** (E2E conditional) - Optional optimization

**Alternative**: Do all tasks in a single PR if you're confident in the changes.

---

## Important Notes

### Branch Protection

The repository has branch protection on `main` requiring the "core" check to pass. Make sure:

- PR Core workflow continues to work after changes
- The job name remains "core" (or update branch protection if you rename it)

### Secrets Required

The following secrets are configured and used in workflows:

- `SUPABASE_PROJECT_ID`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Do not remove or modify secret references without confirming they're no longer needed.

### Testing Strategy

For each task:

1. Create a feature branch (e.g., `ci/test-parallelization`)
2. Make changes
3. Push and verify workflows run correctly
4. Open PR and confirm PR Core passes
5. Merge to main
6. Verify post-merge QA Gate runs successfully

### Rollback Plan

If any change causes issues:

1. Revert the commit: `git revert <commit-hash>`
2. Push the revert
3. Investigate the issue
4. Re-implement with fixes

---

## Success Criteria

**Task 1**: QA Gate completes in 5-7 minutes (down from 10-15)  
**Task 2**: Workflow logs show cache hits, dependency install time reduced  
**Task 3**: E2E tests skip on regular commits, run on `[e2e]` commits  
**Task 4**: No Husky deprecation warnings in git output  
**Task 5**: Test artifacts available for download when tests fail  

---

## Questions?

If you encounter issues:

1. Check the GitHub Actions logs for error messages
2. Verify the workflow syntax with `actionlint` (if available)
3. Test locally with `act` (GitHub Actions local runner) if possible
4. Consult the GitHub Actions documentation: <https://docs.github.com/en/actions>

---

## Related PRs

- **PR #13**: CI/CD policy implementation (merged)
- **PR #14**: First batch of TypeScript fixes (merged)
- **PR #15**: Final TypeScript fixes + strict typecheck (open, awaiting merge)

Wait for PR #15 to merge before starting these improvements.
