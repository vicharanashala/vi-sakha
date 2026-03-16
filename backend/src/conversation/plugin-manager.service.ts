import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
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

type PluginClass = new (...args: any[]) => ConversationPlugin;

@Injectable()
export class PluginManagerService implements OnModuleInit {
  private readonly logger = new Logger(PluginManagerService.name);
  private plugins: ConversationPlugin[] = [];
  private isLoaded = false;

  constructor(private readonly moduleRef: ModuleRef) {}

  async onModuleInit(): Promise<void> {
    await this.loadPlugins();
  }

  async loadPlugins(forceReload = false): Promise<void> {
    if (this.isLoaded && !forceReload) {
      return;
    }

    const pluginClasses = await this.discoverPluginClasses();
    const loaded: ConversationPlugin[] = [];

    for (const PluginCtor of pluginClasses) {
      const instance = this.resolvePluginInstance(PluginCtor);
      if (!instance) {
        continue;
      }

      const alreadyRegistered = loaded.some((plugin) => plugin.name === instance.name);
      if (!alreadyRegistered) {
        loaded.push(instance);
      }
    }

    // Fallback to known provider plugins when dynamic discovery finds none.
    if (loaded.length === 0) {
      for (const PluginCtor of [RagPlugin, DiscordPlugin, LibreChatPlugin]) {
        const instance = this.resolvePluginInstance(PluginCtor);
        if (instance && !loaded.some((plugin) => plugin.name === instance.name)) {
          loaded.push(instance);
        }
      }
    }

    this.plugins = loaded;
    this.isLoaded = true;
    this.logger.log(`Loaded ${this.plugins.length} conversation plugin(s)`);
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

        const conversations = await plugin.fetchConversations({ includeMessages: false, limit: 5000 });
        const totalMessages = conversations.reduce((sum, conversation) => sum + conversation.message_count, 0);
        const confidenceValues = conversations
          .map((conversation) => conversation.confidence)
          .filter((value): value is number => typeof value === 'number');

        return {
          source: plugin.name,
          conversationCount: conversations.length,
          totalMessages,
          avgConfidence:
            confidenceValues.length > 0
              ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
              : null,
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

  private resolvePluginInstance(PluginCtor: PluginClass): ConversationPlugin | null {
    try {
      return this.moduleRef.get(PluginCtor, { strict: false });
    } catch {
      try {
        return new PluginCtor();
      } catch {
        return null;
      }
    }
  }

  private async discoverPluginClasses(): Promise<PluginClass[]> {
    const pluginDir = path.join(__dirname, 'plugins');
    if (!fs.existsSync(pluginDir)) {
      this.logger.warn(`Conversation plugin directory not found: ${pluginDir}`);
      return [];
    }

    const files = fs
      .readdirSync(pluginDir)
      .filter((file) => /\.plugin\.(js|ts)$/i.test(file));

    this.logger.log(`Scanning plugin directory: ${pluginDir} (${files.length} file(s))`);

    const classes: PluginClass[] = [];

    for (const file of files) {
      const modulePath = path.join(pluginDir, file);
      try {
        let imported: Record<string, unknown>;

        try {
          imported = require(modulePath) as Record<string, unknown>;
        } catch {
          imported = (await import(modulePath)) as Record<string, unknown>;
        }

        const exportCandidates = [
          ...Object.values(imported),
          ...(imported.default && typeof imported.default === 'object'
            ? Object.values(imported.default as Record<string, unknown>)
            : []),
        ];

        for (const exported of exportCandidates) {
          if (
            typeof exported === 'function' &&
            typeof (exported as PluginClass).prototype?.fetchConversations === 'function'
          ) {
            classes.push(exported as PluginClass);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Could not load plugin module ${file}: ${message}`);
      }
    }

    return classes;
  }
}
