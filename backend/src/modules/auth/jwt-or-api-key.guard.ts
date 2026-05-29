import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { ApiKeyService } from './api-key.service';

/**
 * Hybrid Guard: 
 * Will authenticate using either `Authorization: Bearer <jwt>` OR `x-api-key: <key>`.
 * Useful for Developer APIs exposed to both the frontend interface and headless external services.
 */
@Injectable()
export class JwtOrApiKeyGuard extends AuthGuard('jwt') {
  constructor(
    private readonly authService: AuthService,
    private readonly apiKeyService: ApiKeyService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (apiKey) {
      if (apiKey === (process.env.INTERNAL_BOT_API_KEY || 'vsakha_internal_bot_secret')) {
        request.user = { userId: 'internal_bot', role: 'admin', name: 'Internal Bot Service' };
        return true;
      }

      // Validate API Key via the new persistent service
      const user = await this.apiKeyService.validate(apiKey as string);
      if (user) {
        // Mock token payload format to fulfill standard req.user expectations
        request.user = {
          userId: user._id.toString(),
          email: (user as any).email,
          role: (user as any).role,
          name: (user as any).name,
        };
        return true;
      }
      throw new UnauthorizedException('Invalid API Key provided.');
    }

    // Fallback to standard Passport JWT validation (reads Authorization header)
    try {
      const isJwtValid = await super.canActivate(context);
      return isJwtValid as boolean;
    } catch (e) {
      throw new UnauthorizedException('Valid JWT or x-api-key header required.');
    }
  }
}
