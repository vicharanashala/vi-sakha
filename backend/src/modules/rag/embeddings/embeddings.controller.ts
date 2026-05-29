import { Controller, Get, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { EmbeddingsService } from './embeddings.service';

@ApiTags('GenAI Services', 'Embeddings')
@Controller('embeddings')
export class EmbeddingsController {
  constructor(private readonly embeddingsService: EmbeddingsService) {}

  @ApiOperation({
    summary: 'List Subspace Embeddings',
    description: 'Retrieves raw mathematical vector sets stored within the GenAI memory index.',
  })
  @ApiResponse({ status: 200, description: 'Embeddings array successfully extracted.' })
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

  @ApiOperation({
    summary: 'View Vector Metadata',
    description: 'Retrieves dimensions and algorithm specs for the active GenAI embeddings.',
  })
  @ApiResponse({ status: 200, description: 'Metadata successfully accessed.' })
  @Get('metadata')
  async getMetadata() {
    return this.embeddingsService.getMetadata();
  }

  @ApiOperation({
    summary: 'Count Total Embeddings',
    description: 'Counts the total number of QA pairs fully vectorized in the knowledge base.',
  })
  @Get('count')
  async count() {
    const count = await this.embeddingsService.count();
    return { count };
  }

  @ApiOperation({
    summary: 'Lookup Embedding Node',
    description: 'Retrieves a single complex vector embedding map by ID.',
  })
  @ApiNotFoundResponse({ description: 'Embedding ID not found in vector space.' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.embeddingsService.findOne(id);
    if (!data) {
      throw new HttpException('Embedding node not found in vector space', HttpStatus.NOT_FOUND);
    }
    return { data };
  }

  @ApiOperation({
    summary: 'Cross-reference Embedding',
    description: 'Fulfills US11 correlation logic. Traces a physical QA Pair back to its vectorized coordinate in the embedding matrix.',
  })
  @ApiNotFoundResponse({ description: 'The queried QA Pair has no matched embedding.' })
  @Get('qa/:qaPairId')
  async findByQaPairId(@Param('qaPairId') qaPairId: string) {
    const data = await this.embeddingsService.findByQaPairId(qaPairId);
    if (!data) {
      throw new HttpException('Embedding not found for this defined QA Pair sequence', HttpStatus.NOT_FOUND);
    }
    return { data };
  }
}
