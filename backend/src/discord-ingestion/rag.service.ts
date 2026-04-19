import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';

import {
  QaProposal,
  QaProposalDocument,
  ProposalStatus,
} from '../qa-proposals/schemas/qa-proposal.schema';
import { DiscordConversationDocument } from './schemas/discord-conversation.schema';

interface AnthropicContent {
  type: string;
  text: string;
}

interface AnthropicResponse {
  content: AnthropicContent[];
}

interface QaPair {
  question: string;
  answer: string;
}

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const GENERATION_MODEL = 'claude-haiku-4-5-20251001';

/**
 * Drives the RAG pipeline after a transcript is ingested:
 *   1. Build a plain-text transcript from the conversation.
 *   2. Call Anthropic to extract FAQ Q&A pairs.
 *   3. Persist results as QaProposal documents (status = PENDING).
 *
 * Embedding generation is handled by the Python pipeline on approval.
 */
@Injectable()
export class DiscordRagService {
  private readonly logger = new Logger(DiscordRagService.name);

  constructor(
    @InjectModel(QaProposal.name)
    private readonly qaProposalModel: Model<QaProposalDocument>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async generateEmbeddings(
    conversation: DiscordConversationDocument,
  ): Promise<void> {
    if (!conversation.messages?.length) {
      this.logger.warn(
        `Skipping RAG — no messages in ticket #${conversation.ticketNumber}`,
      );
      return;
    }

    try {
      const pairs = await this.generateQaPairs(conversation);
      if (pairs.length > 0) {
        await this.storeQaProposals(pairs, conversation.ticketNumber);
        this.logger.log(
          `Stored ${pairs.length} Q&A proposals for ticket #${conversation.ticketNumber}`,
        );
      } else {
        this.logger.log(
          `No Q&A pairs extracted for ticket #${conversation.ticketNumber}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `RAG pipeline failed for ticket #${conversation.ticketNumber}: ${(err as Error).message}`,
      );
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async generateQaPairs(
    conversation: DiscordConversationDocument,
  ): Promise<QaPair[]> {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'ANTHROPIC_API_KEY not configured — skipping Q&A generation',
      );
      return [];
    }

    const transcript = this.buildTranscriptText(conversation);
    if (!transcript) return [];

    const prompt = `You are analyzing a Discord support ticket from a student internship program (VInternship).
Extract reusable FAQ pairs that would help future students with similar questions.

CONVERSATION (ticket #${conversation.ticketNumber}):
${transcript}

Generate up to 5 high-quality Q&A pairs. Focus on:
- Specific questions students asked
- Clear, actionable answers given by mentors/agents
- Knowledge transferable to future cohorts

Return ONLY a valid JSON array — no prose, no markdown fences:
[
  {"question": "...", "answer": "..."}
]
If no useful Q&A can be extracted return an empty array: []`;

    const response = await firstValueFrom(
      this.httpService.post<AnthropicResponse>(
        ANTHROPIC_API_URL,
        {
          model: GENERATION_MODEL,
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        },
        {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': ANTHROPIC_VERSION,
            'content-type': 'application/json',
          },
        },
      ),
    );

    const rawText = response.data.content[0]?.text ?? '[]';

    // Be permissive: extract the first JSON array found even if model adds prose
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    try {
      const parsed = JSON.parse(jsonMatch[0]) as unknown[];
      return parsed.filter(
        (item): item is QaPair =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as QaPair).question === 'string' &&
          typeof (item as QaPair).answer === 'string',
      );
    } catch {
      this.logger.warn('Failed to parse Q&A JSON from Anthropic response');
      return [];
    }
  }

  private buildTranscriptText(
    conversation: DiscordConversationDocument,
  ): string {
    return conversation.messages
      .filter((m) => m.text?.trim())
      .map((m) => {
        const label =
          m.role === 'user'
            ? 'Student'
            : m.role === 'agent'
              ? 'Mentor'
              : 'System';
        return `[${label}]: ${m.text}`;
      })
      .join('\n');
  }

  private async storeQaProposals(
    pairs: QaPair[],
    ticketNumber: string,
  ): Promise<void> {
    const docs = pairs.map((pair) => ({
      question: pair.question,
      answer: pair.answer,
      source: `discord_ticket_${ticketNumber}`,
      status: ProposalStatus.PENDING,
      title: pair.question.substring(0, 80),
      submittedBy: 'discord_ingestion_system',
    }));

    await this.qaProposalModel.insertMany(docs);
  }
}
