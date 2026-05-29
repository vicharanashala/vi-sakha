import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { QaProposalsService } from './qa-proposals.service';
import { CreateProposalDto, BulkCreateProposalDto, ReviewProposalDto } from './dto/proposal.dto';
import { ProposalStatus, UserAttribution } from './schemas/qa-proposal.schema';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../users/schemas/user.schema';

@ApiTags('GenAI Services', 'QA Proposals')
@ApiBearerAuth()
@Controller('qa-proposals')
@UseGuards(JwtAuthGuard)
export class QaProposalsController {
  constructor(private readonly proposalsService: QaProposalsService) {}

  /** Extract UserAttribution from the JWT-authenticated request. */
  private extractUser(req: any): UserAttribution {
    return {
      userId: req.user.userId,
      name: req.user.name,
      role: req.user.role,
    };
  }

  /**
   * GET /qa-proposals
   * List all proposals with optional status filter
   */
  @ApiOperation({
    summary: 'List Pending QA Pairs',
    description: 'Fulfills US11 (review and approve answers). Pulls the list of lab-member-submitted knowledge pairs awaiting administrative verification before vectorization.',
  })
  @ApiResponse({ status: 200, description: 'Filtered array of QA proposals.' })
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
  @ApiOperation({
    summary: 'Proposal Volume Stats',
    description: 'Calculates the volume of pending, rejected, and approved embedding proposals.',
  })
  @Get('stats')
  async getStats() {
    return this.proposalsService.getStats();
  }

  /**
   * GET /qa-proposals/:id
   * Get single proposal by ID
   */
  @ApiOperation({
    summary: 'Evaluate Single Proposal',
    description: 'Fulfills US11 review step. Loads the exact raw payload proposed by a lab member for admin critique.',
  })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const data = await this.proposalsService.findById(id);
      if (!data) throw new HttpException('Proposal not found', HttpStatus.NOT_FOUND);
      return { data };
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new HttpException('Failed retrieval', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * POST /qa-proposals
   * Create a single proposal — proposedBy is extracted from the authenticated user.
   */
  @ApiOperation({
    summary: 'Submit New QA Knowledge',
    description: 'Fulfills US11 (propose responses). Lab members who resolve a ticket successfully submit the resolution text back into the GenAI learning pipeline.',
  })
  @ApiResponse({ status: 201, description: 'Knowledge proposal submitted.' })
  @ApiBadRequestResponse({ description: 'Question and logic body missing.' })
  @Post()
  async create(@Body() dto: CreateProposalDto, @Request() req: any) {
    if (!dto.question || !dto.answer) {
      throw new HttpException('Question and answer are required parameters.', HttpStatus.BAD_REQUEST);
    }

    try {
      const proposedBy = this.extractUser(req);
      const data = await this.proposalsService.create(dto, proposedBy);
      return { success: true, data };
    } catch (e: any) {
      throw new HttpException('Proposal storage failed.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * POST /qa-proposals/bulk
   * Bulk create proposals
   */
  @ApiOperation({
    summary: 'Bulk Import QA Knowledge',
    description: 'Mass ingest array of QA rules. Inherits the same US11 requirement structures. Used for pipeline parsing integration.',
  })
  @Post('bulk')
  async createBulk(
    @Body() proposals: BulkCreateProposalDto[],
    @Request() req: any,
  ) {
    if (!Array.isArray(proposals) || proposals.length === 0) {
      throw new HttpException('Proposals array is structurally required.', HttpStatus.BAD_REQUEST);
    }

    proposals.forEach((p, i) => {
      if (!p.question || !p.answer) {
        throw new HttpException(`Proposal at index ${i} violated validation constraints.`, HttpStatus.BAD_REQUEST);
      }
    });

    try {
      const proposedBy = this.extractUser(req);
      const data = await this.proposalsService.createBulk(proposals, proposedBy);
      return { success: true, count: data.length, data };
    } catch (e: any) {
      throw new HttpException('Bulk ingestion failed.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * PATCH /qa-proposals/:id/approve
   * Approve a proposal and add to knowledge base — admin only.
   */
  @ApiOperation({
    summary: 'Verify and Memorize QA Pair',
    description: 'Fulfills US11 specific approval clause. The Admin verifies the lab member submission. The payload is dynamically sent to Google Gemini for vectorization and stored in the semantic search cluster.',
  })
  @ApiResponse({ status: 200, description: 'Embedder ran and QA pair accepted natively.' })
  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async approve(@Param('id') id: string, @Request() req: any) {
    try {
      const reviewedBy = this.extractUser(req);
      const result = await this.proposalsService.approve(id, reviewedBy);
      if (!result) throw new HttpException('Lookup failed.', HttpStatus.NOT_FOUND);
      
      return {
        success: true,
        message: 'Knowledge embedded into GenAI cluster.',
        proposal: result.proposal,
        insertedId: result.insertedId,
      };
    } catch (e: any) {
      throw new HttpException('Approval and vectorization failed internally.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * PATCH /qa-proposals/:id/reject
   * Reject a proposal — admin only.
   */
  @ApiOperation({
    summary: 'Reject QA Pair',
    description: 'Fulfills US11 specific rejection clause. Denies the embedding pipeline execution and flags the initial proposal negatively.',
  })
  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async reject(@Param('id') id: string, @Body() dto?: ReviewProposalDto, @Request() req?: any) {
    try {
      const reviewedBy = this.extractUser(req);
      const result = await this.proposalsService.reject(id, reviewedBy, dto);
      if (!result) throw new HttpException('Missing payload ID.', HttpStatus.NOT_FOUND);
      
      return { success: true, message: 'Proposal formally discarded.', data: result };
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new HttpException('Rejection block failed.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * DELETE /qa-proposals/:id
   * Delete a proposal
   */
  @ApiOperation({ summary: 'Delete Proposal Sandbox Data' })
  @Delete(':id')
  async delete(@Param('id') id: string) {
    try {
      const deleted = await this.proposalsService.delete(id);
      if (!deleted) throw new HttpException('Proposal not found.', HttpStatus.NOT_FOUND);
      return { success: true, message: 'Cleaned' };
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new HttpException('Data drop failed.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
