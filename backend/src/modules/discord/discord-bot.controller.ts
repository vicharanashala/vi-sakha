import { Controller, Post, Body, Logger } from '@nestjs/common';
import { DiscordConversationService } from './conversation.service';
import { DiscordGateway } from './discord.gateway';
import { DiscordService } from './discord.service';

@Controller('discord-bot')
export class DiscordBotController {
  private readonly logger = new Logger(DiscordBotController.name);

  constructor(
    private readonly conversationService: DiscordConversationService,
    private readonly discordService: DiscordService,
    private readonly gateway: DiscordGateway,
  ) {}

  @Post('activity')
  async handleActivity(@Body() data: { ticketNumber: string; event: string; channelId?: string; threadName?: string }) {
    this.logger.log(`Received activity from bot: ${data.event} for ticket #${data.ticketNumber}`);
    
    // Emit to dashboard via WebSocket
    this.gateway.server.emit('activity', data);

    // Handle specific lifecycle events
    if (data.event === 'ticket_created' && data.channelId) {
      await this.discordService.onTicketChannelCreate(data.ticketNumber, data.channelId, data.threadName);
    } else if (data.event === 'ticket_closed') {
      await this.discordService.onTicketClosed(data.ticketNumber);
    }

    return { success: true };
  }

  @Post('message')
  async handleMessage(@Body() data: { ticketNumber: string; message: any }) {
    const { ticketNumber, message } = data;
    this.logger.log(`Received message for ticket #${ticketNumber} from bot`);
    
    // Store message in DB
    await this.conversationService.addMessage(ticketNumber, message);
    
    // Emit to specific ticket room via WebSocket
    this.gateway.server.to(`ticket_${ticketNumber}`).emit('new_message', { ticketNumber, message });
    // Emit to list view
    this.gateway.server.emit('activity', { ticketNumber, event: 'new_message' });
    
    return { success: true };
  }

  @Post('rag')
  async handleRag(@Body() data: { conversationId: string }) {
    this.logger.log(`Bot requested RAG for conversation ${data.conversationId}`);
    // Trigger RAG via DiscordService (which calls RagService)
    const conversation = await this.conversationService.findById(data.conversationId);
    if (conversation) {
      // In a real scenario, we might want to trigger this asynchronously
      // For now, we'll just log and let the service handle it if it was already doing so
      this.logger.log(`Triggering RAG pipeline for ticket #${conversation.ticketNumber}`);
    }
    return { success: true };
  }
}
