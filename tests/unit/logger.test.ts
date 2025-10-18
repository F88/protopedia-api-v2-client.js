import { describe, expect, it, vi } from 'vitest';

import type { Logger } from '../../types/client/log.js';
import {
  createLoggerConfig,
  getLoggerMethod,
  getLogLevelValue,
  headersForLogging,
  normaliseLogLevel,
  shouldLog,
} from '../../src/logger.js';

describe('createLoggerConfig', () => {
  it('sanitises logger methods and defaults to error level', () => {
    const error = vi.fn();
    const debug = vi.fn();

    const partialLogger = {
      error,
      warn: undefined,
      info: undefined,
      debug,
    } as unknown as Logger;

    const config = createLoggerConfig(partialLogger, undefined);

    config.logger.warn('warn message', { id: 1 });
    expect(error).toHaveBeenCalledWith('warn message', { id: 1 });

    config.logger.debug('debug message');
    expect(debug).toHaveBeenCalledWith('debug message');

    expect(config.level).toBe('error');
    expect(config.levelValue).toBe(getLogLevelValue('error'));
  });
});

describe('shouldLog', () => {
  it('allows messages at or below the configured level', () => {
    const configured = getLogLevelValue('debug');
    expect(shouldLog(configured, 'debug')).toBe(true);
    expect(shouldLog(configured, 'info')).toBe(true);
    expect(shouldLog(configured, 'error')).toBe(true);
  });

  it('filters messages above the configured level', () => {
    const configured = getLogLevelValue('info');
    expect(shouldLog(configured, 'debug')).toBe(false);
  });

  it('filters everything when level is silent', () => {
    const configured = getLogLevelValue('silent');
    expect(shouldLog(configured, 'error')).toBe(false);
    expect(shouldLog(configured, 'debug')).toBe(false);
  });
});

describe('normaliseLogLevel', () => {
  it('normalises supported inputs', () => {
    expect(normaliseLogLevel(' DEBUG ')).toBe('debug');
    expect(normaliseLogLevel('warning')).toBe('warn');
    expect(normaliseLogLevel('silent')).toBe('silent');
  });

  it('returns undefined for unsupported inputs', () => {
    expect(normaliseLogLevel('')).toBeUndefined();
    expect(normaliseLogLevel('verbose')).toBeUndefined();
    expect(normaliseLogLevel(undefined)).toBeUndefined();
  });
});

describe('getLoggerMethod', () => {
  it('returns the matching logger method', () => {
    const logger = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    };

    const method = getLoggerMethod(logger, 'info');
    method('hello');

    expect(logger.info).toHaveBeenCalledWith('hello');
  });

  it('passes metadata through to the logger method', () => {
    const logger = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    };

    const method = getLoggerMethod(logger, 'debug');
    const metadata = { requestId: 'req-1' };
    method('hello', metadata);

    expect(logger.debug).toHaveBeenCalledWith('hello', metadata);
  });
});

describe('headersForLogging', () => {
  it('returns undefined when headers are not provided', () => {
    expect(headersForLogging(undefined)).toBeUndefined();
  });

  it('masks token headers from Headers instance', () => {
    const headers = new Headers({
      Authorization: 'Bearer abc',
      'X-Token': 'secret',
      'X-Api-Token': 'also-secret',
      Accept: 'application/json',
    });

    const result = headersForLogging(headers);

    expect(result).toEqual({
      authorization: 'Bearer abc',
      'x-token': '***',
      'x-api-token': '***',
      accept: 'application/json',
    });
  });

  it('masks token headers from HeadersInit values', () => {
    const init: HeadersInit = [
      ['x-token', 'secret'],
      ['content-type', 'application/json'],
    ];

    const result = headersForLogging(init);

    expect(result).toEqual({
      'x-token': '***',
      'content-type': 'application/json',
    });
  });
});

describe('headersToObject', () => {
  it('converts Headers instance to plain object', () => {
    const headers = new Headers({
      'Content-Type': 'application/json',
      'X-Custom-Header': 'custom-value',
    });

    const result = headersForLogging(headers);

    expect(result).toEqual({
      'content-type': 'application/json',
      'x-custom-header': 'custom-value',
    });
  });

  it('masks token headers from Headers instance', () => {
    const headers = new Headers({
      Authorization: 'Bearer abc',
      'X-Token': 'secret',
      'X-Api-Token': 'also-secret',
      Accept: 'application/json',
    });

    const result = headersForLogging(headers);

    expect(result).toEqual({
      authorization: 'Bearer abc',
      'x-token': '***',
      'x-api-token': '***',
      accept: 'application/json',
    });
  });
});
