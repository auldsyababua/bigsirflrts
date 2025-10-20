# FLRTS Testing Infrastructure

This directory contains multiple test suites for the FLRTS project:

## 🧪 **Schema Migration Tests (10N-256)** (New - TDD)

**Status: ✅ GREEN PHASE** - All schema migration tests passing on Frappe Cloud
production.

### **Quick Start**

```bash
# Run schema migration tests (will FAIL until migration deployed)
./tests/integration/10n-256-schema-migration.test.sh

# With environment variables
ERPNEXT_API_URL=https://ops.10nz.tools \
ERPNEXT_API_KEY=your_key \
ERPNEXT_API_SECRET=your_secret \
./tests/integration/10n-256-schema-migration.test.sh
```

### **What's Tested**

**Custom DocTypes:**

- ✅ Mining Site DocType (4 fields: site_name, location, site_code, is_active)
- ✅ Contractor DocType (5 fields: contractor_name, contractor_type,
  contact_email, contact_phone, is_active)

**Custom Fields (Maintenance Visit):**

- ✅ supabase_task_id (Data, unique, read_only)
- ✅ flrts_owner (Link: User)
- ✅ flrts_priority (Select: 1-5, default 3)
- ✅ flrts_site (Link: Mining Site)
- ✅ flrts_contractor (Link: Contractor)
- ✅ flrts_metadata (JSON)
- ✅ custom_synced_at (Datetime, read_only)

**Validation Tests:**

- ✅ Field types match specification
- ✅ Link field references correct DocTypes
- ✅ Unique and read_only constraints
- ✅ Select field options (priority 1-5, contractor types)
- ✅ CRUD operations on Mining Site and Contractor

**Total**: 14 automated tests covering all acceptance criteria

### **TDD Status**

This is a **Test-Driven Development** suite:

- ~~**RED Phase**: Tests FAIL because schema is not deployed~~
- **GREEN Phase** (Current): ✅ All tests PASS - schema migration deployed
  successfully
- **REFACTOR Phase**: Available for optimization as needed

**Test Results**: 15/15 passing (0 failures, 0 skipped)

### **Important: API Endpoint for Custom Fields**

Custom fields in ERPNext/Frappe are stored separately and must be queried via
the correct endpoint:

✅ **Correct**:
`/api/method/frappe.desk.form.load.getdoctype?doctype=Maintenance Visit`

- Returns merged schema with custom fields
- Response path: `.docs[0].fields[]`

❌ **Wrong**: `/api/resource/DocType/Maintenance Visit`

- Returns only base DocType schema (no custom fields)
- Response path: `.data.fields[]`

**Diagnosis**: See `/docs/.scratch/10n-256/api-visibility-diagnosis.md` for
detailed explanation of the API endpoint issue and resolution.

### **Documentation**

- 📖 **[Complete Test Plan](../docs/.scratch/10n-256/TEST-PLAN.md)** - Full test
  strategy, debugging guide
- 📦 **[Prototype Fixtures](../docs/.scratch/10n-256/prototype/)** - JSON
  DocType/field definitions

### **Notes**

- Tests expect to FAIL initially (TDD red phase)
- Deploy schema migration to make tests pass (green phase)
- Same environment variables as ERPNext smoke tests
- Cleans up test data automatically (CRUD tests)
- Exit code 0 when all pass, 1 when failures (expected until deployment)

---

## 🏥 **ERPNext Smoke Tests (Phase 7)**

**Status: ✅ WORKING** - Comprehensive smoke tests for ERPNext on Frappe Cloud
infrastructure.

### **Quick Start**

```bash
# Run ERPNext smoke tests
npm run test:erpnext-smoke

# With environment variables
ERPNEXT_API_URL=https://ops.10nz.tools \
ERPNEXT_API_KEY=your_key \
ERPNEXT_API_SECRET=your_secret \
npm run test:erpnext-smoke
```

### **What's Tested**

- ✅ **ERPNext API Health** - Verifies ops.10nz.tools is accessible
- ✅ **API Authentication** - Validates API key/secret credentials
- ✅ **Site Information** - Checks Frappe and ERPNext versions
- ✅ **Custom Apps** - Verifies flrts_extensions is installed
- ✅ **Telegram Webhook** - Tests webhook endpoint accessibility
- ✅ **Task DocType** - Validates Task CRUD API access

### **Configuration**

The smoke tests use environment variables:

- `ERPNEXT_API_URL` - ERPNext site URL (default: <http://localhost:8000>)
- `ERPNEXT_ADMIN_API_KEY` - ERPNext Admin user API key (preferred)
- `ERPNEXT_ADMIN_API_SECRET` - ERPNext Admin user API secret (preferred)
- `ERPNEXT_API_KEY` - Fallback API key (legacy naming)
- `ERPNEXT_API_SECRET` - Fallback API secret (legacy naming)

**Note**: Use `ERPNEXT_ADMIN_API_*` keys generated from ERPNext (User →
Administrator → Settings → API Access), not the Frappe Cloud infrastructure API
keys.

### **Output**

Tests provide color-coded results:

- 🟢 **PASS** - Test succeeded
- 🔴 **FAIL** - Test failed with details
- 🟡 **SKIP** - Test skipped (missing prerequisites)

Final summary shows counts: Passed, Failed, Skipped

### **Notes**

- Tests use 10-second timeout per API call
- Requires `curl` and `jq` commands
- macOS and Linux compatible
- Detailed error output includes full API responses
- Exit code 0 on success, 1 on failure

---

## 🔐 **Secure API Testing Infrastructure**

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

This is a pragmatic test suite for Story 1.1 (Deploy ERPNext on Frappe Cloud)
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
