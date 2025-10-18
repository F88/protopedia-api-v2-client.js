import type { LogLevel, Logger } from './log.js';

/**
 * @packageDocumentation
 * Client-facing type definitions for configuring and interacting with the
 * ProtoPedia API client.
 *
 * These types cover client options and environment helpers. Request parameter
 * interfaces are maintained in `../../protopedia-api-v2/types/request.js` and
 * re-exported here for convenience, while logging interfaces live in
 * `./log.js`.
 */

export interface ProtoPediaApiClientOptions {
  token?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  userAgent?: string;
  timeoutMs?: number;
  logger?: Logger;
  logLevel?: LogLevel;
}

export interface ProtoPediaApiRequestOptions {
  signal?: AbortSignal;
  headers?: HeadersInit;
  /**
   * Overrides the client's configured log level for the duration of the
   * request.
   */
  logLevel?: LogLevel;
}

export interface CreateClientFromEnvOptions extends ProtoPediaApiClientOptions {
  env?: Record<string, string | undefined>;
}

export type {
  LogLevel as ProtoPediaLogLevel,
  Logger as ProtoPediaLogger,
} from './log.js';
export type { ListPrototypesParams } from '../protopedia-api-v2/request.js';
