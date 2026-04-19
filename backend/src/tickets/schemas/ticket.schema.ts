import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TicketDocument = Ticket & Document;

export enum TicketStatus {
  OPEN = 'open',
  RESOLVED = 'resolved',
}

export enum TicketMessageSenderRole {
  STUDENT = 'student',
  INSTRUCTOR = 'instructor',
}

@Schema({ _id: false })
export class TicketScreenshot {
  @Prop({ required: true })
  fileName!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true })
  dataUrl!: string;
}

export const TicketScreenshotSchema = SchemaFactory.createForClass(TicketScreenshot);

@Schema({ timestamps: true, collection: 'tickets' })
export class Ticket {
  @Prop({ required: true, unique: true })
  ticketNumber!: string;

  // --- User references (authoritative) ---
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  assignedTo?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedBy?: Types.ObjectId;

  // --- Display fields (kept for backward compat) ---
  @Prop({ required: true })
  studentId!: string;

  @Prop({ required: true })
  studentName!: string;

  @Prop()
  studentEmail?: string;

  @Prop()
  cohort?: string;

  @Prop({ required: true })
  subject!: string;

  @Prop({ required: true })
  reason!: string;

  @Prop({ type: [TicketScreenshotSchema], default: [] })
  screenshots!: TicketScreenshot[];

  @Prop()
  conversationId?: string;

  @Prop()
  messageId?: string;

  @Prop()
  originalQuery?: string;

  @Prop()
  botResponse?: string;

  @Prop({ required: true, enum: TicketStatus, default: TicketStatus.OPEN })
  status!: TicketStatus;

  @Prop()
  assignedInstructor?: string;

  @Prop({ type: [String], default: [] })
  instructors!: string[];

  @Prop()
  resolvedBy?: string;

  @Prop()
  resolutionNote?: string;

  @Prop()
  resolvedAt?: Date;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);

TicketSchema.index({ createdBy: 1, createdAt: -1 });
TicketSchema.index({ studentId: 1, createdAt: -1 });
TicketSchema.index({ assignedTo: 1, createdAt: -1 });
TicketSchema.index({ status: 1, createdAt: -1 });
TicketSchema.index({ ticketNumber: 1 }, { unique: true });
