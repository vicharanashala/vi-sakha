import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../../users/users.module';
import { AuthModule } from '../../auth/auth.module';
import { EmbeddingWorkerModule } from '../embedding-worker/embedding-worker.module';

@Module({
  // Aggregates user management, firebase authentication, and GenAI embedding worker logic.
  imports: [UsersModule, AuthModule, EmbeddingWorkerModule],
  // Exposes REST endpoints for administrative orchestration.
  controllers: [AdminController],
  // Provides the core business logic for staff management and knowledge auditing.
  providers: [AdminService],
})
export class AdminModule { }
