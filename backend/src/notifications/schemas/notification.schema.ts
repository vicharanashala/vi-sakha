import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  TICKET_REPLY = 'ticket_reply',
  TICKET_CLAIMED = 'ticket_claimed',
  NEW_TICKET = 'new_ticket',
}

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ required: true, type: String })
  recipientId!: string; // userId from our users collection

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  message!: string;

  @Prop({ required: true, enum: Object.values(NotificationType) })
  type!: NotificationType;

  @Prop({ default: false })
  isRead!: boolean;

  @Prop({ type: Object })
  metadata?: {
    ticketNumber?: string;
    senderName?: string;
    [key: string]: any;
  };

  @Prop()
  link?: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ recipientId: 1, isRead: 1 });
NotificationSchema.index({ createdAt: -1 });
