import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../users/schemas/user.schema';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'Display name for the registering learner' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Valid scholastic email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Complex password, minimum 6 characters', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}

export class LoginDto {
  @ApiProperty({ description: 'Registered email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Raw credential payload matching the hash' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class CreateUserDto {
  @ApiProperty({ description: 'Display name for identity creation' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'User login email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Secure user login string' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ enum: UserRole, description: 'Role to be assigned inside the dashboard' })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiPropertyOptional({ description: 'Academic cohort code for user scoping' })
  @IsOptional()
  @IsString()
  cohort?: string;
}

export class OnboardDto {
  @ApiProperty({ description: 'Display name for the student' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Academic cohort name, e.g., aksians, rsaians, etc.' })
  @IsString()
  @IsNotEmpty()
  cohortName!: string;

  @ApiPropertyOptional({ description: 'Optional cohort email address if different from login email' })
  @IsOptional()
  @IsEmail()
  cohortEmail?: string;
}
