import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, UserRole, AuthProvider } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) { }

  /**
   * @description Retrieves a user document by their normalized email address.
   * @param email Valid scholastic email string.
   * @returns Mongoose Document or null if not found.
   */
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  /**
   * @description Retrieves a user by their MongoDB ObjectId.
   * @param id MongoDB Hexadecimal string.
   */
  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  /**
   * @description Master identity creation method. Synchronizes database state with 
   * Firebase and Google provider data (US13).
   * @param data Structured identity payload including optional avatar and provider flags.
   */
  async create(data: {
    name: string;
    email: string;
    password?: string;
    role?: UserRole;
    provider?: AuthProvider;
    firebaseUid?: string;
    createdBy?: string;
    avatar?: string;
  }): Promise<UserDocument> {
    const user = new this.userModel({
      name: data.name,
      email: data.email.toLowerCase(),
      password: data.password,
      role: data.role ?? UserRole.STUDENT,
      provider: data.provider ?? AuthProvider.LOCAL,
      firebaseUid: data.firebaseUid,
      isApproved: true,
      isActive: true,
      createdBy: data.createdBy,
      avatar: data.avatar,
    });
    return user.save();
  }

  /**
   * @description Lists all users, optionally filtered by systemic role.
   * @whereUsed AdminService (US11 Management Panel)
   */
  async findAll(role?: UserRole): Promise<UserDocument[]> {
    const query = role ? { role } : {};
    return this.userModel.find(query).select('-password').exec();
  }

  /**
   * @description Updates a user's systemic role (US11).
   * @param id Target user ID.
   * @param role The new role to be assigned.
   */
  async updateRole(id: string, role: UserRole): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(id, { role }, { new: true })
      .select('-password')
      .exec();
  }

  /**
   * @description Enables or disables a user account for security auditing.
   */
  async setActive(id: string, isActive: boolean): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(id, { isActive }, { new: true })
      .select('-password')
      .exec();
  }

  /**
   * @description General-purpose profile update method.
   * Ensures passwords are re-hashed if changed during update.
   */
  async updateUser(
    id: string,
    data: Partial<{ name: string; email: string; password: string; role: UserRole; avatar: string }>,
  ): Promise<UserDocument | null> {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    if (data.email) {
      data.email = data.email.toLowerCase();
    }
    return this.userModel
      .findByIdAndUpdate(id, data, { new: true })
      .select('-password')
      .exec();
  }

  /**
   * @description Permanently deletes a user from the local store.
   */
  async deleteUser(id: string): Promise<UserDocument | null> {
    return this.userModel.findByIdAndDelete(id).exec();
  }

  /**
   * @description Returns the total number of registered identities.
   */
  async countAll(): Promise<number> {
    return this.userModel.countDocuments().exec();
  }

  /**
   * @description Returns total count of users matching a specific role (US14).
   */
  async countByRole(role: UserRole): Promise<number> {
    return this.userModel.countDocuments({ role }).exec();
  }

  /**
   * @description Bootstraps the system by ensuring at least one admin exists.
   * Creates a default admin: admin@local.com / password
   */
  async ensureAdminExists(): Promise<void> {
    const existing = await this.findByEmail('admin@local.com');
    if (!existing) {
      const hashed = await bcrypt.hash('password', 10);
      await this.create({
        name: 'Admin',
        email: 'admin@local.com',
        password: hashed,
        role: UserRole.ADMIN,
        provider: AuthProvider.LOCAL,
      });
      console.log('[Bootstrap] Default admin created: admin@local.com / password');
    }
  }
}
