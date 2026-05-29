import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ChangeRoleDto, CreateLabMemberDto, SetUserStatusDto, UpdateLabMemberDto, UpdateQaPairDto } from './dto/admin.dto';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../users/schemas/user.schema';

@ApiTags('Admin Controls')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  // ── Users ─────────────────────────────────────────────────────────────────

  /** 
   * GET /admin/users — list all users 
   * @description Why: Essential for US11 staff management.
   * @for: Provides the Admin with a complete audit trail of the system's identity population.
   */
  @ApiOperation({
    summary: 'List Registered Users',
    description: 'Provides Admins with the ability to orchestrate and evaluate the lab member staff matrix to fulfill administrative duties.',
  })
  @ApiResponse({ status: 200, description: 'User array successfully requested.' })
  @Get('users')
  async listUsers() {
    return this.adminService.listAllUsers();
  }

  /** 
   * PATCH /admin/users/:id/role — change role
   * @description Why: Needed for US11 staff promotion/demotion logic.
   * @for: Adjusting the systemic trust levels assigned to a specific account.
   */
  @ApiOperation({
    summary: 'Reassign User Role',
    description: 'Elevates or demotes user privileges across Student, Lab Member, and Admin hierarchies.',
  })
  @ApiResponse({ status: 200, description: 'User roles correctly updated.' })
  @ApiNotFoundResponse({ description: 'Specific user identity could not be located.' })
  @Patch('users/:id/role')
  async changeRole(
    @Param('id') id: string,
    @Body() dto: ChangeRoleDto,
    @Request() req: any,
  ) {
    try {
      return await this.adminService.changeRole(id, dto.role, req.user.userId);
    } catch (e: any) {
      throw new HttpException('Role update failed', HttpStatus.NOT_FOUND);
    }
  }

  /** 
   * PATCH /admin/users/:id/status — activate / deactivate 
   * @description Why: Crucial for US11 security auditing and lockdown.
   * @for: Instantly revoking or restoring access to the dashboard during maintenance or security incidents.
   */
  @ApiOperation({
    summary: 'Set Identity Status',
    description: 'Suspends or reactivates an account login capabilities natively.',
  })
  @ApiResponse({ status: 200, description: 'User activity status updated successfully.' })
  @Patch('users/:id/status')
  async setStatus(
    @Param('id') id: string,
    @Body() dto: SetUserStatusDto,
    @Request() req: any,
  ) {
    try {
      return await this.adminService.setUserStatus(id, dto.isActive, req.user.userId);
    } catch (e: any) {
      throw new HttpException('Status change failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /** 
   * DELETE /admin/users/:id — delete any user 
   * @description Why: GDPR compliance and permanent account decommissioning.
   * @for: Removing identity nodes from the system entirely.
   */
  @ApiOperation({
    summary: 'Purge User Profile',
    description: 'Permanently removes a learner or staff account from the central authentication index.',
  })
  @ApiResponse({ status: 204, description: 'Profile eliminated successfully.' })
  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') id: string, @Request() req: any) {
    try {
      await this.adminService.deleteUser(id, req.user.userId);
    } catch (e: any) {
      throw new HttpException('User purge failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ── Lab Members ───────────────────────────────────────────────────────────

  /** 
   * GET /admin/lab-members — list lab members 
   * @description Why: Displays the active staff population for US11 review.
   * @for: Monitoring which lab members are currently assigned to processing student queries.
   */
  @ApiOperation({
    summary: 'Retrieve Lab Staff Directory',
    description: 'Lists the localized administrative assistants serving the Discord queries and application tickets.',
  })
  @Get('lab-members')
  async listLabMembers() {
    return this.adminService.listLabMembers();
  }

  /** 
   * POST /admin/lab-members — create lab member 
   * @description Why: Critical for US11 staff onboarding.
   * @for: Provisioning new staff identities with pre-configured Lab Member permissions.
   */
  @ApiOperation({
    summary: 'Provision Lab Member Account',
    description: 'Manually structures a securely hashed authentication profile specifically scoped into the lab member roleset.',
  })
  @ApiResponse({ status: 201, description: 'Profile correctly initialized.' })
  @ApiBadRequestResponse({ description: 'Email structure invalid or schema constraint failed.' })
  @Post('lab-members')
  async createLabMember(@Body() dto: CreateLabMemberDto, @Request() req: any) {
    try {
      return await this.adminService.createLabMember(dto, req.user.userId);
    } catch (e: any) {
      throw new HttpException('Creation rejected. Check payload constraints.', HttpStatus.BAD_REQUEST);
    }
  }

  /** 
   * PATCH /admin/lab-members/:id — update lab member 
   * @description Why: Administrative profile correction (US11).
   * @for: Editing existing staff details (name, email, secure password resets).
   */
  @ApiOperation({
    summary: 'Edit Staff Profile',
    description: 'Updates string metrics like the name or email assigned to a lab assistant.',
  })
  @Patch('lab-members/:id')
  async updateLabMember(@Param('id') id: string, @Body() dto: UpdateLabMemberDto) {
    try {
      return await this.adminService.updateLabMember(id, dto);
    } catch (e: any) {
      throw new HttpException('Update payload failed.', HttpStatus.NOT_FOUND);
    }
  }

  /** 
   * DELETE /admin/lab-members/:id — delete lab member 
   * @description Why: US11 staff offboarding.
   * @for: Revoking staff credentials when a lab member leaves the project.
   */
  @ApiOperation({
    summary: 'Decommission Staff Account',
    description: 'Safely unlinks and removes a lab member identity.',
  })
  @Delete('lab-members/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLabMember(@Param('id') id: string, @Request() req: any) {
    try {
      await this.adminService.deleteLabMember(id, req.user.userId);
    } catch (e: any) {
      throw new HttpException('Decommission failed.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ── Analytics ─────────────────────────────────────────────────────────────

  /** 
   * GET /admin/stats — user counts by role 
   * @description Why: Fulfills the US14 analytics requirement.
   * @for: Defining system load and population spread across learner and staff nodes.
   */
  @ApiOperation({
    summary: 'Export Ecosystem Statistics',
    description: 'Fulfills US14 (access to performance analytics). Scopes user density spread across learner and administrative nodes to define system load.',
  })
  @ApiResponse({ status: 200, description: 'Metrics payload returned successfully.' })
  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  // ── QA Pairs (qa_pairs_v2) ──────────────────────────────────────────────

  /** 
   * GET /admin/qa-pairs — list QA pairs with pagination & search 
   * @description Why: Enables US11 knowledge base auditing.
   * @for: Reviewing and searching verified responses currently serving the RAG pipeline.
   */
  @ApiOperation({
    summary: 'Lookup Dynamic Knowledge Base Responses',
    description: 'Fulfills US11 (review and approve answers). Lists current QA pairs verified within the GenAI memory banks.',
  })
  @ApiResponse({ status: 200, description: 'Paginated array of valid systemic pairings.' })
  @Get('qa-pairs')
  async listQaPairs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listQaPairs(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search || undefined,
    );
  }

  /** 
   * PUT /admin/qa-pairs/:id — update QA pair + regenerate embedding 
   * @description Why: Correcting GenAI hallucinations or outdated knowledge (US6/US11).
   * @for: Updating the semantic memory base to ensure higher precision in chatbot responses.
   */
  @ApiOperation({
    summary: 'Update GenAI QA Response Matrix',
    description: 'Fulfills US11 by instantly editing the semantic memory embeddings used to solve learner chats natively.',
  })
  @ApiResponse({ status: 200, description: 'QA Pair verified and memory embedded.' })
  @Put('qa-pairs/:id')
  async updateQaPair(@Param('id') id: string, @Body() dto: UpdateQaPairDto) {
    try {
      return await this.adminService.updateQaPair(id, dto);
    } catch (e: any) {
      throw new HttpException('Failed to configure GenAI embedding vector.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /** 
   * DELETE /admin/qa-pairs/:id — delete QA pair 
   * @description Why: Removing noise or incorrect data from the knowledge base (US11).
   * @for: Pruning the RAG memory structure to improve relevancy.
   */
  @ApiOperation({
    summary: 'Purge GenAI QA Node',
    description: 'Fulfills US11. Eradicates outdated response patterns directly from the memory structure.',
  })
  @Delete('qa-pairs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteQaPair(@Param('id') id: string) {
    try {
      await this.adminService.deleteQaPair(id);
    } catch (e: any) {
      throw new HttpException('Deletion operation failed structurally.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ── Stats ───────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Get QA accumulation metrics',
    description: 'Returns time-series data of processed QA pairs for growth visualization.',
  })
  @Roles(UserRole.ADMIN, UserRole.LAB_MEMBER)
  @Get('analytics/qa-growth')
  async getQaGrowth() {
    return this.adminService.getQaGrowth();
  }

  @ApiOperation({
    summary: 'Get Lab Member Performance',
    description: 'Returns resolution counts for application-native tickets by staff members.',
  })
  @Roles(UserRole.ADMIN, UserRole.LAB_MEMBER)
  @Get('analytics/performance')
  async getPerformance() {
    return this.adminService.getLabMemberPerformance();
  }
}
