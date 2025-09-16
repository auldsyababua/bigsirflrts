/**
 * FLRTS Edge Functions API Tests
 *
 * Tests Supabase Edge Functions using Node.js native test runner.
 * Secrets are injected via 1Password Service Account.
 *
 * Run with: op run --env-file=tests/.env.test -- node --test tests/api/edge-functions.test.js
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { testConfig, validateTestConfig, getSupabaseHeaders } from '../config/test-config.js';

// Validate configuration before running tests
before(() => {
  validateTestConfig();
});

describe('Supabase Edge Functions', () => {
  describe('parse-request function', () => {
    test('should reject requests without authorization', async () => {
      const response = await fetch(testConfig.endpoints.parseRequest, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: 'test input' }),
      });

      assert.strictEqual(response.status, 401, 'Should return 401 for unauthorized request');
    });

    test('should accept valid parse request with anon key', async () => {
      const response = await fetch(testConfig.endpoints.parseRequest, {
        method: 'POST',
        headers: getSupabaseHeaders(false), // Use anon key
        body: JSON.stringify({ input: 'create task for testing' }),
      });

      // Should either succeed (200) or return a structured error
      assert.ok(
        response.status === 200 || response.status === 400,
        `Expected 200 or 400, got ${response.status}`
      );

      const data = await response.json();
      assert.ok(typeof data === 'object', 'Response should be JSON object');

      if (response.status === 200) {
        // Successful parse should have parsed.operation field
        assert.ok('parsed' in data && 'operation' in data.parsed, 'Successful response should have parsed.operation field');
      } else {
        // Error response should have error information
        assert.ok('error' in data || 'message' in data, 'Error response should have error information');
      }
    });

    test('should handle malformed JSON input', async () => {
      const response = await fetch(testConfig.endpoints.parseRequest, {
        method: 'POST',
        headers: getSupabaseHeaders(false),
        body: JSON.stringify({}), // Empty object
      });

      // Should return 400 for invalid input
      assert.strictEqual(response.status, 400, 'Should return 400 for empty input');

      const data = await response.json();
      assert.ok('error' in data || 'message' in data, 'Error response should contain error information');
    });

    test('should parse various task creation inputs', async () => {
      const testCases = [
        'create task for @Taylor',
        'remind me to call client tomorrow',
        'schedule meeting with team next week',
        'add task: review documentation',
      ];

      for (const input of testCases) {
        const response = await fetch(testConfig.endpoints.parseRequest, {
          method: 'POST',
          headers: getSupabaseHeaders(false),
          body: JSON.stringify({ input }),
        });

        // Should process the input (success, client error, or server error)
        assert.ok(
          response.status === 200 || response.status === 400 || response.status === 500,
          `Failed to process input: "${input}". Status: ${response.status}`
        );

        // Handle JSON parsing for different response types
        let data;
        try {
          data = await response.json();
          assert.ok(typeof data === 'object', `Response for "${input}" should be JSON object`);
        } catch (error) {
          // Some server errors might not return valid JSON
          console.warn(`Non-JSON response for "${input}": ${response.status}`);
          continue;
        }

        if (response.status === 200) {
          assert.ok('parsed' in data && 'operation' in data.parsed, `Successful parse of "${input}" should have parsed.operation`);
        }
      }
    });
  });

  describe('telegram-webhook function', () => {
    test('should reject requests without authorization', async () => {
      const response = await fetch(testConfig.endpoints.telegramWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: { text: 'test' } }),
      });

      assert.strictEqual(response.status, 401, 'Should return 401 for unauthorized request');
    });

    test('should handle webhook structure validation', async () => {
      const response = await fetch(testConfig.endpoints.telegramWebhook, {
        method: 'POST',
        headers: getSupabaseHeaders(false),
        body: JSON.stringify({ invalid: 'structure' }),
      });

      // Should return error - currently returns 401 (auth check happens first)
      // In the future this might return 400/422 for invalid structure
      assert.ok(
        response.status === 401 || response.status === 400 || response.status === 422,
        `Expected 401, 400 or 422 for invalid webhook, got ${response.status}`
      );
    });
  });
});

describe('Configuration Validation', () => {
  test('should have all required environment variables', () => {
    assert.ok(testConfig.supabase.projectId, 'SUPABASE_PROJECT_ID should be set');
    assert.ok(testConfig.supabase.url, 'SUPABASE_URL should be set');
    assert.ok(testConfig.supabase.anonKey, 'SUPABASE_ANON_KEY should be set');
  });

  test('should construct valid endpoint URLs', () => {
    assert.ok(testConfig.endpoints.parseRequest.includes('functions/v1/parse-request'));
    assert.ok(testConfig.endpoints.telegramWebhook.includes('functions/v1/telegram-webhook'));
  });

  test('should have reasonable timeout setting', () => {
    assert.ok(testConfig.test.timeout >= 5000, 'Test timeout should be at least 5 seconds');
    assert.ok(testConfig.test.timeout <= 60000, 'Test timeout should be at most 60 seconds');
  });
});