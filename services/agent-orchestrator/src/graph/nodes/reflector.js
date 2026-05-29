"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reflectorNode = reflectorNode;
const llm_factory_1 = require("../../llm/llm-factory");
const prompts_1 = require("@visakha/prompts");
const shared_utils_1 = require("@visakha/shared-utils");
const config_1 = require("@visakha/config");
const log = (0, shared_utils_1.createLogger)("reflector-node");
const config = (0, config_1.loadPlatformConfig)();
async function reflectorNode(state) {
    const model = llm_factory_1.LLMFactory.getModel('reflector');
    const loopCount = state.loopCount + 1;
    log.info(`Executing reflector node (iteration ${loopCount})`);
    if (loopCount > config.agent.maxReflectionLoops) {
        log.info("Reflection limit reached, accepting current draft");
        return {
            finalResponse: state.draftResponse,
            loopCount
        };
    }
    const prompt = `${prompts_1.REFLECTOR_SYSTEM_PROMPT}

<INPUT>
USER QUERY: ${state.query}

RETRIEVED CONTEXT:
${state.retrievedContext.map((c) => c.content).join("\n\n")}

DRAFT RESPONSE:
${state.draftResponse}
</INPUT>`;
    try {
        const response = await model.invoke(prompt);
        const content = typeof response.content === 'string'
            ? response.content
            : JSON.stringify(response.content);
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("Failed to parse reflector response as JSON");
        }
        const reflection = JSON.parse(jsonMatch[0]);
        reflection.iteration = loopCount;
        log.info("Reflection completed", { quality: reflection.quality, shouldRetry: reflection.shouldRetry });
        const updates = {
            reflections: [...state.reflections, reflection],
            loopCount,
            executionTrace: {
                ...state.executionTrace,
                nodes: [
                    ...state.executionTrace.nodes,
                    {
                        nodeName: "reflector",
                        startTime: new Date(),
                        endTime: new Date(),
                        tokensUsed: (0, shared_utils_1.estimateTokens)(prompt) + (0, shared_utils_1.estimateTokens)(content),
                        status: "success",
                        metadata: { quality: reflection.quality }
                    }
                ]
            }
        };
        if (!reflection.shouldRetry) {
            updates.finalResponse = state.draftResponse;
        }
        return updates;
    }
    catch (error) {
        log.error("Reflector node failed", { error: error.message });
        return {
            finalResponse: state.draftResponse,
            loopCount,
            reflections: [...state.reflections, {
                    iteration: loopCount,
                    quality: 'failed',
                    score: 0,
                    issues: ["Reflector service failure"],
                    suggestions: [],
                    shouldRetry: false
                }]
        };
    }
}
//# sourceMappingURL=reflector.js.map