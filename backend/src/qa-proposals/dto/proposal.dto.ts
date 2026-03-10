import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateProposalDto {
  @IsString()
  @IsNotEmpty()
  question!: string;

  @IsString()
  @IsNotEmpty()
  answer!: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  submittedBy?: string;
}

export class BulkCreateProposalDto {
  @IsString()
  @IsNotEmpty()
  question!: string;

  @IsString()
  @IsNotEmpty()
  answer!: string;

  @IsString()
  @IsOptional()
  title?: string;
}

export class ReviewProposalDto {
  @IsString()
  @IsOptional()
  reviewedBy?: string;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
