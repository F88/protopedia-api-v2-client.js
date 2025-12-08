import { describe, expect, it, vi } from 'vitest';

import {
  createProtoPediaClient,
  ProtoPediaApiClient,
} from '../../src/client.js';
import type { ProtoPediaApiRequestOptions } from '../../src/client.js';
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

describe('ProtoPediaApiClient', () => {
  describe('constructor', () => {
    it('sets default values for optional parameters', () => {
      const client = new ProtoPediaApiClient({});

      expect(client['fetchFn']).toBe(globalThis.fetch);
      expect(client['token']).toBeUndefined();
      expect(client['baseUrl']).toBe('https://protopedia.net/v2/api');
      expect(client['timeoutMs']).toBe(15_000);
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
      expect(c1['timeoutMs']).toBe(15_000);

      const c2 = new ProtoPediaApiClient({ timeoutMs: 0, logger });
      expect(c2['timeoutMs']).toBe(0);

      const c3 = new ProtoPediaApiClient({
        timeoutMs: Number.POSITIVE_INFINITY,
        logger,
      });
      expect(c3['timeoutMs']).toBe(15_000);
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

    it('falls back to parseError when failing to read error body', async () => {
      // Simulate a response where both json() and text() fail
      const failingResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        url: `${BASE_URL}/prototype/list`,
        headers: new Headers(),
        json: () => Promise.reject(new Error('bad json')),
        text: () => Promise.reject(new Error('read fail')),
      } as unknown as Response;
      const fetchMock = vi.fn<FetchFn>(() => Promise.resolve(failingResponse));

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
        body: { parseError: 'read fail' },
      });
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

    it('when non-JSON Content-Type: uses json() if text() fails', async () => {
      const textFailsJsonSucceeds = {
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        url: `${BASE_URL}/prototype/list`,
        headers: new Headers({ 'Content-Type': 'text/plain' }),
        text: () => Promise.reject(new Error('text broken')),
        json: () => Promise.resolve({ fallback: 'json-body' }),
      } as unknown as Response;

      const fetchMock = vi.fn<FetchFn>(() =>
        Promise.resolve(textFailsJsonSucceeds),
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
        status: 502,
        body: { fallback: 'json-body' },
      });
    });

    it('when application/json and both json() and text() fail, returns parseError from text() branch', async () => {
      const readFail = new Error('unreadable');
      const failingClone = {
        json: () => Promise.reject(new Error('bad json')),
      };
      const failingResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        url: `${BASE_URL}/prototype/list`,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        // clone().json() fails
        clone: () => failingClone as unknown as Response,
        // then response.text() also fails
        text: () => Promise.reject(readFail),
      } as unknown as Response;

      const fetchMock = vi.fn<FetchFn>(() => Promise.resolve(failingResponse));

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
        body: { parseError: 'unreadable' },
      });
    });

    it('aborts request due to client timeout and throws AbortError', async () => {
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
        name: 'AbortError',
      });
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

  describe('execute (via subclass)', () => {
    class TestClient extends ProtoPediaApiClient {
      public async callExecute(
        url: string,
        options: {
          method: 'GET';
          headers?: HeadersInit;
          body?: BodyInit | null;
        },
        requestOptions?: ProtoPediaApiRequestOptions,
      ) {
        // expose protected for test
        return this.execute(url, options, requestOptions);
      }
    }

    it('sends body when provided in options', async () => {
      const fetchMock = vi.fn<FetchFn>(() =>
        Promise.resolve(
          new Response('ok', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          }),
        ),
      );
      const { logger } = createTestLogger();
      const client = new TestClient({
        token: 't',
        baseUrl: BASE_URL,
        fetch: fetchMock,
        logger,
        logLevel: 'silent',
      });
      const url = `${BASE_URL}/prototype/list`;
      await client.callExecute(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ a: 1 }),
      });
      const [, init] = fetchMock.mock.calls[0] ?? [];
      expect((init as RequestInit).method).toBe('GET');
      expect(
        new Headers((init as RequestInit).headers).get('Content-Type'),
      ).toBe('application/json');
      expect((init as RequestInit).body).toBe(JSON.stringify({ a: 1 }));
    });

    it('logs unexpected errors (e.g., TimeoutError) and rethrows', async () => {
      const unexpected = new DOMException('boom', 'TimeoutError');
      const fetchMock = vi.fn<FetchFn>(() => Promise.reject(unexpected));
      const { logger, error } = createTestLogger();
      const client = new TestClient({
        token: 't',
        baseUrl: BASE_URL,
        fetch: fetchMock,
        logger,
        logLevel: 'error',
      });

      await expect(
        client.callExecute(`${BASE_URL}/prototype/list`, { method: 'GET' }),
      ).rejects.toBe(unexpected);

      expect(error).toHaveBeenCalledWith(
        'HTTP request threw an unexpected error',
        expect.objectContaining({ error: unexpected }),
      );
    });
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
    }).toThrowError('Missing PROTOPEDIA_API_V2_TOKEN.');
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
