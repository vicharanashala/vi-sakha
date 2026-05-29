import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QaProposalDocument = QaProposal & Document;

export enum ProposalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export class UserAttribution {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  role!: string;
}

@Schema({ timestamps: true, collection: 'qa_proposals' })
export class QaProposal {
  @Prop({ required: true })
  question!: string;

  @Prop({ required: true })
  answer!: string;

  @Prop({ required: true, enum: ProposalStatus, default: ProposalStatus.PENDING })
  status!: ProposalStatus;

  @Prop()
  title?: string;

  // ── Attribution ──────────────────────────────────────────────────────────

  /** Who proposed this Q&A pair (populated from auth context). */
  @Prop({ type: Object })
  proposedBy?: UserAttribution;

  /** Who approved / rejected this proposal (populated on review). */
  @Prop({ type: Object })
  reviewedBy?: UserAttribution;

  @Prop()
  reviewedAt?: Date;

  @Prop()
  rejectionReason?: string;

  // ── Legacy ───────────────────────────────────────────────────────────────
  // Kept for backward compatibility with older documents; no longer written.

  @Prop()
  source?: string;

  @Prop()
  submittedBy?: string;

  // ── Timestamps (managed by Mongoose) ─────────────────────────────────────

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const QaProposalSchema = SchemaFactory.createForClass(QaProposal);

// Indexes
QaProposalSchema.index({ status: 1 });
QaProposalSchema.index({ 'proposedBy.userId': 1 });
QaProposalSchema.index({ question: 'text', answer: 'text' });
