# Telegram Bot AWS Lambda Infrastructure

This directory contains the AWS SAM template and Lambda function code for the BigSirFLRTS Telegram bot, implementing a two-stage approval workflow with OpenAI Chat Completions and ERPNext integration.

## Architecture Overview

### Components

1. **webhook_handler** (Stage 1): Receives Telegram webhooks, parses with OpenAI, writes to DynamoDB
2. **approval_handler** (Stage 2): Handles approval callbacks, calls ERPNext API with retry logic
3. **DynamoDB Table**: Stores confirmation state with 24-hour TTL
4. **Lambda Function URLs**: Direct HTTP endpoints for webhook and callback handling

### Key Features

- **Provisioned Concurrency (PC=1)** on webhook_handler eliminates cold starts
- **X-Ray Tracing** enabled for distributed observability
- **CloudWatch Alarms** for error monitoring and PC spillover detection
- **Least-privilege IAM** roles with DynamoDB and CloudWatch access
- **Strong Consistency** reads from DynamoDB to avoid race conditions

## Prerequisites

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) configured with credentials
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) v1.120.0+
- Node.js 22.x (for local testing)
- AWS account with permissions for:
  - Lambda function creation/updates
  - DynamoDB table creation
  - IAM role/policy management
  - CloudWatch Logs and Alarms
  - X-Ray tracing

## Required Parameters

The SAM template requires the following parameters during deployment:

| Parameter | Description | Example | Secret? |
|-----------|-------------|---------|---------|
| `Environment` | Deployment environment | `production`, `staging`, `development` | No |
| `TelegramBotToken` | Telegram Bot API token (from @BotFather) | `7891234567:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw` | **Yes** |
| `OpenAIApiKey` | OpenAI API key for Chat Completions | `sk-proj-...` | **Yes** |
| `ERPNextApiKey` | ERPNext API key | `1234567890abcdef` | **Yes** |
| `ERPNextApiSecret` | ERPNext API secret | `abcdef1234567890` | **Yes** |
| `ERPNextBaseUrl` | ERPNext instance base URL | `https://ops.10nz.tools` | No |

### Obtaining Secrets

- **TelegramBotToken**: Create bot via [@BotFather](https://t.me/botfather) on Telegram
- **OpenAIApiKey**: Generate at [OpenAI Platform](https://platform.openai.com/api-keys)
- **ERPNextApiKey/Secret**: Generate in ERPNext at `User > API Access > Generate Keys`

## Environment Variables

Lambda functions receive the following environment variables:

### Both Functions

- `NODE_ENV`: Environment name (`production`, `staging`, `development`)
- `TELEGRAM_BOT_TOKEN`: Telegram Bot API token
- `OPENAI_API_KEY`: OpenAI API key
- `DYNAMODB_TABLE_NAME`: Name of confirmations table (auto-populated)

### approval_handler Only

- `ERPNEXT_API_KEY`: ERPNext API key
- `ERPNEXT_API_SECRET`: ERPNext API secret
- `ERPNEXT_BASE_URL`: ERPNext instance URL

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

### 5. Retrieve Function URLs

After deployment, get the Function URLs from stack outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name telegram-bot-production \
  --query "Stacks[0].Outputs" \
  --output table
```

Note the `WebhookHandlerFunctionUrl` value - you'll need it for Telegram webhook configuration.

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

**Security**: Generate a random secret token and store it in Lambda environment variable `TELEGRAM_WEBHOOK_SECRET` (requires manual update after deployment).

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

Send a test message to your bot, then check [X-Ray Console](https://console.aws.amazon.com/xray) for traces (appears within 30 seconds).

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
2. **telegram-webhook-pc-spillover**: Alerts when PC is exhausted (spillover to on-demand)

Configure SNS topics to receive notifications (requires manual setup after deployment).

### Key Metrics to Monitor

- `ProvisionedConcurrencyUtilization` (webhook_handler): Should stay <80%
- `ProvisionedConcurrencySpilloverInvocations` (webhook_handler): Should be 0
- `Errors` (both functions): Track error rates
- `Duration` (both functions): Monitor latency trends

### CloudWatch Logs

Logs are retained for 30 days:

- `/aws/lambda/telegram-webhook-handler-<environment>`
- `/aws/lambda/telegram-approval-handler-<environment>`

## Cost Estimation

At 2 workflows/hour (1440 invocations/month):

| Resource | Monthly Cost |
|----------|-------------|
| Provisioned Concurrency (1 GB-hour, 1024 MB) | $10-12 |
| On-demand Lambda (approval_handler) | $0.50 |
| DynamoDB on-demand (<1000 RCU/WCU) | $0.25 |
| CloudWatch Logs (~50 MB) | $0.05 |
| **Total** | **$10-15** |

70% savings vs n8n ($50/month).

## Troubleshooting

### Deployment Fails with "Role not found"

**Cause**: IAM role propagation delay
**Solution**: Wait 30 seconds and retry `sam deploy`

### Function Times Out

**Cause**: Incorrect timeout configuration or slow external API
**Solution**:
- Check CloudWatch Logs for the bottleneck
- Increase timeout if ERPNext retries exceed 90s
- Verify ERPNext API is reachable

### Provisioned Concurrency Shows "Status: FAILED"

**Cause**: Insufficient Lambda quotas or configuration error
**Solution**:
- Check [Lambda quotas](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html)
- Request quota increase if needed
- Verify Node.js 22.x runtime is available in your region

### DynamoDB Consistency Issues

**Symptom**: approval_handler reads stale data immediately after webhook_handler writes
**Solution**: Verify `ConsistentRead: true` in approval_handler's `GetItem` call (implementation task)

## Security Considerations

1. **Function URLs**: Use `NONE` auth type (Telegram validates via secret token)
2. **Secret Rotation**: Store secrets in AWS Secrets Manager for production (future enhancement)
3. **IAM Policies**: Least-privilege access to DynamoDB table only
4. **Encryption**: DynamoDB uses AWS-managed KMS keys by default
5. **Webhook Validation**: Implement `X-Telegram-Bot-Api-Secret-Token` header check (implementation task)

## Implementation Status

### Stage 1: webhook_handler ✅ Complete

**Status**: Fully implemented with 97.34% test coverage

The webhook_handler Lambda function is production-ready with the following features:

- ✅ Telegram webhook validation (X-Telegram-Bot-Api-Secret-Token)
- ✅ OpenAI Chat Completions integration (GPT-4o-mini with structured outputs)
- ✅ DynamoDB confirmation state persistence with 24-hour TTL
- ✅ Telegram sendMessage with inline keyboard (✅ Yes / ❌ Cancel)
- ✅ Error handling for OpenAI timeouts, DynamoDB failures, Telegram API errors
- ✅ Structured logging with secret masking (two-character reveal policy)
- ✅ X-Ray tracing with custom subsegments (openai-parse, dynamodb-write, telegram-send)
- ✅ Unit tests with 97.34% coverage (34 tests, all passing)

**Directory Structure**:

```
webhook_handler/
├── index.mjs              # Main Lambda handler
├── lib/
│   ├── logging.mjs        # Structured logging with secret masking
│   ├── telegram.mjs       # Telegram API client
│   ├── openai.mjs         # OpenAI Chat Completions client
│   └── dynamodb.mjs       # DynamoDB client with TTL support
├── tests/
│   ├── fixtures/          # Test fixtures (Telegram messages, Lambda events)
│   ├── logging.test.js    # Logging tests
│   ├── telegram.test.js   # Telegram client tests
│   ├── openai.test.js     # OpenAI client tests
│   ├── dynamodb.test.js   # DynamoDB client tests
│   └── handler.test.js    # Integration tests
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
- `TELEGRAM_WEBHOOK_SECRET` (optional): Secret token for webhook validation
- `OPENAI_API_KEY` (required): OpenAI API key
- `DYNAMODB_TABLE_NAME` (auto-populated by SAM): DynamoDB table name
- `AWS_REGION` (auto-populated by Lambda): AWS region

### Stage 2: approval_handler ⏳ Pending

**Status**: Stub implementation only

**Next Steps**:

1. Implement approval_handler with ERPNext client integration
2. Add callback query handling (confirm/cancel actions)
3. Implement retry logic for ERPNext API calls
4. Add unit tests with 80%+ coverage
5. Set up CI/CD pipeline for automated deployments
6. Configure SNS notifications for CloudWatch Alarms

## References

- [AWS SAM CLI Documentation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)
- [Lambda Provisioned Concurrency](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html)
- [Lambda Function URLs](https://docs.aws.amazon.com/lambda/latest/dg/lambda-urls.html)
- [DynamoDB TTL](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- Research synthesis: `docs/.scratch/10n-273/RESEARCH-SYNTHESIS-GO-DECISION.md`
