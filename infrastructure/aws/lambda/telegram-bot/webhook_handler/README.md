# Telegram Webhook Handler

## 1. Overview

**Purpose:** Telegram webhook handler with OpenAI NLP and ERPNext integration

**Architecture:** Pure Lambda MVP (no n8n, no DynamoDB)

**Runtime:** Node.js 22.x (ESM)

**Handler:** `index.handler`

## 2. Directory Structure

```
webhook_handler/
├── index.mjs              # Main Lambda handler (orchestration)
├── lib/
│   ├── logging.mjs        # Structured logging with secret masking
│   ├── telegram.mjs       # Telegram API client
│   ├── openai.mjs         # OpenAI GPT-4o client with context injection
│   └── erpnext.mjs        # ERPNext REST API client
├── tests/
│   ├── fixtures/          # Test fixtures (Telegram messages, Lambda events)
│   ├── handler.test.js    # Handler unit tests
│   ├── erpnext.test.js    # ERPNext client tests
│   ├── integration.test.js # Integration tests
│   ├── e2e-complete-flow.test.js # End-to-end tests (NEW)
│   ├── openai.test.js     # OpenAI client tests
│   ├── telegram.test.js   # Telegram client tests
│   ├── logging.test.js    # Logging tests
│   └── smoke-test.sh      # Smoke tests for deployed Lambda (NEW)
├── package.json           # Dependencies and test scripts
├── vitest.config.js       # Vitest configuration
└── README.md              # This file
```

## 3. Dependencies

**Runtime Dependencies:**

- None (uses native Node.js 22 APIs: fetch, crypto, etc.)

**Development Dependencies:**

- `vitest` - Test framework
- `@vitest/coverage-v8` - Code coverage
- `@aws-sdk/client-xray` - X-Ray tracing (optional)

**External APIs:**

- Telegram Bot API (<https://api.telegram.org>)
- OpenAI Chat Completions API (<https://api.openai.com>)
- ERPNext REST API (<https://ops.10nz.tools>)

## 4. Environment Variables

**Required:**

- `TELEGRAM_BOT_TOKEN` - Telegram bot token from @BotFather
- `TELEGRAM_WEBHOOK_SECRET` - Secret token for webhook validation
- `OPENAI_API_KEY` - OpenAI API key (GPT-4o access)
- `ERPNEXT_API_KEY` - ERPNext API key
- `ERPNEXT_API_SECRET` - ERPNext API secret

**Optional:**

- `ERPNEXT_BASE_URL` - ERPNext instance URL (default: <https://ops.10nz.tools>)
- `ERPNEXT_USER_EMAIL_DOMAIN_FILTER` - Email domain filter for user queries
  (e.g., @10nz.tools)
- `OPENAI_TIMEOUT_MS` - OpenAI request timeout (default: 10000)
- `OPENAI_MAX_RETRIES` - OpenAI retry attempts (default: 2)
- `NODE_ENV` - Environment name (development, staging, production)

**AWS Lambda (Auto-populated):**

- `AWS_REGION` - AWS region
- `AWS_LAMBDA_FUNCTION_NAME` - Function name
- `AWS_LAMBDA_FUNCTION_VERSION` - Function version

See `.env.example` for complete list with descriptions.

## 5. Local Development

### 5.1: Setup

```bash
# Install dependencies
npm ci

# Copy environment file
cp ../.env.example ../.env

# Edit .env with your credentials
vim ../.env

# Load environment variables
export $(cat ../.env | xargs)
```

### 5.2: Run Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run E2E tests only
npm run test:e2e

# Run all test suites sequentially
npm run test:all

# Run with coverage
npm run test:coverage

# Watch mode (for development)
npm run test:watch

# E2E watch mode
npm run test:e2e:watch
```

### 5.3: Local Invocation with SAM

```bash
# From infrastructure/aws/lambda/telegram-bot directory
cd ..

# Build Lambda function
sam build

# Invoke with test event
sam local invoke WebhookHandlerFunction --event webhook_handler/tests/fixtures/lambda-event.json

# Start local API
sam local start-api

# Send request to local API
curl -X POST http://127.0.0.1:3000 \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: your-secret" \
  -d @webhook_handler/tests/fixtures/telegram-message.json
```

## 6. Testing

### 6.1: Test Suites

**Unit Tests:**

- `handler.test.js` - Tests main handler orchestration
- `erpnext.test.js` - Tests ERPNext API client (context caching, retry logic,
  error handling)
- `openai.test.js` - Tests OpenAI client (context injection, structured outputs)
- `telegram.test.js` - Tests Telegram API client
- `logging.test.js` - Tests structured logging

**Integration Tests:**

- `integration.test.js` - Tests complete flow with mocked external APIs

**End-to-End Tests:**

- `e2e-complete-flow.test.js` - Tests complete Telegram → Lambda → OpenAI →
  ERPNext → Telegram flow
  - Happy path scenarios
  - Error handling scenarios
  - Context caching behavior
  - Audit logging verification

**Smoke Tests:**

- `smoke-test.sh` - Tests deployed Lambda function with real API calls
  - Requires deployed Lambda and environment variables
  - Tests complete flow end-to-end
  - Verifies task created in ERPNext
  - Verifies audit log created

### 6.2: Test Coverage Goals

- Line Coverage: >90%
- Branch Coverage: >85%
- Function Coverage: 100%

### 6.3: Running Smoke Tests

```bash
# Set environment variables
export LAMBDA_FUNCTION_URL="https://abc123xyz.lambda-url.us-east-1.on.aws/"
export TELEGRAM_BOT_TOKEN="your-bot-token"
export TELEGRAM_TEST_CHAT_ID="your-chat-id"
export ERPNEXT_API_URL="https://ops.10nz.tools"
export ERPNEXT_API_KEY="your-key"
export ERPNEXT_API_SECRET="your-secret"

# Run smoke tests
npm run test:smoke
```

## 7. Code Structure

### 7.1: Main Handler (index.mjs)

**Responsibilities:**

- Validate Telegram webhook (secret token)
- Parse Telegram update
- Fetch ERPNext context (users, sites) with caching
- Determine sender from Telegram user
- Call OpenAI for message parsing
- Map assignee name to email
- Validate parsed data
- Create Maintenance Visit in ERPNext
- Log parse attempt to ERPNext (fire-and-forget)
- Send confirmation to Telegram
- Handle errors at each step

**Key Functions:**

- `handler(event)` - Main Lambda handler
- `parseUpdate(body)` - Parse Telegram update
- `determineSender(telegramUser, teamMembers)` - Map Telegram user to team
  member
- `formatSuccessMessage(taskData, erpnextTask)` - Format confirmation message

### 7.2: ERPNext Client (lib/erpnext.mjs)

**Responsibilities:**

- Fetch users and sites from ERPNext with caching
- Create Maintenance Visit via REST API
- Log parse attempts to FLRTS Parser Log
- Handle authentication, retries, timeouts
- Provide fallback data for ERPNext outages

**Key Functions:**

- `getContext()` - Fetch users and sites with 5-minute cache
- `createMaintenanceVisit(taskData, telegramMessageId)` - Create task in ERPNext
- `logParserAudit(logData)` - Log parse attempt (fire-and-forget)
- `erpnextFetch(endpoint, options)` - Generic fetch wrapper with retry logic

**Caching Strategy:**

- Lambda global scope cache with 5-minute TTL
- Cache keys: `contextCache`, `cacheTimestamp`
- Cache hit rate: Typically 80%+ (warm Lambda invocations)
- Fallback data: Hardcoded users/sites from PRD

### 7.3: OpenAI Client (lib/openai.mjs)

**Responsibilities:**

- Parse natural language messages with GPT-4o
- Inject ERPNext context into prompts (users, sites, sender timezone)
- Return structured outputs with rationale and confidence
- Handle retries, timeouts, rate limits

**Key Functions:**

- `classifyIntent(text, options, context)` - Parse message with context
- `buildSystemPromptWithContext(context)` - Build prompt with ERPNext data

**Structured Output Schema:**

```javascript
{
  description: string,
  assignee: string,
  dueDate: string | null,
  priority: string | null,
  rationale: string,
  confidence: number
}
```

### 7.4: Telegram Client (lib/telegram.mjs)

**Responsibilities:**

- Validate webhook secret token
- Send messages to Telegram users
- Format messages with Markdown

**Key Functions:**

- `validateWebhook(event, webhookSecret)` - Validate
  X-Telegram-Bot-Api-Secret-Token header
- `sendMessage(chatId, text, replyToMessageId, botToken)` - Send message to user

### 7.5: Logging (lib/logging.mjs)

**Responsibilities:**

- Structured logging with JSON format
- Secret masking (API keys, tokens)
- Correlation ID tracking
- Log levels: INFO, WARN, ERROR

**Key Functions:**

- `logInfo(event, data)` - Log info message
- `logWarn(event, data)` - Log warning message
- `logError(event, data)` - Log error message

## 8. Error Handling

See `docs/ERROR-HANDLING-MATRIX.md` for complete error handling specification.

**Key Patterns:**

**ERPNext Context Fetch:**

- 401/403/500: Use fallback data (hardcoded users/sites)
- Timeout: Use fallback data
- Network error: Use fallback data
- No retries (context fetch is non-critical)

**OpenAI Parsing:**

- 401: Fail immediately (auth error)
- 429: Retry 2 times with exponential backoff
- 500+: Retry 2 times with exponential backoff
- Timeout: Retry 1 time
- Low confidence (<0.5): Flag for review, still create task

**ERPNext Task Creation:**

- 401: Fail immediately (auth error)
- 417: Parse validation error, send user-friendly message
- 500+: Retry 3 times with exponential backoff
- Timeout: Retry 2 times

**Audit Logging:**

- Fire-and-forget pattern (don't block on failure)
- Log failure to CloudWatch but continue execution

**Telegram Confirmation:**

- Fire-and-forget pattern (task already created)
- Log failure to CloudWatch but return success

## 9. Performance

**Target Metrics:**

- Response time: <2 seconds (p95)
- Cold start: <1 second (with Provisioned Concurrency)
- Memory usage: <256 MB (average)
- Error rate: <1%

**Optimization Strategies:**

- Context caching (5-minute TTL) reduces ERPNext API calls by 80%+
- Provisioned Concurrency (PC=1) eliminates cold starts
- Parallel API calls (users + sites fetched concurrently)
- Retry logic with exponential backoff prevents cascading failures
- Fire-and-forget audit logging doesn't block main flow

## 10. Monitoring

**CloudWatch Logs:**

- Log group: `/aws/lambda/telegram-webhook-handler-production`
- Retention: 30 days
- Structured JSON logs with correlation IDs

**CloudWatch Metrics:**

- Invocations (count)
- Errors (count)
- Duration (average, p99)
- Provisioned Concurrency utilization (%)
- Provisioned Concurrency spillover (count)

**X-Ray Traces:**

- Subsegments: context-fetch, openai-parse, erpnext-create
- Trace map shows bottlenecks
- Appears within 30 seconds of invocation

**CloudWatch Alarms:**

- `telegram-webhook-handler-errors`: Alerts when >3 errors in 5 minutes
- `telegram-webhook-pc-spillover`: Alerts when PC exhausted

## 11. Security

**Webhook Validation:**

- Validates `X-Telegram-Bot-Api-Secret-Token` header
- Rejects requests with invalid secret (403 Forbidden)

**Secret Management:**

- Secrets stored as SAM parameters (NoEcho)
- Passed to Lambda via environment variables
- Future: Migrate to AWS Secrets Manager

**API Authentication:**

- Telegram: Bot token in Authorization header
- OpenAI: API key in Authorization header
- ERPNext: Token-based auth (API key + secret)

**Logging Security:**

- Secrets masked in logs (API keys, tokens)
- Correlation IDs for tracing (no PII)
- CloudWatch Logs encrypted at rest

## 12. Deployment

See `docs/deployment/telegram-bot-deployment.md` for complete deployment guide.

**Quick Deploy:**

```bash
# From infrastructure/aws/lambda/telegram-bot directory
sam build
sam deploy
```

**First-Time Deploy:**

```bash
sam deploy --guided
```

## 13. Troubleshooting

See `docs/deployment/telegram-bot-troubleshooting.md` for detailed
troubleshooting guide.

**Common Issues:**

**Lambda timeout:**

- Check CloudWatch Logs for slow operations
- Increase timeout in template.yaml
- Optimize ERPNext/OpenAI API calls

**Task not created in ERPNext:**

- Verify API credentials
- Check custom DocTypes exist
- Review CloudWatch Logs for 417 validation errors

**No Telegram response:**

- Verify webhook configured correctly
- Check Lambda Function URL accessible
- Review CloudWatch Logs for errors

## 14. References

**Project Documentation:**

- `docs/deployment/telegram-bot-deployment.md` - Deployment guide
- `docs/deployment/telegram-bot-troubleshooting.md` - Troubleshooting guide
- `docs/FIELD-MAPPING.md` - OpenAI → ERPNext field mappings
- `docs/CONTEXT-INJECTION-SPEC.md` - ERPNext context fetching specification
- `docs/ERROR-HANDLING-MATRIX.md` - Error handling specification
- `infrastructure/aws/lambda/telegram-bot/README.md` - Lambda infrastructure
  overview

**External APIs:**

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [OpenAI Chat Completions API](https://platform.openai.com/docs/guides/chat-completions)
- [ERPNext REST API](https://frappeframework.com/docs/user/en/api/rest)

**AWS Documentation:**

- [Lambda Node.js Runtime](https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html)
- [Lambda Function URLs](https://docs.aws.amazon.com/lambda/latest/dg/lambda-urls.html)
- [Lambda Provisioned Concurrency](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html)
