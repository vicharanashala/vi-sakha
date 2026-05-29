import mongoose from "mongoose";
import { loadPlatformConfig } from "@visakha/config";
import { createLogger } from "@visakha/shared-utils";
import type { 
  VectorStore, 
  VectorSearchParams, 
  VectorSearchResult, 
  VectorUpsertEntry,
  VectorCollectionInfo
} from "@visakha/shared-types";

const log = createLogger("mongo-vector-store");

/**
 * MongoDB Vector Store Adapter
 * 
 * Handles vector search using MongoDB Atlas Vector Search ($vectorSearch).
 */
export class MongoVectorStore implements VectorStore {
  /**
   * Search for similar documents using vector similarity.
   */
  async search(params: VectorSearchParams): Promise<VectorSearchResult[]> {
    const { vector, limit, collection: collectionName, scoreThreshold } = params;

    if (mongoose.connection.readyState !== 1) {
      log.info("MongoDB not connected, attempting to initialize connection...");
      const dbConfig = loadPlatformConfig().database;
      try {
        await mongoose.connect(dbConfig.mongoUri);
        log.info("MongoDB connection established successfully");
      } catch (err) {
        log.error("Failed to connect to MongoDB", { error: (err as Error).message });
        throw new Error("Database connection failed");
      }
    }

    if (!mongoose.connection.db) {
      throw new Error("MongoDB connection state is inconsistent");
    }

    const collection = mongoose.connection.db.collection(collectionName);

    try {
      const pipeline: any[] = [
        {
          "$vectorSearch": {
            "index": "vector_index",
            "path": "embedding",
            "queryVector": vector,
            "numCandidates": limit * 10,
            "limit": limit
          }
        },
        {
          "$project": {
            "_id": 1,
            "content": 1,
            "question": 1,
            "answer": 1,
            "source": 1,
            "metadata": 1,
            "score": { "$meta": "vectorSearchScore" }
          }
        }
      ];

      if (scoreThreshold) {
        pipeline.push({
          "$match": { "score": { "$gte": scoreThreshold } }
        });
      }

      const results = await collection.aggregate(pipeline).toArray();

      return results.map(doc => {
        // Fallback for different schema structures (content vs question/answer)
        const content = doc.content || 
          (doc.question && doc.answer ? `Q: ${doc.question}\nA: ${doc.answer}` : doc.answer || doc.question || "");

        return {
          id: doc._id.toString(),
          score: doc.score || 0,
          payload: {
            content,
            ...(doc.metadata || {})
          }
        };
      });
    } catch (error) {
      log.error("Mongo vector search failed", { error: (error as Error).message });
      return [];
    }
  }

  async upsert(entries: VectorUpsertEntry[]): Promise<void> {
    // Implementation for later
    log.info("Upsert not fully implemented in Mongo adapter yet");
  }

  async delete(ids: string[]): Promise<void> {
    // Implementation for later
    log.info("Delete not fully implemented in Mongo adapter yet");
  }

  async getCollectionInfo(): Promise<VectorCollectionInfo> {
    return {
      name: "mongo_vector",
      vectorCount: 0,
      dimensions: 1536,
      distanceMetric: 'cosine'
    };
  }
}
