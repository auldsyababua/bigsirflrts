/**
 * ERPNext Client - Phase 1 Stub Implementation
 *
 * Provides interface-compatible stub for ERPNext REST API.
 * Throws clear "not configured" errors when credentials missing.
 *
 * Phase 2 (future): Replace stubs with live /api/resource/Work Order calls.
 *
 * References:
 * - docs/.scratch/10n-243-erpnext-client/02-api-patterns-confirmed.md (API patterns)
 * - Frappe REST API: /api/resource/{DocType}
 * - Auth: Authorization: token <api_key>:<api_secret>
 * - 10N-243: Application Code Updates
 */

import axios, { type AxiosInstance } from 'axios';
import type { BackendConfig } from '../config';

/**
 * Maintenance Visit representation (ERPNext DocType: Maintenance Visit)
 * FSM-correct DocType for field service work orders.
 *
 * Standard fields per docs/erpnext/research/erpnext-fsm-module-analysis.md:210-221
 * Custom fields: site_location, contractor (future custom DocTypes)
 * Child tables (Phase 3): Service Visit Task, Service Visit Parts
 */
export interface MaintenanceVisit {
  name?: string; // ERPNext DocType name (unique ID, auto-generated, e.g., "MNT-VISIT-2025-00001")

  // Standard Maintenance Visit fields
  customer: string; // Link to Customer (required)
  maintenance_type?: 'Scheduled' | 'Unscheduled' | 'Breakdown'; // Service type
  completion_status?: 'Partially Completed' | 'Fully Completed'; // Completion state
  item_code?: string; // Link to Item (equipment being serviced)
  serial_no?: string; // Link to Serial No (specific asset instance)
  sales_person?: string; // Link to Sales Person (assigned technician/employee)
  work_done?: string; // Small Text - summary of work performed
  customer_feedback?: string; // Text - post-visit feedback
  maintenance_schedule?: string; // Link to Maintenance Schedule (for recurring work)

  // Custom FLRTS fields (require custom DocType deployment - Phase 3)
  custom_site_location?: string; // Link to Site Location (custom DocType)
  custom_contractor?: string; // Link to Supplier (external contractor)

  // Auto-populated metadata
  creation?: string; // ISO timestamp
  modified?: string; // ISO timestamp
  owner?: string; // User who created
  modified_by?: string; // User who last updated

  // Note: Child tables not yet implemented (Phase 3):
  // - service_visit_tasks: Array<{ task_name, status, assigned_to }>
  // - service_visit_parts: Array<{ item_code, qty, serial_no }>
}

/**
 * ERPNext API error wrapper with request ID tracking.
 */
export class ERPNextError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public requestId?: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ERPNextError';
  }
}

/**
 * ERPNext client - Phase 2 live HTTP implementation (10N-246).
 * Implements authenticated CRUD operations on Maintenance Visit DocType.
 *
 * Phase 2 (10N-246):
 * - Authenticated axios client with token auth
 * - CRUD for Maintenance Visit DocType
 * - Retry logic (3 attempts, 500ms exponential backoff)
 * - Request ID tracking and secret masking
 */
export class ERPNextClient {
  private configured: boolean;
  private apiUrl: string;
  private apiKey: string;
  private apiSecret: string;
  private timeout: number;

  constructor(config: BackendConfig) {
    if (config.backend !== 'erpnext') {
      throw new Error('ERPNextClient requires backend=erpnext in config');
    }

    // Check if actually configured (credentials present)
    this.configured = !!(config.apiUrl && config.apiKey && config.apiSecret);
    this.apiUrl = config.apiUrl || '';
    this.apiKey = config.apiKey || '';
    this.apiSecret = config.apiSecret || '';
    this.timeout = Number.parseInt(process.env.ERPNEXT_API_TIMEOUT_MS || '10000', 10);

    if (!this.configured) {
      if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'production') {
        console.warn(
          '[ERPNextClient] Created stub client. Credentials missing. ' +
            'Set ERPNEXT_API_URL, ERPNEXT_API_KEY, ERPNEXT_API_SECRET to enable live API calls.'
        );
      }
    } else if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'production') {
      console.log('[ERPNextClient] Initialized with live HTTP client:', this.apiUrl);
    }
  }

  /**
   * Generate unique request ID for tracing.
   * @private
   */
  private generateRequestId(): string {
    return `erpnext-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Mask sensitive data for logging (hide API key/secret).
   * Shows only 2 chars on each end for better security.
   * @private
   */
  private maskSecret(secret: string): string {
    if (secret.length <= 6) return '***';
    return `${secret.slice(0, 2)}...${secret.slice(-2)}`;
  }

  /**
   * Create authenticated axios instance with retry logic.
   * @private
   */
  private createAxiosClient(requestId: string): AxiosInstance {
    return axios.create({
      baseURL: this.apiUrl,
      timeout: this.timeout,
      headers: {
        Authorization: `token ${this.apiKey}:${this.apiSecret}`,
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
    });
  }

  /**
   * Execute HTTP request with retry logic (3 attempts, exponential backoff 500ms base).
   * Retries on: 5xx, network errors, timeouts
   * No retry on: 4xx (client errors)
   * @private
   */
  private async executeWithRetry<T>(
    operation: string,
    request: (client: AxiosInstance) => Promise<T>,
    maxAttempts = 3,
    baseDelay = 500
  ): Promise<T> {
    const requestId = this.generateRequestId();
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const client = this.createAxiosClient(requestId);

        // Optional debug logging (only in non-production with DEBUG_ERPNEXT=true)
        if (process.env.DEBUG_ERPNEXT === 'true' && process.env.NODE_ENV !== 'production') {
          console.debug(`[ERPNextClient] ${operation} attempt ${attempt}/${maxAttempts}`, {
            requestId,
            apiUrl: this.apiUrl,
            apiKey: this.maskSecret(this.apiKey),
          });
        }

        return await request(client);
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        const isAxiosError = axios.isAxiosError(error);
        const statusCode = isAxiosError ? error.response?.status : undefined;
        const errorCode = isAxiosError ? error.code : undefined;
        const isRetryable =
          !statusCode || // Network error / timeout
          statusCode >= 500 || // Server error
          (errorCode && ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET'].includes(errorCode)); // Network failures

        // Log attempt (mask secrets)
        if (process.env.NODE_ENV !== 'test') {
          const maskedKey = this.maskSecret(this.apiKey);
          console.error(
            `[ERPNextClient] ${operation} attempt ${attempt}/${maxAttempts} failed ` +
              `(requestId: ${requestId}, apiKey: ${maskedKey}, status: ${statusCode || 'network'})`
          );
        }

        // Don't retry 4xx errors
        if (!isRetryable) {
          break;
        }

        // Exponential backoff before retry (if not last attempt)
        if (attempt < maxAttempts) {
          const delay = baseDelay * Math.pow(2, attempt - 1); // 500ms, 1000ms, 2000ms...
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted, throw wrapped error
    throw this.wrapError(operation, lastError, requestId);
  }

  /**
   * Wrap errors with ERPNextError for consistent handling.
   * @private
   */
  private wrapError(operation: string, error: unknown, requestId: string): ERPNextError {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;
      const errorData = error.response?.data;

      if (statusCode === 401 || statusCode === 403) {
        return new ERPNextError(
          `ERPNext ${operation} failed: Invalid credentials (requestId: ${requestId})`,
          statusCode,
          requestId,
          error
        );
      }

      if (statusCode === 404) {
        return new ERPNextError(
          `ERPNext ${operation} failed: Resource not found (requestId: ${requestId})`,
          statusCode,
          requestId,
          error
        );
      }

      // Generic HTTP error
      const message =
        typeof errorData === 'object' && errorData && 'message' in errorData
          ? String(errorData.message)
          : error.message;

      return new ERPNextError(
        `ERPNext ${operation} failed: ${message} (requestId: ${requestId})`,
        statusCode,
        requestId,
        error
      );
    }

    // Network error or timeout
    return new ERPNextError(
      `ERPNext ${operation} failed: ${error instanceof Error ? error.message : 'Unknown error'} (requestId: ${requestId})`,
      undefined,
      requestId,
      error
    );
  }

  /**
   * Throw error if not configured (stub mode).
   * @private
   */
  private ensureConfigured(operation: string): void {
    if (!this.configured) {
      throw new Error(
        `ERPNext ${operation} not available: credentials not configured. ` +
          'Provision service account in ops.10nz.tools and set ERPNEXT_API_URL, ERPNEXT_API_KEY, ERPNEXT_API_SECRET. ' +
          'See docs/.scratch/10n-243-erpnext-client/02-api-patterns-confirmed.md for details.'
      );
    }
  }

  /**
   * Create a Maintenance Visit.
   * POST /api/resource/Maintenance Visit
   */
  async createMaintenanceVisit(visit: MaintenanceVisit): Promise<MaintenanceVisit> {
    this.ensureConfigured('createMaintenanceVisit');

    return this.executeWithRetry('createMaintenanceVisit', async (client) => {
      const response = await client.post('/api/resource/Maintenance Visit', visit);
      return response.data as MaintenanceVisit; // Frappe returns data directly in response.data
    });
  }

  /**
   * Get Maintenance Visit by name.
   * GET /api/resource/Maintenance Visit/{name}
   * Returns null if not found (404).
   */
  async getMaintenanceVisit(name: string): Promise<MaintenanceVisit | null> {
    this.ensureConfigured('getMaintenanceVisit');

    try {
      return await this.executeWithRetry('getMaintenanceVisit', async (client) => {
        const response = await client.get(
          `/api/resource/Maintenance Visit/${encodeURIComponent(name)}`
        );
        return response.data as MaintenanceVisit; // Frappe returns data directly in response.data
      });
    } catch (error) {
      // Return null for 404 instead of throwing
      if (error instanceof ERPNextError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List Maintenance Visits with optional filters.
   * GET /api/resource/Maintenance Visit?fields=[...]&filters=[...]
   *
   * Filters format: { customer: "CUST-001", maintenance_type: "Scheduled" }
   */
  async getMaintenanceVisits(filters?: Record<string, any>): Promise<MaintenanceVisit[]> {
    this.ensureConfigured('getMaintenanceVisits');

    return this.executeWithRetry('getMaintenanceVisits', async (client) => {
      const params: Record<string, string> = {
        fields: JSON.stringify(['*']), // Request all fields
      };

      if (filters && Object.keys(filters).length > 0) {
        // Convert filters to Frappe API format: [[field, operator, value], ...]
        const frappeFilters = Object.entries(filters).map(([field, value]) => [field, '=', value]);
        params.filters = JSON.stringify(frappeFilters);
      }

      const response = await client.get('/api/resource/Maintenance Visit', { params });
      return response.data as MaintenanceVisit[]; // Frappe returns array directly in response.data
    });
  }

  /**
   * Update a Maintenance Visit.
   * PUT /api/resource/Maintenance Visit/{name}
   */
  async updateMaintenanceVisit(
    name: string,
    updates: Partial<MaintenanceVisit>
  ): Promise<MaintenanceVisit> {
    this.ensureConfigured('updateMaintenanceVisit');

    return this.executeWithRetry('updateMaintenanceVisit', async (client) => {
      const response = await client.put(
        `/api/resource/Maintenance Visit/${encodeURIComponent(name)}`,
        updates
      );
      return response.data as MaintenanceVisit; // Frappe returns data directly in response.data
    });
  }

  /**
   * Delete a Maintenance Visit.
   * DELETE /api/resource/Maintenance Visit/{name}
   */
  async deleteMaintenanceVisit(name: string): Promise<void> {
    this.ensureConfigured('deleteMaintenanceVisit');

    await this.executeWithRetry('deleteMaintenanceVisit', async (client) => {
      await client.delete(`/api/resource/Maintenance Visit/${encodeURIComponent(name)}`);
    });
  }

  /**
   * Get available maintenance types (for UI dropdowns, validation).
   * Returns hardcoded values from Maintenance Visit DocType definition.
   */
  async getMaintenanceTypes(): Promise<string[]> {
    return ['Scheduled', 'Unscheduled', 'Breakdown'];
  }

  /**
   * Get available completion statuses (for UI dropdowns, validation).
   * Returns hardcoded values from Maintenance Visit DocType definition.
   */
  async getCompletionStatuses(): Promise<string[]> {
    return ['Partially Completed', 'Fully Completed'];
  }

  /**
   * Health check: verify API connectivity.
   * Phase 1: Returns false if not configured, true if configured (no actual HTTP check).
   * Phase 2: Could call /api/method/ping or similar.
   */
  async healthCheck(): Promise<boolean> {
    return this.configured;
  }

  // ============================================================================
  // Backward Compatibility Aliases (Phase 1 stub tests)
  // ============================================================================

  /**
   * @deprecated Use getMaintenanceTypes() instead
   */
  async getStatuses(): Promise<string[]> {
    return ['Draft', 'Open', 'In Progress', 'Completed', 'Cancelled'];
  }

  /**
   * @deprecated Phase 1 stub - use createMaintenanceVisit() instead
   */
  async createWorkOrder(workOrder: any): Promise<any> {
    this.ensureConfigured('createWorkOrder');
    throw new Error('ERPNext createWorkOrder: Phase 2 implementation pending');
  }

  /**
   * @deprecated Phase 1 stub - use updateMaintenanceVisit() instead
   */
  async updateWorkOrder(name: string, updates: any): Promise<any> {
    this.ensureConfigured('updateWorkOrder');
    throw new Error('ERPNext updateWorkOrder: Phase 2 implementation pending');
  }

  /**
   * @deprecated Phase 1 stub - use deleteMaintenanceVisit() instead
   */
  async deleteWorkOrder(name: string): Promise<void> {
    this.ensureConfigured('deleteWorkOrder');
    throw new Error('ERPNext deleteWorkOrder: Phase 2 implementation pending');
  }

  /**
   * @deprecated Phase 1 stub - use getMaintenanceVisit() instead
   */
  async getWorkOrder(name: string): Promise<any> {
    this.ensureConfigured('getWorkOrder');
    throw new Error('ERPNext getWorkOrder: Phase 2 implementation pending');
  }

  /**
   * @deprecated Phase 1 stub - use getMaintenanceVisits() instead
   */
  async getWorkOrders(filters?: Record<string, any>): Promise<any[]> {
    this.ensureConfigured('getWorkOrders');
    throw new Error('ERPNext getWorkOrders: Phase 2 implementation pending');
  }
}
