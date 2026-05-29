"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryPredicates = void 0;
exports.withRetry = withRetry;
const DEFAULT_OPTIONS = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    jitterFraction: 0.25,
};
async function withRetry(fn, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError;
    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (opts.retryIf && !opts.retryIf(error)) {
                throw error;
            }
            if (attempt === opts.maxRetries)
                break;
            const exponentialDelay = opts.baseDelayMs * Math.pow(2, attempt);
            const jitter = 1 - opts.jitterFraction + Math.random() * opts.jitterFraction * 2;
            const delay = Math.min(exponentialDelay * jitter, opts.maxDelayMs);
            opts.onRetry?.(attempt + 1, error, delay);
            await sleep(delay);
        }
    }
    throw lastError;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
exports.RetryPredicates = {
    isTransient: (error) => {
        if (error instanceof Error) {
            const msg = error.message.toLowerCase();
            return (msg.includes('econnrefused') ||
                msg.includes('econnreset') ||
                msg.includes('etimedout') ||
                msg.includes('timeout') ||
                msg.includes('socket hang up') ||
                msg.includes('502') ||
                msg.includes('503') ||
                msg.includes('429'));
        }
        return false;
    },
    isRateLimited: (error) => {
        if (error instanceof Error) {
            return error.message.includes('429');
        }
        return false;
    },
};
//# sourceMappingURL=retry.js.map