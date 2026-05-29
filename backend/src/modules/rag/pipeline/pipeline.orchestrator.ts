import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { EmbeddingWorkerService } from '../embedding-worker/embedding-worker.service';
import {
  DiscordConversation,
  DiscordConversationDocument,
} from '../../discord/schemas/discord-conversation.schema';
import {
  QaProposal,
  QaProposalDocument,
  ProposalStatus,
} from '../qa-proposals/schemas/qa-proposal.schema';

export type RunMode = 'backfill_embeddings' | 'extract_qa' | 'full';

export interface PipelineRunResult {
  mode: RunMode;
  startedAt: Date;
  completedAt: Date;
  stats: Record<string, number>;
  errors: string[];
}

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
const QA_CONCURRENCY = 5;

@Injectable()
export class PipelineOrchestrator {
  private readonly logger = new Logger(PipelineOrchestrator.name);
  private isRunning = false;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(DiscordConversation.name)
    private readonly convModel: Model<DiscordConversationDocument>,
    @InjectModel(QaProposal.name)
    private readonly proposalModel: Model<QaProposalDocument>,
    private readonly embeddingWorker: EmbeddingWorkerService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  get busy(): boolean {
    return this.isRunning;
  }

  async run(mode: RunMode): Promise<PipelineRunResult> {
    if (this.isRunning) {
      throw new Error('A pipeline run is already in progress');
    }

    this.isRunning = true;
    const startedAt = new Date();
    const errors: string[] = [];
    const stats: Record<string, number> = {};

    try {
      if (mode === 'backfill_embeddings' || mode === 'full') {
        const embeddingStats = await this.backfillEmbeddings(errors);
        Object.assign(stats, embeddingStats);
      }

      if (mode === 'extract_qa' || mode === 'full') {
        const qaStats = await this.batchExtractQa(errors);
        Object.assign(stats, qaStats);
      }
    } finally {
      this.isRunning = false;
    }

    return { mode, startedAt, completedAt: new Date(), stats, errors };
  }

  // ── Stage 1: Backfill embeddings for qa_pairs_v2 with empty vectors ─────────

  private async backfillEmbeddings(
    errors: string[],
  ): Promise<Record<string, number>> {
    const collection = this.connection.db!.collection('qa_pairs_v2');

    // Find records missing or having empty embeddings
    const candidates = await collection
      .find({
        $or: [
          { embedding: { $exists: false } },
          { embedding: { $size: 0 } },
          { embedding: [] },
        ],
      })
      .toArray();

    this.logger.log(
      `[backfill_embeddings] Found ${candidates.length} qa_pairs_v2 records needing embeddings`,
    );

    if (!candidates.length) return { backfill_candidates: 0, backfill_embedded: 0 };

    let embedded = 0;
    const BATCH_SIZE = 32;

    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE);
      const texts = batch.map(
        (doc) => `${doc.question as string} ${doc.answer as string}`,
      );

      const vectors = await this.embeddingWorker.embedBatch(texts);

      if (!vectors.length) {
        errors.push(
          `Embedding sidecar returned empty for batch at index ${i} — skipping`,
        );
        continue;
      }

      const bulkOps = batch.map((doc, idx) => ({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              embedding: vectors[idx] ?? [],
              dimensions: vectors[idx]?.length ?? 0,
              model: 'BAAI/bge-small-en-v1.5',
            },
          },
        },
      }));

      try {
        await collection.bulkWrite(bulkOps);
        embedded += batch.length;
        this.logger.log(
          `[backfill_embeddings] Embedded batch ${Math.floor(i / BATCH_SIZE) + 1} (${embedded}/${candidates.length})`,
        );
      } catch (err) {
        errors.push(`bulkWrite failed at batch ${i}: ${(err as Error).message}`);
      }
    }

    return { backfill_candidates: candidates.length, backfill_embedded: embedded };
  }

  // ── Stage 2: Q&A extraction for unprocessed conversations ──────────────────

  private async batchExtractQa(
    errors: string[],
  ): Promise<Record<string, number>> {
    // Find closed conversations that have messages but no QaProposals yet
    const processed = await this.proposalModel
      .distinct('source')
      .exec() as string[];

    const processedTickets = new Set(
      processed
        .filter((s) => s.startsWith('discord_ticket_'))
        .map((s) => s.replace('discord_ticket_', '')),
    );

    const conversations = await this.convModel
      .find({
        status: 'closed',
        transcriptProcessed: true,
        'messages.0': { $exists: true },
      })
      .exec();

    const unprocessed = conversations.filter(
      (c) => !processedTickets.has(c.ticketNumber),
    );

    this.logger.log(
      `[extract_qa] ${unprocessed.length} conversations need Q&A extraction (${conversations.length} total closed)`,
    );

    if (!unprocessed.length) return { qa_candidates: 0, qa_proposals_created: 0 };

    let proposalsCreated = 0;

    // Process in chunks of QA_CONCURRENCY
    for (let i = 0; i < unprocessed.length; i += QA_CONCURRENCY) {
      const chunk = unprocessed.slice(i, i + QA_CONCURRENCY);

      const results = await Promise.allSettled(
        chunk.map((conv) => this.extractAndStoreQa(conv)),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          proposalsCreated += result.value;
        } else {
          errors.push(result.reason as string);
        }
      }

      this.logger.log(
        `[extract_qa] Processed ${Math.min(i + QA_CONCURRENCY, unprocessed.length)}/${unprocessed.length}`,
      );
    }

    return {
      qa_candidates: unprocessed.length,
      qa_proposals_created: proposalsCreated,
    };
  }

  private async extractAndStoreQa(
    conversation: DiscordConversationDocument,
  ): Promise<number> {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) return 0;

    const transcript = conversation.messages
      .filter((m: any) => m.text?.trim())
      .map((m: any) => {
        const label =
          m.role === 'user' ? 'Student' : m.role === 'agent' ? 'Mentor' : 'System';
        return `[${label}]: ${m.text}`;
      })
      .join('\n');

    if (!transcript) return 0;

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
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return 0;

    let pairs: QaPair[];
    try {
      const parsed = JSON.parse(jsonMatch[0]) as unknown[];
      pairs = parsed.filter(
        (item): item is QaPair =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as QaPair).question === 'string' &&
          typeof (item as QaPair).answer === 'string',
      );
    } catch {
      return 0;
    }

    if (!pairs.length) return 0;

    const docs = pairs.map((pair) => ({
      question: pair.question,
      answer: pair.answer,
      source: `discord_ticket_${conversation.ticketNumber}`,
      status: ProposalStatus.PENDING,
      title: pair.question.substring(0, 80),
      submittedBy: 'pipeline_backfill',
    }));

    await this.proposalModel.insertMany(docs);
    return pairs.length;
  }
}
