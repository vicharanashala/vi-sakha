import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DiscordMessage, DiscordMessageSchema } from './discord-message.schema';

export type DiscordConversationDocument = DiscordConversation & Document;

@Schema({ collection: 'discord_conversations', timestamps: true })
export class DiscordConversation {
  @Prop({ required: true, unique: true, index: true })
  ticketNumber!: string;

  @Prop({ required: true })
  discordChannelId!: string;

  @Prop({ required: true, enum: ['open', 'closed'], default: 'open' })
  status!: 'open' | 'closed';

  @Prop({
    required: true,
    enum: ['discord_live', 'discord_transcript'],
    default: 'discord_live',
  })
  source!: 'discord_live' | 'discord_transcript';

  @Prop({ type: [DiscordMessageSchema], default: [] })
  messages!: DiscordMessage[];

  @Prop({ default: false })
  transcriptProcessed!: boolean;

  /** Discord user ID of the student who opened the ticket. Set from the first
   *  role='user' message so the frontend can align bubbles correctly. */
  @Prop()
  ticketOwnerId?: string;

  /** Display name of the ticket owner (for transcript fallback). */
  @Prop()
  ticketOwnerName?: string;

  /** Original thread name (e.g., "query-pallavi_singh2-100060") */
  @Prop()
  threadName?: string;

  /** Ticket metadata from the Help Tool embed */
  @Prop()
  mainReason?: string;

  @Prop()
  additionalDetails?: string;

  @Prop()
  registeredEmail?: string;

  @Prop()
  cohortName?: string;

  @Prop()
  openedBy?: string;

  @Prop()
  closedBy?: string;

  /** userId of the lab member/mentor who claimed this ticket */
  @Prop()
  claimedBy?: string;

  /** Display name of the claimer */
  @Prop()
  claimedByName?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const DiscordConversationSchema =
  SchemaFactory.createForClass(DiscordConversation);

DiscordConversationSchema.index({ discordChannelId: 1 });
DiscordConversationSchema.index({ status: 1 });
DiscordConversationSchema.index({ createdAt: -1 });
