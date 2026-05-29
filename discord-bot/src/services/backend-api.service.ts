import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class BackendApiService {
  private readonly logger = new Logger(BackendApiService.name);
  private readonly backendUrl: string;
  private readonly backendApiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.backendUrl = this.configService.get<string>('BACKEND_API_URL') || 'http://localhost:3000/api';
    this.backendApiKey = this.configService.get<string>('INTERNAL_BOT_API_KEY') || 'vsakha_internal_bot_secret';
  }

  async notifyActivity(ticketNumber: string, event: string, metadata?: any): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.backendUrl}/discord-bot/activity`, { ticketNumber, event, ...metadata }, {
          headers: { 'x-api-key': this.backendApiKey }
        })
      );
    } catch (err: any) {
      this.logger.error(`Failed to notify backend of activity: ${err.message}`);
    }
  }

  async notifyNewMessage(ticketNumber: string, message: any): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.backendUrl}/discord-bot/message`, { ticketNumber, message }, {
          headers: { 'x-api-key': this.backendApiKey }
        })
      );
    } catch (err: any) {
      this.logger.error(`Failed to notify backend of new message: ${err.message}`);
    }
  }

  async processAiQuery(query: string): Promise<{ answer: string }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.backendUrl}/mcp/query`, { query }, {
          headers: { 'x-api-key': this.backendApiKey }
        })
      );
      return response.data;
    } catch (err: any) {
      this.logger.error(`Failed to process AI query: ${err.message}`);
      return { answer: "I'm sorry, I'm having trouble connecting to my brain right now." };
    }
  }

  async triggerRag(conversation: any): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.backendUrl}/discord-bot/rag`, { conversationId: conversation._id }, {
          headers: { 'x-api-key': this.backendApiKey }
        })
      );
    } catch (err: any) {
      this.logger.error(`Failed to trigger RAG pipeline: ${err.message}`);
    }
  }
}
