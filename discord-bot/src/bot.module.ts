import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';

import { DiscordListenerService } from './events/discord.listener';
import { DiscordService } from './services/discord.service';
import { DiscordConversationService } from './services/conversation.service';
import { MessageNormalizerService } from './utils/message.normalizer';
import { TranscriptParserService } from './utils/transcript.parser';
import { DiscordRagService } from './services/rag.service';
import { BackendApiService } from './services/backend-api.service';

import { 
  DiscordConversation, 
  DiscordConversationSchema 
} from './schemas/discord-conversation.schema';
import {
  QaProposal,
  QaProposalSchema,
} from './schemas/qa-proposal.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.bot', '../.env.bot', '.env', '../.env'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: DiscordConversation.name, schema: DiscordConversationSchema },
      { name: QaProposal.name, schema: QaProposalSchema },
    ]),
    HttpModule,
  ],
  providers: [
    DiscordListenerService,
    DiscordService,
    DiscordConversationService,
    MessageNormalizerService,
    TranscriptParserService,
    DiscordRagService,
    BackendApiService,
  ],
})
export class BotModule {}
