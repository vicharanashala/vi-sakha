import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { QaPairsModule } from './modules/rag/qa-pairs/qa-pairs.module';
import { EmbeddingsModule } from './modules/rag/embeddings/embeddings.module';
import { QaProposalsModule } from './modules/rag/qa-proposals/qa-proposals.module';
import { ChatModule } from './modules/rag/chat/chat.module';
import { ConversationModule } from './modules/rag/conversation/conversation.module';
import { TicketsModule } from './modules/rag/tickets/tickets.module';
import { AuthModule } from './modules/auth/auth.module';
import { FeedbackModule } from './modules/analytics/feedback/feedback.module';
import { UsersModule } from './modules/users/users.module';
import { DiscordIngestionModule } from './modules/discord/discord.module';
import { EmbeddingWorkerModule } from './modules/rag/embedding-worker/embedding-worker.module';
import { PipelineModule } from './modules/rag/pipeline/pipeline.module';
import { AdminModule } from './modules/rag/admin/admin.module';
import { CacheModule } from './modules/rag/cache/cache.module';
import { McpModule } from './modules/rag/mcp/mcp.module';
import { BullModule } from '@nestjs/bullmq';
import { EmailModule } from './modules/email/email.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { AiAnalyticsModule } from './modules/analytics/ai-analytics/ai-analytics.module';

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
