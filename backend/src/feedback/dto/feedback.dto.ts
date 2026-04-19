import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFeedbackDto {
  @ApiProperty({ description: 'The unique identifier for the parent conversation' })
  @IsString()
  @IsNotEmpty()
  conversationId!: string;

  @ApiProperty({ description: 'The unique identifier for the specific AI response' })
  @IsString()
  @IsNotEmpty()
  messageId!: string;

  @ApiProperty({ description: 'The actual text content of the message being evaluated' })
  @IsString()
  @IsNotEmpty()
  messageContent!: string;

  @ApiProperty({ enum: ['up', 'down'], description: 'Binary evaluation of the AI response quality' })
  @IsEnum(['up', 'down'])
  rating!: string;
}
