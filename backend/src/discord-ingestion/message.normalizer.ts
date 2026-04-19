import { Injectable } from '@nestjs/common';
import { DiscordMessage } from './schemas/discord-message.schema';

/** Roles whose display names indicate a mentor / staff member */
const MENTOR_ROLE_KEYWORDS = [
  'mentor',
  'admin',
  'moderator',
  'staff',
  'lab member',
  'instructor',
  'host',
  'supervisor',
];

export interface RawDiscordMessage {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    bot: boolean;
    /** Discord role names the member holds */
    roles?: string[];
  };
  embeds?: Array<{ description?: string; title?: string; fields?: Array<{ name: string; value: string; inline?: boolean }> }>;
  attachments?: Array<{ url: string; name?: string }>;
  createdAt: Date;
}

@Injectable()
export class MessageNormalizerService {
  /**
   * Convert a raw Discord message into the canonical DiscordMessage shape.
   */
  normalize(raw: RawDiscordMessage): Omit<DiscordMessage, never> {
    const text = this.extractText(raw);
    const role = this.determineRole(raw);
    const type = this.determineType(text);
    const attachments = (raw.attachments ?? []).map((a) => a.url);

    return {
      role,
      type,
      text,
      attachments,
      timestamp: raw.createdAt,
      authorId: raw.author.id,
      authorName: raw.author.username,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Text priority:
   *   1. embed.description / embed.title  (bot-generated rich messages)
   *   2. message.content                  (plain text)
   */
  private extractText(raw: RawDiscordMessage): string {
    if (raw.embeds && raw.embeds.length > 0) {
      const parts: string[] = [];

      for (const embed of raw.embeds) {
        // Collect title / description
        if (embed.title) parts.push(embed.title);
        if (embed.description) parts.push(embed.description);

        // Collect structured fields (e.g. "Ticket ID", "Main Reason")
        if (embed.fields && embed.fields.length > 0) {
          for (const field of embed.fields) {
            if (field.name && field.value) {
              parts.push(`**${field.name}**\n${field.value}`);
            }
          }
        }
      }

      const embedText = parts.filter(Boolean).join('\n');
      if (embedText.trim()) return embedText.trim();
    }
    return (raw.content ?? '').trim();
  }

  private determineRole(raw: RawDiscordMessage): 'user' | 'agent' | 'system' {
    if (raw.author.bot) return 'system';

    const memberRoles = raw.author.roles ?? [];
    const isMentor = memberRoles.some((r) =>
      MENTOR_ROLE_KEYWORDS.some((kw) => r.toLowerCase().includes(kw)),
    );

    return isMentor ? 'agent' : 'user';
  }

  private determineType(text: string): 'message' | 'ticket_reason' {
    return /reason:/i.test(text) ? 'ticket_reason' : 'message';
  }
}
