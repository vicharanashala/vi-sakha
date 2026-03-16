import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationSource } from './plugins/plugin.interface';

@Controller('conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  private parseSource(source?: string): ConversationSource | undefined {
    if (!source || source === 'all') {
      return undefined;
    }

    if (source === 'rag' || source === 'discord' || source === 'librechat') {
      return source;
    }

    throw new BadRequestException('source must be one of: rag, discord, librechat, all');
  }

  @Get()
  async getConversations(
    @Query('source') source?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.conversationService.getAllConversations(
      this.parseSource(source),
      Number.parseInt(page ?? '1', 10),
      Number.parseInt(limit ?? '20', 10),
    );
  }

  @Get('refresh')
  async refreshConversations(
    @Query('source') source?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.conversationService.refreshConversations(
      this.parseSource(source),
      Number.parseInt(page ?? '1', 10),
      Number.parseInt(limit ?? '20', 10),
    );
  }

  @Get('stats')
  async getConversationStats(@Query('refresh') refresh?: string) {
    return this.conversationService.getConversationStats(refresh === 'true');
  }

  @Get(':source/:conversationId')
  async getConversationDetail(
    @Param('source') source: string,
    @Param('conversationId') conversationId: string,
  ) {
    const parsedSource = this.parseSource(source);
    if (!parsedSource) {
      throw new BadRequestException('source must be one of: rag, discord, librechat');
    }

    return this.conversationService.getConversationDetail(parsedSource, conversationId);
  }
}
