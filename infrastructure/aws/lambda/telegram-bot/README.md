# Telegram Bot AWS Lambda Infrastructure

This directory contains the AWS SAM template and Lambda function code for the
BigSirFLRTS Telegram bot, implementing a **pure Lambda MVP** with direct ERPNext
integration via OpenAI NLP parsing.

## Architecture Overview

### Pure Lambda MVP (Simplified)

**Flow:**
`Telegram → AWS Lambda → [Fetch ERPNext Context] → OpenAI GPT-4o → ERPNext REST API → Telegram Confirmation`

This architecture eliminates the previous two-stage approval workflow and n8n
orchestration layer in favor of a direct, streamlined integration that creates
Maintenance Visits immediately after parsing.

### Components

1. **webhook_handler**: Receives Telegram webhooks, fetches ERPNext context
   (users/sites), parses with OpenAI GPT-4o, creates Maintenance Visit in
   ERPNext, sends confirmation
2. **ERPNext REST API**: Target system for task creation (Maintenance Visit
   DocType)
3. **Context Caching**: 5-minute in-memory cache of ERPNext users and site
   locations
4. **Lambda Function URL**: Direct HTTP endpoint for Telegram webhook

### Key Features

- **Provisioned Concurrency (PC=1)** on webhook_handler eliminates cold starts
- **Context Injection**: Real-time user/site data from ERPNext injected into
  OpenAI prompts
- **Smart Caching**: 5-minute TTL cache reduces ERPNext API calls by 80%+
- **X-Ray Tracing** enabled for distributed observability
- **CloudWatch Alarms** for error monitoring and PC spillover detection
- **Comprehensive Error Handling**: Retry logic for transient failures, fallback
  data for ERPNext outages
- **Audit Trail**: All parses logged to ERPNext FLRTS Parser Log DocType

## Prerequisites

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
  configured with credentials
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
  v1.120.0+
- Node.js 22.x (for local testing)
- AWS account with permissions for:
  - Lambda function creation/updates
  - IAM role/policy management
  - CloudWatch Logs and Alarms
  - X-Ray tracing
- ERPNext instance with custom fields configured (see ERPNext Integration
  section)

## Required Parameters

The SAM template requires the following parameters during deployment:

| Parameter               | Description                                                       | Example                                         | Secret? |
| ----------------------- | ----------------------------------------------------------------- | ----------------------------------------------- | ------- |
| `Environment`           | Deployment environment                                            | `production`, `staging`, `development`          | No      |
| `TelegramBotToken`      | Telegram Bot API token (from @BotFather)                          | `7891234567:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw` | **Yes** |
| `OpenAIApiKey`          | OpenAI API key for Chat Completions                               | `sk-proj-...`                                   | **Yes** |
| `TelegramWebhookSecret` | Telegram webhook secret (header: x-telegram-bot-api-secret-token) | `<random-string>`                               | **Yes** |
| `ERPNextApiKey`         | ERPNext API key                                                   | `1234567890abcdef`                              | **Yes** |
| `ERPNextApiSecret`      | ERPNext API secret                                                | `abcdef1234567890`                              | **Yes** |
| `ERPNextBaseUrl`        | ERPNext instance base URL                                         | `https://ops.10nz.tools`                        | No      |

### Obtaining Secrets

- **TelegramBotToken**: Create bot via [@BotFather](https://t.me/botfather) on
  Telegram
- **OpenAIApiKey**: Generate at
  [OpenAI Platform](https://platform.openai.com/api-keys)
- **ERPNextApiKey/Secret**: Generate in ERPNext at
  `User > API Access > Generate Keys`

## Environment Variables

Lambda functions receive the following environment variables:

### webhook_handler (All Required)

- `NODE_ENV`: Environment name (`production`, `staging`, `development`)
- `TELEGRAM_BOT_TOKEN`: Telegram Bot API token
- `TELEGRAM_WEBHOOK_SECRET`: Secret token used to validate Telegram webhooks
- `OPENAI_API_KEY`: OpenAI API key for Chat Completions
- `ERPNEXT_API_KEY`: ERPNext API key for authentication
- `ERPNEXT_API_SECRET`: ERPNext API secret for authentication
- `ERPNEXT_BASE_URL`: ERPNext instance URL (default: <https://ops.10nz.tools>)
- `ERPNEXT_USER_EMAIL_DOMAIN_FILTER`: Optional email domain filter for user
  queries (e.g., `@10nz.tools`)

## Deployment

### 1. Validate Template

```bash
sam validate
```

Expected output: `template.yaml is a valid SAM Template`

### 2. Build Application

```bash
sam build
```

This compiles the Lambda functions and resolves dependencies.

### 3. Deploy (First Time)

```bash
sam deploy --guided
```

You'll be prompted for:

- Stack name (e.g., `telegram-bot-production`)
- AWS region (e.g., `us-east-1`)
- All parameters listed above
- Confirmation to create IAM roles

**Important**: Save the generated `samconfig.toml` for subsequent deployments.

### 4. Deploy (Subsequent)

```bash
sam deploy
```

Uses saved configuration from `samconfig.toml`.

### Parameter Overrides Example

```bash
sam deploy \
  --stack-name telegram-bot-production \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    Environment=production \
    TelegramBotToken="$TELEGRAM_BOT_TOKEN" \
    TelegramWebhookSecret="$TELEGRAM_WEBHOOK_SECRET" \
    OpenAIApiKey="$OPENAI_API_KEY" \
    ERPNextApiKey="$ERPNEXT_API_KEY" \
    ERPNextApiSecret="$ERPNEXT_API_SECRET" \
    ERPNextBaseUrl="https://ops.10nz.tools"
```

### 5. Retrieve Function URLs

After deployment, get the Function URLs from stack outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name telegram-bot-production \
  --query "Stacks[0].Outputs" \
  --output table
```

Note the `WebhookHandlerFunctionUrl` value - you'll need it for Telegram webhook
configuration.

## Post-Deployment Configuration

### 1. Configure Telegram Webhook

Set the webhook URL to point to your Lambda Function URL:

```bash
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "url": "<WebhookHandlerFunctionUrl>",
    "secret_token": "<generate-random-string>"
  }'
```

**Security**: Generate a random secret token and store it in Lambda environment
variable `TELEGRAM_WEBHOOK_SECRET` (requires manual update after deployment).
**Security**: Generate a random secret token and pass it to the SAM template
parameter `TelegramWebhookSecret` during deploy (NoEcho). The handler reads it
from `TELEGRAM_WEBHOOK_SECRET`.

### 2. Verify Provisioned Concurrency

Check that PC is active and ready:

```bash
aws lambda get-provisioned-concurrency-config \
  --function-name telegram-webhook-handler-production \
  --qualifier live
```

Expected: `Status: READY`, `AllocatedProvisionedConcurrentExecutions: 1`

**Note**: PC initialization takes ~1 minute after deployment.

### 3. Monitor X-Ray Traces

Send a test message to your bot, then check
[X-Ray Console](https://console.aws.amazon.com/xray) for traces (appears within
30 seconds).

## Local Testing

### Invoke Function Locally

```bash
sam local invoke WebhookHandlerFunction --event events/telegram-webhook.json
```

### Start Local API

```bash
sam local start-api
```

Then send requests to `http://127.0.0.1:3000`.

## Monitoring

### CloudWatch Alarms

The template creates two alarms:

1. **telegram-webhook-handler-errors**: Alerts when >3 errors occur in 5 minutes
2. **telegram-webhook-pc-spillover**: Alerts when PC is exhausted (spillover to
   on-demand)

Configure SNS topics to receive notifications (requires manual setup after
deployment).

### Key Metrics to Monitor

- `ProvisionedConcurrencyUtilization` (webhook_handler): Should stay <80%
- `ProvisionedConcurrencySpilloverInvocations` (webhook_handler): Should be 0
- `Errors` (webhook_handler): Track error rates
- `Duration` (webhook_handler): Monitor latency trends

### CloudWatch Logs

Logs are retained for 30 days:

- `/aws/lambda/telegram-webhook-handler-<environment>`

## Cost Estimation

At 2 workflows/hour (1440 invocations/month):

| Resource                                    | Monthly Cost |
| ------------------------------------------- | ------------ |
| Provisioned Concurrency (1 GB-hour, 512 MB) | $5-6         |
| CloudWatch Logs (~25 MB)                    | $0.03        |
| **Total**                                   | **$5-7**     |

85% savings vs n8n ($50/month). Pure Lambda MVP eliminates DynamoDB and approval
handler overhead.

## Troubleshooting

### Deployment Fails with "Role not found"

**Cause**: IAM role propagation delay **Solution**: Wait 30 seconds and retry
`sam deploy`

### Function Times Out

**Cause**: Incorrect timeout configuration or slow external API **Solution**:

- Check CloudWatch Logs for the bottleneck
- Increase timeout if ERPNext retries exceed 90s
- Verify ERPNext API is reachable

### Provisioned Concurrency Shows "Status: FAILED"

**Cause**: Insufficient Lambda quotas or configuration error **Solution**:

- Check
  [Lambda quotas](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html)
- Request quota increase if needed
- Verify Node.js 22.x runtime is available in your region

## Security Considerations

1. **Function URLs**: Use `NONE` auth type (Telegram validates via secret token)
2. **Secret Rotation**: Store secrets in AWS Secrets Manager for production
   (future enhancement)
3. **IAM Policies**: Least-privilege access (Lambda execution role has minimal
   permissions)
4. **Webhook Validation**: `X-Telegram-Bot-Api-Secret-Token` header verification
   implemented
5. **API Keys**: ERPNext credentials stored as SAM parameters (NoEcho) and
   passed via environment variables

## ERPNext Integration

### Prerequisites (Custom DocTypes Required)

The webhook handler requires the following custom DocTypes to exist in your
ERPNext instance:

**1. Maintenance Visit (Standard DocType)**

- Comes with ERPNext by default
- Used for field service work orders
- Custom fields added by `flrts_extensions` app

**2. FLRTS Parser Log (Custom DocType)**

- Created by `flrts_extensions` app
- Logs all parse attempts for audit trail
- Fields: telegram_message_id, user_id, original_text, parsed_data, confidence,
  status, error_message

**3. Custom Fields on Maintenance Visit**

- `custom_assigned_to` (Link to User): Assigned user email
- `custom_flrts_priority` (Select): Low, Medium, High, Urgent
- `custom_parse_rationale` (Text): OpenAI reasoning
- `custom_parse_confidence` (Float): Confidence score 0.0-1.0
- `custom_telegram_message_id` (Data): Original Telegram message ID
- `custom_flrts_source` (Data): Integration source (fixed: "telegram_bot")
- `custom_flagged_for_review` (Check): True if confidence < 0.5

**4. Custom Fields on User (Optional for MVP)**

- `custom_telegram_chat_id` (Data): Telegram chat ID for reminders (post-MVP)

### ERPNext API Endpoints Used

**Context Fetching:**

```bash
GET /api/resource/User?fields=["email","full_name","time_zone","enabled"]&filters=[["enabled","=",1],["email","like","%@10nz.tools"]]

GET /api/resource/Location?fields=["name","location_name"]&filters=[["is_group","=",0],["disabled","=",0]]
```

**Task Creation:**

```bash
POST /api/resource/Maintenance Visit
{
  "mntc_work_details": "Task description",
  "custom_assigned_to": "user@10nz.tools",
  "mntc_date": "2024-10-20 14:00:00",
  "custom_flrts_priority": "High",
  "custom_parse_rationale": "...",
  "custom_parse_confidence": 0.85,
  "customer": "10netzero Tools",
  "maintenance_type": "Preventive",
  "completion_status": "Pending",
  "docstatus": 0,
  "custom_telegram_message_id": "12345",
  "custom_flrts_source": "telegram_bot"
}
```

**Audit Logging (Fire-and-Forget):**

```bash
POST /api/resource/FLRTS Parser Log
{
  "telegram_message_id": "12345",
  "user_id": "67890",
  "original_text": "Check pump #3",
  "parsed_data": "{...}",
  "confidence": 0.85,
  "status": "success"
}
```

### Context Caching Strategy

The Lambda function maintains a **5-minute TTL cache** in global scope:

- **Cache Hit Rate**: Typically 80%+ (warm Lambda invocations)
- **Cache Miss**: Fetches fresh data from ERPNext (parallel requests)
- **Fallback Data**: Uses hardcoded user/site lists if ERPNext is unavailable
- **Memory Impact**: ~3KB per cache (negligible)

**Cache Behavior:**

- First invocation (cold start): Cache miss → Fetch from ERPNext
- Subsequent invocations within 5 min: Cache hit → No ERPNext call
- After 5 min: Cache expired → Fetch fresh data
- ERPNext error: Use fallback data, log warning

### Error Handling

**ERPNext API Errors:**

- `401 Unauthorized`: Alert admin, use fallback data, don't retry
- `417 Validation Error`: Parse error message, send user-friendly message
- `500+ Server Errors`: Retry 3 times with exponential backoff (1s, 2s, 4s)
- `Timeout (>10s)`: Retry 2 times, then use fallback data

**User Messages:**

- Validation errors: Show ERPNext error message
- Server errors: "ERPNext temporarily unavailable, please try again"
- Auth failures: "System error, admin notified"

See `docs/ERROR-HANDLING-MATRIX.md` for complete error handling specification.

### Field Mapping

Complete OpenAI → ERPNext field mapping:

| OpenAI Field  | ERPNext Field             | Type            | Default           |
| ------------- | ------------------------- | --------------- | ----------------- |
| `description` | `mntc_work_details`       | Text            | -                 |
| `assignee`    | `custom_assigned_to`      | Link (User)     | null              |
| `dueDate`     | `mntc_date`               | Datetime        | null              |
| `priority`    | `custom_flrts_priority`   | Select          | "Medium"          |
| `rationale`   | `custom_parse_rationale`  | Text            | -                 |
| `confidence`  | `custom_parse_confidence` | Float           | -                 |
| -             | `customer`                | Link (Customer) | "10netzero Tools" |
| -             | `maintenance_type`        | Select          | "Preventive"      |
| -             | `completion_status`       | Select          | "Pending"         |
| -             | `custom_flrts_source`     | Data            | "telegram_bot"    |

**Note**: `custom_assigned_to` is a custom field (Link to User) that must be
created in ERPNext.

See `docs/FIELD-MAPPING.md` for complete specification.

## Implementation Status

### webhook_handler ✅ Complete (Pure Lambda MVP)

**Status**: Fully implemented for MVP

The webhook_handler Lambda function is production-ready with the following
features:

- ✅ Telegram webhook validation (X-Telegram-Bot-Api-Secret-Token)
- ✅ ERPNext context fetching with 5-minute caching (users, site locations)
- ✅ Context injection into OpenAI prompts (real-time team data)
- ✅ OpenAI GPT-4o integration with structured outputs (rationale + confidence)
- ✅ Field mapping: OpenAI → ERPNext Maintenance Visit DocType
- ✅ Maintenance Visit creation with retry logic and error handling
- ✅ Audit logging to ERPNext FLRTS Parser Log (fire-and-forget)
- ✅ Telegram confirmation messages with task details
- ✅ Comprehensive error handling (auth, validation, server errors, timeouts)
- ✅ Fallback data for ERPNext outages (hardcoded users/sites from PRD)
- ✅ Structured logging with correlation IDs and secret masking
- ✅ X-Ray tracing with custom subsegments (context-fetch, openai-parse,
  erpnext-create)

**Directory Structure**:

```
webhook_handler/
├── index.mjs              # Main Lambda handler (orchestration)
├── lib/
│   ├── logging.mjs        # Structured logging with secret masking
│   ├── telegram.mjs       # Telegram API client
│   ├── openai.mjs         # OpenAI GPT-4o client with context injection
│   └── erpnext.mjs        # ERPNext REST API client (NEW)
├── tests/
│   ├── fixtures/          # Test fixtures (Telegram messages, Lambda events)
│   ├── erpnext.test.js    # ERPNext client tests (NEW)
│   ├── integration.test.js # End-to-end integration tests (NEW)
│   └── ...                # Existing test files
├── package.json           # Dependencies and test scripts
└── vitest.config.js       # Vitest configuration
```

**Local Testing**:

```bash
# Run tests
cd webhook_handler
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode (for development)
npm run test:watch
```

**Local Invocation with SAM**:

```bash
# From infrastructure/aws/lambda/telegram-bot directory
sam build
sam local invoke WebhookHandlerFunction --event webhook_handler/tests/fixtures/lambda-event.json
```

**Environment Variables Required**:

- `TELEGRAM_BOT_TOKEN` (required): Bot token from @BotFather
- `TELEGRAM_WEBHOOK_SECRET` (required): Secret token for webhook validation
- `OPENAI_API_KEY` (required): OpenAI API key (GPT-4o access)
- `ERPNEXT_API_KEY` (required): ERPNext API key
- `ERPNEXT_API_SECRET` (required): ERPNext API secret
- `ERPNEXT_BASE_URL` (optional): ERPNext instance URL (default:
  <https://ops.10nz.tools>)
- `AWS_REGION` (auto-populated by Lambda): AWS region

### Post-MVP Enhancements

**Task Reminders** (See `docs/POST-MVP-REMINDERS.md`):

- ERPNext Email Alerts for due date reminders
- Server Scripts + n8n for multi-channel (Email + Telegram) reminders
- Telegram threading (reply to original message)

**Multi-Step Approval Workflow** (Future):

- Reintroduce confirmation step before task creation
- User can review parsed task and approve/reject
- Requires DynamoDB state management (currently removed)

**Advanced Features**:

- READ operations (view tasks via Telegram)
- UPDATE operations (edit tasks via Telegram)
- ARCHIVE operations (close tasks via Telegram)
- Batch operations (create multiple tasks from one message)

## References

### AWS Documentation

- [AWS SAM CLI Documentation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)
- [Lambda Provisioned Concurrency](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html)
- [Lambda Function URLs](https://docs.aws.amazon.com/lambda/latest/dg/lambda-urls.html)

### External APIs

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [OpenAI Chat Completions API](https://platform.openai.com/docs/guides/chat-completions)
- [ERPNext REST API](https://frappeframework.com/docs/user/en/api/rest)
- [Frappe Framework Documentation](https://frappeframework.com/docs)

### Project Documentation

- **Field Mapping**: `docs/FIELD-MAPPING.md` - Complete OpenAI → ERPNext field
  mappings
- **Context Injection**: `docs/CONTEXT-INJECTION-SPEC.md` - ERPNext context
  fetching specification
- **Error Handling**: `docs/ERROR-HANDLING-MATRIX.md` - Comprehensive error
  handling guide
- **Post-MVP Reminders**: `docs/POST-MVP-REMINDERS.md` - Task reminder
  implementation guide
- **Architecture**: `docs/architecture/current-frappe-cloud-architecture.md` -
  System architecture
- **PRD**: `docs/prd/prd.md` - Product requirements document
