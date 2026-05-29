import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
import { TicketsGateway } from './tickets.gateway';
import { TicketMessage, TicketMessageDocument } from './schemas/ticket-message.schema';
import {
  Ticket,
  TicketDocument,
  TicketMessageSenderRole,
  TicketStatus,
} from './schemas/ticket.schema';
import { GoogleCalendarService } from './google-calendar.service';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../../users/schemas/user.schema';
import { CacheService } from '../cache/cache.service';
import { NotificationService } from '../../notifications/notification.service';
import { EmailService } from '../../email/email.service';
import { NotificationType } from '../../notifications/schemas/notification.schema';
import { UserRole as UserRoleEnum } from '../../users/schemas/user.schema';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);
  private static readonly ALLOWED_MIME_TYPES = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
  ];

  private static readonly MAX_SCREENSHOTS = 4;
  private static readonly MAX_SCREENSHOT_BYTES = 2 * 1024 * 1024;

  constructor(
    @InjectModel(Ticket.name) private readonly ticketModel: Model<TicketDocument>,
    @InjectModel(TicketMessage.name) private readonly ticketMessageModel: Model<TicketMessageDocument>,
    private readonly ticketsGateway: TicketsGateway,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly usersService: UsersService,
    private readonly cache: CacheService,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
  ) { }

  /**
   * @description Initializes a new support ticket (US2).
   * Generates a unique TKT-YYYYMMDD-XXX identifier and validates attached troubleshooting evidence.
   * @param dto Structured ticket payload including subject, reason, and context.
   */
  async createTicket(
    dto: CreateTicketDto,
    userId: string,
    userName: string,
  ): Promise<TicketDocument> {
    const ticketNumber = await this.generateTicketNumber();
    const screenshots = dto.screenshots ?? [];
    this.validateScreenshots(screenshots);

    const ticket = await this.ticketModel.create({
      ticketNumber,
      createdBy: new Types.ObjectId(userId),
      studentId: userId,
      studentName: dto.studentName || userName,
      studentEmail: dto.studentEmail,
      cohort: dto.cohort,
      subject: dto.subject,
      reason: dto.reason,
      conversationId: dto.conversationId,
      messageId: dto.messageId,
      originalQuery: dto.originalQuery,
      botResponse: dto.botResponse,
      screenshots,
      status: TicketStatus.OPEN,
      instructors: [],
    });

    await this.cache.invalidatePattern('vs:tickets:*');

    // ── Notify lab members about the new in-app ticket ──────────────────────
    this.notifyMentorsNewTicket(ticket.ticketNumber, ticket.studentName).catch(err => 
      this.logger.error(`New in-app ticket notification failed: ${err.message}`)
    );

    return ticket;
  }

  private async notifyMentorsNewTicket(ticketNumber: string, studentName: string) {
    const mentors = await this.usersService.findAll(UserRoleEnum.LAB_MEMBER);
    for (const mentor of mentors) {
      await this.notificationService.notifyTicketEvent(
        NotificationType.NEW_TICKET,
        mentor._id.toString(),
        'New Ticket Raised',
        `A new app ticket #${ticketNumber} has been raised by ${studentName}.`,
        { ticketNumber, studentName }
      );
      await this.emailService.notifyNewTicket(mentor.email, ticketNumber, studentName);
    }
  }

  /**
   * @description Filters and retrieves tickets based on status, creator, or assignment flags.
   */
  async getTickets(
    filter: TicketFilterDto,
    assignmentFilter?: TicketAssignmentFilterDto,
    requestingUserId?: string,
    requestingUserRole?: string,
  ): Promise<TicketDocument[]> {
    const query = this.buildTicketQuery(filter, assignmentFilter, requestingUserId, requestingUserRole);
    return this.ticketModel.find(query).sort({ createdAt: -1 });
  }

  async getTicketsPaginated(
    filter: TicketFilterDto,
    assignmentFilter: TicketAssignmentFilterDto | undefined,
    page = 1,
    limit = 10,
    requestingUserId?: string,
    requestingUserRole?: string,
  ): Promise<{ data: TicketDocument[]; total: number; page: number; limit: number; pages: number }> {
    const cacheKey = `vs:tickets:list:${JSON.stringify({ filter, assignmentFilter, page, limit, requestingUserId, requestingUserRole })}`;

    return this.cache.wrap(cacheKey, 60, async () => {
      const query = this.buildTicketQuery(filter, assignmentFilter, requestingUserId, requestingUserRole);

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
    });
  }

  async getTicket(ticketId: string): Promise<TicketDocument> {
    return this.getTicketOrThrow(ticketId);
  }

  /**
   * @description Retrieves the threaded message history for a specific ticket.
   */
  async getTicketMessages(
    ticketId: string,
    page = 1,
    limit = 25,
  ): Promise<{
    data: TicketMessageDocument[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const ticket = await this.getTicketOrThrow(ticketId);

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const skip = (safePage - 1) * safeLimit;

    const query = { ticketId: ticket._id };
    const [data, total] = await Promise.all([
      this.ticketMessageModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
      this.ticketMessageModel.countDocuments(query),
    ]);

    return { data, total, page: safePage, limit: safeLimit, pages: Math.ceil(total / safeLimit) || 1 };
  }

  async resolveTicket(
    ticketId: string,
    dto: ResolveTicketDto,
    userId: string,
    userName: string,
  ): Promise<TicketDocument> {
    return this.closeTicket(ticketId, { resolutionNote: dto.resolutionNote }, userId, userName);
  }

  /**
   * @description Assigns a ticket to a specific Instructor or Lab Member.
   */
  async assignTicket(
    ticketId: string,
    dto: AssignTicketDto,
    assignedByUserId: string,
  ): Promise<TicketDocument> {
    const ticket = await this.getTicketOrThrow(ticketId);

    // Look up instructor to get their name
    const instructor = await this.usersService.findById(dto.instructorId);
    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }

    ticket.assignedTo = new Types.ObjectId(dto.instructorId);
    ticket.assignedBy = new Types.ObjectId(assignedByUserId);
    ticket.assignedInstructor = instructor.name;
    ticket.instructors = Array.from(new Set([...(ticket.instructors ?? []), instructor.name]));
    await ticket.save();

    await this.cache.invalidatePattern('vs:tickets:*');

    return ticket;
  }

  async transferTicket(
    ticketId: string,
    dto: TransferTicketDto,
    transferredByUserId: string,
  ): Promise<TicketDocument> {
    const ticket = await this.getTicketOrThrow(ticketId);

    const instructor = await this.usersService.findById(dto.toInstructorId);
    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }

    ticket.assignedTo = new Types.ObjectId(dto.toInstructorId);
    ticket.assignedBy = new Types.ObjectId(transferredByUserId);
    ticket.assignedInstructor = instructor.name;
    ticket.instructors = Array.from(new Set([...(ticket.instructors ?? []), instructor.name]));
    await ticket.save();

    await this.cache.invalidatePattern('vs:tickets:*');

    return ticket;
  }

  /**
   * @description appends a new message to the ticket thread.
   * Triggers a real-time event via Socket.io for immediate UI updates.
   */
  async addTicketMessage(
    ticketId: string,
    dto: AddTicketMessageDto,
    userId: string,
    userName: string,
    userRole: string,
  ): Promise<TicketDocument> {
    const ticket = await this.getTicketOrThrow(ticketId);

    if (ticket.status !== TicketStatus.OPEN) {
      throw new BadRequestException('Cannot add messages to a closed ticket');
    }

    const screenshots = dto.screenshots ?? [];
    this.validateScreenshots(screenshots);

    const senderRole =
      userRole === UserRole.STUDENT
        ? TicketMessageSenderRole.STUDENT
        : TicketMessageSenderRole.INSTRUCTOR;

    const message = await this.ticketMessageModel.create({
      ticketId: ticket._id,
      senderRole,
      senderName: userName,
      message: dto.message,
      timestamp: new Date(),
      screenshots,
    });

    if (senderRole === TicketMessageSenderRole.INSTRUCTOR) {
      ticket.instructors = Array.from(new Set([...(ticket.instructors ?? []), userName]));
      if (!ticket.assignedInstructor) {
        ticket.assignedInstructor = userName;
        ticket.assignedTo = new Types.ObjectId(userId);
      }
    }

    await ticket.save();
    this.ticketsGateway.emitTicketMessageCreated(ticketId, message);

    // ── Notify participants ─────────────────────────────────────────────────
    this.handleTicketNotifications(ticket, message).catch(err => 
      this.logger.error(`Ticket notification failed: ${err.message}`)
    );

    await this.cache.invalidatePattern('vs:tickets:*');

    return ticket;
  }

  private async handleTicketNotifications(ticket: TicketDocument, message: TicketMessageDocument) {
    // 1. If mentor replied → Notify student
    if (message.senderRole === TicketMessageSenderRole.INSTRUCTOR) {
      const studentId = ticket.createdBy?.toString() || ticket.studentId;
      if (studentId) {
        await this.notificationService.notifyTicketEvent(
          NotificationType.TICKET_REPLY,
          studentId,
          'In-App Ticket Response',
          `A mentor has replied to your ticket #${ticket.ticketNumber}.`,
          { ticketNumber: ticket.ticketNumber, senderName: message.senderName }
        );
      }
      if (ticket.studentEmail) {
        await this.emailService.notifyTicketReply(ticket.studentEmail, ticket.ticketNumber, message.senderName);
      }
    }

    // 2. If student replied → Notify assigned mentor or all lab members
    if (message.senderRole === TicketMessageSenderRole.STUDENT) {
      if (ticket.assignedTo) {
        const mentorId = ticket.assignedTo.toString();
        await this.notificationService.notifyTicketEvent(
          NotificationType.TICKET_REPLY,
          mentorId,
          'Student Ticket Update',
          `Student ${message.senderName} replied to ticket #${ticket.ticketNumber}.`,
          { ticketNumber: ticket.ticketNumber, senderName: message.senderName }
        );
        const mentor = await this.usersService.findById(mentorId);
        if (mentor) {
          await this.emailService.notifyTicketReply(mentor.email, ticket.ticketNumber, message.senderName);
        }
      } else {
        // Notify all lab members if unassigned
        const mentors = await this.usersService.findAll(UserRoleEnum.LAB_MEMBER);
        for (const mentor of mentors) {
          await this.notificationService.notifyTicketEvent(
            NotificationType.TICKET_REPLY,
            mentor._id.toString(),
            'Unassigned Ticket Activity',
            `Activity in unassigned ticket #${ticket.ticketNumber} from ${message.senderName}.`,
            { ticketNumber: ticket.ticketNumber, senderName: message.senderName }
          );
        }
      }
    }
  }

  /**
   * @description provisions a Google Meet session for real-time instructor help.
   * Leverages the Google Calendar API for tokenized meeting generation.
   */
  async startSupportSession(
    ticketId: string,
    userId: string,
    userName: string,
  ): Promise<{ meetingLink: string; message: TicketMessageDocument }> {
    const ticket = await this.getTicketOrThrow(ticketId);

    if (ticket.status !== TicketStatus.OPEN) {
      throw new BadRequestException('Cannot start a support session for a closed ticket');
    }

    const meetingLink = await this.googleCalendarService.createMeetEvent(
      `Support Session: ${ticket.ticketNumber}`,
      `Live support session for ticket: ${ticket.subject}\n\nReason: ${ticket.reason}`,
      ticket.studentEmail ? [ticket.studentEmail] : [],
    );

    if (!meetingLink) {
      throw new BadRequestException('Failed to generate Google Meet link. Please check calendar integration credentials.');
    }

    const message = await this.ticketMessageModel.create({
      ticketId: ticket._id,
      senderRole: TicketMessageSenderRole.INSTRUCTOR,
      senderName: userName,
      message: 'Instructor started a support session',
      type: 'meeting',
      meetingLink,
      timestamp: new Date(),
      screenshots: [],
    });

    ticket.instructors = Array.from(new Set([...(ticket.instructors ?? []), userName]));
    if (!ticket.assignedInstructor) {
      ticket.assignedInstructor = userName;
      ticket.assignedTo = new Types.ObjectId(userId);
    }
    await ticket.save();

    this.ticketsGateway.emitTicketMessageCreated(ticketId, message);

    await this.cache.invalidatePattern('vs:tickets:*');

    return { meetingLink, message };
  }

  async getLatestMessages(ticketId: string, limit = 25): Promise<TicketMessageDocument[]> {
    const ticket = await this.getTicketOrThrow(ticketId);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    return this.ticketMessageModel
      .find({ ticketId: ticket._id })
      .sort({ createdAt: -1 })
      .limit(safeLimit);
  }

  /**
   * @description Finalizes the support lifecycle by marking the ticket as RESOLVED.
   */
  async closeTicket(
    ticketId: string,
    dto: CloseTicketDto,
    userId: string,
    userName: string,
  ): Promise<TicketDocument> {
    const ticket = await this.ticketModel.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    ticket.status = TicketStatus.RESOLVED;
    ticket.resolvedBy = userName;
    ticket.resolutionNote = dto.resolutionNote;
    ticket.resolvedAt = new Date();
    ticket.assignedInstructor = ticket.assignedInstructor ?? userName;
    ticket.instructors = Array.from(new Set([...(ticket.instructors ?? []), userName]));
    await ticket.save();

    await this.cache.invalidatePattern('vs:tickets:*');

    return ticket;
  }

  /**
   * @description Aggregates volumetric metrics for the support dashboard (US14).
   * Calculates Mean Time to Resolution (MTTR) and ticket density.
   */
  async getTicketStats(): Promise<{
    total: number;
    open: number;
    resolved: number;
    resolutionRate: number;
    avgResolutionHours: number;
  }> {
    return this.cache.wrap('vs:tickets:stats', 120, async () => {
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
          { $group: { _id: null, avgResolutionHours: { $avg: '$resolutionHours' } } },
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
    });
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
        throw new BadRequestException(`Screenshot ${screenshot.fileName} exceeds 2MB size limit`);
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

  private async getTicketOrThrow(ticketId: string): Promise<TicketDocument> {
    if (!Types.ObjectId.isValid(ticketId)) {
      throw new NotFoundException('Ticket not found');
    }

    const ticket = await this.ticketModel.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  private buildTicketQuery(
    filter: TicketFilterDto,
    assignmentFilter?: TicketAssignmentFilterDto,
    requestingUserId?: string,
    requestingUserRole?: string,
  ): Record<string, unknown> {
    const query: Record<string, unknown> = {};

    // Students only see their own tickets
    if (requestingUserRole === UserRole.STUDENT && requestingUserId) {
      query.createdBy = new Types.ObjectId(requestingUserId);
    } else {
      // Admin/lab_member: allow explicit filtering
      if (filter.createdBy) {
        query.createdBy = new Types.ObjectId(filter.createdBy);
      } else if (filter.studentId) {
        query.studentId = filter.studentId;
      }
    }

    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.ticketNumber) {
      query.ticketNumber = filter.ticketNumber;
    }

    if (assignmentFilter?.assignment === 'unassigned') {
      query.assignedTo = { $in: [null, undefined] };
      if (!query.status) {
        query.status = TicketStatus.OPEN;
      }
    }

    if (assignmentFilter?.assignment === 'assigned') {
      query.assignedTo = { $nin: [null, undefined] };
    }

    if (assignmentFilter?.assignment === 'mine') {
      if (requestingUserId) {
        query.assignedTo = new Types.ObjectId(requestingUserId);
      } else if (assignmentFilter.instructorId) {
        query.assignedTo = new Types.ObjectId(assignmentFilter.instructorId);
      } else if (assignmentFilter.instructorName) {
        query.assignedInstructor = assignmentFilter.instructorName;
      }
    }

    return query;
  }
}
