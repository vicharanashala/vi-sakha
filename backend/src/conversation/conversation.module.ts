import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { PluginManagerService } from './plugin-manager.service';
import { DiscordPlugin } from './plugins/discord.plugin';
import { LibreChatPlugin } from './plugins/librechat.plugin';
import { RagPlugin } from './plugins/rag.plugin';
import { Conversation, ConversationSchema } from '../chat/schemas/conversation.schema';
import { Message, MessageSchema } from '../chat/schemas/message.schema';
import { DiscordIngestionModule } from '../discord-ingestion/discord.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    DiscordIngestionModule,
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
  ],
  controllers: [ConversationController],
  providers: [
    ConversationService,
    PluginManagerService,
    DiscordPlugin,
    LibreChatPlugin,
    RagPlugin,
  ],
  exports: [ConversationService, PluginManagerService],
})
export class ConversationModule {}
