import { Controller, Get, Param, Query } from '@nestjs/common';
import { EmbeddingsService } from './embeddings.service';

@Controller('embeddings')
export class EmbeddingsController {
  constructor(private readonly embeddingsService: EmbeddingsService) {}

  @Get()
  async findAll(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const metadata = await this.embeddingsService.getMetadata();
    const data = await this.embeddingsService.findAll(
      limit ? parseInt(limit, 10) : 100,
      skip ? parseInt(skip, 10) : 0,
    );
    return { ...metadata, data };
  }

  @Get('metadata')
  async getMetadata() {
    return this.embeddingsService.getMetadata();
  }

  @Get('count')
  async count() {
    const count = await this.embeddingsService.count();
    return { count };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.embeddingsService.findOne(id);
    if (!data) {
      return { error: 'Embedding not found' };
    }
    return { data };
  }

  @Get('qa/:qaPairId')
  async findByQaPairId(@Param('qaPairId') qaPairId: string) {
    const data = await this.embeddingsService.findByQaPairId(qaPairId);
    if (!data) {
      return { error: 'Embedding not found for QA pair' };
    }
    return { data };
  }
}
