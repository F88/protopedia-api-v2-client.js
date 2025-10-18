import { describe, expect, it, vi } from 'vitest';

import {
  ProtoPediaApiClient,
  createProtoPediaClientFromEnv,
} from '../../src/client.js';
import { ProtoPediaApiError } from '../../src/errors.js';
import type { ProtoPediaLogger } from '../../src/types';

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

  const logger: ProtoPediaLogger = {
    error,
    warn,
    info,
    debug,
  };

  return { logger, error, warn, info, debug };
}

describe('ProtoPediaApiClient (unit)', () => {
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

  it('creates a client from environment variables and downloads TSV', async () => {
    const payload = 'id\ttitle\n1\tWork';
    const fetchMock = vi.fn<FetchFn>(() =>
      Promise.resolve(
        new Response(payload, {
          status: 200,
          headers: {
            'Content-Type': 'text/tab-separated-values',
          },
        }),
      ),
    );

    const client = createProtoPediaClientFromEnv({
      env: {
        PROTOPEDIA_API_V2_TOKEN: 'env-token',
      },
      baseUrl: BASE_URL,
      fetch: fetchMock,
      logLevel: 'silent',
    });

    const text = await client.downloadPrototypesTsv();
    expect(text).toBe(payload);

    const downloadCall = fetchMock.mock.calls[0];
    if (!downloadCall) {
      throw new Error('Fetch was not called for download');
    }

    const [, requestInit] = downloadCall;
    const headers = new Headers(requestInit?.headers ?? {});
    expect(headers.get('Authorization')).toBe('Bearer env-token');
    // Current implementation uses application/json for TSV download as well
    expect(headers.get('Accept')).toContain('application/json');
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

  it('derives log level from environment variables when not provided', async () => {
    const fetchMock = vi.fn<FetchFn>(() =>
      Promise.resolve(createJsonResponse(SAMPLE_API_RESPONSE)),
    );
    const { logger, debug } = createTestLogger();

    const client = createProtoPediaClientFromEnv({
      env: {
        PROTOPEDIA_API_V2_TOKEN: 'env-token',
        PROTOPEDIA_API_LOG_LEVEL: 'debug',
      },
      baseUrl: BASE_URL,
      fetch: fetchMock,
      logger,
    });

    await client.listPrototypes();

    expect(debug).toHaveBeenCalledWith(
      'HTTP request',
      expect.objectContaining({ url: `${BASE_URL}/prototype/list` }),
    );
  });
});
