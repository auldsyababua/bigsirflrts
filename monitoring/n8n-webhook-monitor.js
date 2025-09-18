// Enhanced n8n Webhook Monitor for FLRTS Story 1.7
// Collects metrics from n8n webhooks following best practices from .bmad-core/references/n8n-best-practices.md

import express from "express";
import winston from "winston";
import { randomUUID } from "node:crypto";

const app = express();
const PORT = process.env.N8N_MONITOR_PORT || 3002;

// Winston logger for structured logging
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/n8n-metrics.log" }),
  ],
});

// In-memory metrics storage (replace with proper metrics store in production)
const metrics = {
  workflows: new Map(),
  executions: new Map(),
  errors: [],
  totalRequests: 0,
  totalErrors: 0,
  responseTimes: [],
};

app.use(express.json());

// Middleware to log all requests
app.use((req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    logger.info("Request processed", {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
    });
  });

  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "n8n-webhook-monitor",
    timestamp: new Date().toISOString(),
    metrics: {
      totalRequests: metrics.totalRequests,
      totalErrors: metrics.totalErrors,
      activeWorkflows: metrics.workflows.size,
    },
  });
});

// Main metrics collection endpoint for n8n workflows
app.post("/metrics/n8n", (req, res) => {
  try {
    const {
      workflow_id,
      workflow_name,
      execution_id,
      timestamp,
      success,
      duration_ms,
      items_count,
      error_message,
      node_types,
      trigger_type,
      environment,
      region,
    } = req.body;

    // Validate required fields
    if (!workflow_id || !execution_id) {
      return res.status(400).json({
        error: "Missing required fields: workflow_id, execution_id",
      });
    }

    // Update workflow metrics
    if (!metrics.workflows.has(workflow_id)) {
      metrics.workflows.set(workflow_id, {
        id: workflow_id,
        name: workflow_name,
        executions: 0,
        successes: 0,
        failures: 0,
        totalDuration: 0,
        avgDuration: 0,
        lastExecution: null,
        nodeTypes: node_types ? node_types.split(",") : [],
        triggerType: trigger_type,
        environment,
        region,
      });
    }

    const workflow = metrics.workflows.get(workflow_id);
    workflow.executions++;
    workflow.lastExecution = timestamp || new Date().toISOString();

    if (duration_ms) {
      workflow.totalDuration += parseInt(duration_ms);
      workflow.avgDuration = Math.round(
        workflow.totalDuration / workflow.executions,
      );
      metrics.responseTimes.push(parseInt(duration_ms));

      // Keep only last 1000 response times for performance
      if (metrics.responseTimes.length > 1000) {
        metrics.responseTimes = metrics.responseTimes.slice(-1000);
      }
    }

    if (success !== false) {
      workflow.successes++;
    } else {
      workflow.failures++;
      metrics.totalErrors++;
    }

    // Store execution details
    metrics.executions.set(execution_id, {
      id: execution_id,
      workflowId: workflow_id,
      timestamp: timestamp || new Date().toISOString(),
      success: success !== false,
      duration: duration_ms || 0,
      itemsCount: items_count || 0,
      errorMessage: error_message,
      environment,
      region,
    });

    // Keep only last 500 executions for memory management
    if (metrics.executions.size > 500) {
      const oldestKey = metrics.executions.keys().next().value;
      metrics.executions.delete(oldestKey);
    }

    metrics.totalRequests++;

    logger.info("n8n workflow execution recorded", {
      workflowId: workflow_id,
      executionId: execution_id,
      success: success !== false,
      duration: duration_ms,
      itemsCount: items_count,
    });

    res.json({
      success: true,
      message: "Metrics recorded",
      workflowId: workflow_id,
      executionId: execution_id,
    });
  } catch (error) {
    logger.error("Failed to process n8n metrics", { error: error.message });
    res.status(500).json({
      error: "Failed to process metrics",
      message: error.message,
    });
  }
});

// Error collection endpoint for failed n8n workflows
app.post("/metrics/n8n/errors", (req, res) => {
  try {
    const {
      workflow_id,
      workflow_name,
      execution_id,
      error_message,
      error_stack,
      failed_node,
      timestamp,
      environment,
    } = req.body;

    const errorRecord = {
      id: randomUUID(),
      workflowId: workflow_id,
      workflowName: workflow_name,
      executionId: execution_id,
      errorMessage: error_message,
      errorStack: error_stack,
      failedNode: failed_node,
      timestamp: timestamp || new Date().toISOString(),
      environment,
    };

    metrics.errors.push(errorRecord);

    // Keep only last 100 errors
    if (metrics.errors.length > 100) {
      metrics.errors = metrics.errors.slice(-100);
    }

    logger.error("n8n workflow error recorded", errorRecord);

    res.json({
      success: true,
      message: "Error recorded",
      errorId: errorRecord.id,
    });
  } catch (error) {
    logger.error("Failed to process n8n error", { error: error.message });
    res.status(500).json({
      error: "Failed to process error",
      message: error.message,
    });
  }
});

// Get workflow statistics
app.get("/metrics/n8n/workflows", (req, res) => {
  try {
    const workflowStats = Array.from(metrics.workflows.values()).map(
      (workflow) => ({
        ...workflow,
        successRate:
          workflow.executions > 0
            ? Math.round((workflow.successes / workflow.executions) * 100)
            : 0,
        errorRate:
          workflow.executions > 0
            ? Math.round((workflow.failures / workflow.executions) * 100)
            : 0,
      }),
    );

    res.json({
      success: true,
      workflows: workflowStats,
      summary: {
        totalWorkflows: metrics.workflows.size,
        totalExecutions: metrics.totalRequests,
        totalErrors: metrics.totalErrors,
        overallSuccessRate:
          metrics.totalRequests > 0
            ? Math.round(
                ((metrics.totalRequests - metrics.totalErrors) /
                  metrics.totalRequests) *
                  100,
              )
            : 0,
      },
    });
  } catch (error) {
    logger.error("Failed to get workflow metrics", { error: error.message });
    res.status(500).json({
      error: "Failed to get metrics",
      message: error.message,
    });
  }
});

// Get performance statistics
app.get("/metrics/n8n/performance", (req, res) => {
  try {
    if (metrics.responseTimes.length === 0) {
      return res.json({
        success: true,
        performance: {
          count: 0,
          avgResponseTime: 0,
          p50: 0,
          p95: 0,
          p99: 0,
        },
      });
    }

    const sorted = [...metrics.responseTimes].sort((a, b) => a - b);
    const count = sorted.length;

    const p50Index = Math.floor(count * 0.5);
    const p95Index = Math.floor(count * 0.95);
    const p99Index = Math.floor(count * 0.99);

    const performance = {
      count,
      avgResponseTime: Math.round(
        sorted.reduce((sum, time) => sum + time, 0) / count,
      ),
      p50: sorted[p50Index],
      p95: sorted[p95Index],
      p99: sorted[p99Index],
      min: sorted[0],
      max: sorted[count - 1],
    };

    res.json({
      success: true,
      performance,
    });
  } catch (error) {
    logger.error("Failed to get performance metrics", { error: error.message });
    res.status(500).json({
      error: "Failed to get performance metrics",
      message: error.message,
    });
  }
});

// Get recent errors
app.get("/metrics/n8n/errors", (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const recentErrors = metrics.errors.slice(-limit).reverse(); // Most recent first

    res.json({
      success: true,
      errors: recentErrors,
      totalErrors: metrics.errors.length,
    });
  } catch (error) {
    logger.error("Failed to get error metrics", { error: error.message });
    res.status(500).json({
      error: "Failed to get error metrics",
      message: error.message,
    });
  }
});

// Metrics export for Prometheus (simple text format)
app.get("/metrics", (req, res) => {
  try {
    const now = Date.now();
    let prometheus = "";

    // Total metrics
    prometheus += `# HELP n8n_total_requests Total number of n8n webhook requests\n`;
    prometheus += `# TYPE n8n_total_requests counter\n`;
    prometheus += `n8n_total_requests ${metrics.totalRequests} ${now}\n\n`;

    prometheus += `# HELP n8n_total_errors Total number of n8n workflow errors\n`;
    prometheus += `# TYPE n8n_total_errors counter\n`;
    prometheus += `n8n_total_errors ${metrics.totalErrors} ${now}\n\n`;

    prometheus += `# HELP n8n_active_workflows Number of active workflows\n`;
    prometheus += `# TYPE n8n_active_workflows gauge\n`;
    prometheus += `n8n_active_workflows ${metrics.workflows.size} ${now}\n\n`;

    // Per-workflow metrics
    metrics.workflows.forEach((workflow) => {
      const labels = `workflow_id="${workflow.id}",workflow_name="${workflow.name}",environment="${workflow.environment || "unknown"}"`;

      prometheus += `n8n_workflow_executions{${labels}} ${workflow.executions} ${now}\n`;
      prometheus += `n8n_workflow_successes{${labels}} ${workflow.successes} ${now}\n`;
      prometheus += `n8n_workflow_failures{${labels}} ${workflow.failures} ${now}\n`;
      prometheus += `n8n_workflow_avg_duration_ms{${labels}} ${workflow.avgDuration} ${now}\n`;
    });

    res.set("Content-Type", "text/plain");
    res.send(prometheus);
  } catch (error) {
    logger.error("Failed to generate Prometheus metrics", {
      error: error.message,
    });
    res.status(500).json({
      error: "Failed to generate metrics",
      message: error.message,
    });
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("Received SIGINT, shutting down gracefully");
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info("n8n Webhook Monitor started", {
    port: PORT,
    endpoints: {
      health: `http://localhost:${PORT}/health`,
      metrics: `http://localhost:${PORT}/metrics/n8n`,
      errors: `http://localhost:${PORT}/metrics/n8n/errors`,
      prometheus: `http://localhost:${PORT}/metrics`,
    },
  });
});
