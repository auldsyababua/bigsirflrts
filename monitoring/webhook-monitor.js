#!/usr/bin/env node
/**
 * Webhook Monitoring Service
 * Story 1.5 - Continuous monitoring for Supabase → n8n webhook integration
 *
 * Usage:
 *   node webhook-monitor.js           # Start continuous monitoring
 *   node webhook-monitor.js --report  # Generate daily report
 *   node webhook-monitor.js --test    # Single health check
 */

import { testConfig } from "../tests/config/test-config.js";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

class WebhookMonitor {
  constructor() {
    this.alertThresholds = {
      successRate: 99.0, // Minimum success rate %
      responseTime: 1.0, // Maximum response time in seconds (Story 1.5)
      processingTime: 3.0, // Maximum total processing time (Story 1.5)
      checkInterval: 60000, // Check every minute
      alertCooldown: 300000, // 5 minutes between same alert type
    };

    this.lastAlerts = new Map();
    this.isRunning = false;

    // Initialize Supabase client for monitoring queries
    if (testConfig.supabase.url && testConfig.supabase.serviceRoleKey) {
      this.supabase = createClient(
        testConfig.supabase.url,
        testConfig.supabase.serviceRoleKey,
      );
    }
  }

  async checkWebhookHealth() {
    try {
      const start = Date.now();

      // Test payload matching Story 1.5 webhook format
      const testPayload = {
        type: "HEALTH_CHECK",
        table: "tasks",
        schema: "public",
        record: {
          id: `health-check-${Date.now()}`,
          title: "Health Check Task",
          status: "pending",
          priority: "low",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        old_record: null,
      };

      const response = await fetch(testConfig.n8n.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload),
        timeout: 5000,
      });

      const duration = (Date.now() - start) / 1000;

      if (!response.ok) {
        await this.sendAlert(
          "webhook_failure",
          `🚨 Webhook health check failed: HTTP ${response.status}`,
          "critical",
        );
        return { success: false, duration, statusCode: response.status };
      }

      if (duration > this.alertThresholds.responseTime) {
        await this.sendAlert(
          "performance_warning",
          `⚠️ Webhook response time ${duration.toFixed(2)}s exceeds ${this.alertThresholds.responseTime}s threshold`,
          "warning",
        );
      }

      this.log(`✅ Webhook health check passed: ${duration.toFixed(2)}s`);
      return { success: true, duration, statusCode: response.status };
    } catch (error) {
      await this.sendAlert(
        "webhook_error",
        `🚨 Webhook health check error: ${error.message}`,
        "critical",
      );
      return { success: false, error: error.message };
    }
  }

  async checkWebhookDeliveryStats() {
    if (!this.supabase) {
      this.log("Supabase client not available for delivery stats");
      return null;
    }

    try {
      // Query webhook delivery success rate (last hour)
      const { data, error } = await this.supabase.rpc("get_webhook_stats", {
        hours_back: 1,
        webhook_pattern: "%n8n-rrrs.sliplane.app%",
      });

      if (error) {
        // Fallback to direct table query if RPC not available
        const { data: deliveries, error: queryError } = await this.supabase
          .from("net.http_request_queue")
          .select("status_code, created_at, updated_at")
          .like("url", "%n8n-rrrs.sliplane.app%")
          .gte(
            "created_at",
            new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          );

        if (queryError) {
          this.log(
            `Failed to query webhook delivery stats: ${queryError.message}`,
          );
          return null;
        }

        return this.calculateStats(deliveries);
      }

      return data[0] || null;
    } catch (error) {
      this.log(`Error checking delivery stats: ${error.message}`);
      return null;
    }
  }

  calculateStats(deliveries) {
    if (!deliveries || deliveries.length === 0) {
      return { total_deliveries: 0, successful: 0, success_rate: 100 };
    }

    const successful = deliveries.filter(
      (d) => d.status_code && d.status_code >= 200 && d.status_code < 300,
    ).length;

    return {
      total_deliveries: deliveries.length,
      successful,
      success_rate: (successful / deliveries.length) * 100,
      avg_response_time:
        deliveries
          .filter((d) => d.updated_at && d.created_at)
          .reduce((sum, d) => {
            const duration = new Date(d.updated_at) - new Date(d.created_at);
            return sum + duration / 1000;
          }, 0) / deliveries.length,
    };
  }

  async sendAlert(alertType, message, severity = "warning") {
    const now = Date.now();
    const lastAlert = this.lastAlerts.get(alertType);

    // Implement alert cooldown to prevent spam
    if (lastAlert && now - lastAlert < this.alertThresholds.alertCooldown) {
      return;
    }

    this.lastAlerts.set(alertType, now);

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${severity.toUpperCase()}: ${message}`;

    console.error(logMessage);

    // Send to Slack (if configured)
    if (process.env.SLACK_ALERT_WEBHOOK) {
      try {
        const slackPayload = {
          text: logMessage,
          attachments: [
            {
              color: severity === "critical" ? "danger" : "warning",
              fields: [
                {
                  title: "Alert Type",
                  value: alertType,
                  short: true,
                },
                {
                  title: "Timestamp",
                  value: timestamp,
                  short: true,
                },
              ],
            },
          ],
        };

        await fetch(process.env.SLACK_ALERT_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(slackPayload),
        });
      } catch (err) {
        this.log(`Failed to send Slack alert: ${err.message}`);
      }
    }
  }

  async generateDailyReport() {
    this.log("Generating daily webhook monitoring report...");

    const stats = await this.checkWebhookDeliveryStats();
    const healthCheck = await this.checkWebhookHealth();

    const report = {
      timestamp: new Date().toISOString(),
      period: "24 hours",
      webhook_health: {
        current_status: healthCheck.success ? "healthy" : "failed",
        response_time: healthCheck.duration
          ? `${healthCheck.duration.toFixed(2)}s`
          : "N/A",
        status_code: healthCheck.statusCode || "N/A",
      },
      delivery_stats: stats || {
        total_deliveries: "Unable to fetch",
        success_rate: "Unable to fetch",
        avg_response_time: "Unable to fetch",
      },
      thresholds: {
        success_rate_minimum: `${this.alertThresholds.successRate}%`,
        response_time_maximum: `${this.alertThresholds.responseTime}s`,
        processing_time_maximum: `${this.alertThresholds.processingTime}s`,
      },
      recommendations: this.generateRecommendations(healthCheck, stats),
    };

    console.log("\n📊 DAILY WEBHOOK MONITORING REPORT");
    console.log("=====================================");
    console.log(JSON.stringify(report, null, 2));

    return report;
  }

  generateRecommendations(healthCheck, stats) {
    const recommendations = [];

    if (!healthCheck.success) {
      recommendations.push(
        "🚨 CRITICAL: Webhook endpoint is not responding - investigate n8n workflow status",
      );
    }

    if (
      healthCheck.duration &&
      healthCheck.duration > this.alertThresholds.responseTime
    ) {
      recommendations.push(
        "⚠️ WARNING: Webhook response time exceeds threshold - check n8n performance",
      );
    }

    if (stats && stats.success_rate < this.alertThresholds.successRate) {
      recommendations.push(
        "⚠️ WARNING: Webhook success rate below threshold - review failed deliveries",
      );
    }

    if (stats && stats.total_deliveries === 0) {
      recommendations.push(
        "⚠️ WARNING: No webhook deliveries detected - verify database triggers are active",
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "✅ All systems operating within acceptable parameters",
      );
    }

    return recommendations;
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  async runSingleCheck() {
    this.log("Running single webhook health check...");
    const result = await this.checkWebhookHealth();
    const stats = await this.checkWebhookDeliveryStats();

    if (stats) {
      this.log(
        `Delivery stats (last hour): ${stats.total_deliveries} total, ${stats.success_rate.toFixed(1)}% success rate`,
      );
    }

    return result.success;
  }

  startMonitoring() {
    if (this.isRunning) {
      this.log("Monitoring is already running");
      return;
    }

    this.isRunning = true;
    this.log("Starting webhook monitoring...");
    this.log(`Check interval: ${this.alertThresholds.checkInterval / 1000}s`);
    this.log(`Response time threshold: ${this.alertThresholds.responseTime}s`);
    this.log(`Success rate threshold: ${this.alertThresholds.successRate}%`);

    // Initial health check
    this.checkWebhookHealth();

    // Schedule regular checks
    const intervalId = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(intervalId);
        return;
      }

      await this.checkWebhookHealth();

      // Check delivery stats every 10 minutes
      if (Date.now() % (10 * 60 * 1000) < this.alertThresholds.checkInterval) {
        const stats = await this.checkWebhookDeliveryStats();
        if (stats && stats.success_rate < this.alertThresholds.successRate) {
          await this.sendAlert(
            "success_rate_low",
            `⚠️ Webhook success rate ${stats.success_rate.toFixed(1)}% below ${this.alertThresholds.successRate}% threshold`,
            "warning",
          );
        }
      }
    }, this.alertThresholds.checkInterval);

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      this.log("Received SIGINT, stopping monitoring...");
      this.isRunning = false;
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      this.log("Received SIGTERM, stopping monitoring...");
      this.isRunning = false;
      process.exit(0);
    });
  }
}

// CLI handling
async function main() {
  const monitor = new WebhookMonitor();
  const args = process.argv.slice(2);

  if (args.includes("--report")) {
    await monitor.generateDailyReport();
  } else if (args.includes("--test")) {
    const success = await monitor.runSingleCheck();
    process.exit(success ? 0 : 1);
  } else {
    monitor.startMonitoring();
  }
}

// Start monitoring if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { WebhookMonitor };
