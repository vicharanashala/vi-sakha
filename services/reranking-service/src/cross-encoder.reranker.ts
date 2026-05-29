import axios from "axios";
import { loadPlatformConfig } from "@visakha/config";
import { createLogger, withRetry, RetryPredicates } from "@visakha/shared-utils";
import type { 
  Reranker, 
  RerankParams, 
  RerankResult 
} from "@visakha/shared-types";

const log = createLogger("cross-encoder-reranker");

/**
 * Cross-Encoder Reranker
 * 
 * Performs high-precision reranking using a local cross-encoder model.
 * Bridges to the Python vision/embedding service.
 */
export class CrossEncoderReranker implements Reranker {
  private config = loadPlatformConfig();

  async rerank(params: RerankParams): Promise<RerankResult[]> {
    const { retrieval } = this.config;
    
    log.info(`Reranking ${params.documents.length} candidates`, { query: params.query });

    if (params.documents.length === 0) return [];

    try {
      /**
       * Execute via Python sidecar / reranking-service.
       * Uses exponential retry for transient network issues.
       */
      const response = await withRetry(
        () => axios.post(`${this.config.embedding.sidecarUrl}/rerank`, {
          query: params.query,
          documents: params.documents.map(d => d.text),
          top_n: params.topN,
          model: retrieval.rerankModel
        }),
        { retryIf: RetryPredicates.isTransient }
      );

      const results = response.data as { index: number; score: number }[];

      // Map scores back to original documents
      return results.map((res, rank) => {
        const doc = params.documents[res.index];
        return {
          id: doc.id,
          text: doc.text,
          score: res.score,
          originalRank: res.index,
          metadata: doc.metadata
        };
      });
    } catch (error) {
      log.error("Reranking failed, falling back to original order", { 
        error: (error as Error).message 
      });
      
      // Fallback: return top N from original list if reranking fails
      return params.documents.slice(0, params.topN).map((doc, index) => ({
        id: doc.id,
        text: doc.text,
        score: 1.0 / (index + 1), // Fake score for fallback
        originalRank: index,
        metadata: doc.metadata
      }));
    }
  }
}
