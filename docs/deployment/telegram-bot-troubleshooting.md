# Telegram Bot Lambda Troubleshooting Guide

## 1. Overview

This guide provides comprehensive troubleshooting procedures for the Telegram
bot Lambda deployment on AWS. Use this guide to diagnose and resolve common
issues with deployment, runtime errors, and integration problems.

### Architecture Quick Reference

- **Pure Lambda MVP**: Telegram → AWS Lambda → OpenAI GPT-4o → ERPNext REST API
- **Key Components**: Webhook Handler, Context Cache (5-min TTL), Provisioned
  Concurrency
- **Dependencies**: Telegram Bot API, OpenAI API, ERPNext API

### When to Use This Guide

- Deployment failures during `sam build` or `sam deploy`
- Telegram webhook not responding to messages
- Lambda function errors or timeouts
- Integration issues with OpenAI or ERPNext
- Performance degradation or slow response times
- Monitoring alerts triggered

### Quick Diagnostics Checklist

Before diving into specific issues, verify these basics:

```bash
# Check Lambda function exists
aws lambda get-function --function-name telegram-webhook-handler-production

# Check webhook configuration
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo

# Check recent Lambda logs
aws logs tail /aws/lambda/telegram-webhook-handler-production --since 10m

# Check CloudWatch alarms
aws cloudwatch describe-alarms --alarm-names telegram-webhook-handler-errors-production
```

## 2. Deployment Issues

### Issue 2.1: SAM Template Validation Fails

**Symptoms:**

- `sam validate` returns error
- Error message: "template.yaml is not a valid SAM Template"

**Causes:**

- Invalid YAML syntax (indentation, colons, quotes)
- Missing required properties
- Duplicate resource names

**Diagnosis:**

```bash
# Check YAML syntax
yamllint template.yaml

# Validate with verbose output
sam validate --debug
```

**Solutions:**

1. Fix YAML indentation (use 2 spaces, not tabs)
2. Verify all resource names are unique
3. Check Parameters section has correct format
4. Ensure all required properties are present

### Issue 2.2: SAM Build Fails

**Symptoms:**

- `sam build` returns error
- Error message: "Build failed"

**Causes:**

- Node.js version mismatch (not 22.x)
- Missing package.json
- npm install failures
- Syntax errors in Lambda code

**Diagnosis:**

```bash
# Check Node.js version
node --version  # Should be v22.x

# Check package.json exists
ls webhook_handler/package.json

# Try manual npm install
cd webhook_handler
npm ci
```

**Solutions:**

1. Install Node.js 22.x: `nvm install 22 && nvm use 22`
2. Verify package.json exists in webhook_handler/
3. Run `npm ci` manually to see detailed errors
4. Check for syntax errors in index.mjs

### Issue 2.3: SAM Deploy Fails with "Role not found"

**Symptoms:**

- `sam deploy` fails during stack creation
- Error message: "Role 'telegram-bot-lambda-role-production' not found"

**Causes:**

- IAM role propagation delay (AWS takes 10-30 seconds to propagate new roles)

**Diagnosis:**

```bash
# Check if role exists
aws iam get-role --role-name telegram-bot-lambda-role-production
```

**Solutions:**

1. Wait 30 seconds and retry `sam deploy`
2. If still fails, delete stack and redeploy:
   `aws cloudformation delete-stack --stack-name telegram-bot-production`
3. Check IAM permissions (need `iam:CreateRole`, `iam:AttachRolePolicy`)

### Issue 2.4: SAM Deploy Fails with "Parameter validation failed"

**Symptoms:**

- `sam deploy --guided` fails during parameter input
- Error message: "Parameter 'TelegramBotToken' must match pattern..."

**Causes:**

- Invalid parameter format (e.g., bot token missing colon)
- Empty parameter value

**Diagnosis:**

```bash
# Verify bot token format
echo $TELEGRAM_BOT_TOKEN | grep -E '^[0-9]+:[A-Za-z0-9_-]+$'

# Verify OpenAI key format
echo $OPENAI_API_KEY | grep -E '^sk-proj-'
```

**Solutions:**

1. Verify Telegram bot token format:
   `7891234567:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw`
2. Verify OpenAI API key format: `sk-proj-...`
3. Ensure no extra spaces or newlines in parameter values
4. Use quotes when passing parameters:
   `--parameter-overrides TelegramBotToken="$TELEGRAM_BOT_TOKEN"`

## 3. Provisioned Concurrency Issues

### Issue 3.1: Provisioned Concurrency Shows "Status: FAILED"

**Symptoms:**

- `aws lambda get-provisioned-concurrency-config` returns `Status: FAILED`
- Lambda function works but has cold starts

**Causes:**

- Insufficient Lambda quotas (default: 10 concurrent executions)
- Node.js 22.x runtime not available in region
- Lambda function code has initialization errors

**Diagnosis:**

```bash
# Check Lambda quotas
aws service-quotas get-service-quota \
  --service-code lambda \
  --quota-code L-B99A9384

# Check CloudWatch Logs for initialization errors
aws logs tail /aws/lambda/telegram-webhook-handler-production --since 10m
```

**Solutions:**

1. Request quota increase:
   `aws service-quotas request-service-quota-increase --service-code lambda --quota-code L-B99A9384 --desired-value 100`
2. Verify Node.js 22.x is available in your region (check AWS Lambda runtimes
   page)
3. Check CloudWatch Logs for initialization errors (e.g., missing environment
   variables)
4. Temporarily disable PC: Update template.yaml to remove
   `ProvisionedConcurrencyConfig` section

### Issue 3.2: Provisioned Concurrency Spillover Alarm Triggered

**Symptoms:**

- CloudWatch alarm: "telegram-webhook-pc-spillover" triggered
- Lambda invocations exceed PC capacity

**Causes:**

- Traffic spike exceeds PC capacity (1 concurrent execution)
- Long-running requests blocking PC instances

**Diagnosis:**

```bash
# Check PC utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name ProvisionedConcurrencyUtilization \
  --dimensions Name=FunctionName,Value=telegram-webhook-handler-production \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average

# Check invocation count
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=telegram-webhook-handler-production \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

**Solutions:**

1. Increase PC capacity: Update template.yaml
   `ProvisionedConcurrentExecutions: 2`
2. Optimize Lambda duration (reduce timeout, optimize ERPNext API calls)
3. Implement request throttling (add API Gateway with rate limiting)
4. Accept spillover as normal (PC=1 is sufficient for 90% of traffic)

## 4. Telegram Webhook Issues

### Issue 4.1: Telegram Webhook Not Responding

**Symptoms:**

- Send message to bot, no response
- `getWebhookInfo` shows `pending_update_count > 0`

**Causes:**

- Lambda Function URL not accessible
- Webhook secret mismatch
- Lambda function crashing on startup

**Diagnosis:**

```bash
# Check webhook status
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo

# Test Lambda Function URL directly
curl -X POST <WebhookHandlerFunctionUrl> \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: <your-secret>" \
  -d '{"message":{"text":"test"}}'

# Check CloudWatch Logs
aws logs tail /aws/lambda/telegram-webhook-handler-production --follow
```

**Solutions:**

1. Verify Lambda Function URL is accessible (try curl)
2. Check webhook secret matches Lambda environment variable:
   `aws lambda get-function-configuration --function-name telegram-webhook-handler-production --query 'Environment.Variables.TELEGRAM_WEBHOOK_SECRET'`
3. Check CloudWatch Logs for errors (missing environment variables, syntax
   errors)
4. Delete and recreate webhook:
   `curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook`
   then `setWebhook` again

### Issue 4.2: Telegram Returns "Webhook URL Invalid"

**Symptoms:**

- `setWebhook` returns error: "Webhook URL invalid"

**Causes:**

- URL not HTTPS
- URL contains invalid characters
- URL not accessible from Telegram servers

**Diagnosis:**

```bash
# Verify URL format
echo $WEBHOOK_URL | grep -E '^https://'

# Test URL accessibility
curl -I $WEBHOOK_URL
```

**Solutions:**

1. Ensure URL starts with `https://` (not `http://`)
2. Remove any trailing slashes or query parameters
3. Verify Lambda Function URL is publicly accessible (not in VPC)
4. Check AWS region supports Lambda Function URLs

## 5. OpenAI API Issues

### Issue 5.1: OpenAI Timeout

**Symptoms:**

- Lambda logs show: "OpenAI request timed out"
- User receives error message: "Sorry, I had trouble understanding your request"

**Causes:**

- OpenAI API slow or overloaded
- Network connectivity issues
- Timeout too short (default: 10 seconds)

**Diagnosis:**

```bash
# Check CloudWatch Logs for OpenAI duration
aws logs filter-log-events \
  --log-group-name /aws/lambda/telegram-webhook-handler-production \
  --filter-pattern "openai_request" \
  --start-time $(date -u -d '1 hour ago' +%s)000

# Test OpenAI API directly
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-2024-08-06","messages":[{"role":"user","content":"test"}]}'
```

**Solutions:**

1. Increase OpenAI timeout: Update `lib/openai.mjs` `TIMEOUT_MS` to 15000 (15
   seconds)
2. Implement retry logic (already implemented - 2 retries with exponential
   backoff)
3. Check OpenAI API status: <https://status.openai.com/>
4. Verify OpenAI API key is valid and has quota remaining

### Issue 5.2: OpenAI Returns 429 Rate Limit

**Symptoms:**

- Lambda logs show: "OpenAI rate limit exceeded"
- User receives error message after retry attempts

**Causes:**

- OpenAI API rate limit exceeded (default: 10,000 tokens/minute)
- Too many concurrent requests

**Diagnosis:**

```bash
# Check OpenAI usage
curl https://api.openai.com/v1/usage \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check Lambda invocation rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=telegram-webhook-handler-production \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum
```

**Solutions:**

1. Request OpenAI rate limit increase:
   <https://platform.openai.com/account/rate-limits>
2. Implement request throttling (add API Gateway with rate limiting)
3. Reduce prompt size (remove unnecessary context)
4. Use gpt-4o-mini instead of gpt-4o (10x cheaper, faster)

## 6. ERPNext API Issues

### Issue 6.1: ERPNext 401 Unauthorized

**Symptoms:**

- Lambda logs show: "ERPNext authentication failed"
- User receives error message: "System error, admin notified"

**Causes:**

- Invalid API key or secret
- API key expired or revoked
- API key doesn't have required permissions

**Diagnosis:**

```bash
# Test ERPNext API credentials
curl -X GET "https://ops.10nz.tools/api/resource/User" \
  -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}"

# Check Lambda environment variables
aws lambda get-function-configuration \
  --function-name telegram-webhook-handler-production \
  --query 'Environment.Variables.{ERPNEXT_API_KEY:ERPNEXT_API_KEY,ERPNEXT_API_SECRET:ERPNEXT_API_SECRET}'
```

**Solutions:**

1. Regenerate API credentials in ERPNext: User → Administrator → Settings → API
   Access → Generate Keys
2. Update Lambda environment variables: `sam deploy` with new credentials
3. Verify API key has required permissions (read User, Location; write
   Maintenance Visit, FLRTS Parser Log)
4. Check ERPNext user is enabled and not locked

### Issue 6.2: ERPNext 417 Validation Error

**Symptoms:**

- Lambda logs show: "ERPNext validation error: Customer is mandatory"
- User receives error message: "Task creation failed: Customer is mandatory"

**Causes:**

- Required field missing in Maintenance Visit
- Custom fields not created in ERPNext
- Field value doesn't match validation rules

**Diagnosis:**

```bash
# Check Maintenance Visit schema
curl -X GET "https://ops.10nz.tools/api/method/frappe.desk.form.load.getdoctype?doctype=Maintenance%20Visit" \
  -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
  | jq '.docs[0].fields[] | select(.fieldname | startswith("custom_"))'

# Check if custom DocTypes exist
curl -X GET "https://ops.10nz.tools/api/resource/FLRTS Parser Log" \
  -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}"
```

**Solutions:**

1. Verify custom fields exist on Maintenance Visit (see `docs/FIELD-MAPPING.md`)
2. Deploy `flrts_extensions` custom app to ERPNext
3. Run migrations: `bench --site ops.10nz.tools migrate`
4. Check field values match validation rules (e.g., priority must be
   Low/Medium/High/Urgent)

### Issue 6.3: ERPNext 500 Server Error

**Symptoms:**

- Lambda logs show: "ERPNext server error, retrying..."
- User receives error message after 3 retry attempts

**Causes:**

- ERPNext server overloaded or crashed
- Database connection issues
- ERPNext background jobs failing

**Diagnosis:**

```bash
# Check ERPNext health
curl -I https://ops.10nz.tools

# Check Frappe Cloud status
# Navigate to: https://frappecloud.com/dashboard/sites/ops.10nz.tools

# Check ERPNext logs (requires SSH access)
ssh bigsirflrts-prod bash -s << 'EOF'
tail -50 sites/ops.10nz.tools/logs/error.log
EOF
```

**Solutions:**

1. Check Frappe Cloud dashboard for site status
2. Restart ERPNext site: Frappe Cloud dashboard → Restart
3. Check ERPNext background jobs: `bench --site ops.10nz.tools doctor`
4. Contact Frappe Cloud support if issue persists

## 7. Runtime Errors

### Issue 7.1: Lambda Timeout (15 seconds)

**Symptoms:**

- Lambda logs show: "Task timed out after 15.00 seconds"
- User receives no response

**Causes:**

- ERPNext API slow (>10 seconds)
- OpenAI API slow (>10 seconds)
- Too many retries

**Diagnosis:**

```bash
# Check Lambda duration
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=telegram-webhook-handler-production \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum

# Check CloudWatch Logs for slow operations
aws logs filter-log-events \
  --log-group-name /aws/lambda/telegram-webhook-handler-production \
  --filter-pattern "duration" \
  --start-time $(date -u -d '1 hour ago' +%s)000
```

**Solutions:**

1. Increase Lambda timeout: Update template.yaml `Timeout: 30`
2. Optimize ERPNext API calls (reduce retry attempts, increase timeout)
3. Optimize OpenAI prompt (reduce token count)
4. Implement async processing (return 200 immediately, process in background)

### Issue 7.2: Lambda Out of Memory

**Symptoms:**

- Lambda logs show: "Runtime exited with error: signal: killed"
- CloudWatch Metrics show memory usage >512 MB

**Causes:**

- Memory leak in Lambda code
- Large context data (too many users/sites)
- Large OpenAI responses

**Diagnosis:**

```bash
# Check Lambda memory usage
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name MemoryUtilization \
  --dimensions Name=FunctionName,Value=telegram-webhook-handler-production \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum
```

**Solutions:**

1. Increase Lambda memory: Update template.yaml `MemorySize: 1024`
2. Reduce context data (filter users by email domain, limit sites to active
   only)
3. Clear cache more frequently (reduce TTL from 5 minutes to 2 minutes)
4. Profile memory usage with AWS X-Ray

## 8. Monitoring and Alerting

### Issue 8.1: CloudWatch Alarms Not Triggering

**Symptoms:**

- Errors occur but no alarm notifications
- Alarm shows "Insufficient data"

**Causes:**

- SNS topic not configured
- Alarm threshold too high
- Alarm period too long

**Diagnosis:**

```bash
# Check alarm configuration
aws cloudwatch describe-alarms \
  --alarm-names telegram-webhook-handler-errors-production

# Check SNS topic subscriptions
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-east-1:123456789012:telegram-bot-alerts
```

**Solutions:**

1. Create SNS topic and subscribe email: See deployment guide section 6.1
2. Update alarm to use SNS topic:
   `aws cloudwatch put-metric-alarm --alarm-actions arn:aws:sns:...`
3. Adjust alarm threshold (e.g., >1 error instead of >3)
4. Reduce alarm period (e.g., 1 minute instead of 5 minutes)

### Issue 8.2: X-Ray Traces Not Appearing

**Symptoms:**

- No traces appear in X-Ray console after sending messages
- X-Ray shows "No data available"

**Causes:**

- X-Ray tracing not enabled on Lambda function
- IAM role missing X-Ray permissions
- X-Ray daemon not running (managed by AWS for Lambda)

**Diagnosis:**

```bash
# Check Lambda tracing configuration
aws lambda get-function-configuration \
  --function-name telegram-webhook-handler-production \
  --query 'TracingConfig'

# Check IAM role has X-Ray permissions
aws iam get-role-policy \
  --role-name telegram-bot-lambda-role-production \
  --policy-name XRayPolicy
```

**Solutions:**

1. Enable X-Ray tracing: Update template.yaml `Tracing: Active`
2. Verify IAM role has `xray:PutTraceSegments` and `xray:PutTelemetryRecords`
   permissions
3. Redeploy with `sam deploy`
4. Wait 30-60 seconds after test message for traces to appear

## 9. Performance Issues

### Issue 9.1: Slow Response Time (>2 seconds)

**Symptoms:**

- User waits >2 seconds for confirmation message
- CloudWatch Metrics show average duration >2000ms

**Causes:**

- ERPNext API slow
- OpenAI API slow
- Context cache miss (cold start)

**Diagnosis:**

```bash
# Check X-Ray traces for bottlenecks
# Navigate to: https://console.aws.amazon.com/xray
# Filter by: telegram-webhook-handler-production
# Look for slow subsegments: context-fetch, openai-parse, erpnext-create

# Check Lambda duration breakdown
aws logs filter-log-events \
  --log-group-name /aws/lambda/telegram-webhook-handler-production \
  --filter-pattern "duration" \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  | jq '.events[].message' | grep -E 'context_fetched|message_parsed|maintenance_visit_created'
```

**Solutions:**

1. Optimize ERPNext API calls (reduce fields fetched, add indexes)
2. Optimize OpenAI prompt (reduce token count, use gpt-4o-mini)
3. Increase cache TTL (reduce context fetch frequency)
4. Enable Provisioned Concurrency (eliminate cold starts)

### Issue 9.2: High Context Fetch Latency

**Symptoms:**

- X-Ray traces show context-fetch subsegment >1 second
- Logs show frequent cache misses

**Causes:**

- ERPNext API slow to respond
- Cache TTL too short (expiring too frequently)
- Large dataset returned from ERPNext

**Diagnosis:**

```bash
# Check cache hit rate in logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/telegram-webhook-handler-production \
  --filter-pattern "cache_hit" \
  --start-time $(date -u -d '1 hour ago' +%s)000

# Test ERPNext API response time directly
time curl -X GET "https://ops.10nz.tools/api/resource/User?fields=[\"email\",\"full_name\"]&filters=[[\"enabled\",\"=\",1]]" \
  -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}"
```

**Solutions:**

1. Increase cache TTL: Update `lib/erpnext.mjs` `CACHE_TTL_MS` to 600000 (10
   minutes)
2. Reduce fields fetched from ERPNext (only fetch required fields)
3. Filter users more aggressively (e.g., by email domain)
4. Consider caching in DynamoDB for cross-invocation persistence (post-MVP)

## 10. Emergency Procedures

### Procedure 10.1: Disable Bot (Emergency Stop)

**When to use:** Lambda is failing and causing issues, need to stop immediately

**Steps:**

```bash
# 1. Delete Telegram webhook
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook

# 2. Verify webhook deleted
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
# Expected: "url": ""

# 3. Notify users
# Send message to team: "Bot temporarily disabled for maintenance"
```

**Recovery:**

```bash
# 1. Fix issue (deploy new version, update credentials, etc.)

# 2. Re-enable webhook
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "<WebhookHandlerFunctionUrl>", "secret_token": "<your-secret>"}'

# 3. Test with message
# Send test message to bot, verify response
```

### Procedure 10.2: Rollback Deployment

**When to use:** New deployment causes issues, need to revert to previous
version

**Steps:**

```bash
# 1. Check CloudFormation stack events
aws cloudformation describe-stack-events \
  --stack-name telegram-bot-production \
  --max-items 50

# 2. Rollback stack
aws cloudformation rollback-stack \
  --stack-name telegram-bot-production

# 3. Wait for rollback to complete (5-10 minutes)
aws cloudformation wait stack-rollback-complete \
  --stack-name telegram-bot-production

# 4. Verify rollback successful
aws cloudformation describe-stacks \
  --stack-name telegram-bot-production \
  --query 'Stacks[0].StackStatus'
# Expected: "UPDATE_ROLLBACK_COMPLETE"

# 5. Test with message
# Send test message to bot, verify response
```

### Procedure 10.3: Emergency Scale Down

**When to use:** Unexpected cost spike due to high invocation rate

**Steps:**

```bash
# 1. Check current invocation rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=telegram-webhook-handler-production \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum

# 2. Disable Provisioned Concurrency (saves ~$5/month)
aws lambda delete-provisioned-concurrency-config \
  --function-name telegram-webhook-handler-production \
  --qualifier live

# 3. Reduce memory allocation (if safe)
aws lambda update-function-configuration \
  --function-name telegram-webhook-handler-production \
  --memory-size 256

# 4. Monitor cost in AWS Cost Explorer
# Navigate to: https://console.aws.amazon.com/cost-management/home
```

## 11. Diagnostic Commands Reference

### Lambda Function Commands

```bash
# Get function configuration
aws lambda get-function-configuration --function-name telegram-webhook-handler-production

# Get function code location
aws lambda get-function --function-name telegram-webhook-handler-production

# Invoke function locally
sam local invoke WebhookHandlerFunction --event tests/fixtures/lambda-event.json

# Tail logs in real-time
aws logs tail /aws/lambda/telegram-webhook-handler-production --follow

# Get recent error logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/telegram-webhook-handler-production \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '1 hour ago' +%s)000
```

### CloudWatch Metrics Commands

```bash
# Get invocation count
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=telegram-webhook-handler-production \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum

# Get error count
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=telegram-webhook-handler-production \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum

# Get duration statistics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=telegram-webhook-handler-production \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum,Minimum

# Get concurrent executions
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name ConcurrentExecutions \
  --dimensions Name=FunctionName,Value=telegram-webhook-handler-production \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Maximum
```

### Telegram API Commands

```bash
# Get webhook info
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo

# Get bot info
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe

# Get updates (for testing)
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates

# Delete webhook
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook

# Set webhook
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "<WebhookHandlerFunctionUrl>", "secret_token": "<your-secret>"}'
```

### ERPNext API Commands

```bash
# Test authentication
curl -X GET "https://ops.10nz.tools/api/resource/User" \
  -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}"

# Get recent Maintenance Visits
curl -X GET "https://ops.10nz.tools/api/resource/Maintenance Visit?limit_page_length=5" \
  -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}"

# Get recent Parser Logs
curl -X GET "https://ops.10nz.tools/api/resource/FLRTS Parser Log?limit_page_length=5" \
  -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}"

# Get specific Maintenance Visit
curl -X GET "https://ops.10nz.tools/api/resource/Maintenance Visit/MV-2024-001" \
  -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}"

# Get active users
curl -X GET "https://ops.10nz.tools/api/resource/User?fields=[\"email\",\"full_name\"]&filters=[[\"enabled\",\"=\",1]]" \
  -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}"

# Get active locations
curl -X GET "https://ops.10nz.tools/api/resource/Location?fields=[\"name\",\"location_name\"]&filters=[[\"is_group\",\"=\",0],[\"disabled\",\"=\",0]]" \
  -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}"
```

### CloudFormation Commands

```bash
# Get stack status
aws cloudformation describe-stacks \
  --stack-name telegram-bot-production \
  --query 'Stacks[0].StackStatus'

# Get stack outputs
aws cloudformation describe-stacks \
  --stack-name telegram-bot-production \
  --query 'Stacks[0].Outputs'

# Get stack events
aws cloudformation describe-stack-events \
  --stack-name telegram-bot-production \
  --max-items 20

# Delete stack
aws cloudformation delete-stack \
  --stack-name telegram-bot-production
```

## 12. Support and Escalation

### Internal Support Contacts

**Primary Contact:**

- Engineering Team Lead
- Slack: #bigsirflrts-support
- Email: <engineering@10nz.tools>

**Escalation Path:**

1. Check this troubleshooting guide
2. Review CloudWatch Logs and X-Ray traces
3. Post in #bigsirflrts-support Slack channel
4. If urgent, page on-call engineer via PagerDuty

### External Support Resources

**AWS Support:**

- AWS Support Console: <https://console.aws.amazon.com/support>
- Documentation: <https://docs.aws.amazon.com/lambda>
- Community Forums: <https://repost.aws/>

**Telegram Support:**

- Bot API Documentation: <https://core.telegram.org/bots/api>
- BotFather: <https://t.me/botfather>
- Developer Chat: <https://t.me/BotSupport>

**OpenAI Support:**

- Status Page: <https://status.openai.com/>
- API Documentation: <https://platform.openai.com/docs>
- Help Center: <https://help.openai.com/>
- Community Forum: <https://community.openai.com/>

**Frappe Cloud Support:**

- Support Portal: <https://frappecloud.com/support>
- Dashboard: <https://frappecloud.com/dashboard>
- Documentation: <https://frappecloud.com/docs>
- Community Forum: <https://discuss.frappe.io/>

### Logging and Reporting Issues

When reporting issues, include:

1. **Error Description**: What happened vs. what was expected
2. **Steps to Reproduce**: Detailed steps to trigger the error
3. **Environment**: Production/Staging/Development
4. **Timestamps**: When the issue occurred (UTC timezone)
5. **Logs**: CloudWatch Logs excerpt showing the error
6. **X-Ray Trace**: Trace ID if available
7. **Impact**: How many users affected, severity level

**Example Issue Report:**

```
Title: ERPNext authentication failing for Telegram bot

Description:
Lambda function returns 401 when attempting to create Maintenance Visit.
Expected: Task created successfully in ERPNext.

Steps to Reproduce:
1. Send message to bot: "Colin check pump #3 at Big Sky"
2. Bot responds with "System error, admin notified"
3. CloudWatch Logs show: "ERPNext authentication failed"

Environment: Production (us-east-1)

Timestamp: 2024-10-20 18:30:00 UTC

Logs:
{
  "timestamp": "2024-10-20T18:30:00.123Z",
  "level": "error",
  "event": "erpnext_auth_failed",
  "statusCode": 401,
  "apiKeyPrefix": "12**************34"
}

X-Ray Trace ID: 1-5f8a1234-567890abcdef12345678

Impact: High - All users unable to create tasks via Telegram
```

## 13. References

### Project Documentation

- **Deployment Guide**: `docs/deployment/telegram-bot-deployment.md` - Complete
  deployment instructions
- **Lambda README**: `infrastructure/aws/lambda/telegram-bot/README.md` - Lambda
  infrastructure overview
- **Field Mapping**: `docs/FIELD-MAPPING.md` - OpenAI → ERPNext field mappings
- **Context Injection**: `docs/CONTEXT-INJECTION-SPEC.md` - ERPNext context
  fetching specification
- **Error Handling Matrix**: `docs/ERROR-HANDLING-MATRIX.md` - Comprehensive
  error handling guide
- **Architecture**: `docs/architecture/current-frappe-cloud-architecture.md` -
  System architecture

### AWS Documentation

- [AWS SAM CLI Documentation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)
- [Lambda Provisioned Concurrency](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html)
- [Lambda Function URLs](https://docs.aws.amazon.com/lambda/latest/dg/lambda-urls.html)
- [CloudWatch Logs Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AnalyzingLogData.html)
- [X-Ray Tracing](https://docs.aws.amazon.com/xray/latest/devguide/aws-xray.html)

### External API Documentation

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [OpenAI Chat Completions API](https://platform.openai.com/docs/guides/chat-completions)
- [ERPNext REST API](https://frappeframework.com/docs/user/en/api/rest)
- [Frappe Framework Documentation](https://frappeframework.com/docs)

### Monitoring and Observability

- [AWS X-Ray Console](https://console.aws.amazon.com/xray)
- [CloudWatch Console](https://console.aws.amazon.com/cloudwatch)
- [AWS Cost Explorer](https://console.aws.amazon.com/cost-management/home)
- [Lambda Function Console](https://console.aws.amazon.com/lambda)

---

**Document Ownership:**

- **Owner**: DevOps Team
- **Maintainer**: Backend Engineering
- **Last Updated**: October 2025
- **Review Cycle**: Quarterly or after major incidents
- **Feedback**: Submit issues via GitHub or Slack #bigsirflrts-support
