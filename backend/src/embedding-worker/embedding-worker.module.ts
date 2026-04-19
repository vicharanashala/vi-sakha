import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { EmbeddingWorkerService } from './embedding-worker.service';

@Module({
  imports: [ConfigModule, HttpModule],
  providers: [EmbeddingWorkerService],
  exports: [EmbeddingWorkerService],
})
export class EmbeddingWorkerModule {}
