import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProposalDto {
  @ApiProperty({ description: 'The proposed question for the knowledge base' })
  @IsString()
  @IsNotEmpty()
  question!: string;

  @ApiProperty({ description: 'The proposed answer that the GenAI should provide' })
  @IsString()
  @IsNotEmpty()
  answer!: string;

  @ApiPropertyOptional({ description: 'Optional categorical title mapping' })
  @IsString()
  @IsOptional()
  title?: string;
}

export class BulkCreateProposalDto {
  @ApiProperty({ description: 'The proposed question string' })
  @IsString()
  @IsNotEmpty()
  question!: string;

  @ApiProperty({ description: 'The proposed answer string' })
  @IsString()
  @IsNotEmpty()
  answer!: string;

  @ApiPropertyOptional({ description: 'Optional categorical title mapping' })
  @IsString()
  @IsOptional()
  title?: string;
}

export class ReviewProposalDto {
  @ApiPropertyOptional({ description: 'The specific feedback/reasoning if an Admin rejects the QA pair' })
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
