import { describe, expect, it } from 'vitest';

// Import the package entry to validate runtime exports
import * as entry from '../../src/index.js';

describe('src/index.ts public API', () => {
  it('exports createProtoPediaClient and ProtoPediaApiClient', () => {
    expect(typeof entry.createProtoPediaClient).toBe('function');
    expect(typeof entry.ProtoPediaApiClient).toBe('function');
  });

  it('exports ProtoPediaApiError', () => {
    expect(typeof entry.ProtoPediaApiError).toBe('function');
  });

  it('does not export deprecated createProtoPediaClientFromEnv', () => {
    const exported = entry as Record<string, unknown>;
    expect('createProtoPediaClientFromEnv' in exported).toBe(false);
  });

  it('does not expose type-only exports at runtime', () => {
    // Type-only: ProtoPediaApiClientOptions, ProtoPediaApiRequestOptions, LogLevel
    const exported = entry as Record<string, unknown>;

    expect(exported['ProtoPediaApiClientOptions']).toBeUndefined();
    expect(exported['ProtoPediaApiRequestOptions']).toBeUndefined();
    expect(exported['LogLevel']).toBeUndefined();

    // Re-exported types from request/response should not be present at runtime
    expect(exported['ListPrototypesParams']).toBeUndefined();
    expect(exported['ListPrototypesParams_Old']).toBeUndefined();
    expect(exported['ListPrototypesApiResponse']).toBeUndefined();
    expect(exported['ResultOfListPrototypesApiResponse']).toBeUndefined();
  });
});
