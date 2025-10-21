# Telegram Bot Monitoring Guide

## Overview

This document provides comprehensive monitoring setup and procedures for the
FLRTS Telegram Bot system, covering application-level monitoring in ERPNext,
infrastructure monitoring in AWS CloudWatch, and performance tracing with AWS
X-Ray.

## 1. Monitoring Architecture

The monitoring stack consists of three layers working together to provide
complete observability:

1. **ERPNext (Application Layer)**: Custom reports, scheduled monitoring
   scripts, and email alerts
2. **CloudWatch (Infrastructure Layer)**: Lambda metrics, log analysis, and
   alarms
3. **X-Ray (Tracing Layer)**: Distributed tracing and performance analysis

## 2. Monitoring Layers Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Monitoring Layers                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   ERPNext    │  │  CloudWatch  │  │    X-Ray     │    │
│  │  (App Layer) │  │ (Infra Layer)│  │  (Tracing)   │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                  │             │
│         ▼                 ▼                  ▼             │
│  ┌──────────────────────────────────────────────────┐     │
│  │         Alerting & Notification                  │     │
│  │  - Email (ERPNext Server Scripts)                │     │
│  │  - SNS → Email (CloudWatch Alarms)               │     │
│  │  - Slack (Optional)                              │     │
│  └──────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## 3. ERPNext Monitoring (Application Layer)

### 3.1 Server Scripts (Automated Monitoring)

**Script 1: Success Rate Monitor**

- **File:**
  `flrts_extensions/flrts/server_script/flrts_parser_log_success_rate_monitor.py`
- **Schedule:** Daily at 9 AM (cron: `0 9 * * *`)
- **Purpose:** Monitor parser success rate, alert if <80%
- **Data Source:** FLRTS Parser Log DocType
- **Alert Method:** Email to System Managers
- **Metrics Calculated:**
  - Total parses (last 24 hours)
  - Accepted count
  - Rejected count
  - Success rate: (accepted / (accepted + rejected)) \* 100
- **Alert Trigger:** success_rate < 80%
- **Email Content:**
  - Current success rate
  - Total parses
  - Link to Parser Performance Dashboard
  - Suggested actions (review failed parses, update prompts)

**Script 2: Daily Cost Monitor**

- **File:** `flrts_extensions/flrts/server_script/flrts_daily_cost_monitor.py`
- **Schedule:** Daily at 6 PM (cron: `0 18 * * *`)
- **Purpose:** Monitor OpenAI API costs, alert if >$10/day
- **Data Source:** FLRTS Parser Log DocType (estimated_cost_usd field)
- **Alert Method:** Email to System Managers + Finance team
- **Metrics Calculated:**
  - Today's total cost
  - Projected monthly cost
  - Average cost per parse
  - Total parses today
- **Alert Trigger:** daily_cost > $10 OR projected_monthly > $300
- **Email Content:**
  - Today's cost and projection
  - Link to Cost Tracking Report
  - Suggested actions (optimize prompts, consider gpt-4o-mini)

**Configuration:** Thresholds configurable via System Settings custom fields:

- `custom_flrts_daily_cost_threshold` (default: 10.00)
- `custom_flrts_monthly_cost_threshold` (default: 300.00)
- `custom_flrts_success_rate_threshold` (default: 80.0)
- `custom_flrts_alert_emails` (comma-separated list)

### 3.2 Custom Reports (Visual Dashboards)

**Report 1: Parser Performance Dashboard**

- **File:** `flrts_extensions/flrts/report/parser_performance_dashboard/`
- **Purpose:** Comprehensive view of parser performance over time
- **Columns:** date, total_parses, accepted, rejected, pending, success_rate,
  avg_confidence, avg_response_ms, total_cost, avg_cost_per_parse
- **Chart:** Line chart showing success_rate and total_cost trends
- **Filters:** Date range (default: last 30 days), user, model_name
- **Access:** Navigate to ERPNext → FLRTS → Reports → Parser Performance
  Dashboard

**Report 2: OpenAI Cost Tracking**

- **File:** `flrts_extensions/flrts/report/openai_cost_tracking/`
- **Purpose:** Detailed cost analysis and budget tracking
- **Columns:** date, total_requests, total_tokens, prompt_tokens,
  completion_tokens, total_cost, avg_cost_per_request, model_name,
  projected_monthly_cost
- **Chart:** Bar chart showing daily costs with budget threshold line
- **Filters:** Date range (default: current month), model_name, group_by
- **Summary Row:** Totals and projected monthly cost
- **Access:** Navigate to ERPNext → FLRTS → Reports → OpenAI Cost Tracking

**Report 3: Telegram Message Volume**

- **File:** `flrts_extensions/flrts/report/telegram_message_volume/`
- **Purpose:** Track message volume trends and user activity
- **Columns:** date, hour, total_messages, unique_users, tasks_created, errors,
  avg_confidence, peak_hour
- **Chart:** Area chart showing message volume over time
- **Filters:** Date range (default: last 7 days), group_by (Date or Hour), user
- **Use Case:** Capacity planning, usage pattern analysis
- **Access:** Navigate to ERPNext → FLRTS → Reports → Telegram Message Volume

### 3.3 ERPNext Email Alerts (Built-in)

Configure Email Alerts via ERPNext UI:

**Alert 1: Low Success Rate**

- Navigate to: Settings → Email Alerts → New
- Document Type: FLRTS Parser Log
- Condition: Custom (use Server Script instead - more flexible)
- Note: Server Script handles this (see 3.1)

**Alert 2: High Daily Cost**

- Document Type: FLRTS Parser Log
- Condition: Custom (use Server Script instead)
- Note: Server Script handles this (see 3.1)

### 3.4 Frappe Cloud Built-in Monitoring

**Access:** Frappe Cloud Dashboard → Sites → ops.10nz.tools → Monitoring

**Available Metrics:**

- Database connections (current, max)
- Queries per second
- CPU usage (%)
- Memory usage (%)
- Disk usage (GB)
- Background job queue length
- Error log entries (last 24 hours)

**Recommended Checks:**

- Daily: Check error log for ERPNext API errors
- Weekly: Review database connection trends
- Monthly: Review resource usage for scaling decisions

## 4. AWS CloudWatch Monitoring (Infrastructure Layer)

### 4.1 CloudWatch Alarms (4 Total)

**Alarm 1: Lambda Errors** (Existing)

- **Name:** `telegram-webhook-handler-errors-${Environment}`
- **Metric:** Errors (count)
- **Threshold:** >3 errors in 5 minutes
- **Action:** Send SNS notification
- **Severity:** Critical
- **Response:** Check CloudWatch Logs for error details, verify ERPNext/OpenAI
  API status

**Alarm 2: Provisioned Concurrency Spillover** (Existing)

- **Name:** `telegram-webhook-pc-spillover-${Environment}`
- **Metric:** ProvisionedConcurrencySpilloverInvocations (count)
- **Threshold:** >=1 spillover in 5 minutes
- **Action:** Send SNS notification
- **Severity:** Warning
- **Response:** Consider increasing PC or optimizing function duration

**Alarm 3: Lambda Timeout** (NEW)

- **Name:** `telegram-webhook-handler-timeout-${Environment}`
- **Metric:** Duration (milliseconds)
- **Threshold:** >14,000ms (14 seconds, 1 second before timeout)
- **Action:** Send SNS notification
- **Severity:** Critical
- **Response:** Check X-Ray traces for bottlenecks, verify ERPNext API response
  times

**Alarm 4: Lambda Throttles** (NEW)

- **Name:** `telegram-webhook-handler-throttles-${Environment}`
- **Metric:** Throttles (count)
- **Threshold:** >=1 throttle in 5 minutes
- **Action:** Send SNS notification
- **Severity:** Critical
- **Response:** Increase reserved concurrency or investigate concurrent
  execution spike

**Alarm 5: OpenAI Quota Exceeded** (NEW - Custom Metric)

- **Name:** `telegram-webhook-openai-quota-${Environment}`
- **Metric:** Custom metric from CloudWatch Logs Metric Filter
- **Filter Pattern:** `{ $.event = "openai_quota_exceeded" }` (JSON format)
- **Threshold:** >=1 occurrence in 5 minutes
- **Action:** Send SNS notification
- **Severity:** Critical
- **Response:** Check OpenAI billing dashboard, request quota increase, or
  implement request throttling
- **Note:** Lambda uses structured JSON logging. The event
  "openai_quota_exceeded" is emitted when OpenAI returns a 429 rate limit or
  quota exceeded error.

### 4.2 SNS Topic Configuration

**Resource:** `AlertNotificationTopic`

- **Type:** AWS::SNS::Topic
- **TopicName:** `telegram-bot-alerts-${Environment}`
- **Subscription:** Email protocol
- **Email Address:** From parameter `AlertEmail`

**Parameter to Add:**

- `AlertEmail`: String parameter for email address to receive CloudWatch alarm
  notifications
- Default: "<dev-team@10nz.tools>"

**All alarms updated to include:**

- `AlarmActions`: `[!Ref AlertNotificationTopic]`

### 4.3 CloudWatch Dashboard (Optional)

Create a CloudWatch dashboard showing:

- Lambda invocations (line chart, last 24 hours)
- Lambda errors (bar chart, last 24 hours)
- Lambda duration (p50, p95, p99 percentiles)
- PC utilization (gauge, current %)
- Alarm status (all 5 alarms, green/red indicators)

**Creation:**

- Via AWS Console: CloudWatch → Dashboards → Create Dashboard
- Or via CloudFormation resource in template.yaml
- Dashboard name: `telegram-bot-${Environment}`

### 4.4 CloudWatch Logs Insights Queries

**Saved Queries for Common Investigations:**

**Query 1: Error Rate by Type**

```
fields @timestamp, event, error_type, error_message
| filter event = "error"
| stats count() by error_type
| sort count desc
```

**Query 2: Slow Operations (>5 seconds)**

```
fields @timestamp, event, duration
| filter duration > 5000
| sort @timestamp desc
```

**Query 3: OpenAI API Failures**

```
fields @timestamp, event, error_message
| filter event = "openai_request_failed"
| sort @timestamp desc
```

**Query 4: ERPNext API Failures**

```
fields @timestamp, event, status_code, error_message
| filter event = "erpnext_api_error"
| stats count() by status_code
```

**Query 5: Context Cache Hit Rate**

```
fields @timestamp, event
| filter event = "context_fetched" or event = "context_cache_hit"
| stats count() by event
```

## 5. AWS X-Ray Tracing (Performance Layer)

### 5.1 Trace Analysis

**Access:** AWS Console → X-Ray → Traces

**Filter by:** Service name = "telegram-webhook-handler"

**Key Subsegments to Monitor:**

- `context-fetch` - ERPNext context fetching (should be <500ms with cache)
- `openai-parse` - OpenAI API call (should be <2 seconds)
- `erpnext-create` - Maintenance Visit creation (should be <1 second)
- `audit-log` - Parser log creation (fire-and-forget, <500ms)

**Performance Targets:**

- Total trace duration: <5 seconds (p95)
- Context fetch: <500ms (p95)
- OpenAI parse: <2 seconds (p95)
- ERPNext create: <1 second (p95)

**Bottleneck Detection:**

- Sort traces by duration (descending)
- Identify slow subsegments
- Correlate with CloudWatch Logs for error details

### 5.2 Service Map

**Access:** AWS Console → X-Ray → Service Map

**Expected Services:**

- telegram-webhook-handler (Lambda)
- api.openai.com (external)
- ops.10nz.tools (ERPNext, external)

**Health Indicators:**

- Green: <5% error rate
- Yellow: 5-10% error rate
- Red: >10% error rate

**Response Time Indicators:**

- Green: <2 seconds average
- Yellow: 2-5 seconds average
- Red: >5 seconds average

## 6. Monitoring Dashboards

### 6.1 ERPNext Dashboards

**Dashboard 1: FLRTS Operations Dashboard**

**Access:** ERPNext → FLRTS → Dashboard → FLRTS Operations

**Widgets:**

1. **Parser Success Rate** (Number Card)
   - Metric: Success rate (last 7 days)
   - Color: Green if >80%, Red if <80%
   - Click: Opens Parser Performance Dashboard report

2. **Daily OpenAI Cost** (Number Card)
   - Metric: Today's total cost
   - Color: Green if <$10, Red if >=$10
   - Click: Opens OpenAI Cost Tracking report

3. **Message Volume** (Line Chart)
   - Metric: Messages per day (last 30 days)
   - Data: From Telegram Message Volume report
   - Shows trend and peak days

4. **Recent Failed Parses** (List)
   - Shows last 10 rejected parses
   - Columns: date, original_message, model_rationale, user_feedback
   - Click: Opens FLRTS Parser Log detail

5. **Top Users by Activity** (Bar Chart)
   - Metric: Message count by telegram_user_id (last 7 days)
   - Shows most active users

**Creation:**

- Navigate to: ERPNext → Customize → Dashboard → New
- Add widgets using Report Builder
- Set refresh interval: 5 minutes
- Assign to FLRTS module

### 6.2 CloudWatch Dashboard

**Dashboard Name:** `telegram-bot-production`

**Access:** AWS Console → CloudWatch → Dashboards → telegram-bot-production

**Widgets:**

1. **Lambda Invocations** (Line chart, last 24 hours)
2. **Lambda Errors** (Bar chart, last 24 hours)
3. **Lambda Duration** (Line chart, p50/p95/p99, last 24 hours)
4. **PC Utilization** (Gauge, current %)
5. **Alarm Status** (All 5 alarms, green/red indicators)
6. **Recent Logs** (Log widget, last 20 entries)

**Creation:**

- Via AWS Console: CloudWatch → Dashboards → Create Dashboard
- Or via CloudFormation resource in template.yaml (optional)

## 7. Alert Configuration

### 7.1 ERPNext Email Alerts

**Alert 1: Low Success Rate**

- **Trigger:** Server Script (daily at 9 AM)
- **Condition:** success_rate < 80%
- **Recipients:** System Managers (from User Role)
- **Subject:** "🚨 FLRTS Parser Success Rate Alert: {success_rate}%"
- **Body Template:**

  ```
  FLRTS Parser Success Rate Alert

  Current Success Rate: {success_rate}%
  Threshold: 80%

  Last 24 Hours:
  - Total Parses: {total_parses}
  - Accepted: {accepted}
  - Rejected: {rejected}
  - Pending: {pending}

  Action Required:
  1. Review failed parses: [Link to Parser Performance Dashboard]
  2. Analyze rejection patterns: [Link to Failed Parse Analysis]
  3. Update OpenAI prompts if needed

  This is an automated alert from FLRTS monitoring.
  ```

**Alert 2: High Daily Cost**

- **Trigger:** Server Script (daily at 6 PM)
- **Condition:** daily_cost > $10 OR projected_monthly > $300
- **Recipients:** System Managers + Finance team
- **Subject:** "💰 FLRTS OpenAI Cost Alert: ${total_cost} today"
- **Body Template:**

  ```
  FLRTS OpenAI Cost Alert

  Today's Cost: ${total_cost}
  Projected Monthly: ${projected_monthly}
  Threshold: $10/day, $300/month

  Usage Details:
  - Total Parses: {total_parses}
  - Average Cost per Parse: ${avg_cost}
  - Total Tokens: {total_tokens}

  Action Required:
  1. Review cost breakdown: [Link to Cost Tracking Report]
  2. Identify expensive parses (high token count)
  3. Consider optimizing prompts or using gpt-4o-mini

  This is an automated alert from FLRTS monitoring.
  ```

### 7.2 CloudWatch SNS Alerts

**SNS Topic:** `telegram-bot-alerts-production` **Subscription:** Email to
<dev-team@10nz.tools> (configurable via parameter)

**Alert Format (from CloudWatch):**

```
Alarm Name: telegram-webhook-handler-errors-production
Alarm Description: Alert when webhook handler experiences errors
State Change: OK → ALARM
Reason: Threshold Crossed: 5 datapoints [4.0, 5.0, 3.0, 6.0, 4.0] were greater than the threshold (3.0)
Timestamp: 2025-10-20 14:30:00 UTC

View Alarm: [Link to CloudWatch Console]
```

**Email Subject:**
`ALARM: "telegram-webhook-handler-errors-production" in US East (N. Virginia)`

**Response Procedures:** Each alarm email should link to troubleshooting guide
section for that specific alarm type.

## 8. Monitoring Procedures

### 8.1 Daily Monitoring Checklist (5 minutes)

**Morning (9 AM):**

- [ ] Check email for overnight alerts (ERPNext + CloudWatch)
- [ ] Review ERPNext FLRTS Operations Dashboard
- [ ] Check success rate (target: >80%)
- [ ] Check yesterday's cost (target: <$10)
- [ ] Review CloudWatch dashboard for Lambda health

**Evening (6 PM):**

- [ ] Check email for daily cost alert
- [ ] Review today's message volume
- [ ] Check for any CloudWatch alarms triggered
- [ ] Review X-Ray traces if performance issues reported

### 8.2 Weekly Monitoring Checklist (15 minutes)

**Every Monday:**

- [ ] Review Parser Performance Dashboard (last 7 days)
- [ ] Analyze success rate trends (improving or degrading?)
- [ ] Review Cost Tracking Report (weekly spend)
- [ ] Check for new error patterns in CloudWatch Logs Insights
- [ ] Review X-Ray service map for external API health
- [ ] Check Frappe Cloud monitoring for resource usage trends

### 8.3 Monthly Monitoring Checklist (30 minutes)

**First Monday of Month:**

- [ ] Generate monthly cost report (OpenAI Cost Tracking)
- [ ] Review success rate trends (month-over-month)
- [ ] Analyze user adoption (unique users per month)
- [ ] Review CloudWatch metrics for scaling needs
- [ ] Check Frappe Cloud resource usage (upgrade needed?)
- [ ] Review and update alert thresholds if needed
- [ ] Export reports to PDF for stakeholders

## 9. Alert Response Procedures

### 9.1 Low Success Rate Alert (<80%)

**Severity:** High (impacts user experience)

**Immediate Actions (15 minutes):**

1. Open Parser Performance Dashboard in ERPNext
2. Identify date range with low success rate
3. Query FLRTS Parser Log for rejected parses:
   - Filter: user_accepted = "Rejected", creation >= yesterday
   - Review: original_message, model_rationale, user_feedback
4. Identify common rejection patterns:
   - Incorrect assignee mapping?
   - Wrong date/time parsing?
   - Missing site detection?
   - Priority misclassification?

**Root Cause Analysis (30 minutes):**

1. Review model_rationale for failed parses
2. Check if OpenAI prompt needs updates
3. Verify ERPNext context data is current (users, sites)
4. Check for recent changes to Lambda code or prompts

**Resolution:**

1. Update OpenAI system prompt in `lib/openai.mjs` if needed
2. Add missing users/sites to ERPNext if context incomplete
3. Deploy Lambda update: `sam build && sam deploy`
4. Monitor success rate for next 24 hours
5. Document findings in Linear ticket

### 9.2 High Daily Cost Alert (>$10)

**Severity:** Medium (budget impact)

**Immediate Actions (10 minutes):**

1. Open OpenAI Cost Tracking report in ERPNext
2. Check today's total cost and projected monthly
3. Identify high-cost parses:
   - Filter: creation >= today, ORDER BY estimated_cost_usd DESC
   - Review: original_message, total_tokens
4. Check for anomalies:
   - Unusually long messages?
   - Repeated parse attempts (corrections)?
   - Model change (gpt-4o vs gpt-4o-mini)?

**Root Cause Analysis (20 minutes):**

1. Review token usage trends (increasing over time?)
2. Check if system prompt has grown too large
3. Verify context injection isn't including excessive data
4. Check for retry loops (OpenAI failures causing repeated calls)

**Resolution:**

1. Optimize system prompt (reduce token count)
2. Consider switching to gpt-4o-mini for non-critical parses
3. Implement request throttling if usage spike detected
4. Update budget threshold if legitimate usage increase
5. Monitor costs for next 3 days

### 9.3 Lambda Error Alarm (>3 errors in 5 minutes)

**Severity:** Critical (service degradation)

**Immediate Actions (5 minutes):**

1. Check CloudWatch Logs: `/aws/lambda/telegram-webhook-handler-production`
2. Filter by ERROR level
3. Identify error type:
   - OpenAI API errors (401, 429, 500)?
   - ERPNext API errors (401, 417, 500)?
   - Lambda code errors (syntax, runtime)?
   - Telegram API errors?

**Root Cause Analysis (15 minutes):**

1. Check X-Ray traces for failed invocations
2. Identify failing subsegment (context-fetch, openai-parse, erpnext-create)
3. Check external API status:
   - OpenAI: <https://status.openai.com/>
   - Frappe Cloud: <https://frappecloud.com/dashboard>
   - Telegram: <https://telegram.org/>
4. Review recent deployments (Lambda or ERPNext changes?)

**Resolution:**

- See `docs/deployment/telegram-bot-troubleshooting.md` for detailed procedures
- Common fixes:
  - Verify API credentials (ERPNext, OpenAI)
  - Check ERPNext custom DocTypes exist
  - Rollback Lambda deployment if recent change
  - Increase timeout if ERPNext API slow

### 9.4 Lambda Timeout Alarm (>14 seconds)

**Severity:** High (approaching hard limit)

**Immediate Actions (10 minutes):**

1. Check X-Ray traces for slow invocations
2. Identify bottleneck subsegment:
   - context-fetch taking >5 seconds?
   - openai-parse taking >10 seconds?
   - erpnext-create taking >5 seconds?
3. Check CloudWatch Logs for retry attempts (multiple retries increase duration)

**Root Cause Analysis (20 minutes):**

1. Check ERPNext API response times (Frappe Cloud monitoring)
2. Check OpenAI API response times (X-Ray external service timing)
3. Review Lambda code for inefficiencies (unnecessary retries, large payloads)
4. Check network latency (Lambda → ERPNext, Lambda → OpenAI)

**Resolution:**

1. Optimize slow operations (reduce retries, optimize queries)
2. Increase Lambda timeout to 20 seconds (if legitimate slow operations)
3. Implement async processing (return 200 immediately, process in background)
4. Contact Frappe Cloud support if ERPNext API consistently slow

### 9.5 OpenAI Quota Exceeded Alarm

**Severity:** Critical (service outage)

**Immediate Actions (5 minutes):**

1. Check OpenAI dashboard: <https://platform.openai.com/usage>
2. Verify current quota and usage
3. Check if quota reset time is soon (quotas reset monthly)
4. Disable Telegram webhook temporarily if needed:

   ```bash
   curl -X POST https://api.telegram.org/bot<TOKEN>/deleteWebhook
   ```

**Root Cause Analysis (10 minutes):**

1. Check for usage spike (CloudWatch invocation metrics)
2. Identify cause of spike:
   - Legitimate traffic increase?
   - Retry loop (failures causing repeated calls)?
   - Attack/abuse (spam messages)?
3. Review recent message volume trends

**Resolution:**

1. Request quota increase: <https://platform.openai.com/account/rate-limits>
2. Implement request throttling (API Gateway with rate limiting)
3. Add user-level rate limiting (max 10 messages/hour per user)
4. Re-enable Telegram webhook after quota restored
5. Monitor usage closely for next 24 hours

## 10. Metric Interpretation Guide

### 10.1 Success Rate Metrics

**What is Success Rate?**

- Percentage of parses accepted by users
- Formula: (accepted / (accepted + rejected)) \* 100
- Excludes pending (user hasn't responded yet)

**Healthy Range:**

- Excellent: >90%
- Good: 80-90%
- Concerning: 70-80%
- Critical: <70%

**Factors Affecting Success Rate:**

- Prompt quality (clear instructions, good examples)
- Context completeness (all users/sites in prompt)
- Message complexity (simple vs ambiguous requests)
- User expectations (what they consider "correct")

**Improvement Strategies:**

- Review rejected parses for patterns
- Update prompt with clearer instructions
- Add more examples to prompt
- Improve context injection (more user/site data)

### 10.2 Cost Metrics

**What is Estimated Cost?**

- Calculated from token usage and model pricing
- Formula: (prompt_tokens_ input_price) + (completion_tokens _output_price)
- Pricing (as of Oct 2024):
  - gpt-4o: $2.50/1M input, $10.00/1M output
  - gpt-4o-mini: $0.15/1M input, $0.60/1M output

**Healthy Range (50 tasks/day):**

- Excellent: <$5/day (<$150/month)
- Good: $5-10/day ($150-300/month)
- Concerning: $10-20/day ($300-600/month)
- Critical: >$20/day (>$600/month)

**Cost Optimization Strategies:**

- Reduce system prompt length (remove unnecessary context)
- Use gpt-4o-mini for simple parses (10x cheaper)
- Implement prompt caching (reuse system prompt)
- Reduce context data (filter users by active status)

### 10.3 Performance Metrics

**Lambda Duration:**

- **p50 (median):** Typical request duration
  - Target: <2 seconds
  - Indicates: Normal operation
- **p95:** 95% of requests complete within this time
  - Target: <5 seconds
  - Indicates: Acceptable performance with occasional slow requests
- **p99:** 99% of requests complete within this time
  - Target: <10 seconds
  - Indicates: Rare slow requests (retries, slow APIs)

**Context Cache Hit Rate:**

- Percentage of requests using cached context (not fetching from ERPNext)
- Formula: (cache_hits / total_requests) \* 100
- Target: >80% (indicates effective caching)
- Low hit rate (<50%) suggests:
  - Cache TTL too short (increase from 5 to 10 minutes)
  - Lambda cold starts (increase PC)
  - High traffic (cache expires frequently)

## 11. Troubleshooting Runbook

### 11.1 Alert: Low Success Rate

**Diagnostic Steps:**

1. Open Parser Performance Dashboard
2. Identify date range with low success rate
3. Query rejected parses:
   `frappe.db.get_list('FLRTS Parser Log', filters={'user_accepted': 'Rejected', 'creation': ['>=', yesterday]})`
4. Review model_rationale and user_feedback fields
5. Identify common patterns (e.g., all rejections related to time parsing)

**Common Causes:**

- Prompt doesn't handle edge cases (e.g., "next Monday" vs "this Monday")
- Context data outdated (new user not in team_members list)
- Model hallucinating (making up sites/users not in context)
- User expectations mismatch (user wants different format)

**Resolution Steps:**

1. Update system prompt in `lib/openai.mjs` with clearer instructions
2. Add missing users/sites to ERPNext
3. Deploy Lambda update
4. Test with previously failed messages
5. Monitor success rate for 24 hours

### 11.2 Alert: High Daily Cost

**Diagnostic Steps:**

1. Open OpenAI Cost Tracking report
2. Sort by estimated_cost_usd DESC
3. Identify high-cost parses (>$0.10 per parse)
4. Review original_message and total_tokens for expensive parses
5. Check if cost spike is one-time or trend

**Common Causes:**

- Very long messages (>1000 characters)
- Large system prompt (>2000 tokens)
- Excessive context data (100+ users/sites)
- Retry loops (OpenAI failures causing repeated calls)
- Model change (gpt-4o instead of gpt-4o-mini)

**Resolution Steps:**

1. Implement message length validation (reject >1000 chars)
2. Optimize system prompt (remove unnecessary instructions)
3. Filter context data (only active users, only nearby sites)
4. Fix retry loops (check error handling logic)
5. Consider gpt-4o-mini for non-critical parses

### 11.3 Alert: Lambda Errors

**See:** `docs/deployment/telegram-bot-troubleshooting.md` for comprehensive
error troubleshooting.

**Quick Diagnostic:**

```bash
# Check recent errors
aws logs tail /aws/lambda/telegram-webhook-handler-production --since 10m --filter-pattern ERROR

# Check error distribution
aws logs filter-log-events \
  --log-group-name /aws/lambda/telegram-webhook-handler-production \
  --filter-pattern '{ $.level = "ERROR" }' \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  | jq '.events[].message' | jq -r '.error_type' | sort | uniq -c
```

### 11.4 Alert: Lambda Timeout

**See:** `docs/deployment/telegram-bot-troubleshooting.md` section 7.1 for
timeout troubleshooting.

**Quick Diagnostic:**

```bash
# Check slow traces in X-Ray
aws xray get-trace-summaries \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --filter-expression 'duration > 10'
```
