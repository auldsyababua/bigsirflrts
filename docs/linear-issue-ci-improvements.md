# Linear Issue: CI/CD Performance Improvements

**Title**: Implement CI/CD Performance Improvements

**Team**: Infrastructure/DevOps (or appropriate team)

**Priority**: Medium

**Labels**:

- `ci-cd`
- `performance`
- `infrastructure`
- `agent-infra-devops`

---

## Description

Following the completion of PR #15 (TypeScript cleanup and strict typecheck), we
have 5 prioritized tasks to improve CI/CD performance and reliability.

### Context

- **PR #13**: CI/CD policy implementation (merged)
- **PR #14**: First batch of TypeScript fixes (merged)
- **PR #15**: Final TypeScript fixes + strict typecheck (merged)

All TypeScript errors resolved (68 → 0), strict typecheck enabled. Ready for
performance optimizations.

---

## Tasks

### 1. Test Suite Parallelization (High Priority)

**Goal**: Reduce QA Gate run time from 10-15 minutes to 5-7 minutes

**What**: Split QA Gate workflows into parallel jobs (lint, format, test)
instead of sequential execution.

**Files**:

- `.github/workflows/bmad-qa-gate.yml`
- `.github/workflows/bmad-qa-gate-fast.yml`

**Expected Impact**: 40-50% reduction in QA Gate run time

---

### 2. Dependency Caching Consistency (Medium Priority)

**Goal**: Save 30-60 seconds per workflow run

**What**: Add `cache: 'npm'` to all workflows that don't have it yet.

**Files**:

- `.github/workflows/bmad-qa-gate.yml`
- `.github/workflows/pr-core.yml`

**Expected Impact**: Faster dependency installation on all workflow runs

---

### 3. E2E Conditional Execution (Low Priority)

**Goal**: Skip E2E tests on most runs, saving 2-3 minutes

**What**: Run E2E tests only when:

- Commit message contains `[e2e]`
- Workflow triggered by schedule (nightly)
- Workflow manually dispatched

**Files**:

- `.github/workflows/bmad-qa-gate.yml`
- `.github/workflows/bmad-qa-gate-fast.yml`

**Expected Impact**: Faster feedback loop for most commits

---

### 4. Husky Deprecation Fix (Maintenance)

**Goal**: Remove deprecated Husky configuration to prevent failures in v10

**What**: Remove the first two lines from pre-commit and pre-push hooks:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
```

**Files**:

- `.husky/pre-commit`
- `.husky/pre-push`

**Expected Impact**: Future-proof git hooks, cleaner output

---

### 5. Test Artifacts on Failure (Developer Experience)

**Goal**: Make CI failures easier to debug

**What**: Upload test results, Playwright reports, and coverage when tests fail.

**Files**:

- `.github/workflows/pr-core.yml`
- `.github/workflows/bmad-qa-gate.yml`
- `.github/workflows/bmad-qa-gate-fast.yml`

**Expected Impact**: Faster debugging of CI failures

---

## Documentation

**Complete implementation guide**: `docs/handoff-ci-improvements.md`

This document includes:

- ✅ Step-by-step instructions for each task
- ✅ Code examples and implementation patterns
- ✅ Local/CI parity guidelines (lessons from PR #15)
- ✅ Testing procedures for each change
- ✅ Success criteria
- ✅ Rollback plan

---

## Recommended Implementation Order

1. **Task 4** (Husky deprecation) - Quick win, no risk, 5 minutes
2. **Task 2** (Dependency caching) - Easy, immediate benefit, 15 minutes
3. **Task 1** (Test parallelization) - Biggest impact, 30-45 minutes
4. **Task 5** (Test artifacts) - Developer experience, 20 minutes
5. **Task 3** (E2E conditional) - Optional optimization, 15 minutes

**Total estimated time**: 1.5-2 hours for all tasks

---

## Success Criteria

- ✅ QA Gate completes in 5-7 minutes (down from 10-15)
- ✅ Workflow logs show cache hits
- ✅ E2E tests skip on regular commits
- ✅ No Husky deprecation warnings
- ✅ Test artifacts available on failure

---

## Important Notes

### Local/CI Parity

PR #15 revealed critical mismatches between local and CI environments:

1. **Missing type definitions** - `@types/js-yaml` was local-only, not in
   package.json
2. **ESLint warnings** - Failed CI but not local builds
3. **npm ci vs npm install** - Different dependency resolution

**Solution**: The handoff document includes a comprehensive "Ensuring Local/CI
Parity" section with:

- Pre-push checklist to test CI commands locally
- Common mismatches table
- Debugging guide

**Before implementing**: Review this section to avoid similar issues.

---

## Related Issues

- Completes the CI/CD modernization started in PR #13
- Builds on TypeScript cleanup from PRs #14 and #15
- Prepares infrastructure for future scaling

---

## Acceptance Criteria

- [ ] All 5 tasks implemented and tested
- [ ] QA Gate run time reduced to target (5-7 minutes)
- [ ] No new CI failures introduced
- [ ] Documentation updated if needed
- [ ] Changes verified in at least 3 workflow runs

---

## Additional Context

This work was prepared by an AI agent following the completion of PR #15. The
handoff document was specifically designed to be picked up by another agent or
developer with minimal context needed.

All code examples, testing procedures, and success criteria are documented in
`docs/handoff-ci-improvements.md`.
