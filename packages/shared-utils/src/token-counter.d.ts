export declare function estimateTokens(text: string): number;
export declare function truncateToTokenBudget(text: string, maxTokens: number): string;
export declare function chunkByTokens(text: string, maxTokensPerChunk: number): string[];
export declare const MODEL_CONTEXT_WINDOWS: Record<string, number>;
export declare function getMaxInputTokens(model: string, outputReserveRatio?: number): number;
