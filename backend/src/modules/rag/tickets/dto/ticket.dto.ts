import {
  IsArray,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TicketStatus } from '../schemas/ticket.schema';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TicketScreenshotDto {
  @ApiProperty({ description: 'File name of the screenshot' })
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty({ description: 'MIME type of the screenshot' })
  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @ApiProperty({ description: 'Base64 data URL of the screenshot' })
  @IsString()
  @IsNotEmpty()
  dataUrl!: string;
}

export class CreateTicketDto {
  @ApiProperty({ description: 'Name of the student submitting the ticket' })
  @IsString()
  @IsNotEmpty()
  studentName!: string;

  @ApiPropertyOptional({ description: 'Email address of the student' })
  @IsOptional()
  @IsString()
  studentEmail?: string;

  @ApiPropertyOptional({ description: 'Cohort identifier for the student' })
  @IsOptional()
  @IsString()
  cohort?: string;

  @ApiProperty({ description: 'Subject line of the ticket issue', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  subject!: string;

  @ApiProperty({ description: 'Detailed reason or description of the issue', maxLength: 5000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  reason!: string;

  @ApiPropertyOptional({ type: [TicketScreenshotDto], description: 'Optional list of screenshots attached to the ticket' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketScreenshotDto)
  screenshots?: TicketScreenshotDto[];

  @ApiPropertyOptional({ description: 'Conversation ID if the ticket was originated from a chat session' })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({ description: 'Message ID if the ticket was originated from a chat session' })
  @IsOptional()
  @IsString()
  messageId?: string;

  @ApiPropertyOptional({ description: 'The original query string provided by the user' })
  @IsOptional()
  @IsString()
  originalQuery?: string;

  @ApiPropertyOptional({ description: 'The bot response that caused the ticket creation' })
  @IsOptional()
  @IsString()
  botResponse?: string;
}

export class ResolveTicketDto {
  @ApiPropertyOptional({ description: 'Optional resolution notes provided by the instructor upon resolving the ticket', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resolutionNote?: string;
}

export class AssignTicketDto {
  @ApiProperty({ description: 'The MongoID userId of the lab member/instructor to assign the ticket to' })
  @IsMongoId()
  instructorId!: string;

  @ApiPropertyOptional({ description: 'Optional display name of the instructor being assigned' })
  @IsOptional()
  @IsString()
  instructorName?: string;
}

export class TransferTicketDto {
  @ApiProperty({ description: 'The MongoID userId of the receiving lab member' })
  @IsMongoId()
  toInstructorId!: string;

  @ApiPropertyOptional({ description: 'Optional display name of the receiving lab member' })
  @IsOptional()
  @IsString()
  toInstructorName?: string;
}

export class AddTicketMessageDto {
  @ApiProperty({ description: 'The contents of the message to be added to the ticket thread', maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;

  @ApiPropertyOptional({ type: [TicketScreenshotDto], description: 'Optional list of screenshots attached to the message' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketScreenshotDto)
  screenshots?: TicketScreenshotDto[];
}

export class CloseTicketDto {
  @ApiPropertyOptional({ description: 'Optional notes provided upon unconditionally closing the ticket', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resolutionNote?: string;
}

export class TicketAssignmentFilterDto {
  @ApiPropertyOptional({ enum: ['all', 'unassigned', 'assigned', 'mine'], description: 'Filter tickets by assignment status' })
  @IsOptional()
  @IsString()
  assignment?: 'all' | 'unassigned' | 'assigned' | 'mine';

  @ApiPropertyOptional({ description: 'Filter tickets by instructor name' })
  @IsOptional()
  @IsString()
  instructorName?: string;

  @ApiPropertyOptional({ description: 'Filter tickets by instructor MongoID' })
  @IsOptional()
  @IsMongoId()
  instructorId?: string;
}

export class TicketFilterDto {
  @ApiPropertyOptional({ description: 'Filter tickets by student identifier string (e.g., email or registration number)' })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Filter tickets by exactly matching a ticket number' })
  @IsOptional()
  @IsString()
  ticketNumber?: string;

  @ApiPropertyOptional({ description: 'Filter tickets by the MongoID of the creator user' })
  @IsOptional()
  @IsMongoId()
  createdBy?: string;

  @ApiPropertyOptional({ enum: TicketStatus, description: 'Filter tickets by their current state' })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;
}

export class TicketMessagesQueryDto {
  @ApiPropertyOptional({ description: 'Page number for pagination', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Limit of items per page', minimum: 1, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class StartMeetingDto {
  @ApiProperty({ description: 'The MongoID of the ticket to generate a session link for' })
  @IsString()
  @IsNotEmpty()
  ticketId!: string;
}
