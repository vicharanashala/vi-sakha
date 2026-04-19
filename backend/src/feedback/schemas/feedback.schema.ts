import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FeedbackDocument = Feedback & Document;

@Schema({ timestamps: true, collection: 'feedbacks' })
export class Feedback {
  @Prop({ required: true })
  conversationId!: string;

  @Prop({ required: true })
  messageId!: string;

  @Prop({ required: true })
  topic!: string;

  @Prop({ required: true, enum: ['up', 'down'] })
  rating!: string;

  @Prop()
  createdAt?: Date;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);

// Prevent duplicate analytics feedback per message
FeedbackSchema.index({ messageId: 1 }, { unique: true });
FeedbackSchema.index({ topic: 1 });
FeedbackSchema.index({ rating: 1 });
FeedbackSchema.index({ createdAt: 1 });
