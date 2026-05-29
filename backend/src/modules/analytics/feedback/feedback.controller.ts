import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBadRequestResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { CreateFeedbackDto } from './dto/feedback.dto';
import { FeedbackService } from './feedback.service';

@ApiTags('Feedback & Analytics')
@Controller()
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) { }

  /** 
   * Store analytics feedback for a chatbot message
   * POST /api/feedback
   * @description Why: Essential for US4 student feedback loop.
   * @for: Allowing learners to flag incorrect AI responses, which then feeds the Hotspot analytics engine.
   */
  @ApiOperation({
    summary: 'Submit Quality Feedback',
    description: 'Fulfills US4 (provide feedback on responses). Allows learners to evaluate AI-produced answers as either accurate or flawed.',
  })
  @ApiResponse({ status: 201, description: 'Feedback logged successfully.' })
  @ApiBadRequestResponse({ description: 'Validation failed on the payload schema.' })
  @Post('feedback')
  @HttpCode(HttpStatus.CREATED)
  async createFeedback(@Body() dto: CreateFeedbackDto) {
    try {
      const result = await this.feedbackService.create(dto);
      return {
        id: result._id,
        topic: result.topic,
        rating: result.rating,
        createdAt: result.createdAt,
      };
    } catch (e: any) {
      throw new HttpException('Submission failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /** 
   * Aggregated feedback hotspots sorted by negative ratio
   * GET /api/analytics/hotspots
   * @description Why: Fulfills US12 identifying defective knowledge areas.
   * @for: Lab members to prioritize which parts of the knowledge base need immediate correction or more data.
   */
  @ApiOperation({
    summary: 'View Negative Hotspots',
    description: 'Fulfills US12 (track frequently asked topics generating negative feedback). Calculates the ratio of defective queries grouped by isolated topics.',
  })
  @ApiResponse({ status: 200, description: 'Returns sorted array of topic heatmaps.' })
  @Get('analytics/hotspots')
  async getHotspots() {
    return this.feedbackService.getHotspots();
  }


  /**
   * Overall feedback positive/negative ratio
   * GET /api/analytics/feedback-ratio
   */
  @ApiOperation({
    summary: 'Aggregated Feedback Ratio',
    description: 'Fulfills US14 (performance analytics). Evaluates overall AI bot effectiveness and customer satisfaction percentage.',
  })
  @ApiResponse({ status: 200, description: 'Overall binary satisfaction distribution returned.' })
  @Get('analytics/feedback-ratio')
  async getFeedbackRatio() {
    return this.feedbackService.getFeedbackRatio();
  }

  /**
   * Negative feedback drilldown for a specific topic
   * GET /api/analytics/topic/:topic
   */
  @ApiOperation({
    summary: 'Topic Detail Drilldown',
    description: 'Fulfills US12 by isolating the exact failed conversations of a specific topic category so lab members can review what went wrong.',
  })
  @ApiResponse({ status: 200, description: 'List of individual defective messages.' })
  @ApiNotFoundResponse({ description: 'Topic strings not found.' })
  @Get('analytics/topic/:topic')
  async getByTopic(@Param('topic') topic: string) {
    try {
      const items = await this.feedbackService.getByTopic(decodeURIComponent(topic));
      if (!items || items.length === 0) throw new HttpException('Topic not found', HttpStatus.NOT_FOUND);

      return items.map(item => ({
        id: item._id,
        conversationId: item.conversationId,
        messageId: item.messageId,
        topic: item.topic,
        rating: item.rating,
        createdAt: item.createdAt,
      }));
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new HttpException('Error querying topic', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  /**
   * Aggregated dashboard summary KPIs
   * GET /api/analytics/dashboard-summary
   */
  @ApiOperation({
    summary: 'Dashboard KPI Summary',
    description: 'Calculates high-level metrics for the dashboard home view, including query volume, AI resolution rates, and Knowledge Base health.',
  })
  @ApiResponse({ status: 200, description: 'Aggregated KPIs returned.' })
  @Get('analytics/dashboard-summary')
  async getSummary() {
    return this.feedbackService.getDashboardSummary();
  }
}
