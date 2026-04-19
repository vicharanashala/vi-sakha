import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface BatchEmbedResponse {
  embeddings: number[][];
  dimensions: number;
  model: string;
}

/**
 * Thin HTTP client for the Python embedding sidecar (embed_sidecar.py).
 *
 * Configure via env:
 *   EMBEDDING_SIDECAR_URL  (default: http://localhost:8001)
 *
 * Circuit-breaker pattern: any network/HTTP error returns empty arrays and
 * logs a warning instead of throwing — callers must handle [] gracefully.
 */
@Injectable()
export class EmbeddingWorkerService {
  private readonly logger = new Logger(EmbeddingWorkerService.name);
  private readonly sidecarUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.sidecarUrl =
      this.configService.get<string>('EMBEDDING_SIDECAR_URL') ??
      'http://localhost:8001';
  }

  /**
   * Embed a batch of texts.
   * Returns parallel array of vectors; empty array on sidecar failure.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];
    try {
      const response = await firstValueFrom(
        this.httpService.post<BatchEmbedResponse>(
          `${this.sidecarUrl}/embed/batch`,
          { texts },
        ),
      );
      return response.data.embeddings;
    } catch (err) {
      this.logger.warn(
        `Embedding sidecar unreachable at ${this.sidecarUrl}: ${(err as Error).message}`,
      );
      return [];
    }
  }

  /**
   * Embed a single text. Convenience wrapper over embedBatch.
   */
  async embedOne(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0] ?? [];
  }

  async isHealthy(): Promise<boolean> {
    try {
      await firstValueFrom(
        this.httpService.get(`${this.sidecarUrl}/health`),
      );
      return true;
    } catch {
      return false;
    }
  }
}
