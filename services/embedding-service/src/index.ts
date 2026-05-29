import axios from "axios";
import { loadPlatformConfig } from "@visakha/config";
import { createLogger, withRetry, RetryPredicates } from "@visakha/shared-utils";

const log = createLogger("embedding-service");

/**
 * Embedding Service
 * 
 * Handles text embeddings by calling the Python sidecar.
 */
export class EmbeddingService {
  private config = loadPlatformConfig();

  async generateEmbedding(text: string): Promise<number[]> {
    log.info("Generating embedding for text", { length: text.length });

    try {
      const response = await withRetry(
        () => axios.post<{ embedding: number[] }>(`${this.config.embedding.sidecarUrl}/embed`, {
          text
        }),
        { retryIf: RetryPredicates.isTransient }
      );

      return response.data.embedding;
    } catch (error) {
      log.error("Embedding generation failed", { error: (error as Error).message });
      throw error;
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    log.info("Generating batch embeddings", { count: texts.length });

    try {
      const response = await withRetry(
        () => axios.post<{ embeddings: number[][] }>(`${this.config.embedding.sidecarUrl}/embed/batch`, {
          texts
        }),
        { retryIf: RetryPredicates.isTransient }
      );

      return response.data.embeddings;
    } catch (error) {
      log.error("Batch embedding generation failed", { error: (error as Error).message });
      throw error;
    }
  }
}

export const embeddingService = new EmbeddingService();
