import { Controller, Get, Param, Query } from '@nestjs/common';
import { QaPairsService } from './qa-pairs.service';

@Controller('qa-pairs')
export class QaPairsController {
  constructor(private readonly qaPairsService: QaPairsService) {}

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

  @Get('search')
  async search(@Query('q') query: string, @Query('limit') limit?: string) {
    if (!query) {
      return { error: 'Query parameter "q" is required' };
    }
    const data = await this.qaPairsService.search(
      query,
      limit ? parseInt(limit, 10) : 10,
    );
    return { count: data.length, data };
  }

  @Get('count')
  async count() {
    const count = await this.qaPairsService.count();
    return { count };
  }

  @Get('source/:source')
  async findBySource(@Param('source') source: string) {
    const data = await this.qaPairsService.findBySource(source);
    return { count: data.length, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.qaPairsService.findOne(id);
    if (!data) {
      return { error: 'QA pair not found' };
    }
    return { data };
  }
}
