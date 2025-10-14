/**
 * Backend Configuration Compatibility Layer
 *
 * Provides unified configuration for ERPNext and OpenProject backends.
 * Prefers ERPNext variables when USE_ERPNEXT=true, falls back to OpenProject.
 *
 * References:
 * - ADR-006: ERPNext Backend Adoption (Frappe Cloud migration decision)
 * - docs/erpnext/ERPNext-Migration-Naming-Standards.md (env var conventions)
 * - 10N-243: Application Code Updates (deferred from Category 3)
 * - docs/.scratch/10n-243-erpnext-client/02-api-patterns-confirmed.md
 */

export interface BackendConfig {
  backend: 'erpnext' | 'openproject';
  apiUrl: string;
  apiKey: string;
  apiSecret?: string; // ERPNext only
  projectId?: number; // OpenProject only
}

/**
 * Feature flag to enable ERPNext backend.
 * Default: false (OpenProject) until migration complete.
 *
 * Accepts: "true", "1", "yes" (case-insensitive) as truthy
 */
function useERPNext(): boolean {
  const flag = (process.env.USE_ERPNEXT || '').toLowerCase().trim();
  return flag === 'true' || flag === '1' || flag === 'yes';
}

/**
 * Resolve backend configuration based on feature flag and available env vars.
 *
 * ERPNext mode (USE_ERPNEXT=true):
 * - Requires: ERPNEXT_API_URL, ERPNEXT_API_KEY, ERPNEXT_API_SECRET
 * - Falls back to OpenProject if ERPNext vars missing (with warning)
 *
 * OpenProject mode (default):
 * - Requires: OPENPROJECT_API_KEY, OPENPROJECT_PROJECT_ID
 * - Optional: OPENPROJECT_URL (defaults to localhost:8080)
 *
 * @throws {Error} If required variables missing for active backend
 */
export function getBackendConfig(): BackendConfig {
  const preferERPNext = useERPNext();

  // Try ERPNext first if flag enabled
  if (preferERPNext) {
    const erpnextUrl = process.env.ERPNEXT_API_URL;
    const erpnextKey = process.env.ERPNEXT_API_KEY;
    const erpnextSecret = process.env.ERPNEXT_API_SECRET;

    // All three required for ERPNext
    if (erpnextUrl && erpnextKey && erpnextSecret) {
      if (process.env.NODE_ENV !== 'test') {
        console.log('[Config] Using ERPNext backend:', erpnextUrl);
      }
      return {
        backend: 'erpnext',
        apiUrl: erpnextUrl,
        apiKey: erpnextKey,
        apiSecret: erpnextSecret,
      };
    }

    // Fall back to OpenProject if ERPNext vars incomplete
    if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'production') {
      console.warn(
        '[Config] USE_ERPNEXT=true but ERPNEXT_API_URL, ERPNEXT_API_KEY, or ERPNEXT_API_SECRET missing. ' +
          'Falling back to OpenProject backend. ' +
          'Set all three ERPNEXT_* variables to use ERPNext.'
      );
    }
  }

  // OpenProject fallback or default
  const openprojectUrl = process.env.OPENPROJECT_URL || 'http://localhost:8080';
  const openprojectKey = process.env.OPENPROJECT_API_KEY;
  const openprojectProjectId = Number.parseInt(
    String(process.env.OPENPROJECT_PROJECT_ID || ''),
    10
  );

  // Validate OpenProject required vars
  if (!openprojectKey || openprojectKey.trim().length === 0) {
    throw new Error(
      'OPENPROJECT_API_KEY is required when USE_ERPNEXT=false or when ERPNext credentials missing'
    );
  }

  if (!Number.isFinite(openprojectProjectId) || openprojectProjectId <= 0) {
    throw new Error(
      'OPENPROJECT_PROJECT_ID is required and must be a positive integer when using OpenProject backend'
    );
  }

  if (process.env.NODE_ENV !== 'test') {
    console.log('[Config] Using OpenProject backend:', openprojectUrl);
  }

  return {
    backend: 'openproject',
    apiUrl: openprojectUrl,
    apiKey: openprojectKey,
    projectId: openprojectProjectId,
  };
}

/**
 * Check if ERPNext backend is active (flag ON and credentials present).
 * Useful for conditional logic without throwing errors.
 */
export function isERPNextActive(): boolean {
  try {
    const config = getBackendConfig();
    return config.backend === 'erpnext';
  } catch {
    return false;
  }
}

/**
 * Get backend name for logging/debugging.
 */
export function getBackendName(): string {
  try {
    return getBackendConfig().backend;
  } catch {
    return 'unknown';
  }
}
