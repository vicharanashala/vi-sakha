import { IsString, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class McpRequestDto {
  @ApiProperty({ description: 'The query from the user to the MCP server' })
  @IsString()
  query!: string;

  @ApiProperty({ description: 'Specific context sources to restrict or expand retrieval', required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  context_sources?: string[];

  @ApiProperty({ description: 'Attachments (images, documents)', required: false })
  @IsArray()
  @IsOptional()
  attachments?: { name: string; type: string; content: string }[];

  @IsString()
  @IsOptional()
  cohort?: string;

  @IsString()
  @IsOptional()
  studentEmail?: string;

  @IsString()
  @IsOptional()
  studentName?: string;
}
