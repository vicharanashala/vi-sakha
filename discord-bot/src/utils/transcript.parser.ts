import { Injectable, Logger } from '@nestjs/common';
import { DiscordMessage } from '../schemas/discord-message.schema';

export type ParsedMessage = Omit<DiscordMessage, never>;

/**
 * Parses DiscordChatExporter v2/v3 HTML transcripts into canonical
 * DiscordMessage objects using regex — no external HTML-parsing libraries
 * required.
 *
 * Expected HTML structure (DiscordChatExporter):
 *   <div class="chatlog__message-group">
 *     <div class="chatlog__messages">
 *       <span class="chatlog__author-name">AuthorName</span>
 *       <span class="chatlog__author-bot-label">BOT</span>   <!-- optional -->
 *       <div class="chatlog__message" ...>
 *         <div class="chatlog__content"><span class="markdown">text</span></div>
 *         <div class="chatlog__attachments">...</div>
 *       </div>
 *     </div>
 *   </div>
 */
@Injectable()
export class TranscriptParserService {
  private readonly logger = new Logger(TranscriptParserService.name);

  parse(html: string): ParsedMessage[] {
    const messages: ParsedMessage[] = [];
    const groups = this.splitIntoGroups(html);

    this.logger.debug(`Transcript: found ${groups.length} message groups`);

    for (const group of groups) {
      const authorName = this.extractAuthorName(group);
      const isBot = this.isBotGroup(group, authorName);
      const role: 'user' | 'agent' | 'system' = isBot ? 'system' : 'user';

      const blocks = this.extractMessageBlocks(group);

      for (const block of blocks) {
        const text = this.extractText(block);
        const timestamp = this.extractTimestamp(block) ?? new Date();
        const attachments = this.extractAttachments(block);

        // Skip empty messages
        if (!text && attachments.length === 0) continue;

        const type: 'message' | 'ticket_reason' = /reason:/i.test(text)
          ? 'ticket_reason'
          : 'message';

        messages.push({
          role,
          type,
          text,
          attachments,
          timestamp,
          authorId: authorName,
          authorName: authorName || 'Unknown',
        });
      }
    }

    this.logger.log(`Parsed ${messages.length} messages from transcript`);
    return messages;
  }

  /**
   * Parse Help Tool v2 JSON transcripts into canonical DiscordMessage objects.
   * Expected JSON: [{ timestamp: "YYYY-MM-DD HH:mm:ss", author: "Name#1234", author_id: 123, content: "text" }]
   */
  parseJson(jsonContent: string): ParsedMessage[] {
    try {
      const parsed = JSON.parse(jsonContent);
      let rawMessages: any[];

      if (Array.isArray(parsed)) {
        rawMessages = parsed;
      } else if (parsed && Array.isArray(parsed.messages)) {
        rawMessages = parsed.messages;
      } else {
        this.logger.error('JSON transcript format not recognized: expected an array or an object with a "messages" array');
        return [];
      }

      const messages: ParsedMessage[] = [];

      for (const raw of rawMessages) {
        const text = String(raw.content || '').trim();
        // Skip truly empty messages
        if (!text && !raw.attachments?.length) continue;

        const authorName = String(raw.author || 'Unknown').split('#')[0];
        const isBot = this.isBotGroup('', authorName);
        const role: 'user' | 'agent' | 'system' = isBot ? 'system' : 'user';

        const type: 'message' | 'ticket_reason' = /reason:/i.test(text)
          ? 'ticket_reason'
          : 'message';

        const d = new Date(raw.timestamp);
        const timestamp = isNaN(d.getTime()) ? new Date() : d;

        messages.push({
          role,
          type,
          text,
          attachments: raw.attachments || [],
          timestamp,
          authorId: String(raw.author_id || authorName),
          authorName,
        });
      }

      this.logger.log(`Parsed ${messages.length} messages from JSON transcript`);
      return messages;
    } catch (err) {
      this.logger.error(`Failed to parse JSON transcript: ${(err as Error).message}`);
      return [];
    }
  }

  // ── Splitting ──────────────────────────────────────────────────────────────

  /**
   * Split the full HTML into per-author message group chunks.
   */
  private splitIntoGroups(html: string): string[] {
    const groups: string[] = [];
    const re = /<div[^>]+class="[^"]*chatlog__message-group[^"]*"[^>]*>/g;
    const starts: number[] = [];
    let m: RegExpExecArray | null;

    while ((m = re.exec(html)) !== null) {
      starts.push(m.index);
    }

    for (let i = 0; i < starts.length; i++) {
      const start = starts[i];
      const end = i + 1 < starts.length ? starts[i + 1] : html.length;
      groups.push(html.slice(start, end));
    }

    return groups;
  }

  /**
   * Within a message-group, split into individual chatlog__message blocks.
   */
  private extractMessageBlocks(group: string): string[] {
    const blocks: string[] = [];
    const re = /<div[^>]+class="[^"]*chatlog__message(?:\s[^"]*)?"\s[^>]*>/g;
    const starts: number[] = [];
    let m: RegExpExecArray | null;

    while ((m = re.exec(group)) !== null) {
      starts.push(m.index);
    }

    for (let i = 0; i < starts.length; i++) {
      const start = starts[i];
      const end = i + 1 < starts.length ? starts[i + 1] : group.length;
      blocks.push(group.slice(start, end));
    }

    return blocks;
  }

  // ── Field extraction ───────────────────────────────────────────────────────

  private extractAuthorName(group: string): string {
    // Try data attribute first, then inner text of author-name span
    const attrMatch = group.match(
      /class="[^"]*chatlog__author-name[^"]*"[^>]*>([^<]+)</,
    );
    if (attrMatch) return this.decodeEntities(attrMatch[1]).trim();

    // Fallback: any span/div tagged with author
    const fallback = group.match(/data-user-name="([^"]+)"/);
    return fallback ? fallback[1].trim() : 'Unknown';
  }

  private isBotGroup(group: string, authorName: string): boolean {
    if (/chatlog__author-bot-label/i.test(group)) return true;
    if (/\bbot\b/i.test(authorName)) return true;
    return false;
  }

  /**
   * Extract the human-readable text of a single message block.
   * Tries multiple class names used across different exporter versions.
   */
  private extractText(block: string): string {
    const candidates = [
      // v3: chatlog__markdown-preserve
      /<div[^>]+class="[^"]*chatlog__markdown[^"]*"[^>]*>([\s\S]*?)<\/div>/,
      // v2: chatlog__content wrapping a markdown span
      /<div[^>]+class="[^"]*chatlog__content[^"]*"[^>]*>([\s\S]*?)<\/div>/,
      // Generic markdown span
      /<span[^>]+class="[^"]*markdown[^"]*"[^>]*>([\s\S]*?)<\/span>/,
    ];

    for (const re of candidates) {
      const match = block.match(re);
      if (match) {
        const text = this.stripHtml(match[1]).trim();
        if (text) return text;
      }
    }

    return '';
  }

  /**
   * Returns the ISO timestamp from a <time datetime="..."> element,
   * or null if absent.
   */
  private extractTimestamp(block: string): Date | null {
    const dtMatch = block.match(/datetime="([^"]+)"/);
    if (dtMatch) {
      const d = new Date(dtMatch[1]);
      return isNaN(d.getTime()) ? null : d;
    }

    // Fallback: text inside chatlog__timestamp
    const tsMatch = block.match(
      /class="[^"]*chatlog__timestamp[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/,
    );
    if (tsMatch) {
      const d = new Date(tsMatch[1].trim());
      return isNaN(d.getTime()) ? null : d;
    }

    return null;
  }

  /**
   * Collect all href URLs from the attachment/embed sections of a block.
   */
  private extractAttachments(block: string): string[] {
    const urls: string[] = [];

    // Only look inside attachment/embed sub-sections, not message links
    const sections = [
      ...this.extractSections(block, 'chatlog__attachment'),
      ...this.extractSections(block, 'chatlog__embed'),
    ];

    const hrefRe = /href="(https?:\/\/[^"]+)"/g;
    for (const section of sections) {
      let m: RegExpExecArray | null;
      while ((m = hrefRe.exec(section)) !== null) {
        urls.push(m[1]);
      }
    }

    return urls;
  }

  private extractSections(html: string, className: string): string[] {
    const results: string[] = [];
    const openRe = new RegExp(
      `<div[^>]+class="[^"]*${className}[^"]*"[^>]*>`,
      'g',
    );
    let m: RegExpExecArray | null;

    while ((m = openRe.exec(html)) !== null) {
      // Grab everything up to the next div at same depth — simple slice
      const start = m.index;
      const end = html.indexOf('</div>', start + m[0].length) + 6;
      results.push(html.slice(start, Math.max(end, start)));
    }

    return results;
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  private stripHtml(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
  }

  private decodeEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }
}
