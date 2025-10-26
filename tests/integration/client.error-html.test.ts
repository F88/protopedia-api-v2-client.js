import { describe, expect, it } from 'vitest';

import { server } from './msw.setup.js';
import { createListPrototypes500HtmlHandler } from './handlers/prototypes.handlers.js';
import { ProtoPediaApiClient } from '../../src/client.js';
import { ProtoPediaApiError } from '../../src/errors.js';

const BASE_URL = 'https://example.com/api/v2';

describe('ProtoPediaApiClient (error handling)', () => {
  it('handles 500 with HTML body by surfacing string body on ProtoPediaApiError', async () => {
    server.use(createListPrototypes500HtmlHandler());

    const client = new ProtoPediaApiClient({
      token: 'token-123',
      baseUrl: BASE_URL,
      // logLevel: 'debug',
    });

    try {
      await client.listPrototypes({ limit: 2, offset: 0 });
      expect.fail('Expected ProtoPediaApiError to be thrown');
    } catch (error) {
      // console.debug('Caught error as expected:', error);
      expect(error).toBeInstanceOf(ProtoPediaApiError);
      const e = error as ProtoPediaApiError;
      expect(e.status).toBe(500);
      expect(e.statusText).toBe('Internal Server Error');
      expect(typeof e.body === 'string').toBe(true);
      if (typeof e.body === 'string') {
        expect(e.body.toLowerCase()).toContain('<html');
        expect(e.body).toContain('Internal Server Error');
      }
      // Headers should include content-type propagated through our error builder
      expect(Object.keys(e.headers).length).toBeGreaterThan(0);
      expect(e.headers['content-type']?.toLowerCase()).toContain('text/html');
    }
  });
});
