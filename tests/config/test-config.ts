/**
 * FLRTS Test Configuration
 *
 * This module provides test configuration that works with 1Password Service Account.
 * Environment variables are injected securely via `op run` command.
 *
 * Usage: op run --env-file=tests/.env.test -- npm run test:integration
 */

interface TestConfig {
  // DEPRECATED: Supabase config retained for archived tests only
  // Per ADR-006, migrated to ERPNext on Frappe Cloud
  supabase: {
    projectId: string | undefined;
    url: string | undefined;
    anonKey: string | undefined;
    serviceRoleKey: string | undefined;
  };
  // ERPNext Configuration (Current Stack)
  erpnext: {
    apiUrl: string | undefined;
    apiKey: string | undefined;
    apiSecret: string | undefined;
  };
  // DEPRECATED: Supabase edge function endpoints
  // Replaced by ERPNext custom app endpoints (flrts_extensions)
  endpoints: {
    parseRequest: string;
    telegramWebhook: string;
  };
  n8n: {
    webhookUrl: string | undefined;
    instanceUrl: string | undefined;
    authToken: string | undefined;
  };
  test: {
    timeout: number;
    environment: string;
    retry: {
      maxAttempts: number;
      baseDelayMs: number;
      maxDelayMs: number;
      backoffMultiplier: number;
      jitterMaxMs: number;
      testTimeoutMs: number;
      mockServer: {
        port: number;
        failingWebhookUrl: string;
        slowWebhookUrl: string;
      };
    };
  };
  openai: {
    apiKey: string | undefined;
  };
  telegram: {
    botToken: string | undefined;
    webhookSecret: string | undefined;
  };
}

export const testConfig: TestConfig = {
  // DEPRECATED: Supabase Configuration (archived tests only)
  supabase: {
    projectId: process.env.SUPABASE_PROJECT_ID,
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // ERPNext Configuration (Current Stack - Frappe Cloud)
  erpnext: {
    apiUrl: process.env.ERPNEXT_API_URL || 'http://localhost:8000',
    apiKey: process.env.ERPNEXT_API_KEY,
    apiSecret: process.env.ERPNEXT_API_SECRET,
  },

  // DEPRECATED: Supabase Edge Function Endpoints (archived tests only)
  endpoints: {
    parseRequest: `${process.env.SUPABASE_URL}/functions/v1/parse-request`,
    telegramWebhook: `${process.env.SUPABASE_URL}/functions/v1/telegram-webhook`,
  },

  // n8n Configuration
  n8n: {
    webhookUrl: process.env.N8N_WEBHOOK_URL,
    instanceUrl: process.env.N8N_INSTANCE_URL,
    authToken: process.env.N8N_AUTH_TOKEN,
  },

  // Test Settings
  test: {
    timeout: parseInt(process.env.TEST_TIMEOUT || '30000'),
    environment: process.env.NODE_ENV || 'test',

    // Retry Testing Configuration
    retry: {
      maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3'),
      baseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS || '1000'),
      maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS || '32000'),
      backoffMultiplier: parseFloat(process.env.RETRY_BACKOFF_MULTIPLIER || '2'),
      jitterMaxMs: parseInt(process.env.RETRY_JITTER_MAX_MS || '100'),
      testTimeoutMs: parseInt(process.env.RETRY_TEST_TIMEOUT_MS || '45000'),

      // Mock server configuration for retry testing
      mockServer: {
        port: parseInt(process.env.MOCK_WEBHOOK_PORT || '3001'),
        failingWebhookUrl:
          process.env.MOCK_FAILING_WEBHOOK_URL || 'http://localhost:3001/failing-webhook',
        slowWebhookUrl: process.env.MOCK_SLOW_WEBHOOK_URL || 'http://localhost:3001/slow-webhook',
      },
    },
  },

  // OpenAI Configuration (for NLP testing)
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },

  // Telegram Configuration
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
  },
};

/**
 * Validates that required environment variables are present for current stack (ERPNext)
 * Note: Supabase vars only required for archived tests
 * @throws {Error} If required environment variables are missing
 */
export function validateTestConfig(): void {
  // ERPNext is now the primary stack
  const erpnextRequired = ['ERPNEXT_API_KEY', 'ERPNEXT_API_SECRET'];
  const missing = erpnextRequired.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.warn(
      `Missing ERPNext environment variables: ${missing.join(', ')}\n` +
        'ERPNext tests will be skipped. Configure via .env.test for full test suite.'
    );
  }
}

/**
 * DEPRECATED: Validates Supabase config (archived tests only)
 * @throws {Error} If required Supabase environment variables are missing
 */
export function validateSupabaseTestConfig(): void {
  const required = ['SUPABASE_PROJECT_ID', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Supabase environment variables: ${missing.join(', ')}\n` +
        'Note: Supabase is deprecated. This function is for archived tests only.'
    );
  }
}

/**
 * Get headers for Supabase API requests
 * @param useServiceRole - Whether to use service role key instead of anon key
 * @returns Headers object
 */
export function getSupabaseHeaders(useServiceRole = false): Record<string, string> {
  const key = useServiceRole ? testConfig.supabase.serviceRoleKey : testConfig.supabase.anonKey;

  if (!key) {
    throw new Error('Missing Supabase API key');
  }

  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    apikey: key,
  };
}

/**
 * Get headers for authorized Telegram webhook requests
 * Uses Telegram's X-Telegram-Bot-Api-Secret-Token header.
 * If the secret is not configured, tests should skip the authorized webhook test.
 */
export function getTelegramAuthHeaders(): Record<string, string> {
  const secret = testConfig.telegram.webhookSecret;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret) {
    return { ...headers, 'X-Telegram-Bot-Api-Secret-Token': secret };
  }
  return headers;
}
