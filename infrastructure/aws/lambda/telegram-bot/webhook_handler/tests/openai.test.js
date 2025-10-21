import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyIntent } from '../lib/openai.mjs';

vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    })),
  };
});

vi.mock('aws-xray-sdk-core', () => ({
  default: {
    getSegment: vi.fn(() => ({
      addNewSubsegment: vi.fn(() => ({
        addMetadata: vi.fn(),
        close: vi.fn(),
        addError: vi.fn(),
      })),
    })),
  },
}));

describe('classifyIntent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'sk-test-key';
  });

  it('should classify intent and return task data', async () => {
    const OpenAI = (await import('openai')).default;
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              description: 'Fix the login bug',
              assignee: null,
              dueDate: null,
              priority: null,
            }),
          },
          finish_reason: 'stop',
        },
      ],
      model: 'gpt-4o-2024-08-06',
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    });

    OpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    }));

    const result = await classifyIntent('Fix the login bug', {
      apiKey: 'sk-test-key',
    });

    expect(result).toEqual({
      description: 'Fix the login bug',
      assignee: null,
      dueDate: null,
      priority: null,
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-2024-08-06',
        temperature: 0.1,
        response_format: expect.objectContaining({
          type: 'json_schema',
        }),
      })
    );
  });

  it('should retry on failure', async () => {
    const OpenAI = (await import('openai')).default;
    const mockCreate = vi
      .fn()
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                description: 'Test task',
                assignee: null,
                dueDate: null,
                priority: null,
              }),
            },
            finish_reason: 'stop',
          },
        ],
        model: 'gpt-4o-2024-08-06',
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      });

    OpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    }));

    const result = await classifyIntent('Test task', {
      apiKey: 'sk-test-key',
      maxRetries: 1,
    });

    expect(result.description).toBe('Test task');
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('should throw error after max retries', async () => {
    const OpenAI = (await import('openai')).default;
    const mockCreate = vi.fn().mockRejectedValue(new Error('API Error'));

    OpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    }));

    await expect(
      classifyIntent('Test task', {
        apiKey: 'sk-test-key',
        maxRetries: 1,
      })
    ).rejects.toThrow('OpenAI request failed after 2 attempts');

    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('should throw error when API key not configured', async () => {
    delete process.env.OPENAI_API_KEY;

    await expect(
      classifyIntent('Test task', {
        apiKey: undefined,
      })
    ).rejects.toThrow('OpenAI API key not configured');
  });
});
