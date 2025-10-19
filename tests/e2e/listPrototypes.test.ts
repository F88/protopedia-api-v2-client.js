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

import type { ListPrototypesApiResponse } from '../../types/protopedia-api-v2/response.js';

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
        expect(error.message).toBe('Request failed with status 401');
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
   * limit:2 の結果が2件である
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
   * prototypeId:1 の結果が1件である
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

    console.debug({ result });
  });
});

/**
 * ListPrototypesApiResponse.results に含まれる要素の型を確認する。
 * 型定義を規定するものではない。
 * レスポンスの変更を検知することが主な目的である。
 */
function assertResultOfListPrototypesApiResponse(data: unknown) {
  // ListPrototypesApiResponse.results の data が ResultOfListPrototypesApiResponse 全てのプロパティを持つことを確認する。
  // 全てのプロパティはoptionalではなくである前提で検査する。

  expect(data).toBeDefined();
  expect(data).toBeInstanceOf(Object);
  // if (data && typeof data === 'object') {
  const obj = data as Record<string, unknown>;

  // 必ず含まれるプロパティ
  expect(obj).toHaveProperty('id');
  // expect(obj).toHaveProperty('createId');
  expect(obj).toHaveProperty('createDate');
  // expect(obj).toHaveProperty('updateId');
  expect(obj).toHaveProperty('updateDate');
  expect(obj).toHaveProperty('releaseDate');

  // expect(obj).toHaveProperty('nid');
  expect(obj).toHaveProperty('uuid');

  // expect(obj).toHaveProperty('summary');
  // expect(obj).toHaveProperty('tags');

  expect(obj).toHaveProperty('teamNm');
  expect(obj).toHaveProperty('users');

  expect(obj).toHaveProperty('status');
  expect(obj).toHaveProperty('releaseFlg');

  expect(obj).toHaveProperty('revision');
  expect(obj).toHaveProperty('prototypeNm');
  expect(obj).toHaveProperty('freeComment');
  // expect(obj).toHaveProperty('systemDescription');
  // expect(obj).toHaveProperty('videoUrl');

  expect(obj).toHaveProperty('mainUrl');

  // expect(obj).toHaveProperty('awards');

  expect(obj).toHaveProperty('viewCount');
  expect(obj).toHaveProperty('commentCount');
  expect(obj).toHaveProperty('goodCount');

  // expect(obj).toHaveProperty('relatedLink');
  // expect(obj).toHaveProperty('relatedLink2');
  // expect(obj).toHaveProperty('relatedLink3');
  // expect(obj).toHaveProperty('relatedLink4');
  // expect(obj).toHaveProperty('relatedLink5');

  expect(obj).toHaveProperty('licenseType');

  expect(obj).toHaveProperty('thanksFlg');

  // expect(obj).toHaveProperty('events');
  // expect(obj).toHaveProperty('officialLink');
  // expect(obj).toHaveProperty('materials');

  // expect(obj).toHaveProperty('slideMode');
}
