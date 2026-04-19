import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { DiscordConversationService } from './conversation.service';

@ApiTags('Discord Ingestion', 'GenAI Services')
@Controller('discord-ingestion')
export class DiscordController {
  constructor(
    private readonly conversationService: DiscordConversationService,
  ) {}

  /**
   * GET /api/discord-ingestion/conversations
   * List conversations without message payloads (light list response).
   */
  @ApiOperation({
    summary: 'List Discord Conversations',
    description: 'Retrieves a list of conversations ingested from Discord. Fulfills US2/US13 by providing the raw support threads for processing into GenAI sets.',
  })
  @ApiResponse({ status: 200, description: 'Discord conversation list retrieved successfully.' })
  @ApiQuery({ name: 'status', required: false, enum: ['open', 'closed'] })
  @Get('conversations')
  async listConversations(
    @Query('status') status?: 'open' | 'closed',
  ) {
    const conversations = status
      ? await this.conversationService.findByStatus(status)
      : await this.conversationService.findAll();

    return conversations.map((c) => ({
      _id: c._id,
      ticketNumber: c.ticketNumber,
      discordChannelId: c.discordChannelId,
      status: c.status,
      source: c.source,
      transcriptProcessed: c.transcriptProcessed,
      ticketOwnerId: c.ticketOwnerId,
      ticketOwnerName: c.ticketOwnerName,
      messageCount: c.messages?.length ?? 0,
      lastMessageAt: c.messages?.length
        ? c.messages[c.messages.length - 1].timestamp
        : c.createdAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  /**
   * GET /api/discord-ingestion/conversations/:ticketNumber
   * Full conversation with all messages.
   */
  @ApiOperation({
    summary: 'Get Discord Conversation Detail',
    description: 'Fulfills US7 by providing full transcripts for auditing chatbot-assisted escalations on Discord.',
  })
  @ApiResponse({ status: 200, description: 'Specific Discord thread returned.' })
  @ApiParam({ name: 'ticketNumber', description: 'The unique ticket number formatted as #number' })
  @Get('conversations/:ticketNumber')
  async getConversation(@Param('ticketNumber') ticketNumber: string) {
    const conversation = await this.conversationService.findByTicketNumber(ticketNumber);
    if (!conversation) {
      throw new NotFoundException(`Conversation with ticket ${ticketNumber} not found.`);
    }
    return conversation;
  }

  /**
   * GET /api/discord-ingestion/stats
   * Accurate counts using countDocuments for the admin panel UI.
   */
  @ApiOperation({
    summary: 'Discord Ingestion Statistics',
    description: 'Retrieves volumetric counts for the Discord data pipeline to fulfill US14 reporting.',
  })
  @Get('stats')
  async getStats() {
    const [total, open, closed] = await Promise.all([
      this.conversationService.count(),
      this.conversationService.countByStatus('open'),
      this.conversationService.countByStatus('closed'),
    ]);

    return { total, open, closed };
  }
}
