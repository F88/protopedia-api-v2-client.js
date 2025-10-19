import type { Logger, LogLevel } from '../types/client/log.js';

/**
 * Subset of log levels that can be used to select a method on the logger.
 */
export type LoggerMethodLevel = Exclude<LogLevel, 'silent'>;

/**
 * Mapping of log levels to numeric values for comparison purposes.
 */
const LOG_LEVEL_VALUES: Record<Exclude<LogLevel, 'silent'>, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

/**
 * No-operation logger that ignores all messages.
 */
const NOOP_LOGGER: Logger = {
  error: () => {},
  warn: () => {},
  info: () => {},
  debug: () => {},
};

/**
 * Configuration bag for a logger instance.
 */
export interface LoggerConfig {
  /** Sanitised logger implementation used for emitting messages. */
  readonly logger: Logger;
  /** Configured log level as provided by the caller or defaults. */
  readonly level: LogLevel;
  /** Numeric representation of the configured log level. */
  readonly levelValue: number;
}

/**
 * Normalises logger configuration, providing defaults for missing pieces.
 */
export function createLoggerConfig(
  logger?: Logger,
  level?: LogLevel,
): LoggerConfig {
  const resolvedLevel = level ?? 'error';
  const sanitizedLogger = sanitizeLogger(logger ?? createConsoleLogger());

  return {
    logger: sanitizedLogger,
    level: resolvedLevel,
    levelValue: getLogLevelValue(resolvedLevel),
  };
}

/**
 * Determines whether a message with the provided level should be emitted.
 */
export function shouldLog(
  configuredLevelValue: number,
  messageLevel: LogLevel,
): boolean {
  if (configuredLevelValue < 0) {
    return false;
  }

  const messageLevelValue = getLogLevelValue(messageLevel);
  if (messageLevelValue < 0) {
    return false;
  }

  return messageLevelValue <= configuredLevelValue;
}

/**
 * Converts arbitrary string input into a supported log level, if possible.
 */
export function normaliseLogLevel(
  input: string | undefined | null,
): LogLevel | undefined {
  if (typeof input !== 'string') {
    return undefined;
  }

  const value = input.trim().toLowerCase();
  if (!value) {
    return undefined;
  }

  switch (value) {
    case 'silent':
    case 'error':
    case 'warn':
    case 'warning':
      return value === 'warning' ? 'warn' : value;
    case 'info':
    case 'debug':
      return value;
    default:
      return undefined;
  }
}

/**
 * Provides the numeric representation for a log level, with silent mapped to -1.
 */
export function getLogLevelValue(level: LogLevel): number {
  if (level === 'silent') {
    return -1;
  }
  return LOG_LEVEL_VALUES[level];
}

function sanitizeLogger(logger: Logger): Logger {
  return {
    error: coalesceLoggerMethod(logger.error),
    warn: coalesceLoggerMethod(logger.warn, logger.error),
    info: coalesceLoggerMethod(logger.info, logger.warn ?? logger.error),
    debug: coalesceLoggerMethod(
      logger.debug,
      logger.info ?? logger.warn ?? logger.error,
    ),
  };
}

function coalesceLoggerMethod(
  candidate: ((message: string, metadata?: unknown) => void) | undefined,
  fallback?: (message: string, metadata?: unknown) => void,
): (message: string, metadata?: unknown) => void {
  if (typeof candidate === 'function') {
    return wrapMethod(candidate);
  }
  if (typeof fallback === 'function') {
    return wrapMethod(fallback);
  }
  return NOOP_LOGGER.debug;
}

function wrapMethod(
  method: (message: string, metadata?: unknown) => void,
): (message: string, metadata?: unknown) => void {
  return (message: string, metadata?: unknown) => {
    if (metadata === undefined) {
      method(message);
    } else {
      method(message, metadata);
    }
  };
}

function createConsoleLogger(): Logger {
  if (typeof console !== 'object' || console === null) {
    return NOOP_LOGGER;
  }

  const fallback = wrapMethod(() => {});

  const error =
    typeof console.error === 'function'
      ? wrapMethod(console.error.bind(console))
      : fallback;
  const warn =
    typeof console.warn === 'function'
      ? wrapMethod(console.warn.bind(console))
      : error;
  const info =
    typeof console.info === 'function'
      ? wrapMethod(console.info.bind(console))
      : warn;
  const debug =
    typeof console.debug === 'function'
      ? wrapMethod(console.debug.bind(console))
      : info;

  return {
    error,
    warn,
    info,
    debug,
  };
}

/**
 * Selects the method on the logger that corresponds to the desired level.
 */
export function getLoggerMethod(
  logger: Logger,
  level: LoggerMethodLevel,
): (message: string, metadata?: unknown) => void {
  return logger[level];
}

/**
 * Converts Headers into a plain object suitable for structured logging.
 */
export function headersForLogging(
  headers: Headers | HeadersInit | undefined,
): Record<string, string> | undefined {
  if (!headers) {
    return undefined;
  }

  if (headers instanceof Headers) {
    return headersToObject(headers);
  }

  const constructed = new Headers(headers);
  return headersToObject(constructed);
}
/**
 * Converts Headers into a plain object suitable for structured logging.
 *
 * When a header key includes 'token' or 'auth' (case-insensitive),
 * its value is masked as '***'.
 *
 * @param headers
 * @returns
 */
function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    const keyLower = key.toLowerCase();
    const shouldMask = keyLower.includes('token') || keyLower.includes('auth');
    out[key] = shouldMask ? '***' : value;
  });
  return out;
}
