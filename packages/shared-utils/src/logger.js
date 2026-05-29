"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StructuredLogger = void 0;
exports.createLogger = createLogger;
const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
class StructuredLogger {
    constructor(service, level = 'info') {
        this.service = service;
        this.minLevel = LOG_LEVELS[level];
    }
    debug(message, metadata) {
        this.log('debug', message, metadata);
    }
    info(message, metadata) {
        this.log('info', message, metadata);
    }
    warn(message, metadata) {
        this.log('warn', message, metadata);
    }
    error(message, metadata) {
        this.log('error', message, metadata);
    }
    child(subService) {
        return new StructuredLogger(`${this.service}:${subService}`, Object.entries(LOG_LEVELS).find(([, v]) => v === this.minLevel)?.[0] ?? 'info');
    }
    async timed(label, fn, metadata) {
        const start = Date.now();
        try {
            const result = await fn();
            this.info(label, { ...metadata, durationMs: Date.now() - start });
            return result;
        }
        catch (error) {
            this.error(`${label} failed`, {
                ...metadata,
                durationMs: Date.now() - start,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    log(level, message, metadata) {
        if (LOG_LEVELS[level] < this.minLevel)
            return;
        const entry = {
            level,
            message,
            service: this.service,
            timestamp: new Date().toISOString(),
            metadata,
        };
        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction) {
            const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
            logFn(JSON.stringify(entry));
        }
        else {
            const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${this.service}]`;
            const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
            const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
            logFn(`${prefix} ${message}${metaStr}`);
        }
    }
}
exports.StructuredLogger = StructuredLogger;
function createLogger(service, level) {
    return new StructuredLogger(service, level ?? process.env.LOG_LEVEL ?? 'info');
}
//# sourceMappingURL=logger.js.map