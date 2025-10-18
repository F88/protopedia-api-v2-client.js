import { expect } from 'vitest';
import { ListPrototypesApiResponse } from '../../types/protopedia-api-v2/response';
// import { ListPrototypesApiResponse } from '../../src/types';

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
