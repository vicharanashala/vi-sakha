import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { QaPairsModule } from './qa-pairs/qa-pairs.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { QaProposalsModule } from './qa-proposals/qa-proposals.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    // Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // MongoDB connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    QaPairsModule,
    EmbeddingsModule,
    QaProposalsModule,
    ChatModule,
  ],
})
export class AppModule {}
