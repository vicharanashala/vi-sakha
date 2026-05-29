import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { Feedback, FeedbackSchema } from './schemas/feedback.schema';
import { Ticket, TicketSchema } from '../../rag/tickets/schemas/ticket.schema';
import { Conversation, ConversationSchema } from '../../rag/chat/schemas/conversation.schema';
import { Message, MessageSchema } from '../../rag/chat/schemas/message.schema';
import { QaProposal, QaProposalSchema } from '../../rag/qa-proposals/schemas/qa-proposal.schema';
import { QaPair, QaPairSchema } from '../../rag/qa-pairs/schemas/qa-pair.schema';
import { DiscordConversation, DiscordConversationSchema } from '../../discord/schemas/discord-conversation.schema';
import { QaProposalsModule } from '../../rag/qa-proposals/qa-proposals.module';
import { QaPairsModule } from '../../rag/qa-pairs/qa-pairs.module';
import { UsersModule } from '../../users/users.module';


@Module({
  imports: [
    HttpModule,
    ConfigModule,
    QaProposalsModule,
    QaPairsModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: Feedback.name, schema: FeedbackSchema },
      { name: Ticket.name, schema: TicketSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: DiscordConversation.name, schema: DiscordConversationSchema },
    ]),
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule { }
