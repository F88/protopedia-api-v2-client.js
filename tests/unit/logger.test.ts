import { describe, expect, it, vi, afterEach } from 'vitest';

import {
  createLoggerConfig,
  getLoggerMethod,
  getLogLevelValue,
  headersForLogging,
  headersToMaskedObject,
  normaliseLogLevel,
  shouldLog,
  type Logger,
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

  it('uses fallback function when both candidate and fallback are provided but candidate is undefined', () => {
    const fallbackFn = vi.fn();
    const error = vi.fn();

    const partialLogger = {
      error,
      warn: fallbackFn,
      info: undefined,
      debug: undefined,
    } as unknown as Logger;

    const config = createLoggerConfig(partialLogger, undefined);

    // info should fall back to warn (fallbackFn)
    config.logger.info('info via fallback');
    expect(fallbackFn).toHaveBeenCalledWith('info via fallback');

    // debug should also fall back through the chain
    config.logger.debug('debug via fallback');
    expect(fallbackFn).toHaveBeenCalledWith('debug via fallback');
  });

  it('wraps logger methods to handle metadata correctly', () => {
    const errorFn = vi.fn();
    const debugFn = vi.fn();

    const partialLogger = {
      error: errorFn,
      warn: undefined,
      info: undefined,
      debug: debugFn,
    } as unknown as Logger;

    const config = createLoggerConfig(partialLogger, undefined);

    // Call without metadata - should call the underlying function without metadata
    config.logger.error('error without metadata');
    expect(errorFn).toHaveBeenCalledWith('error without metadata');
    expect(errorFn).toHaveBeenCalledTimes(1);

    // Call with metadata - should pass it through
    config.logger.debug('debug with metadata', { key: 'value' });
    expect(debugFn).toHaveBeenCalledWith('debug with metadata', {
      key: 'value',
    });
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

  it('returns false when message level is silent regardless of configured', () => {
    const configured = getLogLevelValue('debug');
    expect(shouldLog(configured, 'silent')).toBe(false);
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

  describe('masking header value', () => {
    const MASKABLE_HEADER_NAME_EXAMPLES = [
      'Authorization',
      'AUTHORIZATION',
      'X-Auth',
      'x-Authentication',
      'WWW-Authenticate',
      'Proxy-Authorization',
      'X-Token',
      'x-api-token',
      'X-AUTH-TOKEN',
    ] as const;

    it.each(MASKABLE_HEADER_NAME_EXAMPLES)(
      'masks %s header from Headers instance',
      (name) => {
        const headers = new Headers({
          [name]: 'secret',
          Accept: 'application/json',
        });
        const result = headersForLogging(headers)!;
        expect(result[name.toLowerCase()]).toBe('***');
        expect(result['accept']).toBe('application/json');
      },
    );

    it.each(MASKABLE_HEADER_NAME_EXAMPLES)(
      'masks %s header from HeadersInit array',
      (name) => {
        const init: HeadersInit = [
          [name, 'secret'],
          ['Content-Type', 'text/plain'],
        ];
        const result = headersForLogging(init)!;
        expect(result[name.toLowerCase()]).toBe('***');
        expect(result['content-type']).toBe('text/plain');
      },
    );

    it.each(MASKABLE_HEADER_NAME_EXAMPLES)(
      'masks %s header from HeadersInit object',
      (name) => {
        const init = { [name]: 'secret', ETag: '123' } as Record<
          string,
          string
        >;
        const result = headersForLogging(init)!;
        expect(result[name.toLowerCase()]).toBe('***');
        expect(result['etag']).toBe('123');
      },
    );
  });
});

describe('headersToMaskedObject', () => {
  it('returns empty object for empty Headers', () => {
    const headers = new Headers();
    const result = headersToMaskedObject(headers);
    expect(result).toEqual({});
  });

  it('preserves non-sensitive header values', () => {
    const headers = new Headers({
      'Content-Type': 'application/json',
      'X-Custom-Header': 'custom-value',
    });
    const result = headersToMaskedObject(headers);
    expect(result).toEqual({
      'content-type': 'application/json',
      'x-custom-header': 'custom-value',
    });
  });

  it('masks values for keys containing token/auth (case-insensitive)', () => {
    const headers = new Headers({
      Authorization: 'Bearer secret',
      'x-api-token': 'xyz',
      Accept: 'application/json',
    });
    const result = headersToMaskedObject(headers);
    expect(result).toEqual({
      authorization: '***',
      'x-api-token': '***',
      accept: 'application/json',
    });
  });

  it('masks when auth appears as a substring in the key', () => {
    const headers = new Headers({
      'X-Authenticated-User': 'alice',
      ETag: '123',
    });
    const result = headersToMaskedObject(headers);
    expect(result).toEqual({
      'x-authenticated-user': '***',
      etag: '123',
    });
  });

  describe('case-insensitive duplicate header names', () => {
    it('set(): last set wins and key is normalised', () => {
      const headers = new Headers();
      headers.set('X-Custom', 'A');
      headers.set('x-custom', 'B');

      const result = headersToMaskedObject(headers);
      expect(result).toEqual({ 'x-custom': 'B' });
    });

    it('append(): values are concatenated and key is normalised', () => {
      const headers = new Headers();
      headers.append('X-Feature', 'one');
      headers.append('x-feature', 'two');

      const result = headersToMaskedObject(headers);
      expect(result).toEqual({ 'x-feature': 'one, two' });
    });

    it('masking still applies after case-insensitive set/append', () => {
      const headers = new Headers();
      headers.set('Authorization', 'Bearer x');
      headers.append('authorization', 'Token y');

      const result = headersToMaskedObject(headers);
      // Whether a single or multiple values, masked field should be '***'
      expect(result).toEqual({ authorization: '***' });
    });
  });
});

describe('createLoggerConfig with console fallbacks', () => {
  const originalConsole = globalThis.console;

  afterEach(() => {
    // restore the original console after each test
    (globalThis as unknown as { console: Console | null }).console =
      originalConsole;
  });

  it('uses NOOP logger when console is not available', () => {
    (globalThis as unknown as { console: unknown }).console =
      null as unknown as Console;
    const cfg = createLoggerConfig(undefined, 'debug');
    expect(typeof cfg.logger.error).toBe('function');
    expect(typeof cfg.logger.warn).toBe('function');
    expect(typeof cfg.logger.info).toBe('function');
    expect(typeof cfg.logger.debug).toBe('function');
    // should not throw when called
    cfg.logger.debug('hello');
    cfg.logger.info('hello');
  });

  it('falls back to error when only console.error exists', () => {
    const error = vi.fn();
    // minimal console
    (globalThis as unknown as { console: unknown }).console = {
      error,
    } as unknown as Console;

    const cfg = createLoggerConfig(undefined, 'debug');

    cfg.logger.warn('warn message', { id: 1 });
    cfg.logger.info('info message');
    cfg.logger.debug('debug message');

    expect(error).toHaveBeenCalledTimes(3);
    expect(error).toHaveBeenNthCalledWith(1, 'warn message', { id: 1 });
    expect(error).toHaveBeenNthCalledWith(2, 'info message');
    expect(error).toHaveBeenNthCalledWith(3, 'debug message');
  });

  it('falls back to warn when info/debug are missing but warn exists', () => {
    const error = vi.fn();
    const warn = vi.fn();
    (globalThis as unknown as { console: unknown }).console = {
      error,
      warn,
    } as unknown as Console;

    const cfg = createLoggerConfig(undefined, 'debug');

    cfg.logger.info('hello'); // info -> warn
    cfg.logger.debug('world'); // debug -> info? (missing) -> warn

    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenNthCalledWith(1, 'hello');
    expect(warn).toHaveBeenNthCalledWith(2, 'world');
    expect(error).not.toHaveBeenCalled();
  });

  it('uses info when available and falls back from debug to info', () => {
    const error = vi.fn();
    const warn = vi.fn();
    const info = vi.fn();
    (globalThis as unknown as { console: unknown }).console = {
      error,
      warn,
      info,
      // debug is intentionally missing
    } as unknown as Console;

    const cfg = createLoggerConfig(undefined, 'debug');

    cfg.logger.info('hi');
    cfg.logger.debug('there'); // debug -> info

    expect(info).toHaveBeenCalledTimes(2);
    expect(info).toHaveBeenNthCalledWith(1, 'hi');
    expect(info).toHaveBeenNthCalledWith(2, 'there');
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('uses fallback function when provided and wraps it', () => {
    const customDebug = vi.fn();
    const logger = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: customDebug,
    };

    const cfg = createLoggerConfig(logger, 'debug');
    cfg.logger.debug('test message', { extra: 'data' });

    expect(customDebug).toHaveBeenCalledWith('test message', { extra: 'data' });
  });
});
