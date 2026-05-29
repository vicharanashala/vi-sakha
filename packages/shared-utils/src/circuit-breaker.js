"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitOpenError = exports.CircuitBreaker = void 0;
const DEFAULT_CB_OPTIONS = {
    failureThreshold: 5,
    resetTimeoutMs: 30000,
    successThreshold: 2,
};
class CircuitBreaker {
    constructor(name, options = {}) {
        this.name = name;
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = 0;
        this.options = { ...DEFAULT_CB_OPTIONS, ...options };
    }
    get currentState() {
        return this.state;
    }
    async execute(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime >= this.options.resetTimeoutMs) {
                this.transitionTo('HALF_OPEN');
            }
            else {
                throw new CircuitOpenError(this.name);
            }
        }
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    onSuccess() {
        if (this.state === 'HALF_OPEN') {
            this.successCount++;
            if (this.successCount >= this.options.successThreshold) {
                this.transitionTo('CLOSED');
            }
        }
        if (this.state === 'CLOSED') {
            this.failureCount = 0;
        }
    }
    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.state === 'HALF_OPEN') {
            this.transitionTo('OPEN');
        }
        else if (this.failureCount >= this.options.failureThreshold) {
            this.transitionTo('OPEN');
        }
    }
    transitionTo(newState) {
        const oldState = this.state;
        this.state = newState;
        if (newState === 'CLOSED') {
            this.failureCount = 0;
            this.successCount = 0;
        }
        else if (newState === 'HALF_OPEN') {
            this.successCount = 0;
        }
        this.options.onStateChange?.(oldState, newState);
    }
    reset() {
        this.transitionTo('CLOSED');
    }
}
exports.CircuitBreaker = CircuitBreaker;
class CircuitOpenError extends Error {
    constructor(serviceName) {
        super(`Circuit breaker OPEN for service: ${serviceName}`);
        this.name = 'CircuitOpenError';
    }
}
exports.CircuitOpenError = CircuitOpenError;
//# sourceMappingURL=circuit-breaker.js.map