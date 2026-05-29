import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DiscordConversation,
  DiscordConversationDocument,
} from './schemas/discord-conversation.schema';
import { DiscordMessage } from './schemas/discord-message.schema';

@Injectable()
export class DiscordConversationService {
  private readonly logger = new Logger(DiscordConversationService.name);

  constructor(
    @InjectModel(DiscordConversation.name)
    private readonly model: Model<DiscordConversationDocument>,
  ) {}

  // ── Write operations ───────────────────────────────────────────────────────

  async createConversation(
    ticketNumber: string,
    discordChannelId: string,
  ): Promise<DiscordConversationDocument> {
    this.logger.log(`Creating conversation for ticket #${ticketNumber}`);
    return this.model.create({
      ticketNumber,
      discordChannelId,
      status: 'open',
      source: 'discord_live',
      messages: [],
      transcriptProcessed: false,
    });
  }

  /**
   * Append a single live message to an existing conversation.
   * Identified by ticketNumber — NOT channelId.
   */
  async addMessage(
    ticketNumber: string,
    message: Omit<DiscordMessage, never>,
  ): Promise<DiscordConversationDocument | null> {
    return this.model.findOneAndUpdate(
      { ticketNumber },
      { $push: { messages: message } },
      { new: true },
    );
  }

  /**
   * Transcript is the source of truth: atomically overwrite ALL messages and
   * mark the conversation closed in a single findOneAndUpdate.
   *
   * Uses upsert so that if no live conversation existed (transcript-only upload)
   * a new document is created ALREADY in the closed state — never briefly open.
   */
  async replaceMessages(
    ticketNumber: string,
    messages: Omit<DiscordMessage, never>[],
    discordChannelId = 'transcript-only',
  ): Promise<DiscordConversationDocument> {
    const existing = await this.model.findOne({ ticketNumber }).select('messages');
    let finalMessages = [...messages];

    // Preserve the initial Help Tool embed message (ticket_reason) so the frontend displays the metadata card
    if (existing?.messages?.length) {
      const ticketReasonMsg = existing.messages.find(m => m.type === 'ticket_reason');
      if (ticketReasonMsg) {
        // Only prepend if the transcript parser hasn't already extracted a ticket_reason
        const hasReason = finalMessages.some(m => m.type === 'ticket_reason');
        if (!hasReason) {
          finalMessages = [ticketReasonMsg, ...finalMessages];
        }
      }
    }

    const doc = await this.model.findOneAndUpdate(
      { ticketNumber },
      {
        $set: {
          messages: finalMessages,
          source: 'discord_transcript',
          status: 'closed',
          transcriptProcessed: true,
        },
        // $setOnInsert only runs when a new document is created (upsert)
        $setOnInsert: {
          discordChannelId,
        },
      },
      { new: true, upsert: true },
    );
    return doc as DiscordConversationDocument;
  }

  /**
   * Record the lab member who claimed this ticket.
   */
  async setClaimer(
    ticketNumber: string,
    claimedBy: string,
    claimedByName: string,
  ): Promise<void> {
    await this.model.updateOne(
      { ticketNumber },
      { $set: { claimedBy, claimedByName } },
    );
  }

  /**
   * Record the ticket owner from the first student message.
   * Uses a conditional update so subsequent messages never overwrite it.
   */
  async setTicketOwner(
    ticketNumber: string,
    ownerId: string,
    ownerName: string,
  ): Promise<void> {
    await this.model.updateOne(
      { ticketNumber, ticketOwnerId: { $exists: false } },
      { $set: { ticketOwnerId: ownerId, ticketOwnerName: ownerName } },
    );
  }

  /**
   * Update arbitrary metadata fields on a conversation.
   * Used to enrich with embed data (threadName, mainReason, cohortName, etc.)
   */
  async updateMetadata(
    ticketNumber: string,
    fields: Record<string, string>,
  ): Promise<void> {
    if (Object.keys(fields).length === 0) return;
    await this.model.updateOne(
      { ticketNumber },
      { $set: fields },
    );
  }

  async markClosed(
    ticketNumber: string,
  ): Promise<DiscordConversationDocument | null> {
    return this.model.findOneAndUpdate(
      { ticketNumber },
      { $set: { status: 'closed' } },
      { new: true },
    );
  }

  // ── Read operations ────────────────────────────────────────────────────────

  async findById(id: string): Promise<DiscordConversationDocument | null> {
    return this.model.findById(id);
  }

  async findByTicketNumber(
    ticketNumber: string,
  ): Promise<DiscordConversationDocument | null> {
    return this.model.findOne({ ticketNumber });
  }

  async findByChannelId(
    channelId: string,
  ): Promise<DiscordConversationDocument | null> {
    return this.model.findOne({ discordChannelId: channelId });
  }

  /**
   * Lightweight check used for deduplication before processing a transcript.
   */
  async isTranscriptProcessed(ticketNumber: string): Promise<boolean> {
    const doc = await this.model.findOne(
      { ticketNumber },
      { transcriptProcessed: 1 },
    );
    return doc?.transcriptProcessed ?? false;
  }

  async findAll(limit = 100): Promise<DiscordConversationDocument[]> {
    return this.model.find().sort({ createdAt: -1 }).limit(limit);
  }

  async findByStatus(
    status: 'open' | 'closed',
    limit = 100,
  ): Promise<DiscordConversationDocument[]> {
    return this.model.find({ status }).sort({ createdAt: -1 }).limit(limit);
  }

  /** Accurate counts — does NOT use findByStatus (avoids the limit cap). */
  async count(): Promise<number> {
    return this.model.countDocuments();
  }

  async countByStatus(status: 'open' | 'closed'): Promise<number> {
    return this.model.countDocuments({ status });
  }

  async countMessagesByStatus(status: 'open' | 'closed'): Promise<number> {
    const result = await this.model.aggregate([
      { $match: { status } },
      { $project: { messageCount: { $size: { $ifNull: ['$messages', []] } } } },
      { $group: { _id: null, total: { $sum: '$messageCount' } } },
    ]);
    return result[0]?.total ?? 0;
  }
}
