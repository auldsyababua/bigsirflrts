/**
 * ERPNext Backend Configuration
 *
 * Provides ERPNext API configuration from environment variables.
 * Fails fast with clear errors if any required credentials are missing.
 *
 * References:
 * - ADR-006: ERPNext Backend Adoption (Frappe Cloud migration decision)
 * - docs/erpnext/ERPNext-Migration-Naming-Standards.md (env var conventions)
 * - 10N-339: Remove OpenProject Fallback (simplified to ERPNext-only)
 */

export interface ERPNextConfig {
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
}

/**
 * Get ERPNext configuration from environment variables.
 * Fails immediately if any required credentials are missing.
 *
 * Required environment variables:
 * - ERPNEXT_API_URL: ERPNext instance URL (e.g., https://ops.10nz.tools)
 * - ERPNEXT_API_KEY: API key for authentication
 * - ERPNEXT_API_SECRET: API secret for authentication
 *
 * @throws {Error} If any required environment variable is missing
 * @returns {ERPNextConfig} Configuration object with all required credentials
 */
export function getERPNextConfig(): ERPNextConfig {
  const apiUrl = process.env.ERPNEXT_API_URL;
  const apiKey = process.env.ERPNEXT_API_KEY;
  const apiSecret = process.env.ERPNEXT_API_SECRET;

  // Fail fast if any credentials missing
  if (!apiUrl || !apiKey || !apiSecret) {
    const missing: string[] = [];
    if (!apiUrl) missing.push('ERPNEXT_API_URL');
    if (!apiKey) missing.push('ERPNEXT_API_KEY');
    if (!apiSecret) missing.push('ERPNEXT_API_SECRET');

    throw new Error(
      `ERPNext credentials required. Missing: ${missing.join(', ')}\n\n` +
        'Configure these environment variables:\n' +
        '  ERPNEXT_API_URL     - ERPNext instance URL (e.g., https://ops.10nz.tools)\n' +
        '  ERPNEXT_API_KEY     - API key for authentication\n' +
        '  ERPNEXT_API_SECRET  - API secret for authentication\n\n' +
        'For local development: Set in .env.local\n' +
        'For deployment: Set in deployment configuration\n' +
        'Reference: docs/erpnext/ERPNext-Migration-Naming-Standards.md'
    );
  }

  // Log configuration (URL only, not secrets)
  if (process.env.NODE_ENV !== 'test') {
    console.log('[Config] Using ERPNext backend:', apiUrl);
  }

  return {
    apiUrl,
    apiKey,
    apiSecret,
  };
}
