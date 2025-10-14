/**
 * Structured logging utilities with secret masking
 * @module lib/logging
 */

/**
 * Mask secrets using two-character reveal policy
 * Shows first two and last two characters when length >= 6, otherwise returns ***
 *
 * @param {string} secret - The secret to mask
 * @returns {string} Masked secret
 */
export function maskSecret(secret) {
  if (!secret || typeof secret !== 'string') {
    return '****';
  }

  if (secret.length < 6) {
    return '****';
  }

  const first = secret.slice(0, 2);
  const last = secret.slice(-2);
  const middle = '*'.repeat(secret.length - 4);

  return `${first}${middle}${last}`;
}

/**
 * Create a structured log entry with metadata redaction
 *
 * @param {string} level - Log level (info, warn, error)
 * @param {string} event - Event name
 * @param {Object} metadata - Additional metadata
 * @returns {void}
 */
export function log(level, event, metadata = {}) {
  // Recursively redact sensitive keys in metadata
  const redactMeta = (meta) => {
    if (!meta || typeof meta !== 'object') return meta;

    // Handle arrays recursively - THIS IS THE FIX
    if (Array.isArray(meta)) {
      // Recursively call redactMeta for each item in the array
      return meta.map(item => redactMeta(item));
    }

    // Handle objects (existing logic)
    const out = {};
    const reservedKeys = new Set(['timestamp', 'level', 'event']);

    for (const [k, v] of Object.entries(meta)) {
      // Skip reserved keys that would overwrite log structure
      if (reservedKeys.has(k)) {
        continue;
      }

      if (typeof v === 'string' && /(token|secret|key|password|authorization|auth)/i.test(k)) {
        out[k] = maskSecret(v);
      } else if (typeof v === 'object' && v !== null) {
        // Recursively process nested objects and arrays
        out[k] = redactMeta(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  };

  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...redactMeta(metadata),
  };

  const output = JSON.stringify(logEntry);

  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

/**
 * Log info-level message
 */
export function logInfo(event, metadata = {}) {
  log('info', event, metadata);
}

/**
 * Log warning-level message
 */
export function logWarn(event, metadata = {}) {
  log('warn', event, metadata);
}

/**
 * Log error-level message
 */
export function logError(event, metadata = {}) {
  log('error', event, metadata);
}
