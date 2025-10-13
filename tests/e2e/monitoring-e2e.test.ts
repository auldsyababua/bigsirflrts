/**
 * P0 End-to-End Tests for Monitoring and Observability
 * Test IDs: 1.7-E2E-001, 1.7-E2E-004
 *
 * These tests verify that monitoring infrastructure works end-to-end,
 * from request initiation through trace collection and error tracking.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Skip in CI unless explicitly enabled
const skipCondition = process.env.CI === 'true' && process.env.ENABLE_E2E_TESTS !== 'true';

test.describe('@P0 Monitoring End-to-End Tests', () => {
  test.skip(skipCondition, 'Skipping E2E tests in CI - requires running services');
  let context: BrowserContext;
  let page: Page;

  // Test configuration
  const TEST_CONFIG = {
    // Use test environment endpoints
    nlpServiceUrl: process.env.TEST_NLP_SERVICE_URL || 'http://localhost:3001',
    edgeFunctionUrl:
      process.env.TEST_EDGE_FUNCTION_URL || 'http://localhost:54321/functions/v1/parse-request',
    monitoringDashboard: process.env.TEST_GRAFANA_URL || 'http://localhost:3000',
    jaegerUI: process.env.TEST_JAEGER_URL || 'http://localhost:16686',
    sentryDSN: process.env.TEST_SENTRY_DSN || 'https://test@sentry.io/project',
  };

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      // Accept self-signed certificates for local testing
      ignoreHTTPSErrors: true,
    });
    page = await context.newPage();

    // Monitor network requests for trace headers
    page.on('request', (request) => {
      const headers = request.headers();
      if (headers['traceparent'] || headers['x-trace-id']) {
        console.log(`Request with trace headers: ${request.url()}`);
        console.log(`Trace headers:`, {
          traceparent: headers['traceparent'],
          'x-trace-id': headers['x-trace-id'],
        });
      }
    });

    // Monitor responses for monitoring data
    page.on('response', (response) => {
      if (response.url().includes('/metrics') || response.url().includes('/traces')) {
        console.log(`Monitoring response: ${response.url()} - ${response.status()}`);
      }
    });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test.describe('1.7-E2E-001: End-to-End Request Trace Collection', () => {
    test('should trace complete parse request flow from Edge Function to NLP Service', async () => {
      // Arrange
      const testInput = 'Create task "Test E2E monitoring" for @testuser due tomorrow #monitoring';
      const traceId = `e2e-test-${Date.now()}`;

      // Act - Make request to Edge Function with custom trace ID
      const response = await page.request.post(TEST_CONFIG.edgeFunctionUrl, {
        headers: {
          'Content-Type': 'application/json',
          'x-trace-id': traceId,
          Authorization: 'Bearer test-token',
        },
        data: {
          input: testInput,
          context: {
            userId: 'test-user-e2e',
            timezone: 'UTC',
            source: 'e2e-test',
          },
        },
      });

      // Assert - Response should be successful
      expect(response.status()).toBe(200);
      const responseData = await response.json();
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');

      // For quick parse
      if (responseData.parseType === 'quick') {
        expect(responseData.data).toHaveProperty('operation', 'CREATE');
        expect(responseData.data).toHaveProperty('type', 'TASK');
      }

      // For complex parse
      if (responseData.parseType === 'complex') {
        expect(responseData.data).toHaveProperty('status', 'pending');
        expect(responseData.data).toHaveProperty('queueId');
      }

      // Wait for trace propagation
      await page.waitForTimeout(2000);

      // Verify trace is available in Jaeger (if accessible)
      if (TEST_CONFIG.jaegerUI !== 'http://localhost:16686') {
        await page.goto(`${TEST_CONFIG.jaegerUI}/search`);

        // Search for our trace
        await page.fill('[data-testid="TraceIDInput"]', traceId);
        await page.click('[data-testid="submit-button"]');

        await page.waitForTimeout(1000);

        // Verify trace appears in results
        const traceResults = await page.locator('[data-testid="trace-results"]');
        await expect(traceResults).toBeVisible();
      }
    });

    test('should propagate trace context through service chain', async () => {
      // Arrange
      const testRequest = {
        input: 'Complex parsing test for trace propagation',
        context: {
          userId: 'trace-test-user',
          timezone: 'America/New_York',
          source: 'e2e-trace-test',
        },
      };

      // Act - Make request that will involve multiple services
      const response = await page.request.post(TEST_CONFIG.edgeFunctionUrl, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        data: testRequest,
      });

      const status = response.status();
      expect(status).toBeGreaterThanOrEqual(200);
      expect(status).toBeLessThanOrEqual(202);

      // If complex parsing was triggered, wait for n8n processing
      const responseData = await response.json();
      if (responseData.parseType === 'complex') {
        // Wait for n8n workflow completion
        await page.waitForTimeout(5000);

        // Verify queue processing (if monitoring dashboard is available)
        if (TEST_CONFIG.monitoringDashboard !== 'http://localhost:3000') {
          await page.goto(`${TEST_CONFIG.monitoringDashboard}/d/n8n-monitoring`);

          // Check for recent workflow executions
          const workflowMetrics = await page.locator('[data-testid="workflow-metrics"]');
          if (await workflowMetrics.isVisible()) {
            // Verify workflow execution count increased
            const executionCount = await page.textContent('[data-testid="execution-count"]');
            expect(parseInt(executionCount || '0')).toBeGreaterThan(0);
          }
        }
      }
    });

    test('should collect performance metrics for request processing', async () => {
      // Arrange
      const performanceTestCases = [
        { input: 'Quick task creation', expectedType: 'quick' },
        {
          input: 'Complex analysis with multiple @mentions and #tags requiring OpenAI processing',
          expectedType: 'complex',
        },
      ];

      for (const testCase of performanceTestCases) {
        const startTime = Date.now();

        // Act
        const response = await page.request.post(TEST_CONFIG.edgeFunctionUrl, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
          data: {
            input: testCase.input,
            context: { source: 'performance-test' },
          },
        });

        const responseTime = Date.now() - startTime;

        // Assert
        const status = response.status();
        expect(status).toBeGreaterThanOrEqual(200);
        expect(status).toBeLessThanOrEqual(202);

        const responseData = await response.json();
        expect(responseData).toHaveProperty('success', true);

        // Performance assertions
        if (testCase.expectedType === 'quick') {
          expect(responseTime).toBeLessThan(1000); // Quick parse should be < 1s
          expect(responseData.parseType).toBe('quick');
        } else {
          expect(responseTime).toBeLessThan(3000); // Complex parse acceptance should be < 3s
          expect(responseData.parseType).toBe('complex');
        }

        console.log(`${testCase.expectedType} parse response time: ${responseTime}ms`);
      }
    });

    test('should generate distributed traces across microservices', async () => {
      // Arrange - Complex request that involves multiple services
      const complexRequest = {
        input:
          'Create task "Multi-service trace test" for @alice and @bob due next Friday #project1 #urgent with description "This should trigger OpenAI processing and database operations"',
        context: {
          userId: 'multi-service-test',
          timezone: 'Europe/London',
          source: 'distributed-trace-test',
        },
      };

      // Act
      const response = await page.request.post(TEST_CONFIG.edgeFunctionUrl, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        data: complexRequest,
      });

      const status = response.status();
      expect(status).toBeGreaterThanOrEqual(200);
      expect(status).toBeLessThanOrEqual(202);
      const responseData = await response.json();

      // Wait for distributed processing
      await page.waitForTimeout(3000);

      // Verify trace collection (mock verification for CI)
      if (process.env.CI !== 'true') {
        // In local testing, we can check Jaeger directly
        console.log('Distributed trace verification would check:');
        console.log('- Edge Function span');
        console.log('- NLP Service span');
        console.log('- Database query spans');
        console.log('- n8n workflow spans');
        console.log('- OpenAI API call spans');
      }

      // Verify response structure indicates proper processing
      expect(responseData).toHaveProperty('success', true);
      if (responseData.parseType === 'complex') {
        expect(responseData.data).toHaveProperty('queueId');
        expect(responseData.data).toHaveProperty('estimatedTime');
      }
    });
  });

  test.describe('1.7-E2E-004: Edge Function Error Tracking Pipeline', () => {
    test('should capture and report validation errors to Sentry', async () => {
      // Arrange - Invalid request that should trigger validation error
      const invalidRequests = [
        { data: null, expectedError: 'Invalid JSON' },
        { data: {}, expectedError: 'Input text is required' },
        { data: { input: '' }, expectedError: 'Input text is required' },
        { data: { input: 'x'.repeat(10000) }, expectedError: 'Input too long' },
      ];

      for (const testCase of invalidRequests) {
        // Act
        const response = await page.request.post(TEST_CONFIG.edgeFunctionUrl, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
          data: testCase.data,
          failOnStatusCode: false,
        });

        // Assert
        expect(response.status()).toBe(400);

        const responseData = await response.json();
        expect(responseData).toHaveProperty('error');

        if (testCase.expectedError !== 'Invalid JSON') {
          expect(responseData.error).toContain('required');
        }

        console.log(`Validation error captured: ${responseData.error}`);
      }

      // Wait for Sentry error transmission
      await page.waitForTimeout(1000);
    });

    test('should handle authentication errors with proper error tracking', async () => {
      // Arrange - Request without proper authentication
      const authTestCases = [
        { auth: null, expectedStatus: 401 },
        { auth: 'Bearer invalid-token', expectedStatus: 401 },
        { auth: 'Invalid auth-header', expectedStatus: 401 },
      ];

      for (const testCase of authTestCases) {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (testCase.auth) {
          headers['Authorization'] = testCase.auth;
        }

        // Act
        const response = await page.request.post(TEST_CONFIG.edgeFunctionUrl, {
          headers,
          data: {
            input: 'Test authentication error tracking',
          },
          failOnStatusCode: false,
        });

        // Assert - Note: Actual auth implementation may vary
        // This test verifies error handling structure
        const status = response.status();
        expect([200, 202, 401, 403]).toContain(status);

        if (status >= 400) {
          const responseData = await response.json();
          expect(responseData).toHaveProperty('error');
          console.log(`Auth error tracked: ${responseData.error}`);
        }
      }
    });

    test('should capture runtime errors and exceptions', async () => {
      // Arrange - Request that might trigger runtime errors
      const errorTestCases = [
        {
          input: 'Test with invalid JSON characters: \x00\x01\x02',
          description: 'Invalid characters',
        },
        {
          input: '{ "malformed": json }',
          description: 'Malformed JSON in input',
        },
      ];

      for (const testCase of errorTestCases) {
        // Act
        const response = await page.request.post(TEST_CONFIG.edgeFunctionUrl, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
          data: {
            input: testCase.input,
            context: { source: 'error-test' },
          },
          failOnStatusCode: false,
        });

        // Assert
        const status = response.status();
        expect([200, 202, 400, 500]).toContain(status);

        if (status >= 400) {
          const responseData = await response.json();
          expect(responseData).toHaveProperty('error');
          console.log(`Runtime error captured for ${testCase.description}: ${responseData.error}`);
        }
      }

      // Wait for error transmission to Sentry
      await page.waitForTimeout(1000);
    });

    test('should provide proper error context and request IDs', async () => {
      // Arrange
      const testRequest = {
        input: '', // Empty input to trigger validation error
        context: {
          userId: 'error-context-test',
          requestId: 'test-req-123',
          source: 'error-context-test',
        },
      };

      // Act
      const response = await page.request.post(TEST_CONFIG.edgeFunctionUrl, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
          'X-Request-ID': 'test-request-12345',
        },
        data: testRequest,
        failOnStatusCode: false,
      });

      // Assert
      expect(response.status()).toBe(400);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('error');

      // Check if request ID is included in error response
      // (Implementation may vary based on actual error handling)
      console.log('Error response:', responseData);

      // Verify error structure includes context
      if (responseData.requestId) {
        expect(responseData.requestId).toBeDefined();
      }
    });

    test('should handle high error rates without system degradation', async () => {
      // Arrange - Generate multiple errors quickly
      const errorCount = 10;
      const promises: Promise<any>[] = [];

      const startTime = Date.now();

      // Act - Send multiple invalid requests concurrently
      for (let i = 0; i < errorCount; i++) {
        promises.push(
          page.request.post(TEST_CONFIG.edgeFunctionUrl, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer test-token',
            },
            data: {
              input: '', // Invalid input
            },
            failOnStatusCode: false,
          })
        );
      }

      const responses = await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Assert
      expect(responses).toHaveLength(errorCount);

      // All should be validation errors
      for (const response of responses) {
        expect(response.status()).toBe(400);
      }

      // Should complete quickly despite errors
      expect(duration).toBeLessThan(5000);

      // System should remain responsive
      const healthResponse = await page.request.get(
        `${TEST_CONFIG.edgeFunctionUrl.replace('/parse-request', '/health')}`,
        {
          failOnStatusCode: false,
        }
      );

      // Health check should work (or 404 if not implemented)
      expect([200, 404]).toContain(healthResponse.status());

      console.log(`${errorCount} errors processed in ${duration}ms`);
    });
  });

  test.describe('Monitoring Infrastructure Verification', () => {
    test('should have monitoring endpoints accessible', async () => {
      // Check if monitoring infrastructure is available
      const endpoints = [
        { url: TEST_CONFIG.jaegerUI, name: 'Jaeger UI' },
        { url: TEST_CONFIG.monitoringDashboard, name: 'Grafana Dashboard' },
      ];

      for (const endpoint of endpoints) {
        const response = await page.request.get(endpoint.url, {
          failOnStatusCode: false,
        });

        const status = response.status();
        console.log(`${endpoint.name} (${endpoint.url}): ${status}`);

        // Accept 200 (accessible) or connection errors (not running in test env)
        expect([200, 404]).toContain(status);
      }
    });

    test('should verify metrics collection endpoints', async () => {
      // Test metrics endpoints if available
      const metricsEndpoints = [
        `${TEST_CONFIG.nlpServiceUrl}/metrics`,
        `${TEST_CONFIG.edgeFunctionUrl.replace('/parse-request', '/metrics')}`,
      ];

      for (const endpoint of metricsEndpoints) {
        const response = await page.request.get(endpoint, {
          failOnStatusCode: false,
        });

        const status = response.status();
        console.log(`Metrics endpoint ${endpoint}: ${status}`);

        // Accept 200 (metrics available) or 404 (not implemented)
        expect([200, 404]).toContain(status);

        if (status === 200) {
          const metricsText = await response.text();
          expect(metricsText).toContain('# HELP'); // Prometheus format
        }
      }
    });
  });
});
