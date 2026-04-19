import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import {
  DiscordConversation,
  DiscordConversationSchema,
} from './schemas/discord-conversation.schema';
import {
  QaProposal,
  QaProposalSchema,
} from '../qa-proposals/schemas/qa-proposal.schema';

import { DiscordConversationService } from './conversation.service';
import { MessageNormalizerService } from './message.normalizer';
import { TranscriptParserService } from './transcript.parser';
import { DiscordRagService } from './rag.service';
import { DiscordListenerService } from './discord.listener';
import { DiscordGateway } from './discord.gateway';
import { DiscordService } from './discord.service';
import { DiscordController } from './discord.controller';
import { EmbeddingWorkerModule } from '../embedding-worker/embedding-worker.module';
import { McpModule } from '../mcp/mcp.module';
import { NotificationModule } from '../notifications/notification.module';
import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';

/**
 * DiscordIngestionModule
 *
 * Self-contained module that:
 *  - Listens to Discord events (bot token via DISCORD_BOT_TOKEN)
 *  - Stores live messages in discord_conversations collection
 *  - Accepts HTML transcript uploads and overwrites live messages
 *  - Streams events to clients via /discord WebSocket namespace
 *  - Auto-generates Q&A proposals via Anthropic after transcript ingestion
 *
 * Required env vars:
 *   DISCORD_BOT_TOKEN   — Discord application bot token
 *   ANTHROPIC_API_KEY   — For Q&A pair generation
 *   MONGODB_URI         — Shared with rest of the app
 *
 * Install new dependency before running:
 *   npm install discord.js
 */
@Module({
  controllers: [DiscordController],
  imports: [
    ConfigModule,
    HttpModule,
    EmbeddingWorkerModule,
    NotificationModule,
    EmailModule,
    UsersModule,
    forwardRef(() => McpModule),
    MongooseModule.forFeature([
      { name: DiscordConversation.name, schema: DiscordConversationSchema },
      // Re-register QaProposal so DiscordRagService can inject it
      { name: QaProposal.name, schema: QaProposalSchema },
    ]),
  ],
  providers: [
    DiscordConversationService,
    MessageNormalizerService,
    TranscriptParserService,
    DiscordRagService,
    DiscordGateway,
    DiscordService,
    DiscordListenerService, // OnModuleInit starts the Discord bot
  ],
  exports: [DiscordConversationService, DiscordService],
})
export class DiscordIngestionModule {}
