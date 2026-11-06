import { describe, expect, it, vi } from 'vitest';

import {
  createProtoPediaClient,
  ProtoPediaApiClient,
} from '../../src/client.js';
import { ProtoPediaApiError } from '../../src/errors.js';
import type { Logger } from '../../src/logger.js';

type FetchFn = typeof fetch;

const BASE_URL = 'https://example.com/api/v2';

const SAMPLE_API_RESPONSE = {
  metadata: {
    status: 200,
    title: 'OK',
    detail: 'The request sent by the client was successful.',
  },
  count: 1,
  links: {
    self: {
      href: '/v2/api/protopedia/list',
    },
  },
  results: [
    {
      id: 42,
      prototypeNm: 'Test Work',
      summary: 'Summary',
      mainUrl: 'https://example.com/prototypes/42',
      status: 2,
    },
  ],
} as const;

function createJsonResponse(payload: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  });
}

function createTestLogger() {
  const error = vi.fn<(message: string, metadata?: unknown) => void>();
  const warn = vi.fn<(message: string, metadata?: unknown) => void>();
  const info = vi.fn<(message: string, metadata?: unknown) => void>();
  const debug = vi.fn<(message: string, metadata?: unknown) => void>();

  const logger: Logger = {
    error,
    warn,
    info,
    debug,
  };

  return { logger, error, warn, info, debug };
}

/**
 * Creates a fetch mock that never resolves and rejects when its signal aborts.
 *
 * - 'reason': rejects with `signal.reason`, as Node.js fetch does
 * - 'abortError': rejects with a generic AbortError, ignoring the reason
 */
function createAbortAwareFetch(rejectWith: 'reason' | 'abortError') {
  return vi.fn<FetchFn>(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        const signal = init?.signal as AbortSignal | undefined;
        const onAbort = () =>
          reject(
            rejectWith === 'reason'
              ? signal?.reason
              : new DOMException('Aborted', 'AbortError'),
          );
        if (signal?.aborted) {
          onAbort();
          return;
        }
        signal?.addEventListener('abort', onAbort, { once: true });
      }),
  );
}

describe('ProtoPediaApiClient', () => {
  describe('constructor', () => {
    it('sets default values for optional parameters', () => {
      const client = new ProtoPediaApiClient({});

      expect(client['fetchFn']).toBe(globalThis.fetch);
      expect(client['token']).toBeUndefined();
      expect(client['baseUrl']).toBe('https://protopedia.net/v2/api');
      expect(client['timeoutMs']).toBe(60_000);
      expect(client['logger']).toBeDefined();
      expect(client['logLevel']).toBe('error');
      expect(client['logLevelValue']).toBe(0);
    });

    it('throws when no fetch implementation is available', () => {
      const originalFetch = globalThis.fetch;
      // temporarily remove global fetch
      Reflect.set(globalThis, 'fetch', undefined);
      try {
        expect(() => new ProtoPediaApiClient({})).toThrow(
          'fetch is not available. Provide a fetch implementation in options.fetch.',
        );
      } finally {
        // restore
        Reflect.set(globalThis, 'fetch', originalFetch);
      }
    });

    it('normalizes timeoutMs via toTimeout (negative and Infinity fall back, zero allowed)', () => {
      const { logger } = createTestLogger();
      const c1 = new ProtoPediaApiClient({ timeoutMs: -1, logger });
      expect(c1['timeoutMs']).toBe(60_000);

      const c2 = new ProtoPediaApiClient({ timeoutMs: 0, logger });
      expect(c2['timeoutMs']).toBe(0);

      const c3 = new ProtoPediaApiClient({
        timeoutMs: Number.POSITIVE_INFINITY,
        logger,
      });
      expect(c3['timeoutMs']).toBe(60_000);
    });
  });

  describe('listPrototypes', () => {
    it('builds query parameters and returns API v2 response as-is', async () => {
      const fetchMock = vi.fn<FetchFn>(() =>
        Promise.resolve(createJsonResponse(SAMPLE_API_RESPONSE)),
      );
      const { logger } = createTestLogger();

      const client = new ProtoPediaApiClient({
        token: 'token-123',
        baseUrl: BASE_URL,
        fetch: fetchMock,
        logger,
        logLevel: 'silent',
      });

      const result = await client.listPrototypes(
        {
          tagNm: 'vr',
          limit: 3,
          offset: 0,
        },
        {
          headers: {
            'X-Custom': 'value',
          },
        },
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);

      const call = fetchMock.mock.calls[0];
      if (!call) {
        throw new Error('Fetch was not called');
      }

      const [requestUrl, requestInit] = call;
      expect(requestUrl).toBe(
        `${BASE_URL}/prototype/list?tagNm=vr&limit=3&offset=0`,
      );

      const headers = new Headers(requestInit?.headers ?? {});
      expect(headers.get('Authorization')).toBe('Bearer token-123');
      expect(headers.get('X-Custom')).toBe('value');
      expect(headers.get('Accept')).toBe('application/json');

      expect(result.metadata).toEqual(SAMPLE_API_RESPONSE.metadata);
      expect(result.count).toBe(1);
      expect(result.links).toEqual(SAMPLE_API_RESPONSE.links);
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results?.length).toBe(1);
      expect(result.results?.[0]?.id).toBe(42);
      expect(result.results?.[0]?.prototypeNm).toBe('Test Work');
    });

    it('throws ProtoPediaApiError for non-success responses', async () => {
      const fetchMock = vi.fn<FetchFn>(() =>
        Promise.resolve(
          new Response('unauthorised', {
            status: 401,
            statusText: 'Unauthorized',
            headers: {
              'Content-Type': 'text/plain',
            },
          }),
        ),
      );

      const { logger } = createTestLogger();

      const client = new ProtoPediaApiClient({
        token: 'token-123',
        baseUrl: BASE_URL,
        fetch: fetchMock,
        logger,
        logLevel: 'silent',
      });

      await expect(client.listPrototypes()).rejects.toBeInstanceOf(
        ProtoPediaApiError,
      );
    });

    it('logs HTTP activity and response payloads when log level allows it', async () => {
      const fetchMock = vi.fn<FetchFn>(() =>
        Promise.resolve(createJsonResponse(SAMPLE_API_RESPONSE)),
      );
      const { logger, debug } = createTestLogger();

      const client = new ProtoPediaApiClient({
        token: 'token-123',
        baseUrl: BASE_URL,
        fetch: fetchMock,
        logger,
        logLevel: 'debug',
      });

      await client.listPrototypes({ tagNm: 'vr' });

      expect(debug).toHaveBeenCalledWith(
        'HTTP request',
        expect.objectContaining({
          method: 'GET',
          url: `${BASE_URL}/prototype/list?tagNm=vr`,
        }),
      );
      expect(debug).toHaveBeenCalledWith(
        'HTTP response',
        expect.objectContaining({
          status: 200,
          url: `${BASE_URL}/prototype/list?tagNm=vr`,
        }),
      );
      expect(debug).toHaveBeenCalledWith(
        'listPrototype response payload',
        SAMPLE_API_RESPONSE,
      );
    });

    it('filters logs according to the configured level', async () => {
      const fetchMock = vi.fn<FetchFn>(() =>
        Promise.resolve(
          new Response('error', {
            status: 500,
            statusText: 'Internal Server Error',
            headers: {
              'Content-Type': 'text/plain',
            },
          }),
        ),
      );
      const { logger, error, warn, info, debug } = createTestLogger();

      const client = new ProtoPediaApiClient({
        token: 'token-123',
        baseUrl: BASE_URL,
        fetch: fetchMock,
        logger,
        logLevel: 'error',
      });

      await expect(client.listPrototypes()).rejects.toBeInstanceOf(
        ProtoPediaApiError,
      );

      expect(error).toHaveBeenCalledWith(
        'API request failed',
        expect.objectContaining({
          status: 500,
          req: expect.objectContaining({ method: 'GET' }),
        }),
      );
      expect(warn).not.toHaveBeenCalled();
      expect(info).not.toHaveBeenCalled();
      expect(debug).not.toHaveBeenCalled();
    });

    it('allows overriding the log level per request', async () => {
      const fetchMock = vi.fn<FetchFn>(() =>
        Promise.resolve(createJsonResponse(SAMPLE_API_RESPONSE)),
      );
      const { logger, debug } = createTestLogger();

      const client = new ProtoPediaApiClient({
        token: 'token-123',
        baseUrl: BASE_URL,
        fetch: fetchMock,
        logger,
        logLevel: 'silent',
      });

      await client.listPrototypes(undefined, { logLevel: 'debug' });

      expect(debug).toHaveBeenCalledWith(
        'HTTP request',
        expect.objectContaining({
          method: 'GET',
          url: `${BASE_URL}/prototype/list`,
        }),
      );
      expect(debug).toHaveBeenCalledWith(
        'listPrototype response payload',
        SAMPLE_API_RESPONSE,
      );
    });

    it('throws ProtoPediaApiError when JSON parsing fails and includes raw body', async () => {
      // Fake response that looks ok but .json() rejects and .text() returns raw payload
      const fakeOkBadJsonResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        url: `${BASE_URL}/prototype/list?tagNm=bad`,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: () => Promise.reject(new SyntaxError('Unexpected token')), // simulate invalid JSON
        text: () => Promise.resolve('not-json'),
      } as unknown as Response;

      const fetchMock = vi.fn<FetchFn>(() =>
        Promise.resolve(fakeOkBadJsonResponse),
      );
      const { logger } = createTestLogger();

      const client = new ProtoPediaApiClient({
        token: 'token-123',
        baseUrl: BASE_URL,
        fetch: fetchMock,
        logger,
        logLevel: 'silent',
      });

      await expect(
        client.listPrototypes({ tagNm: 'bad' }),
      ).rejects.toMatchObject({
        name: 'ProtoPediaApiError',
        message: expect.stringContaining(
          'Failed to parse listPrototype response as JSON',
        ),
        status: 200,
        body: 'not-json',
      });
    });

    it('throws ProtoPediaApiError for invalid JSON in a real Response', async () => {
      const fetchMock = vi.fn<FetchFn>(() =>
        Promise.resolve(new Response('not-json', { status: 200 })),
      );
      const { logger } = createTestLogger();

      const client = new ProtoPediaApiClient({
        token: 'token-123',
        baseUrl: BASE_URL,
        fetch: fetchMock,
        logger,
        logLevel: 'silent',
      });

      const error = await client
        .listPrototypes({ tagNm: 'bad' })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ProtoPediaApiError);
      expect(error).toMatchObject({
        message: 'Failed to parse listPrototype response as JSON',
        status: 200,
        body: 'not-json',
        cause: expect.any(SyntaxError),
      });
    });

    it('logs a JSON parse failure without the response body', async () => {
      const { logger, error } = createTestLogger();
      const client = new ProtoPediaApiClient({
        token: 't',
        baseUrl: BASE_URL,
        fetch: vi.fn<FetchFn>(() =>
          Promise.resolve(new Response('not-json', { status: 200 })),
        ),
        logger,
        logLevel: 'error',
      });

      await expect(client.listPrototypes()).rejects.toBeInstanceOf(
        ProtoPediaApiError,
      );

      expect(error).toHaveBeenCalledTimes(1);
      expect(error).toHaveBeenCalledWith(
        'Failed to parse listPrototype response as JSON',
        expect.objectContaining({ method: 'GET', status: 200 }),
      );
      expect(JSON.stringify(error.mock.calls)).not.toContain('not-json');
    });

    it('rethrows the original error when reading the response body fails', async () => {
      const readError = new Error('body read failed');
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"results":['));
          controller.error(readError);
        },
      });
      const fetchMock = vi.fn<FetchFn>(() =>
        Promise.resolve(new Response(stream, { status: 200 })),
      );
      const { logger } = createTestLogger();

      const client = new ProtoPediaApiClient({
        token: 'token-123',
        baseUrl: BASE_URL,
        fetch: fetchMock,
        logger,
        logLevel: 'silent',
      });

      await expect(client.listPrototypes({ tagNm: 'x' })).rejects.toBe(
        readError,
      );
    });

    it('builds headers including X-Client-User-Agent and allows override per request', async () => {
      const fetchMock = vi.fn<FetchFn>(() =>
        Promise.resolve(createJsonResponse(SAMPLE_API_RESPONSE)),
      );
      const { logger } = createTestLogger();

      const client = new ProtoPediaApiClient({
        token: 'token-123',
        baseUrl: BASE_URL,
        fetch: fetchMock,
        userAgent: 'UnitTest-UA/1.0',
        logger,
        logLevel: 'silent',
      });

      await client.listPrototypes(
        { tagNm: 'ua' },
        {
          headers: {
            'X-Client-User-Agent': 'Override-UA/2.0',
          },
        },
      );

      const call = fetchMock.mock.calls[0];
      if (!call) {
        throw new Error('Fetch was not called');
      }
      const [, init] = call;
      const headers = new Headers(init?.headers ?? {});
      // Request option should override client-configured UA header
      expect(headers.get('X-Client-User-Agent')).toBe('Override-UA/2.0');
      expect(headers.get('Authorization')).toBe('Bearer token-123');
    });

    it('uses JSON body in ProtoPediaApiError when error response is application/json', async () => {
      const errorBody = { error: 'bad_request', message: 'nope' } as const;
      const fetchMock = vi.fn<FetchFn>(() =>
        Promise.resolve(
          new Response(JSON.stringify(errorBody), {
            status: 400,
            statusText: 'Bad Request',
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      );

      const { logger } = createTestLogger();
      const client = new ProtoPediaApiClient({
        token: 't',
        baseUrl: BASE_URL,
        fetch: fetchMock,
        logger,
        logLevel: 'silent',
      });

      await expect(client.listPrototypes()).rejects.toMatchObject({
        name: 'ProtoPediaApiError',
        status: 400,
        body: errorBody,
      });
    });

    it('propagates headers on JSON error responses', async () => {
      const errorBody = { error: 'bad_request', message: 'nope' } as const;
      const fetchMock = vi.fn<FetchFn>(() =>
        Promise.resolve(
          new Response(JSON.stringify(errorBody), {
            status: 400,
            statusText: 'Bad Request',
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'X-Custom': 'abc',
            },
          }),
        ),
      );

      const { logger } = createTestLogger();
      const client = new ProtoPediaApiClient({
        token: 't',
        baseUrl: BASE_URL,
        fetch: fetchMock,
        logger,
        logLevel: 'silent',
      });

      try {
        await client.listPrototypes();
        expect.fail('should have thrown');
      } catch (e) {
        const err = e as ProtoPediaApiError;
        expect(err).toBeInstanceOf(ProtoPediaApiError);
        expect(err.status).toBe(400);
        expect(err.headers['content-type']).toContain('application/json');
        expect(err.headers['x-custom']).toBe('abc');
      }
    });

    it('uses text fallback when Content-Type is application/json but json() fails', async () => {
      const failingJsonResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        url: `${BASE_URL}/prototype/list`,
        headers: new Headers({
          'Content-Type': 'application/json; charset=utf-8',
        }),
        json: () => Promise.reject(new Error('bad json')),
        text: () => Promise.resolve('fallback text body'),
        clone: () => failingJsonResponse as unknown as Response,
      } as unknown as Response;

      const fetchMock = vi.fn<FetchFn>(() =>
        Promise.resolve(failingJsonResponse),
      );

      const { logger } = createTestLogger();
      const client = new ProtoPediaApiClient({
        token: 't',
        baseUrl: BASE_URL,
        fetch: fetchMock,
        logger,
        logLevel: 'silent',
      });

      await expect(client.listPrototypes()).rejects.toMatchObject({
        name: 'ProtoPediaApiError',
        status: 500,
        body: 'fallback text body',
      });
    });

    it('throws TimeoutError even when fetch rejects with a generic AbortError', async () => {
      // Abort-aware fetch mock: rejects with AbortError when the provided signal aborts
      const fetchMock = vi.fn<FetchFn>(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            const signal = init?.signal as AbortSignal | undefined;
            const onAbort = () =>
              reject(new DOMException('Aborted', 'AbortError'));
            if (signal?.aborted) {
              onAbort();
              return;
            }
            signal?.addEventListener('abort', onAbort, { once: true });
          }),
      );

      const { logger } = createTestLogger();
      const client = new ProtoPediaApiClient({
        token: 'token-123',
        baseUrl: BASE_URL,
        fetch: fetchMock,
        timeoutMs: 10,
        logger,
        logLevel: 'silent',
      });

      await expect(client.listPrototypes()).rejects.toMatchObject({
        name: 'TimeoutError',
      });
    });

    it('throws TimeoutError and logs a timeout error when the client timeout fires', async () => {
      // Fetch mock that rejects with the abort reason, as Node.js fetch does
      const fetchMock = vi.fn<FetchFn>(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            const signal = init?.signal as AbortSignal | undefined;
            const onAbort = () => reject(signal?.reason);
            if (signal?.aborted) {
              onAbort();
              return;
            }
            signal?.addEventListener('abort', onAbort, { once: true });
          }),
      );

      const { logger, error } = createTestLogger();
      const client = new ProtoPediaApiClient({
        token: 't',
        baseUrl: BASE_URL,
        fetch: fetchMock,
        timeoutMs: 10,
        logger,
        logLevel: 'error',
      });

      await expect(client.listPrototypes()).rejects.toMatchObject({
        name: 'TimeoutError',
        message: 'Request timed out after 10 ms',
      });
      expect(error).toHaveBeenCalledWith(
        'HTTP request timed out',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(error).not.toHaveBeenCalledWith(
        'HTTP request threw an unexpected error',
        expect.anything(),
      );
    });

    it('propagates caller abort reason when aborted by caller', async () => {
      const fetchMock = vi.fn<FetchFn>(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            const signal = init?.signal as AbortSignal | undefined;
            if (signal?.aborted) {
              reject(new DOMException('Aborted', 'AbortError'));
              return Promise.resolve();
            }
            const onAbort = () =>
              reject(new DOMException('Aborted', 'AbortError'));
            signal?.addEventListener('abort', onAbort, { once: true });
            return Promise.resolve();
          }),
      );

      const { logger } = createTestLogger();
      const client = new ProtoPediaApiClient({
        token: 't',
        baseUrl: BASE_URL,
        fetch: fetchMock,
        timeoutMs: 5_000, // long enough to ensure caller abort path is taken
        logger,
        logLevel: 'silent',
      });

      const controller = new AbortController();
      const reason = new Error('caller-aborted');
      controller.abort(reason);

      await expect(
        client.listPrototypes(undefined, { signal: controller.signal }),
      ).rejects.toBe(reason);
    });

    describe('while the response body is being read', () => {
      // Resolves at the headers and stalls the body, erroring the stream on
      // abort, as a real fetch does.
      const createStalledBodyFetch = (onResponse?: () => void, status = 200) =>
        vi.fn<FetchFn>((_url, init) => {
          const signal = init?.signal as AbortSignal;
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('{"results":['));
              signal.addEventListener(
                'abort',
                () => controller.error(signal.reason),
                { once: true },
              );
            },
          });
          onResponse?.();
          return Promise.resolve(
            new Response(stream, {
              status,
              headers: { 'Content-Type': 'application/json' },
            }),
          );
        });

      const createSlowBodyFetch = (delayMs: number) =>
        vi.fn<FetchFn>(() => {
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              setTimeout(() => {
                controller.enqueue(new TextEncoder().encode('{"results":[]}'));
                controller.close();
              }, delayMs);
            },
          });
          return Promise.resolve(new Response(stream, { status: 200 }));
        });

      it('rejects listPrototypes with the abort reason when the caller aborts', async () => {
        const controller = new AbortController();
        const reason = new Error('caller-aborted');
        const { logger, warn } = createTestLogger();
        const client = new ProtoPediaApiClient({
          token: 't',
          baseUrl: BASE_URL,
          fetch: createStalledBodyFetch(() => {
            setTimeout(() => controller.abort(reason), 0);
          }),
          timeoutMs: 0,
          logger,
          logLevel: 'warn',
        });

        await expect(
          client.listPrototypes(undefined, { signal: controller.signal }),
        ).rejects.toBe(reason);
        expect(warn).toHaveBeenCalledWith(
          'HTTP request aborted by caller',
          expect.objectContaining({ reason }),
        );
      });

      it('rejects downloadPrototypesTsv with the abort reason when the caller aborts', async () => {
        const controller = new AbortController();
        const reason = new Error('caller-aborted');
        const client = new ProtoPediaApiClient({
          token: 't',
          baseUrl: BASE_URL,
          fetch: createStalledBodyFetch(() => {
            setTimeout(() => controller.abort(reason), 0);
          }),
          timeoutMs: 0,
          logLevel: 'silent',
        });

        await expect(
          client.downloadPrototypesTsv(undefined, {
            signal: controller.signal,
          }),
        ).rejects.toBe(reason);
      });

      it('rejects listPrototypes with TimeoutError when timeoutMs expires', async () => {
        const { logger, error } = createTestLogger();
        const client = new ProtoPediaApiClient({
          token: 't',
          baseUrl: BASE_URL,
          fetch: createStalledBodyFetch(),
          timeoutMs: 10,
          logger,
          logLevel: 'error',
        });

        await expect(client.listPrototypes()).rejects.toMatchObject({
          name: 'TimeoutError',
          message: 'Request timed out after 10 ms',
        });
        expect(error).toHaveBeenCalledWith(
          'HTTP request timed out',
          expect.objectContaining({ method: 'GET' }),
        );
      });

      it('rejects downloadPrototypesTsv with TimeoutError when timeoutMs expires', async () => {
        const client = new ProtoPediaApiClient({
          token: 't',
          baseUrl: BASE_URL,
          fetch: createStalledBodyFetch(),
          timeoutMs: 10,
          logLevel: 'silent',
        });

        await expect(client.downloadPrototypesTsv()).rejects.toMatchObject({
          name: 'TimeoutError',
        });
      });

      it('succeeds when the body arrives within timeoutMs', async () => {
        const fetchMock = createSlowBodyFetch(10);
        const client = new ProtoPediaApiClient({
          token: 't',
          baseUrl: BASE_URL,
          fetch: fetchMock,
          timeoutMs: 1_000,
          logLevel: 'silent',
        });

        await expect(client.listPrototypes()).resolves.toEqual({
          results: [],
        });
      });

      it('does not limit the body read when timeoutMs is 0', async () => {
        const client = new ProtoPediaApiClient({
          token: 't',
          baseUrl: BASE_URL,
          fetch: createSlowBodyFetch(30),
          timeoutMs: 0,
          logLevel: 'silent',
        });

        await expect(client.listPrototypes()).resolves.toEqual({
          results: [],
        });
      });

      it('leaves no timer running after the call finishes', async () => {
        vi.useFakeTimers();
        try {
          const client = new ProtoPediaApiClient({
            token: 't',
            baseUrl: BASE_URL,
            fetch: vi.fn<FetchFn>(() =>
              Promise.resolve(new Response('{"results":[]}', { status: 200 })),
            ),
            timeoutMs: 1_000,
            logLevel: 'silent',
          });

          await client.listPrototypes();

          expect(vi.getTimerCount()).toBe(0);
        } finally {
          vi.useRealTimers();
        }
      });

      it('leaves no timer running after a failed call', async () => {
        vi.useFakeTimers();
        try {
          const client = new ProtoPediaApiClient({
            token: 't',
            baseUrl: BASE_URL,
            fetch: vi.fn<FetchFn>(() =>
              Promise.reject(new TypeError('fetch failed')),
            ),
            timeoutMs: 1_000,
            logLevel: 'silent',
          });

          await expect(client.listPrototypes()).rejects.toThrow('fetch failed');

          expect(vi.getTimerCount()).toBe(0);
        } finally {
          vi.useRealTimers();
        }
      });

      it('stops the timer before parsing JSON', async () => {
        vi.useFakeTimers();
        const timerCounts: number[] = [];
        const realParse = JSON.parse;
        const parseSpy = vi
          .spyOn(JSON, 'parse')
          .mockImplementation((...args: Parameters<typeof JSON.parse>) => {
            timerCounts.push(vi.getTimerCount());
            return realParse(...args) as unknown;
          });
        try {
          const client = new ProtoPediaApiClient({
            token: 't',
            baseUrl: BASE_URL,
            fetch: vi.fn<FetchFn>(() =>
              Promise.resolve(new Response('{"results":[]}', { status: 200 })),
            ),
            timeoutMs: 1_000,
            logLevel: 'silent',
          });

          await client.listPrototypes();

          expect(timerCounts).toEqual([0]);
        } finally {
          parseSpy.mockRestore();
          vi.useRealTimers();
        }
      });

      it('logs the received body size without the body', async () => {
        const { logger, debug } = createTestLogger();
        const client = new ProtoPediaApiClient({
          token: 't',
          baseUrl: BASE_URL,
          fetch: vi.fn<FetchFn>(() =>
            Promise.resolve(new Response('{"results":[]}', { status: 200 })),
          ),
          logger,
          logLevel: 'debug',
        });

        await client.listPrototypes();

        expect(debug).toHaveBeenCalledWith('HTTP response body received', {
          method: 'GET',
          url: expect.stringContaining('/prototype/list') as string,
          status: 200,
          length: 14,
        });
      });

      it('rethrows a runtime failure with its cause and logs it', async () => {
        // Node.js fetch fails like this when undici gives up on the body.
        const runtimeError = new TypeError('terminated', {
          cause: Object.assign(new Error('Body Timeout Error'), {
            code: 'UND_ERR_BODY_TIMEOUT',
          }),
        });
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.error(runtimeError);
          },
        });
        const { logger, error } = createTestLogger();
        const client = new ProtoPediaApiClient({
          token: 't',
          baseUrl: BASE_URL,
          fetch: vi.fn<FetchFn>(() =>
            Promise.resolve(new Response(stream, { status: 200 })),
          ),
          timeoutMs: 1_000,
          logger,
          logLevel: 'error',
        });

        await expect(client.listPrototypes()).rejects.toBe(runtimeError);
        expect(error).toHaveBeenCalledWith(
          'HTTP request threw an unexpected error',
          expect.objectContaining({ error: runtimeError }),
        );
      });

      describe('of an error response', () => {
        it('rejects with TimeoutError when timeoutMs expires', async () => {
          const { logger, error } = createTestLogger();
          const client = new ProtoPediaApiClient({
            token: 't',
            baseUrl: BASE_URL,
            fetch: createStalledBodyFetch(undefined, 500),
            timeoutMs: 10,
            logger,
            logLevel: 'error',
          });

          await expect(client.listPrototypes()).rejects.toMatchObject({
            name: 'TimeoutError',
          });
          expect(error).toHaveBeenCalledWith(
            'HTTP request timed out',
            expect.anything(),
          );
          expect(error).not.toHaveBeenCalledWith(
            'API request failed',
            expect.anything(),
          );
        });

        it('rejects with the abort reason when the caller aborts', async () => {
          const controller = new AbortController();
          const reason = new Error('caller-aborted');
          const { logger, warn } = createTestLogger();
          const client = new ProtoPediaApiClient({
            token: 't',
            baseUrl: BASE_URL,
            fetch: createStalledBodyFetch(() => {
              setTimeout(() => controller.abort(reason), 0);
            }, 500),
            timeoutMs: 0,
            logger,
            logLevel: 'warn',
          });

          await expect(
            client.listPrototypes(undefined, { signal: controller.signal }),
          ).rejects.toBe(reason);
          expect(warn).toHaveBeenCalledWith(
            'HTTP request aborted by caller',
            expect.anything(),
          );
        });

        it('keeps the status when the read fails without an abort', async () => {
          const readError = new TypeError('terminated');
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              controller.error(readError);
            },
          });
          const { logger, error } = createTestLogger();
          const client = new ProtoPediaApiClient({
            token: 't',
            baseUrl: BASE_URL,
            fetch: vi.fn<FetchFn>(() =>
              Promise.resolve(
                new Response(stream, {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'application/json' },
                }),
              ),
            ),
            logger,
            logLevel: 'error',
          });

          const failure = await client
            .listPrototypes()
            .catch((e: unknown) => e);

          expect(failure).toBeInstanceOf(ProtoPediaApiError);
          expect(failure).toMatchObject({
            message: 'API request failed',
            status: 503,
            statusText: 'Service Unavailable',
            body: null,
            cause: readError,
          });
          expect(error).toHaveBeenCalledTimes(1);
          expect(error).toHaveBeenCalledWith(
            'API request failed',
            expect.anything(),
          );
        });
      });

      it('removes the caller abort listener once the body has been read', async () => {
        const controller = new AbortController();
        const removeListener = vi.spyOn(
          controller.signal,
          'removeEventListener',
        );
        const fetchMock = vi.fn<FetchFn>(() =>
          Promise.resolve(new Response('{"results":[]}', { status: 200 })),
        );
        const client = new ProtoPediaApiClient({
          token: 't',
          baseUrl: BASE_URL,
          fetch: fetchMock,
          logLevel: 'silent',
        });

        await client.listPrototypes(undefined, { signal: controller.signal });

        expect(removeListener).toHaveBeenCalledWith(
          'abort',
          expect.any(Function),
        );
      });
    });

    describe('abort and timeout classification', () => {
      function createClient(fetchMock: FetchFn, timeoutMs: number) {
        const testLogger = createTestLogger();
        const client = new ProtoPediaApiClient({
          token: 't',
          baseUrl: BASE_URL,
          fetch: fetchMock,
          timeoutMs,
          logger: testLogger.logger,
          logLevel: 'warn',
        });
        return { client, ...testLogger };
      }

      it.each([
        ['an Error', new Error('user cancelled')],
        ['a string', 'stop'],
        [
          'a TimeoutError (e.g. AbortSignal.timeout)',
          new DOMException('Timed out', 'TimeoutError'),
        ],
      ])(
        'treats a caller abort with %s as a caller abort',
        async (_label, reason) => {
          const { client, warn, error } = createClient(
            createAbortAwareFetch('reason'),
            5_000,
          );
          const controller = new AbortController();
          const promise = client.listPrototypes(undefined, {
            signal: controller.signal,
          });
          controller.abort(reason);

          await expect(promise).rejects.toBe(reason);
          expect(warn).toHaveBeenCalledWith(
            'HTTP request aborted by caller',
            expect.objectContaining({ reason }),
          );
          expect(error).not.toHaveBeenCalled();
        },
      );

      it('logs a client timeout even when fetch rejects with a generic AbortError', async () => {
        const { client, error, warn } = createClient(
          createAbortAwareFetch('abortError'),
          10,
        );

        await expect(client.listPrototypes()).rejects.toMatchObject({
          name: 'TimeoutError',
        });
        expect(error).toHaveBeenCalledWith(
          'HTTP request timed out',
          expect.objectContaining({ method: 'GET' }),
        );
        expect(warn).not.toHaveBeenCalled();
      });

      it('rethrows a network failure as-is even if the caller aborted in the meantime', async () => {
        // fetch that ignores the signal and fails with a network error later
        const fetchMock = vi.fn<FetchFn>(
          () =>
            new Promise((_resolve, reject) => {
              setTimeout(() => reject(new TypeError('fetch failed')), 30);
            }),
        );
        const { client, warn, error } = createClient(fetchMock, 5_000);
        const controller = new AbortController();
        const promise = client.listPrototypes(undefined, {
          signal: controller.signal,
        });
        controller.abort(new Error('user cancelled'));

        await expect(promise).rejects.toMatchObject({
          name: 'TypeError',
          message: 'fetch failed',
        });
        expect(error).toHaveBeenCalledWith(
          'HTTP request threw an unexpected error',
          expect.anything(),
        );
        expect(warn).not.toHaveBeenCalled();
      });

      it('treats a caller abort as a caller abort even after the client timeout would have used a TimeoutError', async () => {
        const { client, warn, error } = createClient(
          createAbortAwareFetch('reason'),
          5_000,
        );
        const reason = new DOMException('caller deadline', 'TimeoutError');
        const promise = client.listPrototypes(undefined, {
          signal: AbortSignal.abort(reason),
        });

        await expect(promise).rejects.toBe(reason);
        expect(warn).toHaveBeenCalledWith(
          'HTTP request aborted by caller',
          expect.objectContaining({ reason }),
        );
        expect(error).not.toHaveBeenCalledWith(
          'HTTP request timed out',
          expect.anything(),
        );
      });

      it('throws TimeoutError when fetch rejects with a non-DOMException AbortError', async () => {
        const abortError = Object.assign(
          new Error('The user aborted a request.'),
          {
            name: 'AbortError',
          },
        );
        const { logger, error } = createTestLogger();
        const client = new ProtoPediaApiClient({
          token: 't',
          baseUrl: BASE_URL,
          fetch: vi.fn<FetchFn>(
            (_url, init) =>
              new Promise((_resolve, reject) => {
                init?.signal?.addEventListener('abort', () => {
                  reject(abortError);
                });
              }),
          ),
          timeoutMs: 10,
          logger,
          logLevel: 'error',
        });

        await expect(client.listPrototypes()).rejects.toMatchObject({
          name: 'TimeoutError',
        });
        expect(error).toHaveBeenCalledWith(
          'HTTP request timed out',
          expect.anything(),
        );
      });

      it('throws the abort reason when fetch rejects with a non-DOMException AbortError', async () => {
        const controller = new AbortController();
        const reason = new Error('caller-aborted');
        const abortError = Object.assign(
          new Error('The user aborted a request.'),
          {
            name: 'AbortError',
          },
        );
        const client = new ProtoPediaApiClient({
          token: 't',
          baseUrl: BASE_URL,
          fetch: vi.fn<FetchFn>(
            (_url, init) =>
              new Promise((_resolve, reject) => {
                init?.signal?.addEventListener('abort', () => {
                  reject(abortError);
                });
                controller.abort(reason);
              }),
          ),
          timeoutMs: 0,
          logLevel: 'silent',
        });

        await expect(
          client.listPrototypes(undefined, { signal: controller.signal }),
        ).rejects.toBe(reason);
      });

      it('logs a generic AbortError not caused by caller or timeout as aborted', async () => {
        const fetchMock = vi.fn<FetchFn>(() =>
          Promise.reject(new DOMException('Aborted', 'AbortError')),
        );
        const { client, warn, error } = createClient(fetchMock, 5_000);

        await expect(client.listPrototypes()).rejects.toMatchObject({
          name: 'AbortError',
        });
        expect(warn).toHaveBeenCalledWith(
          'HTTP request aborted',
          expect.objectContaining({ method: 'GET' }),
        );
        expect(error).not.toHaveBeenCalled();
      });
    });

    it('downloads TSV text and targets the correct endpoint', async () => {
      const TSV = 'id\tname\n1\tAlpha\n';
      const fetchMock = vi.fn<FetchFn>(() =>
        Promise.resolve(
          new Response(TSV, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          }),
        ),
      );
      const { logger } = createTestLogger();
      const client = new ProtoPediaApiClient({
        token: 't',
        baseUrl: BASE_URL,
        fetch: fetchMock,
        logger,
        logLevel: 'silent',
      });

      const text = await client.downloadPrototypesTsv({ tagNm: 'vr' });
      expect(text).toBe(TSV);

      const call = fetchMock.mock.calls[0];
      if (!call) {
        throw new Error('Fetch was not called');
      }
      const [requestUrl, requestInit] = call;
      expect(requestUrl).toBe(`${BASE_URL}/prototype/list/tsv?tagNm=vr`);
      const headers = new Headers(requestInit?.headers ?? {});
      expect(headers.get('Accept')).toBe('application/json');
    });

    it('normalizes baseUrl with trailing slash and omits empty query params', async () => {
      const fetchMock = vi.fn<FetchFn>(() =>
        Promise.resolve(createJsonResponse(SAMPLE_API_RESPONSE)),
      );
      const { logger } = createTestLogger();
      const client = new ProtoPediaApiClient({
        token: 't',
        baseUrl: `${BASE_URL}/`, // note trailing slash
        fetch: fetchMock,
        logger,
        logLevel: 'silent',
      });

      await client.listPrototypes({ materialNm: '', limit: 0 });
      const [requestUrl] = fetchMock.mock.calls[0] ?? [];
      expect(requestUrl).toBe(
        `${BASE_URL}/prototype/list?limit=0`, // materialNm empty string should be omitted
      );
    });
  });

  describe('logger failures', () => {
    const throwingLogger: Logger = {
      error: () => {
        throw new Error('logger broke');
      },
      warn: () => {
        throw new Error('logger broke');
      },
      info: () => {
        throw new Error('logger broke');
      },
      debug: () => {
        throw new Error('logger broke');
      },
    };

    it('does not turn a successful response into a failure', async () => {
      const fetchMock = vi.fn<FetchFn>(() =>
        Promise.resolve(
          new Response(JSON.stringify({ count: 0, results: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      );
      const client = new ProtoPediaApiClient({
        token: 't',
        baseUrl: BASE_URL,
        fetch: fetchMock,
        logger: throwingLogger,
        logLevel: 'debug',
      });

      await expect(client.listPrototypes()).resolves.toMatchObject({
        count: 0,
      });
    });

    it('does not replace the original error', async () => {
      const original = new TypeError('fetch failed');
      const fetchMock = vi.fn<FetchFn>(() => Promise.reject(original));
      const client = new ProtoPediaApiClient({
        token: 't',
        baseUrl: BASE_URL,
        fetch: fetchMock,
        logger: throwingLogger,
        logLevel: 'debug',
      });

      await expect(client.listPrototypes()).rejects.toBe(original);
    });
  });

  it('logs unexpected errors (e.g., network failure) and rethrows', async () => {
    const unexpected = new TypeError('fetch failed');
    const fetchMock = vi.fn<FetchFn>(() => Promise.reject(unexpected));
    const { logger, error } = createTestLogger();
    const client = new ProtoPediaApiClient({
      token: 't',
      baseUrl: BASE_URL,
      fetch: fetchMock,
      logger,
      logLevel: 'error',
    });

    await expect(client.listPrototypes()).rejects.toBe(unexpected);

    expect(error).toHaveBeenCalledWith(
      'HTTP request threw an unexpected error',
      expect.objectContaining({ error: unexpected }),
    );
  });

  describe('downloadPrototypesTsv', () => {
    it('logs TSV payload at debug level', async () => {
      const TSV = 'col1\tcol2\n1\t2\n';
      const fetchMock = vi.fn<FetchFn>(() =>
        Promise.resolve(
          new Response(TSV, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          }),
        ),
      );
      const { logger, debug } = createTestLogger();

      const client = new ProtoPediaApiClient({
        token: 't',
        baseUrl: BASE_URL,
        fetch: fetchMock,
        logger,
        logLevel: 'debug',
      });

      const text = await client.downloadPrototypesTsv({ tagNm: 'log' });
      expect(text).toBe(TSV);

      expect(debug).toHaveBeenCalledWith(
        'HTTP request',
        expect.objectContaining({
          url: `${BASE_URL}/prototype/list/tsv?tagNm=log`,
        }),
      );
      expect(debug).toHaveBeenCalledWith(
        'downloadPrototypesTsv response payload',
        TSV,
      );
    });

    it('allows overriding log level per request for TSV', async () => {
      const TSV = 'id\tname\n1\tAlpha\n';
      const fetchMock = vi.fn<FetchFn>(() =>
        Promise.resolve(new Response(TSV, { status: 200 })),
      );
      const { logger, debug } = createTestLogger();

      const client = new ProtoPediaApiClient({
        token: 't',
        baseUrl: BASE_URL,
        fetch: fetchMock,
        logger,
        logLevel: 'silent',
      });

      await client.downloadPrototypesTsv(
        { tagNm: 'override' },
        { logLevel: 'debug' },
      );
      expect(debug).toHaveBeenCalledWith(
        'HTTP request',
        expect.objectContaining({
          url: `${BASE_URL}/prototype/list/tsv?tagNm=override`,
        }),
      );
      expect(debug).toHaveBeenCalledWith(
        'downloadPrototypesTsv response payload',
        TSV,
      );
    });

    it('throws ProtoPediaApiError for non-success responses (TSV)', async () => {
      const fetchMock = vi.fn<FetchFn>(() =>
        Promise.resolve(
          new Response('not found', {
            status: 404,
            statusText: 'Not Found',
            headers: { 'Content-Type': 'text/plain' },
          }),
        ),
      );
      const { logger } = createTestLogger();

      const client = new ProtoPediaApiClient({
        token: 't',
        baseUrl: BASE_URL,
        fetch: fetchMock,
        logger,
        logLevel: 'silent',
      });

      await expect(client.downloadPrototypesTsv()).rejects.toBeInstanceOf(
        ProtoPediaApiError,
      );
    });
  });
});

describe('createProtoPediaClient', () => {
  it('returns ProtoPediaApiClient instance when token is provided', () => {
    const client = createProtoPediaClient({
      token: 'token-123',
    });
    expect(client).toBeInstanceOf(ProtoPediaApiClient);
  });

  it('throws an error when token is not provided', () => {
    expect(() => {
      createProtoPediaClient({
        // no token
      });
    }).toThrowError('Missing API token. Pass it with the `token` option.');
  });

  it('throws an error when token is an empty string', () => {
    expect(() => {
      createProtoPediaClient({ token: '' });
    }).toThrowError('Missing API token. Pass it with the `token` option.');
  });
});

describe('Additional coverage tests', () => {
  it('logs without metadata when metadata is undefined', () => {
    const { logger, debug } = createTestLogger();

    // Create a test client that exposes the log method
    class TestClientForLog extends ProtoPediaApiClient {
      public callLog(level: 'debug', message: string, metadata?: unknown) {
        this['log'](level, message, metadata);
      }
    }

    const client = new TestClientForLog({
      token: 'test-token',
      logger,
      logLevel: 'debug',
    });

    // Call log without metadata
    client.callLog('debug', 'test message without metadata');
    expect(debug).toHaveBeenCalledWith('test message without metadata');

    // Call log with metadata
    client.callLog('debug', 'test message with metadata', { key: 'value' });
    expect(debug).toHaveBeenCalledWith('test message with metadata', {
      key: 'value',
    });
  });

  it('cleans up abort listener when signal is provided', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn<FetchFn>(() =>
      Promise.resolve(
        new Response('{"results":[]}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const client = new ProtoPediaApiClient({
      token: 'test-token',
      fetch: fetchMock,
    });

    // Make request with a signal
    await client.listPrototypes({}, { signal: controller.signal });

    // The cleanup should have removed the listener
    // We can't directly verify this, but we can confirm it doesn't throw
    expect(fetchMock).toHaveBeenCalled();
  });

  it('handles already aborted signal', async () => {
    const controller = new AbortController();
    const abortReason = new Error('test abort');
    controller.abort(abortReason);

    const fetchMock = vi.fn<FetchFn>((_url, init) => {
      const signal = init?.signal as AbortSignal | undefined;
      // Verify that the signal passed to fetch is aborted
      expect(signal?.aborted).toBe(true);
      return Promise.reject(
        new DOMException('The operation was aborted.', 'AbortError'),
      );
    });

    const client = new ProtoPediaApiClient({
      token: 'test-token',
      fetch: fetchMock,
      logLevel: 'silent',
    });

    await expect(
      client.listPrototypes({}, { signal: controller.signal }),
    ).rejects.toBe(abortReason);

    // Fetch is called with the aborted signal
    expect(fetchMock).toHaveBeenCalled();
  });
});
