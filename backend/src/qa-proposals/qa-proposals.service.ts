import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  QaProposal,
  QaProposalDocument,
  ProposalStatus,
} from './schemas/qa-proposal.schema';
import { QaPair, QaPairDocument } from '../qa-pairs/schemas/qa-pair.schema';
import { CreateProposalDto, BulkCreateProposalDto, ReviewProposalDto } from './dto/proposal.dto';

@Injectable()
export class QaProposalsService {
  constructor(
    @InjectModel(QaProposal.name)
    private proposalModel: Model<QaProposalDocument>,
    @InjectModel(QaPair.name)
    private qaPairModel: Model<QaPairDocument>,
  ) {}

  /**
   * Create a single proposal
   */
  async create(dto: CreateProposalDto): Promise<QaProposal> {
    const proposal = new this.proposalModel({
      ...dto,
      source: 'LabMember',
      status: ProposalStatus.PENDING,
    });
    return proposal.save();
  }

  /**
   * Bulk create proposals
   */
  async createBulk(proposals: BulkCreateProposalDto[], submittedBy?: string): Promise<QaProposal[]> {
    const docs = proposals.map((p) => ({
      ...p,
      source: 'LabMember',
      status: ProposalStatus.PENDING,
      submittedBy,
    }));
    const result = await this.proposalModel.insertMany(docs);
    return result as unknown as QaProposal[];
  }

  /**
   * Find all proposals with optional status filter
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
   * Count proposals with optional status filter
   */
  async count(status?: ProposalStatus): Promise<number> {
    const query = status ? { status } : {};
    return this.proposalModel.countDocuments(query).exec();
  }

  /**
   * Approve a proposal - moves it to qa_pairs collection
   */
  async approve(id: string, dto?: ReviewProposalDto): Promise<{ proposal: QaProposal; qaPair: QaPair } | null> {
    const proposal = await this.proposalModel.findById(id).exec();
    if (!proposal) return null;

    // Create new QA pair with SAME _id as the proposal for easy tracking
    const qaPair = new this.qaPairModel({
      _id: proposal._id, // Use same _id as proposal
      question: proposal.question,
      answer: proposal.answer,
      source: 'LabMember',
    });
    await qaPair.save();

    // Update proposal status
    proposal.status = ProposalStatus.APPROVED;
    proposal.reviewedAt = new Date();
    if (dto?.reviewedBy) proposal.reviewedBy = dto.reviewedBy;
    await proposal.save();

    return { proposal, qaPair };
  }

  /**
   * Reject a proposal
   */
  async reject(id: string, dto?: ReviewProposalDto): Promise<QaProposal | null> {
    const proposal = await this.proposalModel.findById(id).exec();
    if (!proposal) return null;

    proposal.status = ProposalStatus.REJECTED;
    proposal.reviewedAt = new Date();
    if (dto?.reviewedBy) proposal.reviewedBy = dto.reviewedBy;
    if (dto?.rejectionReason) proposal.rejectionReason = dto.rejectionReason;
    
    return proposal.save();
  }

  /**
   * Delete a proposal
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.proposalModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  /**
   * Get stats for proposals
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    const [total, pending, approved, rejected] = await Promise.all([
      this.count(),
      this.count(ProposalStatus.PENDING),
      this.count(ProposalStatus.APPROVED),
      this.count(ProposalStatus.REJECTED),
    ]);
    return { total, pending, approved, rejected };
  }
}
