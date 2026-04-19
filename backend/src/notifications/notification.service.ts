import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument, NotificationType } from './schemas/notification.schema';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    private readonly gateway: NotificationGateway,
  ) {}

  async create(data: Partial<Notification>): Promise<NotificationDocument> {
    const notification = await this.notificationModel.create(data);
    
    // Emit real-time notification to the user
    this.gateway.notifyUser(data.recipientId!, notification);
    
    return notification;
  }

  async findByUser(userId: string, limit = 20) {
    return this.notificationModel
      .find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({ recipientId: userId, isRead: false });
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.notificationModel.updateOne(
      { _id: notificationId, recipientId: userId },
      { $set: { isRead: true } },
    );
    
    // Update frontend unread count
    const count = await this.getUnreadCount(userId);
    this.gateway.updateUnreadCount(userId, count);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { recipientId: userId, isRead: false },
      { $set: { isRead: true } },
    );
    
    this.gateway.updateUnreadCount(userId, 0);
  }

  /**
   * Complex logic to notify users based on ticket events
   */
  async notifyTicketEvent(
    type: NotificationType,
    recipientId: string,
    title: string,
    message: string,
    metadata: any,
  ) {
    await this.create({
      recipientId,
      title,
      message,
      type,
      metadata,
      link: `/dashboard/tickets/${metadata.ticketNumber}`,
    });
  }
}
