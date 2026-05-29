import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, IsBoolean } from 'class-validator';
import { UserRole } from '../../../users/schemas/user.schema';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for provisioning new Lab Member staff accounts (US11).
 * Maps directly to the Firebase and MongoDB multi-store creation flow.
 */
export class CreateLabMemberDto {
  @ApiProperty({ description: 'Display name for the new lab member' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'A valid email address for authentication' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'A secure password, minimum 6 characters', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}

/**
 * DTO for editing existing Lab Member profiles.
 * Supports partial updates to identity metrics and secure credential rotation.
 */
export class UpdateLabMemberDto {
  @ApiPropertyOptional({ description: 'Updated display name for the lab member' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ description: 'Updated email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Updated password, minimum 6 characters', minLength: 6 })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

/**
 * DTO for systemic role reassignment (Admin-only).
 * Triggers permission tier adjustments across the platform.
 */
export class ChangeRoleDto {
  @ApiProperty({ enum: UserRole, description: 'Target user role to assign.' })
  @IsEnum(UserRole)
  role!: UserRole;
}

/**
 * DTO for toggling account activation for security auditing.
 */
export class SetUserStatusDto {
  @ApiProperty({ description: 'Boolean indicating whether the user is active' })
  @IsBoolean()
  @IsNotEmpty()
  isActive!: boolean;
}

/**
 * DTO for updating GenAI knowledge base entries (US6/US11).
 * Triggers a semantic embedding regeneration when saved.
 */
export class UpdateQaPairDto {
  @ApiPropertyOptional({ description: 'The modified question payload for the knowledge base' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  question?: string;

  @ApiPropertyOptional({ description: 'The modified answer payload for the knowledge base' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  answer?: string;

  @ApiPropertyOptional({ description: 'Categorical tag for the QA entry' })
  @IsOptional()
  @IsString()
  category?: string;
}
