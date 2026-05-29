import { RedisSessionStore } from "./short-term/redis-session.store";
import { MongoEpisodicStore } from "./episodic/mongo-episodic.store";
import { QdrantSemanticStore } from "./semantic/qdrant-semantic.store";
import { MemorySummarizer } from "./summarizer";
import { ContextCompressor } from "./context-compressor";
import { createLogger } from "@visakha/shared-utils";

const log = createLogger("memory-service");

/**
 * Memory Service
 * 
 * Unified interface for the 4-tier memory system.
 * Orchestrates short-term, episodic, semantic, and working memory.
 */
export class MemoryService {
  public readonly shortTerm = new RedisSessionStore();
  public readonly episodic = new MongoEpisodicStore();
  public readonly semantic = new QdrantSemanticStore();
  public readonly summarizer = new MemorySummarizer();
  public readonly compressor = new ContextCompressor();

  constructor() {
    log.info("Memory Service initialized with 4-tier architecture");
  }

  /**
   * Main entry point for the agent to retrieve relevant memories.
   */
  async getContextForQuery(userId: string, sessionId: string, query: string) {
    const scope = { userId, sessionId };
    
    const [session, episodes] = await Promise.all([
      this.shortTerm.retrieve({ scope, limit: 1 }),
      this.episodic.retrieve({ scope, text: query, limit: 3 })
    ]);

    return {
      activeSession: session[0],
      pastEpisodes: episodes,
    };
  }

  /**
   * Archive a finished conversation into episodic memory.
   */
  async archiveConversation(userId: string, conversationId: string, messages: any[]) {
    log.info("Archiving conversation to episodic memory", { conversationId });

    const summaryResult = await this.summarizer.summarize({
      conversationId,
      messages
    });

    await this.episodic.save({
      id: Math.random().toString(36).substring(7),
      type: 'episodic',
      content: messages.map(m => m.content).join("\n"),
      summary: summaryResult.summary,
      topics: summaryResult.topics,
      preferences: summaryResult.preferences,
      resolution: summaryResult.resolution as any,
      conversationId,
      messageCount: messages.length,
      scope: { userId, conversationId },
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { keyEntities: summaryResult.keyEntities }
    });
  }
}

export const memoryService = new MemoryService();
