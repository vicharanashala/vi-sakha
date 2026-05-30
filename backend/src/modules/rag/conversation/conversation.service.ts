import { Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PluginManagerService } from './plugin-manager.service';
import { ConversationSource, NormalizedConversation } from './plugins/plugin.interface';
import { GoogleGenAI } from "@google/genai";
import { CacheService } from '../cache/cache.service';


export interface GeneratedQa {
  title: string;
  question: string;
  answer: string;
}

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
  constructor(
    private readonly pluginManager: PluginManagerService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly cache: CacheService,
  ) { }

  /**
   * @description Retrieves a paginated list of conversations from diverse sources (Discord, RAG, LibreChat).
   * Maps US6 (Discord Ingestion) data into a unified schema for dashboard display.
   */
  async getAllConversations(
    source?: ConversationSource,
    page?: number,
    limit?: number,
  ): Promise<PaginatedConversations> {
    const safePage = page && page > 0 ? page : 1;
    const safeLimit = limit && limit > 0 ? Math.min(limit, 100) : 20;

    const cacheKey = `vs:conv:list:${source || 'all'}:${safePage}:${safeLimit}`;

    return this.cache.wrap(cacheKey, 300, async () => {
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
    });
  }

  /**
   * @description Forced invalidation of conversation caches followed by a fresh fetch.
   */
  async refreshConversations(
    source?: ConversationSource,
    page?: number,
    limit?: number,
  ): Promise<PaginatedConversations> {
    // Invalidate ALL conversation related cache on refresh
    await this.cache.invalidatePattern('vs:conv:*');

    return this.getAllConversations(source, page, limit);
  }

  /**
   * @description Fetches the full message history for a specific conversation node.
   * @param source The origin plugin (e.g. 'discord').
   */
  async getConversationDetail(
    source: ConversationSource,
    conversationId: string,
  ): Promise<NormalizedConversation | null> {
    return this.pluginManager.fetchConversationById(source, conversationId);
  }

  /**
   * @description Aggregates volumetric and qualitative metrics across all conversation sources.
   * Includes average RAG confidence calculation for US10 performance monitoring.
   */
  async getConversationStats(refresh = false): Promise<ConversationStats> {
    const cacheKey = 'vs:conv:stats';
    if (refresh) {
      await this.cache.del(cacheKey);
    }

    return this.cache.wrap(cacheKey, 300, async () => {
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
    });
  }

  /**
   * @description Orchestrates the GenAI FAQ extraction pipeline (US13).
   * Transforms a noisy conversational thread into a structured QA pair using Gemini 2.5 Flash.
   */
  async generateQaFromConversation(
    source: ConversationSource,
    conversationId: string,
  ): Promise<GeneratedQa> {
    const detail = await this.getConversationDetail(source, conversationId);
    if (!detail || !detail.messages?.length) {
      throw new NotFoundException('Conversation not found or has no messages');
    }

    const conversationText = detail.messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
      .join('\n');

    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
    // const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    // if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    const prompt = `You are an expert knowledge base curator.

From the following conversation, extract ONE high-quality FAQ entry.

Requirements:
- The question should reflect a real user intent
- The answer should be clear, concise, and reusable
- Remove conversational tone
- Do not include greetings or filler text

Return ONLY valid JSON:
{
  "title": "Short descriptive title",
  "question": "Clear user-focused question",
  "answer": "Helpful structured answer"
}

Conversation:
${conversationText}`;

    // const ai = new GoogleGenAI({ apiKey: apiKey });
    const response = await firstValueFrom(
      this.httpService.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
        },
        {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
        },
      ),
    );
    // const response = await ai.models.generateContent({
    //   model: "gemini-2.5-flash",
    //   contents: prompt,
    // });

    const text: string = response?.data?.content?.[0]?.text?.trim() ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid JSON response from LLM');

    const parsed = JSON.parse(jsonMatch[0]) as GeneratedQa;
    return {
      title: parsed.title ?? '',
      question: parsed.question ?? '',
      answer: parsed.answer ?? '',
    };
  }
}
