import { 
  estimateTokens, 
  truncateToTokenBudget, 
  createLogger 
} from "@visakha/shared-utils";
import type { 
  AssembledContext, 
  RetrievalResult, 
  ContextAssemblyConfig 
} from "@visakha/shared-types";

const log = createLogger("context-compressor");

/**
 * Context Compressor
 * 
 * Manages the "Working Memory" budget by selecting and truncating
 * retrieved context to fit within the LLM's context window.
 */
export class ContextCompressor {
  /**
   * Assemble and compress context to fit budget.
   */
  assemble(
    query: string,
    results: RetrievalResult[],
    config: ContextAssemblyConfig
  ): AssembledContext {
    log.debug("Assembling context", { results: results.length, budget: config.maxTokens });

    // 1. Deduplicate by content similarity (simple exact match or prefix)
    const uniqueResults = this.deduplicate(results, config.deduplication);

    // 2. Prioritize by score
    const sorted = [...uniqueResults].sort((a, b) => b.score - a.score);

    // 3. Assemble and check budget
    let assembled = "";
    const contributingSources: RetrievalResult[] = [];
    let currentTokens = estimateTokens(`Query: ${query}\n\nContext:\n`);
    let wasCompressed = false;

    for (const res of sorted) {
      const entryText = `[Source: ${res.source}] [Relevance: ${res.score.toFixed(2)}]\n${res.content}\n\n`;
      const entryTokens = estimateTokens(entryText);

      if (currentTokens + entryTokens > config.maxTokens) {
        // Try to include a truncated version if it's high score and we have space
        const remainingSpace = config.maxTokens - currentTokens;
        if (remainingSpace > 50 && res.score > 0.8) {
          const truncatedText = truncateToTokenBudget(res.content, remainingSpace - 10);
          assembled += `[Source: ${res.source}] [Relevance: ${res.score.toFixed(2)}] (Truncated)\n${truncatedText}\n\n`;
          contributingSources.push(res);
          wasCompressed = true;
        }
        break;
      }

      assembled += entryText;
      contributingSources.push(res);
      currentTokens += entryTokens;
    }

    return {
      contextString: assembled.trim(),
      sources: contributingSources,
      tokenCount: currentTokens,
      wasCompressed
    };
  }

  private deduplicate(results: RetrievalResult[], enabled: boolean): RetrievalResult[] {
    if (!enabled) return results;

    const seen = new Set<string>();
    return results.filter(res => {
      // Use first 100 chars as a fingerprint for near-duplicate detection
      const fingerprint = res.content.substring(0, 100).toLowerCase().trim();
      if (seen.has(fingerprint)) return false;
      seen.add(fingerprint);
      return true;
    });
  }
}
