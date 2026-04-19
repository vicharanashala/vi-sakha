import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import {
  AddTicketMessageDto,
  AssignTicketDto,
  CloseTicketDto,
  CreateTicketDto,
  ResolveTicketDto,
  StartMeetingDto,
  TicketAssignmentFilterDto,
  TicketFilterDto,
  TicketMessagesQueryDto,
  TransferTicketDto,
} from './dto/ticket.dto';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@ApiTags('Tickets')
@ApiBearerAuth()
@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) { }

  /**
   * Create a new support ticket (usually initiated by a student)
   * @description Why: Enables US1/US3 interactive escalation from AI to Human.
   * @for: Allowing students to formally request assistance when GenAI fails to resolve an academic query.
   */
  @ApiOperation({
    summary: 'Create a Support Ticket',
    description: 'Fulfills US1 (interactive escalation) and US3 (manual escalation). Allows a learner to create a new support ticket containing issue descriptions and screenshots.',
  })
  @ApiResponse({ status: 201, description: 'Ticket successfully created and entered into the support queue.' })
  @ApiBadRequestResponse({ description: 'Validation failed (missing body requirements).' })
  @ApiUnauthorizedResponse({ description: 'Authentication token missing or invalid.' })
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.LAB_MEMBER, UserRole.ADMIN)
  async createTicket(@Body() dto: CreateTicketDto, @Request() req: any) {
    try {
      const ticket = await this.ticketsService.createTicket(dto, req.user.userId, req.user.name);
      return this.toResponse(ticket);
    } catch (e: any) {
      throw new HttpException(e.message || 'Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Retrieve all tickets based on roles and filters
   * @description Why: Essential for US9 (view pending tickets) staff oversight.
   * @for: Support staff to audit the entire ticket backlog based on assignment status.
   */
  @ApiOperation({
    summary: 'Get All Tickets',
    description: 'Fulfills US7 (route unresolved) and US9 (view pending tickets). Allows support staff to view all active user tickets based on assignment and status filters.',
  })
  @ApiResponse({ status: 200, description: 'List of matching tickets returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication token missing or invalid.' })
  @Get()
  async getTickets(
    @Query() filter: TicketFilterDto,
    @Query() assignmentFilter: TicketAssignmentFilterDto,
    @Request() req: any,
  ) {
    const tickets = await this.ticketsService.getTickets(
      filter,
      assignmentFilter,
      req.user.userId,
      req.user.role,
    );
    return tickets.map((ticket) => this.toResponse(ticket));
  }

  /**
   * Retrieve paginated tickets based on roles and filters
   */
  @ApiOperation({
    summary: 'Get Paginated Tickets',
    description: 'Fulfills US9 (view pending tickets) by returning a structured page of tickets with submission timestamps to manage response windows.',
  })
  @ApiResponse({ status: 200, description: 'Paginated ticket result returned.' })
  @Get('paginated')
  async getTicketsPaginated(
    @Query() filter: TicketFilterDto,
    @Query() assignmentFilter: TicketAssignmentFilterDto,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    const result = await this.ticketsService.getTicketsPaginated(
      filter,
      assignmentFilter,
      Number(page || 1),
      Number(limit || 10),
      req.user.userId,
      req.user.role,
    );

    return {
      data: result.data.map((ticket) => this.toResponse(ticket)),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: result.pages,
      },
    };
  }

  /**
   * Retrieve systemic statistics of ticket volume
   * @description Why: Fulfills US10 visibility into daily query volume.
   * @for: Admins to monitor support desk performance and MTTR (Mean Time to Resolution).
   */
  @ApiOperation({
    summary: 'Get Ticket Statistics',
    description: 'Fulfills US10 (visibility into daily query volume and resolution status). Provides admins and lab members with operational metrics.',
  })
  @ApiResponse({ status: 200, description: 'Statistics returned perfectly.' })
  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.LAB_MEMBER, UserRole.ADMIN)
  async getTicketStats() {
    return this.ticketsService.getTicketStats();
  }

  /**
   * Retrieve a singular ticket and its conversation history by ID
   */
  @ApiOperation({
    summary: 'Get Ticket By ID',
    description: 'Fulfills US9 (support staff context) and US8 (responding). Extracts the precise ticket metadata and paginated conversation history.',
  })
  @ApiResponse({ status: 200, description: 'Ticket and timeline returned successfully.' })
  @ApiNotFoundResponse({ description: 'Ticket ID not found in the database.' })
  @Get(':id')
  async getTicket(@Param('id') id: string, @Query() query: TicketMessagesQueryDto) {
    try {
      const ticket = await this.ticketsService.getTicket(id);
      if (!ticket) throw new HttpException('Ticket not found', HttpStatus.NOT_FOUND);

      const history = await this.ticketsService.getTicketMessages(id, query.page ?? 1, query.limit ?? 25);
      return {
        ...this.toResponse(ticket, history.data.map((message) => this.toMessageResponse(message))),
        messagesPagination: {
          total: history.total,
          page: history.page,
          limit: history.limit,
          pages: history.pages,
        },
      };
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new HttpException('Ticket not found', HttpStatus.NOT_FOUND);
    }
  }

  /**
   * Retrieve messages tied to a specific ticket ID
   */
  @ApiOperation({
    summary: 'Get Ticket Messages',
    description: 'Fulfills US8. Pulls the chronological messages within a specified support ticket.',
  })
  @ApiResponse({ status: 200, description: 'Messages returned successfully.' })
  @Get(':id/messages')
  async getTicketMessages(@Param('id') id: string, @Query() query: TicketMessagesQueryDto) {
    const result = await this.ticketsService.getTicketMessages(id, query.page ?? 1, query.limit ?? 25);
    return {
      data: result.data.map((message) => this.toMessageResponse(message)),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: result.pages,
      },
    };
  }

  /**
   * Initiate a synchronous meeting integration within the ticket
   * @description Why: Escalation to high-touch support (US8).
   * @for: Providing real-time, synchronous help via Google Meet when asynchronous chat is insufficient.
   */
  @ApiOperation({
    summary: 'Start Support Meeting',
    description: 'Fulfills US8 (handling escalated queries). Posts a meeting join link directly into the ticket timeline.',
  })
  @ApiResponse({ status: 201, description: 'Meeting link created and appended to timeline.' })
  @Post('start-meeting')
  @UseGuards(RolesGuard)
  @Roles(UserRole.LAB_MEMBER, UserRole.ADMIN)
  async startMeeting(@Body() dto: StartMeetingDto, @Request() req: any) {
    const result = await this.ticketsService.startSupportSession(
      dto.ticketId,
      req.user.userId,
      req.user.name,
    );
    return {
      meetingLink: result.meetingLink,
      message: this.toMessageResponse(result.message),
    };
  }

  /**
   * Mark a ticket as officially resolved by support desk
   */
  @ApiOperation({
    summary: 'Resolve Ticket',
    description: 'Fulfills US8 (respond to escalated queries). Lab members mark the issue as solved and log an optional resolution note.',
  })
  @ApiResponse({ status: 200, description: 'Ticket marked resolved.' })
  @Patch(':id/resolve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.LAB_MEMBER, UserRole.ADMIN)
  async resolveTicket(
    @Param('id') id: string,
    @Body() dto: ResolveTicketDto,
    @Request() req: any,
  ) {
    const ticket = await this.ticketsService.resolveTicket(id, dto, req.user.userId, req.user.name);
    return this.toResponse(ticket);
  }

  /**
   * Assign ticket to a specific lab member or instructor
   */
  @ApiOperation({
    summary: 'Assign Ticket',
    description: 'Fulfills US7 (routing queries). An authorized user designates an owner for a pending ticket.',
  })
  @ApiResponse({ status: 200, description: 'Ticket assignment successfully updated.' })
  @Patch(':id/assign')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LAB_MEMBER)
  async assignTicket(
    @Param('id') id: string,
    @Body() dto: AssignTicketDto,
    @Request() req: any,
  ) {
    const ticket = await this.ticketsService.assignTicket(id, dto, req.user.userId);
    return this.toResponse(ticket);
  }

  /**
   * Transfer existing assignment to another instructor
   */
  @ApiOperation({
    summary: 'Transfer Ticket Status',
    description: 'Fulfills US7 by allowing re-assignment of an unresolved query to a different specific lab member.',
  })
  @ApiResponse({ status: 200, description: 'Ticket transfer executed.' })
  @Patch(':id/transfer')
  @UseGuards(RolesGuard)
  @Roles(UserRole.LAB_MEMBER, UserRole.ADMIN)
  async transferTicket(
    @Param('id') id: string,
    @Body() dto: TransferTicketDto,
    @Request() req: any,
  ) {
    const ticket = await this.ticketsService.transferTicket(id, dto, req.user.userId);
    return this.toResponse(ticket);
  }

  /**
   * Add a follow-up message to the running ticket dialogue
   */
  @ApiOperation({
    summary: 'Reply to Ticket',
    description: 'Fulfills US8 (internal dashboard response). Allows either user or instructor to post new messages or screenshots to a ticket thread.',
  })
  @ApiResponse({ status: 200, description: 'Message appended and latest thread history returned.' })
  @Patch(':id/messages')
  async addTicketMessage(
    @Param('id') id: string,
    @Body() dto: AddTicketMessageDto,
    @Request() req: any,
  ) {
    const ticket = await this.ticketsService.addTicketMessage(
      id,
      dto,
      req.user.userId,
      req.user.name,
      req.user.role,
    );
    const latestMessages = await this.ticketsService.getLatestMessages(id, 25);
    return this.toResponse(ticket, latestMessages.map((message) => this.toMessageResponse(message)));
  }

  /**
   * Close a ticket completely (prevents new replies)
   */
  @ApiOperation({
    summary: 'Close Ticket Permanently',
    description: 'Fulfills US8 and SLA boundaries. Flags physical closure status of the ticket thread.',
  })
  @ApiResponse({ status: 200, description: 'Ticket status forced to CLOSED.' })
  @Patch(':id/close')
  @UseGuards(RolesGuard)
  @Roles(UserRole.LAB_MEMBER, UserRole.ADMIN)
  async closeTicket(
    @Param('id') id: string,
    @Body() dto: CloseTicketDto,
    @Request() req: any,
  ) {
    const ticket = await this.ticketsService.closeTicket(id, dto, req.user.userId, req.user.name);
    return this.toResponse(ticket);
  }

  /**
   * Serializes raw database payload into a strict consistent format
   */
  private toResponse(ticket: any, messages: any[] = []) {
    return {
      id: ticket._id,
      ticketNumber: ticket.ticketNumber,
      createdBy: ticket.createdBy,
      assignedTo: ticket.assignedTo,
      assignedBy: ticket.assignedBy,
      studentId: ticket.studentId,
      studentName: ticket.studentName,
      studentEmail: ticket.studentEmail,
      cohort: ticket.cohort,
      subject: ticket.subject,
      reason: ticket.reason,
      conversationId: ticket.conversationId,
      messageId: ticket.messageId,
      originalQuery: ticket.originalQuery,
      botResponse: ticket.botResponse,
      screenshots: ticket.screenshots ?? [],
      messages,
      status: ticket.status,
      assignedInstructor: ticket.assignedInstructor,
      instructors: ticket.instructors ?? [],
      resolvedBy: ticket.resolvedBy,
      resolutionNote: ticket.resolutionNote,
      resolvedAt: ticket.resolvedAt,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }

  /**
   * Serializes individual thread items
   */
  private toMessageResponse(message: any) {
    return {
      id: message._id,
      ticketId: String(message.ticketId),
      senderRole: message.senderRole,
      senderName: message.senderName,
      message: message.message,
      type: message.type,
      meetingLink: message.meetingLink,
      screenshots: message.screenshots ?? [],
      timestamp: message.timestamp,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }
}
