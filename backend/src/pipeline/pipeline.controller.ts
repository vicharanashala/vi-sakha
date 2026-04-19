import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty, ApiBadRequestResponse, ApiInternalServerErrorResponse } from '@nestjs/swagger';
import { PipelineOrchestrator, RunMode } from './pipeline.orchestrator';
import { EmbeddingWorkerService } from '../embedding-worker/embedding-worker.service';
import { IsEnum } from 'class-validator';

class RunPipelineDto {
  @ApiProperty({ enum: ['backfill_embeddings', 'extract_qa', 'full'], description: 'The discrete execution sequence you want the ingest pipeline to take' })
  @IsEnum(['backfill_embeddings', 'extract_qa', 'full'])
  mode!: RunMode;
}

@ApiTags('GenAI Services', 'Embeddings Pipeline')
@Controller('pipeline')
export class PipelineController {
  constructor(
    private readonly orchestrator: PipelineOrchestrator,
    private readonly embeddingWorker: EmbeddingWorkerService,
  ) {}

  /**
   * POST /api/pipeline/run
   * Body: { "mode": "backfill_embeddings" | "extract_qa" | "full" }
   */
  @ApiOperation({
    summary: 'Trigger External Vectorization Engine',
    description: 'Fulfills US2 and US13 by forcing the system to read the course data PDFs and process embeddings into the GenAI matrix model manually.',
  })
  @ApiResponse({ status: 200, description: 'Engine completed its payload extraction.' })
  @ApiBadRequestResponse({ description: 'A pipeline job is already active, denying overlaps.' })
  @ApiInternalServerErrorResponse({ description: 'Fatal unhandled engine memory crash.' })
  @Post('run')
  @HttpCode(HttpStatus.OK)
  async run(@Body() dto: RunPipelineDto) {
    const validModes: RunMode[] = ['backfill_embeddings', 'extract_qa', 'full'];
    if (!validModes.includes(dto.mode)) {
      throw new BadRequestException(
        `Invalid mode schema. Must be exactly one of: ${validModes.join(', ')}`,
      );
    }

    if (this.orchestrator.busy) {
      throw new BadRequestException('An active pipeline routine is currently monopolizing resources.');
    }

    try {
      const result = await this.orchestrator.run(dto.mode);
      return result;
    } catch (err: any) {
      throw new InternalServerErrorException(err.message || 'Pipeline structure collapsed.');
    }
  }

  /**
   * GET /api/pipeline/status
   * Returns sidecar health + whether a run is currently in progress.
   */
  @ApiOperation({
    summary: 'Data Engine Status Probe',
    description: 'Fulfills US14 pipeline analytics. Verifies if the backend local python embedding service is active and responsive.',
  })
  @ApiResponse({ status: 200, description: 'Engine Health Result payload retrieved.' })
  @Get('status')
  async status() {
    const sidecarHealthy = await this.embeddingWorker.isHealthy();
    return {
      running: this.orchestrator.busy,
      sidecar: {
        healthy: sidecarHealthy,
        url: process.env.EMBEDDING_SIDECAR_URL ?? 'http://localhost:8001',
      },
    };
  }
}
