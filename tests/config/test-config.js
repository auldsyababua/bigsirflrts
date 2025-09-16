/**
 * FLRTS Test Configuration
 *
 * This module provides test configuration that works with 1Password Service Account.
 * Environment variables are injected securely via `op run` command.
 *
 * Usage: op run --env-file=tests/.env.test -- node tests/your-test.js
 */

export const testConfig = {
  // Supabase Configuration
  supabase: {
    projectId: process.env.SUPABASE_PROJECT_ID,
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // API Endpoints
  endpoints: {
    parseRequest: `${process.env.SUPABASE_URL}/functions/v1/parse-request`,
    telegramWebhook: `${process.env.SUPABASE_URL}/functions/v1/telegram-webhook`,
  },

  // Test Settings
  test: {
    timeout: parseInt(process.env.TEST_TIMEOUT) || 30000,
    environment: process.env.NODE_ENV || 'test',
  },

  // OpenAI Configuration (for NLP testing)
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },

  // Telegram Configuration
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
  },
};

/**
 * Validates that all required environment variables are present
 * @throws {Error} If required environment variables are missing
 */
export function validateTestConfig() {
  const required = [
    'SUPABASE_PROJECT_ID',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Make sure to run tests with: op run --env-file=tests/.env.test -- npm run test:api'
    );
  }
}

/**
 * Get headers for Supabase API requests
 * @param {boolean} useServiceRole - Whether to use service role key instead of anon key
 * @returns {Object} Headers object
 */
export function getSupabaseHeaders(useServiceRole = false) {
  const key = useServiceRole ? testConfig.supabase.serviceRoleKey : testConfig.supabase.anonKey;

  return {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'apikey': key,
  };
}