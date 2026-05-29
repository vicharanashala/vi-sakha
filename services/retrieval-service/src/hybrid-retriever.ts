import { MongoVectorStore } from "./vector-store/mongo-vector.store";
import { CrossEncoderReranker } from "@visakha/reranking-service/dist/cross-encoder.reranker";
import { embeddingService } from "@visakha/embedding-service";
import { loadPlatformConfig } from "@visakha/config";
import { createLogger } from "@visakha/shared-utils";
import type { 
  RetrievalQuery, 
  RetrievalResult,
  VectorSearchResult
} from "@visakha/shared-types";

const log = createLogger("hybrid-retriever");

/**
 * Hybrid Retriever
 * 
 * Orchestrates semantic vector search and high-precision reranking.
 * Future: Add BM25 keyword search for true hybrid retrieval.
 */
export class HybridRetriever {
  private vectorStore = new MongoVectorStore();
  private reranker = new CrossEncoderReranker();
  private config = loadPlatformConfig();

  /**
   * Main retrieval pipeline.
   */
  async retrieve(query: RetrievalQuery): Promise<RetrievalResult[]> {
    log.info("Starting retrieval pipeline", { query: query.text });

    // 1. Semantic Search (Top K candidates)
    const queryVector = query.embedding || await embeddingService.generateEmbedding(query.text);
    
    const candidates = await this.vectorStore.search({
      collection: this.config.vector.defaultCollection,
      vector: queryVector,
      limit: query.topK,
      scoreThreshold: query.minScore,
    });

    if (candidates.length === 0) {
      log.info("No candidates found in vector search");
      return [];
    }

    // 2. Reranking (Top N final results)
    const reranked = await this.reranker.rerank({
      query: query.text,
      documents: candidates.map((c: VectorSearchResult) => ({
        id: c.id,
        text: (c.payload.content as string) || "",
        metadata: c.payload
      })),
      topN: query.topN
    });

    // 3. Map to final RetrievalResult format
    return reranked.map(res => ({
      id: res.id,
      content: res.text,
      score: res.score,
      source: (res.metadata?.source as any) || 'qa_pairs',
      type: (res.metadata?.type as any) || 'qa_pair',
      metadata: res.metadata as any
    }));
  }
}
