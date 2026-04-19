import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import {
  DiscordConversation,
  DiscordConversationSchema,
} from '../discord-ingestion/schemas/discord-conversation.schema';
import {
  QaProposal,
  QaProposalSchema,
} from '../qa-proposals/schemas/qa-proposal.schema';

import { EmbeddingWorkerModule } from '../embedding-worker/embedding-worker.module';
import { PipelineOrchestrator } from './pipeline.orchestrator';
import { PipelineController } from './pipeline.controller';

/**
 * PipelineModule
 *
 * Provides admin endpoints to run the data pipeline:
 *   POST /api/pipeline/run   { mode: 'backfill_embeddings' | 'extract_qa' | 'full' }
 *   GET  /api/pipeline/status
 *
 * Modes:
 *   backfill_embeddings — Re-embed qa_pairs_v2 records with empty vectors
 *                         (recovers from past sidecar failures)
 *   extract_qa          — Run Q&A extraction on closed conversations that
 *                         have no proposals yet (historical backfill)
 *   full                — Both of the above, in order
 *
 * Required env vars:
 *   EMBEDDING_SIDECAR_URL   (default: http://localhost:8001)
 *   ANTHROPIC_API_KEY       (for extract_qa / full modes)
 */
@Module({
  imports: [
    ConfigModule,
    HttpModule,
    EmbeddingWorkerModule,
    MongooseModule.forFeature([
      { name: DiscordConversation.name, schema: DiscordConversationSchema },
      { name: QaProposal.name, schema: QaProposalSchema },
    ]),
  ],
  controllers: [PipelineController],
  providers: [PipelineOrchestrator],
  exports: [PipelineOrchestrator],
})
export class PipelineModule {}
