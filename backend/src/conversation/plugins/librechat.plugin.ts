import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Collection, MongoClient, ObjectId } from 'mongodb';
import { Connection } from 'mongoose';
import {
  ConversationPlugin,
  FetchConversationOptions,
  NormalizedConversation,
  NormalizedMessage,
  PluginConversationStats,
} from './plugin.interface';

type MongoDoc = Record<string, unknown>;

@Injectable()
export class LibreChatPlugin implements ConversationPlugin {
  name: 'librechat' = 'librechat';
  private static readonly DEFAULT_FETCH_LIMIT = 2000;
  private static readonly MAX_FETCH_LIMIT = 5000;

  private readonly logger = new Logger(LibreChatPlugin.name);
  private externalClient: MongoClient | null = null;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly configService: ConfigService,
  ) {}

  async fetchConversations(options?: FetchConversationOptions): Promise<NormalizedConversation[]> {
    const { conversationCollection, messageCollection } = await this.getCollections();
    const includeMessages = options?.includeMessages ?? true;
    const fetchLimit = options?.limit && options.limit > 0
      ? Math.min(options.limit, LibreChatPlugin.MAX_FETCH_LIMIT)
      : this.getFetchLimit();

    const conversations = await conversationCollection
      .find(
        {
          $or: [
            { conversationId: { $exists: true } },
            { user: { $exists: true } },
            { title: { $exists: true } },
          ],
        },
        { sort: { createdAt: -1 }, limit: fetchLimit },
      )
      .toArray();

    this.logger.log(`Fetched ${conversations.length} LibreChat conversation candidate(s) with limit ${fetchLimit}`);

    const normalized: NormalizedConversation[] = [];

    for (const conversation of conversations) {
      const conversationId = this.getConversationId(conversation);
      if (!conversationId) {
        continue;
      }

      let convertedMessages: NormalizedMessage[] = [];
      let messageCount = 0;
      let lastPreview = '';

      if (includeMessages) {
        const messages = await this.fetchMessages(messageCollection, conversation, conversationId);
        if (messages.length === 0) {
          continue;
        }

        convertedMessages = messages.map((message) => this.normalizeMessage(message));
        messageCount = convertedMessages.length;
        lastPreview = convertedMessages[convertedMessages.length - 1]?.text?.slice(0, 180) ?? '';
      } else {
        const messageSummary = await this.fetchMessageSummary(messageCollection, conversation, conversationId);
        if (!messageSummary) {
          continue;
        }

        messageCount = messageSummary.count;
        lastPreview = messageSummary.lastText.slice(0, 180);
      }

      const timestamp =
        this.toIsoString(conversation.createdAt) ??
        convertedMessages.find((message) => !!message.timestamp)?.timestamp ??
        new Date().toISOString();

      normalized.push({
        conversation_id: conversationId,
        source: 'librechat',
        user: this.asString(conversation.user) ?? this.asString(conversation.studentName) ?? 'Unknown',
        timestamp,
        message_count: messageCount,
        confidence: this.asNumber(conversation.averageConfidence) ?? null,
        last_message_preview: lastPreview,
        messages: convertedMessages,
      });
    }

    return normalized;
  }

  async fetchConversationById(conversationId: string): Promise<NormalizedConversation | null> {
    const { conversationCollection, messageCollection } = await this.getCollections();

    const conversation =
      (await conversationCollection.findOne({ conversationId })) ??
      (ObjectId.isValid(conversationId)
        ? await conversationCollection.findOne({ _id: new ObjectId(conversationId) })
        : null);

    if (!conversation) {
      return null;
    }

    const resolvedId = this.getConversationId(conversation);
    if (!resolvedId) {
      return null;
    }

    const messages = await this.fetchMessages(messageCollection, conversation, resolvedId);
    const convertedMessages = messages.map((message) => this.normalizeMessage(message));
    const timestamp =
      this.toIsoString(conversation.createdAt) ??
      convertedMessages.find((message) => !!message.timestamp)?.timestamp ??
      new Date().toISOString();

    return {
      conversation_id: resolvedId,
      source: 'librechat',
      user: this.asString(conversation.user) ?? this.asString(conversation.studentName) ?? 'Unknown',
      timestamp,
      message_count: convertedMessages.length,
      confidence: this.asNumber(conversation.averageConfidence) ?? null,
      last_message_preview: convertedMessages[convertedMessages.length - 1]?.text?.slice(0, 180) ?? '',
      messages: convertedMessages,
    };
  }

  async fetchStats(): Promise<PluginConversationStats> {
    const { conversationCollection, messageCollection } = await this.getCollections();

    const conversationQuery = {
      $or: [
        { conversationId: { $exists: true } },
        { user: { $exists: true } },
        { title: { $exists: true } },
      ],
    };

    const [conversationCount, totalMessages] = await Promise.all([
      conversationCollection.countDocuments(conversationQuery),
      messageCollection.countDocuments({}),
    ]);

    return {
      source: 'librechat',
      conversationCount,
      totalMessages,
      avgConfidence: null,
    };
  }

  private async getCollections(): Promise<{
    conversationCollection: Collection<MongoDoc>;
    messageCollection: Collection<MongoDoc>;
  }> {
    const libreChatMongoUri = this.configService.get<string>('LIBRECHAT_MONGODB_URI');
    const libreChatDbName = this.configService.get<string>('LIBRECHAT_DB_NAME');

    if (libreChatMongoUri) {
      const client = await this.getOrCreateExternalClient(libreChatMongoUri);
      const dbName = libreChatDbName ?? this.extractDbNameFromUri(libreChatMongoUri) ?? 'librechat';
      const db = client.db(dbName);
      return {
        conversationCollection: db.collection<MongoDoc>('conversations'),
        messageCollection: db.collection<MongoDoc>('messages'),
      };
    }

    return {
      conversationCollection: this.connection.collection<MongoDoc>('conversations'),
      messageCollection: this.connection.collection<MongoDoc>('messages'),
    };
  }

  private async getOrCreateExternalClient(uri: string): Promise<MongoClient> {
    if (this.externalClient) {
      return this.externalClient;
    }

    this.externalClient = new MongoClient(uri);
    await this.externalClient.connect();
    this.logger.log('Connected to LibreChat MongoDB source');
    return this.externalClient;
  }

  private extractDbNameFromUri(uri: string): string | null {
    try {
      const parsed = new URL(uri);
      const dbName = parsed.pathname.replace(/^\//, '').trim();
      return dbName.length > 0 ? dbName : null;
    } catch {
      return null;
    }
  }

  private getConversationId(conversation: MongoDoc): string | null {
    const conversationId = this.asString(conversation.conversationId);
    if (conversationId) {
      return conversationId;
    }

    const objectId = conversation._id;
    if (objectId instanceof ObjectId) {
      return objectId.toString();
    }

    return typeof objectId === 'string' ? objectId : null;
  }

  private async fetchMessages(
    messageCollection: Collection<MongoDoc>,
    conversation: MongoDoc,
    conversationId: string,
  ): Promise<MongoDoc[]> {
    const conversationObjectId = this.asObjectId(conversation._id);

    const byConversationId = await messageCollection
      .find({ conversationId })
      .sort({ createdAt: 1 })
      .toArray();

    if (byConversationId.length > 0) {
      return byConversationId;
    }

    if (conversationObjectId) {
      const byObjectId = await messageCollection
        .find({ conversationId: conversationObjectId })
        .sort({ createdAt: 1 })
        .toArray();

      if (byObjectId.length > 0) {
        return byObjectId;
      }
    }

    const referencedMessageIds = this.extractObjectIds(conversation.messages);
    if (referencedMessageIds.length > 0) {
      return messageCollection
        .find({ _id: { $in: referencedMessageIds } })
        .sort({ createdAt: 1 })
        .toArray();
    }

    this.logger.debug(`No messages found for LibreChat conversation ${conversationId}`);
    return [];
  }

  private normalizeMessage(message: MongoDoc): NormalizedMessage {
    const sender = this.asString(message.sender)?.toLowerCase();
    const roleFromSender = sender === 'user' ? 'user' : sender === 'assistant' ? 'assistant' : null;

    const roleField = this.asString(message.role)?.toLowerCase();
    const roleFromRoleField = roleField === 'user' ? 'user' : roleField === 'assistant' ? 'assistant' : null;

    return {
      role: roleFromSender ?? roleFromRoleField ?? 'assistant',
      text: this.asString(message.text) ?? this.asString(message.content) ?? '',
      timestamp: this.toIsoString(message.createdAt),
    };
  }

  private async fetchMessageSummary(
    messageCollection: Collection<MongoDoc>,
    conversation: MongoDoc,
    conversationId: string,
  ): Promise<{ count: number; lastText: string } | null> {
    const conversationObjectId = this.asObjectId(conversation._id);

    const queryCandidates: MongoDoc[] = [{ conversationId }];
    if (conversationObjectId) {
      queryCandidates.push({ conversationId: conversationObjectId });
    }

    for (const query of queryCandidates) {
      const [count, last] = await Promise.all([
        messageCollection.countDocuments(query),
        messageCollection.find(query).sort({ createdAt: -1 }).limit(1).toArray(),
      ]);

      if (count > 0) {
        const lastMessage = last[0] ?? {};
        const lastText =
          this.asString(lastMessage.text) ??
          this.asString(lastMessage.content) ??
          '';

        return { count, lastText };
      }
    }

    const referencedMessageIds = this.extractObjectIds(conversation.messages);
    if (referencedMessageIds.length > 0) {
      const messages = await messageCollection
        .find({ _id: { $in: referencedMessageIds } })
        .sort({ createdAt: 1 })
        .toArray();

      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        const lastText =
          this.asString(lastMessage.text) ??
          this.asString(lastMessage.content) ??
          '';

        return { count: messages.length, lastText };
      }
    }

    return null;
  }

  private extractObjectIds(value: unknown): ObjectId[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => this.asObjectId(item))
      .filter((item): item is ObjectId => item instanceof ObjectId);
  }

  private asObjectId(value: unknown): ObjectId | null {
    if (value instanceof ObjectId) {
      return value;
    }

    if (typeof value === 'string' && ObjectId.isValid(value)) {
      return new ObjectId(value);
    }

    return null;
  }

  private asString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  private asNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private toIsoString(value: unknown): string | undefined {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'number' || typeof value === 'string') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
    }

    return undefined;
  }

  private getFetchLimit(): number {
    const configuredLimit = this.configService.get<string>('LIBRECHAT_FETCH_LIMIT');
    const parsed = configuredLimit ? Number(configuredLimit) : NaN;

    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.min(parsed, LibreChatPlugin.MAX_FETCH_LIMIT);
    }

    return LibreChatPlugin.DEFAULT_FETCH_LIMIT;
  }
}
