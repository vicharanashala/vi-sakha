import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto, FeedbackDto, ConversationFilterDto, EscalateDto } from './dto/chat.dto';
import { FeedbackType } from './schemas/message.schema';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Send a message to the chatbot
   * POST /api/chat/message
   */
  @Post('message')
  @HttpCode(HttpStatus.OK)
  async sendMessage(@Body() dto: SendMessageDto) {
    const result = await this.chatService.sendMessage(dto);
    return {
      conversationId: result.conversation._id,
      userMessage: {
        id: result.userMessage._id,
        content: result.userMessage.content,
        role: result.userMessage.role,
        createdAt: result.userMessage.createdAt,
      },
      assistantMessage: {
        id: result.assistantMessage._id,
        content: result.assistantMessage.content,
        role: result.assistantMessage.role,
        confidence: result.assistantMessage.confidence,
        sources: result.assistantMessage.sources,
        isEscalated: result.assistantMessage.isEscalated,
        responseTimeMs: result.assistantMessage.responseTimeMs,
        createdAt: result.assistantMessage.createdAt,
      },
      status: result.ragResponse.status,
    };
  }

  /**
   * Add feedback to a message (like/dislike)
   * PATCH /api/chat/messages/:id/feedback
   */
  @Patch('messages/:id/feedback')
  async addFeedback(
    @Param('id') messageId: string,
    @Body() dto: FeedbackDto,
  ) {
    const message = await this.chatService.addFeedback(messageId, dto);
    return {
      id: message._id,
      feedback: message.feedback,
      feedbackAt: message.feedbackAt,
      feedbackComment: message.feedbackComment,
    };
  }

  /**
   * Get a conversation with all messages
   * GET /api/chat/conversations/:id
   */
  @Get('conversations/:id')
  async getConversation(@Param('id') conversationId: string) {
    const { conversation, messages } = await this.chatService.getConversation(conversationId);
    return {
      conversation: {
        id: conversation._id,
        studentId: conversation.studentId,
        studentName: conversation.studentName,
        cohort: conversation.cohort,
        status: conversation.status,
        messageCount: conversation.messageCount,
        likeCount: conversation.likeCount,
        dislikeCount: conversation.dislikeCount,
        averageConfidence: conversation.averageConfidence,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt,
      },
      messages: messages.map(m => ({
        id: m._id,
        role: m.role,
        content: m.content,
        confidence: m.confidence,
        sources: m.sources,
        feedback: m.feedback,
        feedbackComment: m.feedbackComment,
        isEscalated: m.isEscalated,
        responseTimeMs: m.responseTimeMs,
        createdAt: m.createdAt,
      })),
    };
  }

  /**
   * Get all conversations (for lab members)
   * GET /api/chat/conversations
   */
  @Get('conversations')
  async getConversations(@Query() filter: ConversationFilterDto) {
    const result = await this.chatService.getConversations(filter);
    return {
      conversations: result.conversations.map(c => ({
        id: c._id,
        studentId: c.studentId,
        studentName: c.studentName,
        cohort: c.cohort,
        status: c.status,
        messageCount: c.messageCount,
        likeCount: c.likeCount,
        dislikeCount: c.dislikeCount,
        averageConfidence: c.averageConfidence,
        lastMessageAt: c.lastMessageAt,
        lastMessagePreview: c.lastMessagePreview,
        createdAt: c.createdAt,
      })),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: Math.ceil(result.total / result.limit),
      },
    };
  }

  /**
   * Get chat statistics
   * GET /api/chat/stats
   */
  @Get('stats')
  async getStats() {
    return this.chatService.getStats();
  }

  /**
   * Resolve a conversation
   * PATCH /api/chat/conversations/:id/resolve
   */
  @Patch('conversations/:id/resolve')
  async resolveConversation(@Param('id') conversationId: string) {
    const conversation = await this.chatService.resolveConversation(conversationId);
    return {
      id: conversation._id,
      status: conversation.status,
      resolvedAt: conversation.resolvedAt,
    };
  }

  /**
   * Escalate a conversation
   * PATCH /api/chat/conversations/:id/escalate
   */
  @Patch('conversations/:id/escalate')
  async escalateConversation(
    @Param('id') conversationId: string,
    @Body() dto: EscalateDto,
  ) {
    const conversation = await this.chatService.escalateConversation(conversationId, dto);
    return {
      id: conversation._id,
      status: conversation.status,
      escalatedAt: conversation.escalatedAt,
      escalationReason: conversation.escalationReason,
    };
  }

  /**
   * Get messages with feedback (for lab member review)
   * GET /api/chat/feedback
   */
  @Get('feedback')
  async getMessagesWithFeedback(@Query('type') type?: string) {
    const feedbackType = type === 'like' ? FeedbackType.LIKE : 
                         type === 'dislike' ? FeedbackType.DISLIKE : undefined;
    
    const messages = await this.chatService.getMessagesWithFeedback(feedbackType);
    return messages.map(m => ({
      id: m._id,
      conversationId: m.conversationId,
      content: m.content,
      confidence: m.confidence,
      feedback: m.feedback,
      feedbackComment: m.feedbackComment,
      feedbackAt: m.feedbackAt,
      createdAt: m.createdAt,
    }));
  }

  /**
   * Get student's conversation history
   * GET /api/chat/students/:studentId/conversations
   */
  @Get('students/:studentId/conversations')
  async getStudentConversations(@Param('studentId') studentId: string) {
    const conversations = await this.chatService.getStudentConversations(studentId);
    return conversations.map(c => ({
      id: c._id,
      status: c.status,
      messageCount: c.messageCount,
      lastMessageAt: c.lastMessageAt,
      lastMessagePreview: c.lastMessagePreview,
      createdAt: c.createdAt,
    }));
  }

  /**
   * Clear all chat data (for development/testing)
   * DELETE /api/chat/clear
   */
  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  async clearAllData() {
    return this.chatService.clearAllData();
  }
}
