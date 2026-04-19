import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { EmailJobData } from './email.service';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    super();
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('GMAIL_USER'),
        pass: this.configService.get<string>('GMAIL_PASS'),
      },
    });
  }

  async process(job: Job<EmailJobData, any, string>): Promise<any> {
    this.logger.log(`Processing email job ${job.id} to ${job.data.to}`);
    
    try {
      const info = await this.transporter.sendMail({
        from: `"Vi-Sakha Notifications" <${this.configService.get<string>('GMAIL_USER')}>`,
        to: job.data.to,
        subject: job.data.subject,
        text: job.data.text,
        html: job.data.html,
      });
      
      this.logger.log(`Email sent: ${info.messageId}`);
      return info;
    } catch (error: any) {
      this.logger.error(`Failed to send email: ${error?.message || 'Unknown error'}`);
      throw error; // Let BullMQ handle retries
    }
  }
}
