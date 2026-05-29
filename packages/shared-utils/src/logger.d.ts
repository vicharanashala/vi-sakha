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
export declare class StructuredLogger {
    private readonly service;
    private readonly minLevel;
    constructor(service: string, level?: LogLevel);
    debug(message: string, metadata?: Record<string, unknown>): void;
    info(message: string, metadata?: Record<string, unknown>): void;
    warn(message: string, metadata?: Record<string, unknown>): void;
    error(message: string, metadata?: Record<string, unknown>): void;
    child(subService: string): StructuredLogger;
    timed<T>(label: string, fn: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T>;
    private log;
}
export declare function createLogger(service: string, level?: LogLevel): StructuredLogger;
