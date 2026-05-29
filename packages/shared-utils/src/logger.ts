/**
 * Structured Logger
 *
 * Wraps console with structured JSON output for production environments.
 * Falls back to pretty-printed console in development.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  service: string;
  timestamp: string;
  traceId?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class StructuredLogger {
  private readonly minLevel: number;

  constructor(
    private readonly service: string,
    level: LogLevel = 'info',
  ) {
    this.minLevel = LOG_LEVELS[level];
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log('debug', message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log('warn', message, metadata);
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    this.log('error', message, metadata);
  }

  /** Create a child logger with a sub-context */
  child(subService: string): StructuredLogger {
    return new StructuredLogger(
      `${this.service}:${subService}`,
      Object.entries(LOG_LEVELS).find(
        ([, v]) => v === this.minLevel,
      )?.[0] as LogLevel ?? 'info',
    );
  }

  /** Time an async operation and log duration */
  async timed<T>(
    label: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>,
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      this.info(label, { ...metadata, durationMs: Date.now() - start });
      return result;
    } catch (error) {
      this.error(`${label} failed`, {
        ...metadata,
        durationMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    if (LOG_LEVELS[level] < this.minLevel) return;

    const entry: LogEntry = {
      level,
      message,
      service: this.service,
      timestamp: new Date().toISOString(),
      metadata,
    };

    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      // JSON output for log aggregators (ELK, CloudWatch, etc.)
      const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      logFn(JSON.stringify(entry));
    } else {
      // Pretty output for development
      const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${this.service}]`;
      const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
      const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      logFn(`${prefix} ${message}${metaStr}`);
    }
  }
}

/**
 * Create a logger for a service.
 * @example const log = createLogger('agent-orchestrator');
 */
export function createLogger(service: string, level?: LogLevel): StructuredLogger {
  return new StructuredLogger(
    service,
    level ?? (process.env.LOG_LEVEL as LogLevel) ?? 'info',
  );
}
