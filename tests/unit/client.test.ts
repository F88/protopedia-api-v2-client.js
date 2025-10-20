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
        'HTTP request failed',
        expect.objectContaining({ status: 500 }),
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

  describe('downloadPrototypesTsv', () => {
    // todo add tests
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
