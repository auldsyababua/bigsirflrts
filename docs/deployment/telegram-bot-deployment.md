# Telegram Bot Lambda Deployment Guide

## 1. Overview

This guide provides step-by-step instructions for deploying the Telegram bot
Lambda function to AWS. The deployment uses AWS SAM (Serverless Application
Model) to create a pure Lambda MVP architecture with direct ERPNext integration.

### Deployment Architecture

- **Pure Lambda MVP**: Single webhook handler creates Maintenance Visits
  directly in ERPNext
- **No n8n orchestration**: Eliminated approval workflow for streamlined task
  creation
- **Direct integration**: Telegram → AWS Lambda → OpenAI GPT-4o → ERPNext REST
  API
- **Context injection**: Real-time user/site data from ERPNext injected into
  OpenAI prompts
- **Caching**: 5-minute TTL cache reduces ERPNext API calls by 80%+
- **Provisioned Concurrency**: Eliminates cold starts for consistent <2 second
  response times

### Prerequisites Summary

- AWS account with SAM CLI installed
- Telegram bot created via @BotFather
- OpenAI account with GPT-4o access
- ERPNext instance with custom fields configured
- Estimated deployment time: 30-45 minutes

### Required Access

- AWS account with Lambda, IAM, CloudWatch permissions
- Telegram bot admin access
- ERPNext admin access for custom fields and API keys

## 2. Prerequisites

### 2.1 AWS Prerequisites

#### AWS CLI

- **Version**: 2.x or later
- **Installation**: Follow
  [AWS CLI Installation Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- **Configuration**: Run `aws configure` with your access keys

#### AWS SAM CLI

- **Version**: 1.120.0+
- **Installation**: Follow
  [SAM CLI Installation Guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- **Verification**: Run `sam --version`

#### AWS Account Permissions

Your AWS user/role needs these permissions:

- `lambda:*` - Lambda function management
- `iam:*` - IAM role/policy management
- `cloudwatch:*` - CloudWatch Logs and Alarms
- `xray:*` - X-Ray tracing
- `cloudformation:*` - CloudFormation stack management

#### AWS Region Selection

- **Recommended**: `us-east-1` (lowest latency for Telegram/OpenAI)
- **Alternatives**: `eu-west-1`, `ap-southeast-1`
- **Considerations**: Choose region closest to your users and ERPNext instance

### 2.2 Telegram Prerequisites

#### Create Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow prompts to create your bot:
   - Bot name: `BigSir FLRTS Bot`
   - Username: `bigsir_flrts_bot` (must end with 'bot')
4. Save the bot token (format: `7891234567:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw`)

#### Obtain Test Chat ID

1. Send a message to your bot: "Hello"
2. Check bot updates:
   `curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
3. Note the `chat.id` from the response (format: `123456789`)

#### Generate Webhook Secret

```bash
# Generate random 32-character string
openssl rand -hex 16
# Example output: a1b2c3d4e5f678901234567890abcdef
```

### 2.3 OpenAI Prerequisites

#### Create OpenAI Account

1. Navigate to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section

#### Generate API Key

1. Click "Create new secret key"
2. Give it a name: "BigSir FLRTS Telegram Bot"
3. Copy the key (format: `sk-proj-...`)
4. **Important**: Store securely - cannot be viewed again

#### Verify GPT-4o Access

1. Check [OpenAI Limits](https://platform.openai.com/account/limits)
2. Ensure GPT-4o model is available
3. Configure billing if needed

#### Cost Estimate

- **Usage**: ~50 tasks/day = ~$5-10/month
- **Breakdown**: $0.03/1K tokens × ~20K tokens/day
- **Monitoring**: Check usage at
  [OpenAI Usage](https://platform.openai.com/usage)

### 2.4 ERPNext Prerequisites

#### ERPNext Instance

- **URL**: <https://ops.10nz.tools>
- **Access**: Admin privileges required
- **Custom App**: `flrts_extensions` must be installed and migrated

#### Required Custom DocTypes

1. **FLRTS Parser Log**
   - Purpose: Audit logging for all parse attempts
   - Fields: telegram_message_id, user_id, original_text, parsed_data,
     confidence, status, error_message

2. **FLRTS User Preference** (Future)
   - Purpose: User-specific settings (timezone, default priority)
   - Fields: user, timezone, default_priority

#### Required Custom Fields on Maintenance Visit

Navigate to **Setup → Customize Form → Maintenance Visit** and add:

| Field Name                   | Type   | Label               | Options                         |
| ---------------------------- | ------ | ------------------- | ------------------------------- |
| `custom_assigned_to`         | Link   | Assigned To         | User                            |
| `custom_priority`            | Select | Priority            | Low<br>Medium<br>High<br>Urgent |
| `custom_parse_rationale`     | Text   | Parse Rationale     | -                               |
| `custom_parse_confidence`    | Float  | Parse Confidence    | -                               |
| `custom_telegram_message_id` | Data   | Telegram Message ID | -                               |
| `custom_flrts_source`        | Data   | Source              | -                               |
| `custom_flagged_for_review`  | Check  | Flagged for Review  | -                               |

#### Generate API Credentials

1. Log in to ERPNext as Administrator
2. Navigate: **User → Administrator → Settings**
3. Click **API Access** tab
4. Click **Generate Keys**
5. **Save API Key and API Secret securely** (cannot be viewed again)

#### Verification Command

```bash
curl -X GET "https://ops.10nz.tools/api/resource/FLRTS Parser Log" \
  -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}"
```

Expected response:

```json
{
  "data": []
}
```

If you get a 403 error, the custom DocType doesn't exist. Contact your ERPNext
administrator.

## 3. Deployment Steps

### Step 3.1: Clone Repository and Navigate to Lambda Directory

```bash
# Clone the repository
git clone https://github.com/auldsyababua/bigsirflrts.git
cd bigsirflrts/infrastructure/aws/lambda/telegram-bot
```

### Step 3.2: Install Lambda Dependencies

```bash
# Navigate to webhook handler directory
cd webhook_handler

# Install dependencies
npm ci

# Return to lambda directory
cd ..
```

### Step 3.3: Validate SAM Template

```bash
# Validate CloudFormation template
sam validate
```

Expected output:

```
template.yaml is a valid SAM Template
```

If validation fails:

- Check YAML syntax (indentation, colons)
- Verify all resource names are unique
- Ensure Parameters section is correctly formatted

### Step 3.4: Build Lambda Functions

```bash
# Build the Lambda function
sam build
```

Expected output:

```
Build Succeeded

Built Artifacts  : .aws-sam/build
Built Template   : .aws-sam/build/template.yaml
```

If build fails:

- Check Node.js version: `node --version` (must be v22.x)
- Verify package.json exists in webhook_handler/
- Check for syntax errors in index.mjs

### Step 3.5: Deploy to AWS (First Time)

```bash
# Deploy with guided prompts
sam deploy --guided
```

You'll be prompted for these values:

**Stack Name:** `telegram-bot-production` (or `telegram-bot-staging` for
non-prod)

**AWS Region:** `us-east-1` (recommended for lowest latency)

**Parameter Environment:** `production` (or `staging`, `development`)

**Parameter TelegramBotToken:** `<paste-your-bot-token>` (will be hidden)

**Parameter TelegramWebhookSecret:** `<paste-your-webhook-secret>` (will be
hidden)

**Parameter OpenAIApiKey:** `<paste-your-openai-key>` (will be hidden)

**Parameter ERPNextApiKey:** `<paste-your-erpnext-key>` (will be hidden)

**Parameter ERPNextApiSecret:** `<paste-your-erpnext-secret>` (will be hidden)

**Parameter ERPNextBaseUrl:** `https://ops.10nz.tools` (default, press Enter)

**Parameter AlertEmail:** `dev-team@10nz.tools` (or your team email)

- Purpose: Email address to receive CloudWatch alarm notifications
- Used by: SNS topic for alarm notifications
- Can add more emails later via SNS console

**Parameter ADOTLayerArn:** `<default-value>` (press Enter to use default)

**Confirm changes before deploy:** `Y`

**Allow SAM CLI IAM role creation:** `Y`

**Disable rollback:** `N` (enable rollback for safety)

**WebhookHandlerFunction has no authentication. Is this okay?:** `Y` (Telegram
validates via secret token)

**Save arguments to configuration file:** `Y`

**SAM configuration file:** `samconfig.toml` (default, press Enter)

**SAM configuration environment:** `default` (press Enter)

Deployment will take 3-5 minutes. Watch for:

- CloudFormation stack creation progress
- Lambda function deployment
- IAM role creation
- CloudWatch log group creation

**Expected Output:**

```
Successfully created/updated stack - telegram-bot-production in us-east-1

Outputs:
  WebhookHandlerFunctionUrl: https://abc123xyz.lambda-url.us-east-1.on.aws/
  LambdaExecutionRoleArn: arn:aws:iam::123456789012:role/telegram-bot-lambda-role-production
  WebhookHandlerFunctionArn: arn:aws:lambda:us-east-1:123456789012:function:telegram-webhook-handler-production
```

**Important**: Save the `WebhookHandlerFunctionUrl` - you'll need it for
Telegram webhook configuration.

### Step 3.6: Deploy (Subsequent Updates)

```bash
# Build and deploy using saved configuration
sam build
sam deploy
```

Uses saved configuration from `samconfig.toml`. No prompts required.

### Step 3.7: Verify Provisioned Concurrency

Provisioned Concurrency (PC) eliminates cold starts but takes ~1 minute to
initialize.

```bash
aws lambda get-provisioned-concurrency-config \
  --function-name telegram-webhook-handler-production \
  --qualifier live
```

Expected output:

```json
{
  "Status": "READY",
  "AllocatedProvisionedConcurrentExecutions": 1,
  "AvailableProvisionedConcurrentExecutions": 1
}
```

If `Status: IN_PROGRESS`, wait 30 seconds and check again.

If `Status: FAILED`:

- Check Lambda quotas:
  `aws service-quotas get-service-quota --service-code lambda --quota-code L-B99A9384`
- Verify Node.js 22.x runtime is available in your region
- Check CloudWatch Logs for error details

## 4. Post-Deployment Configuration

### Step 4.1: Configure Telegram Webhook

Set the webhook URL to point to your Lambda Function URL:

```bash
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -H "Content-Type": application/json" \
  -d '{
    "url": "<WebhookHandlerFunctionUrl>",
    "secret_token": "<your-webhook-secret>"
  }'
```

Replace:

- `<YOUR_BOT_TOKEN>` with your Telegram bot token
- `<WebhookHandlerFunctionUrl>` with the URL from SAM deployment output
- `<your-webhook-secret>` with the same secret you used in SAM parameters

Expected response:

```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

If `ok: false`:

- Verify bot token is correct
- Check webhook URL is accessible (try curl)
- Ensure secret_token matches Lambda environment variable

### Step 4.2: Verify Webhook Configuration

```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

Expected response:

```json
{
  "ok": true,
  "result": {
    "url": "https://abc123xyz.lambda-url.us-east-1.on.aws/",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40
  }
}
```

If `pending_update_count > 0`:

- Telegram is queuing updates (webhook not responding)
- Check Lambda logs for errors
- Verify Lambda Function URL is accessible

### Step 4.3: Send Test Message

Open Telegram and send a message to your bot:

```
Colin check pump #3 at Big Sky
```

Expected response (within 2 seconds):

```
✅ Task Created Successfully

📋 Description: Check pump #3 at Big Sky
👤 Assigned to: colin
🟡 Priority: Medium

Task ID: MV-2024-001
```

If no response:

- Check CloudWatch Logs: `/aws/lambda/telegram-webhook-handler-production`
- Verify webhook is configured correctly
- Check Lambda Function URL is accessible
- Verify ERPNext API credentials are correct

### Step 4.4: Verify CloudWatch Alarms

Verify all 5 CloudWatch alarms are created and configured:

```bash
# List all alarms for the stack
aws cloudwatch describe-alarms \
  --alarm-name-prefix telegram-webhook-handler \
  --query 'MetricAlarms[*].[AlarmName,StateValue,ActionsEnabled]' \
  --output table
```

Expected output:

```
|  AlarmName                                    | StateValue | ActionsEnabled |
|-----------------------------------------------|------------|----------------|
| telegram-webhook-handler-errors-production    | OK         | True           |
| telegram-webhook-pc-spillover-production      | OK         | True           |
| telegram-webhook-handler-timeout-production   | OK         | True           |
| telegram-webhook-handler-throttles-production | OK         | True           |
| telegram-webhook-openai-quota-production      | OK         | True           |
```

If any alarm shows `StateValue: INSUFFICIENT_DATA`:

- This is normal for new deployments (no data yet)
- Send test message to generate metrics
- Check again after 5 minutes

If `ActionsEnabled: False`:

- Alarms won't send notifications
- Verify SNS topic created: `aws sns list-topics | grep telegram-bot-alerts`
- Verify email subscription confirmed (check email for confirmation link)

### Step 4.5: Confirm SNS Email Subscription

After deployment, AWS sends a confirmation email to the AlertEmail address:

1. Check email inbox for: "AWS Notification - Subscription Confirmation"
2. Click "Confirm subscription" link
3. Verify subscription active:

   ```bash
   aws sns list-subscriptions-by-topic \
     --topic-arn arn:aws:sns:us-east-1:123456789012:telegram-bot-alerts-production
   ```

4. Expected output: `SubscriptionArn` (not "PendingConfirmation")

If confirmation email not received:

- Check spam folder
- Verify email address in SAM parameters
- Manually subscribe via SNS console

## 5. Verification Procedures

### 5.1: Verify Task Created in ERPNext

```bash
curl -X GET "https://ops.10nz.tools/api/resource/Maintenance Visit?filters=[[\"custom_flrts_source\",\"=\",\"telegram_bot\"]]&limit_page_length=1" \
  -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}"
```

Expected: 200 OK with task data including custom fields

### 5.2: Verify Audit Log Created

```bash
curl -X GET "https://ops.10nz.tools/api/resource/FLRTS Parser Log?limit_page_length=1" \
  -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}"
```

Expected: 200 OK with log entry including telegram_message_id, confidence,
status

### 5.3: Check CloudWatch Logs

```bash
aws logs tail /aws/lambda/telegram-webhook-handler-production --follow
```

Expected log entries:

- `webhook_received`
- `context_fetched`
- `message_parsed_by_openai`
- `maintenance_visit_created`
- `confirmation_sent`
- `webhook_complete`

### 5.4: Check X-Ray Traces

Navigate to [AWS X-Ray Console](https://console.aws.amazon.com/xray) and verify:

- Traces appear within 30 seconds of test message
- Trace shows subsegments: context-fetch, openai-parse, erpnext-create
- No errors in trace map
- Total duration <2 seconds

### 5.5: Run Smoke Tests

```bash
cd webhook_handler/tests
export LAMBDA_FUNCTION_URL="<WebhookHandlerFunctionUrl>"
export TELEGRAM_BOT_TOKEN="<your-bot-token>"
export TELEGRAM_TEST_CHAT_ID="<your-chat-id>"
export ERPNEXT_API_URL="https://ops.10nz.tools"
export ERPNEXT_API_KEY="<your-key>"
export ERPNEXT_API_SECRET="<your-secret>"
./smoke-test.sh
```

Expected: All tests pass (6/6)

### 5.6: Test CloudWatch Alarms

Trigger a test alarm to verify notifications work:

```bash
# Set alarm to ALARM state manually (for testing)
aws cloudwatch set-alarm-state \
  --alarm-name telegram-webhook-handler-errors-production \
  --state-value ALARM \
  --state-reason "Testing alarm notification"
```

Expected:

- Email received within 1 minute
- Subject:
  `ALARM: "telegram-webhook-handler-errors-production" in US East (N. Virginia)`
- Body includes: alarm details, timestamp, link to CloudWatch console

Reset alarm to OK:

```bash
aws cloudwatch set-alarm-state \
  --alarm-name telegram-webhook-handler-errors-production \
  --state-value OK \
  --state-reason "Test complete"
```

Reference: AWS CloudWatch Alarms documentation for alarm testing procedures.

## 6. Monitoring Setup

### 6.1: Configure CloudWatch Alarms

The SAM template creates two alarms:

1. **telegram-webhook-handler-errors**: Alerts when >3 errors occur in 5 minutes
2. **telegram-webhook-pc-spillover**: Alerts when PC is exhausted

To receive notifications:

```bash
# Create SNS topic
aws sns create-topic --name telegram-bot-alerts

# Subscribe email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:telegram-bot-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com

# Update alarms to use SNS topic
aws cloudwatch put-metric-alarm \
  --alarm-name telegram-webhook-handler-errors-production \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:telegram-bot-alerts
```

### 6.2: Create CloudWatch Dashboard

Create a dashboard to monitor key metrics:

```bash
aws cloudwatch put-dashboard \
  --dashboard-name telegram-bot-production \
  --dashboard-body file://cloudwatch-dashboard.json
```

Dashboard should include:

- Lambda invocations (count)
- Lambda errors (count)
- Lambda duration (average, p99)
- Provisioned Concurrency utilization (%)
- Provisioned Concurrency spillover (count)

## 7. Rollback Procedures

### 7.1: Rollback to Previous Version

If deployment causes issues:

```bash
# List stack events to find previous version
aws cloudformation describe-stack-events \
  --stack-name telegram-bot-production \
  --max-items 50

# Rollback to previous version
aws cloudformation rollback-stack \
  --stack-name telegram-bot-production
```

### 7.2: Delete Stack (Complete Removal)

```bash
aws cloudformation delete-stack \
  --stack-name telegram-bot-production
```

**Warning**: This deletes all resources (Lambda, IAM roles, CloudWatch logs).
Cannot be undone.

### 7.3: Disable Webhook (Emergency)

If Lambda is failing and causing issues:

```bash
# Delete webhook
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook
```

This stops Telegram from sending updates to Lambda. Users will see "bot not
responding" but no errors.

## 8. Troubleshooting

See `docs/deployment/telegram-bot-troubleshooting.md` for detailed
troubleshooting guide.

**Common Issues:**

**Issue: Deployment fails with "Role not found"**

- Cause: IAM role propagation delay
- Solution: Wait 30 seconds and retry `sam deploy`

**Issue: Lambda times out**

- Cause: ERPNext API slow or unreachable
- Solution: Check CloudWatch Logs, verify ERPNext is accessible, increase
  timeout if needed

**Issue: Provisioned Concurrency shows "Status: FAILED"**

- Cause: Insufficient Lambda quotas
- Solution: Check quotas, request increase if needed

**Issue: Telegram webhook not responding**

- Cause: Lambda Function URL not accessible or webhook secret mismatch
- Solution: Verify Function URL, check webhook secret matches Lambda environment
  variable

**Issue: Task not created in ERPNext**

- Cause: ERPNext API credentials invalid or custom fields missing
- Solution: Verify API credentials, check custom DocTypes exist

## 9. Cost Optimization

**Current Configuration:**

- Provisioned Concurrency: 1 instance (512 MB)
- Memory: 512 MB
- Timeout: 15 seconds
- Estimated cost: $5-7/month

**Optimization Options:**

**Option 1: Reduce Provisioned Concurrency to 0**

- Savings: $5/month
- Trade-off: Cold starts (1-2 seconds delay on first request)
- Recommended for: Low-traffic environments (<10 messages/day)

**Option 2: Reduce Memory to 256 MB**

- Savings: $2-3/month
- Trade-off: Slower execution (may increase duration by 20-30%)
- Recommended for: Cost-sensitive environments

**Option 3: Increase Timeout to 30 seconds**

- Cost: No change (billed per 100ms)
- Trade-off: Allows more retries for slow ERPNext API
- Recommended for: Unreliable network environments

## 10. Security Hardening

**Production Recommendations:**

1. **Use AWS Secrets Manager for credentials**
   - Store Telegram bot token, OpenAI API key, ERPNext credentials in Secrets
     Manager
   - Update Lambda to fetch secrets at runtime
   - Enable automatic secret rotation

2. **Enable Lambda function URL authentication**
   - Use AWS IAM authentication instead of NONE
   - Configure Telegram to use IAM signature
   - Requires custom Telegram webhook proxy

3. **Restrict IAM role permissions**
   - Remove unnecessary permissions from Lambda execution role
   - Add resource-based policies for CloudWatch Logs
   - Enable CloudTrail logging for IAM actions

4. **Enable VPC integration**
   - Deploy Lambda in private subnet
   - Use NAT Gateway for outbound internet access
   - Restrict security group rules

5. **Implement rate limiting**
   - Add API Gateway in front of Lambda Function URL
   - Configure throttling (e.g., 10 requests/second)
   - Protect against DDoS attacks

## 11. Next Steps

**Post-Deployment:**

- [ ] Configure CloudWatch alarms with SNS notifications
- [ ] Create CloudWatch dashboard for monitoring
- [ ] Run smoke tests to verify complete flow
- [ ] Document Lambda Function URL in team wiki
- [ ] Train team on Telegram bot usage
- [ ] Set up weekly cost reports

**Future Enhancements:**

- [ ] Implement READ operations (view tasks via Telegram)
- [ ] Implement UPDATE operations (edit tasks via Telegram)
- [ ] Add task reminders (ERPNext Email Alerts + Telegram)
- [ ] Add inline keyboards for quick actions
- [ ] Implement user preferences (timezone, default priority)

## 12. References

**AWS Documentation:**

- [AWS SAM CLI Documentation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)
- [Lambda Provisioned Concurrency](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html)
- [Lambda Function URLs](https://docs.aws.amazon.com/lambda/latest/dg/lambda-urls.html)

**External APIs:**

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [OpenAI Chat Completions API](https://platform.openai.com/docs/guides/chat-completions)
- [ERPNext REST API](https://frappeframework.com/docs/user/en/api/rest)

**Project Documentation:**

- `infrastructure/aws/lambda/telegram-bot/README.md` - Lambda infrastructure
  overview
- `docs/FIELD-MAPPING.md` - OpenAI → ERPNext field mappings
- `docs/CONTEXT-INJECTION-SPEC.md` - ERPNext context fetching specification
- `docs/ERROR-HANDLING-MATRIX.md` - Comprehensive error handling guide
- `docs/architecture/current-frappe-cloud-architecture.md` - System architecture
