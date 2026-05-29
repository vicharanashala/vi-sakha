/**
 * Token Counter
 *
 * Approximate token estimation for context window management.
 * Uses a fast heuristic (word-based) rather than tiktoken for speed.
 * Accurate enough for budgeting — not for billing.
 */

/**
 * Estimate token count using a word-based heuristic.
 * Average: 1 token ≈ 0.75 words (English text).
 * This is intentionally conservative (overestimates slightly).
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Split on whitespace and punctuation boundaries
  const words = text.split(/\s+/).filter(Boolean);
  // ~1.33 tokens per word on average for English
  return Math.ceil(words.length * 1.33);
}

/**
 * Truncate text to fit within a token budget.
 * Tries to cut at sentence boundaries for cleaner output.
 */
export function truncateToTokenBudget(text: string, maxTokens: number): string {
  const currentTokens = estimateTokens(text);
  if (currentTokens <= maxTokens) return text;

  // Estimate character ratio
  const ratio = maxTokens / currentTokens;
  const targetChars = Math.floor(text.length * ratio * 0.95); // 5% safety margin

  // Try to cut at a sentence boundary
  const truncated = text.substring(0, targetChars);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastNewline = truncated.lastIndexOf('\n');
  const cutPoint = Math.max(lastPeriod, lastNewline);

  if (cutPoint > targetChars * 0.5) {
    return truncated.substring(0, cutPoint + 1);
  }

  return truncated + '...';
}

/**
 * Split text into chunks that each fit within a token budget.
 */
export function chunkByTokens(text: string, maxTokensPerChunk: number): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const combined = current ? `${current} ${sentence}` : sentence;
    if (estimateTokens(combined) > maxTokensPerChunk && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = combined;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

/**
 * Model context window sizes (approximate max input tokens)
 */
export const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  'claude-haiku-4-5-20251001': 200000,
  'claude-sonnet-4-20250514': 200000,
  'claude-opus-4-20250514': 200000,
  'gemini-2.5-flash': 1000000,
  'gemini-2.5-pro': 1000000,
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
};

/**
 * Get the max context tokens for a model, with a safety buffer.
 * Reserves 20% for output tokens by default.
 */
export function getMaxInputTokens(
  model: string,
  outputReserveRatio = 0.2,
): number {
  const total = MODEL_CONTEXT_WINDOWS[model] ?? 100000;
  return Math.floor(total * (1 - outputReserveRatio));
}
