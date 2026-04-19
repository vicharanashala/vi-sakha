import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ApiKeyService } from './api-key.service';
import { ApiKey, ApiKeySchema } from './schemas/api-key.schema';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { UsersModule } from '../users/users.module';
import { FirebaseAdminService } from './firebase-admin.service';

@Global()
@Module({
  imports: [
    UsersModule,
    ConfigModule,
    MongooseModule.forFeature([{ name: ApiKey.name, schema: ApiKeySchema }]),
    PassportModule.register({ session: false }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') ?? 'change-me-in-production',
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, ApiKeyService, JwtStrategy, FirebaseAdminService],
  exports: [AuthService, ApiKeyService, JwtModule, FirebaseAdminService],
})
export class AuthModule { }
