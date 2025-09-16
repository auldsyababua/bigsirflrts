#!/usr/bin/env node

/**
 * Retry Tests Runner
 *
 * Runs the webhook retry and backoff tests with proper configuration.
 * Includes setup for mock servers and environment validation.
 *
 * Usage:
 *   npm run test:retry
 *   node tests/run-retry-tests.js
 *   op run --env-file=tests/.env.test -- node tests/run-retry-tests.js
 */

import { spawn } from 'child_process';
import { testConfig } from './config/test-config.js';
import { RetryTestSimulator } from './helpers/retry-test-simulator.js';

class RetryTestRunner {
  constructor() {
    this.simulator = null;
    this.testProcess = null;
  }

  validateEnvironment() {
    console.log('🔍 Validating environment for retry tests...');

    const required = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
    ];

    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
      console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
      console.error('💡 Run with: op run --env-file=tests/.env.test -- node tests/run-retry-tests.js');
      process.exit(1);
    }

    console.log('✅ Environment validation passed');

    // Display retry configuration
    console.log('\n📋 Retry Test Configuration:');
    console.log(`   Max Attempts: ${testConfig.test.retry.maxAttempts}`);
    console.log(`   Base Delay: ${testConfig.test.retry.baseDelayMs}ms`);
    console.log(`   Max Delay: ${testConfig.test.retry.maxDelayMs}ms`);
    console.log(`   Backoff Multiplier: ${testConfig.test.retry.backoffMultiplier}x`);
    console.log(`   Test Timeout: ${testConfig.test.retry.testTimeoutMs}ms`);
  }

  async startMockServer() {
    console.log('\n🎭 Starting mock webhook server for failure simulation...');

    this.simulator = new RetryTestSimulator();

    // Start with exponential backoff simulation by default
    this.simulator.shouldFail = true;
    this.simulator.circuitBreakerThreshold = 3;
    this.simulator.responseDelay = 100;

    return new Promise((resolve) => {
      const server = this.simulator.createMockWebhookServer(testConfig.test.retry.mockServer.port);

      server.on('listening', () => {
        console.log(`✅ Mock server ready on port ${testConfig.test.retry.mockServer.port}`);
        resolve();
      });
    });
  }

  async runRetryTests() {
    console.log('\n🧪 Running webhook retry and backoff tests...');

    return new Promise((resolve, reject) => {
      const testFile = 'tests/integration/supabase-webhook-retry-backoff.test.js';

      // Use the same Node.js test runner as other tests
      this.testProcess = spawn('node', ['--test', testFile], {
        stdio: 'inherit',
        env: {
          ...process.env,
          // Add mock server URLs to environment
          MOCK_FAILING_WEBHOOK_URL: testConfig.test.retry.mockServer.failingWebhookUrl,
          MOCK_SLOW_WEBHOOK_URL: testConfig.test.retry.mockServer.slowWebhookUrl,
        }
      });

      this.testProcess.on('close', (code) => {
        if (code === 0) {
          console.log('\n✅ Retry tests completed successfully');
          resolve();
        } else {
          console.log(`\n❌ Retry tests failed with exit code ${code}`);
          reject(new Error(`Tests failed with exit code ${code}`));
        }
      });

      this.testProcess.on('error', (error) => {
        console.error('\n❌ Failed to start retry tests:', error.message);
        reject(error);
      });
    });
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test environment...');

    if (this.testProcess) {
      this.testProcess.kill('SIGTERM');
    }

    if (this.simulator && this.simulator.mockServer) {
      await new Promise((resolve) => {
        this.simulator.mockServer.close(() => {
          console.log('✅ Mock server stopped');
          resolve();
        });
      });
    }
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      await this.cleanup();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  async run() {
    this.setupGracefulShutdown();

    try {
      this.validateEnvironment();
      await this.startMockServer();
      await this.runRetryTests();

      console.log('\n🎉 All retry tests completed successfully!');

    } catch (error) {
      console.error('\n💥 Retry test runner failed:', error.message);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }
}

// CLI options parsing
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    help: args.includes('--help') || args.includes('-h'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    scenario: args.find(arg => arg.startsWith('--scenario='))?.split('=')[1],
  };
}

function showHelp() {
  console.log(`
🧪 Webhook Retry Test Runner

Usage:
  node tests/run-retry-tests.js [options]
  npm run test:retry
  op run --env-file=tests/.env.test -- node tests/run-retry-tests.js

Options:
  --help, -h        Show this help message
  --verbose, -v     Enable verbose output
  --scenario=TYPE   Run specific scenario (exponential-backoff, circuit-breaker, recovery)

Environment:
  Requires SUPABASE_URL and SUPABASE_ANON_KEY to be set.
  Use 1Password Service Account for secure environment loading.

Examples:
  # Run all retry tests
  npm run test:retry

  # Run with 1Password environment
  op run --env-file=tests/.env.test -- node tests/run-retry-tests.js

  # Run specific scenario
  node tests/run-retry-tests.js --scenario=exponential-backoff
`);
}

// Main execution
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  console.log('🚀 Starting Webhook Retry Test Runner\n');

  const runner = new RetryTestRunner();
  await runner.run();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

export { RetryTestRunner };