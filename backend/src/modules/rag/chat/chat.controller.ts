import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SendMessageDto, FeedbackDto, ConversationFilterDto, EscalateDto, CreateConversationDto } from './dto/chat.dto';
import { FeedbackType } from './schemas/message.schema';

import { JwtOrApiKeyGuard } from '../../auth/jwt-or-api-key.guard';
import { UseGuards } from '@nestjs/common';

@ApiTags('Chat', 'GenAI Services')
@Controller('chat')
@UseGuards(JwtOrApiKeyGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  /**
   * Send a message to the chatbot
   * POST /api/chat/message
   */
  @ApiOperation({
    summary: 'Send a Chat Message',
    description: 'Fulfills US1 (interactive chat interface) and US6 (instant resolution). Processes a student’s query against the GenAI knowledge base to provide an immediate automated response.',
  })
  @ApiResponse({ status: 200, description: 'Message processed and automated response generated.' })
  @ApiBadRequestResponse({ description: 'Validation failed on input payload.' })
  @Post('message')
  @HttpCode(HttpStatus.OK)
  async sendMessage(@Body() dto: SendMessageDto, @Req() req: any) {
    try {
      const userAgent = req.headers['user-agent'] || '';
      const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);
      const deviceType = isMobile ? 'mobile' : 'desktop';

      const result = await this.chatService.sendMessage(dto, deviceType, req.user?.userId);
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
    } catch (e: any) {
      throw new HttpException(e.message || 'Error processing message', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Stream a message response via SSE (newline-delimited JSON)
   * POST /api/chat/message/stream
   */
  @ApiOperation({
    summary: 'Stream a Chat Message (SSE)',
    description: 'Alternative to sendMessage providing real-time UI typing experience. Fulfills US1 and US6.',
  })
  @ApiResponse({ status: 200, description: 'Stream opened successfully.' })
  @Post('message/stream')
  async sendMessageStream(
    @Body() dto: SendMessageDto,
    @Res() res: Response,
    @Req() req: any,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');  // disable nginx buffering
    res.setHeader('Content-Encoding', 'identity');  // prevent compression buffering
    res.flushHeaders();

    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);
    const deviceType = isMobile ? 'mobile' : 'desktop';

    try {
      for await (const event of this.chatService.sendMessageStream(dto, deviceType, req.user?.userId)) {
        res.write(JSON.stringify(event) + '\n');
        // Force flush to prevent buffering — critical for real-time streaming
        if (typeof (res as any).flush === 'function') {
          (res as any).flush();
        }
      }
    } catch (err) {
      res.write(JSON.stringify({ type: 'error', message: 'Internal server error' }) + '\n');
    } finally {
      res.end();
    }
  }

  /**
   * Add feedback to a message (like/dislike)
   * PATCH /api/chat/messages/:id/feedback
   */
  @ApiOperation({
    summary: 'Submit Message Feedback',
    description: 'Fulfills US4 (provide feedback on responses). Allows a learner to like or dislike an AI-generated answer to build the analytics heatmap.',
  })
  @ApiResponse({ status: 200, description: 'Feedback successfully registered.' })
  @ApiNotFoundResponse({ description: 'Target message ID does not exist.' })
  @Patch('messages/:id/feedback')
  async addFeedback(
    @Param('id') messageId: string,
    @Body() dto: FeedbackDto,
  ) {
    try {
      const message = await this.chatService.addFeedback(messageId, dto);
      return {
        id: message._id,
        feedback: message.feedback,
        feedbackAt: message.feedbackAt,
        feedbackComment: message.feedbackComment,
      };
    } catch (e: any) {
      throw new HttpException('Message not found for feedback', HttpStatus.NOT_FOUND);
    }
  }

  /**
   * Create a new conversation (for multi-chat sidebar)
   * POST /api/chat/conversations
   */
  @ApiOperation({
    summary: 'Create a New Conversation Thread',
    description: 'Fulfills US1 structural needs. Initializes a fresh conversation context for isolated AI interactions.',
  })
  @ApiResponse({ status: 201, description: 'Conversation Thread Generated.' })
  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  async createConversation(@Body() dto: CreateConversationDto) {
    const conversation = await this.chatService.createConversation(
      dto.studentId || 'user_1',
      dto.studentName || 'Student',
      dto.studentEmail,
      dto.cohort,
    );
    return { conversationId: conversation._id };
  }

  /**
   * Get a conversation with all messages
   * GET /api/chat/conversations/:id
   */
  @ApiOperation({
    summary: 'Retrieve Conversation History',
    description: 'Retrieves the full dialogue history for a specific Chat ID. Fulfills US7 by allowing ticket integration tools to review AI transcripts.',
  })
  @ApiResponse({ status: 200, description: 'Conversation payload returned.' })
  @ApiNotFoundResponse({ description: 'Conversation ID not recognized.' })
  @Get('conversations/:id')
  async getConversation(@Param('id') conversationId: string) {
    try {
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
          attachments: m.attachments,
        })),
      };
    } catch (e: any) {
      throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
    }
  }

  /**
   * Get all conversations (for lab members)
   * GET /api/chat/conversations
   */
  @ApiOperation({
    summary: 'Query Conversations',
    description: 'Fulfills US9 and US10. Provides paginated lists of systemic conversations filtered by status, specific student, or feedback flags.',
  })
  @ApiResponse({ status: 200, description: 'Paginated array of conversations.' })
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
  @ApiOperation({
    summary: 'Generate GenAI Statistics',
    description: 'Fulfills US10 and US14. Calculates systemic AI accuracy, resolution volume, and load metrics for the administrative UI panel.',
  })
  @ApiResponse({ status: 200, description: 'Returns analytical aggregations.' })
  @Get('stats')
  async getStats() {
    return this.chatService.getStats();
  }

  /**
   * Resolve a conversation
   * PATCH /api/chat/conversations/:id/resolve
   */
  @ApiOperation({
    summary: 'Mark Chat as Resolved',
    description: 'Fulfills SLA workflows. Closes a dialogue string declaring the student successfully retrieved the data.',
  })
  @ApiResponse({ status: 200, description: 'Conversation state changed to Resolved.' })
  @Patch('conversations/:id/resolve')
  async resolveConversation(@Param('id') conversationId: string) {
    try {
      const conversation = await this.chatService.resolveConversation(conversationId);
      return {
        id: conversation._id,
        status: conversation.status,
        resolvedAt: conversation.resolvedAt,
      };
    } catch (e: any) {
      throw new HttpException('Failed to resolve conversation. Item not found.', HttpStatus.NOT_FOUND);
    }
  }

  /**
   * Escalate a conversation
   * PATCH /api/chat/conversations/:id/escalate
   */
  @ApiOperation({
    summary: 'Manual Escalation Trigger',
    description: 'Fulfills US3 (escalation tracking) and US7 (routing to staff). Notifies the support desk that the GenAI chatbot failed to clear the user query autonomously.',
  })
  @ApiResponse({ status: 200, description: 'State changed to Escalated.' })
  @Patch('conversations/:id/escalate')
  async escalateConversation(
    @Param('id') conversationId: string,
    @Body() dto: EscalateDto,
  ) {
    try {
      const conversation = await this.chatService.escalateConversation(conversationId, dto);
      return {
        id: conversation._id,
        status: conversation.status,
        escalatedAt: conversation.escalatedAt,
        escalationReason: conversation.escalationReason,
      };
    } catch (e: any) {
      throw new HttpException('Item not found for escalation', HttpStatus.NOT_FOUND);
    }
  }

  /**
   * Get messages with feedback (for lab member review)
   * GET /api/chat/feedback
   */
  @ApiOperation({
    summary: 'Retrieve Feedback Analytics',
    description: 'Fulfills US12 (track negative feedback areas). Extracts all system responses that users explicitly flagged as flawed or unhelpful.',
  })
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
  @ApiOperation({
    summary: 'Get Specific Student Transcripts',
    description: 'Fulfills US5 pattern verification. Locates previous dialogues initiated by a specific learner node.',
  })
  @Get('students/:studentId/conversations')
  async getStudentConversations(@Param('studentId') studentId: string) {
    const conversations = await this.chatService.getStudentConversations(studentId);
    return conversations.map(c => ({
      id: c._id,
      title: c.title || 'New Chat',
      status: c.status,
      messageCount: c.messageCount,
      lastMessageAt: c.lastMessageAt,
      lastMessagePreview: c.lastMessagePreview,
      createdAt: c.createdAt,
    }));
  }

  /**
   * Delete a single conversation and its messages
   * DELETE /api/chat/conversations/:id
   */
  @ApiOperation({
    summary: 'Purge Specific Thread',
    description: 'Deletes a dialogue entry from the database.',
  })
  @Delete('conversations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConversation(@Param('id') conversationId: string) {
    try {
      await this.chatService.deleteConversation(conversationId);
    } catch (e: any) {
      throw new HttpException('Deletion failed.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Clear all chat data (for development/testing)
   * DELETE /api/chat/clear
   */
  @ApiOperation({ summary: 'Clear All Sandbox Data', description: 'Internal testing route to purge all threads.' })
  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  async clearAllData() {
    return this.chatService.clearAllData();
  }
}
