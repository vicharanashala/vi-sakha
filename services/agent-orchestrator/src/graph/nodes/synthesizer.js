"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.synthesizerNode = synthesizerNode;
const llm_factory_1 = require("../../llm/llm-factory");
const prompts_1 = require("@visakha/prompts");
const shared_utils_1 = require("@visakha/shared-utils");
const log = (0, shared_utils_1.createLogger)("synthesizer-node");
async function synthesizerNode(state) {
    const model = llm_factory_1.LLMFactory.getModel('synthesizer');
    log.info("Executing synthesizer node");
    const contextStr = (0, prompts_1.renderTemplate)(prompts_1.CONTEXT_ASSEMBLY_TEMPLATE, {
        contexts: state.retrievedContext,
        query: state.query
    });
    const historyStr = state.conversationHistory
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n");
    const prompt = `${prompts_1.SYNTHESIZER_SYSTEM_PROMPT}

<CONTEXT>
CONVERSATION HISTORY:
${historyStr || "None"}

RETRIEVED KNOWLEDGE:
${contextStr}

TOOL RESULTS:
${JSON.stringify(state.toolResults)}
</CONTEXT>

USER QUERY: ${state.query}`;
    try {
        const response = await model.invoke(prompt);
        const draftResponse = typeof response.content === 'string'
            ? response.content
            : JSON.stringify(response.content);
        log.info("Draft response synthesized", { length: draftResponse.length });
        return {
            draftResponse,
            executionTrace: {
                ...state.executionTrace,
                nodes: [
                    ...state.executionTrace.nodes,
                    {
                        nodeName: "synthesizer",
                        startTime: new Date(),
                        endTime: new Date(),
                        tokensUsed: (0, shared_utils_1.estimateTokens)(prompt) + (0, shared_utils_1.estimateTokens)(draftResponse),
                        status: "success",
                    }
                ]
            }
        };
    }
    catch (error) {
        log.error("Synthesizer node failed", { error: error.message });
        return {
            error: {
                code: "SYNTHESIS_FAILURE",
                message: "Failed to synthesize response",
                node: "synthesizer",
                recoverable: true,
            }
        };
    }
}
//# sourceMappingURL=synthesizer.js.map