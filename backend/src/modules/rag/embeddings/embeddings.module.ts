import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Embedding, EmbeddingSchema } from './schemas/embedding.schema';
import { EmbeddingsService } from './embeddings.service';
import { EmbeddingsController } from './embeddings.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Embedding.name, schema: EmbeddingSchema },
    ]),
  ],
  controllers: [EmbeddingsController],
  providers: [EmbeddingsService],
  exports: [EmbeddingsService],
})
export class EmbeddingsModule {}
