import { Controller, Get, Param, Query, BadRequestException, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { QaPairsService } from './qa-pairs.service';
import { JwtOrApiKeyGuard } from '../../auth/jwt-or-api-key.guard';

@ApiTags('QA Pairs', 'GenAI Services')
@ApiBearerAuth()
@UseGuards(JwtOrApiKeyGuard)
@Controller('qa-pairs')
export class QaPairsController {
  constructor(private readonly qaPairsService: QaPairsService) {}

  /**
   * GET /api/qa-pairs
   * List all verified QA pairs in the system.
   */
  @ApiOperation({
    summary: 'List All QA Knowledge',
    description: 'Retrieves the complete set of verified question-answer pairs stored in the GenAI knowledge base.',
  })
  @ApiResponse({ status: 200, description: 'QA pairs retrieved successfully.' })
  @Get()
  async findAll(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const count = await this.qaPairsService.count();
    const data = await this.qaPairsService.findAll(
      limit ? parseInt(limit, 10) : 100,
      skip ? parseInt(skip, 10) : 0,
    );
    return { count, data };
  }

  /**
   * GET /api/qa-pairs/search
   * Semantic search across QA pairs.
   */
  @ApiOperation({
    summary: 'Search Knowledge Base',
    description: 'Fulfills US6 (instant resolution). Allows the chatbot to query the existing knowledge base for matches before falling back to full RAG generation.',
  })
  @ApiQuery({ name: 'q', description: 'The search query string' })
  @Get('search')
  async search(@Query('q') query: string, @Query('limit') limit?: string) {
    if (!query) {
      throw new BadRequestException('Query parameter "q" is required for semantic lookup.');
    }
    const data = await this.qaPairsService.search(
      query,
      limit ? parseInt(limit, 10) : 10,
    );
    return { count: data.length, data };
  }

  /**
   * GET /api/qa-pairs/count
   * Simple count.
   */
  @ApiOperation({ summary: 'Count Verified Knowledge Nodes' })
  @Get('count')
  async count() {
    const count = await this.qaPairsService.count();
    return { count };
  }

  /**
   * GET /api/qa-pairs/source/:source
   * Filter by origin.
   */
  @ApiOperation({
    summary: 'Filter Knowledge by Source',
    description: 'Separates knowledge pairs generated from Discord transcripts, PDF ingestion, or manual entry.',
  })
  @ApiParam({ name: 'source', description: 'Origin type (e.g., discord, manual, pdf)' })
  @Get('source/:source')
  async findBySource(@Param('source') source: string) {
    const data = await this.qaPairsService.findBySource(source);
    return { count: data.length, data };
  }

  /**
   * GET /api/qa-pairs/:id
   * Single node lookup.
   */
  @ApiOperation({ summary: 'Lookup Specific QA Node' })
  @ApiResponse({ status: 200, description: 'QA Pair returned successfully.' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.qaPairsService.findOne(id);
    if (!data) {
      throw new NotFoundException('QA pair not found in the active knowledge index.');
    }
    return { data };
  }
}
