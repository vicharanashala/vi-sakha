export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
export interface CircuitBreakerOptions {
    failureThreshold: number;
    resetTimeoutMs: number;
    successThreshold: number;
    onStateChange?: (from: CircuitState, to: CircuitState) => void;
}
export declare class CircuitBreaker {
    private readonly name;
    private state;
    private failureCount;
    private successCount;
    private lastFailureTime;
    private readonly options;
    constructor(name: string, options?: Partial<CircuitBreakerOptions>);
    get currentState(): CircuitState;
    execute<T>(fn: () => Promise<T>): Promise<T>;
    private onSuccess;
    private onFailure;
    private transitionTo;
    reset(): void;
}
export declare class CircuitOpenError extends Error {
    constructor(serviceName: string);
}
