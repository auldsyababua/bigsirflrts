# FLRTS Testing Infrastructure

This directory contains multiple test suites for the FLRTS project:

## 🔐 **Secure API Testing Infrastructure** (New)

**Status: ✅ WORKING** - Complete testing infrastructure with 1Password Service Account integration and Node.js native test runner.

### **Quick Start**
```bash
# Run API tests with 1Password secret injection
npm run test:api

# Run all secure tests
npm run test:secure

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
```
tests/
├── README.md                    # This file
├── .env.test                   # 1Password secret references (safe to commit)
├── .env.local                  # Local testing fallback (git-ignored)
├── config/
│   └── test-config.js         # Test configuration module
├── api/
│   └── edge-functions.test.js # Supabase Edge Function tests
└── run-tests.js               # Secure test runner
```

### **1Password Configuration**

#### **Required Vault Setup**
Your "MCP Secrets" vault needs these items:

**Item: "FLRTS SECRETS"**
```
SUPABASE_PROJECT_ID: thnwlykidzhrsagyjncc
SUPABASE_URL: https://thnwlykidzhrsagyjncc.supabase.co
SUPABASE_ANON_KEY: [your-anon-key]
SUPABASE_SERVICE_ROLE_KEY: [your-service-role-key]
OPENAI_API_KEY: [your-openai-key]
TELEGRAM_BOT_TOKEN: [your-bot-token] (optional)
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
**Solution:** Clear all OP_ environment variables and sessions:
```bash
op signout --all
unset OP_SESSION_my
export OP_SERVICE_ACCOUNT_TOKEN="your_token"
```

---

## 📋 **MVP P0 Test Suite** (Story 1.1)

This is a pragmatic test suite for Story 1.1 (Deploy OpenProject to Cloudflare) targeting 5–10 C‑suite users. It focuses on P0 paths only and runs in <5 minutes.

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

```
npm install
npx playwright install chromium
```

## Run tests

- Full MVP suite (P0):

```
npm run test:mvp
```

- Unit only:

```
npm run test:unit
```

- Integration only:

```
npm run test:integration
```

- E2E only (Chromium, @P0-tagged):

```
npm run test:e2e
```

- Smoke test:

```
npm run test:smoke
```

## CI/CD

GitHub Actions workflow at `.github/workflows/mvp-tests.yml` runs on push/PR to `main`, executes the smoke test, unit/integration, a mocked wrangler deploy validation, then E2E. Slack notification triggers on failure only (requires `SLACK_WEBHOOK_URL` secret).

## Notes

- No external networks: all tests use mocks and data URLs to ensure reliability.
- Chrome-only E2E: no cross-browser guarantees per MVP scope.
- Keep it fast: timeouts and counts tuned to finish in < 5 minutes on CI.
