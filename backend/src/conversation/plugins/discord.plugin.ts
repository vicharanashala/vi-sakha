import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  ConversationPlugin,
  FetchConversationOptions,
  NormalizedConversation,
  NormalizedMessage,
  PluginConversationStats,
} from './plugin.interface';

interface DiscordTranscriptMessage {
  index?: number;
  author?: string;
  user_id?: string;
  is_bot?: boolean;
  content?: string;
  created?: number | string;
  embeds?: Array<{ description?: string }>;
}

interface DiscordTranscript {
  ticket_id?: string;
  channel?: { id?: string };
  messages?: DiscordTranscriptMessage[];
}

@Injectable()
export class DiscordPlugin implements ConversationPlugin {
  name: 'discord' = 'discord';

  private readonly logger = new Logger(DiscordPlugin.name);

  async fetchConversations(options?: FetchConversationOptions): Promise<NormalizedConversation[]> {
    const includeMessages = options?.includeMessages ?? true;
    const limit = options?.limit && options.limit > 0 ? Math.min(options.limit, 500) : undefined;
    const folder = this.resolveTranscriptFolder();

    if (!folder || !fs.existsSync(folder)) {
      this.logger.debug('Discord transcript folder was not found; skipping Discord source');
      return [];
    }

    const files = fs
      .readdirSync(folder)
      .filter((file) => file.toLowerCase().endsWith('.json'));

    const conversations: NormalizedConversation[] = [];

    for (const file of files) {
      try {
        const filePath = path.join(folder, file);
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as DiscordTranscript;
        const parsed = this.parseTranscript(raw, file, includeMessages);
        if (parsed) {
          conversations.push(parsed);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to parse Discord transcript ${file}: ${message}`);
      }
    }

    const sorted = conversations.sort((a, b) => {
      const first = new Date(a.timestamp).getTime();
      const second = new Date(b.timestamp).getTime();
      return second - first;
    });

    return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
  }

  async fetchConversationById(conversationId: string): Promise<NormalizedConversation | null> {
    const folder = this.resolveTranscriptFolder();
    if (!folder || !fs.existsSync(folder)) {
      return null;
    }

    const files = fs
      .readdirSync(folder)
      .filter((file) => file.toLowerCase().endsWith('.json'));

    for (const file of files) {
      try {
        const filePath = path.join(folder, file);
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as DiscordTranscript;

        const candidateId =
          raw.ticket_id ?? raw.channel?.id ?? path.basename(file, path.extname(file));

        if (candidateId !== conversationId) {
          continue;
        }

        return this.parseTranscript(raw, file, true);
      } catch {
        continue;
      }
    }

    return null;
  }

  async fetchStats(): Promise<PluginConversationStats> {
    const conversations = await this.fetchConversations({ includeMessages: false, limit: 5000 });

    return {
      source: 'discord',
      conversationCount: conversations.length,
      totalMessages: conversations.reduce((sum, conversation) => sum + conversation.message_count, 0),
      avgConfidence: null,
    };
  }

  private parseTranscript(
    raw: DiscordTranscript,
    fileName: string,
    includeMessages: boolean,
  ): NormalizedConversation | null {
    const rawMessages = Array.isArray(raw.messages) ? raw.messages : [];
    const ticketOwner = this.detectTicketOwner(rawMessages);
    const messages: NormalizedMessage[] = [];

    for (const message of rawMessages) {
      // Convert Ticket Tool first-message reason into the opening student query.
      if (this.isTicketOpeningMessage(message)) {
        const reason = this.extractReasonFromTicketMessage(message);
        if (reason) {
          messages.push({
            role: 'user',
            text: reason,
            author: ticketOwner.username ?? 'Student',
            timestamp: this.toIsoString(message.created),
          });
        }
        continue;
      }

      const cleanedText = this.cleanText(this.getMessageText(message));
      if (!this.shouldIncludeMessage(message, cleanedText)) {
        continue;
      }

      messages.push({
        role: this.resolveRole(message, ticketOwner),
        text: cleanedText,
        author: message.author,
        timestamp: this.toIsoString(message.created),
      });
    }

    if (messages.length === 0) {
      return null;
    }

    const conversationId = raw.ticket_id ?? raw.channel?.id ?? path.basename(fileName, path.extname(fileName));
    const conversationTimestamp =
      messages.find((message) => !!message.timestamp)?.timestamp ?? new Date().toISOString();
    const detectedUser = ticketOwner.username ?? ticketOwner.userId ?? 'Student';
    const lastPreview = messages[messages.length - 1]?.text?.slice(0, 180) ?? '';

    return {
      conversation_id: conversationId,
      source: 'discord',
      user: detectedUser,
      timestamp: conversationTimestamp,
      message_count: messages.length,
      confidence: null,
      last_message_preview: lastPreview,
      messages: includeMessages ? messages : [messages[messages.length - 1]],
    };
  }

  private isTicketOpeningMessage(message: DiscordTranscriptMessage): boolean {
    return message.author === 'Ticket Tool' && message.index === 1;
  }

  private detectTicketOwner(messages: DiscordTranscriptMessage[]): {
    userId: string | null;
    username: string | null;
  } {
    const openingMessage = messages.find((message) => this.isTicketOpeningMessage(message));
    if (!openingMessage) {
      return { userId: null, username: null };
    }

    const text = this.getMessageText(openingMessage);

    const mentionMatch = text.match(/<@!?(\d+)>/);
    const userId = mentionMatch?.[1] ?? null;

    if (!userId) {
      return { userId: null, username: null };
    }

    const ownerMessage = messages.find(
      (message) => message.user_id === userId && message.author !== 'Ticket Tool',
    );

    return {
      userId,
      username: ownerMessage?.author ?? null,
    };
  }

  private resolveRole(
    message: DiscordTranscriptMessage,
    ticketOwner: { userId: string | null; username: string | null },
  ): 'user' | 'assistant' {
    const byUserId = ticketOwner.userId && message.user_id === ticketOwner.userId;
    const byAuthorName =
      ticketOwner.username &&
      message.author &&
      ticketOwner.username.toLowerCase() === message.author.toLowerCase();

    if (byUserId || byAuthorName) {
      return 'user';
    }

    return 'assistant';
  }

  private shouldIncludeMessage(message: DiscordTranscriptMessage, text: string): boolean {
    if (!text || text.length < 2) {
      return false;
    }

    if (message.author === 'Ticket Tool') {
      return false;
    }

    const lower = text.toLowerCase();
    if (
      lower.includes('transcript saving') ||
      lower.includes('ticket closed by') ||
      lower.includes('support team ticket controls')
    ) {
      return false;
    }

    return true;
  }

  private extractReasonFromTicketMessage(message: DiscordTranscriptMessage): string | null {
    const embedDescription = message.embeds?.map((embed) => embed.description ?? '').join(' ') ?? '';
    const source = `${message.content ?? ''} ${embedDescription}`;

    const reasonMatch = source.match(/Reason\s*:\s*(.+?)(?:TicketTool\.xyz|$)/is);
    if (reasonMatch?.[1]) {
      const cleaned = this.cleanText(reasonMatch[1]);
      return cleaned.length > 0 ? cleaned : null;
    }

    return null;
  }

  private cleanText(text: string): string {
    return text
      .replace(/<@[!&]?\d+>/g, '')
      .replace(/<#\d+>/g, '')
      .replace(/@\w+/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private resolveTranscriptFolder(): string | null {
    const configuredPath = process.env.DISCORD_TRANSCRIPTS_PATH;
    const candidateFolders = [
      configuredPath,
      path.join(process.cwd(), 'discord_transcripts'),
      path.join(process.cwd(), 'bot', 'scraped_transcripts'),
      path.join(process.cwd(), '..', 'bot', 'scraped_transcripts'),
    ].filter((value): value is string => Boolean(value));

    for (const candidate of candidateFolders) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  private getMessageText(message: DiscordTranscriptMessage): string {
    const content = (message.content ?? '').trim();
    if (content) {
      return content;
    }

    const embedText = (message.embeds ?? [])
      .map((embed) => (embed.description ?? '').trim())
      .filter((text) => text.length > 0)
      .join('\n');

    return embedText;
  }

  private toIsoString(value?: number | string): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === 'number') {
      return new Date(value).toISOString();
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  }
}
