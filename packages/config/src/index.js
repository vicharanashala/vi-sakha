"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadLlmConfig = loadLlmConfig;
exports.loadVectorConfig = loadVectorConfig;
exports.loadMemoryConfig = loadMemoryConfig;
exports.loadRetrievalConfig = loadRetrievalConfig;
exports.loadAgentConfig = loadAgentConfig;
exports.loadDatabaseConfig = loadDatabaseConfig;
exports.loadEmbeddingConfig = loadEmbeddingConfig;
exports.loadObservabilityConfig = loadObservabilityConfig;
exports.loadPlatformConfig = loadPlatformConfig;
function loadLlmConfig() {
    return {
        provider: process.env.LLM_PROVIDER ?? 'anthropic',
        plannerModel: process.env.LLM_PLANNER_MODEL ?? 'claude-haiku-4-5-20251001',
        synthesizerModel: process.env.LLM_SYNTHESIZER_MODEL ?? 'claude-haiku-4-5-20251001',
        reflectorModel: process.env.LLM_REFLECTOR_MODEL ?? 'claude-haiku-4-5-20251001',
        apiKey: process.env.ANTHROPIC_API_KEY ?? process.env.GEMINI_API_KEY ?? '',
        maxOutputTokens: parseInt(process.env.LLM_MAX_OUTPUT_TOKENS ?? '1024', 10),
        temperature: parseFloat(process.env.LLM_TEMPERATURE ?? '0.3'),
    };
}
function loadVectorConfig() {
    return {
        provider: process.env.VECTOR_PROVIDER ?? 'qdrant',
        qdrantUrl: process.env.QDRANT_URL ?? 'http://localhost:6333',
        qdrantApiKey: process.env.QDRANT_API_KEY,
        defaultCollection: process.env.QDRANT_COLLECTION ?? 'visakha_knowledge',
        dimensions: parseInt(process.env.VECTOR_DIMENSIONS ?? '384', 10),
        distanceMetric: 'cosine',
    };
}
function loadMemoryConfig() {
    return {
        shortTermTtlSeconds: parseInt(process.env.SHORT_TERM_TTL ?? '1800', 10),
        maxShortTermMessages: parseInt(process.env.MAX_SHORT_TERM_MESSAGES ?? '20', 10),
        episodicSummaryModel: process.env.EPISODIC_SUMMARY_MODEL ?? 'claude-haiku-4-5-20251001',
        maxEpisodicEntriesPerUser: parseInt(process.env.MAX_EPISODIC_ENTRIES ?? '1000', 10),
        workingMemoryMaxTokens: parseInt(process.env.WORKING_MEMORY_MAX_TOKENS ?? '4000', 10),
    };
}
function loadRetrievalConfig() {
    return {
        topK: parseInt(process.env.RETRIEVAL_TOP_K ?? '20', 10),
        topN: parseInt(process.env.RETRIEVAL_TOP_N ?? '5', 10),
        minScore: parseFloat(process.env.RETRIEVAL_MIN_SCORE ?? '0.45'),
        hybridEnabled: process.env.HYBRID_RETRIEVAL === 'true',
        keywordWeight: parseFloat(process.env.KEYWORD_WEIGHT ?? '0.3'),
        rerankProvider: process.env.RERANK_PROVIDER ?? 'cross_encoder',
        rerankModel: process.env.RERANK_MODEL ?? 'BAAI/bge-reranker-large',
        cohereApiKey: process.env.COHERE_API_KEY,
    };
}
function loadAgentConfig() {
    return {
        maxReflectionLoops: parseInt(process.env.MAX_REFLECTION_LOOPS ?? '2', 10),
        maxToolCalls: parseInt(process.env.MAX_TOOL_CALLS ?? '5', 10),
        maxExecutionTimeMs: parseInt(process.env.MAX_EXECUTION_TIME_MS ?? '30000', 10),
        enableStreaming: process.env.ENABLE_STREAMING !== 'false',
        langsmithApiKey: process.env.LANGSMITH_API_KEY,
        langsmithProject: process.env.LANGSMITH_PROJECT ?? 'visakha-agents',
    };
}
function loadDatabaseConfig() {
    return {
        mongoUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/vinternship',
        redisHost: process.env.REDIS_HOST ?? 'localhost',
        redisPort: parseInt(process.env.REDIS_PORT ?? '6379', 10),
        redisPassword: process.env.REDIS_PASSWORD,
    };
}
function loadEmbeddingConfig() {
    return {
        sidecarUrl: process.env.EMBEDDING_SIDECAR_URL ?? 'http://localhost:8001',
        model: process.env.EMBEDDING_MODEL ?? 'BAAI/bge-small-en-v1.5',
        batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE ?? '32', 10),
    };
}
function loadObservabilityConfig() {
    return {
        langsmithEnabled: process.env.LANGCHAIN_TRACING_V2 === 'true',
        langsmithApiKey: process.env.LANGCHAIN_API_KEY ?? '',
        langsmithProject: process.env.LANGCHAIN_PROJECT ?? 'visakha-agents',
        otelEnabled: process.env.OTEL_ENABLED === 'true',
    };
}
function loadPlatformConfig() {
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
//# sourceMappingURL=index.js.map