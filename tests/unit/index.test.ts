import { describe, expect, it } from 'vitest';

// Import the package entry to validate runtime exports
import * as entry from '../../src/index.js';
import type { Logger, LogLevel } from '../../src/index.js';

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
    // Type-only: ProtoPediaApiClientOptions, ProtoPediaApiRequestOptions, Logger, LogLevel
    const exported = entry as Record<string, unknown>;

    expect(exported['ProtoPediaApiClientOptions']).toBeUndefined();
    expect(exported['ProtoPediaApiRequestOptions']).toBeUndefined();
    expect(exported['Logger']).toBeUndefined();
    expect(exported['LogLevel']).toBeUndefined();

    // Re-exported types from request/response should not be present at runtime
    expect(exported['ListPrototypesParams']).toBeUndefined();
    expect(exported['ListPrototypesApiResponse']).toBeUndefined();
    expect(exported['ResultOfListPrototypesApiResponse']).toBeUndefined();
  });

  it('exports Logger and LogLevel types usable for a custom logger', () => {
    // Compile-time check: these types must be importable from the entry.
    const level: LogLevel = 'warn';
    const logger: Logger = {
      error: () => {},
      warn: () => {},
      info: () => {},
      debug: () => {},
    };

    const client = entry.createProtoPediaClient({
      token: 't',
      logger,
      logLevel: level,
    });
    expect(client).toBeInstanceOf(entry.ProtoPediaApiClient);
  });
});
