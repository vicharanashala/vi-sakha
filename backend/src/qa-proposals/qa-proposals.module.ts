import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QaProposalsController } from './qa-proposals.controller';
import { QaProposalsService } from './qa-proposals.service';
import { QaProposal, QaProposalSchema } from './schemas/qa-proposal.schema';
import { QaPair, QaPairSchema } from '../qa-pairs/schemas/qa-pair.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: QaProposal.name, schema: QaProposalSchema },
      { name: QaPair.name, schema: QaPairSchema }, // For approval flow
    ]),
  ],
  controllers: [QaProposalsController],
  providers: [QaProposalsService],
  exports: [QaProposalsService],
})
export class QaProposalsModule {}
