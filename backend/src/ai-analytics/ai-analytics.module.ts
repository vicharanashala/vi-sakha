import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AiAnalyticsController } from './ai-analytics.controller';
import { InsightEngineService } from './insight-engine/insight-engine.service';
import { NLQService } from './nlq/nlq.service';
import { ContributionAnalyzer } from './insight-engine/contribution-analyzer';
import { Feedback, FeedbackSchema } from '../feedback/schemas/feedback.schema';
import { Conversation, ConversationSchema } from '../chat/schemas/conversation.schema';
import { Ticket, TicketSchema } from '../tickets/schemas/ticket.schema';
import { Message, MessageSchema } from '../chat/schemas/message.schema';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    MongooseModule.forFeature([
      { name: Feedback.name, schema: FeedbackSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: Ticket.name, schema: TicketSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
  ],
  controllers: [AiAnalyticsController],
  providers: [
    InsightEngineService,
    NLQService,
    ContributionAnalyzer,
  ],
  exports: [InsightEngineService, NLQService],
})
export class AiAnalyticsModule {}
