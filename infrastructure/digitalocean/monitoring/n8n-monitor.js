import express from 'express';
import client from 'prom-client';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const app = express();
const port = process.env.N8N_MONITOR_PORT || 3002;
const n8nBaseUrl = process.env.N8N_BASE_URL || 'http://localhost:5678';
const logLevel = process.env.LOG_LEVEL || 'info';

// Prometheus metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Custom metrics
const n8nHealthGauge = new client.Gauge({
  name: 'n8n_health_status',
  help: 'n8n instance health status (1 = healthy, 0 = unhealthy)',
  registers: [register],
});

const webhookResponseTime = new client.Histogram({
  name: 'n8n_webhook_response_time_seconds',
  help: 'n8n webhook response time in seconds',
  buckets: [0.1, 0.5, 1.0, 2.0, 5.0],
  registers: [register],
});

// Logging utility
const log = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta,
  };

  console.log(JSON.stringify(logEntry));

  // Write to log file
  const logFile = path.join(
    '/app/logs',
    `n8n-monitor-${new Date().toISOString().split('T')[0]}.log`
  );
  fs.appendFile(logFile, JSON.stringify(logEntry) + '\n').catch(console.error);
};

// Health check for n8n instance
const checkN8nHealth = async () => {
  try {
    const startTime = Date.now();
    const response = await fetch(`${n8nBaseUrl}/healthz`, {
      timeout: 5000,
      headers: {
        'User-Agent': 'FLRTS-Monitor/1.0',
      },
    });

    const responseTime = (Date.now() - startTime) / 1000;
    webhookResponseTime.observe(responseTime);

    if (response.ok) {
      n8nHealthGauge.set(1);
      log('debug', 'n8n health check passed', {
        responseTime,
        status: response.status,
      });
      return true;
    } else {
      n8nHealthGauge.set(0);
      log('warn', 'n8n health check failed', {
        responseTime,
        status: response.status,
      });
      return false;
    }
  } catch (error) {
    n8nHealthGauge.set(0);
    log('error', 'n8n health check error', {
      error: error.message,
    });
    return false;
  }
};

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'n8n-monitor',
  });
});

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error.message);
  }
});

app.get('/status', async (req, res) => {
  const isHealthy = await checkN8nHealth();
  res.json({
    n8n_health: isHealthy,
    monitor_status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// Start monitoring loop
const startMonitoring = () => {
  log('info', 'Starting n8n monitoring service', {
    port,
    n8nBaseUrl,
    logLevel,
  });

  // Initial health check
  checkN8nHealth();

  // Regular health checks every 30 seconds
  setInterval(checkN8nHealth, 30000);
};

// Error handling
process.on('uncaughtException', (error) => {
  log('error', 'Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log('error', 'Unhandled rejection', { reason });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log('info', 'Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('info', 'Received SIGINT, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(port, () => {
  startMonitoring();
});

module.exports = app;
