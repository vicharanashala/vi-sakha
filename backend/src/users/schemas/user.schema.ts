import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  STUDENT = 'student',
  LAB_MEMBER = 'lab_member',
  ADMIN = 'admin',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  FIREBASE = 'firebase',
}

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop()
  password?: string;

  @Prop()
  firebaseUid?: string;

  @Prop({ required: true, enum: Object.values(UserRole), default: UserRole.STUDENT })
  role!: UserRole;

  @Prop({ required: true, enum: Object.values(AuthProvider), default: AuthProvider.LOCAL })
  provider!: AuthProvider;

  @Prop({ default: true })
  isApproved!: boolean;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: String })
  createdBy?: string; // userId of admin who created this user

  @Prop({ type: String })
  avatar?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
