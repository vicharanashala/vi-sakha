import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { ConversationService } from './conversation.service';
import { ConversationSource } from './plugins/plugin.interface';

@ApiTags('Conversations', 'Analytics')
@Controller('conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  private parseSource(source?: string): ConversationSource | undefined {
    if (!source || source === 'all') {
      return undefined;
    }

    if (source === 'rag' || source === 'discord' || source === 'librechat') {
      return source;
    }

    throw new BadRequestException('source must be one of: rag, discord, librechat, all');
  }

  /**
   * GET /api/conversations
   * Fetch all unified conversations
   */
  @ApiOperation({
    summary: 'List Unified Conversations',
    description: 'Retrieves a consolidated list of dialogues from RAG, Discord, and LibreChat sources for review.',
  })
  @ApiResponse({ status: 200, description: 'Unified conversation list retrieved.' })
  @ApiQuery({ name: 'source', required: false, enum: ['rag', 'discord', 'librechat', 'all'] })
  @Get()
  async getConversations(
    @Query('source') source?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.conversationService.getAllConversations(
      this.parseSource(source),
      Number.parseInt(page ?? '1', 10),
      Number.parseInt(limit ?? '20', 10),
    );
  }

  /**
   * GET /api/conversations/refresh
   * Force sync with external sources
   */
  @ApiOperation({
    summary: 'Refresh Conversations',
    description: 'Fulfills US2/US13. Triggers an active poll to Discord and other plugins to sync the latest transcripts manually.',
  })
  @Get('refresh')
  async refreshConversations(
    @Query('source') source?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.conversationService.refreshConversations(
      this.parseSource(source),
      Number.parseInt(page ?? '1', 10),
      Number.parseInt(limit ?? '20', 10),
    );
  }

  /**
   * GET /api/conversations/stats
   * Unified conversation metrics
   */
  @ApiOperation({
    summary: 'Conversation Volume Stats',
    description: 'Calculates active ticket and message counts across all supported plugin interfaces.',
  })
  @Get('stats')
  async getConversationStats(@Query('refresh') refresh?: string) {
    return this.conversationService.getConversationStats(refresh === 'true');
  }

  /**
   * Generate a Q&A proposal from a conversation using AI
   * POST /api/conversations/generate-qa
   */
  @ApiOperation({
    summary: 'Generate QA Pair from Transcript',
    description: 'Fulfills US11 (propose responses). Analyzes a past resolution and automatically extracts the question-answer pair for the knowledge base.',
  })
  @ApiResponse({ status: 200, description: 'QA Pair extraction started and returned.' })
  @Post('generate-qa')
  @HttpCode(HttpStatus.OK)
  async generateQa(@Body() body: { source: string; conversationId: string }) {
    const source = this.parseSource(body.source);
    if (!source) {
      throw new BadRequestException('source must be one of: rag, discord, librechat');
    }
    try {
      return await this.conversationService.generateQaFromConversation(source, body.conversationId);
    } catch (e: any) {
      throw new HttpException(e.message || 'QA Generation failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /api/conversations/:source/:conversationId
   * Detail view
   */
  @ApiOperation({
    summary: 'Get Conversation Detail',
    description: 'Retrieves the specific messages and metadata for a unique thread identified by source and ID.',
  })
  @Get(':source/:conversationId')
  async getConversationDetail(
    @Param('source') source: string,
    @Param('conversationId') conversationId: string,
  ) {
    const parsedSource = this.parseSource(source);
    if (!parsedSource) {
      throw new BadRequestException('source must be one of: rag, discord, librechat');
    }

    return this.conversationService.getConversationDetail(parsedSource, conversationId);
  }
}
