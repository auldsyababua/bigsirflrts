# Qodo Gen Test Generation Prompt for FLRTS MVP

## Context

We're building an MVP for 5-10 C-suite users that needs a pragmatic test suite
focused on critical paths only. This is NOT enterprise-grade testing - we need
just enough confidence to demo reliably.

## Project Files to Analyze

### Story & Requirements

- **Story File**:
  `/Users/colinaulds/Desktop/projects/bigsirflrts/docs/stories/1.1.deploy-openproject-cloudflare.md`
- **QA Gate**:
  `/Users/colinaulds/Desktop/projects/bigsirflrts/docs/qa/gates/1.1-deploy-openproject-cloudflare.yml`
- **Test Design**:
  `/Users/colinaulds/Desktop/projects/bigsirflrts/docs/qa/assessments/1.1-test-design-mvp-20250109.md`
- **Test Scenarios**:
  `/Users/colinaulds/Desktop/projects/bigsirflrts/docs/qa/test-scenarios/1.1-mvp-scenarios.md`

### Architecture & Standards

- **Tech Stack**:
  `/Users/colinaulds/Desktop/projects/bigsirflrts/docs/architecture/tech-stack.md`
- **Coding Standards**:
  `/Users/colinaulds/Desktop/projects/bigsirflrts/docs/architecture/coding-standards.md`
- **Source Tree**:
  `/Users/colinaulds/Desktop/projects/bigsirflrts/docs/architecture/source-tree.md`

### Implementation Guide

- **MVP Test Guide**:
  `/Users/colinaulds/Desktop/projects/bigsirflrts/docs/qa/implementation/mvp-test-implementation-guide.md`

## Your Task

Generate a complete MVP test suite for Story 1.1 (Deploy OpenProject to
Cloudflare) with these specific requirements:

### 1. Test Structure Creation

Create the following test files:

- `tests/unit/api-validation.test.ts` - 2 unit tests for API key validation
- `tests/integration/deployment.test.ts` - 6 integration tests for deployment
  and API
- `tests/e2e/executive-workflows.test.ts` - 4 E2E tests for C-suite workflows
- `tests/mvp-smoke-test.sh` - Bash script for quick validation

### 2. GitHub Actions Workflow

Create `.github/workflows/mvp-tests.yml` with:

- Runs in < 5 minutes total
- Only P0 tests (8 tests)
- Cloudflare deployment validation
- Slack notification on failure only

### 3. Test Implementation Requirements

#### CRITICAL: Focus on What MUST Work

- Executive login (no embarrassing failures)
- Basic task creation
- Data persistence
- API authentication
- System health check

#### SKIP These (Not needed for MVP)

- Edge cases
- Performance optimization beyond basic targets
- Security hardening beyond basics
- Load testing
- Cross-browser (Chrome only)
- Accessibility testing

### 4. Use These Testing Tools

- **Vitest** for unit/integration tests
- **Playwright** for E2E (Chrome only)
- **Simple bash scripts** for smoke tests
- **Mock everything external** to avoid dependencies

### 5. Given-When-Then Scenarios

Implement the 8 P0 scenarios from the test design:

1. `1.1-INT-001`: Wrangler deploy succeeds
2. `1.1-E2E-001`: Homepage loads < 3 seconds
3. `1.1-UNIT-001`: API key format validation
4. `1.1-INT-002`: Valid API authentication
5. `1.1-INT-003`: Invalid API graceful rejection
6. `1.1-E2E-002`: Admin login via UI
7. `1.1-E2E-003`: Create task in UI
8. `1.1-UNIT-002`: Health check returns 200

### 6. Package.json Scripts

Add these test scripts:

```json
{
  "scripts": {
    "test:mvp": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:unit": "vitest run tests/unit --reporter=dot",
    "test:integration": "vitest run tests/integration --reporter=dot",
    "test:e2e": "playwright test tests/e2e --grep @P0",
    "test:smoke": "bash tests/mvp-smoke-test.sh"
  }
}
```

## MCP Tools Available for Research

You have access to these MCP tools:

1. **GitHub** - Search for similar test implementations
2. **Ref.tools** - Look up Vitest/Playwright best practices
3. **Exa Search** - Find Cloudflare Workers testing patterns
4. **Supabase** - Validate database operations if needed

## Expected Output

Generate:

1. Complete test files with actual test implementations
2. GitHub Actions workflow file
3. Smoke test bash script
4. Updated package.json with dependencies and scripts
5. Simple README for running tests locally

## Success Criteria

✅ Tests can run in 5 minutes ✅ All 8 P0 tests pass reliably ✅ Executives can
demo without errors ✅ No complex setup required ✅ Uses mocks to avoid external
dependencies

## Time Budget

This should take 4 hours to implement:

- 1 hour: Setup and structure
- 2 hours: Write tests
- 1 hour: CI/CD setup

Remember: This is an MVP for 5-10 users. Pragmatic > Perfect!
