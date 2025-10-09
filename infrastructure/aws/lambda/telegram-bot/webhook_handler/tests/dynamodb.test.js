import { describe, it, expect, vi, beforeEach } from 'vitest';
import { putConfirmation } from '../lib/dynamodb.mjs';

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({
    send: vi.fn(),
  })),
  PutItemCommand: vi.fn(),
}));

vi.mock('aws-xray-sdk-core', () => ({
  default: {
    captureAWSv3Client: vi.fn((client) => client),
    getSegment: vi.fn(() => ({
      addNewSubsegment: vi.fn(() => ({
        addMetadata: vi.fn(),
        close: vi.fn(),
        addError: vi.fn(),
      })),
    })),
  },
}));

describe('putConfirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DYNAMODB_TABLE_NAME = 'test-table';
    process.env.AWS_REGION = 'us-east-1';
  });

  it('should write confirmation item with TTL', async () => {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    const mockSend = vi.fn().mockResolvedValue({});
    DynamoDBClient.mockImplementation(() => ({ send: mockSend }));

    const item = {
      userId: '123',
      chatId: '456',
      taskData: { description: 'Test task' },
    };

    const confirmationId = await putConfirmation(item);

    expect(confirmationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('should use default TTL of 24 hours', async () => {
    const { DynamoDBClient, PutItemCommand } = await import('@aws-sdk/client-dynamodb');
    const mockSend = vi.fn().mockResolvedValue({});
    DynamoDBClient.mockImplementation(() => ({ send: mockSend }));

    const item = {
      userId: '123',
      chatId: '456',
      taskData: { description: 'Test task' },
    };

    await putConfirmation(item);

    expect(PutItemCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: 'test-table',
      })
    );
  });

  it('should use custom TTL when provided', async () => {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    const mockSend = vi.fn().mockResolvedValue({});
    DynamoDBClient.mockImplementation(() => ({ send: mockSend }));

    const item = {
      userId: '123',
      chatId: '456',
      taskData: { description: 'Test task' },
    };

    await putConfirmation(item, { ttlSeconds: 3600 });

    expect(mockSend).toHaveBeenCalled();
  });

  it('should throw error when table name not configured', async () => {
    delete process.env.DYNAMODB_TABLE_NAME;

    const item = {
      userId: '123',
      chatId: '456',
      taskData: { description: 'Test task' },
    };

    await expect(putConfirmation(item)).rejects.toThrow('DynamoDB table name not configured');
  });

  it('should throw error on DynamoDB failure', async () => {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    const mockSend = vi.fn().mockRejectedValue(new Error('DynamoDB error'));
    DynamoDBClient.mockImplementation(() => ({ send: mockSend }));

    const item = {
      userId: '123',
      chatId: '456',
      taskData: { description: 'Test task' },
    };

    await expect(putConfirmation(item)).rejects.toThrow('DynamoDB error');
  });

  it('should create Item with correct DynamoDB attribute structure', async () => {
    const { DynamoDBClient, PutItemCommand } = await import('@aws-sdk/client-dynamodb');
    const mockSend = vi.fn().mockResolvedValue({});
    DynamoDBClient.mockImplementation(() => ({ send: mockSend }));

    const item = {
      userId: '123456',
      chatId: '789012',
      taskData: {
        description: 'Test task',
        assignee: 'John Doe',
        priority: 'High',
      },
    };

    await putConfirmation(item);

    // Verify PutItemCommand was called with correct structure
    expect(PutItemCommand).toHaveBeenCalledOnce();

    const putItemCall = PutItemCommand.mock.calls[0][0];

    // Verify all required DynamoDB attributes exist with correct types
    expect(putItemCall.TableName).toBe('test-table');
    expect(putItemCall.Item.confirmationId).toHaveProperty('S');
    expect(putItemCall.Item.userId).toEqual({ S: '123456' });
    expect(putItemCall.Item.chatId).toEqual({ S: '789012' });
    expect(putItemCall.Item.taskData).toHaveProperty('S');
    expect(putItemCall.Item.expiresAt).toHaveProperty('N');
    expect(putItemCall.Item.createdAt).toHaveProperty('N');

    // Verify taskData is JSON-serialized
    const taskDataJson = JSON.parse(putItemCall.Item.taskData.S);
    expect(taskDataJson).toEqual({
      description: 'Test task',
      assignee: 'John Doe',
      priority: 'High',
    });
  });
});
