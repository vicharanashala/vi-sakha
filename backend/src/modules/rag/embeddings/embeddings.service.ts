import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Embedding, EmbeddingDocument } from './schemas/embedding.schema';

@Injectable()
export class EmbeddingsService {
  constructor(
    @InjectModel(Embedding.name)
    private embeddingModel: Model<EmbeddingDocument>,
  ) {}

  async findAll(limit = 100, skip = 0): Promise<Embedding[]> {
    // Return without embedding vectors for list (too large)
    return this.embeddingModel
      .find()
      .select('-embedding')
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async findOne(id: string): Promise<Embedding | null> {
    return this.embeddingModel.findById(id).exec();
  }

  async findByQaPairId(qaPairId: string): Promise<Embedding | null> {
    return this.embeddingModel.findOne({ qa_pair_id: qaPairId }).exec();
  }

  async count(): Promise<number> {
    return this.embeddingModel.countDocuments().exec();
  }

  async getMetadata(): Promise<{
    count: number;
    dimensions: number | null;
  }> {
    const count = await this.count();
    const sample = await this.embeddingModel.findOne().exec();
    return {
      count,
      dimensions: sample?.dimensions || null,
    };
  }

  async create(data: Partial<Embedding>): Promise<Embedding> {
    const created = new this.embeddingModel(data);
    return created.save();
  }

  async createMany(data: Partial<Embedding>[]): Promise<Embedding[]> {
    const result = await this.embeddingModel.insertMany(data);
    return result as unknown as Embedding[];
  }

  async deleteAll(): Promise<{ deletedCount: number }> {
    const result = await this.embeddingModel.deleteMany({});
    return { deletedCount: result.deletedCount || 0 };
  }

  /**
   * Compute cosine similarity between query vector and stored embeddings
   * Note: For production, use MongoDB Atlas Vector Search or a dedicated vector DB
   */
  async findSimilar(
    queryEmbedding: number[],
    limit = 5,
  ): Promise<{ embedding: Embedding; score: number }[]> {
    // Get all embeddings (for small datasets)
    // For large datasets, use vector search index
    const allEmbeddings = await this.embeddingModel.find().exec();

    const results = allEmbeddings.map((emb) => ({
      embedding: emb,
      score: this.cosineSimilarity(queryEmbedding, emb.embedding),
    }));

    // Sort by similarity score descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}
