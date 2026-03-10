import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EmbeddingDocument = Embedding & Document;

@Schema({ timestamps: true, collection: 'embeddings' })
export class Embedding {
  @Prop({ required: true })
  qa_pair_id!: string;

  @Prop({ required: true, type: [Number] })
  embedding!: number[];

  @Prop()
  question!: string;

  @Prop({ default: 'unknown' })
  source!: string;

  @Prop()
  dimensions!: number;

  @Prop()
  createdAt?: Date;
}

export const EmbeddingSchema = SchemaFactory.createForClass(Embedding);

// Indexes
EmbeddingSchema.index({ qa_pair_id: 1 });
EmbeddingSchema.index({ source: 1 });
