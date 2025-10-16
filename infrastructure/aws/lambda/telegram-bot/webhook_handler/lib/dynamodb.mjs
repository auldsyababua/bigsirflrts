/**
 * DynamoDB client for confirmation state management
 * @module lib/dynamodb
 */

import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { logError, logInfo } from './logging.mjs';

const tracer = trace.getTracer('telegram-webhook');

/**
 * Create DynamoDB client (tracing handled by ADOT layer)
 */
function createDynamoDBClient() {
  return new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });
}

/**
 * Write confirmation item to DynamoDB with TTL
 *
 * @param {Object} item - Confirmation item data
 * @param {string} item.userId - Telegram user ID
 * @param {string} item.chatId - Telegram chat ID
 * @param {Object} item.taskData - Parsed task parameters
 * @param {Object} options - Configuration options
 * @param {number} [options.ttlSeconds=86400] - TTL in seconds (default: 24 hours)
 * @param {string} [options.tableName] - DynamoDB table name
 * @returns {Promise<string>} Generated confirmation ID
 */
export async function putConfirmation(item, options = {}) {
  const {
    ttlSeconds = 86400,
    tableName = process.env.DYNAMODB_TABLE_NAME,
  } = options;

  if (!tableName) {
    throw new Error('DynamoDB table name not configured');
  }

  const confirmationId = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + ttlSeconds;

  const dbItem = {
    confirmationId,
    userId: item.userId,
    chatId: item.chatId,
    taskData: JSON.stringify(item.taskData),
    createdAt: now,
    expiresAt,
  };

  const span = tracer.startSpan('dynamodb-write');

  try {
    const client = createDynamoDBClient();

    logInfo('dynamodb_write_start', {
      confirmationId,
      tableName,
      ttlSeconds,
    });

    const startTime = Date.now();

    await client.send(
      new PutItemCommand({
        TableName: tableName,
        Item: marshall(dbItem),
      })
    );

    const duration = Date.now() - startTime;

    logInfo('dynamodb_write_complete', {
      confirmationId,
      duration,
      expiresAt,
    });

    span.setAttribute('confirmationId', confirmationId);
    span.setAttribute('duration_ms', duration);
    span.setAttribute('tableName', tableName);
    span.setStatus({ code: SpanStatusCode.OK });

    return confirmationId;
  } catch (error) {
    logError('dynamodb_write_failed', {
      tableName,
      error: error.message,
      code: error.code,
    });

    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });

    throw error;
  } finally {
    span.end();
  }
}
