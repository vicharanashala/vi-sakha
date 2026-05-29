import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { QaProposalsController } from './qa-proposals.controller';
import { QaProposalsService } from './qa-proposals.service';
import { QaProposal, QaProposalSchema } from './schemas/qa-proposal.schema';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    MongooseModule.forFeature([
      { name: QaProposal.name, schema: QaProposalSchema },
    ]),
  ],
  controllers: [QaProposalsController],
  providers: [QaProposalsService],
  exports: [QaProposalsService, MongooseModule],
})
export class QaProposalsModule { }
