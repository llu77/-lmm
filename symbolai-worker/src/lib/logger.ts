/**
 * Structured Logging Utility for Cloudflare Pages Functions
 *
 * Provides structured logging with context, severity levels, and metadata.
 * Optimized for Cloudflare Workers/Pages environment.
 *
 * @module logger
 * @see https://developers.cloudflare.com/pages/functions/debugging-and-logging/
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private context: LogContext;
  private environment: string;

  constructor(context: LogContext = {}, environment = 'production') {
    this.context = context;
    this.environment = environment;
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger(
      { ...this.context, ...additionalContext },
      this.environment
    );
  }

  /**
   * Format log entry as structured JSON
   */
  private formatEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
    };

    if (metadata) {
      entry.metadata = metadata;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: this.environment === 'development' ? error.stack : undefined,
      };
    }

    return entry;
  }

  /**
   * Output log entry to console
   */
  private output(entry: LogEntry): void {
    const formattedMessage = `[${entry.level.toUpperCase()}] ${entry.message}`;

    switch (entry.level) {
      case 'debug':
        console.debug(formattedMessage, entry);
        break;
      case 'info':
        console.info(formattedMessage, entry);
        break;
      case 'warn':
        console.warn(formattedMessage, entry);
        break;
      case 'error':
        console.error(formattedMessage, entry);
        break;
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    if (this.environment === 'development') {
      const entry = this.formatEntry('debug', message, metadata);
      this.output(entry);
    }
  }

  /**
   * Log info message
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    const entry = this.formatEntry('info', message, metadata);
    this.output(entry);
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    const entry = this.formatEntry('warn', message, metadata);
    this.output(entry);
  }

  /**
   * Log error message
   */
  error(
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>
  ): void {
    const entry = this.formatEntry('error', message, metadata, error);
    this.output(entry);
  }

  /**
   * Log with custom level
   */
  log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    const entry = this.formatEntry(level, message, metadata);
    this.output(entry);
  }
}

/**
 * Create a logger instance with request context
 */
export function createLogger(context?: LogContext, environment?: string): Logger {
  return new Logger(context, environment);
}

/**
 * Generate unique request ID for tracing
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Extract request context from Astro context
 */
export function extractRequestContext(request: Request, url: URL): LogContext {
  return {
    requestId: generateRequestId(),
    path: url.pathname,
    method: request.method,
    ip: request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
  };
}

/**
 * Default logger instance (for non-request contexts)
 */
export const logger = createLogger({}, process.env.ENVIRONMENT || 'production');

export default logger;
