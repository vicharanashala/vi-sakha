export interface MemoryStore<T extends MemoryEntry> {
    save(entry: T): Promise<void>;
    retrieve(query: MemoryQuery): Promise<T[]>;
    delete(id: string): Promise<void>;
    clear(scope: MemoryScope): Promise<void>;
}
export interface MemoryQuery {
    text?: string;
    scope: MemoryScope;
    limit: number;
    minRelevance?: number;
    types?: MemoryType[];
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
export interface MemoryEntry {
    id: string;
    type: MemoryType;
    content: string;
    scope: MemoryScope;
    createdAt: Date;
    updatedAt: Date;
    metadata: Record<string, unknown>;
}
export interface ShortTermMemoryEntry extends MemoryEntry {
    type: 'short_term';
    ttlSeconds: number;
    messages: SessionMessage[];
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
export interface EpisodicMemoryEntry extends MemoryEntry {
    type: 'episodic';
    summary: string;
    topics: string[];
    preferences: UserPreference[];
    resolution: 'resolved' | 'escalated' | 'abandoned';
    conversationId: string;
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
}
export interface SemanticMemoryEntry extends MemoryEntry {
    type: 'semantic';
    vectorId: string;
    knowledgeSource: KnowledgeSource;
    question?: string;
    answer?: string;
    embeddingModel: string;
    dimensions: number;
}
export type KnowledgeSource = 'qa_pair' | 'document_chunk' | 'conversation_summary' | 'image_caption' | 'ocr_text' | 'web_content';
export interface WorkingMemoryEntry extends MemoryEntry {
    type: 'working';
    reasoningChain: ReasoningStep[];
    intermediateResults: Record<string, unknown>;
    reflectionNotes: string[];
}
export interface ReasoningStep {
    step: number;
    thought: string;
    action: string;
    result?: string;
    timestamp: Date;
}
export interface SummarizerConfig {
    model: string;
    maxSummaryTokens: number;
    extractPreferences: boolean;
    extractTopics: boolean;
}
export interface MemoryExpirationPolicy {
    type: MemoryType;
    ttlSeconds?: number;
    maxEntries?: number;
    archiveAfterDays?: number;
    compressionThreshold?: number;
}
