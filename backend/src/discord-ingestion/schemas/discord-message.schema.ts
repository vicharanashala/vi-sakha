import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class DiscordMessage {
  @Prop({ required: true, enum: ['user', 'agent', 'system'] })
  role!: 'user' | 'agent' | 'system';

  @Prop({ required: true, enum: ['message', 'ticket_reason'], default: 'message' })
  type!: 'message' | 'ticket_reason';

  @Prop({ required: true, default: '' })
  text!: string;

  @Prop({ type: [String], default: [] })
  attachments!: string[];

  @Prop({ required: true })
  timestamp!: Date;

  @Prop()
  authorId?: string;

  @Prop()
  authorName?: string;
}

export const DiscordMessageSchema = SchemaFactory.createForClass(DiscordMessage);
