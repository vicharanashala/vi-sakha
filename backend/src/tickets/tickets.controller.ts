import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  AddTicketMessageDto,
  AssignTicketDto,
  CloseTicketDto,
  CreateTicketDto,
  ResolveTicketDto,
  TicketAssignmentFilterDto,
  TicketFilterDto,
  TransferTicketDto,
} from './dto/ticket.dto';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  async createTicket(@Body() dto: CreateTicketDto) {
    const ticket = await this.ticketsService.createTicket(dto);
    return this.toResponse(ticket);
  }

  @Get()
  async getTickets(@Query() filter: TicketFilterDto, @Query() assignmentFilter: TicketAssignmentFilterDto) {
    const tickets = await this.ticketsService.getTickets(filter, assignmentFilter);
    return tickets.map((ticket) => this.toResponse(ticket));
  }

  @Get('paginated')
  async getTicketsPaginated(
    @Query() filter: TicketFilterDto,
    @Query() assignmentFilter: TicketAssignmentFilterDto,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.ticketsService.getTicketsPaginated(
      filter,
      assignmentFilter,
      Number(page || 1),
      Number(limit || 10),
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

  @Get('stats')
  async getTicketStats() {
    return this.ticketsService.getTicketStats();
  }

  @Get(':id')
  async getTicket(@Param('id') id: string) {
    const ticket = await this.ticketsService.getTicket(id);
    return this.toResponse(ticket);
  }

  @Patch(':id/resolve')
  async resolveTicket(@Param('id') id: string, @Body() dto: ResolveTicketDto) {
    const ticket = await this.ticketsService.resolveTicket(id, dto);
    return this.toResponse(ticket);
  }

  @Patch(':id/assign')
  async assignTicket(@Param('id') id: string, @Body() dto: AssignTicketDto) {
    const ticket = await this.ticketsService.assignTicket(id, dto);
    return this.toResponse(ticket);
  }

  @Patch(':id/transfer')
  async transferTicket(@Param('id') id: string, @Body() dto: TransferTicketDto) {
    const ticket = await this.ticketsService.transferTicket(id, dto);
    return this.toResponse(ticket);
  }

  @Patch(':id/messages')
  async addTicketMessage(@Param('id') id: string, @Body() dto: AddTicketMessageDto) {
    const ticket = await this.ticketsService.addTicketMessage(id, dto);
    return this.toResponse(ticket);
  }

  @Patch(':id/close')
  async closeTicket(@Param('id') id: string, @Body() dto: CloseTicketDto) {
    const ticket = await this.ticketsService.closeTicket(id, dto);
    return this.toResponse(ticket);
  }

  private toResponse(ticket: any) {
    return {
      id: ticket._id,
      ticketNumber: ticket.ticketNumber,
      studentId: ticket.studentId,
      studentName: ticket.studentName,
      studentEmail: ticket.studentEmail,
      cohort: ticket.cohort,
      subject: ticket.subject,
      reason: ticket.reason,
      screenshots: ticket.screenshots ?? [],
      messages: ticket.messages ?? [],
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
}
