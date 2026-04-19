import { Controller, Post, Body, Get, Query, UseGuards, Req } from '@nestjs/common';
import { InsightEngineService, AIInsight } from './insight-engine/insight-engine.service';
import { NLQService, NLQResponse } from './nlq/nlq.service';
import { AuthGuard } from '@nestjs/passport'; // Assuming passport-jwt is used
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('AI Analytics')
@Controller('ai')
export class AiAnalyticsController {
  constructor(
    private readonly insightEngine: InsightEngineService,
    private readonly nlqService: NLQService,
  ) {}

  @Post('insights')
  @ApiOperation({ summary: 'Get AI-powered metric insights and anomalies' })
  async getInsights(
    @Body('metric') metric: 'queries' | 'tickets',
    @Body('forceRefresh') forceRefresh?: boolean
  ): Promise<AIInsight[]> {
    return this.insightEngine.getInsights(metric, forceRefresh);
  }

  @Post('query')
  @ApiOperation({ summary: 'Natural language query interface (Ask Your Data)' })
  async askYourData(
    @Body('query') query: string,
    @Req() req: any
  ): Promise<NLQResponse> {
    const studentId = req.user?.id; // Link to user if available
    return this.nlqService.processQuery(query, studentId);
  }
}
