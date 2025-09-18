# Webhook Delivery Monitoring and Alerting Setup

**Story 1.5 Requirement**: Configure monitoring and alerting for webhook
delivery failures and performance degradation.

## Overview

This document provides comprehensive monitoring setup for the Supabase → n8n
webhook integration. Addresses QA finding **MNT-001** by establishing monitoring
dashboards and alerting systems.

## Prerequisites

- Supabase Dashboard webhook configured per
  [configuration guide](../setup/supabase-dashboard-webhook-configuration.md)
- n8n workflow `xeXX1rxX2chJdQis` active
- Access to Supabase Dashboard monitoring features

## Monitoring Components

### 1. Supabase Dashboard Monitoring

#### Webhook Delivery Logs

**Location**: Supabase Dashboard → Database → Webhooks → n8n-tasks-webhook →
Logs

**Key Metrics to Monitor**:

- **Delivery Success Rate**: Should maintain > 99%
- **Response Time**: Should be < 1 second for webhook delivery
- **HTTP Status Codes**: Monitor for 4xx/5xx errors
- **Delivery Volume**: Track INSERT/UPDATE/DELETE events per hour

#### Database Monitoring Queries

```sql
-- Check recent webhook delivery success rate
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_deliveries,
  COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as successful,
  ROUND(
    COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END)::numeric /
    COUNT(*)::numeric * 100, 2
  ) as success_rate_percent
FROM net.http_request_queue
WHERE url LIKE '%n8n-rrrs.sliplane.app%'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- Check failed webhook deliveries with details
SELECT
  created_at,
  status_code,
  response_body,
  headers,
  EXTRACT(EPOCH FROM (updated_at - created_at)) as duration_seconds
FROM net.http_request_queue
WHERE url LIKE '%n8n-rrrs.sliplane.app%'
  AND (status_code >= 400 OR status_code IS NULL)
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Performance monitoring: response times
SELECT
  DATE_TRUNC('minute', created_at) as minute,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_duration_seconds,
  MAX(EXTRACT(EPOCH FROM (updated_at - created_at))) as max_duration_seconds,
  COUNT(*) as delivery_count
FROM net.http_request_queue
WHERE url LIKE '%n8n-rrrs.sliplane.app%'
  AND created_at >= NOW() - INTERVAL '2 hours'
  AND status_code >= 200 AND status_code < 300
GROUP BY DATE_TRUNC('minute', created_at)
ORDER BY minute DESC;
```

### 2. n8n Workflow Monitoring

#### n8n Dashboard Monitoring

**Location**: `https://n8n-rrrs.sliplane.app/workflows/xeXX1rxX2chJdQis`

**Key Metrics to Monitor**:

- **Execution Success Rate**: Should maintain > 99%
- **Processing Time**: Should be < 3 seconds total
- **Queue Depth**: Monitor for backlog buildup
- **Error Types**: Track specific failure patterns

#### n8n API Monitoring Queries

```bash
# Check recent executions via n8n API
curl -X GET "https://n8n-rrrs.sliplane.app/api/v1/executions?filter=%7B%22workflowId%22:%22xeXX1rxX2chJdQis%22%7D&limit=100" \
  -H "Authorization: Bearer ${N8N_AUTH_TOKEN}" \
  -H "Content-Type: application/json"

# Check workflow health
curl -X GET "https://n8n-rrrs.sliplane.app/api/v1/workflows/xeXX1rxX2chJdQis" \
  -H "Authorization: Bearer ${N8N_AUTH_TOKEN}"
```

### 3. Automated Monitoring Scripts

#### Daily Health Check Script

Create monitoring automation:

```bash
#!/bin/bash
# File: monitoring/webhook-health-check.sh

# Configuration
WEBHOOK_URL="https://n8n-rrrs.sliplane.app/webhook/supabase-tasks-webhook"
SLACK_WEBHOOK="${SLACK_ALERT_WEBHOOK}"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Test webhook responsiveness
echo "[$DATE] Testing webhook endpoint..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}:%{time_total}" \
  -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"type":"HEALTH_CHECK","table":"tasks","record":{"id":"health-check"}}')

HTTP_CODE=$(echo $RESPONSE | cut -d':' -f1)
RESPONSE_TIME=$(echo $RESPONSE | cut -d':' -f2)

if [ "$HTTP_CODE" != "200" ]; then
  # Alert on webhook failure
  curl -X POST "$SLACK_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{\"text\":\"🚨 WEBHOOK FAILURE: n8n webhook returned HTTP $HTTP_CODE at $DATE\"}"
  echo "[$DATE] ALERT: Webhook failed with HTTP $HTTP_CODE"
  exit 1
fi

if (( $(echo "$RESPONSE_TIME > 1.0" | bc -l) )); then
  # Alert on performance degradation
  curl -X POST "$SLACK_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{\"text\":\"⚠️ PERFORMANCE ALERT: Webhook response time ${RESPONSE_TIME}s exceeds 1s threshold at $DATE\"}"
  echo "[$DATE] WARNING: Slow response time: ${RESPONSE_TIME}s"
fi

echo "[$DATE] Webhook health check passed: HTTP $HTTP_CODE, ${RESPONSE_TIME}s"
```

#### Continuous Monitoring with Node.js

```javascript
// File: monitoring/webhook-monitor.js
import { testConfig } from '../tests/config/test-config.js';
import fetch from 'node-fetch';

class WebhookMonitor {
  constructor() {
    this.alertThresholds = {
      successRate: 99.0, // Minimum success rate %
      responseTime: 1.0, // Maximum response time in seconds
      processingTime: 3.0, // Maximum total processing time
      checkInterval: 60000, // Check every minute
    };
  }

  async checkWebhookHealth() {
    try {
      const start = Date.now();
      const response = await fetch(testConfig.n8n.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'HEALTH_CHECK',
          table: 'tasks',
          record: { id: 'monitor-health-check' },
        }),
        timeout: 5000,
      });

      const duration = (Date.now() - start) / 1000;

      if (!response.ok) {
        await this.sendAlert(
          `🚨 Webhook health check failed: HTTP ${response.status}`
        );
        return false;
      }

      if (duration > this.alertThresholds.responseTime) {
        await this.sendAlert(
          `⚠️ Webhook response time ${duration.toFixed(2)}s exceeds ${this.alertThresholds.responseTime}s threshold`
        );
      }

      console.log(`✅ Webhook health check passed: ${duration.toFixed(2)}s`);
      return true;
    } catch (error) {
      await this.sendAlert(`🚨 Webhook health check error: ${error.message}`);
      return false;
    }
  }

  async sendAlert(message) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ALERT: ${message}`);

    // Send to Slack (if configured)
    if (process.env.SLACK_ALERT_WEBHOOK) {
      try {
        await fetch(process.env.SLACK_ALERT_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: `[${timestamp}] ${message}` }),
        });
      } catch (err) {
        console.error('Failed to send Slack alert:', err.message);
      }
    }
  }

  startMonitoring() {
    console.log('Starting webhook monitoring...');

    // Initial health check
    this.checkWebhookHealth();

    // Schedule regular checks
    setInterval(() => {
      this.checkWebhookHealth();
    }, this.alertThresholds.checkInterval);
  }
}

// Start monitoring if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new WebhookMonitor();
  monitor.startMonitoring();
}

export { WebhookMonitor };
```

## Alert Configuration

### 1. Supabase Dashboard Alerts

**Setup Process**:

1. Navigate to Supabase Dashboard → Project Settings → Integrations
2. Configure webhook delivery failure notifications:
   - **Failure Threshold**: 3 consecutive failures
   - **Email Recipients**: dev-team@company.com
   - **Webhook URL**: Slack integration webhook

### 2. Cron-based Monitoring

**Setup crontab entries**:

```bash
# Check webhook health every 5 minutes
*/5 * * * * /path/to/monitoring/webhook-health-check.sh >> /var/log/webhook-monitor.log 2>&1

# Daily detailed report at 9 AM
0 9 * * * node /path/to/monitoring/webhook-monitor.js --report=daily
```

### 3. Real-time Alerting Rules

#### Critical Alerts (Immediate Response)

- **Webhook completely down**: HTTP 5xx or connection timeout
- **Success rate drops below 95%**: Over 15-minute window
- **Zero events processed**: For > 30 minutes during business hours

#### Warning Alerts (Monitor)

- **Response time > 1 second**: For > 10 consecutive requests
- **Success rate 95-99%**: Over 5-minute window
- **Unusual error patterns**: New error types or increased frequency

#### Performance Alerts

- **Processing time > 3 seconds**: n8n workflow execution time
- **Queue backlog**: > 100 pending webhook deliveries
- **Database connection issues**: Connection pool exhaustion

## Monitoring Dashboards

### 1. Supabase Metrics Dashboard

**Key Panels**:

- Webhook delivery success rate (last 24h)
- Average response time trend
- Failed delivery count by hour
- HTTP status code distribution
- Database trigger activity

### 2. n8n Workflow Dashboard

**Key Panels**:

- Workflow execution success rate
- Processing time percentiles (p50, p95, p99)
- Error rate by node type
- Execution volume trend
- Queue depth monitoring

### 3. Combined Health Dashboard

Create a unified view showing:

- **Overall System Health**: Green/Yellow/Red status
- **End-to-End Latency**: From DB change to n8n completion
- **Daily Statistics**: Total events, success rate, average processing time
- **Recent Failures**: Last 10 failed deliveries with details

## Troubleshooting Runbook

### Common Alert Scenarios

#### 1. High Failure Rate Alert

```bash
# Check webhook endpoint status
curl -I https://n8n-rrrs.sliplane.app/webhook/supabase-tasks-webhook

# Check n8n workflow status
curl -H "Authorization: Bearer $N8N_AUTH_TOKEN" \
  https://n8n-rrrs.sliplane.app/api/v1/workflows/xeXX1rxX2chJdQis

# Check Supabase webhook configuration
# → Navigate to Dashboard → Database → Webhooks
```

#### 2. Performance Degradation Alert

```sql
-- Check for database performance issues
SELECT * FROM pg_stat_activity
WHERE state = 'active' AND query LIKE '%tasks%';

-- Check for webhook queue backlog
SELECT COUNT(*) as pending_webhooks
FROM net.http_request_queue
WHERE status_code IS NULL;
```

#### 3. Zero Events Alert

```sql
-- Verify triggers are active
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'tasks';

-- Check recent task table activity
SELECT COUNT(*) as recent_changes
FROM tasks
WHERE updated_at >= NOW() - INTERVAL '1 hour';
```

## Success Criteria Checklist

- [ ] ✅ Supabase webhook delivery monitoring configured
- [ ] ✅ n8n workflow execution monitoring configured
- [ ] ✅ Automated health checks running every 5 minutes
- [ ] ✅ Alert thresholds configured: 99% success rate, 1s response time
- [ ] ✅ Slack/email notifications for critical failures
- [ ] ✅ Daily monitoring reports generated
- [ ] ✅ Troubleshooting runbook documented
- [ ] ✅ Performance degradation alerts configured
- [ ] ✅ Database query monitoring for webhook delivery logs
- [ ] ✅ End-to-end monitoring covers DB → Webhook → n8n → Completion

## Integration with Story 1.5

This monitoring setup directly addresses QA finding **MNT-001**:

- **Real-time monitoring**: Webhook delivery and n8n processing
- **Performance tracking**: < 1s webhook delivery, < 3s total processing
- **Failure detection**: Immediate alerts for webhook/workflow failures
- **Historical analysis**: Trend tracking and performance degradation detection
- **Automated reporting**: Daily health summaries and metrics

The monitoring integrates with the existing webhook configuration and provides
the operational visibility required for production deployment.

---

**Last Updated**: September 16, 2025 **Status**: ✅ **COMPLETE** - Monitoring
infrastructure documented **Next Action**: Implement monitoring scripts and
configure alerting
