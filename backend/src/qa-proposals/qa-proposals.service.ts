import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  QaProposal,
  QaProposalDocument,
  ProposalStatus,
  UserAttribution,
} from './schemas/qa-proposal.schema';
import { CreateProposalDto, BulkCreateProposalDto, ReviewProposalDto } from './dto/proposal.dto';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class QaProposalsService {
  private readonly logger = new Logger(QaProposalsService.name);

  constructor(
    @InjectModel(QaProposal.name)
    private proposalModel: Model<QaProposalDocument>,
    @InjectConnection()
    private readonly connection: Connection,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly cache: CacheService,
  ) { }

  /**
   * @description Submits a new QA pair proposal for administrative review (US11).
   * @param dto Structured question/answer payload.
   * @param proposedBy Attribution metadata for the submitting Lab Member.
   */
  async create(dto: CreateProposalDto, proposedBy?: UserAttribution): Promise<QaProposal> {
    const proposal = new this.proposalModel({
      ...dto,
      status: ProposalStatus.PENDING,
      proposedBy,
    });
    const result = await proposal.save();
    await this.cache.invalidatePattern('vs:qa:*');
    return result;
  }

  /**
   * @description Identical to create but optimized for batch ingestion of multiple proposals.
   */
  async createBulk(proposals: BulkCreateProposalDto[], proposedBy?: UserAttribution): Promise<QaProposal[]> {
    const docs = proposals.map((p) => ({
      ...p,
      status: ProposalStatus.PENDING,
      proposedBy,
    }));
    const result = await this.proposalModel.insertMany(docs);
    await this.cache.invalidatePattern('vs:qa:*');
    return result as unknown as QaProposal[];
  }

  /**
   * @description Lists proposals, optionally filtered by their lifecycle status (PENDING/APPROVED).
   */
  async findAll(status?: ProposalStatus, limit = 100, skip = 0): Promise<QaProposal[]> {
    const query = status ? { status } : {};
    return this.proposalModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  /**
   * Find proposal by ID
   */
  async findById(id: string): Promise<QaProposal | null> {
    return this.proposalModel.findById(id).exec();
  }

  /**
   * @description Returns numerical count of proposals for dashboard US14 analytics.
   */
  async count(status?: ProposalStatus): Promise<number> {
    const query = status ? { status } : {};
    return this.proposalModel.countDocuments(query).exec();
  }

  /**
   * @description Transition a proposal to APPROVED (US11).
   * This method triggers a sidecar embedding operation and inserts the node into the live RAG index.
   * @param reviewedBy Attribution metadata for the approving Admin.
   */
  async approve(
    id: string,
    reviewedBy: UserAttribution,
    dto?: ReviewProposalDto,
  ): Promise<{ proposal: QaProposal; insertedId: string } | null> {
    const proposal = await this.proposalModel.findById(id).exec();
    if (!proposal) return null;

    // Generate embedding via FastAPI RAG server
    const embeddingText = `${proposal.question} ${proposal.answer}`;
    const embedding = await this.generateEmbedding(embeddingText);

    // Insert into qa_pairs_v2 (same collection used by rebuild_embeddings.py)
    const collection = this.connection.db!.collection('qa_pairs_v2');
    const insertResult = await collection.insertOne({
      _id: proposal._id,
      question: proposal.question,
      answer: proposal.answer,
      category: 'General',
      embedding,
      source: 'labmember',
      model: 'BAAI/bge-small-en-v1.5',
      dimensions: embedding.length,
      created_at: new Date(),
    });

    // Update proposal status and reviewer attribution
    proposal.status = ProposalStatus.APPROVED;
    proposal.reviewedAt = new Date();
    proposal.reviewedBy = reviewedBy;
    await proposal.save();
    await this.cache.invalidatePattern('vs:qa:*');

    return { proposal, insertedId: insertResult.insertedId.toString() };
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const ragApiUrl =
      this.configService.get<string>('EMBEDDING_SIDECAR_URL') ??
      this.configService.get<string>('RAG_API_URL') ??
      'http://localhost:8001';
    try {
      const response = await firstValueFrom(
        this.httpService.post<{ embedding: number[] }>(`${ragApiUrl}/embed`, { text }),
      );
      return response.data.embedding;
    } catch (err) {
      this.logger.warn(`Embedding generation failed (RAG API at ${ragApiUrl}): ${(err as Error).message}. Storing without embedding.`);
      return [];
    }
  }

  /**
   * @description Transition a proposal to REJECTED (US11).
   * @param reviewedBy Attribution metadata for the rejecting Admin.
   */
  async reject(
    id: string,
    reviewedBy: UserAttribution,
    dto?: ReviewProposalDto,
  ): Promise<QaProposal | null> {
    const proposal = await this.proposalModel.findById(id).exec();
    if (!proposal) return null;

    proposal.status = ProposalStatus.REJECTED;
    proposal.reviewedAt = new Date();
    proposal.reviewedBy = reviewedBy;
    if (dto?.rejectionReason) proposal.rejectionReason = dto.rejectionReason;

    const result = await proposal.save();
    await this.cache.invalidatePattern('vs:qa:*');
    return result;
  }

  /**
   * Delete a proposal
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.proposalModel.findByIdAndDelete(id).exec();
    await this.cache.invalidatePattern('vs:qa:*');
    return !!result;
  }

  /**
   * @description Aggregated status counts for the administrative Knowledge Audit dashboard.
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    return this.cache.wrap('vs:qa:stats', 300, async () => {
      const [total, pending, approved, rejected] = await Promise.all([
        this.count(),
        this.count(ProposalStatus.PENDING),
        this.count(ProposalStatus.APPROVED),
        this.count(ProposalStatus.REJECTED),
      ]);
      return { total, pending, approved, rejected };
    });
  }
}
