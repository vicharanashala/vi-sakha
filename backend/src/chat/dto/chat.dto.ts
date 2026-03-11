import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { FeedbackType } from '../schemas/message.schema';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsOptional()
  conversationId?: string;

  // Student info (for new conversations)
  @IsString()
  @IsOptional()
  studentId?: string;

  @IsString()
  @IsOptional()
  studentName?: string;

  @IsString()
  @IsOptional()
  studentEmail?: string;

  @IsString()
  @IsOptional()
  cohort?: string;
}

export class FeedbackDto {
  @IsEnum(FeedbackType)
  @IsNotEmpty()
  feedback!: FeedbackType;

  @IsString()
  @IsOptional()
  comment?: string;
}

export class EscalateDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class ConversationFilterDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  studentId?: string;

  @IsString()
  @IsOptional()
  cohort?: string;

  @IsString()
  @IsOptional()
  feedbackFilter?: 'all' | 'liked' | 'disliked' | 'no-feedback';

  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;
}
