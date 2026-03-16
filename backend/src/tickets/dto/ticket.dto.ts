import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TicketMessageSenderRole, TicketStatus } from '../schemas/ticket.schema';

export class TicketScreenshotDto {
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @IsString()
  @IsNotEmpty()
  dataUrl!: string;
}

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @IsString()
  @IsNotEmpty()
  studentName!: string;

  @IsOptional()
  @IsString()
  studentEmail?: string;

  @IsOptional()
  @IsString()
  cohort?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  subject!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  reason!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketScreenshotDto)
  screenshots?: TicketScreenshotDto[];
}

export class ResolveTicketDto {
  @IsString()
  @IsNotEmpty()
  resolvedBy!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resolutionNote?: string;
}

export class AssignTicketDto {
  @IsString()
  @IsNotEmpty()
  instructorName!: string;
}

export class TransferTicketDto {
  @IsString()
  @IsNotEmpty()
  toInstructor!: string;
}

export class AddTicketMessageDto {
  @IsString()
  @IsNotEmpty()
  senderName!: string;

  @IsEnum(TicketMessageSenderRole)
  senderRole!: TicketMessageSenderRole;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketScreenshotDto)
  screenshots?: TicketScreenshotDto[];
}

export class CloseTicketDto {
  @IsString()
  @IsNotEmpty()
  closedBy!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resolutionNote?: string;
}

export class TicketAssignmentFilterDto {
  @IsOptional()
  @IsString()
  assignment?: 'all' | 'unassigned' | 'assigned' | 'mine';

  @IsOptional()
  @IsString()
  instructorName?: string;
}

export class TicketFilterDto {
  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;
}
