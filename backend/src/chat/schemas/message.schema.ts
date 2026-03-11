import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export enum FeedbackType {
  LIKE = 'like',
  DISLIKE = 'dislike',
}

@Schema({ timestamps: true, collection: 'messages' })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId!: Types.ObjectId;

  @Prop({ required: true, enum: MessageRole })
  role!: MessageRole;

  @Prop({ required: true })
  content!: string;

  // For assistant messages - RAG metadata
  @Prop()
  confidence?: number;

  @Prop({ type: [String] })
  sourceQaPairIds?: string[];

  @Prop({ type: [Object] })
  sources?: Array<{
    question: string;
    answer: string;
    similarity: number;
  }>;

  // Feedback for assistant messages
  @Prop({ enum: FeedbackType })
  feedback?: FeedbackType;

  @Prop()
  feedbackAt?: Date;

  @Prop()
  feedbackComment?: string;

  // Processing metadata
  @Prop({ default: false })
  isEscalated!: boolean;

  @Prop()
  escalationReason?: string;

  @Prop()
  responseTimeMs?: number;

  @Prop()
  createdAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Indexes
MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ role: 1 });
MessageSchema.index({ feedback: 1 });
MessageSchema.index({ confidence: 1 });
