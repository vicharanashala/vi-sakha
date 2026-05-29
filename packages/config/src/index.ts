/**
 * Platform Configuration
 *
 * Centralized, validated configuration for all Vi-Sakha services.
 * Each config domain has sensible defaults and can be overridden via env vars.
 */

// ── LLM Configuration ───────────────────────────────────────────────────────

export interface LlmConfig {
  /** Primary LLM provider */
  provider: 'anthropic' | 'gemini' | 'openai';
  /** Model for the planner agent (should be fast) */
  plannerModel: string;
  /** Model for the synthesizer agent (should be powerful) */
  synthesizerModel: string;
  /** Model for the reflector agent */
  reflectorModel: string;
  /** API key for the primary provider */
  apiKey: string;
  /** Maximum tokens for output */
  maxOutputTokens: number;
  /** Temperature for generation */
  temperature: number;
}

export function loadLlmConfig(): LlmConfig {
  return {
    provider: (process.env.LLM_PROVIDER as LlmConfig['provider']) ?? 'anthropic',
    plannerModel: process.env.LLM_PLANNER_MODEL ?? 'claude-haiku-4-5-20251001',
    synthesizerModel: process.env.LLM_SYNTHESIZER_MODEL ?? 'claude-haiku-4-5-20251001',
    reflectorModel: process.env.LLM_REFLECTOR_MODEL ?? 'claude-haiku-4-5-20251001',
    apiKey: process.env.ANTHROPIC_API_KEY ?? process.env.GEMINI_API_KEY ?? '',
    maxOutputTokens: parseInt(process.env.LLM_MAX_OUTPUT_TOKENS ?? '1024', 10),
    temperature: parseFloat(process.env.LLM_TEMPERATURE ?? '0.3'),
  };
}

// ── Vector Store Configuration ───────────────────────────────────────────────

export interface VectorConfig {
  provider: 'qdrant' | 'mongodb_atlas';
  qdrantUrl: string;
  qdrantApiKey?: string;
  defaultCollection: string;
  dimensions: number;
  distanceMetric: 'cosine' | 'euclidean' | 'dot';
}

export function loadVectorConfig(): VectorConfig {
  return {
    provider: (process.env.VECTOR_PROVIDER as VectorConfig['provider']) ?? 'qdrant',
    qdrantUrl: process.env.QDRANT_URL ?? 'http://localhost:6333',
    qdrantApiKey: process.env.QDRANT_API_KEY,
    defaultCollection: process.env.QDRANT_COLLECTION ?? 'visakha_knowledge',
    dimensions: parseInt(process.env.VECTOR_DIMENSIONS ?? '384', 10),
    distanceMetric: 'cosine',
  };
}

// ── Memory Configuration ─────────────────────────────────────────────────────

export interface MemoryConfig {
  shortTermTtlSeconds: number;
  maxShortTermMessages: number;
  episodicSummaryModel: string;
  maxEpisodicEntriesPerUser: number;
  workingMemoryMaxTokens: number;
}

export function loadMemoryConfig(): MemoryConfig {
  return {
    shortTermTtlSeconds: parseInt(process.env.SHORT_TERM_TTL ?? '1800', 10),
    maxShortTermMessages: parseInt(process.env.MAX_SHORT_TERM_MESSAGES ?? '20', 10),
    episodicSummaryModel: process.env.EPISODIC_SUMMARY_MODEL ?? 'claude-haiku-4-5-20251001',
    maxEpisodicEntriesPerUser: parseInt(process.env.MAX_EPISODIC_ENTRIES ?? '1000', 10),
    workingMemoryMaxTokens: parseInt(process.env.WORKING_MEMORY_MAX_TOKENS ?? '4000', 10),
  };
}

// ── Retrieval Configuration ──────────────────────────────────────────────────

export interface RetrievalConfig {
  topK: number;
  topN: number;
  minScore: number;
  hybridEnabled: boolean;
  keywordWeight: number;
  rerankProvider: 'cross_encoder' | 'cohere';
  rerankModel: string;
  cohereApiKey?: string;
}

export function loadRetrievalConfig(): RetrievalConfig {
  return {
    topK: parseInt(process.env.RETRIEVAL_TOP_K ?? '20', 10),
    topN: parseInt(process.env.RETRIEVAL_TOP_N ?? '5', 10),
    minScore: parseFloat(process.env.RETRIEVAL_MIN_SCORE ?? '0.45'),
    hybridEnabled: process.env.HYBRID_RETRIEVAL === 'true',
    keywordWeight: parseFloat(process.env.KEYWORD_WEIGHT ?? '0.3'),
    rerankProvider: (process.env.RERANK_PROVIDER as RetrievalConfig['rerankProvider']) ?? 'cross_encoder',
    rerankModel: process.env.RERANK_MODEL ?? 'BAAI/bge-reranker-large',
    cohereApiKey: process.env.COHERE_API_KEY,
  };
}

// ── Agent Configuration ──────────────────────────────────────────────────────

export interface AgentConfig {
  maxReflectionLoops: number;
  maxToolCalls: number;
  maxExecutionTimeMs: number;
  enableStreaming: boolean;
  langsmithApiKey?: string;
  langsmithProject?: string;
}

export function loadAgentConfig(): AgentConfig {
  return {
    maxReflectionLoops: parseInt(process.env.MAX_REFLECTION_LOOPS ?? '2', 10),
    maxToolCalls: parseInt(process.env.MAX_TOOL_CALLS ?? '5', 10),
    maxExecutionTimeMs: parseInt(process.env.MAX_EXECUTION_TIME_MS ?? '30000', 10),
    enableStreaming: process.env.ENABLE_STREAMING !== 'false',
    langsmithApiKey: process.env.LANGSMITH_API_KEY,
    langsmithProject: process.env.LANGSMITH_PROJECT ?? 'visakha-agents',
  };
}

// ── Database Configuration ───────────────────────────────────────────────────

export interface DatabaseConfig {
  mongoUri: string;
  redisHost: string;
  redisPort: number;
  redisPassword?: string;
}

export function loadDatabaseConfig(): DatabaseConfig {
  return {
    mongoUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/vinternship',
    redisHost: process.env.REDIS_HOST ?? 'localhost',
    redisPort: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    redisPassword: process.env.REDIS_PASSWORD,
  };
}

// ── Embedding Configuration ──────────────────────────────────────────────────

export interface EmbeddingConfig {
  sidecarUrl: string;
  model: string;
  batchSize: number;
}

export function loadEmbeddingConfig(): EmbeddingConfig {
  return {
    sidecarUrl: process.env.EMBEDDING_SIDECAR_URL ?? 'http://localhost:8001',
    model: process.env.EMBEDDING_MODEL ?? 'BAAI/bge-small-en-v1.5',
    batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE ?? '32', 10),
  };
}

// ── Observability Configuration ─────────────────────────────────────────────

export interface ObservabilityConfig {
  langsmithEnabled: boolean;
  langsmithApiKey: string;
  langsmithProject: string;
  otelEnabled: boolean;
}

export function loadObservabilityConfig(): ObservabilityConfig {
  return {
    langsmithEnabled: process.env.LANGCHAIN_TRACING_V2 === 'true',
    langsmithApiKey: process.env.LANGCHAIN_API_KEY ?? '',
    langsmithProject: process.env.LANGCHAIN_PROJECT ?? 'visakha-agents',
    otelEnabled: process.env.OTEL_ENABLED === 'true',
  };
}

// ── Master Config ────────────────────────────────────────────────────────────

export interface PlatformConfig {
  llm: LlmConfig;
  vector: VectorConfig;
  memory: MemoryConfig;
  retrieval: RetrievalConfig;
  agent: AgentConfig;
  database: DatabaseConfig;
  embedding: EmbeddingConfig;
  observability: ObservabilityConfig;
}

export function loadPlatformConfig(): PlatformConfig {
  return {
    llm: loadLlmConfig(),
    vector: loadVectorConfig(),
    memory: loadMemoryConfig(),
    retrieval: loadRetrievalConfig(),
    agent: loadAgentConfig(),
    database: loadDatabaseConfig(),
    embedding: loadEmbeddingConfig(),
    observability: loadObservabilityConfig(),
  };
}
