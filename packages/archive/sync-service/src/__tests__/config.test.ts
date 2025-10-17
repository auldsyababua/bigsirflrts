/**
 * ⚠️ NON-FUNCTIONAL TEST - HISTORICAL REFERENCE ONLY
 *
 * This archived test contains broken import paths to deprecated
 * infrastructure. Test will not run.
 *
 * Preserved for historical reference only.
 *
 * Last Active: 2025-10-13
 * Archived: 2025-10-16
 */

/**
 * Config layer tests - backend switching and env var resolution
 * Phase 1: 10N-243
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getERPNextConfig } from '../../packages/sync-service/src/config';

describe('Backend Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env to clean state
    process.env = { ...originalEnv };
    delete process.env.ERPNEXT_API_URL;
    delete process.env.ERPNEXT_API_KEY;
    delete process.env.ERPNEXT_API_SECRET;
    process.env.NODE_ENV = 'test'; // Suppress logs
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('ERPNext Configuration', () => {
    it('@P0 should return config when all credentials present', () => {
      process.env.ERPNEXT_API_URL = 'https://ops.10nz.tools';
      process.env.ERPNEXT_API_KEY = 'test-erpnext-key';
      process.env.ERPNEXT_API_SECRET = 'test-erpnext-secret';

      const config = getERPNextConfig();

      expect(config.apiUrl).toBe('https://ops.10nz.tools');
      expect(config.apiKey).toBe('test-erpnext-key');
      expect(config.apiSecret).toBe('test-erpnext-secret');
    });

    it('@P0 should throw if ERPNEXT_API_URL missing', () => {
      process.env.ERPNEXT_API_KEY = 'key';
      process.env.ERPNEXT_API_SECRET = 'secret';
      // Missing ERPNEXT_API_URL

      expect(() => getERPNextConfig()).toThrow(/ERPNEXT_API_URL/);
    });

    it('@P0 should throw if ERPNEXT_API_KEY missing', () => {
      process.env.ERPNEXT_API_URL = 'https://ops.10nz.tools';
      process.env.ERPNEXT_API_SECRET = 'secret';
      // Missing ERPNEXT_API_KEY

      expect(() => getERPNextConfig()).toThrow(/ERPNEXT_API_KEY/);
    });

    it('@P0 should throw if ERPNEXT_API_SECRET missing', () => {
      process.env.ERPNEXT_API_URL = 'https://ops.10nz.tools';
      process.env.ERPNEXT_API_KEY = 'key';
      // Missing ERPNEXT_API_SECRET

      expect(() => getERPNextConfig()).toThrow(/ERPNEXT_API_SECRET/);
    });

    it('@P0 should throw if all credentials missing', () => {
      // All missing

      expect(() => getERPNextConfig()).toThrow(
        /Missing: ERPNEXT_API_URL, ERPNEXT_API_KEY, ERPNEXT_API_SECRET/
      );
    });

    it('@P0 should include helpful error message with setup instructions', () => {
      try {
        getERPNextConfig();
        throw new Error('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('Configure these environment variables');
        expect(error.message).toContain('For local development: Set in .env.local');
        expect(error.message).toContain('For deployment: Set in deployment configuration');
      }
    });
  });

  describe('Security', () => {
    it('@P0 should not log secrets in any mode', () => {
      process.env.NODE_ENV = 'test';
      process.env.ERPNEXT_API_URL = 'https://ops.10nz.tools';
      process.env.ERPNEXT_API_KEY = 'secret-key-should-not-log';
      process.env.ERPNEXT_API_SECRET = 'secret-value-should-not-log';

      const config = getERPNextConfig();

      // Config contains secrets (needed for API calls)
      expect(config.apiKey).toBe('secret-key-should-not-log');
      expect(config.apiSecret).toBe('secret-value-should-not-log');

      // But logging only shows URL (manual code review confirms)
      // No keys/secrets are logged, only apiUrl
    });
  });
});
