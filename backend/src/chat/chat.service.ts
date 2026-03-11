import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument, ConversationStatus } from './schemas/conversation.schema';
import { Message, MessageDocument, MessageRole, FeedbackType } from './schemas/message.schema';
import { SendMessageDto, FeedbackDto, ConversationFilterDto, EscalateDto } from './dto/chat.dto';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

interface RAGResponse {
  answer: string;
  confidence: number;
  sources: Array<{
    question: string;
    answer: string;
    score: number;
    source: string;
  }>;
  status: 'answered' | 'escalated' | 'error';
  session_id: string;
  response_time_ms: number;
}

@Injectable()
export class ChatService {
  private ragApiUrl: string;

  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.ragApiUrl = this.configService.get<string>('RAG_API_URL') || 'http://localhost:8000';
  }

  /**
   * Send a message and get RAG response
   */
  async sendMessage(dto: SendMessageDto): Promise<{
    conversation: ConversationDocument;
    userMessage: MessageDocument;
    assistantMessage: MessageDocument;
    ragResponse: RAGResponse;
  }> {
    const startTime = Date.now();

    // Get or create conversation
    let conversation: ConversationDocument;
    
    if (dto.conversationId) {
      const existing = await this.conversationModel.findById(dto.conversationId);
      if (!existing) {
        throw new NotFoundException('Conversation not found');
      }
      conversation = existing;
    } else {
      // Create new conversation
      conversation = await this.conversationModel.create({
        studentId: dto.studentId || 'anonymous',
        studentName: dto.studentName || 'Student',
        studentEmail: dto.studentEmail,
        cohort: dto.cohort,
        status: ConversationStatus.ACTIVE,
        messageCount: 0,
        likeCount: 0,
        dislikeCount: 0,
      });
    }

    // Save user message
    const userMessage = await this.messageModel.create({
      conversationId: conversation._id,
      role: MessageRole.USER,
      content: dto.content,
    });

    // Get conversation history for context
    const history = await this.messageModel
      .find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .limit(10)
      .select('role content');

    const conversationHistory = history.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Call RAG API
    let ragResponse: RAGResponse;
    try {
      const response: AxiosResponse<RAGResponse> = await firstValueFrom(
        this.httpService.post<RAGResponse>(`${this.ragApiUrl}/chat`, {
          message: dto.content,
          session_id: conversation._id.toString(),
          conversation_history: conversationHistory,
        })
      );
      ragResponse = response.data;
    } catch (error) {
      // Fallback response if RAG API is down
      ragResponse = {
        answer: "I'm experiencing technical difficulties. Your query has been noted and a support team member will assist you shortly.",
        confidence: 0,
        sources: [],
        status: 'error',
        session_id: conversation._id.toString(),
        response_time_ms: Date.now() - startTime,
      };
    }

    // Save assistant message
    const assistantMessage = await this.messageModel.create({
      conversationId: conversation._id,
      role: MessageRole.ASSISTANT,
      content: ragResponse.answer,
      confidence: ragResponse.confidence,
      sources: ragResponse.sources,
      sourceQaPairIds: ragResponse.sources.map(s => s.source),
      isEscalated: ragResponse.status === 'escalated',
      escalationReason: ragResponse.status === 'escalated' ? 'Low confidence score' : undefined,
      responseTimeMs: ragResponse.response_time_ms,
    });

    // Update conversation stats
    const allMessages = await this.messageModel.find({ conversationId: conversation._id });
    const assistantMessages = allMessages.filter(m => m.role === MessageRole.ASSISTANT);
    // Calculate average confidence and convert to 0-100 scale
    const avgConfidence = assistantMessages.length > 0
      ? (assistantMessages.reduce((sum, m) => sum + (m.confidence || 0), 0) / assistantMessages.length) * 100
      : 0;

    await this.conversationModel.findByIdAndUpdate(conversation._id, {
      messageCount: allMessages.length,
      lastMessageAt: new Date(),
      lastMessagePreview: dto.content.substring(0, 100),
      averageConfidence: avgConfidence,
      ...(ragResponse.status === 'escalated' && {
        status: ConversationStatus.ESCALATED,
        escalatedAt: new Date(),
        escalationReason: 'Low confidence response',
      }),
    });

    // Refresh conversation
    conversation = await this.conversationModel.findById(conversation._id) as ConversationDocument;

    return {
      conversation,
      userMessage,
      assistantMessage,
      ragResponse,
    };
  }

  /**
   * Add feedback to a message
   */
  async addFeedback(messageId: string, dto: FeedbackDto): Promise<MessageDocument> {
    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.role !== MessageRole.ASSISTANT) {
      throw new BadRequestException('Can only add feedback to assistant messages');
    }

    const previousFeedback = message.feedback;

    // Update message with feedback
    message.feedback = dto.feedback;
    message.feedbackAt = new Date();
    message.feedbackComment = dto.comment;
    await message.save();

    // Update conversation counts
    const updateQuery: any = {};
    
    if (previousFeedback === FeedbackType.LIKE) {
      updateQuery.$inc = { ...updateQuery.$inc, likeCount: -1 };
    } else if (previousFeedback === FeedbackType.DISLIKE) {
      updateQuery.$inc = { ...updateQuery.$inc, dislikeCount: -1 };
    }

    if (dto.feedback === FeedbackType.LIKE) {
      updateQuery.$inc = { ...updateQuery.$inc, likeCount: 1 };
    } else if (dto.feedback === FeedbackType.DISLIKE) {
      updateQuery.$inc = { ...updateQuery.$inc, dislikeCount: 1 };
    }

    if (Object.keys(updateQuery).length > 0) {
      await this.conversationModel.findByIdAndUpdate(message.conversationId, updateQuery);
    }

    return message;
  }

  /**
   * Get conversation by ID with messages
   */
  async getConversation(conversationId: string): Promise<{
    conversation: ConversationDocument;
    messages: MessageDocument[];
  }> {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const messages = await this.messageModel
      .find({ conversationId: conversation._id })
      .sort({ createdAt: 1 });

    return { conversation, messages };
  }

  /**
   * Get all conversations with filters (for lab members)
   */
  async getConversations(filter: ConversationFilterDto): Promise<{
    conversations: ConversationDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query: any = {};
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.studentId) {
      query.studentId = filter.studentId;
    }

    if (filter.cohort) {
      query.cohort = filter.cohort;
    }

    const [conversations, total] = await Promise.all([
      this.conversationModel
        .find(query)
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit),
      this.conversationModel.countDocuments(query),
    ]);

    return { conversations, total, page, limit };
  }

  /**
   * Get conversation statistics
   */
  async getStats(): Promise<{
    totalConversations: number;
    activeConversations: number;
    resolvedConversations: number;
    escalatedConversations: number;
    totalMessages: number;
    totalLikes: number;
    totalDislikes: number;
    averageConfidence: number;
    averageResponseTime: number;
  }> {
    const [
      totalConversations,
      activeConversations,
      resolvedConversations,
      escalatedConversations,
      totalMessages,
      feedbackStats,
      performanceStats,
    ] = await Promise.all([
      this.conversationModel.countDocuments(),
      this.conversationModel.countDocuments({ status: ConversationStatus.ACTIVE }),
      this.conversationModel.countDocuments({ status: ConversationStatus.RESOLVED }),
      this.conversationModel.countDocuments({ status: ConversationStatus.ESCALATED }),
      this.messageModel.countDocuments(),
      this.conversationModel.aggregate([
        {
          $group: {
            _id: null,
            totalLikes: { $sum: '$likeCount' },
            totalDislikes: { $sum: '$dislikeCount' },
          },
        },
      ]),
      this.messageModel.aggregate([
        { $match: { role: MessageRole.ASSISTANT } },
        {
          $group: {
            _id: null,
            avgConfidence: { $avg: '$confidence' },
            avgResponseTime: { $avg: '$responseTimeMs' },
          },
        },
      ]),
    ]);

    return {
      totalConversations,
      activeConversations,
      resolvedConversations,
      escalatedConversations,
      totalMessages,
      totalLikes: feedbackStats[0]?.totalLikes || 0,
      totalDislikes: feedbackStats[0]?.totalDislikes || 0,
      // Convert confidence from 0-1 to 0-100 scale
      averageConfidence: (performanceStats[0]?.avgConfidence || 0) * 100,
      averageResponseTime: performanceStats[0]?.avgResponseTime || 0,
    };
  }

  /**
   * Resolve a conversation
   */
  async resolveConversation(conversationId: string): Promise<ConversationDocument> {
    const conversation = await this.conversationModel.findByIdAndUpdate(
      conversationId,
      {
        status: ConversationStatus.RESOLVED,
        resolvedAt: new Date(),
      },
      { new: true }
    );

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  /**
   * Escalate a conversation
   */
  async escalateConversation(conversationId: string, dto: EscalateDto): Promise<ConversationDocument> {
    const conversation = await this.conversationModel.findByIdAndUpdate(
      conversationId,
      {
        status: ConversationStatus.ESCALATED,
        escalatedAt: new Date(),
        escalationReason: dto.reason,
      },
      { new: true }
    );

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  /**
   * Get messages with feedback filter (for lab member review)
   */
  async getMessagesWithFeedback(feedbackType?: FeedbackType): Promise<MessageDocument[]> {
    const query: any = { role: MessageRole.ASSISTANT };
    
    if (feedbackType) {
      query.feedback = feedbackType;
    } else {
      query.feedback = { $exists: true, $ne: null };
    }

    return this.messageModel
      .find(query)
      .sort({ feedbackAt: -1 })
      .limit(100)
      .populate('conversationId');
  }

  /**
   * Get student's conversations
   */
  async getStudentConversations(studentId: string): Promise<ConversationDocument[]> {
    return this.conversationModel
      .find({ studentId })
      .sort({ lastMessageAt: -1 });
  }

  /**
   * Clear all chat data (for development/testing)
   */
  async clearAllData(): Promise<{ deletedConversations: number; deletedMessages: number }> {
    const [convResult, msgResult] = await Promise.all([
      this.conversationModel.deleteMany({}),
      this.messageModel.deleteMany({}),
    ]);

    return {
      deletedConversations: convResult.deletedCount,
      deletedMessages: msgResult.deletedCount,
    };
  }
}
