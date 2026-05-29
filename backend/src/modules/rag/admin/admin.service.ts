import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../users/users.service';
import { EmbeddingWorkerService } from '../embedding-worker/embedding-worker.service';
import { FirebaseAdminService } from '../../auth/firebase-admin.service';
import { AuthProvider, UserRole } from '../../users/schemas/user.schema';
import { CreateLabMemberDto, UpdateLabMemberDto, UpdateQaPairDto } from './dto/admin.dto';

const QA_COLLECTION = 'qa_pairs_v2';
const EMBEDDING_MODEL = 'BAAI/bge-small-en-v1.5';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  /**
   * @description Centralized governance for lab member identities and knowledge auditing.
   * Orchestrates multi-store operations across MongoDB, Firebase, and the Embedding Sidecar.
   */
  constructor(
    private readonly usersService: UsersService,
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly embeddingWorker: EmbeddingWorkerService,
    @InjectConnection() private readonly connection: Connection,
  ) { }

  // ── Users ────────────────────────────────────────────────────────────────────

  /**
   * @description Lists all system users for administrative auditing.
   * @returns Array of localized User documents.
   */
  async listAllUsers() {
    return this.usersService.findAll();
  }

  /**
   * @description Modifies a user's systemic role (e.g. promoting a student to lab_member).
   * Includes safety guard to prevent removing the system's final administrator.
   */
  async changeRole(targetId: string, newRole: UserRole, requesterId: string) {
    if (targetId === requesterId) {
      throw new ForbiddenException('You cannot change your own role');
    }

    // Prevent removing the last admin
    if (newRole !== UserRole.ADMIN) {
      const target = await this.usersService.findById(targetId);
      if (!target) throw new NotFoundException('User not found');
      if (target.role === UserRole.ADMIN) {
        const adminCount = await this.usersService.countByRole(UserRole.ADMIN);
        if (adminCount <= 1) {
          throw new BadRequestException('Cannot remove the last admin');
        }
      }
    }

    const updated = await this.usersService.updateRole(targetId, newRole);
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  /**
   * @description Toggles user account activation status for security lockdowns.
   */
  async setUserStatus(targetId: string, isActive: boolean, requesterId: string) {
    if (targetId === requesterId) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    const target = await this.usersService.findById(targetId);
    if (!target) throw new NotFoundException('User not found');

    // Prevent deactivating the last admin
    if (!isActive && target.role === UserRole.ADMIN) {
      const adminCount = await this.usersService.countByRole(UserRole.ADMIN);
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot deactivate the last admin');
      }
    }

    const updated = await this.usersService.setActive(targetId, isActive);
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  /**
   * @description Permanently purges a user from both local and external trust stores.
   */
  async deleteUser(targetId: string, requesterId: string) {
    if (targetId === requesterId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const target = await this.usersService.findById(targetId);
    if (!target) throw new NotFoundException('User not found');

    if (target.role === UserRole.ADMIN) {
      const adminCount = await this.usersService.countByRole(UserRole.ADMIN);
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot delete the last admin');
      }
    }

    await this.usersService.deleteUser(targetId);
    return { deleted: true };
  }

  // ── Lab Members ──────────────────────────────────────────────────────────────

  /**
   * @description Filters identity list specifically for Lab Members (US11).
   */
  async listLabMembers() {
    return this.usersService.findAll(UserRole.LAB_MEMBER);
  }

  /**
   * @description Orchestrates the simultaneous creation of a Lab Member in Firebase and MongoDB.
   * Ensures atomicity by cleaning up Firebase if localized persistence fails.
   */
  async createLabMember(dto: CreateLabMemberDto, adminId: string) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    // 1. Create in Firebase
    let firebaseUser;
    try {
      firebaseUser = await this.firebaseAdmin.createUser({
        email: dto.email,
        password: dto.password,
        displayName: dto.name,
        emailVerified: true,
      });
    } catch (error: any) {
      this.logger.error(`Firebase creation failed: ${error.message}`);
      throw new BadRequestException(`Firebase account creation failed: ${error.message}`);
    }

    // 2. Create in MongoDB linked to Firebase
    try {
      return await this.usersService.create({
        name: dto.name,
        email: dto.email,
        role: UserRole.LAB_MEMBER,
        provider: AuthProvider.FIREBASE,
        firebaseUid: firebaseUser.uid,
        createdBy: adminId,
      });
    } catch (error) {
      // Cleanup Firebase if DB fails
      await this.firebaseAdmin.deleteUser(firebaseUser.uid);
      throw error;
    }
  }

  /**
   * @description Updates Lab Member profile data across identity providers.
   */
  async updateLabMember(id: string, dto: UpdateLabMemberDto) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('Lab member not found');
    if (user.role !== UserRole.LAB_MEMBER) {
      throw new BadRequestException('User is not a lab member');
    }

    // If password provided, update in Firebase too
    if (dto.password && user.firebaseUid) {
      try {
        await this.firebaseAdmin.updateUser(user.firebaseUid, {
          password: dto.password,
        });
      } catch (error: any) {
        this.logger.error(`Firebase password update failed: ${error.message}`);
        throw new BadRequestException(`Failed to update Firebase password: ${error.message}`);
      }
    }

    const updated = await this.usersService.updateUser(id, dto);
    if (!updated) throw new NotFoundException('Lab member not found');
    return updated;
  }

  /**
   * @description Decommissioning workflow for Lab Member accounts.
   */
  async deleteLabMember(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('Lab member not found');
    if (user.role !== UserRole.LAB_MEMBER) {
      throw new BadRequestException('User is not a lab member');
    }

    // Delete from Firebase if exists
    if (user.firebaseUid) {
      try {
        await this.firebaseAdmin.deleteUser(user.firebaseUid);
      } catch (error: any) {
        this.logger.warn(`Firebase user deletion failed for ${user.email}: ${error.message}`);
        // We continue anyway to ensure DB consistency
      }
    }

    await this.usersService.deleteUser(id);
    return { deleted: true };
  }

  // ── Analytics ────────────────────────────────────────────────────────────────

  /**
   * @description Aggregates volumetric stats across the identity store for US14 reporting.
   */
  async getStats() {
    const [total, students, labMembers, admins] = await Promise.all([
      this.usersService.countAll(),
      this.usersService.countByRole(UserRole.STUDENT),
      this.usersService.countByRole(UserRole.LAB_MEMBER),
      this.usersService.countByRole(UserRole.ADMIN),
    ]);

    return { total, students, labMembers, admins };
  }

  // ── QA Pairs (qa_pairs_v2) ─────────────────────────────────────────────────

  private get qaCollection() {
    return this.connection.db!.collection(QA_COLLECTION);
  }

  /**
   * @description Paginated retrieval of the "v2" knowledge base entries.
   * Excludes raw embeddings from the default response for performance optimization.
   */
  async listQaPairs(page = 1, limit = 20, search?: string) {
    const filter: Record<string, any> = {};
    if (search) {
      filter.$or = [
        { question: { $regex: search, $options: 'i' } },
        { answer: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.qaCollection
        .find(filter, { projection: { embedding: 0 } })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.qaCollection.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /**
   * @description Performs a non-destructive update of a QA node.
   * Automatically triggers a sidecar embedding regeneration for semantic consistency (US6).
   */
  async updateQaPair(id: string, dto: UpdateQaPairDto) {
    const objectId = new Types.ObjectId(id);
    const existing = await this.qaCollection.findOne({ _id: objectId });
    if (!existing) throw new NotFoundException('QA pair not found');

    const question = dto.question ?? existing.question;
    const answer = dto.answer ?? existing.answer;
    const category = dto.category ?? existing.category;

    // Regenerate embedding for the updated content
    const embeddingText = `${question} ${answer}`;
    const embedding = await this.embeddingWorker.embedOne(embeddingText);

    if (!embedding.length) {
      this.logger.warn(`Embedding sidecar returned empty result for QA pair ${id}. Aborting update.`);
      throw new BadRequestException(
        'Embedding generation failed — ensure the embedding sidecar is running (uvicorn bot.rag.embed_sidecar:app --port 8001)',
      );
    }

    await this.qaCollection.updateOne(
      { _id: objectId },
      {
        $set: {
          question,
          answer,
          category,
          embedding,
          model: EMBEDDING_MODEL,
          dimensions: embedding.length,
          updated_at: new Date(),
        },
      },
    );

    // Return updated doc without embedding
    const updated = await this.qaCollection.findOne(
      { _id: objectId },
      { projection: { embedding: 0 } },
    );
    return updated;
  }

  /**
   * @description Removes a specific node from the verified knowledge index.
   */
  async deleteQaPair(id: string) {
    const objectId = new Types.ObjectId(id);
    const result = await this.qaCollection.deleteOne({ _id: objectId });
    if (result.deletedCount === 0) {
      throw new NotFoundException('QA pair not found');
    }
    return { deleted: true };
  }

  // ── Advanced Analytics ───────────────────────────────────────────────────

  /**
   * @description Fetches the historical growth of QA pairs (qa_pairs_v2) for visualization.
   * Aggregates by creation day to show total accumulated entries over time.
   */
  async getQaGrowth() {
    return this.qaCollection.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$created_at' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          count: 1,
          _id: 0,
        },
      },
    ]).toArray();
  }

  /**
   * @description Tracks resolution metrics for lab members.
   * Filters specifically for in-app tickets (excluding Discord) that reached a RESOLVED state.
   */
  async getLabMemberPerformance() {
    const ticketsCollection = this.connection.db!.collection('tickets');
    
    return ticketsCollection.aggregate([
      {
        $match: {
          status: 'resolved',
          resolvedBy: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$resolvedBy', // resolvedBy usually stores the name/ID
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          name: '$_id',
          count: 1,
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]).toArray();
  }
}
