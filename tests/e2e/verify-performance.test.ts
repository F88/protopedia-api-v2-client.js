/**
 * E2E performance tests for listPrototypes hitting the real API.
 *
 * This suite disables MSW within the test to measure real network turnaround times.
 * Requires environment variables:
 * - VITE_PROTOPEDIA_API_V2_BASE_URL
 * - VITE_PROTOPEDIA_API_V2_TOKEN
 *
 * Purpose and caution (EN):
 * - This test is intended to observe the current behavior of the API to help
 *   evaluate how to use it. Please run it carefully and avoid imposing
 *   unnecessary load on the production API (reduce frequency, limit response
 *   sizes, and prefer off-peak hours). Do not enable by default in CI.
 *
 * 目的および注意事項 (JA):
 * - このテストはAPIの利用方法を検討する目的で、現在のAPIの動作を確認するものです。
 *   不用意な実行によりAPIに不要な処理負荷を与えないよう十分注意してください
 *   (実行頻度や取得件数を抑え、可能であれば混雑していない時間帯に実行してください)。
 *   CIでは既定で有効にしないでください。
 *
 *
2025-10-24 測定結果
| API | limit | size or rows | duration (ms) | res body size (bytes) |
| --- | --- | --- | --- | --- |
| listPrototypes | 1 | 1 | 3,388 | 1,078 |
| listPrototypes | 100 | 100 | 3,172 | 209,569 |
| listPrototypes | 1,000 | 1,000 | 3,405 | 2,576,303 |
| listPrototypes | 10,000 | 5,644 | 4,777 | 15,444,297 |
| downloadPrototypesTsv | 1 | 2 | 3,332 | 749 |
| downloadPrototypesTsv | 100 | 101 | 3,210 | 41,279 |
| downloadPrototypesTsv | 1,000 | 1,001 | 3,246 | 439,941 |
| downloadPrototypesTsv | 10,000 | 5,645 | 3,538 | 3,254,374 |
 *
 */
import { describe, expect, it } from 'vitest';

import { ProtoPediaApiClient } from '../../src/client.js';
import type {
  ListPrototypesApiResponse,
  ResultOfListPrototypesApiResponse,
} from '../../src/types/protopedia-api-v2/response.js';
import { VERSION } from '../../src/version.js';
import { assertOkMetadata } from './helper.js';

const BASE_URL_FOR_TEST =
  process.env.VITE_PROTOPEDIA_API_V2_BASE_URL ||
  'https://protopedia.net/v2/api';
const TOKEN_FOR_TEST =
  process.env.VITE_PROTOPEDIA_API_V2_TOKEN || 'default-token';
const USER_AGENT_FOR_TEST = `Test for ProtoPedia API Ver 2.0 Node.js Client/${VERSION}`;

/**
 * Performance: measure turnaround time for fetching various item counts.
 * This test does not assert strict performance thresholds beyond a max timeout.
 * Note: Requires a valid API token via VITE_PROTOPEDIA_API_V2_TOKEN.
 */

describe('Checking performance to determine how to use the API', () => {
  const client = new ProtoPediaApiClient({
    baseUrl: BASE_URL_FOR_TEST,
    token: TOKEN_FOR_TEST,
    userAgent: USER_AGENT_FOR_TEST,
  });

  describe('listPrototypes', () => {
    it(
      'verify turnaround times for multiple item counts',
      { timeout: 60_000 },
      async () => {
        const results: Array<{
          api: string;
          limit: number;
          counts: number; // results array length
          apiCount: number; // response.count
          duration: number; // ms
          sizeBytes: number; // approximate JSON body size (UTF-8)
        }> = [];
        const limitsForTest = [
          1, 100,
          //
          // 1_000,
          //
          // 10_000,
        ] as const;

        /**
         * Notes:
         * 2025-10-24現在 limit:1 で約3000ms、limit:100 でも大差無し。なんと limit:10_000 で7600件取得しても5000ms。
         * API利用時はどこまで考慮すべきか悩ましい(ありがたい動作ではある)
         */
        async function measureListPrototypes(limit: number): Promise<{
          counts: number;
          apiCount: number;
          duration: number;
          sizeBytes: number;
        }> {
          const start = Date.now();
          const response: ListPrototypesApiResponse =
            await client.listPrototypes(
              {
                offset: 0,
                limit,
                // limit: 10000 /* default: 100 */,
              },
              {
                // Keep debug logs consistent with other e2e tests
                // logLevel: 'silent',
                // logLevel: 'info',
                logLevel: 'debug',
              },
            );
          const end = Date.now();
          assertOkMetadata(response.metadata);

          console.debug('Verify results for limit =', limit);
          console.debug(response.count, 'results returned');
          const prototypes: ResultOfListPrototypesApiResponse[] =
            response.results ?? [];

          if (prototypes.length > 0) {
            // Sort by id ascending for inspection/output stability
            const sorted = [...prototypes].sort((a, b) => a.id - b.id);

            // Print sorted results header (omit per-item logs to keep output compact)
            console.debug('Results in ascending ID order:');

            // inspect first result and last result from sorted list
            const first = sorted[0];
            const last = sorted[sorted.length - 1];
            if (first && last) {
              console.debug(`First result: ${first.id}, ${first.prototypeNm}`);
              console.debug(`Last result: ${last.id}, ${last.prototypeNm}`);
            }
          }

          // approximate response JSON body size in bytes
          const jsonText = JSON.stringify(response);
          const sizeBytes = new TextEncoder().encode(jsonText).length;

          // return turnaround time and metadata
          return {
            counts: prototypes.length,
            apiCount: response.count,
            duration: end - start,
            sizeBytes,
          };
        }

        for (const l of limitsForTest) {
          const result = await measureListPrototypes(l);
          results.push({
            api: 'listPrototypes',
            limit: l,
            counts: result.counts,
            apiCount: result.apiCount,
            duration: result.duration,
            sizeBytes: result.sizeBytes,
          });
          expect(result.duration).toBeLessThan(30_000);
        }

        // Print a summary after the test completes
        console.info('');
        console.info(
          'Summary of turnaround times (ms) and approx body size (bytes):',
        );
        for (const r of results) {
          console.info(
            `  api=${r.api} limit=${r.limit} counts=${r.counts} apiCount=${r.apiCount} duration=${r.duration} size=${r.sizeBytes}`,
          );
        }
      },
    );
  });

  describe('downloadPrototypesTsv', () => {
    it(
      'verify turnaround times for multiple item counts',
      { timeout: 60_000 },
      async () => {
        const results: Array<{
          api: string;
          limit: number;
          rows: number;
          duration: number; // ms
          sizeBytes: number; // TSV body size (UTF-8)
        }> = [];

        const limitsForTest = [
          1, 100,
          //
          // 1_000,
          //
          // 10_000,
        ] as const;

        async function measure(limit: number): Promise<{
          rows: number;
          duration: number;
          sizeBytes: number;
        }> {
          const start = Date.now();
          const tsv: string = await client.downloadPrototypesTsv(
            {
              offset: 0,
              limit,
            },
            {
              // Keep logs modest for perf runs
              // logLevel: 'silent',
              // logLevel: 'info',
              logLevel: 'debug',
            },
          );
          const end = Date.now();

          // simple sanity checks on content
          expect(typeof tsv).toBe('string');
          expect(tsv.length).toBeGreaterThan(0);
          const rows = tsv.split(/\r?\n/).filter((line) => line.trim() !== '');
          const numberOfRows = rows.length;

          console.debug('Verify results for limit =', limit);
          console.debug(numberOfRows, 'rows returned');
          // console.debug(rows); // TSV はID順になっているようだが、順不同前提として考えるべきか // 最新のIDを取得する最適な方法に悩む

          expect(numberOfRows).toBeGreaterThan(0);

          // body size in bytes (UTF-8)
          const sizeBytes = new TextEncoder().encode(tsv).length;
          return { rows: numberOfRows, duration: end - start, sizeBytes };
        }

        for (const l of limitsForTest) {
          const result = await measure(l);
          results.push({
            api: 'downloadPrototypesTsv',
            limit: l,
            rows: result.rows,
            duration: result.duration,
            sizeBytes: result.sizeBytes,
          });
          expect(result.duration).toBeLessThan(30_000);
        }

        // Print a summary after the test completes
        console.info('');
        console.info(
          'Summary of turnaround times (ms) and TSV body size (bytes):',
        );
        for (const r of results) {
          console.info(
            `  api=${r.api} limit=${r.limit} rows=${r.rows} duration=${r.duration} size=${r.sizeBytes}`,
          );
        }
      },
    );
  });
});
