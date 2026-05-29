import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { CreateUserDto, LoginDto, RegisterDto } from './dto/auth.dto';
import { AuthProvider, UserDocument, UserRole } from '../users/schemas/user.schema';
import { FirebaseAdminService } from './firebase-admin.service';

/**
 * [AuthService]
 * Centralized governance for identity lifecycle and session tokenization.
 * 
 * Responsibilities:
 * - Orchestrating Firebase external trust workflows (US13).
 * - Validating local credentials against salted BCrypt hashes.
 * - Issuing cryptographically signed JWT payloads for stateful session persistence.
 * - Mapping OAuth2 profile deltas into localized User persistence items.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly firebaseAdmin: FirebaseAdminService,
  ) { }

  /**
   * @description Direct Firebase ID Token integration (US13). 
   * Maps Google OAuth or Firebase accounts to localized session identities.
   * @whereUsed AuthController.firebaseSync (POST /api/auth/firebase-sync)
   */
  async validateFirebaseUser(idToken: string) {
    let decodedToken;
    try {
      decodedToken = await this.firebaseAdmin.verifyIdToken(idToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid Firebase token');
    }

    const { uid, email, name, email_verified, firebase, picture } = decodedToken;

    if (!email_verified && firebase.sign_in_provider !== 'google.com') {
      throw new UnauthorizedException('Email not verified. Please check your inbox.');
    }

    let user = await this.usersService.findByEmail(email!);

    if (!user) {
      // Create new user linked to Firebase
      user = await this.usersService.create({
        name: name || email!.split('@')[0],
        email: email!,
        password: '',
        role: UserRole.STUDENT,
        avatar: picture,
        provider: firebase.sign_in_provider === 'google.com' ? AuthProvider.GOOGLE : AuthProvider.FIREBASE,
        firebaseUid: uid,
      });
    } else if (!user.firebaseUid) {
      // Link existing user to Firebase
      user.firebaseUid = uid;
      user.provider = firebase.sign_in_provider === 'google.com' ? AuthProvider.GOOGLE : AuthProvider.FIREBASE;
      if (picture && !user.avatar) {
        user.avatar = picture;
      }
      await (user as any).save();
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated. Contact an administrator.');
    }

    return this.buildTokenResponse(user);
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: hashed,
      role: UserRole.STUDENT,
      provider: AuthProvider.LOCAL,
    });

    return this.buildTokenResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.password && user.provider !== AuthProvider.LOCAL) {
      throw new UnauthorizedException(`This account uses ${user.provider} sign-in. Please use the appropriate sign-in method.`);
    }

    if (user.password) {
      const valid = await bcrypt.compare(dto.password, user.password);
      if (!valid) {
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated. Contact an administrator.');
    }

    return this.buildTokenResponse(user);
  }

  async createUser(dto: CreateUserDto, adminId: string) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    let firebaseUser;
    try {
      firebaseUser = await this.firebaseAdmin.createUser({
        email: dto.email,
        password: dto.password,
        displayName: dto.name,
        emailVerified: true,
      });
    } catch (error: any) {
      throw new ConflictException(`Firebase creation failed: ${error.message}`);
    }

    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      role: dto.role,
      provider: AuthProvider.FIREBASE,
      firebaseUid: firebaseUser.uid,
      createdBy: adminId,
    });

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      firebaseUid: user.firebaseUid,
    };
  }

  /**
   * @description (Legacy/OAuth fallback) Handles direct Google profile mapping.
   * @param dto Profile data from Google APIs.
   */
  async validateGoogleUser(dto: { googleId: string; email: string; name: string; picture?: string }) {
    let user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      user = await this.usersService.create({
        name: dto.name,
        email: dto.email,
        password: '',
        role: UserRole.STUDENT,
        avatar: dto.picture,
        provider: AuthProvider.GOOGLE,
      });
    } else {
      if (dto.picture && !user.avatar) {
        user.avatar = dto.picture;
        await (user as any).save();
      }
    }

    return this.buildTokenResponse(user);
  }

  async onboardUser(
    userId: string,
    data: { name: string; cohortName: string; cohortEmail?: string },
  ) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const cohortEmail = data.cohortEmail || user.email;

    const updatedUser = await this.usersService.updateUser(userId, {
      name: data.name,
      cohortName: data.cohortName,
      cohortEmail: cohortEmail,
      isOnboarded: true,
    });

    if (!updatedUser) {
      throw new NotFoundException('Failed to update user during onboarding');
    }

    return this.buildTokenResponse(updatedUser);
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      provider: user.provider,
      createdAt: (user as any).createdAt,
      avatar: user.avatar,
      cohortName: user.cohortName,
      cohortEmail: user.cohortEmail,
      isOnboarded: user.isOnboarded,
    };
  }

  private buildTokenResponse(user: UserDocument) {
    const payload = {
      sub: (user._id as any).toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      cohortName: user.cohortName,
      cohortEmail: user.cohortEmail,
      isOnboarded: user.isOnboarded,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: (user as any).avatar,
        cohortName: user.cohortName,
        cohortEmail: user.cohortEmail,
        isOnboarded: user.isOnboarded,
      },
    };
  }
}
