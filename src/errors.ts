/**
 * Configuration bag for constructing a {@link ProtoPediaApiError} instance.
 */
export interface ProtoPediaApiErrorOptions {
  /** Human readable explanation of the failure. */
  message: string;
  /** HTTP status code returned by the ProtoPedia API. */
  status: number;
  /** HTTP status text returned by the ProtoPedia API. */
  statusText: string;
  /** Fully qualified request URL that triggered the failure. */
  url: string;
  /** Optional parsed response payload for additional diagnostics. */
  body?: unknown;
  /** Optional subset of HTTP headers that are safe to surface to callers. */
  headers?: Record<string, string>;
  /** Root cause error, when the failure originated upstream. */
  cause?: unknown;
}

/**
 * Error type used to represent unsuccessful ProtoPedia API responses.
 */
export class ProtoPediaApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly url: string;
  readonly body: unknown;
  readonly headers: Record<string, string>;

  /**
   * Creates a typed error that mirrors the failing HTTP response produced by the
   * ProtoPedia API.
   */
  constructor(options: ProtoPediaApiErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = 'ProtoPediaApiError';
    this.status = options.status;
    this.statusText = options.statusText;
    this.url = options.url;
    this.body = options.body ?? null;
    this.headers = { ...options.headers };
  }

  /**
   * Converts the error into a JSON serialisable representation suitable for
   * logging or rethrowing across process boundaries.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      statusText: this.statusText,
      url: this.url,
      body: this.body,
      headers: this.headers,
    };
  }
}
