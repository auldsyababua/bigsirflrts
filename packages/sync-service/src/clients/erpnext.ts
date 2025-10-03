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

import type { BackendConfig } from '../config';

/**
 * Work Order representation (ERPNext DocType: Work Order)
 * Matches OpenProject work package concept for FLRTS use case.
 */
export interface WorkOrder {
  name?: string; // ERPNext DocType name (unique ID, auto-generated)
  subject: string; // Work order title
  description?: string; // Markdown/HTML content
  status?: 'Draft' | 'Open' | 'In Progress' | 'Completed' | 'Cancelled';
  priority?: string; // Custom field if added
  assign_to?: string; // User assignment (may use Assignment DocType)
  creation?: string; // Auto-populated timestamp
  modified?: string; // Auto-populated timestamp
}

/**
 * ERPNext client stub (Phase 1).
 * Throws errors indicating credentials needed for Phase 2 implementation.
 *
 * Phase 2 TODO:
 * - Import axios and create authenticated instance
 * - Implement POST /api/resource/Work%20Order
 * - Implement GET /api/resource/Work%20Order with filters
 * - Implement PUT /api/resource/Work%20Order/{name}
 * - Add retry logic and error handling
 */
export class ERPNextClient {
  private configured: boolean;
  private apiUrl: string;

  constructor(config: BackendConfig) {
    if (config.backend !== 'erpnext') {
      throw new Error('ERPNextClient requires backend=erpnext in config');
    }

    // Check if actually configured (credentials present)
    this.configured = !!(config.apiUrl && config.apiKey && config.apiSecret);
    this.apiUrl = config.apiUrl || '';

    if (!this.configured) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn(
          '[ERPNextClient] Created stub client. Credentials missing. ' +
            'Set ERPNEXT_API_URL, ERPNEXT_API_KEY, ERPNEXT_API_SECRET to enable live API calls.'
        );
      }
    } else if (process.env.NODE_ENV !== 'test') {
      console.log('[ERPNextClient] Initialized (stub mode, Phase 1):', this.apiUrl);
    }
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
   * Create a Work Order.
   * Phase 1: Stub (throws error).
   * Phase 2: POST /api/resource/Work%20Order
   */
  async createWorkOrder(workOrder: WorkOrder): Promise<WorkOrder> {
    this.ensureConfigured('createWorkOrder');
    throw new Error('ERPNext createWorkOrder: Phase 2 implementation pending');
  }

  /**
   * Update a Work Order.
   * Phase 1: Stub (throws error).
   * Phase 2: PUT /api/resource/Work%20Order/{name}
   */
  async updateWorkOrder(name: string, updates: Partial<WorkOrder>): Promise<WorkOrder> {
    this.ensureConfigured('updateWorkOrder');
    throw new Error('ERPNext updateWorkOrder: Phase 2 implementation pending');
  }

  /**
   * Delete a Work Order.
   * Phase 1: Stub (throws error).
   * Phase 2: DELETE /api/resource/Work%20Order/{name}
   */
  async deleteWorkOrder(name: string): Promise<void> {
    this.ensureConfigured('deleteWorkOrder');
    throw new Error('ERPNext deleteWorkOrder: Phase 2 implementation pending');
  }

  /**
   * Get Work Order by name.
   * Phase 1: Stub (throws error).
   * Phase 2: GET /api/resource/Work%20Order/{name}
   */
  async getWorkOrder(name: string): Promise<WorkOrder> {
    this.ensureConfigured('getWorkOrder');
    throw new Error('ERPNext getWorkOrder: Phase 2 implementation pending');
  }

  /**
   * List Work Orders with filters.
   * Phase 1: Stub (throws error).
   * Phase 2: GET /api/resource/Work%20Order?fields=[...]&filters=[...]
   */
  async getWorkOrders(filters?: Record<string, any>): Promise<WorkOrder[]> {
    this.ensureConfigured('getWorkOrders');
    throw new Error('ERPNext getWorkOrders: Phase 2 implementation pending');
  }

  /**
   * Get available statuses (for UI dropdowns, validation).
   * Phase 1: Returns hardcoded values (no API call needed).
   * Phase 2: Keep hardcoded or fetch from DocType metadata.
   */
  async getStatuses(): Promise<string[]> {
    // Statuses are fixed in Work Order DocType definition
    // No API call needed; return known values
    return ['Draft', 'Open', 'In Progress', 'Completed', 'Cancelled'];
  }

  /**
   * Health check: verify API connectivity.
   * Phase 1: Returns false if not configured, true if configured (no actual HTTP check).
   * Phase 2: Could call /api/method/ping or similar.
   */
  async healthCheck(): Promise<boolean> {
    return this.configured;
  }
}
