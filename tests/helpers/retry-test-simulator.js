/**
 * Retry Test Simulator for Webhook Integration
 *
 * This utility helps simulate various failure scenarios for testing
 * the webhook retry mechanisms and exponential backoff behavior.
 *
 * Usage:
 *   node tests/helpers/retry-test-simulator.js --scenario=exponential-backoff
 *   node tests/helpers/retry-test-simulator.js --scenario=circuit-breaker
 *   node tests/helpers/retry-test-simulator.js --scenario=recovery
 */

import { testConfig } from '../config/test-config.js';
import http from 'http';

class RetryTestSimulator {
  constructor() {
    this.mockServer = null;
    this.requestLog = [];
    this.failureCount = 0;
    this.responseDelay = 0;
    this.shouldFail = false;
    this.circuitBreakerThreshold = 3;
  }

  // Mock webhook server that can simulate various failure scenarios
  createMockWebhookServer(port = 3001) {
    this.mockServer = http.createServer((req, res) => {
      const timestamp = new Date().toISOString();
      const requestInfo = {
        timestamp,
        method: req.method,
        url: req.url,
        headers: req.headers,
        attempt: this.requestLog.length + 1,
      };

      this.requestLog.push(requestInfo);

      // Simulate response delay
      setTimeout(() => {
        if (this.shouldFail && this.failureCount < this.circuitBreakerThreshold) {
          this.failureCount++;
          console.log(
            `[${timestamp}] Simulating failure ${this.failureCount}/${this.circuitBreakerThreshold}`
          );

          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error: 'Simulated webhook failure',
              attempt: requestInfo.attempt,
              timestamp,
            })
          );
        } else {
          // Success response
          console.log(`[${timestamp}] Responding with success (attempt ${requestInfo.attempt})`);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              status: 'success',
              message: 'Mock webhook received',
              attempt: requestInfo.attempt,
              timestamp,
              recovered: this.failureCount > 0,
            })
          );
        }
      }, this.responseDelay);
    });

    this.mockServer.listen(port, () => {
      console.log(`🎭 Mock webhook server running on http://localhost:${port}`);
      console.log(`   Failure mode: ${this.shouldFail ? 'ENABLED' : 'DISABLED'}`);
      console.log(`   Response delay: ${this.responseDelay}ms`);
    });

    return this.mockServer;
  }

  // Simulate exponential backoff failure scenario
  simulateExponentialBackoff() {
    console.log('\n🔄 Simulating Exponential Backoff Scenario');
    this.shouldFail = true;
    this.circuitBreakerThreshold = 4; // Allow 4 failures before success
    this.responseDelay = 100; // Quick response to focus on retry timing

    this.createMockWebhookServer(3001);

    // Monitor retry patterns
    this.monitorRetryPatterns();
  }

  // Simulate circuit breaker behavior
  simulateCircuitBreaker() {
    console.log('\n⚡ Simulating Circuit Breaker Scenario');
    this.shouldFail = true;
    this.circuitBreakerThreshold = 999; // Always fail to test circuit breaker
    this.responseDelay = 50;

    this.createMockWebhookServer(3001);

    // Monitor for circuit breaker activation
    setTimeout(() => {
      console.log('\n📊 Circuit Breaker Test Results:');
      console.log(`Total requests received: ${this.requestLog.length}`);
      console.log(`Expected: Retries should stop after maximum attempts`);

      if (this.requestLog.length <= 4) {
        // 1 initial + 3 retries
        console.log('✅ Circuit breaker working correctly');
      } else {
        console.log('❌ Circuit breaker may not be working - too many requests');
      }

      this.stopServer();
    }, 60000); // Check after 1 minute
  }

  // Simulate recovery after temporary failure
  simulateRecovery() {
    console.log('\n🔧 Simulating Recovery Scenario');
    this.shouldFail = true;
    this.circuitBreakerThreshold = 2; // Fail twice, then recover
    this.responseDelay = 200;

    this.createMockWebhookServer(3001);

    // Monitor recovery pattern
    this.monitorRecoveryPattern();
  }

  // Simulate slow response times (but not failures)
  simulateSlowResponse() {
    console.log('\n🐌 Simulating Slow Response Scenario');
    this.shouldFail = false;
    this.responseDelay = 5000; // 5 second delay

    this.createMockWebhookServer(3001);

    setTimeout(() => {
      console.log('\n📊 Slow Response Test Results:');
      console.log(`Requests with 5s delay: ${this.requestLog.length}`);
      console.log('Expected: Webhooks should handle slow responses without retries');
      this.stopServer();
    }, 30000);
  }

  // Monitor retry patterns for analysis
  monitorRetryPatterns() {
    const startTime = Date.now();
    let lastAttemptTime = startTime;

    const monitor = setInterval(() => {
      if (this.requestLog.length > 0) {
        const latestRequest = this.requestLog[this.requestLog.length - 1];
        const currentTime = new Date(latestRequest.timestamp).getTime();

        if (this.requestLog.length > 1) {
          const delay = currentTime - lastAttemptTime;
          const expectedDelay = this.calculateExpectedDelay(this.requestLog.length - 2);

          console.log(
            `⏱️  Attempt ${this.requestLog.length}: ${delay}ms delay (expected ~${expectedDelay}ms)`
          );
        }

        lastAttemptTime = currentTime;
      }

      // Stop monitoring after recovery or timeout
      if (!this.shouldFail || this.requestLog.length >= 5 || Date.now() - startTime > 120000) {
        clearInterval(monitor);
        this.analyzeRetryPattern();
      }
    }, 1000);
  }

  // Monitor recovery pattern
  monitorRecoveryPattern() {
    setTimeout(() => {
      console.log('\n📊 Recovery Test Results:');
      console.log(`Total attempts: ${this.requestLog.length}`);

      const lastRequest = this.requestLog[this.requestLog.length - 1];
      if (lastRequest && this.requestLog.length >= 3) {
        console.log('✅ Recovery pattern detected - system should have recovered after failures');
      } else {
        console.log('⚠️  Recovery pattern unclear - may need longer observation');
      }

      this.stopServer();
    }, 30000);
  }

  // Calculate expected delay for exponential backoff
  calculateExpectedDelay(attempt, baseDelay = 1000, multiplier = 2, maxDelay = 32000) {
    return Math.min(baseDelay * Math.pow(multiplier, attempt), maxDelay);
  }

  // Analyze retry pattern results
  analyzeRetryPattern() {
    console.log('\n📊 Retry Pattern Analysis:');
    console.log(`Total attempts logged: ${this.requestLog.length}`);

    if (this.requestLog.length >= 2) {
      const delays = [];
      for (let i = 1; i < this.requestLog.length; i++) {
        const current = new Date(this.requestLog[i].timestamp);
        const previous = new Date(this.requestLog[i - 1].timestamp);
        delays.push(current - previous);
      }

      console.log('Actual delays between attempts:');
      delays.forEach((delay, index) => {
        const expected = this.calculateExpectedDelay(index);
        const variance = (Math.abs(delay - expected) / expected) * 100;
        console.log(
          `  ${index + 1} → ${index + 2}: ${delay}ms (expected ~${expected}ms, variance: ${variance.toFixed(1)}%)`
        );
      });

      // Check if pattern follows exponential backoff
      let followsPattern = true;
      for (let i = 1; i < delays.length && i < 3; i++) {
        if (delays[i] < delays[i - 1] * 1.5) {
          // Allow some variance
          followsPattern = false;
          break;
        }
      }

      if (followsPattern) {
        console.log('✅ Exponential backoff pattern detected');
      } else {
        console.log('⚠️  Exponential backoff pattern unclear');
      }
    }

    this.stopServer();
  }

  // Send test webhook to trigger retry scenario
  async triggerWebhookTest(scenario = 'test') {
    const payload = {
      type: 'INSERT',
      table: 'tasks',
      schema: 'public',
      record: {
        id: `retry-test-${scenario}-${Date.now()}`,
        title: `Retry Test - ${scenario}`,
        status: 'open',
        priority: 'High',
        created_at: new Date().toISOString(),
      },
      old_record: null,
    };

    try {
      console.log(`🚀 Triggering webhook test for scenario: ${scenario}`);

      // This would normally trigger through Supabase database changes
      // For direct testing, we can call the webhook endpoint
      const webhookUrl = testConfig.n8n?.webhookUrl || process.env.N8N_WEBHOOK_URL;

      if (webhookUrl) {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        console.log(`Webhook response: ${response.status} ${response.statusText}`);
      } else {
        console.log('⚠️  N8N webhook URL not configured - simulating with mock server only');
      }
    } catch (error) {
      console.log(`Webhook trigger error: ${error.message}`);
    }
  }

  // Stop the mock server
  stopServer() {
    if (this.mockServer) {
      this.mockServer.close(() => {
        console.log('\n🛑 Mock server stopped');

        // Final summary
        console.log('\n📋 Test Summary:');
        console.log(`- Total requests: ${this.requestLog.length}`);
        console.log(`- Failures simulated: ${this.failureCount}`);
        console.log(
          `- Recovery achieved: ${!this.shouldFail || this.failureCount >= this.circuitBreakerThreshold}`
        );

        process.exit(0);
      });
    }
  }

  // Graceful shutdown
  setupGracefulShutdown() {
    process.on('SIGINT', () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      this.stopServer();
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      this.stopServer();
    });
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const scenario =
    args.find((arg) => arg.startsWith('--scenario='))?.split('=')[1] || 'exponential-backoff';
  const port = parseInt(args.find((arg) => arg.startsWith('--port='))?.split('=')[1]) || 3001;

  const simulator = new RetryTestSimulator();
  simulator.setupGracefulShutdown();

  console.log('🧪 Webhook Retry Test Simulator');
  console.log(`📋 Scenario: ${scenario}`);
  console.log(`🔌 Port: ${port}`);
  console.log('⏹️  Press Ctrl+C to stop\n');

  switch (scenario) {
    case 'exponential-backoff':
      simulator.simulateExponentialBackoff();
      // Trigger test after server starts
      setTimeout(() => simulator.triggerWebhookTest('exponential-backoff'), 2000);
      break;

    case 'circuit-breaker':
      simulator.simulateCircuitBreaker();
      setTimeout(() => simulator.triggerWebhookTest('circuit-breaker'), 2000);
      break;

    case 'recovery':
      simulator.simulateRecovery();
      setTimeout(() => simulator.triggerWebhookTest('recovery'), 2000);
      break;

    case 'slow-response':
      simulator.simulateSlowResponse();
      setTimeout(() => simulator.triggerWebhookTest('slow-response'), 2000);
      break;

    default:
      console.log(`❌ Unknown scenario: ${scenario}`);
      console.log(
        'Available scenarios: exponential-backoff, circuit-breaker, recovery, slow-response'
      );
      process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { RetryTestSimulator };
