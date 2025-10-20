import { expect } from 'vitest';
import type { ListPrototypesApiResponse } from '../../src/types/protopedia-api-v2/response.js';

/**
 * Assert that the metadata indicates a successful response
 * @param metadata The metadata to check
 */
export function assertOkMetadata(
  metadata: ListPrototypesApiResponse['metadata'],
): void {
  expect(metadata).toEqual({
    status: 200,
    title: 'OK',
    detail: 'The request sent by the client was successful.',
  });
}
