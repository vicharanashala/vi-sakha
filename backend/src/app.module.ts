import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { QaPairsModule } from './qa-pairs/qa-pairs.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { QaProposalsModule } from './qa-proposals/qa-proposals.module';
import { ChatModule } from './chat/chat.module';
import { ConversationModule } from './conversation/conversation.module';
import { TicketsModule } from './tickets/tickets.module';
import { AuthModule } from './auth/auth.module';
import { FeedbackModule } from './feedback/feedback.module';
import { UsersModule } from './users/users.module';
import { DiscordIngestionModule } from './discord-ingestion/discord.module';
import { EmbeddingWorkerModule } from './embedding-worker/embedding-worker.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { AdminModule } from './admin/admin.module';
import { CacheModule } from './cache/cache.module';
import { McpModule } from './mcp/mcp.module';
import { BullModule } from '@nestjs/bullmq';
import { EmailModule } from './email/email.module';
import { NotificationModule } from './notifications/notification.module';
import { AiAnalyticsModule } from './ai-analytics/ai-analytics.module';

@Module({
  imports: [
    // Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),

    // MongoDB connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),

    // Feature modules (Milestone 1 Core Ecosystem)
    UsersModule,           // Identity lifecycle management (US13)
    AuthModule,            // Firebase & JWT secure authentication
    QaPairsModule,         // Verified knowledge base retrieval
    EmbeddingsModule,      // Vector store integration for RAG
    QaProposalsModule,     // Knowledge base curation (US11)
    ChatModule,            // Student interactive consultation (US1)
    ConversationModule,    // Unified message ingestion & aggregation (US6)
    TicketsModule,         // Human-in-the-loop escalation (US2, US7, US8)
    FeedbackModule,        // Quality loops and performance analytics (US10, US14)
    DiscordIngestionModule,// Real-time message harvesting (US6)
    EmbeddingWorkerModule, // Sidecar orchestration for LLM embeddings
    PipelineModule,        // RAG workflow execution
    AdminModule,           // Administrative governance (US11)
    CacheModule,           // Performance optimization layer
    McpModule,             // Model Context Protocol unified layer
    
    // Background jobs and notifications
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: configService.get<number>('REDIS_PORT') || 6379,
        },
      }),
      inject: [ConfigService],
    }),
    EmailModule,
    NotificationModule,
    AiAnalyticsModule,
  ],
})
export class AppModule { }
