/**
 * ERPNext REST API client with caching, retry logic, and error handling
 * @module lib/erpnext
 */

import { trace, SpanStatusCode } from '@opentelemetry/api';
import { logError, logInfo, logWarn } from './logging.mjs';

const tracer = trace.getTracer('telegram-webhook');

// Lambda global scope cache (persists across warm invocations)
let contextCache = {
  users: null,
  sites: null,
  lastFetchTimestamp: null,
  ttlMs: 5 * 60 * 1000  // 5 minutes
};

/**
 * Reset context cache (for testing)
 * @returns {void}
 */
export function resetContextCache() {
  contextCache.users = null;
  contextCache.sites = null;
  contextCache.lastFetchTimestamp = null;
}

// Fallback data from PRD
const FALLBACK_USERS = [
  {
    email: 'joel@10nz.tools',
    fullName: 'Joel',
    timezone: 'America/New_York',
    enabled: true
  },
  {
    email: 'bryan@10nz.tools',
    fullName: 'Bryan',
    timezone: 'America/New_York',
    enabled: true
  },
  {
    email: 'taylor@10nz.tools',
    fullName: 'Taylor',
    timezone: 'America/Chicago',
    enabled: true
  },
  {
    email: 'colin@10nz.tools',
    fullName: 'Colin',
    timezone: 'America/Los_Angeles',
    enabled: true
  }
];

const FALLBACK_SITES = [
  'Big Sky',
  'Viper',
  'Crystal Peak',
  'Thunder Ridge'
];

/**
 * Sleep utility for retry backoff
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if cache is still valid
 */
function isCacheValid() {
  if (!contextCache.lastFetchTimestamp) return false;

  const now = Date.now();
  const age = now - contextCache.lastFetchTimestamp;

  return age < contextCache.ttlMs;
}

/**
 * Generic ERPNext API fetch with retry logic
 *
 * @param {string} endpoint - API endpoint (e.g., '/api/resource/User')
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - Maximum retry attempts for 500+ errors
 * @returns {Promise<Object>} API response JSON
 */
async function erpnextFetch(endpoint, options = {}, maxRetries = 3) {
  const baseUrl = process.env.ERPNEXT_BASE_URL;
  if (!baseUrl) {
    throw new Error('ERPNEXT_BASE_URL not configured');
  }

  const apiKey = process.env.ERPNEXT_API_KEY;
  const apiSecret = process.env.ERPNEXT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('ERPNext API credentials not configured');
  }

  const url = `${baseUrl}${endpoint}`;
  const headers = {
    'Authorization': `token ${apiKey}:${apiSecret}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  const shouldRetry = (statusCode) => statusCode >= 500;
  const retryDelays = [0, 1000, 2000];  // 0ms, 1s, 2s

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);  // 10s timeout

    try {
      if (attempt > 0) {
        await sleep(retryDelays[attempt]);
        logInfo('erpnext_retry', {
          attempt,
          endpoint,
          delay_ms: retryDelays[attempt]
        });
      }

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Success
      if (response.ok) {
        return await response.json();
      }

      // Parse error responses and attach structured details (status, body, _server_messages)
      // Auth errors - don't retry
      if (response.status === 401) {
        logError('erpnext_auth_failed', {
          endpoint,
          statusCode: 401
        });
        const error = new Error('ERPNext authentication failed');
        error.status = 401;
        error.body = null;
        throw error;
      }

      // Server errors - retry
      if (shouldRetry(response.status) && attempt < maxRetries - 1) {
        logWarn('erpnext_server_error', {
          endpoint,
          statusCode: response.status,
          attempt: attempt + 1,
          willRetry: true
        });
        continue;
      }

      // Final failure or non-retryable error - parse JSON response
      let errorBody;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = { error: await response.text() };
      }

      logError('erpnext_request_failed', {
        endpoint,
        statusCode: response.status,
        error: JSON.stringify(errorBody).substring(0, 200),
        attempts: attempt + 1
      });

      // Create structured error with parsed details
      const error = new Error(`ERPNext API error ${response.status}`);
      error.status = response.status;
      error.body = errorBody;
      error._server_messages = errorBody._server_messages;  // For 417 validation errors
      throw error;

    } catch (error) {
      clearTimeout(timeoutId);

      // Timeout error
      if (error.name === 'AbortError') {
        logWarn('erpnext_timeout', {
          endpoint,
          timeout_ms: 10000,
          attempt: attempt + 1
        });

        if (attempt < maxRetries - 1) {
          continue;  // Retry on timeout
        }

        throw new Error('ERPNext request timeout');
      }

      // Network error
      if (attempt < maxRetries - 1 && error.message !== 'ERPNext authentication failed') {
        logWarn('erpnext_network_error', {
          endpoint,
          error: error.message,
          attempt: attempt + 1,
          willRetry: true
        });
        continue;
      }

      throw error;
    }
  }
}

/**
 * Fetch enabled users from ERPNext
 *
 * @returns {Promise<Array>} Array of user objects
 */
async function fetchUsers() {
  const span = tracer.startSpan('erpnext-fetch-users');

  try {
    // Fetch both 'name' and 'email' fields; optionally filter by domain to limit query scope
    const userEmailDomainFilter = process.env.ERPNEXT_USER_EMAIL_DOMAIN_FILTER;

    const filters = userEmailDomainFilter
      ? JSON.stringify([
          ['enabled', '=', 1],
          ['name', 'like', `%${userEmailDomainFilter}`]
        ])
      : JSON.stringify([['enabled', '=', 1]]);

    const fields = JSON.stringify(['name', 'email', 'full_name', 'time_zone', 'enabled']);

    const endpoint = `/api/resource/User?fields=${encodeURIComponent(fields)}&filters=${encodeURIComponent(filters)}&limit_page_length=50`;

    const response = await erpnextFetch(endpoint, { method: 'GET' });

    if (!response.data || response.data.length === 0) {
      logWarn('erpnext_empty_users_response', {
        filters
      });
      return FALLBACK_USERS;
    }

    const users = response.data.map(user => ({
      email: user.email || user.name,  // Prefer email field if available, otherwise use name field
      fullName: user.full_name?.split(' ')[0] || (user.email || user.name).split('@')[0],
      timezone: user.time_zone || 'America/New_York',
      enabled: user.enabled === 1
    }));

    logInfo('erpnext_users_fetched', {
      count: users.length
    });

    span.setStatus({ code: SpanStatusCode.OK });
    return users;

  } catch (error) {
    logWarn('erpnext_fetch_users_failed_using_fallback', {
      error: error.message
    });

    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });

    return FALLBACK_USERS;
  } finally {
    span.end();
  }
}

/**
 * Fetch site locations from ERPNext
 *
 * @returns {Promise<Array>} Array of location names
 */
async function fetchSites() {
  const span = tracer.startSpan('erpnext-fetch-sites');

  try {
    const filters = JSON.stringify([
      ['is_group', '=', 0],  // Only leaf locations
      ['disabled', '=', 0]
    ]);

    const fields = JSON.stringify(['name', 'location_name']);

    const endpoint = `/api/resource/Location?fields=${encodeURIComponent(fields)}&filters=${encodeURIComponent(filters)}&limit_page_length=100`;

    const response = await erpnextFetch(endpoint, { method: 'GET' });

    if (!response.data || response.data.length === 0) {
      logWarn('erpnext_empty_sites_response', {
        filters
      });
      return FALLBACK_SITES;
    }

    const sites = response.data.map(loc => loc.location_name || loc.name);

    logInfo('erpnext_sites_fetched', {
      count: sites.length
    });

    span.setStatus({ code: SpanStatusCode.OK });
    return sites;

  } catch (error) {
    logWarn('erpnext_fetch_sites_failed_using_fallback', {
      error: error.message
    });

    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });

    return FALLBACK_SITES;
  } finally {
    span.end();
  }
}

/**
 * Get context data (users, sites) with caching
 *
 * @returns {Promise<Object>} Context object with users and sites
 */
export async function getContext() {
  const span = tracer.startSpan('erpnext-get-context');

  try {
    // Check cache
    if (isCacheValid()) {
      logInfo('context_cache_hit', {
        age_ms: Date.now() - contextCache.lastFetchTimestamp
      });

      span.setAttribute('cache_hit', true);
      span.setStatus({ code: SpanStatusCode.OK });

      return {
        users: contextCache.users,
        sites: contextCache.sites
      };
    }

    logInfo('context_cache_miss', {
      reason: !contextCache.lastFetchTimestamp ? 'cold_start' : 'expired'
    });

    span.setAttribute('cache_hit', false);

    // Fetch fresh data (parallel)
    const [users, sites] = await Promise.all([
      fetchUsers(),
      fetchSites()
    ]);

    // Update cache
    contextCache.users = users;
    contextCache.sites = sites;
    contextCache.lastFetchTimestamp = Date.now();

    span.setStatus({ code: SpanStatusCode.OK });

    return { users, sites };

  } catch (error) {
    logError('get_context_failed', {
      error: error.message
    });

    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });

    // Return fallback data
    return {
      users: FALLBACK_USERS,
      sites: FALLBACK_SITES
    };
  } finally {
    span.end();
  }
}

/**
 * Create Maintenance Visit in ERPNext
 *
 * @param {Object} taskData - Task data from OpenAI parse
 * @param {string} taskData.description - Task description
 * @param {string} taskData.assignee - Assignee email
 * @param {string} taskData.dueDate - Due date (ISO 8601)
 * @param {string} taskData.priority - Priority level
 * @param {string} taskData.rationale - Parse rationale
 * @param {number} taskData.confidence - Parse confidence
 * @param {string} telegramMessageId - Telegram message ID
 * @returns {Promise<Object>} Created Maintenance Visit
 */
export async function createMaintenanceVisit(taskData, telegramMessageId) {
  const span = tracer.startSpan('erpnext-create-maintenance-visit');

  try {
    // Convert ISO date to ERPNext datetime format
    let mntcDate = null;
    if (taskData.dueDate) {
      const date = new Date(taskData.dueDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      mntcDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    // Build ERPNext Maintenance Visit document
    // Note: doctype field not included (stricter REST compliance)
    // Using custom_assigned_to (custom field) instead of standard assign_to
    const doc = {
      mntc_work_details: taskData.description,
      custom_assigned_to: taskData.assignee || null,  // Custom field (must be created in ERPNext)
      mntc_date: mntcDate,
      custom_priority: taskData.priority || 'Medium',  // Custom field for priority
      custom_parse_rationale: taskData.rationale,
      custom_parse_confidence: taskData.confidence,
      customer: '10netzero Tools',
      maintenance_type: 'Preventive',
      completion_status: 'Pending',
      docstatus: 0,  // Draft
      custom_telegram_message_id: telegramMessageId,
      custom_flrts_source: 'telegram_bot'
    };

    // Flag low confidence parses
    if (taskData.confidence < 0.5) {
      doc.custom_flagged_for_review = true;
      logWarn('low_confidence_parse', {
        confidence: taskData.confidence,
        rationale: taskData.rationale
      });
    }

    logInfo('creating_maintenance_visit', {
      assignee: doc.custom_assigned_to,
      priority: doc.custom_priority,
      confidence: doc.custom_parse_confidence
    });

    const response = await erpnextFetch(
      '/api/resource/Maintenance Visit',
      {
        method: 'POST',
        body: JSON.stringify(doc)
      },
      3  // Max 3 retries for creation
    );

    logInfo('maintenance_visit_created', {
      name: response.data.name,
      assignee: doc.custom_assigned_to
    });

    span.setAttribute('task_name', response.data.name);
    span.setStatus({ code: SpanStatusCode.OK });

    return response.data;

  } catch (error) {
    logError('create_maintenance_visit_failed', {
      error: error.message,
      taskDescription: taskData.description?.substring(0, 50)
    });

    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });

    throw error;
  } finally {
    span.end();
  }
}

/**
 * Log parser audit trail to ERPNext (fire-and-forget)
 *
 * @param {Object} logData - Audit log data
 * @param {string} logData.telegram_message_id - Telegram message ID
 * @param {string} logData.user_id - Telegram user ID
 * @param {string} logData.original_text - Original message text
 * @param {Object} logData.parsed_data - Parsed task data
 * @param {number} logData.confidence - Parse confidence
 * @param {string} logData.status - 'success' or 'failed'
 * @returns {Promise<void>}
 */
export async function logParserAudit(logData) {
  try {
    const doc = {
      doctype: 'FLRTS Parser Log',
      telegram_message_id: logData.telegram_message_id,
      telegram_user_id: logData.user_id,
      original_text: logData.original_text,
      parsed_data: JSON.stringify(logData.parsed_data),
      confidence: logData.confidence,
      status: logData.status,
      error_message: logData.error_message || null,
      created_at: new Date().toISOString()
    };

    await erpnextFetch(
      '/api/resource/FLRTS Parser Log',
      {
        method: 'POST',
        body: JSON.stringify(doc)
      },
      2  // Allow one retry
    );

    logInfo('parser_audit_logged', {
      telegram_message_id: logData.telegram_message_id,
      status: logData.status
    });

  } catch (error) {
    // Fire-and-forget: Log locally but don't fail main operation
    logWarn('parser_audit_log_failed', {
      error: error.message,
      telegram_message_id: logData.telegram_message_id
    });
  }
}
