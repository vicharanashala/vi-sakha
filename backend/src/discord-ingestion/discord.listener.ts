import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DiscordService } from './discord.service';
import { McpService } from '../mcp/mcp.service';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Connects to Discord and dispatches events to DiscordService.
 *
 * discord.js is loaded dynamically so the rest of the app compiles and boots
 * even if the package hasn't been installed yet.  Install it with:
 *   npm install discord.js
 *
 * Required env var: DISCORD_BOT_TOKEN
 *
 * On ready: scans ALL existing guild channels + threads so tickets that existed
 * before this bot started are tracked immediately.
 *
 * ── NEW Thread-based ticketing ──────────────────────────────────────────────
 * The Discord helpdesk now creates THREADS inside the #support-ticket channel.
 * Thread names follow: category-name-XXXXXX  (e.g. query-pallavi_singh2-100060)
 * The ticket number is the trailing numeric segment (e.g. 100060).
 *
 * The old channel-based format (ticket-XXXX) is also kept for backward compat.
 *
 * Transcripts are posted to #ticket-transcript as HTML + embed by Help Tool.
 */
@Injectable()
export class DiscordListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscordListenerService.name);
  private client: any | null = null;

  /** Channel name of the parent text channel containing ticket threads */
  private readonly SUPPORT_CHANNEL_NAME = 'support-ticket';
  /** Channel name where closed-ticket transcripts are posted */
  private readonly TRANSCRIPT_CHANNEL_NAME = 'ticket-transcript';

  constructor(
    private readonly configService: ConfigService,
    private readonly discordService: DiscordService,
    @Inject(forwardRef(() => McpService)) private readonly mcpService: McpService,
  ) {}

  async onModuleInit(): Promise<void> {
    const token = this.configService.get<string>('DISCORD_BOT_TOKEN');

    if (!token) {
      this.logger.warn(
        'DISCORD_BOT_TOKEN not set — Discord listener is DISABLED',
      );
      return;
    }

    let discord: any;
    try {
      discord = await import('discord.js');
    } catch {
      this.logger.error(
        'discord.js is not installed. Run: npm install discord.js',
      );
      return;
    }

    const { Client, Events, GatewayIntentBits, ChannelType } = discord as {
      Client: new (opts: any) => any;
      Events: Record<string, string>;
      GatewayIntentBits: Record<string, number>;
      ChannelType: Record<string, number>;
    };

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.client.on(Events.ClientReady, (c: any) => {
      this.logger.log(`Discord bot ready: ${String(c.user?.tag)}`);
      this.safeHandle('StartupScan', () => this.scanExistingChannels(c));
    });

    // Legacy: channel-based tickets (ticket-XXXX)
    this.client.on(Events.ChannelCreate, (channel: any) => {
      this.safeHandle('ChannelCreate', () => this.handleChannelCreate(channel));
    });

    // New: thread-based tickets (threads inside #support-ticket)
    this.client.on(Events.ThreadCreate, (thread: any) => {
      this.safeHandle('ThreadCreate', () => this.handleThreadCreate(thread));
    });

    this.client.on(Events.MessageCreate, (message: any) => {
      this.safeHandle('MessageCreate', () => this.handleMessageCreate(message));
    });

    await this.client.login(token);
    this.logger.log('Discord client logged in');
  }

  async onModuleDestroy(): Promise<void> {
    this.client?.destroy();
    this.logger.log('Discord client destroyed');
  }

  // ── Startup scan ─────────────────────────────────────────────────────────

  /**
   * Iterate every text channel in every guild the bot has joined.
   * Scans both legacy ticket-XXXX channels AND threads inside #support-ticket.
   */
  private async scanExistingChannels(readyClient: any): Promise<void> {
    this.logger.log('Scanning existing Discord channels + threads for open tickets…');
    let found = 0;

    for (const guild of readyClient.guilds.cache.values() as any) {
      let channels: any;
      try {
        channels = await guild.channels.fetch();
      } catch (err: unknown) {
        this.logger.warn(
          `Could not fetch channels for guild ${String(guild.name)}: ${(err as Error).message}`,
        );
        continue;
      }

      for (const channel of channels.values() as any) {
        if (!channel) continue;
        const name: string = channel.name ?? '';

        // ── Legacy: ticket-XXXX channels ─────────────────────────────
        if (name.startsWith('ticket-')) {
          const ticketNumber = this.extractTicketNumber(name);
          if (!ticketNumber) continue;

          try {
            await this.discordService.onTicketChannelCreate(
              ticketNumber,
              String(channel.id),
            );
            found++;
          } catch (err: unknown) {
            this.logger.warn(
              `Failed to register legacy ticket #${ticketNumber}: ${(err as Error).message}`,
            );
          }
          continue;
        }

        // ── New: #support-ticket channel → scan its threads ──────────
        if (name === this.SUPPORT_CHANNEL_NAME) {
          found += await this.scanThreadsInChannel(channel);
        }
      }
    }

    this.logger.log(`Startup scan complete — registered ${found} ticket(s)`);
  }

  /**
   * Scan active + archived threads inside a parent channel.
   */
  private async scanThreadsInChannel(parentChannel: any): Promise<number> {
    let found = 0;

    try {
      // Fetch active threads
      const activeThreads = await parentChannel.threads?.fetchActive?.();
      if (activeThreads?.threads) {
        for (const thread of activeThreads.threads.values()) {
          const ticketNumber = this.extractTicketNumberFromThread(thread.name);
          if (!ticketNumber) continue;

          await this.discordService.onTicketChannelCreate(
            ticketNumber,
            String(thread.id),
            thread.name,
          );
          found++;
        }
      }

      // Fetch archived threads (recent batch)
      const archivedThreads = await parentChannel.threads?.fetchArchived?.({ limit: 100 });
      if (archivedThreads?.threads) {
        for (const thread of archivedThreads.threads.values()) {
          const ticketNumber = this.extractTicketNumberFromThread(thread.name);
          if (!ticketNumber) continue;

          await this.discordService.onTicketChannelCreate(
            ticketNumber,
            String(thread.id),
            thread.name,
          );
          found++;
        }
      }
    } catch (err: unknown) {
      this.logger.warn(
        `Failed to scan threads in #${parentChannel.name}: ${(err as Error).message}`,
      );
    }

    return found;
  }

  // ── Event handlers ─────────────────────────────────────────────────────────

  /** Legacy: channel-based ticket creation (ticket-XXXX) */
  private async handleChannelCreate(channel: any): Promise<void> {
    const name: string = channel?.name ?? '';
    if (!name.startsWith('ticket-')) return;

    const ticketNumber = this.extractTicketNumber(name);
    if (!ticketNumber) return;

    this.logger.log(`New ticket channel: ${name} → ticket #${ticketNumber}`);
    await this.discordService.onTicketChannelCreate(
      ticketNumber,
      String(channel.id),
    );
  }

  /** New: thread-based ticket creation inside #support-ticket */
  private async handleThreadCreate(thread: any): Promise<void> {
    const parentName: string = thread.parent?.name ?? '';

    // Only handle threads in the support-ticket channel
    if (parentName !== this.SUPPORT_CHANNEL_NAME) return;

    const threadName: string = thread.name ?? '';
    const ticketNumber = this.extractTicketNumberFromThread(threadName);
    if (!ticketNumber) return;

    this.logger.log(`New ticket thread: ${threadName} → ticket #${ticketNumber}`);

    // Auto-join the thread so the bot can receive messages from it
    try {
      if (thread.joinable) await thread.join();
    } catch {
      this.logger.warn(`Could not join thread ${threadName}`);
    }

    await this.discordService.onTicketChannelCreate(
      ticketNumber,
      String(thread.id),
      threadName,
    );
  }

  private async handleMessageCreate(message: any): Promise<void> {
    const content: string = message.content ?? '';
    const channelName: string = message.channel?.name ?? '';
    const parentName: string = message.channel?.parent?.name ?? '';

    // ── !ping ───────────────────────────────────────────────────────────────
    if (content.toLowerCase() === '!ping' && !message.author?.bot) {
      const latency: number = this.client?.ws?.ping ?? -1;
      await message.reply(`🏓 Pong! Latency: ${latency}ms`);
      return;
    }

    // ── !help ───────────────────────────────────────────────────────────────
    if (content.toLowerCase() === '!help' && !message.author?.bot) {
      await message.reply(
        '**Vi-Sakha — VInternship Support Bot**\n\n' +
        '`!ask <question>` — Ask anything about the VInternship program\n' +
        '`!help` — Show this help message\n' +
        '`!ping` — Check bot latency\n\n' +
        '**What I can help with:**\n' +
        '• ViBe platform, courses, and deadlines\n' +
        '• Health Points (HP) system\n' +
        '• Case study submissions\n' +
        '• Attendance and participation requirements\n' +
        '• Certificate and completion criteria\n' +
        '• Technical issues with the platform\n\n' +
        '_For urgent issues, raise a support ticket in this server._',
      );
      return;
    }

    // ── !ask command — works in any channel ────────────────────────────────
    if (content.toLowerCase().startsWith('!ask') && !message.author?.bot) {
      const question = content.slice(4).trim();
      if (!question) {
        await message.reply('Usage: `!ask <your question>`');
        return;
      }

      this.logger.log(`[!ask] "${question}" from ${String(message.author?.username)}`);
      await message.channel?.sendTyping?.();

      const result = await this.mcpService.processQuery({ query: question });

      const confidence = Math.round((result.confidence ?? 0) * 100);
      const statusTag =
        result.status === 'answered'
          ? `✅ Confidence: ${confidence}%`
          : result.status === 'escalated'
            ? `⚠️ Low confidence (${confidence}%) — consider raising a support ticket`
            : `❌ Error`;

      await message.reply(`${result.answer}\n\n${statusTag}`);
      return;
    }

    // ── Transcript upload in #ticket-transcript ──────────────────────────────
    if (
      channelName === this.TRANSCRIPT_CHANNEL_NAME ||
      channelName === 'ticket-transcripts'
    ) {
      await this.handleTranscriptMessage(message);
      return;
    }

    // ── Live ticket message (thread OR legacy channel) ──────────────────────
    // Match EITHER:
    //   1. New: thread inside #support-ticket
    //   2. Legacy: channel starting with "ticket-"
    let ticketNumber: string | null = null;

    if (parentName === this.SUPPORT_CHANNEL_NAME) {
      // Thread-based ticket
      ticketNumber = this.extractTicketNumberFromThread(channelName);
    } else if (channelName.startsWith('ticket-')) {
      // Legacy channel-based ticket
      ticketNumber = this.extractTicketNumber(channelName);
    }

    if (!ticketNumber) return;

    const memberRoles: string[] = [];
    if (message.member?.roles?.cache) {
      for (const role of (message.member.roles.cache as Map<string, any>).values()) {
        memberRoles.push(String(role.name));
      }
    }

    const rawAttachments: Array<{ url: string; name: string }> = [];
    if (message.attachments) {
      for (const a of (message.attachments as Map<string, any>).values()) {
        rawAttachments.push({ url: String(a.url), name: String(a.name ?? '') });
      }
    }

    const rawEmbeds: Array<{ description?: string; title?: string; fields?: Array<{ name: string; value: string; inline?: boolean }> }> = (
      (message.embeds as any[]) ?? []
    ).map((e: any) => {
      let description = typeof e.description === 'string' ? e.description : undefined;

      // Resolve Discord user mentions (<@USER_ID>) to real usernames
      // e.g. "<@123456789> has claimed this ticket!" → "jinalgupta has claimed this ticket!"
      if (description && message.mentions?.users) {
        for (const [userId, mentionedUser] of (message.mentions.users as Map<string, any>).entries()) {
          const mentionPatterns = [`<@!${userId}>`, `<@${userId}>`];
          for (const pattern of mentionPatterns) {
            if (description.includes(pattern)) {
              description = description.replace(pattern, String(mentionedUser.username ?? ''));
            }
          }
        }
      }

      return {
        description,
        title: typeof e.title === 'string' ? e.title : undefined,
        fields: Array.isArray(e.fields)
          ? e.fields.map((f: any) => ({
              name: String(f.name ?? ''),
              value: String(f.value ?? ''),
              inline: Boolean(f.inline),
            }))
          : undefined,
      };
    });

    await this.discordService.onLiveMessage(
      ticketNumber,
      String(message.channel?.id ?? ''),
      {
        id: String(message.id),
        content: String(message.content ?? ''),
        author: {
          id: String(message.author?.id ?? ''),
          username: String(message.author?.username ?? 'Unknown'),
          bot: Boolean(message.author?.bot),
          roles: memberRoles,
        },
        embeds: rawEmbeds,
        attachments: rawAttachments,
        createdAt: (message.createdAt as Date) ?? new Date(),
      },
      channelName,
    );
  }

  // ── Transcript handling ─────────────────────────────────────────────────────

  /**
   * Handle messages in #ticket-transcript.
   * The Help Tool posts:
   *   1. An embed with ticket metadata (Ticket ID, Opened By, etc.)
   *   2. A JSON file attachment
   *   3. An HTML transcript file attachment (sometimes in same message, sometimes separate)
   *
   * We process: embed metadata, HTML file attachments, AND
   * the "View Visual Transcript" link in the embed or button components.
   */
  private async handleTranscriptMessage(message: any): Promise<void> {
    // ── Extract metadata from embeds ─────────────────────────────────────
    const embeds = (message.embeds as any[]) ?? [];
    let embedMeta: Record<string, string> | null = null;
    let transcriptUrl: string | null = null;

    for (const embed of embeds) {
      const title: string = embed.title ?? embed.data?.title ?? '';
      // The Help Tool embed title looks like "🔒 Ticket Closed: category-name-XXXXXX"
      if (title.includes('Ticket Closed') || title.includes('ticket closed')) {
        embedMeta = this.parseEmbedFields(embed);
        const threadNameMatch = title.match(/:\s*(.+)/);
        if (threadNameMatch) {
          embedMeta['threadName'] = threadNameMatch[1].trim();
        }

        // Check embed.url — the "View Visual Transcript" link
        const embedUrl: string = embed.url ?? embed.data?.url ?? '';
        if (embedUrl && embedUrl.startsWith('http')) {
          transcriptUrl = embedUrl;
          this.logger.log(`Found transcript URL in embed: ${transcriptUrl}`);
        }
      }
    }

    // ── Check message components (buttons) for the transcript URL ────────
    if (!transcriptUrl && message.components) {
      for (const row of message.components) {
        const comps = row.components ?? row.data?.components ?? [];
        for (const comp of comps) {
          // Link-style buttons have a url property
          const url: string = comp.url ?? comp.data?.url ?? '';
          if (url && url.startsWith('http')) {
            // Check if this looks like a transcript link
            const label: string = (comp.label ?? comp.data?.label ?? '').toLowerCase();
            if (label.includes('transcript') || label.includes('visual') || url.includes('transcript')) {
              transcriptUrl = url;
              this.logger.log(`Found transcript URL in button: ${transcriptUrl}`);
            }
          }
        }
      }
    }

    // ── Process file attachments (HTML or JSON) ──────────────────────────────
    let fileProcessed = false;
    const attachments: Map<string, any> = message.attachments ?? new Map();
    for (const attachment of attachments.values()) {
      const name: string = attachment.name ?? '';
      if (name.endsWith('.html') || name.endsWith('.json')) {
        let ticketNumber = this.extractTicketNumberFromFilename(name);
        if (!ticketNumber && embedMeta?.threadName) {
          ticketNumber = this.extractTicketNumberFromThread(embedMeta.threadName);
        }

        if (ticketNumber) {
          const fileType = name.endsWith('.json') ? 'json' : 'html';
          this.logger.log(`Transcript ${fileType.toUpperCase()} file for ticket #${ticketNumber}: ${name}`);
          await this.discordService.onTranscriptUploaded(
            ticketNumber,
            String(attachment.url),
            embedMeta ?? undefined,
            fileType,
          );
          fileProcessed = true;
        }
      }
    }

    // ── If no file was uploaded, try the embed/button transcript URL ─
    if (!fileProcessed && transcriptUrl && embedMeta) {
      const threadName = embedMeta['threadName'] ?? '';
      const ticketNumber = this.extractTicketNumberFromThread(threadName)
        || this.extractTicketNumberFromFilename(threadName);

      if (ticketNumber) {
        this.logger.log(
          `Processing transcript from embed URL for ticket #${ticketNumber}`,
        );
        // The URL in the embed is usually an HTML viewer URL
        await this.discordService.onTranscriptUploaded(
          ticketNumber,
          transcriptUrl,
          embedMeta,
          'html',
        );
        fileProcessed = true;
      }
    }

    // ── Fallback: if we found embed metadata but couldn't get any file, ──
    //    still mark the ticket as closed so the UI updates.
    if (!fileProcessed && embedMeta) {
      const threadName = embedMeta['threadName'] ?? '';
      const ticketNumber = this.extractTicketNumberFromThread(threadName)
        || this.extractTicketNumberFromFilename(threadName);

      if (ticketNumber) {
        this.logger.log(
          `Ticket closure detected from embed (no file available): ticket #${ticketNumber}`,
        );
        await this.discordService.onTicketClosed(ticketNumber, embedMeta);
      }
    }
  }

  /**
   * Parse the structured fields from the Help Tool's closure embed.
   * Fields are in embed.fields[] with name/value pairs.
   */
  private parseEmbedFields(embed: any): Record<string, string> {
    const result: Record<string, string> = {};

    // Try embed.fields (discord.js v14 format)
    const fields = embed.fields ?? embed.data?.fields ?? [];
    for (const field of fields) {
      const fieldName: string = (field.name ?? '').trim();
      const fieldValue: string = (field.value ?? '').trim();
      if (fieldName && fieldValue) {
        result[fieldName] = fieldValue;
      }
    }

    // Also try description (some embeds put all info in description text)
    const description: string = embed.description ?? embed.data?.description ?? '';
    if (description) {
      result['description'] = description;
    }

    return result;
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  /**
   * Legacy: Extract ticket number from a channel name like "ticket-0435".
   * Strips leading zeros: "ticket-0435" → "435".
   */
  private extractTicketNumber(channelName: string): string | null {
    const m = channelName.match(/ticket-(\d+)/);
    if (!m) return null;
    return this.normalizeTicketNumber(m[1]);
  }

  /**
   * New: Extract ticket number from a thread name.
   * Thread names follow: category-name-XXXXXX (e.g. "query-pallavi_singh2-100060")
   * The ticket number is the trailing numeric segment after the last hyphen.
   */
  private extractTicketNumberFromThread(threadName: string): string | null {
    const m = threadName.match(/-(\d+)$/);
    if (!m) return null;
    return m[1]; // No normalization needed — new IDs don't have leading zeros
  }

  /**
   * Extract ticket number from filename.
   * Handles: "transcript-closed-0457.html", "ticket-0435.html", "transcript-case-studies-coralone.-100055.json"
   * Strategy: grab the LAST run of digits in the stem.
   */
  private extractTicketNumberFromFilename(filename: string): string | null {
    const stem = filename.replace(/\.[^.]+$/, '');
    const m = stem.match(/(\d+)[^\d]*$/);
    if (!m) return null;
    return this.normalizeTicketNumber(m[1]);
  }

  /** Strip leading zeros so "0435" and "435" compare equal. */
  private normalizeTicketNumber(raw: string): string {
    const n = parseInt(raw, 10);
    return isNaN(n) ? raw : String(n);
  }

  private safeHandle(event: string, fn: () => Promise<void>): void {
    fn().catch((err: unknown) =>
      this.logger.error(
        `Error in ${event} handler: ${(err as Error).message}`,
      ),
    );
  }
}
