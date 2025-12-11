/**
 * E2E tests for the listPrototypes API endpoint.
 *
 * Supported environment variables for these tests:
 * - VITE_PROTOPEDIA_API_V2_BASE_URL: Base URL of the API
 * - VITE_PROTOPEDIA_API_V2_TOKEN: API token used by tests
 *
 * CLI examples (macOS):
 *   export VITE_PROTOPEDIA_API_V2_BASE_URL="https://protopedia.net/v2/api"
 *   export VITE_PROTOPEDIA_API_V2_TOKEN="your-token"
 *   npm run test:e2e
 *
 * Using dotenv:
 *   cp .env.example .env
 *   # edit .env and set values for the variables above
 *   npm run test:e2e
 *
 * CI (GitHub Actions) example:
 *   - name: E2E tests
 *     run: npm run test:e2e
 *     env:
 *       VITE_PROTOPEDIA_API_V2_BASE_URL: https://protopedia.net/v2/api
 *       VITE_PROTOPEDIA_API_V2_TOKEN: ${{ secrets.PROTOPEDIA_API_V2_TOKEN }}
 */
import { describe, expect, it } from 'vitest';

import { ProtoPediaApiClient } from '../../src/client.js';
import { ProtoPediaApiError } from '../../src/errors.js';

import type { ListPrototypesApiResponse } from '../../src/types/protopedia-api-v2/response.js';

import { createListPrototypesPassthroughHandlers } from '../integration/handlers/prototypes.handlers.js';
import { server } from '../integration/msw.setup.js';
import { assertOkMetadata } from './helper.js';
import { VERSION } from '../../src/version.js';

const BASE_URL_FOR_TEST =
  process.env.VITE_PROTOPEDIA_API_V2_BASE_URL ||
  'https://protopedia.net/v2/api';
const TOKEN_FOR_TEST =
  process.env.VITE_PROTOPEDIA_API_V2_TOKEN || 'default-token';
const USER_AGENT_FOR_TEST = `Test for ProtoPedia API Ver 2.0 Node.js Client/${VERSION}`;

describe('listPrototypes', () => {
  it('should throw Error with invalid API key', async () => {
    server.use(...createListPrototypesPassthroughHandlers);

    const client = new ProtoPediaApiClient({
      baseUrl: BASE_URL_FOR_TEST,
      token: 'INVALID_TOKEN_FOR_TEST',
      userAgent: USER_AGENT_FOR_TEST,
    });
    try {
      await client.listPrototypes(
        {
          offset: 0,
          limit: 2,
        },
        {
          // logLevel: 'silent',
          // logLevel: 'info',
          logLevel: 'debug',
        },
      );
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(ProtoPediaApiError);
      if (error instanceof ProtoPediaApiError) {
        // Error
        expect(error.name).toBe('ProtoPediaApiError');
        expect(error.message).toBe('API request failed');
        // ProtoPediaApiError
        expect(error.status).toBe(401);
        expect(error.statusText).toBe('Unauthorized');
      }
    }
  });

  it('should return results with valid request', async () => {
    server.use(...createListPrototypesPassthroughHandlers);

    const client = new ProtoPediaApiClient({
      baseUrl: BASE_URL_FOR_TEST,
      token: TOKEN_FOR_TEST,
      userAgent: USER_AGENT_FOR_TEST,
    });

    const response: ListPrototypesApiResponse = await client.listPrototypes(
      {
        offset: 0,
        limit: 2,
      },
      {
        // logLevel: 'silent',
        // logLevel: 'info',
        logLevel: 'debug',
      },
    );

    expect(response).toBeDefined();
    assertOkMetadata(response.metadata);
  });

  /**
   * limit:1 の結果が1件である
   */
  it('should return 1 result when limit is set to 1', async () => {
    server.use(...createListPrototypesPassthroughHandlers);

    const client = new ProtoPediaApiClient({
      baseUrl: BASE_URL_FOR_TEST,
      token: TOKEN_FOR_TEST,
      userAgent: USER_AGENT_FOR_TEST,
    });

    const response: ListPrototypesApiResponse = await client.listPrototypes(
      {
        offset: 0,
        limit: 1,
        prototypeId: 1,
        // prototypeId: 7595,
      },
      {
        // logLevel: 'silent',
        // logLevel: 'info',
        logLevel: 'debug',
      },
    );

    assertOkMetadata(response.metadata);
    expect(response.count).toBe(1);
    expect(response.links).toEqual({
      self: {
        href: '/v2/api/protopedia/list',
      },
    });
    // Results
    expect(response.results).toBeDefined();
    expect(response.results).toBeInstanceOf(Array);
    if (response.results == null) {
      throw new Error('results must be defined');
    }
    expect(response.results.length).toBe(1);
    for (const result of response.results) {
      assertResultOfListPrototypesApiResponse(result);
    }
  });

  /**
   * limit:3 の結果が3件である
   */
  it('should return 3 results when limit is set to 3', async () => {
    server.use(...createListPrototypesPassthroughHandlers);

    const client = new ProtoPediaApiClient({
      baseUrl: BASE_URL_FOR_TEST,
      token: TOKEN_FOR_TEST,
      userAgent: USER_AGENT_FOR_TEST,
    });

    const response: ListPrototypesApiResponse = await client.listPrototypes(
      {
        offset: 0,
        limit: 3,
      },
      {
        // logLevel: 'silent',
        // logLevel: 'info',
        logLevel: 'debug',
      },
    );

    assertOkMetadata(response.metadata);
    expect(response.count).toBe(3);
    expect(response.links).toEqual({
      self: {
        href: '/v2/api/protopedia/list',
      },
    });
    // Results
    expect(response.results).toBeDefined();
    expect(response.results).toBeInstanceOf(Array);
    if (response.results == null) {
      throw new Error('results must be defined');
    }
    expect(response.results.length).toBe(3);
    // results
    for (const result of response.results) {
      assertResultOfListPrototypesApiResponse(result);
    }
  });

  /**
   * 特定のprototypeIdを指定した場合、その作品のみが返る
   */
  it('should return specific result when prototypeId is set', async () => {
    server.use(...createListPrototypesPassthroughHandlers);

    const client = new ProtoPediaApiClient({
      baseUrl: BASE_URL_FOR_TEST,
      token: TOKEN_FOR_TEST,
      userAgent: USER_AGENT_FOR_TEST,
    });

    const prototypeId = 1; // クラッピーで仮装大賞
    // const prototypeId = 7595; // よのこまえ

    const response: ListPrototypesApiResponse = await client.listPrototypes(
      {
        // offset: 0,
        // limit: 1,
        prototypeId: prototypeId,
        // prototypeId: 7595,
      },
      {
        // logLevel: 'silent',
        // logLevel: 'info',
        logLevel: 'debug',
      },
    );

    assertOkMetadata(response.metadata);
    // note: 限定公開の作品は含まれない
    expect(response.count).toBe(1);
    expect(response.links).toEqual({
      self: {
        href: '/v2/api/protopedia/list',
      },
    });

    // Results
    expect(response.results).toBeDefined();
    expect(response.results).toBeInstanceOf(Array);
    if (response.results == null) {
      throw new Error('results must be defined');
    }
    expect(response.results.length).toBe(1);
    const result = response.results[0];
    assertResultOfListPrototypesApiResponse(result);
    expect(result?.id).toBe(prototypeId);
  });
});

/**
 * ListPrototypesApiResponse.results に含まれる要素の型を確認する。
 * 型定義を規定するものではない。
 * レスポンスの変更を検知することが主な目的である。
 */
function assertResultOfListPrototypesApiResponse(data: unknown) {
  // ListPrototypesApiResponse.results の data が ResultOfListPrototypesApiResponse 全てのプロパティを持つことを確認する。
  // Required fields are always checked, optional fields are conditionally type-checked when present.

  expect(data).toBeDefined();
  expect(data).toBeInstanceOf(Object);
  const obj = data as Record<string, unknown>;

  // Required fields
  expect(obj).toHaveProperty('id');
  expect(typeof obj.id).toBe('number');

  expect(obj).toHaveProperty('createDate');
  expect(typeof obj.createDate).toBe('string');

  expect(obj).toHaveProperty('updateDate');
  expect(typeof obj.updateDate).toBe('string');

  expect(obj).toHaveProperty('status');
  expect(typeof obj.status).toBe('number');

  expect(obj).toHaveProperty('prototypeNm');
  expect(typeof obj.prototypeNm).toBe('string');

  expect(obj).toHaveProperty('mainUrl');
  expect(typeof obj.mainUrl).toBe('string');

  expect(obj).toHaveProperty('viewCount');
  expect(typeof obj.viewCount).toBe('number');

  expect(obj).toHaveProperty('commentCount');
  expect(typeof obj.commentCount).toBe('number');

  expect(obj).toHaveProperty('goodCount');
  expect(typeof obj.goodCount).toBe('number');

  // Optional fields - check type when present
  if ('createId' in obj) {
    expect(typeof obj.createId).toBe('number');
  }

  if ('updateId' in obj) {
    expect(typeof obj.updateId).toBe('number');
  }

  if ('releaseDate' in obj) {
    expect(typeof obj.releaseDate).toBe('string');
  }

  if ('nid' in obj) {
    expect(typeof obj.nid).toBe('string');
  }

  if ('uuid' in obj) {
    expect(typeof obj.uuid).toBe('string');
  }

  if ('summary' in obj) {
    expect(typeof obj.summary).toBe('string');
  }

  if ('tags' in obj) {
    expect(typeof obj.tags).toBe('string');
  }

  if ('teamNm' in obj) {
    expect(typeof obj.teamNm).toBe('string');
  }

  if ('users' in obj) {
    expect(typeof obj.users).toBe('string');
  }

  if ('releaseFlg' in obj) {
    expect(typeof obj.releaseFlg).toBe('number');
  }

  if ('revision' in obj) {
    expect(typeof obj.revision).toBe('number');
  }

  if ('freeComment' in obj) {
    expect(typeof obj.freeComment).toBe('string');
  }

  if ('systemDescription' in obj) {
    expect(typeof obj.systemDescription).toBe('string');
  }

  if ('videoUrl' in obj) {
    expect(typeof obj.videoUrl).toBe('string');
  }

  if ('awards' in obj) {
    expect(typeof obj.awards).toBe('string');
  }

  if ('relatedLink' in obj) {
    expect(typeof obj.relatedLink).toBe('string');
  }

  if ('relatedLink2' in obj) {
    expect(typeof obj.relatedLink2).toBe('string');
  }

  if ('relatedLink3' in obj) {
    expect(typeof obj.relatedLink3).toBe('string');
  }

  if ('relatedLink4' in obj) {
    expect(typeof obj.relatedLink4).toBe('string');
  }

  if ('relatedLink5' in obj) {
    expect(typeof obj.relatedLink5).toBe('string');
  }

  if ('licenseType' in obj) {
    expect(typeof obj.licenseType).toBe('number');
  }

  if ('thanksFlg' in obj) {
    expect(typeof obj.thanksFlg).toBe('number');
  }

  if ('events' in obj) {
    expect(typeof obj.events).toBe('string');
  }

  if ('officialLink' in obj) {
    expect(typeof obj.officialLink).toBe('string');
  }

  if ('materials' in obj) {
    expect(typeof obj.materials).toBe('string');
  }

  if ('slideMode' in obj) {
    expect(typeof obj.slideMode).toBe('number');
  }

  // expect(obj).toHaveProperty('events');
  // expect(obj).toHaveProperty('officialLink');
  // expect(obj).toHaveProperty('materials');

  // expect(obj).toHaveProperty('slideMode');
}
