import { describe, expect, it } from 'vitest';

import {
  ProtoPediaApiClient as ClientViaIndex,
  ProtoPediaApiError as ErrorViaIndex,
  createProtoPediaClient as createClientViaIndex,
  createProtoPediaClientFromEnv as createClientFromEnvViaIndex,
} from '../../src/index.js';
import {
  ProtoPediaApiClient as ProtoPediaApiClientDirect,
  createProtoPediaClient as createClientDirect,
  createProtoPediaClientFromEnv as createClientFromEnvDirect,
} from '../../src/client.js';
import { ProtoPediaApiError } from '../../src/errors.js';

describe('src/index exports', () => {
  it('re-exports client constructor and factories', () => {
    expect(ClientViaIndex).toBe(ProtoPediaApiClientDirect);
    expect(createClientViaIndex).toBe(createClientDirect);
    expect(createClientFromEnvViaIndex).toBe(createClientFromEnvDirect);
  });

  it('re-exports ProtoPediaApiError', () => {
    expect(ErrorViaIndex).toBe(ProtoPediaApiError);
  });
});
