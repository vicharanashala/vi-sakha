import { Injectable } from '@nestjs/common';
import { PluginManagerService } from './plugin-manager.service';
import { ConversationSource, NormalizedConversation } from './plugins/plugin.interface';

export interface ConversationStats {
  totalConversations: number;
  totalMessages: number;
  sourceCounts: Record<ConversationSource, number>;
  avgRagConfidence: number | null;
}

export interface PaginatedConversations {
  data: NormalizedConversation[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

@Injectable()
export class ConversationService {
  constructor(private readonly pluginManager: PluginManagerService) {}

  async getAllConversations(
    source?: ConversationSource,
    page?: number,
    limit?: number,
  ): Promise<PaginatedConversations> {
    const safePage = page && page > 0 ? page : 1;
    const safeLimit = limit && limit > 0 ? Math.min(limit, 100) : 20;
    const needed = safePage * safeLimit;

    const [conversations, stats] = await Promise.all([
      this.pluginManager.fetchAllConversations(false, {
        includeMessages: false,
        limit: needed,
      }),
      this.getConversationStats(false),
    ]);

    const filtered = source
      ? conversations.filter((conversation) => conversation.source === source)
      : conversations;

    const total = source
      ? stats.sourceCounts[source]
      : stats.totalConversations;

    const start = (safePage - 1) * safeLimit;
    return {
      data: filtered.slice(start, start + safeLimit),
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        pages: Math.max(1, Math.ceil(total / safeLimit)),
      },
    };
  }

  async refreshConversations(
    source?: ConversationSource,
    page?: number,
    limit?: number,
  ): Promise<PaginatedConversations> {
    const safePage = page && page > 0 ? page : 1;
    const safeLimit = limit && limit > 0 ? Math.min(limit, 100) : 20;
    const needed = safePage * safeLimit;

    const [conversations, stats] = await Promise.all([
      this.pluginManager.fetchAllConversations(true, {
        includeMessages: false,
        limit: needed,
      }),
      this.getConversationStats(true),
    ]);

    const filtered = source
      ? conversations.filter((conversation) => conversation.source === source)
      : conversations;

    const total = source
      ? stats.sourceCounts[source]
      : stats.totalConversations;

    const start = (safePage - 1) * safeLimit;
    return {
      data: filtered.slice(start, start + safeLimit),
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        pages: Math.max(1, Math.ceil(total / safeLimit)),
      },
    };
  }

  async getConversationDetail(
    source: ConversationSource,
    conversationId: string,
  ): Promise<NormalizedConversation | null> {
    return this.pluginManager.fetchConversationById(source, conversationId);
  }

  async getConversationStats(refresh = false): Promise<ConversationStats> {
    const pluginStats = await this.pluginManager.fetchConversationStats(refresh);

    const sourceCounts: Record<ConversationSource, number> = {
      rag: 0,
      discord: 0,
      librechat: 0,
    };

    let totalMessages = 0;
    let ragConfidenceTotal = 0;
    let ragConfidenceCount = 0;

    for (const stats of pluginStats) {
      sourceCounts[stats.source] = stats.conversationCount;
      totalMessages += stats.totalMessages;

      if (stats.source === 'rag' && typeof stats.avgConfidence === 'number') {
        const normalized = stats.avgConfidence <= 1 ? stats.avgConfidence * 100 : stats.avgConfidence;
        ragConfidenceTotal += normalized;
        ragConfidenceCount += 1;
      }
    }

    return {
      totalConversations: pluginStats.reduce((sum, stats) => sum + stats.conversationCount, 0),
      totalMessages,
      sourceCounts,
      avgRagConfidence: ragConfidenceCount > 0 ? Math.round(ragConfidenceTotal / ragConfidenceCount) : null,
    };
  }
}
