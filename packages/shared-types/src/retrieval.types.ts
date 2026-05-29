/**
 * Retrieval Pipeline Types
 *
 * Types for vector search, hybrid retrieval, and reranking.
 */

// ── Retrieval Interface ──────────────────────────────────────────────────────

export interface RetrievalResult {
  id: string;
  content: string;
  score: number;
  source: RetrievalSource;
  type: DocumentType;
  metadata: DocumentMetadata;
}

export type RetrievalSource =
  | 'qa_pairs' | 'conversation_summary' | 'document_chunk'
  | 'image_caption' | 'web_content' | 'discord_ticket';

export type DocumentType = 'qa_pair' | 'chunk' | 'summary' | 'caption' | 'transcript';

export interface DocumentMetadata {
  question?: string;
  answer?: string;
  sourceRef?: string;
  createdAt?: Date;
  tags?: Record<string, string>;
  embeddingModel?: string;
  tokenCount?: number;
}

// ── Query Types ──────────────────────────────────────────────────────────────

export interface RetrievalQuery {
  text: string;
  embedding?: number[];
  topK: number;
  topN: number;
  minScore: number;
  filters?: RetrievalFilter[];
  sources?: RetrievalSource[];
  hybrid: boolean;
  keywordWeight?: number;
}

export interface RetrievalFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in';
  value: unknown;
}

// ── Vector Store Interface ───────────────────────────────────────────────────

export interface VectorStore {
  search(params: VectorSearchParams): Promise<VectorSearchResult[]>;
  upsert(entries: VectorUpsertEntry[]): Promise<void>;
  delete(ids: string[]): Promise<void>;
  getCollectionInfo(): Promise<VectorCollectionInfo>;
}

export interface VectorSearchParams {
  vector: number[];
  limit: number;
  scoreThreshold?: number;
  filter?: Record<string, unknown>;
  collection: string;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
  vector?: number[];
}

export interface VectorUpsertEntry {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

export interface VectorCollectionInfo {
  name: string;
  vectorCount: number;
  dimensions: number;
  distanceMetric: 'cosine' | 'euclidean' | 'dot';
}

// ── Reranking ────────────────────────────────────────────────────────────────

export interface Reranker {
  rerank(params: RerankParams): Promise<RerankResult[]>;
}

export interface RerankParams {
  query: string;
  documents: RerankDocument[];
  topN: number;
}

export interface RerankDocument {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface RerankResult {
  id: string;
  text: string;
  score: number;
  originalRank: number;
  metadata?: Record<string, unknown>;
}

// ── Embedding ────────────────────────────────────────────────────────────────

export interface EmbeddingRequest { texts: string[]; model?: string; }
export interface EmbeddingResponse { embeddings: number[][]; dimensions: number; model: string; tokenCount: number; }

// ── Ingestion ────────────────────────────────────────────────────────────────

export interface IngestionJob {
  id: string;
  type: IngestionType;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  source: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  stats?: IngestionStats;
}

export type IngestionType = 'qa_pair' | 'document' | 'image' | 'conversation' | 'web_content';

export interface IngestionStats {
  chunksCreated: number;
  embeddingsGenerated: number;
  tokensProcessed: number;
  processingTimeMs: number;
}

// ── Context Assembly ─────────────────────────────────────────────────────────

export interface AssembledContext {
  contextString: string;
  sources: RetrievalResult[];
  tokenCount: number;
  wasCompressed: boolean;
}

export interface ContextAssemblyConfig {
  maxTokens: number;
  deduplication: boolean;
  diversityThreshold: number;
}
