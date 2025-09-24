# FLRTS Testing Infrastructure

This directory contains multiple test suites for the FLRTS project:

## 🔐 **Secure API Testing Infrastructure** (New)

**Status: ✅ WORKING** - Complete testing infrastructure with 1Password Service
Account integration and Node.js native test runner.

### **Quick Start**

```bash
# Run API tests with 1Password secret injection
npm run test:api

# Run all secure tests
npm run test:secure

# Run Edge Function → n8n webhook integration tests
npm run test:integration:webhook

# Run performance regression tests
npm run test:performance

# Watch mode for development
npm run test:api:watch
```

### **Architecture**

#### **Security Features**

- ✅ **No secrets in code** - All secrets via 1Password references
- ✅ **Git-safe** - Environment files excluded from version control
- ✅ **Service Account** - Works in CI/CD environments
- ✅ **Secure injection** - Secrets only available during test execution

#### **Testing Stack**

- **Node.js Native Test Runner** - Zero dependencies, fast execution
- **1Password CLI** - Secure secret management
- **Native fetch()** - Built-in HTTP client (Node.js 22)
- **Native assert** - No external assertion libraries

### **Directory Structure**

```bash
tests/
├── README.md                                # This file
├── .env.test                               # 1Password secret references (safe to commit)
├── .env.local                              # Local testing fallback (git-ignored)
├── config/
│   └── test-config.js                     # Test configuration module
├── api/
│   └── edge-functions.test.js             # Supabase Edge Function tests
├── integration/
│   ├── edge-function-n8n-webhook.test.js  # Edge Function → n8n webhook tests
│   └── performance-regression.test.js     # Performance regression tests
├── run-tests.js                           # Secure test runner
└── run-integration-tests.js               # Integration test runner
```

### **1Password Configuration**

#### **Required Vault Setup**

Your "MCP Secrets" vault needs these items:

**Item: "FLRTS SECRETS"**

```bash
SUPABASE_PROJECT_ID: thnwlykidzhrsagyjncc
SUPABASE_URL: https://thnwlykidzhrsagyjncc.supabase.co
SUPABASE_ANON_KEY: [your-anon-key]
SUPABASE_SERVICE_ROLE_KEY: [your-service-role-key]
N8N_WEBHOOK_URL: https://n8n-rrrs.sliplane.app/webhook/telegram-task-creation
OPENAI_API_KEY: [your-openai-key]
TELEGRAM_BOT_TOKEN: [your-bot-token] (optional)
TELEGRAM_WEBHOOK_SECRET: [your-webhook-secret] (optional)
```

#### **Service Account Setup**

```bash
# Set your Service Account token
export OP_SERVICE_ACCOUNT_TOKEN="ops_your_token_here"

# Verify access
op vault list
```

### **Troubleshooting**

#### **Common 1Password Issues**

```bash
# Clear conflicting sessions
op signout --all

# Check CLI version (need 2.18.0+)
op --version

# Verify Service Account token format
echo $OP_SERVICE_ACCOUNT_TOKEN | head -c 10  # Should show "ops_"
```

#### **"Signin credentials are not compatible"**

**Solution:** Clear all OP\_ environment variables and sessions:

```bash
op signout --all
unset OP_SESSION_my
export OP_SERVICE_ACCOUNT_TOKEN="your_token"
```

---

## 🔄 **Webhook Retry and Backoff Testing** (Story 1.5)

**Status: ✅ COMPLETE** - Comprehensive testing suite for webhook retry
mechanisms with exponential backoff.

### **What's Tested**

- ✅ Exponential backoff pattern validation (1s → 2s → 4s → 8s → 16s → 32s
  capped)
- ✅ Circuit breaker behavior (max retry attempts enforcement)
- ✅ Recovery after temporary failures
- ✅ Performance impact during retry scenarios
- ✅ High-frequency webhook operations under load
- ✅ Configuration parameter validation

### **Quick Commands**

```bash
# Run all retry tests
op run --env-file=tests/.env.test -- node tests/run-retry-tests.js

# Test specific failure scenarios
node tests/helpers/retry-test-simulator.js --scenario=exponential-backoff
node tests/helpers/retry-test-simulator.js --scenario=circuit-breaker
node tests/helpers/retry-test-simulator.js --scenario=recovery

# Run retry tests directly
op run --env-file=tests/.env.test -- node --test tests/integration/supabase-webhook-retry-backoff.test.js
```

### **Documentation**

- 📖 **[Complete Retry Testing Guide](../docs/misc/webhook-retry-testing.md)** -
  Detailed documentation, configuration, and troubleshooting

---

## 🔗 **Edge Function → n8n Webhook Integration Tests** (Story 1.4)

**Status: ✅ NEW** - Automated testing for the "Reflex + Brain" architecture
pattern.

### **What's Tested**

**Integration Tests:**

- ✅ Complete Edge Function → n8n webhook flow
- ✅ "Reflex + Brain" architecture pattern validation
- ✅ Telegram payload processing end-to-end
- ✅ Error handling and resilience under load
- ✅ Webhook endpoint health monitoring

**Performance Tests:**

- ✅ Edge Function response time <200ms requirement
- ✅ n8n webhook response time <200ms requirement
- ✅ Performance regression detection
- ✅ Load testing with concurrent requests
- ✅ Recovery testing after load spikes

### **Quick Commands**

```bash
# Run integration tests
npm run test:integration:webhook

# Run performance tests
npm run test:performance

# Run specific test suite
node tests/run-integration-tests.js --suite=edge-function-n8n-webhook

# Run with verbose output
node tests/run-integration-tests.js --verbose
```

### **CI/CD Integration**

- GitHub Actions workflow at `.github/workflows/integration-tests.yml`
- Runs on push/PR and daily at 6 AM UTC
- Uses 1Password Service Account for secure secret injection
- Validates webhook health and performance thresholds
- Alerts on architecture drift or performance regressions

---

## 📋 **MVP P0 Test Suite** (Story 1.1)

This is a pragmatic test suite for Story 1.1 (Deploy OpenProject to Cloudflare)
targeting 5–10 C‑suite users. It focuses on P0 paths only and runs in <5
minutes.

What's covered (P0):

- Wrangler deploy success (mocked)
- Homepage loads < 3 seconds (E2E)
- API key format validation (unit)
- Valid API authentication (integration)
- Invalid API graceful rejection (integration)
- Admin login via UI (E2E)
- Create task in UI (E2E)
- Health check returns 200 (unit)

Tools:

- Vitest for unit/integration
- Playwright for E2E (Chromium only)
- Simple bash smoke test
- All external dependencies are mocked

## Setup

- Node.js 18+ (20 recommended)

Install dependencies and Playwright Chromium:

```bash
npm install
npx playwright install chromium
```

## Run tests

- Full MVP suite (P0):

```bash
npm run test:mvp
```

- Unit only:

```bash
npm run test:unit
```

- Integration only:

```bash
npm run test:integration
```

- E2E only (Chromium, @P0-tagged):

```bash
npm run test:e2e
```

- Smoke test:

```bash
npm run test:smoke
```

## CI/CD

GitHub Actions workflow at `.github/workflows/mvp-tests.yml` runs on push/PR to
`main`, executes the smoke test, unit/integration, a mocked wrangler deploy
validation, then E2E. Slack notification triggers on failure only (requires
`SLACK_WEBHOOK_URL` secret).

## Notes

- No external networks: all tests use mocks and data URLs to ensure reliability.
- Chrome-only E2E: no cross-browser guarantees per MVP scope.
- Keep it fast: timeouts and counts tuned to finish in < 5 minutes on CI.
