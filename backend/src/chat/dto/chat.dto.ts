import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { FeedbackType } from '../schemas/message.schema';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'The text content of the message sent by the user' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ description: 'The specific conversation ID this message belongs to. Omit to start a new thread.' })
  @IsString()
  @IsOptional()
  conversationId?: string;

  // Student info (for new conversations)
  @ApiPropertyOptional({ description: 'Student identifier string' })
  @IsString()
  @IsOptional()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Student display name' })
  @IsString()
  @IsOptional()
  studentName?: string;

  @ApiPropertyOptional({ description: 'Student email address' })
  @IsString()
  @IsOptional()
  studentEmail?: string;

  @ApiPropertyOptional({ description: 'Cohort identifier for academic logic' })
  @IsString()
  @IsOptional()
  cohort?: string;
}

export class FeedbackDto {
  @ApiProperty({ enum: FeedbackType, description: 'Type of feedback submitted against an AI response' })
  @IsEnum(FeedbackType)
  @IsNotEmpty()
  feedback!: FeedbackType;

  @ApiPropertyOptional({ description: 'Text explanation for the feedback (especially for dislikes)' })
  @IsString()
  @IsOptional()
  comment?: string;
}

export class EscalateDto {
  @ApiProperty({ description: 'The reason why the AI interaction is being escalated to support staff' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class CreateConversationDto {
  @ApiPropertyOptional({ description: 'Student identifier string' })
  @IsString()
  @IsOptional()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Student display name' })
  @IsString()
  @IsOptional()
  studentName?: string;

  @ApiPropertyOptional({ description: 'Student email address' })
  @IsString()
  @IsOptional()
  studentEmail?: string;

  @ApiPropertyOptional({ description: 'Cohort identifier for academic logic' })
  @IsString()
  @IsOptional()
  cohort?: string;
}

export class ConversationFilterDto {
  @ApiPropertyOptional({ description: 'Filter conversations by state (active, escalated, resolved)' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by specific student' })
  @IsString()
  @IsOptional()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Filter by specific cohort' })
  @IsString()
  @IsOptional()
  cohort?: string;

  @ApiPropertyOptional({ enum: ['all', 'liked', 'disliked', 'no-feedback'], description: 'Isolate conversations with specific feedback behaviors' })
  @IsString()
  @IsOptional()
  feedbackFilter?: 'all' | 'liked' | 'disliked' | 'no-feedback';

  @ApiPropertyOptional({ description: 'Page number for timeline pagination', minimum: 1, default: 1 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Page limit for timeline pagination', minimum: 1, maximum: 100, default: 10 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;
}
