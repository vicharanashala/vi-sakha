import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  Request,
  UseGuards,
  HttpException,
  HttpStatus,
  Param,
  Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBadRequestResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ApiKeyService } from './api-key.service';
import { CreateUserDto, LoginDto, RegisterDto, OnboardDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';

@ApiTags('Auth and Identity')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly apiKeyService: ApiKeyService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) { }

  /**
   * POST /api/auth/register
   * Register a new student account.
   */
  @ApiOperation({
    summary: 'Register New Learner',
    description: 'Creates a base-level student JWT access profile.',
  })
  @ApiResponse({ status: 201, description: 'Authentication token granted for new student.' })
  @ApiBadRequestResponse({ description: 'Fields missing or constraints failed.' })
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    try {
      return await this.authService.register(dto);
    } catch (e: any) {
      throw new HttpException(e.message || 'Registration failed.', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * POST /api/auth/login
   * Login with email + password. Returns JWT.
   */
  @ApiOperation({
    summary: 'Local Login',
    description: 'Requests a JWT token in return for local credentials validation.',
  })
  @ApiResponse({ status: 200, description: 'Access token provided securely.' })
  @ApiUnauthorizedResponse({ description: 'Invalid username or password mismatch.' })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    try {
      return await this.authService.login(dto);
    } catch (e: any) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }
  }

  /**
   * GET /api/auth/me
   * Get the authenticated user's profile.
   */
  @ApiOperation({
    summary: 'Retrieve Personal Profile',
    description: 'Uses an active bearer token to evaluate the roles and permissions assigned to the session node.',
  })
  @ApiBearerAuth()
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    try {
      return await this.authService.getProfile(req.user.userId);
    } catch (e: any) {
      throw new HttpException('Profile search malfunction.', HttpStatus.UNAUTHORIZED);
    }
  }

  /**
   * POST /api/auth/users
   * Admin only: create a lab member or any role.
   */
  @ApiOperation({
    summary: 'Master Identity Generator',
    description: 'Directly initializes arbitrary roles and parameters bypassing registration (Admin strictly).',
  })
  @ApiBearerAuth()
  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createUser(@Body() dto: CreateUserDto, @Request() req: any) {
    try {
      return await this.authService.createUser(dto, req.user.userId);
    } catch (e: any) {
      throw new HttpException('Identity injection failed.', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * GET /api/auth/google
   * Redirects to Google consent screen.
   */
  @ApiOperation({ summary: 'Initiate Google OAuth2 Redirect' })
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    // Passport redirects to Google
  }

  /**
   * GET /api/auth/google/callback
   * Google redirects here after consent. Issues JWT and redirects to frontend.
   */
  @ApiOperation({ summary: 'Google Cloud Callback Target' })
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: any, @Res() res: any) {
    const isProduction = process.env.NODE_ENV === 'production';
    const fallbackUrl = isProduction ? '' : 'http://localhost:5173';
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? fallbackUrl;

    if (!req.user) {
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }

    const { access_token, user } = req.user;
    const encoded = encodeURIComponent(JSON.stringify(user));
    res.redirect(`${frontendUrl}/auth/callback?token=${access_token}&user=${encoded}`);
  }

  /**
   * GET /api/auth/users
   * Admin/lab_member: list users, optionally filtered by role.
   */
  @ApiOperation({
    summary: 'Retrieve Filtered Member Subsets',
    description: 'Evaluates populations of specific systemic roles (i.e. generating lists of purely Lab Members for UI mapping).',
  })
  @ApiBearerAuth()
  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LAB_MEMBER)
  async getUsers(@Query('role') role?: UserRole) {
    return this.usersService.findAll(role);
  }

  /**
   * POST /api/auth/firebase-sync
   * Verifies Firebase ID token and syncs user with database. Returns local JWT.
   */
  @ApiOperation({
    summary: 'Verify External Firebase JWT',
    description: 'Establishes local trust by translating external identity headers to native ecosystem JWT equivalents natively.',
  })
  @Post('firebase-sync')
  async firebaseSync(@Body('idToken') idToken: string) {
    try {
      return await this.authService.validateFirebaseUser(idToken);
    } catch (e: any) {
      throw new HttpException('Firebase conversion rejected structure.', HttpStatus.UNAUTHORIZED);
    }
  }

  /**
   * GET /api/auth/api-keys
   * Retrieves all API keys for the current user.
   */
  @ApiOperation({
    summary: 'List API Keys',
    description: 'Retrieves all persistent API keys associated with the current user account.',
  })
  @ApiBearerAuth()
  @Get('api-keys')
  @UseGuards(JwtAuthGuard)
  async listApiKeys(@Request() req: any) {
    return this.apiKeyService.findAllForUser(req.user.userId);
  }

  /**
   * POST /api/auth/api-keys
   * Generates a new named API key.
   */
  @ApiOperation({
    summary: 'Create New API Key',
    description: 'Generates a new persistent API key with a 30-day TTL.',
  })
  @ApiBearerAuth()
  @Post('api-keys')
  @UseGuards(JwtAuthGuard)
  async createApiKey(@Body('name') name: string, @Request() req: any) {
    if (!name) throw new HttpException('Key name is required.', HttpStatus.BAD_REQUEST);
    return this.apiKeyService.create(req.user.userId, name);
  }

  /**
   * DELETE /api/auth/api-keys/:id
   * Revokes an API key.
   */
  @ApiOperation({
    summary: 'Revoke API Key',
    description: 'Permanently deletes an API key, invalidating it for future requests.',
  })
  @ApiBearerAuth()
  @Delete('api-keys/:id')
  @UseGuards(JwtAuthGuard)
  async deleteApiKey(@Param('id') id: string, @Request() req: any) {
    await this.apiKeyService.delete(id, req.user.userId);
    return { message: 'API Key revoked successfully.' };
  }

  /**
   * POST /api/auth/onboard
   * Onboard student with name, cohortName, cohortEmail
   */
  @ApiOperation({
    summary: 'Onboard Student Profile',
    description: 'Registers academic cohort name and email for a student after successful sign up.',
  })
  @ApiBearerAuth()
  @Post('onboard')
  @UseGuards(JwtAuthGuard)
  async onboardUser(@Body() dto: OnboardDto, @Request() req: any) {
    try {
      return await this.authService.onboardUser(req.user.userId, dto);
    } catch (e: any) {
      throw new HttpException(e.message || 'Onboarding update failed.', HttpStatus.BAD_REQUEST);
    }
  }
}
