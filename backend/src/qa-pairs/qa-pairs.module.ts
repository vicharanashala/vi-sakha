import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QaPair, QaPairSchema } from './schemas/qa-pair.schema';
import { QaPairsService } from './qa-pairs.service';
import { QaPairsController } from './qa-pairs.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: QaPair.name, schema: QaPairSchema }]),
  ],
  controllers: [QaPairsController],
  providers: [QaPairsService],
  exports: [QaPairsService],
})
export class QaPairsModule {}
