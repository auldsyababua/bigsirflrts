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
});
