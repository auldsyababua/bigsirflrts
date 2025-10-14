import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { maskSecret, logInfo, logWarn, logError } from '../lib/logging.mjs';

describe('maskSecret', () => {
  it('should mask secrets with length >= 6 showing first/last 2 chars', () => {
    expect(maskSecret('abcdef')).toBe('ab**ef');
    const masked = maskSecret('sk-proj-abcdefghijklmnop');
    expect(masked.startsWith('sk')).toBe(true);
    expect(masked.endsWith('op')).toBe(true);
    expect(masked).toBe('sk********************op');
  });

  it('should return **** for secrets < 6 chars', () => {
    expect(maskSecret('12345')).toBe('****');
    expect(maskSecret('abc')).toBe('****');
    expect(maskSecret('a')).toBe('****');
  });

  it('should return **** for null/undefined/empty', () => {
    expect(maskSecret(null)).toBe('****');
    expect(maskSecret(undefined)).toBe('****');
    expect(maskSecret('')).toBe('****');
  });

  it('should return **** for non-string values', () => {
    expect(maskSecret(123)).toBe('****');
    expect(maskSecret({})).toBe('****');
    expect(maskSecret([])).toBe('****');
  });
});

describe('structured logging', () => {
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log info level messages with JSON structure', () => {
    logInfo('test_event', { foo: 'bar' });

    expect(consoleLogSpy).toHaveBeenCalledOnce();
    const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);

    expect(loggedData).toMatchObject({
      level: 'info',
      event: 'test_event',
      foo: 'bar',
    });
    expect(loggedData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should log warn level messages', () => {
    logWarn('warning_event', { reason: 'test' });

    expect(consoleWarnSpy).toHaveBeenCalledOnce();
    const loggedData = JSON.parse(consoleWarnSpy.mock.calls[0][0]);

    expect(loggedData).toMatchObject({
      level: 'warn',
      event: 'warning_event',
      reason: 'test',
    });
  });

  it('should log error level messages', () => {
    logError('error_event', { error: 'something went wrong' });

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0]);

    expect(loggedData).toMatchObject({
      level: 'error',
      event: 'error_event',
      error: 'something went wrong',
    });
  });

  it('should handle metadata-less log calls', () => {
    logInfo('simple_event');

    expect(consoleLogSpy).toHaveBeenCalledOnce();
    const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);

    expect(loggedData).toMatchObject({
      level: 'info',
      event: 'simple_event',
    });
  });

  it('should redact secrets in object metadata', () => {
    logInfo('test_event', {
      token: 'secret123',
      apiKey: 'key789abc',
      data: 'safe-data',
    });

    const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);

    expect(loggedData.token).toBe('se*****23'); // 9 chars: 2 + 5 + 2
    expect(loggedData.apiKey).toBe('ke*****bc'); // 9 chars: 2 + 5 + 2
    expect(loggedData.data).toBe('safe-data');
  });
});

describe('redactMeta with arrays', () => {
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should recursively redact secrets in array elements', () => {
    const meta = [
      { token: 'secret123', data: 'foo' },
      { password: 'pass456', data: 'bar' },
      { apiKey: 'key789abc', data: 'baz' },
    ];

    logInfo('test_event', meta);
    const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);

    // Verify secrets were redacted
    expect(loggedData[0].token).toBe('se*****23'); // 9 chars: 2 + 5 + 2
    expect(loggedData[1].password).toBe('pa***56'); // 7 chars: 2 + 3 + 2
    expect(loggedData[2].apiKey).toBe('ke*****bc'); // 9 chars: 2 + 5 + 2

    // Verify non-sensitive data remains
    expect(loggedData[0].data).toBe('foo');
    expect(loggedData[1].data).toBe('bar');
    expect(loggedData[2].data).toBe('baz');
  });

  it('should handle nested arrays', () => {
    const meta = [[{ secret: 'nested123' }], { arr: [{ token: 'inner456' }] }];

    logInfo('test_event', meta);
    const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);

    // Verify nested secrets were redacted
    expect(loggedData[0][0].secret).toBe('ne*****23'); // 9 chars: 2 + 5 + 2
    expect(loggedData[1].arr[0].token).toBe('in****56'); // 8 chars: 2 + 4 + 2
  });

  it('should handle mixed arrays with primitives and objects', () => {
    const meta = ['plain string', 42, { token: 'secret789' }, null, { data: 'safe' }];

    logInfo('test_event', meta);
    const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);

    // Verify primitives passed through unchanged
    expect(loggedData[0]).toBe('plain string');
    expect(loggedData[1]).toBe(42);
    expect(loggedData[3]).toBeNull();

    // Verify object with secret was redacted
    expect(loggedData[2].token).toBe('se*****89'); // 9 chars: 2 + 5 + 2

    // Verify safe object passed through
    expect(loggedData[4].data).toBe('safe');
  });

  it('should handle array metadata with object wrapper', () => {
    // When passing array as metadata, wrap it in an object to preserve structure
    const meta = { items: [{ token: 'secret123' }] };

    logInfo('test_event', meta);
    const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);

    // Verify the array is preserved within object structure
    expect(Array.isArray(loggedData.items)).toBe(true);
    expect(loggedData.items[0].token).toBe('se*****23');
  });
});
