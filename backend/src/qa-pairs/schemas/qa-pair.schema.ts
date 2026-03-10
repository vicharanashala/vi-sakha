import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QaPairDocument = QaPair & Document;

@Schema({ timestamps: true, collection: 'qa_pairs' })
export class QaPair {
  @Prop({ required: true })
  question!: string;

  @Prop({ required: true })
  answer!: string;

  @Prop({ default: 'unknown' })
  source!: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const QaPairSchema = SchemaFactory.createForClass(QaPair);

// Create text index for search
QaPairSchema.index({ question: 'text', answer: 'text' });
QaPairSchema.index({ source: 1 });
