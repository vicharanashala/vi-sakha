import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface EmailJobData {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

@Injectable()
export class EmailService {
  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  async sendMail(data: EmailJobData) {
    await this.emailQueue.add('send-email', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }

  async notifyTicketReply(email: string, ticketNumber: string, senderName: string) {
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard/tickets/${ticketNumber}`;
    
    await this.sendMail({
      to: email,
      subject: `[Ticket #${ticketNumber}] New message from ${senderName}`,
      text: `Hello,\n\nYou have received a new message in ticket #${ticketNumber} from ${senderName}.\n\nView it here: ${dashboardUrl}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">New Message Received</h2>
          <p>Hello,</p>
          <p>You have received a new message in <b>Ticket #${ticketNumber}</b> from <b>${senderName}</b>.</p>
          <div style="margin: 30px 0;">
            <a href="${dashboardUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; rounded: 6px; font-weight: bold;">View Ticket</a>
          </div>
          <p style="color: #666; font-size: 12px;">This is an automated notification. Please do not reply directly to this email.</p>
        </div>
      `,
    });
  }

  async notifyNewTicket(email: string, ticketNumber: string, studentName: string) {
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard/tickets/${ticketNumber}`;
    
    await this.sendMail({
      to: email,
      subject: `[New Ticket #${ticketNumber}] Raised by ${studentName}`,
      text: `Hello,\n\nA new support ticket (#${ticketNumber}) has been raised by ${studentName}.\n\nView it here: ${dashboardUrl}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">New Ticket Raised</h2>
          <p>Hello,</p>
          <p>A new support ticket <b>#${ticketNumber}</b> has been raised by <b>${studentName}</b>.</p>
          <div style="margin: 30px 0;">
            <a href="${dashboardUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; rounded: 6px; font-weight: bold;">View Ticket</a>
          </div>
          <p style="color: #666; font-size: 12px;">This is an automated notification for instructors.</p>
        </div>
      `,
    });
  }
}
