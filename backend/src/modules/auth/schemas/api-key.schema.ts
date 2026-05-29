import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ApiKeyDocument = ApiKey & Document;

@Schema({ timestamps: true })
export class ApiKey {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true })
  keyHash!: string;

  @Prop({ required: true })
  encryptedKey!: string;

  @Prop({ required: true })
  iv!: string;

  @Prop({ required: true })
  last4!: string;

  @Prop({ 
    type: Date, 
    required: true, 
    index: { expires: 0 } // TTL Index: matches the Date exactly, MongoDB background task deletes it eventually
  })
  expiresAt!: Date;

  @Prop({ default: true })
  isActive!: boolean;
}

export const ApiKeySchema = SchemaFactory.createForClass(ApiKey);

// Composite index for listing keys for a specific user
ApiKeySchema.index({ userId: 1, createdAt: -1 });
