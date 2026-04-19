import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';

@Module({
  // Registers the User schema for use within this module.
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  // Provides UsersService as a shared utility for identity lifecycle management.
  providers: [UsersService],
  // Exports UsersService for cross-module integration (Auth, Admin, etc).
  exports: [UsersService],
})
export class UsersModule { }
