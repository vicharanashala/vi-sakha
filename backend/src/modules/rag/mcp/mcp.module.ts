import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { ContextAggregatorService } from './context-aggregator.service';
import { EmbeddingWorkerModule } from '../embedding-worker/embedding-worker.module';
import { ConversationModule } from '../conversation/conversation.module';
import { CacheModule } from '../cache/cache.module';

import { PipelineModule } from '../pipeline/pipeline.module';

@Module({
  imports: [
    HttpModule,
    EmbeddingWorkerModule,
    forwardRef(() => ConversationModule),
    CacheModule,
    PipelineModule,
  ],
  controllers: [McpController],
  providers: [McpService, ContextAggregatorService],
  exports: [McpService],
})
export class McpModule {}
