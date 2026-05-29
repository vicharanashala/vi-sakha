export interface RetryOptions {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    jitterFraction: number;
    retryIf?: (error: unknown) => boolean;
    onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}
export declare function withRetry<T>(fn: () => Promise<T>, options?: Partial<RetryOptions>): Promise<T>;
export declare const RetryPredicates: {
    isTransient: (error: unknown) => boolean;
    isRateLimited: (error: unknown) => boolean;
};
