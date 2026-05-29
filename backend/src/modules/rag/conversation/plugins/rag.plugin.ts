import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ConversationPlugin,
  FetchConversationOptions,
  NormalizedConversation,
  NormalizedMessage,
  PluginConversationStats,
} from './plugin.interface';
import { Conversation, ConversationDocument } from '../../chat/schemas/conversation.schema';
import { Message, MessageDocument, MessageRole } from '../../chat/schemas/message.schema';

@Injectable()
export class RagPlugin implements ConversationPlugin {
  name: 'rag' = 'rag';

  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
  ) {}

  async fetchConversations(options?: FetchConversationOptions): Promise<NormalizedConversation[]> {
    const includeMessages = options?.includeMessages ?? true;
    const limit = options?.limit && options.limit > 0 ? Math.min(options.limit, 500) : 100;

    const conversations = await this.conversationModel
      .find({ studentId: { $exists: true } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const normalized: NormalizedConversation[] = [];

    for (const conversation of conversations) {
      const conversationObjectId = conversation._id as Types.ObjectId;
      let convertedMessages: NormalizedMessage[] = [];
      let lastPreview = '';
      let messageCount = 0;

      if (includeMessages) {
        const messages = await this.messageModel
          .find({ conversationId: conversationObjectId })
          .sort({ createdAt: 1 })
          .lean();

        convertedMessages = messages.map((message) => ({
          role: message.role === MessageRole.USER ? 'user' : 'assistant',
          text: message.content,
          timestamp: message.createdAt ? new Date(message.createdAt).toISOString() : undefined,
        }));

        messageCount = convertedMessages.length;
        lastPreview = convertedMessages[convertedMessages.length - 1]?.text?.slice(0, 180) ?? '';
      } else {
        messageCount = await this.messageModel.countDocuments({ conversationId: conversationObjectId });
        const lastMessage = await this.messageModel
          .findOne({ conversationId: conversationObjectId })
          .sort({ createdAt: -1 })
          .lean();

        lastPreview = (lastMessage?.content ?? '').slice(0, 180);
      }

      normalized.push({
        conversation_id: String(conversation._id),
        source: 'rag',
        user: conversation.studentName ?? conversation.studentId ?? 'Student',
        timestamp:
          (conversation.createdAt && new Date(conversation.createdAt).toISOString()) ||
          convertedMessages.find((message) => !!message.timestamp)?.timestamp ||
          new Date().toISOString(),
        message_count: messageCount,
        confidence: conversation.averageConfidence ?? null,
        last_message_preview: lastPreview,
        messages: convertedMessages,
      });
    }

    return normalized;
  }

  async fetchConversationById(conversationId: string): Promise<NormalizedConversation | null> {
    const conversation = await this.conversationModel.findById(conversationId).lean();
    if (!conversation) {
      return null;
    }

    const messages = await this.messageModel
      .find({ conversationId: conversation._id as Types.ObjectId })
      .sort({ createdAt: 1 })
      .lean();

    const convertedMessages: NormalizedMessage[] = messages.map((message) => ({
      role: message.role === MessageRole.USER ? 'user' : 'assistant',
      text: message.content,
      timestamp: message.createdAt ? new Date(message.createdAt).toISOString() : undefined,
    }));

    return {
      conversation_id: String(conversation._id),
      source: 'rag',
      user: conversation.studentName ?? conversation.studentId ?? 'Student',
      timestamp:
        (conversation.createdAt && new Date(conversation.createdAt).toISOString()) ||
        convertedMessages.find((message) => !!message.timestamp)?.timestamp ||
        new Date().toISOString(),
      message_count: convertedMessages.length,
      confidence: conversation.averageConfidence ?? null,
      last_message_preview: convertedMessages[convertedMessages.length - 1]?.text?.slice(0, 180) ?? '',
      messages: convertedMessages,
    };
  }

  async fetchStats(): Promise<PluginConversationStats> {
    const conversationIds = await this.conversationModel.distinct('_id', { studentId: { $exists: true } });

    const [conversationCount, totalMessages, confidenceResult] = await Promise.all([
      this.conversationModel.countDocuments({ studentId: { $exists: true } }),
      conversationIds.length > 0
        ? this.messageModel.countDocuments({ conversationId: { $in: conversationIds } })
        : Promise.resolve(0),
      this.conversationModel.aggregate([
        { $match: { studentId: { $exists: true }, averageConfidence: { $type: 'number' } } },
        { $group: { _id: null, avgConfidence: { $avg: '$averageConfidence' } } },
      ]),
    ]);

    return {
      source: 'rag',
      conversationCount,
      totalMessages,
      avgConfidence: confidenceResult[0]?.avgConfidence ?? null,
    };
  }
}
