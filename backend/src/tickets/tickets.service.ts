import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
import {
  Ticket,
  TicketDocument,
  TicketMessageSenderRole,
  TicketStatus,
} from './schemas/ticket.schema';

@Injectable()
export class TicketsService {
  private static readonly ALLOWED_MIME_TYPES = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
  ];

  private static readonly MAX_SCREENSHOTS = 4;
  private static readonly MAX_SCREENSHOT_BYTES = 2 * 1024 * 1024;

  constructor(@InjectModel(Ticket.name) private readonly ticketModel: Model<TicketDocument>) {}

  async createTicket(dto: CreateTicketDto): Promise<TicketDocument> {
    const ticketNumber = await this.generateTicketNumber();
    const screenshots = dto.screenshots ?? [];

    this.validateScreenshots(screenshots);

    return this.ticketModel.create({
      ticketNumber,
      studentId: dto.studentId,
      studentName: dto.studentName,
      studentEmail: dto.studentEmail,
      cohort: dto.cohort,
      subject: dto.subject,
      reason: dto.reason,
      screenshots,
      status: TicketStatus.OPEN,
      messages: [
        {
          senderRole: TicketMessageSenderRole.STUDENT,
          senderName: dto.studentName,
          message: dto.reason,
          timestamp: new Date(),
        },
      ],
      instructors: [],
    });
  }

  async getTickets(
    filter: TicketFilterDto,
    assignmentFilter?: TicketAssignmentFilterDto,
  ): Promise<TicketDocument[]> {
    const query = this.buildTicketQuery(filter, assignmentFilter);

    return this.ticketModel.find(query).sort({ createdAt: -1 });
  }

  async getTicketsPaginated(
    filter: TicketFilterDto,
    assignmentFilter: TicketAssignmentFilterDto | undefined,
    page = 1,
    limit = 10,
  ): Promise<{ data: TicketDocument[]; total: number; page: number; limit: number; pages: number }> {
    const query = this.buildTicketQuery(filter, assignmentFilter);

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 50);
    const skip = (safePage - 1) * safeLimit;

    const [data, total] = await Promise.all([
      this.ticketModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
      this.ticketModel.countDocuments(query),
    ]);

    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit) || 1,
    };
  }

  async getTicket(ticketId: string): Promise<TicketDocument> {
    const ticket = await this.ticketModel.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async resolveTicket(ticketId: string, dto: ResolveTicketDto): Promise<TicketDocument> {
    const ticket = await this.closeTicket(ticketId, {
      closedBy: dto.resolvedBy,
      resolutionNote: dto.resolutionNote,
    });

    return ticket;
  }

  async assignTicket(ticketId: string, dto: AssignTicketDto): Promise<TicketDocument> {
    const ticket = await this.ticketModel.findById(ticketId);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    ticket.assignedInstructor = dto.instructorName;
    ticket.instructors = Array.from(new Set([...(ticket.instructors ?? []), dto.instructorName]));
    await ticket.save();

    return ticket;
  }

  async transferTicket(ticketId: string, dto: TransferTicketDto): Promise<TicketDocument> {
    const ticket = await this.ticketModel.findById(ticketId);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    ticket.assignedInstructor = dto.toInstructor;
    ticket.instructors = Array.from(new Set([...(ticket.instructors ?? []), dto.toInstructor]));
    await ticket.save();

    return ticket;
  }

  async addTicketMessage(ticketId: string, dto: AddTicketMessageDto): Promise<TicketDocument> {
    const ticket = await this.ticketModel.findById(ticketId);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.status !== TicketStatus.OPEN) {
      throw new BadRequestException('Cannot add messages to a closed ticket');
    }

    const screenshots = dto.screenshots ?? [];
    this.validateScreenshots(screenshots);

    ticket.messages = [
      ...(ticket.messages ?? []),
      {
        senderRole: dto.senderRole,
        senderName: dto.senderName,
        message: dto.message,
        timestamp: new Date(),
        screenshots,
      },
    ];

    if (dto.senderRole === TicketMessageSenderRole.INSTRUCTOR) {
      ticket.instructors = Array.from(new Set([...(ticket.instructors ?? []), dto.senderName]));
      if (!ticket.assignedInstructor) {
        ticket.assignedInstructor = dto.senderName;
      }
    }

    await ticket.save();

    return ticket;
  }

  async closeTicket(ticketId: string, dto: CloseTicketDto): Promise<TicketDocument> {
    const ticket = await this.ticketModel.findById(ticketId);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    ticket.status = TicketStatus.RESOLVED;
    ticket.resolvedBy = dto.closedBy;
    ticket.resolutionNote = dto.resolutionNote;
    ticket.resolvedAt = new Date();
    ticket.assignedInstructor = dto.closedBy;
    ticket.instructors = Array.from(new Set([...(ticket.instructors ?? []), dto.closedBy]));
    await ticket.save();

    return ticket;
  }

  async getTicketStats(): Promise<{
    total: number;
    open: number;
    resolved: number;
    resolutionRate: number;
    avgResolutionHours: number;
  }> {
    const [total, open, resolved, resolutionData] = await Promise.all([
      this.ticketModel.countDocuments(),
      this.ticketModel.countDocuments({ status: TicketStatus.OPEN }),
      this.ticketModel.countDocuments({ status: TicketStatus.RESOLVED }),
      this.ticketModel.aggregate([
        {
          $match: {
            status: TicketStatus.RESOLVED,
            resolvedAt: { $exists: true },
            createdAt: { $exists: true },
          },
        },
        {
          $project: {
            resolutionHours: {
              $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 1000 * 60 * 60],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgResolutionHours: { $avg: '$resolutionHours' },
          },
        },
      ]),
    ]);

    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    return {
      total,
      open,
      resolved,
      resolutionRate,
      avgResolutionHours: Number((resolutionData[0]?.avgResolutionHours || 0).toFixed(2)),
    };
  }

  private validateScreenshots(
    screenshots: Array<{ mimeType: string; dataUrl: string; fileName: string }>,
  ): void {
    if (screenshots.length > TicketsService.MAX_SCREENSHOTS) {
      throw new BadRequestException(`Maximum ${TicketsService.MAX_SCREENSHOTS} screenshots are allowed`);
    }

    for (const screenshot of screenshots) {
      if (!TicketsService.ALLOWED_MIME_TYPES.includes(screenshot.mimeType.toLowerCase())) {
        throw new BadRequestException(
          `Unsupported screenshot type: ${screenshot.mimeType}. Allowed: png, jpg, jpeg, webp`,
        );
      }

      if (!screenshot.dataUrl.startsWith('data:image/')) {
        throw new BadRequestException(`Invalid screenshot encoding for ${screenshot.fileName}`);
      }

      const base64Part = screenshot.dataUrl.split(',')[1] || '';
      const approxBytes = Math.floor((base64Part.length * 3) / 4);

      if (approxBytes > TicketsService.MAX_SCREENSHOT_BYTES) {
        throw new BadRequestException(
          `Screenshot ${screenshot.fileName} exceeds 2MB size limit`,
        );
      }
    }
  }

  private async generateTicketNumber(): Promise<string> {
    const dateSegment = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countToday = await this.ticketModel.countDocuments({
      createdAt: {
        $gte: new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`),
      },
    });

    const sequence = String(countToday + 1).padStart(3, '0');
    return `TKT-${dateSegment}-${sequence}`;
  }

  private buildTicketQuery(
    filter: TicketFilterDto,
    assignmentFilter?: TicketAssignmentFilterDto,
  ): Record<string, unknown> {
    const query: Record<string, unknown> = {};

    if (filter.studentId) {
      query.studentId = filter.studentId;
    }

    if (filter.status) {
      query.status = filter.status;
    }

    if (assignmentFilter?.assignment === 'unassigned') {
      query.assignedInstructor = { $in: [null, ''] };
      if (!query.status) {
        query.status = TicketStatus.OPEN;
      }
    }

    if (assignmentFilter?.assignment === 'assigned') {
      query.assignedInstructor = { $nin: [null, ''] };
    }

    if (assignmentFilter?.assignment === 'mine' && assignmentFilter.instructorName) {
      query.assignedInstructor = assignmentFilter.instructorName;
    }

    return query;
  }
}
