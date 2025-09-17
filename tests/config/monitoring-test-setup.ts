/**
 * Test Environment Setup for Monitoring Infrastructure
 * This file configures the test environment for P0 monitoring tests.
 * NOTE: Any Postgres service used here is test-only and ephemeral for monitoring tests.
 *       Production uses a single Supabase PostgreSQL instance (no local Postgres containers).
 */

import { beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

// Test infrastructure processes
let dockerComposeProcess: ChildProcess | null = null;
let testServices: ChildProcess[] = [];

export interface TestEnvironmentConfig {
  otlpEndpoint: string;
  jaegerUI: string;
  prometheusEndpoint: string;
  grafanaEndpoint: string;
  testDatabaseUrl: string;
  sentryDSN: string;
}

export const TEST_CONFIG: TestEnvironmentConfig = {
  otlpEndpoint: process.env.TEST_OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
  jaegerUI: process.env.TEST_JAEGER_URL || 'http://localhost:16686',
  prometheusEndpoint: process.env.TEST_PROMETHEUS_URL || 'http://localhost:9090',
  grafanaEndpoint: process.env.TEST_GRAFANA_URL || 'http://localhost:3000',
  testDatabaseUrl: process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/flrts_test',
  sentryDSN: process.env.TEST_SENTRY_DSN || 'https://test@sentry.io/project'
};

/**
 * Setup monitoring infrastructure for testing
 */
export async function setupMonitoringInfrastructure(): Promise<void> {
  console.log('Setting up monitoring infrastructure for tests...');

  try {
    // Check if Docker is available
    const dockerAvailable = await checkDockerAvailability();
    if (!dockerAvailable) {
      console.warn('Docker not available, skipping infrastructure setup');
      return;
    }

    // Create test-specific docker-compose file
    await createTestDockerCompose();

    // Start monitoring infrastructure
    await startMonitoringServices();

    // Wait for services to be ready
    await waitForServicesReady();

    console.log('Monitoring infrastructure setup complete');
  } catch (error) {
    console.error('Failed to setup monitoring infrastructure:', error);
    // Don't fail tests if infrastructure setup fails
  }
}

/**
 * Cleanup monitoring infrastructure after tests
 */
export async function teardownMonitoringInfrastructure(): Promise<void> {
  console.log('Tearing down monitoring infrastructure...');

  try {
    // Stop test services
    for (const service of testServices) {
      if (!service.killed) {
        service.kill();
      }
    }

    // Stop docker compose services
    if (dockerComposeProcess && !dockerComposeProcess.killed) {
      dockerComposeProcess.kill();
    }

    // Clean up with docker-compose down
    await new Promise<void>((resolve) => {
      const cleanup = spawn('docker-compose', ['-f', 'tests/config/docker-compose.test.yml', 'down', '-v'], {
        stdio: 'inherit'
      });

      cleanup.on('close', () => {
        resolve();
      });

      cleanup.on('error', () => {
        // Ignore cleanup errors
        resolve();
      });

      // Force cleanup after 10 seconds
      setTimeout(() => {
        cleanup.kill();
        resolve();
      }, 10000);
    });

    console.log('Monitoring infrastructure teardown complete');
  } catch (error) {
    console.error('Error during teardown:', error);
  }
}

async function checkDockerAvailability(): Promise<boolean> {
  return new Promise((resolve) => {
    const docker = spawn('docker', ['--version'], { stdio: 'pipe' });

    docker.on('close', (code) => {
      resolve(code === 0);
    });

    docker.on('error', () => {
      resolve(false);
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      docker.kill();
      resolve(false);
    }, 5000);
  });
}

async function createTestDockerCompose(): Promise<void> {
  const dockerComposeContent = `
version: '3.8'

services:
  # Jaeger for distributed tracing
  jaeger:
    image: jaegertracing/all-in-one:1.50
    container_name: jaeger-test
    ports:
      - "16686:16686"  # Jaeger UI
      - "14268:14268"  # Jaeger collector HTTP
      - "4317:4317"    # OTLP gRPC
      - "4318:4318"    # OTLP HTTP
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    networks:
      - monitoring-test

  # Prometheus for metrics collection
  prometheus:
    image: prom/prometheus:v2.47.0
    container_name: prometheus-test
    ports:
      - "9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    volumes:
      - ./prometheus-test.yml:/etc/prometheus/prometheus.yml
    networks:
      - monitoring-test

  # Grafana for visualization
  grafana:
    image: grafana/grafana:10.1.0
    container_name: grafana-test
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-test-data:/var/lib/grafana
    networks:
      - monitoring-test

  # PostgreSQL for database monitoring tests
  postgres-test:
    image: postgres:15
    container_name: postgres-test
    ports:
      - "5433:5432"  # Use different port to avoid conflicts
    environment:
      - POSTGRES_DB=flrts_test
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres-test-data:/var/lib/postgresql/data
      - ./init-monitoring.sql:/docker-entrypoint-initdb.d/init-monitoring.sql
    networks:
      - monitoring-test

networks:
  monitoring-test:
    driver: bridge

volumes:
  grafana-test-data:
  postgres-test-data:
`;

  const configDir = path.join(process.cwd(), 'tests', 'config');
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(path.join(configDir, 'docker-compose.test.yml'), dockerComposeContent);

  // Create Prometheus test configuration
  const prometheusConfig = `
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'test-services'
    static_configs:
      - targets: ['host.docker.internal:3001']  # NLP service
`;

  await fs.writeFile(path.join(configDir, 'prometheus-test.yml'), prometheusConfig);

  // Create PostgreSQL monitoring setup script
  const postgresInitScript = `
-- Enable pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create monitoring schema
CREATE SCHEMA IF NOT EXISTS monitoring;

-- Create monitoring views (simplified for testing)
CREATE OR REPLACE VIEW monitoring.active_connections AS
SELECT
  datname as database_name,
  usename as username,
  application_name,
  client_addr,
  state,
  query_start,
  state_change,
  query
FROM pg_stat_activity
WHERE state != 'idle';

CREATE OR REPLACE VIEW monitoring.slow_queries AS
SELECT
  query as query_text,
  total_exec_time,
  mean_exec_time,
  calls,
  100.0 * total_exec_time / sum(total_exec_time) OVER() AS percentage_of_total_time
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- Queries slower than 100ms
ORDER BY mean_exec_time DESC;

CREATE OR REPLACE VIEW monitoring.table_stats AS
SELECT
  schemaname as schema_name,
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size,
  pg_total_relation_size(relid) / 1024.0 / 1024.0 as total_size_mb,
  pg_relation_size(relid) / 1024.0 / 1024.0 as table_size_mb,
  (pg_total_relation_size(relid) - pg_relation_size(relid)) / 1024.0 / 1024.0 as index_size_mb,
  seq_scan as seq_scans,
  idx_scan as idx_scans,
  n_tup_ins,
  n_tup_upd,
  n_tup_del
FROM pg_stat_user_tables;

CREATE OR REPLACE VIEW monitoring.performance_summary AS
SELECT 'active_connections' as metric_name,
       count(*)::text as metric_value,
       'count' as unit,
       'Number of active database connections' as description
FROM monitoring.active_connections
UNION ALL
SELECT 'cache_hit_ratio' as metric_name,
       ROUND(100.0 * sum(blks_hit) / NULLIF(sum(blks_hit) + sum(blks_read), 0), 2)::text as metric_value,
       'percentage' as unit,
       'Database cache hit ratio' as description
FROM pg_stat_database
WHERE datname = current_database()
UNION ALL
SELECT 'total_queries' as metric_name,
       sum(calls)::text as metric_value,
       'count' as unit,
       'Total number of queries executed' as description
FROM pg_stat_statements
UNION ALL
SELECT 'slow_queries_count' as metric_name,
       count(*)::text as metric_value,
       'count' as unit,
       'Number of slow queries (>100ms)' as description
FROM monitoring.slow_queries
UNION ALL
SELECT 'database_size_mb' as metric_name,
       ROUND(pg_database_size(current_database()) / 1024.0 / 1024.0, 2)::text as metric_value,
       'megabytes' as unit,
       'Total database size in MB' as description;
`;

  await fs.writeFile(path.join(configDir, 'init-monitoring.sql'), postgresInitScript);
}

async function startMonitoringServices(): Promise<void> {
  return new Promise((resolve, reject) => {
    const configDir = path.join(process.cwd(), 'tests', 'config');

    dockerComposeProcess = spawn('docker-compose', ['-f', 'docker-compose.test.yml', 'up', '-d'], {
      cwd: configDir,
      stdio: 'inherit'
    });

    dockerComposeProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Docker compose exited with code ${code}`));
      }
    });

    dockerComposeProcess.on('error', (error) => {
      reject(error);
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      reject(new Error('Docker compose startup timeout'));
    }, 120000);
  });
}

async function waitForServicesReady(): Promise<void> {
  const services = [
    { name: 'Jaeger', url: TEST_CONFIG.jaegerUI },
    { name: 'Prometheus', url: TEST_CONFIG.prometheusEndpoint },
    { name: 'Grafana', url: TEST_CONFIG.grafanaEndpoint }
  ];

  console.log('Waiting for services to be ready...');

  for (const service of services) {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(service.url, {
          method: 'GET',
          signal: AbortSignal.timeout(2000)
        });

        if (response.ok) {
          console.log(`✓ ${service.name} is ready`);
          break;
        }
      } catch (error) {
        // Service not ready yet
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (attempts === maxAttempts) {
        console.warn(`⚠ ${service.name} not ready after ${maxAttempts} seconds`);
      }
    }
  }
}

/**
 * Global test setup for monitoring tests
 */
export function setupMonitoringTests() {
  beforeAll(async () => {
    // Only setup infrastructure in CI or when explicitly requested
    if (process.env.CI === 'true' || process.env.SETUP_TEST_INFRASTRUCTURE === 'true') {
      await setupMonitoringInfrastructure();
    }
  }, 180000); // 3 minute timeout for infrastructure setup

  afterAll(async () => {
    if (process.env.CI === 'true' || process.env.SETUP_TEST_INFRASTRUCTURE === 'true') {
      await teardownMonitoringInfrastructure();
    }
  }, 60000); // 1 minute timeout for cleanup
}
