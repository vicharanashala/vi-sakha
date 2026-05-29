import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  Ticket,
  TicketMessageSenderRole,
  TicketScreenshot,
  TicketScreenshotSchema,
} from './ticket.schema';

export type TicketMessageDocument = TicketMessage & Document;

@Schema({ timestamps: true, collection: 'ticket_messages' })
export class TicketMessage {
    // For unread message tracking
    @Prop({ type: [String], default: [] })
    unreadByUserIds?: string[];
  @Prop({ type: Types.ObjectId, ref: Ticket.name, required: true, index: true })
  ticketId!: Types.ObjectId;

  @Prop({ required: true, enum: TicketMessageSenderRole })
  senderRole!: TicketMessageSenderRole;

  @Prop({ required: true })
  senderName!: string;

  @Prop({ required: true })
  message!: string;

  @Prop({ enum: ['text', 'meeting'], default: 'text' })
  type?: 'text' | 'meeting';

  @Prop()
  meetingLink?: string;

  @Prop({ required: true, default: Date.now })
  timestamp!: Date;

  @Prop({ type: [TicketScreenshotSchema], default: [] })
  screenshots!: TicketScreenshot[];

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const TicketMessageSchema = SchemaFactory.createForClass(TicketMessage);

TicketMessageSchema.index({ ticketId: 1, createdAt: -1 });
