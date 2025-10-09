/**
 * DynamoDB client for confirmation state management
 * @module lib/dynamodb
 */

import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';
import AWSXRay from 'aws-xray-sdk-core';
import { logError, logInfo } from './logging.mjs';

/**
 * Create DynamoDB client with X-Ray tracing
 */
function createDynamoDBClient() {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  return AWSXRay.captureAWSv3Client(client);
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

  const subsegment = AWSXRay.getSegment()?.addNewSubsegment('dynamodb-write');

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

    subsegment?.addMetadata('confirmationId', confirmationId);
    subsegment?.addMetadata('duration', duration);
    subsegment?.addMetadata('tableName', tableName);
    subsegment?.close();

    return confirmationId;
  } catch (error) {
    logError('dynamodb_write_failed', {
      tableName,
      error: error.message,
      code: error.code,
    });

    subsegment?.addError(error);
    subsegment?.close();

    throw error;
  }
}
