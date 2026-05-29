import { QdrantClient } from "@qdrant/js-client-rest";
import { loadPlatformConfig } from "@visakha/config";
import { createLogger } from "@visakha/shared-utils";
import type { 
  VectorStore, 
  VectorSearchParams, 
  VectorSearchResult, 
  VectorUpsertEntry,
  VectorCollectionInfo
} from "@visakha/shared-types";

const log = createLogger("qdrant-adapter");

/**
 * Qdrant Vector Store Adapter
 * 
 * Implements semantic search using the Qdrant vector database.
 * Supports metadata filtering and distance-based retrieval.
 */
export class QdrantAdapter implements VectorStore {
  private client: QdrantClient;
  private config = loadPlatformConfig();

  constructor() {
    const { vector } = this.config;
    this.client = new QdrantClient({
      url: vector.qdrantUrl,
      apiKey: vector.qdrantApiKey,
    });
    log.info("Qdrant client initialized", { url: vector.qdrantUrl });
  }

  /**
   * Perform vector similarity search.
   */
  async search(params: VectorSearchParams): Promise<VectorSearchResult[]> {
    log.debug("Performing vector search", { 
      collection: params.collection, 
      limit: params.limit 
    });

    try {
      const results = await this.client.search(params.collection, {
        vector: params.vector,
        limit: params.limit,
        score_threshold: params.scoreThreshold,
        filter: params.filter as any,
        with_payload: true,
      });

      return results.map(res => ({
        id: res.id.toString(),
        score: res.score,
        payload: res.payload as Record<string, unknown>,
      }));
    } catch (error) {
      log.error("Qdrant search failed", { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Upsert points into a collection.
   */
  async upsert(entries: VectorUpsertEntry[]): Promise<void> {
    const collection = this.config.vector.defaultCollection;
    
    log.info(`Upserting ${entries.length} points to ${collection}`);

    const points = entries.map(entry => ({
      id: entry.id,
      vector: entry.vector,
      payload: entry.payload,
    }));

    try {
      await this.client.upsert(collection, {
        wait: true,
        points,
      });
    } catch (error) {
      log.error("Qdrant upsert failed", { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Delete points from a collection.
   */
  async delete(ids: string[]): Promise<void> {
    const collection = this.config.vector.defaultCollection;
    await this.client.delete(collection, {
      points: ids,
    });
  }

  /**
   * Get collection statistics and metadata.
   */
  async getCollectionInfo(): Promise<VectorCollectionInfo> {
    const collection = this.config.vector.defaultCollection;
    const info = await this.client.getCollection(collection);
    
    return {
      name: collection,
      vectorCount: info.indexed_vectors_count || 0,
      dimensions: this.config.vector.dimensions,
      distanceMetric: this.config.vector.distanceMetric,
    };
  }

  /**
   * Ensure collection exists with correct configuration.
   */
  async ensureCollection(): Promise<void> {
    const collection = this.config.vector.defaultCollection;
    const { vector } = this.config;

    try {
      await this.client.getCollection(collection);
      log.info(`Collection ${collection} already exists`);
    } catch (error) {
      log.info(`Creating collection ${collection}`);
      await this.client.createCollection(collection, {
        vectors: {
          size: vector.dimensions,
          distance: "Cosine", // Defaulting to Cosine as recommended for embeddings
        },
      });
    }
  }
}
