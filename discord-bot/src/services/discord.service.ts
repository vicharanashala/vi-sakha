import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';

import { DiscordConversationService } from './conversation.service';
import { MessageNormalizerService, RawDiscordMessage } from '../utils/message.normalizer';
import { TranscriptParserService } from '../utils/transcript.parser';
import { DiscordRagService } from './rag.service';
import { DiscordMessage } from '../schemas/discord-message.schema';
import { BackendApiService } from './backend-api.service';

/**
 * Orchestrates the full Discord ticket lifecycle for the standalone bot:
 *
 *   CREATED  → onTicketChannelCreate()   (channel OR thread)
 *   ACTIVE   → onLiveMessage()
 *   CLOSED   → onTicketClosed()          (embed-only closure)
 *             → onTranscriptUploaded()   (HTML transcript + optional embed)
 */
@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);

  constructor(
    private readonly conversationService: DiscordConversationService,
    private readonly normalizer: MessageNormalizerService,
    private readonly parser: TranscriptParserService,
    private readonly ragService: DiscordRagService,
    private readonly backendApi: BackendApiService,
    private readonly httpService: HttpService,
  ) {}

  // ── Lifecycle handlers ─────────────────────────────────────────────────────

  async onTicketChannelCreate(
    ticketNumber: string,
    channelId: string,
    threadName?: string,
  ): Promise<void> {
    const existing =
      await this.conversationService.findByTicketNumber(ticketNumber);
    if (existing) {
      this.logger.debug(
        `Conversation for ticket #${ticketNumber} already exists — skipping create`,
      );
      return;
    }

    const conversation = await this.conversationService.createConversation(
      ticketNumber,
      channelId,
    );

    if (threadName) {
      await this.conversationService.updateMetadata(ticketNumber, { threadName });
    }

    this.logger.log(`[TICKET CREATED] #${ticketNumber} channel: ${channelId}${threadName ? ` thread: ${threadName}` : ''}`);

    // Notify backend
    await this.backendApi.notifyActivity(ticketNumber, 'ticket_created', { channelId, threadName });
  }

  async onLiveMessage(
    ticketNumber: string,
    channelId: string,
    raw: RawDiscordMessage,
    threadName?: string,
  ): Promise<void> {
    let conversation =
      await this.conversationService.findByTicketNumber(ticketNumber);
    if (!conversation) {
      this.logger.log(
        `No conversation for ticket #${ticketNumber} — creating on first message`,
      );
      conversation = await this.conversationService.createConversation(
        ticketNumber,
        channelId,
      );
      if (threadName) {
        await this.conversationService.updateMetadata(ticketNumber, { threadName });
      }
      await this.backendApi.notifyActivity(ticketNumber, 'ticket_created', { channelId, threadName });
    }

    const normalized = this.normalizer.normalize(raw);

    if (!normalized.text && normalized.attachments.length === 0) {
      return;
    }

    await this.conversationService.addMessage(ticketNumber, normalized);
    this.logger.log(
      `[MSG STORED] ticket #${ticketNumber} | role=${normalized.role} | "${normalized.text?.substring(0, 60)}"`,
    );

    if (normalized.text && /has claimed this ticket/i.test(normalized.text)) {
      const claimerName = normalized.text.split(' has claimed')[0].trim();
      await this.conversationService.setClaimer(ticketNumber, normalized.authorId ?? '', claimerName);
    }

    if (normalized.role === 'user' && normalized.authorId && !conversation.ticketOwnerId) {
      await this.conversationService.setTicketOwner(
        ticketNumber,
        normalized.authorId,
        normalized.authorName ?? '',
      );
    }

    // Notify backend of new message (this triggers notifications and Socket.io updates)
    await this.backendApi.notifyNewMessage(ticketNumber, normalized);
    await this.backendApi.notifyActivity(ticketNumber, 'new_message');
  }

  async onTicketClosed(
    ticketNumber: string,
    embedMeta?: Record<string, string>,
  ): Promise<void> {
    await this.conversationService.markClosed(ticketNumber);

    if (embedMeta) {
      await this.enrichFromEmbed(ticketNumber, embedMeta);
    }

    this.logger.log(`[TICKET CLOSED] #${ticketNumber}`);
    await this.backendApi.notifyActivity(ticketNumber, 'ticket_closed');
  }

  async onTranscriptUploaded(
    ticketNumber: string,
    fileUrl: string,
    embedMeta?: Record<string, string>,
    fileType: 'html' | 'json' = 'html',
  ): Promise<void> {
    const alreadyProcessed =
      await this.conversationService.isTranscriptProcessed(ticketNumber);
    if (alreadyProcessed) {
      this.logger.warn(
        `Transcript for ticket #${ticketNumber} already processed — skipping`,
      );
      return;
    }

    let content: string;
    try {
      if (fileUrl.startsWith('http')) {
        const response = await firstValueFrom(
          this.httpService.get<string>(fileUrl, { responseType: 'text' }),
        );
        content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      } else {
        const possiblePaths = [
          path.resolve(process.cwd(), fileUrl),
          path.resolve(process.cwd(), '..', fileUrl),
        ];
        const absolutePath = possiblePaths.find(p => fs.existsSync(p));
        if (!absolutePath) {
          throw new BadRequestException(`Local transcript file not found.`);
        }
        content = fs.readFileSync(absolutePath, 'utf-8');
      }
    } catch (err) {
      this.logger.error(`Failed to fetch transcript: ${(err as Error).message}`);
      throw new InternalServerErrorException(`Failed to fetch transcript`);
    }

    let messages: any[] = [];
    try {
      messages = fileType === 'json' ? this.parser.parseJson(content) : this.parser.parse(content);
      if (!messages || messages.length === 0) {
        throw new BadRequestException(`Parsed zero messages.`);
      }
    } catch (err) {
       this.logger.error(`Parsing failure: ${(err as Error).message}`);
       throw new InternalServerErrorException(`Failed to parse transcript`);
    }

    const conversation = await this.conversationService.replaceMessages(
      ticketNumber,
      messages,
    );

    if (embedMeta) {
      await this.enrichFromEmbed(ticketNumber, embedMeta);
    }

    // Notify backend
    await this.backendApi.notifyActivity(ticketNumber, 'transcript_ready');
    await this.backendApi.notifyActivity(ticketNumber, 'ticket_closed');

    // Trigger RAG via backend
    await this.backendApi.triggerRag(conversation);
  }

  private async enrichFromEmbed(
    ticketNumber: string,
    embedMeta: Record<string, string>,
  ): Promise<void> {
    const metadata: Record<string, string> = {};
    const fieldMap: Record<string, string> = {
      'Main Reason': 'mainReason',
      'Additional Details': 'additionalDetails',
      'Registered Email': 'registeredEmail',
      'Cohort Name': 'cohortName',
      'Opened By': 'openedBy',
      'Closed By': 'closedBy',
    };

    for (const [embedField, schemaField] of Object.entries(fieldMap)) {
      if (embedMeta[embedField]) {
        metadata[schemaField] = embedMeta[embedField];
      }
    }

    if (embedMeta['threadName']) {
      metadata['threadName'] = embedMeta['threadName'];
    }

    if (embedMeta['description']) {
      const desc = embedMeta['description'];
      for (const [embedField, schemaField] of Object.entries(fieldMap)) {
        if (!metadata[schemaField]) {
          const match = desc.match(new RegExp(`${embedField}[:\\s]+(.+?)(?:\\n|$)`, 'i'));
          if (match) {
            metadata[schemaField] = match[1].trim();
          }
        }
      }
    }

    if (Object.keys(metadata).length > 0) {
      await this.conversationService.updateMetadata(ticketNumber, metadata);
    }
  }
}
