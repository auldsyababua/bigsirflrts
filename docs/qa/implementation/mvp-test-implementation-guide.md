# MVP Test Implementation Guide

## Quick Start (Total Time: 4 hours)

### Hour 1: Setup Qodo & Basic Structure

```bash
# Install Qodo CLI
npm install -g @qodo/cli

# Initialize in project
cd /Users/colinaulds/Desktop/projects/bigsirflrts
qodo init --minimal

# Generate basic test structure
qodo scaffold --tests-only --mvp
```

### Hour 2: Implement P0 Tests

```bash
# Create test directory structure
mkdir -p tests/{unit,integration,e2e}
mkdir -p .github/workflows

# Generate tests from our scenarios
qodo generate --from docs/qa/test-scenarios/1.1-mvp-scenarios.md
```

### Hour 3: GitHub Actions CI/CD Setup

Create `.github/workflows/mvp-tests.yml`:

```yaml
name: MVP Test Suite

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch: # Allow manual trigger

env:
  OPENPROJECT_URL: ${{ secrets.OPENPROJECT_URL }}
  API_KEY: ${{ secrets.API_KEY }}
  ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}

jobs:
  quick-validation:
    runs-on: ubuntu-latest
    timeout-minutes: 10 # MVP doesn't need long tests

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci --prefer-offline

      - name: Run P0 Unit Tests (2 tests)
        run: npm run test:unit -- --grep "@P0"

      - name: Run P0 Integration Tests (6 tests)
        run: npm run test:integration -- --grep "@P0"

      - name: Setup Playwright (for 4 E2E tests only)
        run: npx playwright install chromium # Chrome only for MVP

      - name: Run P0 E2E Tests
        run: npm run test:e2e -- --grep "@P0"

      - name: Quick Smoke Test
        run: |
          curl -f ${{ secrets.OPENPROJECT_URL }}/health || exit 1
          echo "✅ Health check passed"

  deploy-validation:
    needs: quick-validation
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Setup Docker
        run: |
          docker --version
          docker-compose --version

      - name: Validate Deployment
        run: |
          docker-compose -f docker/openproject/docker-compose.yml config
          echo "✅ Docker deployment configuration valid"

  notify-executives:
    needs: [quick-validation, deploy-validation]
    runs-on: ubuntu-latest
    if: failure() # Only notify on failures

    steps:
      - name: Send Slack Alert
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: '🚨 MVP Tests Failed - Executive Demo at Risk'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Hour 4: Simplified Test Files

Create `tests/mvp-critical-paths.test.js`:

```javascript
import { test, expect } from '@playwright/test';
import { validateApiKey } from '../src/auth';

// Tag all tests for easy filtering
test.describe('MVP Critical Paths @P0', () => {
  test('Executive can access system', async ({ page }) => {
    // Qodo will enhance this with better selectors
    await page.goto(process.env.OPENPROJECT_URL);
    await expect(page).toHaveTitle(/OpenProject/);

    // Quick login check
    await page.fill('#username', 'admin@company.com');
    await page.fill('#password', process.env.ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('API authentication works', async () => {
    const response = await fetch(
      `${process.env.OPENPROJECT_URL}/api/v3/users/me`,
      {
        headers: {
          Authorization: `Bearer ${process.env.API_KEY}`,
        },
      }
    );
    expect(response.status).toBe(200);
  });

  test('Can create a task', async ({ page }) => {
    // Reuse login from helper
    await loginAsAdmin(page);

    await page.goto('/projects/tasks');
    await page.click('button:text("Create")');
    await page.fill('input[name="subject"]', 'Test Task');
    await page.click('button:text("Save")');

    await expect(page.locator('text=Test Task')).toBeVisible();
  });
});

// Helper function
async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.fill('#username', 'admin@company.com');
  await page.fill('#password', process.env.ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
}
```

## Qodo Configuration

Create `qodo.config.json`:

```json
{
  "mode": "mvp",
  "coverage": {
    "target": 40,
    "focusOn": ["auth", "api", "crud"]
  },
  "generation": {
    "style": "simple",
    "avoidComplexity": true,
    "mockExternal": true
  },
  "ci": {
    "fastFail": true,
    "parallel": false,
    "timeout": 300
  }
}
```

## Package.json Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "npm run test:mvp",
    "test:mvp": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:unit": "vitest run tests/unit --reporter=dot",
    "test:integration": "vitest run tests/integration --reporter=dot",
    "test:e2e": "playwright test tests/e2e --grep @P0",
    "test:smoke": "bash tests/mvp-smoke-test.sh",
    "qodo:generate": "qodo generate --config qodo.config.json",
    "qodo:enhance": "qodo enhance tests/mvp-critical-paths.test.js"
  }
}
```

## GitHub MCP Commands to Set Up

Using the GitHub MCP tools:

```javascript
// 1. Create the workflow file
await mcp__github__create_or_update_file({
  owner: 'colinaulds',
  repo: 'bigsirflrts',
  path: '.github/workflows/mvp-tests.yml',
  content: workflowYamlContent,
  message: 'Add MVP test suite CI/CD',
  branch: 'main',
});

// 2. Set up secrets
// Note: Secrets must be added via GitHub UI or API with admin access
// Navigate to Settings > Secrets > Actions and add:
// - OPENPROJECT_URL
// - API_KEY
// - ADMIN_PASSWORD
// - CF_API_TOKEN
// - SLACK_WEBHOOK

// 3. Create test files
await mcp__github__create_or_update_file({
  owner: 'colinaulds',
  repo: 'bigsirflrts',
  path: 'tests/mvp-critical-paths.test.js',
  content: testFileContent,
  message: 'Add MVP critical path tests',
  branch: 'main',
});

// 4. Trigger the workflow
await mcp__github__run_workflow({
  owner: 'colinaulds',
  repo: 'bigsirflrts',
  workflow_id: 'mvp-tests.yml',
  ref: 'main',
});

// 5. Monitor results
await mcp__github__get_workflow_run({
  owner: 'colinaulds',
  repo: 'bigsirflrts',
  run_id: runId,
});
```

## Quick Validation Script

Create `tests/mvp-smoke-test.sh`:

```bash
#!/bin/bash
# Ultra-simple smoke test for local validation

set -e  # Exit on any failure

echo "🧪 Running MVP Smoke Tests..."

# Check deployment
echo -n "1. Checking deployment... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $OPENPROJECT_URL)
[ "$STATUS" = "200" ] && echo "✅" || (echo "❌ Got $STATUS" && exit 1)

# Check health
echo -n "2. Checking health endpoint... "
curl -s $OPENPROJECT_URL/health | grep -q "healthy" && echo "✅" || (echo "❌" && exit 1)

# Check API auth
echo -n "3. Checking API authentication... "
RESPONSE=$(curl -s -H "Authorization: Bearer $API_KEY" $OPENPROJECT_URL/api/v3/users/me)
echo $RESPONSE | grep -q "User" && echo "✅" || (echo "❌" && exit 1)

# Check for errors in logs (if accessible)
echo -n "4. Checking for errors... "
# This would check Cloudflare logs if available
echo "⏭️  Skipped (logs not accessible in CI)"

echo ""
echo "✅ All smoke tests passed!"
echo "Ready for executive demo 🎉"
```

## Monitoring & Alerts

### Simple GitHub Actions Status Badge

Add to README.md:

```markdown
![MVP Tests](https://github.com/colinaulds/bigsirflrts/actions/workflows/mvp-tests.yml/badge.svg)
```

### Slack Notification Setup

1. Create Slack webhook in your workspace
2. Add to GitHub secrets as `SLACK_WEBHOOK`
3. Notifications only sent on failures (executives don't need success spam)

## Manual Testing Checklist

For executive demos, also run through:

- [ ] Login with executive account works
- [ ] Create a task with realistic title
- [ ] Edit the task
- [ ] Verify it persists after refresh
- [ ] Check loading times are acceptable
- [ ] No console errors in browser
- [ ] Mobile view is acceptable (if used)

## Time-Saving Tips

1. **Use Qodo's quick mode**: `qodo generate --quick`
2. **Skip code coverage**: Not needed for MVP
3. **One browser only**: Chrome is sufficient
4. **No retries**: Tests should pass first time
5. **Fast timeouts**: 5 second max wait
6. **Mock everything external**: Use Qodo's auto-mock

## What We're NOT Doing

- ❌ Integration with external monitoring (DataDog, etc.)
- ❌ Performance profiling
- ❌ Security scanning (beyond basic)
- ❌ Accessibility testing
- ❌ Cross-browser testing
- ❌ Visual regression testing
- ❌ API contract testing
- ❌ Mutation testing

## Success Metrics

✅ **MVP Testing is successful when:**

- GitHub Actions runs in < 5 minutes
- All 8 P0 tests pass
- Executives can demo without errors
- No data loss occurs
- System stays up during work hours

---

**Total Implementation Time: 4 hours**

- Not 4 days
- Not 4 weeks
- Just 4 focused hours

_This guide prioritizes shipping over perfection, appropriate for an MVP with
5-10 users._
