/**
 * Retry with exponential backoff and jitter.
 *
 * Prevents thundering herd on transient failures by spreading
 * retries across a randomized time window.
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;
  /** Base delay in milliseconds (default: 1000) */
  baseDelayMs: number;
  /** Maximum delay cap in milliseconds (default: 30000) */
  maxDelayMs: number;
  /** Jitter range as a fraction (default: 0.25 = ±25%) */
  jitterFraction: number;
  /** Optional predicate — only retry if this returns true */
  retryIf?: (error: unknown) => boolean;
  /** Optional callback on each retry */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterFraction: 0.25,
};

/**
 * Execute a function with retry logic.
 *
 * @example
 * const result = await withRetry(
 *   () => fetchFromApi('/data'),
 *   { maxRetries: 3, baseDelayMs: 500 }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (opts.retryIf && !opts.retryIf(error)) {
        throw error;
      }

      // Don't delay after last attempt
      if (attempt === opts.maxRetries) break;

      // Calculate exponential backoff with jitter
      const exponentialDelay = opts.baseDelayMs * Math.pow(2, attempt);
      const jitter = 1 - opts.jitterFraction + Math.random() * opts.jitterFraction * 2;
      const delay = Math.min(exponentialDelay * jitter, opts.maxDelayMs);

      opts.onRetry?.(attempt + 1, error, delay);

      await sleep(delay);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Common retry predicates
 */
export const RetryPredicates = {
  /** Retry on network/timeout errors only */
  isTransient: (error: unknown): boolean => {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      return (
        msg.includes('econnrefused') ||
        msg.includes('econnreset') ||
        msg.includes('etimedout') ||
        msg.includes('timeout') ||
        msg.includes('socket hang up') ||
        msg.includes('502') ||
        msg.includes('503') ||
        msg.includes('429')
      );
    }
    return false;
  },

  /** Retry on rate limit (429) errors */
  isRateLimited: (error: unknown): boolean => {
    if (error instanceof Error) {
      return error.message.includes('429');
    }
    return false;
  },
};
