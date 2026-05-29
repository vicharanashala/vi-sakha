"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentOrchestrator = void 0;
const agent_graph_1 = require("./graph/agent-graph");
const shared_utils_1 = require("@visakha/shared-utils");
const log = (0, shared_utils_1.createLogger)("agent-orchestrator");
class AgentOrchestrator {
    async invoke(initialState) {
        log.info("Invoking agent orchestrator", { query: initialState.query });
        try {
            const result = await agent_graph_1.agentGraph.invoke(initialState);
            return result;
        }
        catch (error) {
            log.error("Agent execution failed", { error: error.message });
            throw error;
        }
    }
    async *stream(initialState) {
        log.info("Starting agent stream", { query: initialState.query });
        try {
            const stream = await agent_graph_1.agentGraph.stream(initialState, { streamMode: "updates" });
            for await (const update of stream) {
                const nodeName = Object.keys(update)[0];
                const state = update[nodeName];
                if (nodeName === 'planner' && state.plan) {
                    yield { type: 'plan', plan: state.plan };
                }
                if (nodeName === 'retriever' && state.retrievedContext) {
                    yield { type: 'retrieval', contexts: state.retrievedContext };
                }
                if (nodeName === 'synthesizer' && state.draftResponse) {
                    yield { type: 'delta', text: state.draftResponse };
                }
                if (nodeName === 'reflector' && state.reflections) {
                    const latestReflection = state.reflections[state.reflections.length - 1];
                    yield { type: 'reflection', result: latestReflection };
                }
            }
            yield { type: 'done', assistantMessageId: "generated", trace: {} };
        }
        catch (error) {
            log.error("Agent stream failed", { error: error.message });
            yield { type: 'error', message: error.message };
        }
    }
}
exports.AgentOrchestrator = AgentOrchestrator;
//# sourceMappingURL=orchestrator.js.map