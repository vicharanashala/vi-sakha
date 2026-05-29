import mongoose, { Schema, Document } from "mongoose";
import { loadPlatformConfig } from "@visakha/config";
import { createLogger } from "@visakha/shared-utils";
import type { 
  MemoryStore, 
  EpisodicMemoryEntry, 
  MemoryQuery, 
  MemoryScope 
} from "@visakha/shared-types";

const log = createLogger("mongo-episodic-store");

/**
 * Mongoose Schema for Episodic Memory
 */
interface EpisodicDocument extends Document, Omit<EpisodicMemoryEntry, 'id'> {}

const EpisodicSchema = new Schema<EpisodicDocument>({
  type: { type: String, default: 'episodic', index: true },
  content: { type: String, required: true },
  summary: { type: String, required: true },
  topics: [{ type: String, index: true }],
  resolution: { type: String, enum: ['resolved', 'escalated', 'abandoned'] },
  conversationId: { type: String, required: true, index: true },
  messageCount: { type: Number },
  scope: {
    userId: { type: String, index: true },
    sessionId: { type: String, index: true },
    conversationId: { type: String, index: true },
  },
  preferences: [{
    key: String,
    value: String,
    confidence: Number,
    source: String
  }],
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// Full-text index on summary and content for basic keyword retrieval
EpisodicSchema.index({ summary: 'text', content: 'text' });

/**
 * MongoDB Episodic Store
 * 
 * Implements Episodic Memory Tier using MongoDB.
 * Stores summarized past conversations for long-term recall.
 */
export class MongoEpisodicStore implements MemoryStore<EpisodicMemoryEntry> {
  private model: mongoose.Model<EpisodicDocument>;
  private config = loadPlatformConfig();

  constructor() {
    // Ensure connection is active (shared with backend usually)
    if (mongoose.connection.readyState === 0) {
      mongoose.connect(this.config.database.mongoUri);
    }
    this.model = mongoose.model<EpisodicDocument>("EpisodicMemory", EpisodicSchema);
  }

  /**
   * Save a summarized episode.
   */
  async save(entry: EpisodicMemoryEntry): Promise<void> {
    log.debug("Saving episodic memory", { conversationId: entry.conversationId });
    
    await this.model.findOneAndUpdate(
      { conversationId: entry.conversationId },
      { ...entry, updatedAt: new Date() },
      { upsert: true, new: true }
    );
  }

  /**
   * Retrieve episodic memories based on query.
   */
  async retrieve(query: MemoryQuery): Promise<EpisodicMemoryEntry[]> {
    const filter: any = {};

    if (query.scope.userId) filter["scope.userId"] = query.scope.userId;
    if (query.scope.conversationId) filter["scope.conversationId"] = query.scope.conversationId;
    
    let dbQuery = this.model.find(filter);

    // If text search is provided, use MongoDB text index
    if (query.text) {
      dbQuery = this.model.find({ 
        ...filter, 
        $text: { $search: query.text } 
      });
    }

    const docs = await dbQuery
      .sort({ createdAt: -1 })
      .limit(query.limit)
      .lean()
      .exec();

    return docs.map(doc => this.mapDocToEntry(doc));
  }

  /**
   * Delete an episode.
   */
  async delete(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id);
  }

  /**
   * Clear episodes for a scope.
   */
  async clear(scope: MemoryScope): Promise<void> {
    const filter: any = {};
    if (scope.userId) filter["scope.userId"] = scope.userId;
    await this.model.deleteMany(filter);
  }

  private mapDocToEntry(doc: any): EpisodicMemoryEntry {
    return {
      id: doc._id.toString(),
      type: doc.type,
      content: doc.content,
      summary: doc.summary,
      topics: doc.topics,
      resolution: doc.resolution,
      conversationId: doc.conversationId,
      messageCount: doc.messageCount,
      scope: doc.scope,
      preferences: doc.preferences,
      metadata: doc.metadata,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
