/**
 * Vitest Configuration for Monitoring Tests
 * Specialized configuration for P0 monitoring and observability tests
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test file patterns for monitoring tests
    include: [
      'tests/unit/*monitoring*.test.ts',
      'tests/unit/*telemetry*.test.ts',
      'tests/unit/*sentry*.test.ts',
      'tests/integration/*monitoring*.test.ts',
      'tests/integration/*tracing*.test.ts',
      'tests/integration/*database*.test.ts'
    ],

    // Exclude files that are not monitoring-related
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**'
    ],

    // Test environment configuration
    environment: 'node',

    // Global setup for monitoring infrastructure
    globalSetup: ['tests/config/monitoring-test-setup.ts'],

    // Test timeout for integration tests (monitoring services can be slow)
    testTimeout: 30000,

    // Hook timeout for setup/teardown
    hookTimeout: 60000,

    // Number of concurrent test files (lower for resource-intensive monitoring tests)
    maxConcurrency: 2,

    // Retry configuration for flaky monitoring tests
    retry: {
      // Retry integration tests that might fail due to timing
      'tests/integration/**': 2
    },

    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
      TEST_OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4318',
      TEST_JAEGER_URL: 'http://localhost:16686',
      TEST_PROMETHEUS_URL: 'http://localhost:9090',
      TEST_GRAFANA_URL: 'http://localhost:3000',
      TEST_DATABASE_URL: 'postgresql://postgres:password@localhost:5433/flrts_test',
      TEST_SENTRY_DSN: 'https://test@sentry.io/project',
      OTEL_RESOURCE_ATTRIBUTES: 'service.name=flrts-test,service.version=test'
    },

    // Reporter configuration
    reporters: [
      'default',
      ['junit', { outputFile: 'test-results/monitoring-tests.xml' }],
      ['json', { outputFile: 'test-results/monitoring-results.json' }]
    ],

    // Coverage configuration
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'coverage/monitoring',
      include: [
        'packages/nlp-service/instrumentation.ts',
        'packages/nlp-service/src/logger.ts',
        'supabase/functions/parse-request/sentry-index.ts',
        'monitoring/**/*.js'
      ],
      exclude: [
        '**/node_modules/**',
        '**/test/**',
        '**/tests/**',
        '**/*.test.ts',
        '**/*.spec.ts'
      ],
      // Minimum coverage thresholds for monitoring code
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80
      }
    },

    // Setup files to run before each test
    setupFiles: [
      'tests/setup.ts'
    ]
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@tests': path.resolve(__dirname, './tests'),
      '@monitoring': path.resolve(__dirname, './monitoring')
    }
  },

  // Define test-specific constants
  define: {
    __TEST_MODE__: true,
    __MONITORING_TESTS__: true
  }
});