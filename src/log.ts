/**
 * @packageDocumentation
 * Logging type definitions for the ProtoPedia API client.
 *
 * These types represent the log levels understood by the client and the shape
 * of the logger that can be supplied via client options.
 */

export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

export interface Logger {
  error(message: string, metadata?: unknown): void;
  warn(message: string, metadata?: unknown): void;
  info(message: string, metadata?: unknown): void;
  debug(message: string, metadata?: unknown): void;
}
