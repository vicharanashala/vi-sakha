import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QaProposalDocument = QaProposal & Document;

export enum ProposalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true, collection: 'qa_proposals' })
export class QaProposal {
  @Prop({ required: true })
  question!: string;

  @Prop({ required: true })
  answer!: string;

  @Prop({ required: true, default: 'LabMember' })
  source!: string;

  @Prop({ required: true, enum: ProposalStatus, default: ProposalStatus.PENDING })
  status!: ProposalStatus;

  @Prop()
  title?: string; // For frontend display only

  @Prop()
  submittedBy?: string; // Future: user ID

  @Prop()
  reviewedBy?: string; // Future: admin who approved/rejected

  @Prop()
  reviewedAt?: Date;

  @Prop()
  rejectionReason?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const QaProposalSchema = SchemaFactory.createForClass(QaProposal);

// Indexes
QaProposalSchema.index({ status: 1 });
QaProposalSchema.index({ source: 1 });
QaProposalSchema.index({ submittedBy: 1 });
QaProposalSchema.index({ question: 'text', answer: 'text' });
