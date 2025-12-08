import {
  createTimeoutError,
  headersToPlainObject,
  isAbortError,
  mergeHeaders,
  serializeListPrototypeParams,
  toTimeout,
  trimTrailingSlash,
} from './client-utils.js';
import { ProtoPediaApiError } from './errors.js';
import {
  createLoggerConfig,
  getLoggerMethod,
  getLogLevelValue,
  headersForLogging,
  shouldLog,
  type Logger,
  type LoggerMethodLevel,
  type LogLevel,
} from './logger.js';
import { VERSION } from './version.js';

import type { ListPrototypesParams } from './types/protopedia-api-v2/request.js';
import type { ListPrototypesApiResponse } from './types/protopedia-api-v2/response.js';

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

const DEFAULT_USER_AGENT = `ProtoPedia API Ver 2.0 Node.js Client/${VERSION}`;
const DEFAULT_BASE_URL = 'https://protopedia.net/v2/api';
const DEFAULT_TIMEOUT_MS = 15_000;

type FetchFn = typeof fetch;

interface ExecuteOptions {
  readonly method: 'GET';
  readonly headers?: HeadersInit;
  readonly body?: BodyInit | null;
}

export class ProtoPediaApiClient {
  private readonly token: string | undefined;
  private readonly baseUrl: string;
  private readonly fetchFn: FetchFn;
  private readonly timeoutMs: number;
  private readonly userAgent: string | undefined;
  private readonly logger: Logger;
  private readonly logLevel: LogLevel;
  private readonly logLevelValue: number;

  /**
   * Creates a client capable of interacting with the ProtoPedia v2 API.
   *
   * @param options Optional configuration such as authentication, base URL,
   * and logging preferences.
   */
  constructor(options: ProtoPediaApiClientOptions = {}) {
    const fetchFn = options.fetch ?? globalThis.fetch;
    if (typeof fetchFn !== 'function') {
      throw new Error(
        'fetch is not available. Provide a fetch implementation in options.fetch.',
      );
    }

    this.fetchFn = fetchFn;
    this.token = options.token;
    this.baseUrl = trimTrailingSlash(options.baseUrl ?? DEFAULT_BASE_URL);
    this.timeoutMs = toTimeout(options.timeoutMs, DEFAULT_TIMEOUT_MS);
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;

    const loggerConfig = createLoggerConfig(options.logger, options.logLevel);
    this.logger = loggerConfig.logger;
    this.logLevel = loggerConfig.level;
    this.logLevelValue = loggerConfig.levelValue;
  }

  /**
   * Retrieves a paginated list of ProtoPedia prototypes.
   *
   * @see https://protopediav2.docs.apiary.io/#reference/0/0/0?console=1
   */
  async listPrototypes(
    params?: ListPrototypesParams,
    requestOptions?: ProtoPediaApiRequestOptions,
  ): Promise<ListPrototypesApiResponse> {
    const logLevelValue = this.resolveLogLevelValue(requestOptions);
    const url = this.buildUrl(
      '/prototype/list',
      serializeListPrototypeParams(params),
    );
    const method = 'GET';
    const response = await this.execute(
      url,
      {
        method,
        headers: {
          Accept: 'application/json',
        },
      },
      requestOptions,
      logLevelValue,
    );

    const payload = (await parseJson(
      response,
      method,
      'listPrototype',
    )) as ListPrototypesApiResponse;
    this.log('debug', 'listPrototype response payload', payload, logLevelValue);
    return payload;
  }

  /**
   * Downloads prototype metadata as a TSV document.
   *
   * @see https://protopediav2.docs.apiary.io/#reference/0/(tsv)/0
   */
  async downloadPrototypesTsv(
    params?: ListPrototypesParams,
    requestOptions?: ProtoPediaApiRequestOptions,
  ): Promise<string> {
    const logLevelValue = this.resolveLogLevelValue(requestOptions);
    const url = this.buildUrl(
      '/prototype/list/tsv',
      serializeListPrototypeParams(params),
    );
    const method = 'GET';
    const response = await this.execute(
      url,
      {
        method,
        headers: {
          Accept: 'application/json',
        },
      },
      requestOptions,
      logLevelValue,
    );

    const text = await response.text();
    this.log(
      'debug',
      'downloadPrototypesTsv response payload',
      text,
      logLevelValue,
    );
    return text;
  }

  /**
   * Performs the underlying HTTP request and wraps common logging and error handling.
   */
  protected async execute(
    url: string,
    options: ExecuteOptions,
    requestOptions?: ProtoPediaApiRequestOptions,
    configuredLevelValue?: number,
  ): Promise<Response> {
    const logLevelValue =
      configuredLevelValue ?? this.resolveLogLevelValue(requestOptions);
    const { method, body } = options;
    const headers = mergeHeaders(
      this.token ? { Authorization: `Bearer ${this.token}` } : undefined,
      this.userAgent ? { 'X-Client-User-Agent': this.userAgent } : undefined,
      options.headers,
      requestOptions?.headers,
    );

    const { signal, cleanup } = this.createAbortSignal(requestOptions?.signal);

    const init: RequestInit = {
      method,
      headers,
      signal,
    };

    if (body !== undefined) {
      init.body = body;
    }

    try {
      this.log(
        'debug',
        'HTTP request',
        {
          method,
          url,
          headers: headersForLogging(headers),
        },
        logLevelValue,
      );
      const response = await this.fetchFn(url, init);
      this.log(
        'debug',
        'HTTP response',
        {
          method,
          url,
          status: response.status,
          headers: headersForLogging(response.headers),
        },
        logLevelValue,
      );
      if (!response.ok) {
        const apiError = await buildError(response, method);
        this.log('error', 'API request failed', apiError, logLevelValue);
        throw apiError;
      }
      return response;
    } catch (error) {
      if (error instanceof ProtoPediaApiError) {
        throw error;
      }
      if (isAbortError(error) && requestOptions?.signal?.aborted) {
        this.log(
          'warn',
          'HTTP request aborted by caller',
          {
            method,
            url,
            reason: requestOptions.signal.reason,
          },
          logLevelValue,
        );
        throw requestOptions.signal.reason ?? error;
      }
      if (isAbortError(error)) {
        this.log(
          'warn',
          'HTTP request aborted',
          {
            method,
            url,
            error,
          },
          logLevelValue,
        );
      } else {
        this.log(
          'error',
          'HTTP request threw an unexpected error',
          {
            method,
            url,
            error,
          },
          logLevelValue,
        );
      }
      throw error;
    } finally {
      cleanup();
    }
  }

  private buildUrl(pathname: string, query: URLSearchParams): string {
    const normalizedPath = pathname.replace(/^\/+/, '');
    const base = `${this.baseUrl}/`;
    const url = new URL(normalizedPath, base);
    query.forEach((value, key) => {
      if (value !== '') {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  }

  private createAbortSignal(signal?: AbortSignal): {
    signal: AbortSignal;
    cleanup: () => void;
  } {
    const controller = new AbortController();
    const timeoutMs = this.timeoutMs;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let abortListener: (() => void) | undefined;

    if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        controller.abort(createTimeoutError(timeoutMs));
      }, timeoutMs);
    }

    if (signal) {
      if (signal.aborted) {
        controller.abort(signal.reason);
      } else {
        abortListener = () => {
          controller.abort(signal.reason);
        };
        signal.addEventListener('abort', abortListener, { once: true });
      }
    }

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (signal && abortListener) {
        signal.removeEventListener('abort', abortListener);
      }
    };

    return { signal: controller.signal, cleanup };
  }

  private log(
    level: LoggerMethodLevel,
    message: string,
    metadata?: unknown,
    configuredLevelValue?: number,
  ): void {
    const levelValue = configuredLevelValue ?? this.logLevelValue;
    if (!shouldLog(levelValue, level)) {
      return;
    }

    const method = getLoggerMethod(this.logger, level);
    if (metadata === undefined) {
      method(message);
    } else {
      method(message, metadata);
    }
  }

  private resolveLogLevelValue(
    requestOptions?: ProtoPediaApiRequestOptions,
  ): number {
    if (!requestOptions?.logLevel) {
      return this.logLevelValue;
    }

    return getLogLevelValue(requestOptions.logLevel);
  }
}

/**
 * Builds a ProtoPedia API client.
 */
export function createProtoPediaClient(
  options: ProtoPediaApiClientOptions = {},
): ProtoPediaApiClient {
  const token = options.token;
  if (token == null || !token) {
    throw new Error('Missing PROTOPEDIA_API_V2_TOKEN.');
  }
  return new ProtoPediaApiClient(options);
}

async function parseJson(
  response: Response,
  method: string,
  context: string,
): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    const text = await response.text();
    throw new ProtoPediaApiError({
      message: `Failed to parse ${context} response as JSON`,
      method,
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      headers: headersToPlainObject(response.headers),
      body: text,
      cause: error,
    });
  }
}

async function buildError(
  response: Response,
  method: string,
): Promise<ProtoPediaApiError> {
  let body: unknown = null;

  // Prefer JSON when content-type hints JSON; otherwise text. Use clone() to
  // avoid consuming the body twice and causing "Body has already been read".
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (contentType.includes('application/json')) {
    try {
      const copy = response.clone();
      body = await copy.json();
    } catch {
      try {
        body = await response.text();
      } catch (readError) {
        body = { parseError: (readError as Error).message };
      }
    }
  } else {
    try {
      body = await response.text();
    } catch (textError) {
      try {
        // As a last resort, try JSON on the original response without cloning
        // to support minimal mock Response objects in tests.
        body = await (response as Response).json();
      } catch {
        body = { parseError: (textError as Error).message };
      }
    }
  }

  return new ProtoPediaApiError({
    message: 'API request failed',
    method,
    status: response.status,
    statusText: response.statusText,
    url: response.url,
    headers: headersToPlainObject(response.headers),
    body,
  });
}
