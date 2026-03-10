import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { QaProposalsService } from './qa-proposals.service';
import { CreateProposalDto, BulkCreateProposalDto, ReviewProposalDto } from './dto/proposal.dto';
import { ProposalStatus } from './schemas/qa-proposal.schema';

@Controller('qa-proposals')
export class QaProposalsController {
  constructor(private readonly proposalsService: QaProposalsService) {}

  /**
   * GET /qa-proposals
   * List all proposals with optional status filter
   */
  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const validStatus = Object.values(ProposalStatus).includes(status as ProposalStatus)
      ? (status as ProposalStatus)
      : undefined;

    const data = await this.proposalsService.findAll(
      validStatus,
      limit ? parseInt(limit, 10) : 100,
      skip ? parseInt(skip, 10) : 0,
    );
    const count = await this.proposalsService.count(validStatus);

    return { count, data };
  }

  /**
   * GET /qa-proposals/stats
   * Get proposal statistics
   */
  @Get('stats')
  async getStats() {
    return this.proposalsService.getStats();
  }

  /**
   * GET /qa-proposals/:id
   * Get single proposal by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.proposalsService.findById(id);
    if (!data) {
      throw new HttpException('Proposal not found', HttpStatus.NOT_FOUND);
    }
    return { data };
  }

  /**
   * POST /qa-proposals
   * Create a single proposal
   */
  @Post()
  async create(@Body() dto: CreateProposalDto) {
    if (!dto.question || !dto.answer) {
      throw new HttpException(
        'Question and answer are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await this.proposalsService.create(dto);
    return { success: true, data };
  }

  /**
   * POST /qa-proposals/bulk
   * Bulk create proposals
   */
  @Post('bulk')
  async createBulk(
    @Body() proposals: BulkCreateProposalDto[],
    @Query('submittedBy') submittedBy?: string,
  ) {
    if (!Array.isArray(proposals) || proposals.length === 0) {
      throw new HttpException(
        'Proposals array is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate each proposal
    for (let i = 0; i < proposals.length; i++) {
      const p = proposals[i];
      if (!p.question || !p.answer) {
        throw new HttpException(
          `Proposal at index ${i} is missing question or answer`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const data = await this.proposalsService.createBulk(proposals, submittedBy);
    return {
      success: true,
      count: data.length,
      data,
    };
  }

  /**
   * PATCH /qa-proposals/:id/approve
   * Approve a proposal and add to knowledge base
   */
  @Patch(':id/approve')
  async approve(@Param('id') id: string, @Body() dto?: ReviewProposalDto) {
    const result = await this.proposalsService.approve(id, dto);
    if (!result) {
      throw new HttpException('Proposal not found', HttpStatus.NOT_FOUND);
    }
    return {
      success: true,
      message: 'Proposal approved and added to knowledge base',
      proposal: result.proposal,
      qaPair: result.qaPair,
    };
  }

  /**
   * PATCH /qa-proposals/:id/reject
   * Reject a proposal
   */
  @Patch(':id/reject')
  async reject(@Param('id') id: string, @Body() dto?: ReviewProposalDto) {
    const result = await this.proposalsService.reject(id, dto);
    if (!result) {
      throw new HttpException('Proposal not found', HttpStatus.NOT_FOUND);
    }
    return {
      success: true,
      message: 'Proposal rejected',
      data: result,
    };
  }

  /**
   * DELETE /qa-proposals/:id
   * Delete a proposal
   */
  @Delete(':id')
  async delete(@Param('id') id: string) {
    const deleted = await this.proposalsService.delete(id);
    if (!deleted) {
      throw new HttpException('Proposal not found', HttpStatus.NOT_FOUND);
    }
    return { success: true, message: 'Proposal deleted' };
  }
}
