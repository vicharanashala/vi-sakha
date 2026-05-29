import { Injectable, Logger } from '@nestjs/common';
import { DiscordConversationService } from '../../../discord/conversation.service';
import {
  ConversationPlugin,
  FetchConversationOptions,
  NormalizedConversation,
  NormalizedMessage,
  PluginConversationStats,
} from './plugin.interface';

@Injectable()
export class DiscordPlugin implements ConversationPlugin {
  name: 'discord' = 'discord';
  private readonly logger = new Logger(DiscordPlugin.name);

  constructor(private readonly discordConversationService: DiscordConversationService) { }

  async fetchConversations(options?: FetchConversationOptions): Promise<NormalizedConversation[]> {
    const limit = options?.limit && options.limit > 0 ? Math.min(options.limit, 500) : 500;

    // Fetch CLOSED tickets directly from the Discord Ingestion MongoDB service
    const rawConversations = await this.discordConversationService.findByStatus('closed', limit);

    const conversations: NormalizedConversation[] = [];

    for (const doc of rawConversations) {
      const allMessages = doc.messages || [];
      const validMessages = allMessages.filter(m => {
        const cleaned = this.cleanText(m.text || '');
        return this.shouldIncludeMessage(m, cleaned);
      });

      if (validMessages.length === 0) continue;

      const latestMsg = validMessages[validMessages.length - 1];
      const previewText = doc.mainReason 
        ? `Reason: ${doc.mainReason}`.slice(0, 180)
        : this.cleanText(latestMsg?.text || '').slice(0, 180);

      const timestamp = latestMsg?.timestamp
        ? new Date(latestMsg.timestamp).toISOString()
        : doc.updatedAt.toISOString();

      const userName = this.resolveUserName(doc);

      const ownerId = this.resolveTicketOwnerId(doc);

      conversations.push({
        conversation_id: doc.ticketNumber,
        source: 'discord',
        user: userName,
        timestamp,
        message_count: validMessages.length,
        confidence: null,
        last_message_preview: previewText,
        mainReason: doc.mainReason,
        registeredEmail: doc.registeredEmail,
        cohortName: doc.cohortName,
        status: doc.status,
        messages: options?.includeMessages
          ? validMessages.map(m => this.mapMessage(m, ownerId))
          : [this.mapMessage(latestMsg, ownerId)],
      });
    }

    const sorted = conversations.sort((a, b) => {
      const first = new Date(a.timestamp).getTime();
      const second = new Date(b.timestamp).getTime();
      return second - first; // newest first
    });

    return sorted.slice(0, limit);
  }

  async fetchConversationById(conversationId: string): Promise<NormalizedConversation | null> {
    const doc = await this.discordConversationService.findByTicketNumber(conversationId);
    if (!doc) return null;

    const allMessages = doc.messages || [];
    const validMessages = allMessages.filter(m => {
      const cleaned = this.cleanText(m.text || '');
      return this.shouldIncludeMessage(m, cleaned);
    });

    if (validMessages.length === 0 && !doc.mainReason) return null;

    const latestMsg = validMessages[validMessages.length - 1];
    const previewText = doc.mainReason 
        ? `Reason: ${doc.mainReason}`.slice(0, 180)
        : this.cleanText(latestMsg?.text || '').slice(0, 180);

    const timestamp = latestMsg?.timestamp
      ? new Date(latestMsg.timestamp).toISOString()
      : doc.updatedAt.toISOString();

    const userName = this.resolveUserName(doc);

    const ownerId = this.resolveTicketOwnerId(doc);

    return {
      conversation_id: doc.ticketNumber,
      source: 'discord',
      user: userName,
      timestamp,
      message_count: validMessages.length,
      confidence: null,
      last_message_preview: previewText,
      mainReason: doc.mainReason,
      registeredEmail: doc.registeredEmail,
      cohortName: doc.cohortName,
      status: doc.status,
      messages: validMessages.map(m => this.mapMessage(m, ownerId)),
    };
  }

  async fetchStats(): Promise<PluginConversationStats> {
    const [conversationCount, totalMessages] = await Promise.all([
      this.discordConversationService.countByStatus('closed'),
      this.discordConversationService.countMessagesByStatus('closed'),
    ]);

    return {
      source: 'discord',
      conversationCount,
      totalMessages,
      avgConfidence: null,
    };
  }

  // Known bot display names — always exclude from "ticket owner" logic
  private static readonly BOT_NAMES = new Set([
    'vibot', 'ticket tool', 'help tool', 'tickettool', 'helptool',
    'mee6', 'dyno', 'carl-bot', 'arcane', 'unknown',
  ]);

  private isBot(name?: string): boolean {
    if (!name) return false;
    return DiscordPlugin.BOT_NAMES.has(name.toLowerCase().trim());
  }

  /**
   * Resolve the display name of the ticket owner.
   * Priority: ticketOwnerName > first human user-role message author > threadName extraction > email > fallback
   * Always excludes bot names.
   */
  private resolveUserName(doc: any): string {
    // 1. Explicit owner name (if not a bot — guards against past data bugs)
    if (doc.ticketOwnerName && !this.isBot(doc.ticketOwnerName)) {
      return doc.ticketOwnerName;
    }

    // 2. First human 'user'-role message author
    const firstUserMsg = (doc.messages || []).find(
      (m: any) => m.role === 'user' && m.authorName && !this.isBot(m.authorName),
    );
    if (firstUserMsg?.authorName) return firstUserMsg.authorName;

    // 3. Extract from thread name (e.g., "others-roguethunder_08-100172" → "roguethunder_08")
    if (doc.threadName) {
      const parts = doc.threadName.split('-');
      if (parts.length >= 3) {
        return parts.slice(1, -1).join('-');
      }
    }

    // 4. Registered email prefix
    if (doc.registeredEmail) {
      return doc.registeredEmail.split('@')[0];
    }

    return doc.ticketOwnerId || 'Student';
  }

  /**
   * Determine the ticket owner's authorId from the conversation document.
   * Falls back to message-based detection when the explicit field is missing.
   */
  private resolveTicketOwnerId(doc: any): string | undefined {
    if (doc.ticketOwnerId) return doc.ticketOwnerId;

    // Find the first non-bot, non-agent message author
    const firstStudent = (doc.messages || []).find(
      (m: any) => m.role === 'user' && m.authorId && !this.isBot(m.authorName),
    );
    return firstStudent?.authorId;
  }

  /**
   * Map a raw Discord message to the normalized format.
   * Uses ticketOwnerId to correctly distinguish student (right/blue) vs mentor (left/gray).
   */
  private mapMessage(msg: any, ticketOwnerId?: string): NormalizedMessage {
    let role: 'user' | 'assistant';
    const displayAuthor = msg.authorName || 'Unknown';
    const displayText = this.cleanText(msg.text || '');

    if (msg.role === 'system' || this.isBot(msg.authorName)) {
      // Bot/system messages → show as assistant (left side / centered pill)
      role = 'assistant';
    } else if (msg.role === 'agent') {
      // Mentors/staff explicitly tagged by the normalizer
      role = 'assistant';
    } else if (ticketOwnerId && msg.authorId) {
      // Compare author ID to ticket owner
      role = msg.authorId === ticketOwnerId ? 'user' : 'assistant';
    } else {
      // No ticketOwnerId available — fall back to the original normalizer role
      role = msg.role === 'user' ? 'user' : 'assistant';
    }

    return {
      role,
      text: displayText,
      author: displayAuthor,
      timestamp: new Date(msg.timestamp || Date.now()).toISOString(),
      type: msg.type || 'message',
      attachments: msg.attachments || [],
    };
  }

  private shouldIncludeMessage(message: any, text: string): boolean {
    // metadata cards are handled by the 'type' in frontend, include them here so they reach the frontend
    if (message.type === 'ticket_reason') return true;

    if (!text || text.length < 2) return false;

    // Hide bots completely, or just the specific phrases
    if (message.authorName === 'Ticket Tool' || message.authorName === 'Help Tool') {
      return false;
    }

    const lower = text.toLowerCase();
    if (
      lower.includes('transcript saving') ||
      lower.includes('ticket closed by') ||
      lower.includes('support team ticket controls') ||
      lower.includes('are you sure you want to close this ticket')
    ) {
      return false;
    }

    return true;
  }

  private cleanText(text: string): string {
    return text
      .replace(/<@[!&]?\d+>/g, '') // remove discord user pings
      .replace(/<#\d+>/g, '')      // remove channel mentions
      .replace(/@\w+/g, '')        // remove inline tags
      .replace(/https?:\/\/\S+/g, '') // remove pure urls if not surrounded by text
      .replace(/\s+/g, ' ')        // collapse whitespace
      .trim();
  }
}
