import { describe, expect, it } from 'vitest';

import { server } from './msw.setup.js';
import {
  createListPrototypesHandler,
  sampleListPrototypesPayload,
} from './handlers/works.handlers.js';
import { ProtoPediaApiClient } from '../../src/client.js';

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
});
