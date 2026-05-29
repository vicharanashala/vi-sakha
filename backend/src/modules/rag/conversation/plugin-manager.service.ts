import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  ConversationPlugin,
  ConversationSource,
  FetchConversationOptions,
  NormalizedConversation,
  PluginConversationStats,
} from './plugins/plugin.interface';
import { DiscordPlugin } from './plugins/discord.plugin';
import { LibreChatPlugin } from './plugins/librechat.plugin';
import { RagPlugin } from './plugins/rag.plugin';

@Injectable()
export class PluginManagerService {
  private readonly logger = new Logger(PluginManagerService.name);
  private plugins: ConversationPlugin[] = [];
  private isLoaded = true;

  constructor(
    private readonly ragPlugin: RagPlugin,
    private readonly discordPlugin: DiscordPlugin,
    private readonly libreChatPlugin: LibreChatPlugin,
  ) {
    this.plugins = [
      this.ragPlugin,
      this.discordPlugin,
      this.libreChatPlugin,
    ];
    this.logger.log(`Loaded ${this.plugins.length} conversation plugin(s)`);
  }

  async loadPlugins(forceReload = false): Promise<void> {
    // Kept for backward compatibility, but plugins are now injected immediately.
    return;
  }

  async fetchAllConversations(
    refresh = false,
    options?: FetchConversationOptions,
  ): Promise<NormalizedConversation[]> {
    if (!this.isLoaded || refresh) {
      await this.loadPlugins(refresh);
    }

    const results = await Promise.allSettled(
      this.plugins.map(async (plugin) => ({
        plugin: plugin.name,
        conversations: await plugin.fetchConversations(options),
      })),
    );

    const merged: NormalizedConversation[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        merged.push(...result.value.conversations);
      } else {
        const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
        this.logger.warn(`Conversation plugin failed: ${reason}`);
      }
    }

    return merged.sort((a, b) => {
      const first = new Date(a.timestamp).getTime();
      const second = new Date(b.timestamp).getTime();
      return second - first;
    });
  }

  async fetchConversationById(
    source: ConversationSource,
    conversationId: string,
  ): Promise<NormalizedConversation | null> {
    const plugin = this.plugins.find((item) => item.name === source);
    if (!plugin || !plugin.fetchConversationById) {
      return null;
    }

    return plugin.fetchConversationById(conversationId);
  }

  async fetchConversationStats(refresh = false): Promise<PluginConversationStats[]> {
    if (!this.isLoaded || refresh) {
      await this.loadPlugins(refresh);
    }

    const results = await Promise.allSettled(
      this.plugins.map(async (plugin) => {
        if (plugin.fetchStats) {
          return plugin.fetchStats();
        }

        // Fallback for plugins without custom stats: simple count
        const conversations = await plugin.fetchConversations({ includeMessages: false, limit: 1 });
        return {
          source: plugin.name,
          conversationCount: 0, // We don't know without fetchStats or a fetch
          totalMessages: 0,
          avgConfidence: null,
        } satisfies PluginConversationStats;
      }),
    );

    const merged: PluginConversationStats[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        merged.push(result.value);
      } else {
        const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
        this.logger.warn(`Conversation stats plugin failed: ${reason}`);
      }
    }

    return merged;
  }
}
