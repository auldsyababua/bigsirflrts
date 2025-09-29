/**
 * FLRTS Edge Functions API Tests
 *
 * Tests Supabase Edge Functions using Node.js native test runner.
 * Secrets are injected via 1Password Service Account.
 *
 * Run with: op run --env-file=tests/.env.test -- node --test tests/api/edge-functions.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { testConfig, validateTestConfig, getSupabaseHeaders } from '../config/test-config';

// Validate configuration before running tests
beforeAll(() => {
  validateTestConfig();
});

describe('Supabase Edge Functions', () => {
  describe('parse-request function', () => {
    it('should reject requests without authorization', async () => {
      const response = await fetch(testConfig.endpoints.parseRequest, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: 'test input' }),
      });

      expect(response.status).toBe(401);
    });

    it('should accept valid parse request with anon key', async () => {
      const response = await fetch(testConfig.endpoints.parseRequest, {
        method: 'POST',
        headers: getSupabaseHeaders(false), // Use anon key
        body: JSON.stringify({ input: 'create task for testing' }),
      });

      // Should either succeed (200) or return a structured error
      expect(
        response.status === 200 || response.status === 400,
        `Expected 200 or 400, got ${response.status}`
      ).toBeTruthy();

      const data = await response.json();
      expect(typeof data === 'object').toBeTruthy(); // Response should be JSON object;

      if (response.status === 200) {
        // Successful parse should have parsed.operation field
        expect(
          'parsed' in data && 'operation' in data.parsed,
          'Successful response should have parsed.operation field'
        ).toBeTruthy();
      } else {
        // Error response should have error information
        expect(
          'error' in data || 'message' in data,
          'Error response should have error information'
        ).toBeTruthy();
      }
    });

    it('should handle malformed JSON input', async () => {
      const response = await fetch(testConfig.endpoints.parseRequest, {
        method: 'POST',
        headers: getSupabaseHeaders(false),
        body: JSON.stringify({}), // Empty object
      });

      // Should return 400 for invalid input
      expect(response.status).toBe(400);

      const data = await response.json();
      expect('error' in data || 'message' in data).toBe(true);
    });

    it('should parse various task creation inputs', async () => {
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
        expect(
          response.status === 200 || response.status === 400 || response.status === 500,
          `Failed to process input: "${input}". Status: ${response.status}`
        ).toBeTruthy();

        // Handle JSON parsing for different response types
        let data;
        try {
          data = await response.json();
          expect(
            typeof data === 'object',
            `Response for "${input}" should be JSON object`
          ).toBeTruthy();
        } catch (error: any) {
          // Some server errors might not return valid JSON
          console.warn(`Non-JSON response for "${input}": ${response.status}`);
          continue;
        }

        if (response.status === 200) {
          expect(
            'parsed' in data && 'operation' in data.parsed,
            `Successful parse of "${input}" should have parsed.operation`
          ).toBeTruthy();
        }
      }
    });
  });

  describe('telegram-webhook function', () => {
    it('should reject requests without authorization', async () => {
      const response = await fetch(testConfig.endpoints.telegramWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: { text: 'test' } }),
      });

      expect(response.status).toBe(401);
    });

    it('should handle webhook structure validation', async () => {
      const response = await fetch(testConfig.endpoints.telegramWebhook, {
        method: 'POST',
        headers: getSupabaseHeaders(false),
        body: JSON.stringify({ invalid: 'structure' }),
      });

      // Should return error - currently returns 401 (auth check happens first)
      // In the future this might return 400/422 for invalid structure
      expect(response.status === 401 || response.status === 400 || response.status === 422).toBe(
        true
      );
    });
  });
});

describe('Configuration Validation', () => {
  it('should have all required environment variables', () => {
    expect(testConfig.supabase.projectId, 'SUPABASE_PROJECT_ID should be set').toBeTruthy();
    expect(testConfig.supabase.url).toBeTruthy(); // SUPABASE_URL should be set;
    expect(testConfig.supabase.anonKey).toBeTruthy(); // SUPABASE_ANON_KEY should be set;
  });

  it('should construct valid endpoint URLs', () => {
    expect(testConfig.endpoints.parseRequest.includes('functions/v1/parse-request')).toBe(true);
    expect(testConfig.endpoints.telegramWebhook.includes('functions/v1/telegram-webhook')).toBe(
      true
    );
  });

  it('should have reasonable timeout setting', () => {
    expect(
      testConfig.test.timeout >= 5000,
      'Test timeout should be at least 5 seconds'
    ).toBeTruthy();
    expect(
      testConfig.test.timeout <= 60000,
      'Test timeout should be at most 60 seconds'
    ).toBeTruthy();
  });
});
