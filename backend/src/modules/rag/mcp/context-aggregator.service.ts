import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { EmbeddingWorkerService } from '../embedding-worker/embedding-worker.service';
import { PluginManagerService } from '../conversation/plugin-manager.service';
import { CacheService } from '../cache/cache.service';

const RELEVANCE_THRESHOLD = 0.45;
const MAX_CONTEXT_RESULTS = 5;

export interface ContextResult {
  question: string;
  answer: string;
  score: number;
  source: string;
  type: 'qa_pair' | 'conversation';
}

@Injectable()
export class ContextAggregatorService {
  private readonly logger = new Logger(ContextAggregatorService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly embeddingWorker: EmbeddingWorkerService,
    private readonly pluginManager: PluginManagerService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Aggregate context from vector search, conversations, and cache
   */
  async aggregateContext(
    query: string,
    contextSources?: string[],
  ): Promise<ContextResult[]> {
    const cacheKey = `mcp:context:${Buffer.from(query).toString('base64')}`;
    
    // 1. Check cache first
    const cached = await this.cache.get<ContextResult[]>(cacheKey);
    if (cached) {
      this.logger.log('Context retrieved from cache');
      return cached;
    }

    const cleanQuery = query.trim().replace(/\s+/g, ' ').replace(/[^\w\s?.,!-]/g, '');
    const queryVector = await this.embeddingWorker.embedOne(cleanQuery);
    
    if (!queryVector || queryVector.length === 0) {
      this.logger.warn('Embedding sidecar returned empty vector');
      return [];
    }

    const tasks: Promise<ContextResult[]>[] = [];

    // Always fetch QA pairs via vector search
    tasks.push(this.searchQaPairs(queryVector));

    // Fetch conversations if explicitly requested or if sources are empty
    if (!contextSources || contextSources.includes('conversations')) {
       // Only grabbing a few recent conversations as additional context,
       // this provides short term memory over live discussions.
       tasks.push(this.searchConversations());
    }

    const resultsArray = await Promise.all(tasks);
    const merged = resultsArray.flat();
    
    // Sort by score descending and take top results
    const ranked = merged
      .filter((r) => r.score >= RELEVANCE_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_CONTEXT_RESULTS);

    // Save to cache for 5 minutes
    await this.cache.set(cacheKey, ranked, 300);

    return ranked;
  }

  private async searchQaPairs(queryVector: number[]): Promise<ContextResult[]> {
    try {
      const collection = this.connection.db!.collection('qa_pairs_v2');
      const docs = await collection
        .find({ embedding: { $exists: true, $not: { $size: 0 } } })
        .project({ question: 1, answer: 1, embedding: 1, source: 1 })
        .toArray();

      if (!docs.length) return [];

      return docs
        .filter((doc) => {
          const emb = doc.embedding as number[];
          return emb && emb.length === queryVector.length;
        })
        .map((doc) => ({
          question: doc.question as string,
          answer: doc.answer as string,
          score: this.cosineSimilarity(queryVector, doc.embedding as number[]),
          source: (doc.source as string | undefined) ?? 'qa_pairs',
          type: 'qa_pair',
        }));
    } catch (e) {
      this.logger.error(`Error searching QA pairs: ${(e as Error).message}`);
      return [];
    }
  }

  private async searchConversations(): Promise<ContextResult[]> {
    try {
        // Fetch recent conversations to add as context
        const convos = await this.pluginManager.fetchAllConversations(false, { includeMessages: true, limit: 5 });
        return convos.map(c => {
          const transcript = c.messages?.map(m => `[${m.role}] ${m.text}`).join('\n') || 'No transcript available.';
          return {
            question: `Recent conversation ticket ${c.conversation_id}`,
            answer: transcript,
            score: 0.5, // Fixed base score for recent conversations 
            source: c.source,
            type: 'conversation'
          };
        });
    } catch (e) {
        this.logger.error(`Error searching conversations: ${(e as Error).message}`);
        return [];
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a.length || a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }
}
