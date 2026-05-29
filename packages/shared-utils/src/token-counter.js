"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODEL_CONTEXT_WINDOWS = void 0;
exports.estimateTokens = estimateTokens;
exports.truncateToTokenBudget = truncateToTokenBudget;
exports.chunkByTokens = chunkByTokens;
exports.getMaxInputTokens = getMaxInputTokens;
function estimateTokens(text) {
    if (!text)
        return 0;
    const words = text.split(/\s+/).filter(Boolean);
    return Math.ceil(words.length * 1.33);
}
function truncateToTokenBudget(text, maxTokens) {
    const currentTokens = estimateTokens(text);
    if (currentTokens <= maxTokens)
        return text;
    const ratio = maxTokens / currentTokens;
    const targetChars = Math.floor(text.length * ratio * 0.95);
    const truncated = text.substring(0, targetChars);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastNewline = truncated.lastIndexOf('\n');
    const cutPoint = Math.max(lastPeriod, lastNewline);
    if (cutPoint > targetChars * 0.5) {
        return truncated.substring(0, cutPoint + 1);
    }
    return truncated + '...';
}
function chunkByTokens(text, maxTokensPerChunk) {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks = [];
    let current = '';
    for (const sentence of sentences) {
        const combined = current ? `${current} ${sentence}` : sentence;
        if (estimateTokens(combined) > maxTokensPerChunk && current) {
            chunks.push(current.trim());
            current = sentence;
        }
        else {
            current = combined;
        }
    }
    if (current.trim()) {
        chunks.push(current.trim());
    }
    return chunks;
}
exports.MODEL_CONTEXT_WINDOWS = {
    'claude-haiku-4-5-20251001': 200000,
    'claude-sonnet-4-20250514': 200000,
    'claude-opus-4-20250514': 200000,
    'gemini-2.5-flash': 1000000,
    'gemini-2.5-pro': 1000000,
    'gpt-4o': 128000,
    'gpt-4o-mini': 128000,
};
function getMaxInputTokens(model, outputReserveRatio = 0.2) {
    const total = exports.MODEL_CONTEXT_WINDOWS[model] ?? 100000;
    return Math.floor(total * (1 - outputReserveRatio));
}
//# sourceMappingURL=token-counter.js.map