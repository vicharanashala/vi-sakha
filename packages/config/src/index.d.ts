export interface LlmConfig {
    provider: 'anthropic' | 'gemini' | 'openai';
    plannerModel: string;
    synthesizerModel: string;
    reflectorModel: string;
    apiKey: string;
    maxOutputTokens: number;
    temperature: number;
}
export declare function loadLlmConfig(): LlmConfig;
export interface VectorConfig {
    provider: 'qdrant' | 'mongodb_atlas';
    qdrantUrl: string;
    qdrantApiKey?: string;
    defaultCollection: string;
    dimensions: number;
    distanceMetric: 'cosine' | 'euclidean' | 'dot';
}
export declare function loadVectorConfig(): VectorConfig;
export interface MemoryConfig {
    shortTermTtlSeconds: number;
    maxShortTermMessages: number;
    episodicSummaryModel: string;
    maxEpisodicEntriesPerUser: number;
    workingMemoryMaxTokens: number;
}
export declare function loadMemoryConfig(): MemoryConfig;
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
export declare function loadRetrievalConfig(): RetrievalConfig;
export interface AgentConfig {
    maxReflectionLoops: number;
    maxToolCalls: number;
    maxExecutionTimeMs: number;
    enableStreaming: boolean;
    langsmithApiKey?: string;
    langsmithProject?: string;
}
export declare function loadAgentConfig(): AgentConfig;
export interface DatabaseConfig {
    mongoUri: string;
    redisHost: string;
    redisPort: number;
    redisPassword?: string;
}
export declare function loadDatabaseConfig(): DatabaseConfig;
export interface EmbeddingConfig {
    sidecarUrl: string;
    model: string;
    batchSize: number;
}
export declare function loadEmbeddingConfig(): EmbeddingConfig;
export interface ObservabilityConfig {
    langsmithEnabled: boolean;
    langsmithApiKey: string;
    langsmithProject: string;
    otelEnabled: boolean;
}
export declare function loadObservabilityConfig(): ObservabilityConfig;
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
export declare function loadPlatformConfig(): PlatformConfig;
