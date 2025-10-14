import express from 'express';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { getBackendConfig } from './config';
// import { ERPNextClient } from './clients/erpnext'; // Currently unused

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const app = express();
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://thnwlykidzhrsagyjncc.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!
);

// Only log configuration details in development (never in production)
if (process.env.NODE_ENV === 'development') {
  console.log('Using Supabase URL:', process.env.SUPABASE_URL);
  console.log('Service key present:', !!process.env.SUPABASE_SERVICE_KEY);
}

// Backend configuration and client factory (Phase 1: 10N-243)
const backendConfig = getBackendConfig();

// Phase 1: ERPNext mode blocks sync operations (Phase 2 will implement full client)
if (backendConfig.backend === 'erpnext') {
  console.warn(
    '[sync-service] ERPNext backend mode enabled but Phase 2 implementation pending. ' +
      'Sync operations will fail until Phase 2 complete. ' +
      'Set USE_ERPNEXT=false to use OpenProject backend.'
  );
}

// Legacy OpenProject config (only used when backend=openproject)
// Phase 2 TODO: Remove these constants, use backendConfig everywhere
const OPENPROJECT_URL = backendConfig.backend === 'openproject' ? backendConfig.apiUrl : '';
const OPENPROJECT_API_KEY = backendConfig.backend === 'openproject' ? backendConfig.apiKey : '';
const OPENPROJECT_PROJECT_ID =
  backendConfig.backend === 'openproject' ? backendConfig.projectId! : 0;

// Create axios instance for OpenProject
const openprojectAPI = axios.create({
  baseURL: `${OPENPROJECT_URL}/api/v3`,
  auth: {
    username: 'apikey',
    password: OPENPROJECT_API_KEY!,
  },
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for correlation IDs and logging
openprojectAPI.interceptors.request.use(
  (config) => {
    // Add X-Request-ID if not already present
    if (!config.headers['X-Request-ID']) {
      config.headers['X-Request-ID'] = randomUUID();
    }

    // Log request (redact auth header)
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `→ ${config.method?.toUpperCase()} ${config.url} [${config.headers['X-Request-ID']}]`
      );
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error.message);
    return Promise.reject(error);
  }
);

// Add response interceptor for error logging with redaction
openprojectAPI.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `← ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url} [${response.config.headers['X-Request-ID']}]`
      );
    }
    return response;
  },
  (error) => {
    // Redact sensitive data from error logs
    const correlationId = error.config?.headers?.['X-Request-ID'] || 'unknown';
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
    const url = error.config?.url || 'unknown';
    const status = error.response?.status || 'no response';

    // Log error without exposing auth credentials or sensitive data
    console.error(`← ${status} ${method} ${url} [${correlationId}]: ${error.message}`);

    // Log response data only in development (may contain sensitive info)
    if (process.env.NODE_ENV === 'development' && error.response?.data) {
      console.error(`Response data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
    }

    return Promise.reject(error);
  }
);

// Dictionary caches for dynamic ID resolution
const statusCache = new Map<string, number>();
const priorityCache = new Map<string, number>();
const typeCache = new Map<string, number>();

// Retry configuration from environment
const MAX_RETRIES = parseInt(process.env.OPENPROJECT_MAX_RETRIES || '5', 10);
const BASE_DELAY_MS = parseInt(process.env.OPENPROJECT_BASE_DELAY_MS || '500', 10);
const MAX_DELAY_MS = parseInt(process.env.OPENPROJECT_MAX_DELAY_MS || '10000', 10);
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

// Idempotency key storage (in-memory LRU cache with TTL)
interface IdempotencyRecord {
  key: string;
  response: any;
  timestamp: number;
}

// LRU cache implementation with max size
class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // Delete if exists to reorder
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // Evict oldest if at capacity
    else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }

  get size(): number {
    return this.cache.size;
  }
}

const MAX_IDEMPOTENCY_CACHE_SIZE = parseInt(
  process.env.OPENPROJECT_IDEMPOTENCY_CACHE_SIZE || '1000',
  10
);
const idempotencyCache = new LRUCache<string, IdempotencyRecord>(MAX_IDEMPOTENCY_CACHE_SIZE);
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Clean up expired idempotency keys periodically
setInterval(
  () => {
    const now = Date.now();
    for (const [key, record] of idempotencyCache.entries()) {
      if (now - record.timestamp > IDEMPOTENCY_TTL_MS) {
        idempotencyCache.delete(key);
      }
    }
  },
  60 * 60 * 1000
); // Run every hour

// Exponential backoff with jitter
function calculateBackoff(attemptNumber: number): number {
  const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attemptNumber);
  const jitter = Math.random() * 100; // Random 0-100ms jitter
  return Math.min(exponentialDelay + jitter, MAX_DELAY_MS);
}

// Sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry wrapper with exponential backoff
async function retryWithBackoff<T>(
  fn: (correlationId: string) => Promise<T>,
  options: {
    maxRetries?: number;
    operationName?: string;
    idempotencyKey?: string;
  } = {}
): Promise<T> {
  const maxRetries = options.maxRetries || MAX_RETRIES;
  const operationName = options.operationName || 'API call';
  const correlationId = randomUUID();

  // Check idempotency cache if key provided
  if (options.idempotencyKey) {
    const cached = idempotencyCache.get(options.idempotencyKey);
    if (cached) {
      console.log(`Using cached response for idempotency key: ${options.idempotencyKey}`);
      return cached.response;
    }
  }

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`${operationName} attempt ${attempt + 1}/${maxRetries + 1} [${correlationId}]`);
      const result = await fn(correlationId);

      // Cache successful response if idempotency key provided
      if (options.idempotencyKey) {
        idempotencyCache.set(options.idempotencyKey, {
          key: options.idempotencyKey,
          response: result,
          timestamp: Date.now(),
        });
      }

      return result;
    } catch (error: any) {
      lastError = error;

      // Don't retry on non-retryable errors
      if (error.response?.status && !RETRYABLE_STATUS_CODES.includes(error.response.status)) {
        console.error(`${operationName} failed with non-retryable status ${error.response.status}`);
        throw error;
      }

      // Don't retry if we've exhausted attempts
      if (attempt >= maxRetries) {
        console.error(`${operationName} failed after ${maxRetries + 1} attempts`);
        break;
      }

      const backoffMs = calculateBackoff(attempt);
      console.warn(
        `${operationName} failed (attempt ${attempt + 1}), retrying in ${backoffMs}ms... [${correlationId}]`
      );
      await sleep(backoffMs);
    }
  }

  throw lastError;
}

// Helper to safely parse integer from env var
function safeParseInt(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Initialize OpenProject dictionaries at startup
async function initializeDictionaries() {
  console.log('Initializing OpenProject dictionaries...');

  try {
    // Fetch statuses with retry
    await retryWithBackoff(
      async (correlationId) => {
        const statusResponse = await openprojectAPI.get('/statuses', {
          headers: { 'X-Request-ID': correlationId },
        });
        const statuses = statusResponse.data._embedded?.elements || [];
        for (const status of statuses) {
          statusCache.set(status.name.toLowerCase(), status.id);
        }
        console.log(`Loaded ${statusCache.size} statuses from OpenProject [${correlationId}]`);
      },
      { operationName: 'Fetch statuses', maxRetries: 3 }
    );

    // Fetch priorities with retry
    await retryWithBackoff(
      async (correlationId) => {
        const priorityResponse = await openprojectAPI.get('/priorities', {
          headers: { 'X-Request-ID': correlationId },
        });
        const priorities = priorityResponse.data._embedded?.elements || [];
        for (const priority of priorities) {
          priorityCache.set(priority.name.toLowerCase(), priority.id);
        }
        console.log(`Loaded ${priorityCache.size} priorities from OpenProject [${correlationId}]`);
      },
      { operationName: 'Fetch priorities', maxRetries: 3 }
    );

    // Fetch types with retry
    await retryWithBackoff(
      async (correlationId) => {
        const typeResponse = await openprojectAPI.get('/types', {
          headers: { 'X-Request-ID': correlationId },
        });
        const types = typeResponse.data._embedded?.elements || [];
        for (const type of types) {
          typeCache.set(type.name.toLowerCase(), type.id);
        }
        console.log(`Loaded ${typeCache.size} types from OpenProject [${correlationId}]`);
      },
      { operationName: 'Fetch types', maxRetries: 3 }
    );

    // Validate critical mappings exist
    const requiredStatuses = ['new', 'in progress', 'closed', 'rejected'];
    const missingStatuses = requiredStatuses.filter((s) => !statusCache.has(s));
    if (missingStatuses.length > 0) {
      console.warn(`⚠️  Missing expected statuses: ${missingStatuses.join(', ')}`);
    }

    const requiredPriorities = ['high', 'normal', 'low'];
    const missingPriorities = requiredPriorities.filter((p) => !priorityCache.has(p));
    if (missingPriorities.length > 0) {
      console.warn(`⚠️  Missing expected priorities: ${missingPriorities.join(', ')}`);
    }

    if (!typeCache.has('task')) {
      console.warn(`⚠️  Missing expected type: task`);
    }
  } catch (error: any) {
    console.error('❌ Failed to fetch OpenProject dictionaries:', error.message);
    console.log('Falling back to environment variables...');

    // Fallback to environment variables with safe parsing
    const statusNewId = safeParseInt(process.env.OPENPROJECT_STATUS_NEW_ID, 0);
    if (statusNewId > 0) statusCache.set('new', statusNewId);

    const statusInProgressId = safeParseInt(process.env.OPENPROJECT_STATUS_IN_PROGRESS_ID, 0);
    if (statusInProgressId > 0) statusCache.set('in progress', statusInProgressId);

    const statusClosedId = safeParseInt(process.env.OPENPROJECT_STATUS_CLOSED_ID, 0);
    if (statusClosedId > 0) statusCache.set('closed', statusClosedId);

    const statusRejectedId = safeParseInt(process.env.OPENPROJECT_STATUS_REJECTED_ID, 0);
    if (statusRejectedId > 0) statusCache.set('rejected', statusRejectedId);

    const priorityHighId = safeParseInt(process.env.OPENPROJECT_PRIORITY_HIGH_ID, 0);
    if (priorityHighId > 0) priorityCache.set('high', priorityHighId);

    const priorityNormalId = safeParseInt(process.env.OPENPROJECT_PRIORITY_NORMAL_ID, 0);
    if (priorityNormalId > 0) priorityCache.set('normal', priorityNormalId);

    const priorityLowId = safeParseInt(process.env.OPENPROJECT_PRIORITY_LOW_ID, 0);
    if (priorityLowId > 0) priorityCache.set('low', priorityLowId);

    const typeTaskId = safeParseInt(process.env.OPENPROJECT_TYPE_TASK_ID, 0);
    if (typeTaskId > 0) typeCache.set('task', typeTaskId);

    // Fail fast if critical mappings are missing
    const missingCritical: string[] = [];
    if (!statusCache.has('new')) missingCritical.push('status:new');
    if (!statusCache.has('in progress')) missingCritical.push('status:in progress');
    if (!priorityCache.has('normal')) missingCritical.push('priority:normal');
    if (!typeCache.has('task')) missingCritical.push('type:task');

    if (missingCritical.length > 0) {
      throw new Error(
        `Failed to load critical OpenProject mappings: ${missingCritical.join(', ')}. ` +
          `Either API must be available or environment variables must be set.`
      );
    }

    console.log(`Loaded fallback configuration from environment`);
  }
}

// Map Supabase priority to OpenProject priority using dynamic cache
function mapPriority(supabasePriority: string | null): number {
  // Map Supabase priority names to OpenProject priority names
  const priorityNameMap: Record<string, string> = {
    immediate: 'high',
    high: 'high',
    normal: 'normal',
    low: 'low',
  };

  const priorityName = priorityNameMap[supabasePriority || 'normal'] || 'normal';
  const priorityId = priorityCache.get(priorityName);

  if (!priorityId) {
    console.warn(`⚠️  Priority '${priorityName}' not found in cache, using first available`);
    return priorityCache.values().next().value || 1;
  }

  return priorityId;
}

// Map Supabase status to OpenProject status using dynamic cache
function mapStatus(supabaseStatus: string): number {
  // Map Supabase status names to OpenProject status names
  const statusNameMap: Record<string, string> = {
    pending: 'new',
    in_progress: 'in progress',
    completed: 'closed',
    cancelled: 'rejected',
  };

  const statusName = statusNameMap[supabaseStatus] || 'new';
  const statusId = statusCache.get(statusName);

  if (!statusId) {
    console.warn(`⚠️  Status '${statusName}' not found in cache, using first available`);
    return statusCache.values().next().value || 1;
  }

  return statusId;
}

// Sync a single task to OpenProject
async function syncTaskToOpenProject(task: any) {
  try {
    // Phase 1 guard: Block ERPNext mode operations (10N-243)
    if (backendConfig.backend === 'erpnext') {
      throw new Error(
        'ERPNext backend mode enabled but sync operations not yet implemented (Phase 1). ' +
          'Phase 2 will implement full ERPNext client integration. ' +
          'To use OpenProject backend, set USE_ERPNEXT=false or remove the flag.'
      );
    }

    console.log(`Syncing task: ${task.task_title}`);

    // Get type ID from cache (default to 'task')
    const typeId = typeCache.get('task');
    if (!typeId) {
      throw new Error('Task type not found in OpenProject. Cannot create work package.');
    }

    // Prepare work package data
    const workPackageData: any = {
      subject: task.task_title,
      description: {
        format: 'markdown',
        raw: task.task_description_detailed || '',
      },
      _links: {
        type: { href: `/api/v3/types/${typeId}` },
        status: { href: `/api/v3/statuses/${mapStatus(task.status)}` },
        priority: { href: `/api/v3/priorities/${mapPriority(task.priority)}` },
      },
    };

    // Add due date if present
    if (task.due_date || task.due_at) {
      workPackageData.dueDate = task.due_at
        ? new Date(task.due_at).toISOString().split('T')[0]
        : task.due_date;
    }

    let response;

    if (task.openproject_id) {
      // Update existing work package with retry
      response = await retryWithBackoff(
        async (correlationId) => {
          return await openprojectAPI.patch(
            `/work_packages/${task.openproject_id}`,
            workPackageData,
            {
              headers: {
                'X-Request-ID': correlationId,
              },
            }
          );
        },
        {
          operationName: `Update work package ${task.openproject_id}`,
        }
      );
    } else {
      // Create new work package with retry and idempotency
      const idempotencyKey = randomUUID();
      response = await retryWithBackoff(
        async (correlationId) => {
          return await openprojectAPI.post(
            `/projects/${OPENPROJECT_PROJECT_ID}/work_packages`,
            workPackageData,
            {
              headers: {
                'X-Request-ID': correlationId,
                'Idempotency-Key': idempotencyKey,
              },
            }
          );
        },
        {
          operationName: 'Create new work package',
          idempotencyKey,
        }
      );
    }

    // Update Supabase with OpenProject ID and sync status
    await supabase
      .from('tasks')
      .update({
        openproject_id: response.data.id,
        openproject_sync_status: 'synced',
        openproject_last_sync: new Date().toISOString(),
      })
      .eq('id', task.id);

    console.log(
      `✅ Successfully synced task ${task.id} to OpenProject work package ${response.data.id}`
    );
    return response.data;
  } catch (error: any) {
    console.error(`❌ Error syncing task ${task.id}:`, error.response?.data || error.message);

    // Update Supabase with error status
    await supabase
      .from('tasks')
      .update({
        openproject_sync_status: 'error',
        openproject_error: error.response?.data?.message || error.message,
        openproject_last_sync: new Date().toISOString(),
      })
      .eq('id', task.id);

    throw error;
  }
}

// Webhook endpoint for Supabase database webhooks
app.post('/webhook/task', async (req, res) => {
  console.log('Received webhook:', req.body.type);

  const { type, record, old_record } = req.body;

  try {
    switch (type) {
      case 'INSERT':
      case 'UPDATE':
        await syncTaskToOpenProject(record);
        break;

      case 'DELETE':
        if (old_record?.openproject_id) {
          // Delete work package in OpenProject with retry
          await retryWithBackoff(
            async (correlationId) => {
              return await openprojectAPI.delete(`/work_packages/${old_record.openproject_id}`, {
                headers: {
                  'X-Request-ID': correlationId,
                },
              });
            },
            {
              operationName: `Delete work package ${old_record.openproject_id}`,
            }
          );
          console.log(`Deleted OpenProject work package ${old_record.openproject_id}`);
        }
        break;
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual sync endpoint (for testing)
app.post('/sync/task/:id', async (req, res) => {
  const taskId = req.params.id;

  try {
    console.log(`Fetching task ${taskId} from Supabase...`);
    // Redacted: avoid logging any portion of Supabase keys

    // Fetch task from Supabase
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    console.log('Supabase query error:', error);
    console.log('Supabase query data:', task);

    if (error) throw error;
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const result = await syncTaskToOpenProject(task);
    res.json({ success: true, openproject: result });
  } catch (error: any) {
    console.error('Manual sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk sync endpoint (sync all pending tasks)
app.post('/sync/bulk', async (req, res) => {
  try {
    // Fetch all tasks that need syncing
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .in('openproject_sync_status', ['pending', 'error'])
      .limit(50);

    if (error) throw error;

    const results: {
      success: number;
      failed: number;
      errors: Array<{ taskId: any; error: any }>;
    } = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const task of tasks || []) {
      try {
        await syncTaskToOpenProject(task);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({ taskId: task.id, error: error.message });
      }
    }

    res.json(results);
  } catch (error: any) {
    console.error('Bulk sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'sync-service',
    openproject: OPENPROJECT_URL,
    supabase: process.env.SUPABASE_URL,
  });
});

const PORT = process.env.PORT || 3002;

// Initialize dictionaries and start server
async function startServer() {
  try {
    await initializeDictionaries();

    app.listen(PORT, () => {
      console.log(`🔄 Sync Service running on http://localhost:${PORT}`);
      console.log(`📝 Webhook endpoint: POST http://localhost:${PORT}/webhook/task`);
      console.log(`🔧 Manual sync: POST http://localhost:${PORT}/sync/task/:id`);
      console.log(`📦 Bulk sync: POST http://localhost:${PORT}/sync/bulk`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
