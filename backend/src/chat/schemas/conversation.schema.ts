import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

export enum ConversationStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
}

@Schema({ timestamps: true, collection: 'conversations' })
export class Conversation {
  @Prop({ required: true })
  studentId!: string;

  @Prop({ required: true })
  studentName!: string;

  @Prop()
  studentEmail?: string;

  @Prop()
  cohort?: string;

  @Prop({ required: true, enum: ConversationStatus, default: ConversationStatus.ACTIVE })
  status!: ConversationStatus;

  @Prop({ default: 0 })
  messageCount!: number;

  @Prop({ default: 0 })
  likeCount!: number;

  @Prop({ default: 0 })
  dislikeCount!: number;

  @Prop()
  lastMessageAt?: Date;

  @Prop()
  lastMessagePreview?: string;

  @Prop()
  averageConfidence?: number;

  @Prop()
  resolvedAt?: Date;

  @Prop()
  escalatedAt?: Date;

  @Prop()
  escalationReason?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Indexes
ConversationSchema.index({ studentId: 1 });
ConversationSchema.index({ status: 1 });
ConversationSchema.index({ createdAt: -1 });
ConversationSchema.index({ lastMessageAt: -1 });
