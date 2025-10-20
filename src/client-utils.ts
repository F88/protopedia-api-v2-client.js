import type { ListPrototypesParams } from './types/protopedia-api-v2/request.js';

/**
 * Build URLSearchParams for list prototypes API.
 */
export function serializeListPrototypeParams(
  params?: ListPrototypesParams,
): URLSearchParams {
  const search = new URLSearchParams();
  if (!params) {
    return search;
  }

  const put = (
    key: string,
    value: string | number | boolean | null | undefined,
  ) => {
    if (value == null) {
      return;
    }
    if (typeof value === 'boolean') {
      search.set(key, value ? 'true' : 'false');
      return;
    }
    search.set(key, String(value));
  };

  // Parameters
  put('userNm', params.userNm);
  put('materialNm', params.materialNm);
  put('tagNm', params.tagNm);
  put('eventNm', params.eventNm);
  put('eventId', params.eventId);
  put('awardNm', params.awardNm);
  put('prototypeId', params.prototypeId);
  put('status', params.status);
  put('limit', params.limit);
  put('offset', params.offset);

  return search;
}

/**
 * Merge multiple header sources into a single Headers object.
 */
export function mergeHeaders(
  ...sources: Array<HeadersInit | undefined>
): Headers {
  const headers = new Headers();
  for (const source of sources) {
    if (!source) {
      continue;
    }
    new Headers(source).forEach((value, key) => {
      headers.set(key, value);
    });
  }
  return headers;
}

/**
 * Convert Headers to a plain object with lower-cased header names as keys.
 */
export function headersToPlainObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

/**
 * Remove a trailing slash from a URL/base URL-like string.
 */
export function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

/**
 * Normalize timeout values by ensuring non-negative finite numbers.
 */
export function toTimeout(
  candidate: number | undefined,
  fallback: number,
): number {
  if (
    typeof candidate === 'number' &&
    Number.isFinite(candidate) &&
    candidate >= 0
  ) {
    return candidate;
  }
  return fallback;
}

/**
 * Create a DOMException representing a timeout.
 */
export function createTimeoutError(timeoutMs: number): DOMException {
  return new DOMException(
    `Request timed out after ${timeoutMs} ms`,
    'TimeoutError',
  );
}

/**
 * Narrower check for Fetch AbortError.
 */
export function isAbortError(error: unknown): error is DOMException {
  return error instanceof DOMException && error.name === 'AbortError';
}
