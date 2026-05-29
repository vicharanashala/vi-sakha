"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrieverNode = retrieverNode;
const shared_utils_1 = require("@visakha/shared-utils");
const config_1 = require("@visakha/config");
const log = (0, shared_utils_1.createLogger)("retriever-node");
const config = (0, config_1.loadPlatformConfig)();
async function retrieverNode(state) {
    if (!state.plan?.needs_retrieval) {
        log.info("Skipping retrieval node — not needed per plan");
        return {};
    }
    log.info("Executing retriever node", { query: state.query });
    try {
        const retrievedContext = await mockRetrieveFromBackend(state.query);
        log.info(`Retrieved ${retrievedContext.length} contexts`);
        return {
            retrievedContext,
            executionTrace: {
                ...state.executionTrace,
                nodes: [
                    ...state.executionTrace.nodes,
                    {
                        nodeName: "retriever",
                        startTime: new Date(),
                        endTime: new Date(),
                        tokensUsed: 0,
                        status: "success",
                        metadata: { count: retrievedContext.length }
                    }
                ]
            }
        };
    }
    catch (error) {
        log.error("Retriever node failed", { error: error.message });
        return {
            error: {
                code: "RETRIEVAL_FAILURE",
                message: "Failed to fetch relevant context",
                node: "retriever",
                recoverable: true,
            }
        };
    }
}
async function mockRetrieveFromBackend(query) {
    return [
        {
            content: `Context for: ${query}. VInternship is a student internship program focused on practical skills.`,
            score: 0.95,
            source: "qa_pairs",
            type: "keyword",
            metadata: { sourceRef: "discord_ticket_123" }
        }
    ];
}
//# sourceMappingURL=retriever.js.map