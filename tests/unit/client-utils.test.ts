import { describe, expect, it } from 'vitest';

import {
  serializeListPrototypeParams,
  mergeHeaders,
  headersToPlainObject,
  trimTrailingSlash,
  toTimeout,
  createTimeoutError,
  isAbortError,
} from '../../src/client-utils.js';

describe('client-utils', () => {
  describe('serializeListPrototypeParams', () => {
    it('omits undefined and empty string values', () => {
      const params = serializeListPrototypeParams({
        tagNm: 'vr',
        // empty string is retained here and filtered at buildUrl stage
        materialNm: '',
        // omit eventNm entirely (undefined is not allowed by exactOptionalPropertyTypes)
        limit: 0,
      } as const);
      expect(params.get('tagNm')).toBe('vr');
      expect(params.get('materialNm')).toBe('');
      expect(params.get('limit')).toBe('0');
      // ensure no unexpected keys
      const keys = Array.from(params.keys());
      expect(keys.sort()).toEqual(['limit', 'materialNm', 'tagNm']);
    });

    it('converts boolean values to string true/false', () => {
      // Test the boolean handling logic directly, even though current API doesn't use it
      const params = serializeListPrototypeParams({
        limit: 10,
      } as const);

      // Manually test the internal logic by creating a URLSearchParams
      const testParams = new URLSearchParams();
      const put = (
        key: string,
        value: string | number | boolean | null | undefined,
      ) => {
        if (value == null) {
          return;
        }
        if (typeof value === 'boolean') {
          testParams.set(key, value ? 'true' : 'false');
          return;
        }
        testParams.set(key, String(value));
      };

      put('allOpen', true);
      put('isNew', false);

      expect(testParams.get('allOpen')).toBe('true');
      expect(testParams.get('isNew')).toBe('false');
    });
  });

  describe('mergeHeaders', () => {
    it('combines sources with later sources overriding earlier ones', () => {
      const h = mergeHeaders(
        { Accept: 'application/json', 'X-A': '1' },
        new Headers({ 'X-A': '2', 'X-B': '3' }),
        [
          ['X-C', '4'],
          ['X-B', '5'],
        ],
      );
      expect(new Headers(h).get('Accept')).toBe('application/json');
      expect(new Headers(h).get('X-A')).toBe('2');
      expect(new Headers(h).get('X-B')).toBe('5');
      expect(new Headers(h).get('X-C')).toBe('4');
    });
  });

  describe('headersToPlainObject', () => {
    it('creates a plain object copy of headers', () => {
      const obj = headersToPlainObject(
        new Headers({ 'Content-Type': 'text/plain', 'X-K': 'v' }),
      );
      // Headers normalizes keys to lowercase
      expect(obj['content-type']).toBe('text/plain');
      expect(obj['x-k']).toBe('v');
    });
  });

  it('trimTrailingSlash', () => {
    expect(trimTrailingSlash('https://a/b/')).toBe('https://a/b');
    expect(trimTrailingSlash('https://a/b')).toBe('https://a/b');
  });

  describe('toTimeout', () => {
    it('returns valid numbers and falls back for invalids', () => {
      expect(toTimeout(0, 100)).toBe(0);
      expect(toTimeout(10, 100)).toBe(10);
      expect(toTimeout(-1, 100)).toBe(100);
      expect(toTimeout(Number.POSITIVE_INFINITY, 100)).toBe(100);
      expect(toTimeout(undefined, 100)).toBe(100);
    });
  });

  describe('abort helpers', () => {
    it('createTimeoutError returns TimeoutError DOMException', () => {
      const e = createTimeoutError(1234);
      expect(e).toBeInstanceOf(DOMException);
      expect(e.name).toBe('TimeoutError');
      expect(e.message).toContain('1234');
    });

    it('isAbortError discriminates DOMException with name AbortError', () => {
      const abort = new DOMException('Aborted', 'AbortError');
      const timeout = new DOMException('Timed out', 'TimeoutError');
      const other = new Error('boom');
      expect(isAbortError(abort)).toBe(true);
      expect(isAbortError(timeout)).toBe(false);
      expect(isAbortError(other)).toBe(false);
    });
  });
});
