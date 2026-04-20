import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';

import { DiscordConversationService } from './conversation.service';
import { MessageNormalizerService, RawDiscordMessage } from './message.normalizer';
import { TranscriptParserService } from './transcript.parser';
import { DiscordRagService } from './rag.service';
import { DiscordGateway } from './discord.gateway';
import { DiscordMessage } from './schemas/discord-message.schema';
import { NotificationService } from '../notifications/notification.service';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';
import { NotificationType } from '../notifications/schemas/notification.schema';
import { UserRole } from '../users/schemas/user.schema';

/**
 * Orchestrates the full Discord ticket lifecycle:
 *
 *   CREATED  → onTicketChannelCreate()   (channel OR thread)
 *   ACTIVE   → onLiveMessage()
 *   CLOSED   → onTicketClosed()          (embed-only closure)
 *             → onTranscriptUploaded()   (HTML transcript + optional embed)
 *   EMBEDDED → rag.generateEmbeddings()  (async, after transcript)
 */
@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);

  constructor(
    private readonly conversationService: DiscordConversationService,
    private readonly normalizer: MessageNormalizerService,
    private readonly parser: TranscriptParserService,
    private readonly ragService: DiscordRagService,
    private readonly gateway: DiscordGateway,
    private readonly httpService: HttpService,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
    private readonly usersService: UsersService,
  ) {}

  // ── Lifecycle handlers ─────────────────────────────────────────────────────

  /**
   * Called when a ticket channel or thread is created/discovered.
   * Also called from the startup scan for existing channels & threads.
   * Idempotent — safe to call multiple times for the same ticket.
   */
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

    // Store thread name if available
    if (threadName) {
      await this.conversationService.updateMetadata(ticketNumber, { threadName });
    }

    this.logger.log(`[TICKET CREATED] #${ticketNumber} channel: ${channelId}${threadName ? ` thread: ${threadName}` : ''}`);

    // Notify the list view that a new ticket exists
    this.gateway.emitActivity(ticketNumber, 'ticket_created');

    // ── Notify lab members about the new ticket ─────────────────────────────
    this.notifyMentorsNewTicket(ticketNumber, threadName || `Ticket ${ticketNumber}`).catch(err => 
      this.logger.error(`New ticket notification failed: ${err.message}`)
    );
  }

  private async notifyMentorsNewTicket(ticketNumber: string, studentName: string) {
    const mentors = await this.usersService.findAll(UserRole.LAB_MEMBER);
    for (const mentor of mentors) {
      await this.notificationService.notifyTicketEvent(
        NotificationType.NEW_TICKET,
        mentor._id.toString(),
        'New Ticket Raised',
        `A new ticket #${ticketNumber} has been raised.`,
        { ticketNumber, studentName }
      );
      await this.emailService.notifyNewTicket(mentor.email, ticketNumber, studentName);
    }
  }

  /**
   * Called for every messageCreate event in a ticket channel or thread.
   * Bot messages ARE processed — the normalizer assigns them role='system'
   * so they appear as system events in the UI (ticket reason embed, etc.).
   */
  async onLiveMessage(
    ticketNumber: string,
    channelId: string,
    raw: RawDiscordMessage,
    threadName?: string,
  ): Promise<void> {
    // Ensure conversation exists (bot may have restarted mid-flight)
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
      this.gateway.emitActivity(ticketNumber, 'ticket_created');
    }

    const normalized = this.normalizer.normalize(raw);

    // Skip genuinely empty messages (no text, no attachments)
    if (!normalized.text && normalized.attachments.length === 0) {
      this.logger.debug(
        `Skipping empty message in ticket #${ticketNumber} from ${raw.author.username}`,
      );
      return;
    }

    await this.conversationService.addMessage(ticketNumber, normalized);
    this.logger.log(
      `[MSG STORED] ticket #${ticketNumber} | role=${normalized.role} | "${normalized.text?.substring(0, 60)}"`,
    );

    // ── Handle Ticket Claiming ───────────────────────────────────────────────
    if (normalized.text && /has claimed this ticket/i.test(normalized.text)) {
      // The claimer name is the first word before "has claimed"
      const claimerName = normalized.text.split(' has claimed')[0].trim();
      // Store claimer in DB (we don't have their userId yet, but we have their Discord info)
      await this.conversationService.setClaimer(ticketNumber, normalized.authorId ?? '', claimerName);
    }

    // ── Handle Notifications ────────────────────────────────────────────────
    this.handleNotifications(ticketNumber, conversation, normalized).catch(err => 
      this.logger.error(`Notification failed for ticket #${ticketNumber}: ${err.message}`)
    );

    // Capture the ticket owner from the very first student message
    if (normalized.role === 'user' && normalized.authorId && !conversation.ticketOwnerId) {
      await this.conversationService.setTicketOwner(
        ticketNumber,
        normalized.authorId,
        normalized.authorName ?? '',
      );
    }

    // Emit to the detail view (clients in the room)
    this.gateway.emitNewMessage(ticketNumber, normalized as DiscordMessage);
    // Emit to the list view (all connected clients) so counts refresh
    this.gateway.emitActivity(ticketNumber, 'new_message');
  }

  /**
   * Complex notification logic for ticket replies
   */
  private async handleNotifications(ticketNumber: string, conversation: any, message: any) {
    // 1. If it's a mentor/system message → Notify the student
    if (message.role === 'assistant' || message.role === 'system') {
      const studentEmail = conversation.registeredEmail;
      if (studentEmail) {
        const student = await this.usersService.findByEmail(studentEmail);
        if (student) {
          // In-app notification
          await this.notificationService.notifyTicketEvent(
            NotificationType.TICKET_REPLY,
            student._id.toString(),
            'New Message Received',
            `A mentor has replied to your ticket #${ticketNumber}.`,
            { ticketNumber, senderName: message.authorName }
          );
          // Email notification
          await this.emailService.notifyTicketReply(student.email, ticketNumber, message.authorName || 'Mentor');
        }
      }
    }

    // 2. If it's a student message → Notify the claiming mentor (if any)
    if (message.role === 'user' && conversation.claimedBy) {
      // Find the mentor user in our DB (this assumes we have their Discord ID in some field)
      // For now, let's assume we notify the person who claimed it if we can find them.
      // If we don't have a direct link, we might notify all lab members as a fallback.
      const mentors = await this.usersService.findAll(UserRole.LAB_MEMBER);
      for (const mentor of mentors) {
        // Simple logic: if they are a lab member, notify them (per user's "both" request)
        await this.notificationService.notifyTicketEvent(
          NotificationType.TICKET_REPLY,
          mentor._id.toString(),
          'Student Refined Query',
          `Student ${message.authorName} has messaged in ticket #${ticketNumber}.`,
          { ticketNumber, senderName: message.authorName }
        );
        // User asked for mentor side notification too
        await this.emailService.notifyTicketReply(mentor.email, ticketNumber, message.authorName || 'Student');
      }
    }
  }

  /**
   * Called when a ticket is closed — detected from the Help Tool embed
   * in #ticket-transcript (when no HTML is attached yet, or as a standalone event).
   */
  async onTicketClosed(
    ticketNumber: string,
    embedMeta?: Record<string, string>,
  ): Promise<void> {
    await this.conversationService.markClosed(ticketNumber);

    // Enrich conversation with embed metadata
    if (embedMeta) {
      await this.enrichFromEmbed(ticketNumber, embedMeta);
    }

    this.logger.log(`[TICKET CLOSED] #${ticketNumber}`);
    this.gateway.emitActivity(ticketNumber, 'ticket_closed');
  }

  /**
   * Called when a transcript is uploaded to the transcript channel.
   * Atomically overwrites all live messages and marks the ticket closed.
   * Idempotent via the transcriptProcessed flag.
   */
  async onTranscriptUploaded(
    ticketNumber: string,
    fileUrl: string,
    embedMeta?: Record<string, string>,
    fileType: 'html' | 'json' = 'html',
  ): Promise<void> {
    // ── Deduplication guard ──────────────────────────────────────────────────
    const alreadyProcessed =
      await this.conversationService.isTranscriptProcessed(ticketNumber);
    if (alreadyProcessed) {
      this.logger.warn(
        `Transcript for ticket #${ticketNumber} already processed — skipping`,
      );
      return;
    }

    // ── Fetch Transcript File ─────────────────────────────────────────────────
    let content: string;
    try {
      if (fileUrl.startsWith('http')) {
        // Fetch remote URL
        const response = await firstValueFrom(
          this.httpService.get<string>(fileUrl, { responseType: 'text' }),
        );
        content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      } else {
        // Assume it is a local file path (for testing/automation)
        // Check multiple locations to handle different CWDs and startup contexts
        const possiblePaths = [
          path.resolve(process.cwd(), fileUrl),
          path.resolve(process.cwd(), '..', fileUrl),
          path.resolve(__dirname, '..', '..', '..', fileUrl) // Relative to DiscordService
        ];
        
        const absolutePath = possiblePaths.find(p => fs.existsSync(p));
        
        if (!absolutePath) {
          throw new BadRequestException(`Local transcript file not found. Tried: ${possiblePaths.join(', ')}`);
        }
        content = fs.readFileSync(absolutePath, 'utf-8');
        this.logger.log(`[TRANSCRIPT] Loaded from local file: ${absolutePath}`);
      }
    } catch (err) {
      this.logger.error(`Failed to fetch transcript from ${fileUrl}: ${(err as Error).message}`);
      // Throw correct exception for controller bubble-up
      if (err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException(`Failed to fetch transcript: ${(err as Error).message}`);
    }

    // ── Parse ────────────────────────────────────────────────────────────────
    let messages: any[] = [];
    try {
      messages = fileType === 'json' ? this.parser.parseJson(content) : this.parser.parse(content);
      
      if (!messages || messages.length === 0) {
        throw new BadRequestException(`Parsed zero messages from ${fileType} transcript. File might be invalid or empty.`);
      }
    } catch (err) {
       this.logger.error(`Parsing failure: ${(err as Error).message}`);
       if (err instanceof BadRequestException) throw err;
       throw new InternalServerErrorException(`Failed to parse transcript: ${(err as Error).message}`);
    }

    this.logger.log(
      `[TRANSCRIPT] ticket #${ticketNumber} — parsed ${messages.length} messages from ${fileType}`,
    );

    // ── Atomic upsert — transcript-only tickets are created directly as closed ─
    const conversation = await this.conversationService.replaceMessages(
      ticketNumber,
      messages,
    );

    // ── Enrich with embed metadata if available ──────────────────────────────
    if (embedMeta) {
      await this.enrichFromEmbed(ticketNumber, embedMeta);
    }

    // ── Notify UI ────────────────────────────────────────────────────────────
    this.gateway.emitTranscriptReady(ticketNumber, messages.length);
    this.gateway.emitActivity(ticketNumber, 'transcript_ready');
    this.gateway.emitActivity(ticketNumber, 'ticket_closed');

    // ── Trigger RAG pipeline asynchronously ──────────────────────────────────
    this.ragService.generateEmbeddings(conversation).catch((err) =>
      this.logger.error(
        `RAG pipeline error for ticket #${ticketNumber}: ${(err as Error).message}`,
      ),
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Extract and store ticket metadata from the Help Tool embed fields.
   * Fields may include: "Ticket ID", "Main Reason", "Additional Details",
   * "Registered Email", "Cohort Name", "Opened By", "Closed By".
   */
  private async enrichFromEmbed(
    ticketNumber: string,
    embedMeta: Record<string, string>,
  ): Promise<void> {
    const metadata: Record<string, string> = {};

    // Map embed field names to schema fields
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

    // Also check threadName
    if (embedMeta['threadName']) {
      metadata['threadName'] = embedMeta['threadName'];
    }

    // Also try to extract from the description field (some embeds inline all data)
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
      this.logger.log(
        `[ENRICHED] ticket #${ticketNumber} with ${Object.keys(metadata).length} fields from embed`,
      );
    }
  }
}
