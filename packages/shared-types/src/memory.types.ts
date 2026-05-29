/**
 * Memory Architecture Types
 *
 * Types for the 4-tier memory system:
 *   1. Short-Term  — active session state (Redis)
 *   2. Episodic    — summarized conversation episodes (MongoDB)
 *   3. Semantic    — vector embeddings for search (Qdrant)
 *   4. Working     — transient reasoning state (LangGraph state)
 */

// ── Memory Store Interface ───────────────────────────────────────────────────

/**
 * Common interface for all memory stores.
 * Implementations: RedisSessionStore, MongoEpisodicStore, QdrantSemanticStore
 */
export interface MemoryStore<T extends MemoryEntry> {
  save(entry: T): Promise<void>;
  retrieve(query: MemoryQuery): Promise<T[]>;
  delete(id: string): Promise<void>;
  clear(scope: MemoryScope): Promise<void>;
}

export interface MemoryQuery {
  /** Natural language query for semantic search */
  text?: string;

  /** Filter by user/session */
  scope: MemoryScope;

  /** Maximum number of results */
  limit: number;

  /** Minimum relevance score (0-1) */
  minRelevance?: number;

  /** Filter by memory type */
  types?: MemoryType[];

  /** Time-based filtering */
  timeRange?: {
    from?: Date;
    to?: Date;
  };
}

export interface MemoryScope {
  userId?: string;
  sessionId?: string;
  conversationId?: string;
}

export type MemoryType = 'short_term' | 'episodic' | 'semantic' | 'working';

// ── Memory Entry Base ────────────────────────────────────────────────────────

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: string;
  scope: MemoryScope;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

// ── Short-Term Memory ────────────────────────────────────────────────────────

export interface ShortTermMemoryEntry extends MemoryEntry {
  type: 'short_term';

  /** Time-to-live in seconds (default: 1800 = 30 min) */
  ttlSeconds: number;

  /** Active conversation messages (sliding window) */
  messages: SessionMessage[];

  /** Current context injected into the agent */
  activeContext: string;
}

export interface SessionMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface SessionState {
  sessionId: string;
  userId: string;
  conversationId: string;
  messages: SessionMessage[];
  lastActivity: Date;
  contextSummary: string;
}

// ── Episodic Memory ──────────────────────────────────────────────────────────

export interface EpisodicMemoryEntry extends MemoryEntry {
  type: 'episodic';

  /** Summarized conversation content */
  summary: string;

  /** Key topics discussed */
  topics: string[];

  /** User preferences extracted from the conversation */
  preferences: UserPreference[];

  /** Resolution status of the conversation */
  resolution: 'resolved' | 'escalated' | 'abandoned';

  /** Original conversation reference */
  conversationId: string;

  /** How many messages were in the original conversation */
  messageCount: number;
}

export interface UserPreference {
  key: string;
  value: string;
  confidence: number;
  source: string;
}

export interface ConversationSummaryRequest {
  conversationId: string;
  messages: SessionMessage[];
  existingSummary?: string;
}

export interface ConversationSummaryResult {
  summary: string;
  topics: string[];
  preferences: UserPreference[];
  keyEntities: string[];
  resolution: 'resolved' | 'escalated' | 'abandoned';
}

// ── Semantic Memory ──────────────────────────────────────────────────────────

export interface SemanticMemoryEntry extends MemoryEntry {
  type: 'semantic';

  /** The embedding vector (stored in Qdrant, not in this record) */
  vectorId: string;

  /** Source of the knowledge (qa_pair, document, conversation_summary) */
  knowledgeSource: KnowledgeSource;

  /** Original question (if from Q&A pair) */
  question?: string;

  /** Original answer (if from Q&A pair) */
  answer?: string;

  /** Embedding model used */
  embeddingModel: string;

  /** Embedding dimensions */
  dimensions: number;
}

export type KnowledgeSource =
  | 'qa_pair'
  | 'document_chunk'
  | 'conversation_summary'
  | 'image_caption'
  | 'ocr_text'
  | 'web_content';

// ── Working Memory ───────────────────────────────────────────────────────────

export interface WorkingMemoryEntry extends MemoryEntry {
  type: 'working';

  /** Current reasoning state */
  reasoningChain: ReasoningStep[];

  /** Intermediate tool results being processed */
  intermediateResults: Record<string, unknown>;

  /** Notes from the reflector for improvement */
  reflectionNotes: string[];
}

export interface ReasoningStep {
  step: number;
  thought: string;
  action: string;
  result?: string;
  timestamp: Date;
}

// ── Memory Summarization ─────────────────────────────────────────────────────

export interface SummarizerConfig {
  /** Model to use for summarization */
  model: string;

  /** Maximum summary length in tokens */
  maxSummaryTokens: number;

  /** Whether to extract user preferences */
  extractPreferences: boolean;

  /** Whether to extract topic tags */
  extractTopics: boolean;
}

// ── Memory Expiration Policies ───────────────────────────────────────────────

export interface MemoryExpirationPolicy {
  type: MemoryType;
  ttlSeconds?: number;             // Short-term: 1800 (30 min)
  maxEntries?: number;             // Episodic: 1000 per user
  archiveAfterDays?: number;       // Semantic: never expire
  compressionThreshold?: number;   // Compress when > N tokens
}
