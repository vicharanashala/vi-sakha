import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TicketsController } from './tickets.controller';
import { TicketsGateway } from './tickets.gateway';
import { TicketsService } from './tickets.service';
import { TicketMessage, TicketMessageSchema } from './schemas/ticket-message.schema';
import { Ticket, TicketSchema } from './schemas/ticket.schema';
import { GoogleCalendarService } from './google-calendar.service';
import { UsersModule } from '../../users/users.module';
import { NotificationModule } from '../../notifications/notification.module';
import { EmailModule } from '../../email/email.module';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    NotificationModule,
    EmailModule,
    MongooseModule.forFeature([
      { name: Ticket.name, schema: TicketSchema },
      { name: TicketMessage.name, schema: TicketMessageSchema },
    ]),
  ],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsGateway, GoogleCalendarService],
  exports: [TicketsService],
})
export class TicketsModule { }
