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
    return '***';
  }

  if (secret.length < 6) {
    return '***';
  }

  const first = secret.slice(0, 2);
  const last = secret.slice(-2);
  const middle = '•'.repeat(Math.min(secret.length - 4, 20));

  return `${first}${middle}${last}`;
}

/**
 * Create a structured log entry
 *
 * @param {string} level - Log level (info, warn, error)
 * @param {string} event - Event name
 * @param {Object} metadata - Additional metadata
 * @returns {void}
 */
export function log(level, event, metadata = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...metadata,
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
