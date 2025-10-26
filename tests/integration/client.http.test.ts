import { describe, expect, it } from 'vitest';

import { server } from './msw.setup.js';
import {
  createListPrototypes500HtmlHandler,
  createListPrototypesHandler,
  createDownloadPrototypesTsvHandler,
  createListPrototypesJsonErrorHandler,
  sampleListPrototypesPayload,
} from './handlers/prototypes.handlers.js';
import { ProtoPediaApiClient } from '../../src/client.js';
import { ProtoPediaApiError } from '../../src/errors.js';

const BASE_URL = 'https://example.com/api/v2';

describe('ProtoPediaApiClient (integration)', () => {
  it('performs an HTTP request and returns API v2 response using MSW', async () => {
    let capturedRequest: Request | undefined;

    server.use(
      createListPrototypesHandler({
        onRequest: (request) => {
          capturedRequest = request;
        },
      }),
    );

    const client = new ProtoPediaApiClient({
      token: 'token-123',
      baseUrl: BASE_URL,
      // logLevel: 'debug',
    });

    const result = await client.listPrototypes({ tagNm: 'vr', limit: 3 });

    if (!capturedRequest) {
      throw new Error('MSW handler did not capture a request');
    }

    const url = new URL(capturedRequest.url);
    expect(url.searchParams.get('tagNm')).toBe('vr');
    expect(url.searchParams.get('limit')).toBe('3');

    expect(capturedRequest.headers.get('authorization')).toBe(
      'Bearer token-123',
    );

    expect(result.metadata).toEqual(sampleListPrototypesPayload.metadata);
    expect(result.count).toBe(sampleListPrototypesPayload.count);
    expect(result.links).toEqual(sampleListPrototypesPayload.links);
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results?.length).toBe(1);
    const first = result.results?.[0];
    expect(first?.id).toBe(42);
    expect(first?.prototypeNm).toBe('Test Work');
  });

  it('handles 500 with HTML body by surfacing string body on ProtoPediaApiError', async () => {
    server.use(createListPrototypes500HtmlHandler());

    const client = new ProtoPediaApiClient({
      token: 'token-123',
      baseUrl: BASE_URL,
      // logLevel: 'debug',
      logLevel: 'debug',
    });

    try {
      await client.listPrototypes({ limit: 2, offset: 0 });
      expect.fail('Expected ProtoPediaApiError to be thrown');
    } catch (e) {
      // Assert as Error
      expect(e).toBeInstanceOf(Error);
      const error = e as ProtoPediaApiError;
      expect(error.name).toBe('ProtoPediaApiError');
      expect(error.message).toBe('Request failed with status 500');
      expect(error.cause).toBeUndefined();

      // Assert as ProtoPediaApiError
      expect(e).toBeInstanceOf(ProtoPediaApiError);
      const protoPediaApiError = e as ProtoPediaApiError;
      expect(protoPediaApiError.status).toBe(500);
      expect(protoPediaApiError.statusText).toBe('Internal Server Error');
      expect(protoPediaApiError.url).toBe(
        `${BASE_URL}/prototype/list?limit=2&offset=0`,
      );
      expect(typeof protoPediaApiError.body === 'string').toBe(true);
      if (typeof protoPediaApiError.body === 'string') {
        expect(protoPediaApiError.body.toLowerCase()).toContain('<html');
        expect(protoPediaApiError.body).toContain('Internal Server Error');
      }
      // Headers should include content-type propagated through our error builder
      expect(Object.keys(protoPediaApiError.headers).length).toBeGreaterThan(0);
      expect(
        protoPediaApiError.headers['content-type']?.toLowerCase(),
      ).toContain('text/html');
    }
  });

  it('encodes special characters in query parameters correctly', async () => {
    let capturedRequest: Request | undefined;

    server.use(
      createListPrototypesHandler({
        onRequest: (request) => {
          capturedRequest = request;
        },
      }),
    );

    const client = new ProtoPediaApiClient({
      token: 'token-123',
      baseUrl: BASE_URL,
    });

    const special = '日本 語&記号,%/#?+';
    await client.listPrototypes({
      tagNm: special,
      materialNm: special,
      limit: 1,
    });

    if (!capturedRequest) {
      throw new Error('MSW handler did not capture a request');
    }

    const url = new URL(capturedRequest.url);
    expect(url.searchParams.get('tagNm')).toBe(special);
    expect(url.searchParams.get('materialNm')).toBe(special);
    expect(url.searchParams.get('limit')).toBe('1');
  });

  it('sends required headers (Accept and X-Client-User-Agent)', async () => {
    let capturedRequest: Request | undefined;

    server.use(
      createListPrototypesHandler({
        onRequest: (request) => {
          capturedRequest = request;
        },
      }),
    );

    const client = new ProtoPediaApiClient({ token: 't', baseUrl: BASE_URL });
    await client.listPrototypes({ limit: 1 });

    if (!capturedRequest) {
      throw new Error('MSW handler did not capture a request');
    }
    expect(capturedRequest.headers.get('accept')).toBe('application/json');
    const ua = capturedRequest.headers.get('x-client-user-agent');
    expect(ua).toBeTruthy();
    expect(ua?.includes('ProtoPedia API Ver 2.0 Node.js Client/')).toBe(true);
  });

  it('downloads TSV from /prototype/list/tsv and returns plain text', async () => {
    let capturedRequest: Request | undefined;

    server.use(
      createDownloadPrototypesTsvHandler({
        onRequest: (request) => {
          capturedRequest = request;
        },
      }),
    );

    const client = new ProtoPediaApiClient({ token: 't', baseUrl: BASE_URL });
    const tsv = await client.downloadPrototypesTsv({ limit: 1 });
    expect(tsv).toContain('\t');
    expect(tsv).toContain('\n');

    if (!capturedRequest) {
      throw new Error('MSW handler did not capture a request');
    }
    const url = new URL(capturedRequest.url);
    expect(url.pathname).toBe('/api/v2/prototype/list/tsv');
  });

  it('merges caller-provided headers with client headers (and allows override)', async () => {
    let capturedRequest: Request | undefined;
    server.use(
      createListPrototypesHandler({
        onRequest: (request) => (capturedRequest = request),
      }),
    );

    const client = new ProtoPediaApiClient({ token: 't', baseUrl: BASE_URL });
    await client.listPrototypes(
      { limit: 1 },
      {
        headers: {
          'X-Extra': '1',
          Accept: 'application/json; q=1', // override
        },
      },
    );

    if (!capturedRequest) throw new Error('no request captured');
    expect(capturedRequest.headers.get('authorization')).toBe('Bearer t');
    expect(capturedRequest.headers.get('x-client-user-agent')).toBeTruthy();
    expect(capturedRequest.headers.get('x-extra')).toBe('1');
    expect(capturedRequest.headers.get('accept')).toBe('application/json; q=1');
  });

  it('normalizes baseUrl with/without trailing slash to same path', async () => {
    let capturedA: Request | undefined;
    let capturedB: Request | undefined;

    server.use(
      createListPrototypesHandler({ onRequest: (r) => (capturedA = r) }),
    );
    const clientA = new ProtoPediaApiClient({
      token: 't',
      baseUrl: 'https://example.com/api/v2',
    });
    await clientA.listPrototypes({ limit: 1 });

    server.use(
      createListPrototypesHandler({ onRequest: (r) => (capturedB = r) }),
    );
    const clientB = new ProtoPediaApiClient({
      token: 't',
      baseUrl: 'https://example.com/api/v2/',
    });
    await clientB.listPrototypes({ limit: 1 });

    if (!capturedA || !capturedB) throw new Error('requests not captured');
    const pathA = new URL(capturedA.url).pathname;
    const pathB = new URL(capturedB.url).pathname;
    expect(pathA).toBe('/api/v2/prototype/list');
    expect(pathB).toBe('/api/v2/prototype/list');
  });

  it('surfaces JSON error payload and propagates headers on application/json error', async () => {
    server.use(createListPrototypesJsonErrorHandler());

    const client = new ProtoPediaApiClient({ token: 't', baseUrl: BASE_URL });
    try {
      await client.listPrototypes({ limit: 2 });
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ProtoPediaApiError);
      const err = e as ProtoPediaApiError;
      expect(err.status).toBe(400);
      expect(err.headers['content-type']).toContain('application/json');
      expect(err.headers['x-custom']).toBe('abc');
      expect(err.body).toEqual({ error: 'bad_request', message: 'nope' });
    }
  });
});
